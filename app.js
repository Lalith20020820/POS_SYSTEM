/* SuperMart POS v3.0 — app.js */

// ── DATABASE
const db = new Dexie('SuperMartPOS_v3');
db.version(1).stores({
    products: '++id, name, barcode, category, buyingPrice, sellingPrice, stock, lowStockThreshold',
    sales: '++id, timestamp, subTotal, discount, totalAmount, paymentMethod, profit, customerId, customerName',
    saleItems: '++id, saleId, productId, productName, qty, priceAtSale, buyPrice',
    suppliers: '++id, companyName, contactPerson, phone, email, products, address',
    grn: '++id, timestamp, supplierId, supplierName, totalCost, notes',
    grnItems: '++id, grnId, productId, productName, qty, buyPrice',
    customers: '++id, name, phone, email, address, totalSpent, visitCount',
});

// ── STATE
let cart = [];
let payMethod = 'cash';
let allProds = [];
let selCust = null;      // selected customer object
let previewProd = null;      // barcode preview product
let grnRows = [];        // GRN temp rows
let rptChart = null;
let topChart = null;
let salesChart = null;
let reportData = [];
let ckTotal = 0;

// ── BOOTSTRAP
document.addEventListener('DOMContentLoaded', async () => {
    await seedDemo();
    tick(); setInterval(tick, 1000);
    setRptDefaults();
    await loadDashboard();
    await refreshCats();
    allProds = await db.products.toArray();
});

// ── SEED
async function seedDemo() {
    if (await db.products.count() > 0) return;
    await db.products.bulkAdd([
        { name: 'Sunlight Soap 100g', barcode: '4001', buyingPrice: 45, sellingPrice: 65, stock: 80, category: 'Personal Care', lowStockThreshold: 10 },
        { name: 'Milo 400g', barcode: '4002', buyingPrice: 580, sellingPrice: 680, stock: 30, category: 'Beverages', lowStockThreshold: 5 },
        { name: 'Prima Noodles', barcode: '4003', buyingPrice: 35, sellingPrice: 50, stock: 120, category: 'Food', lowStockThreshold: 20 },
        { name: 'Anchor Milk 400ml', barcode: '4004', buyingPrice: 180, sellingPrice: 210, stock: 4, category: 'Dairy', lowStockThreshold: 10 },
        { name: 'Maliban Marie 200g', barcode: '4005', buyingPrice: 95, sellingPrice: 120, stock: 55, category: 'Biscuits', lowStockThreshold: 10 },
        { name: 'Coca-Cola 330ml', barcode: '4006', buyingPrice: 110, sellingPrice: 140, stock: 3, category: 'Beverages', lowStockThreshold: 8 },
        { name: 'Dettol Soap 75g', barcode: '4007', buyingPrice: 85, sellingPrice: 110, stock: 45, category: 'Personal Care', lowStockThreshold: 10 },
        { name: 'Sunrice Basmati 1kg', barcode: '4008', buyingPrice: 280, sellingPrice: 340, stock: 90, category: 'Rice', lowStockThreshold: 15 },
        { name: 'Nescafe 50g', barcode: '4009', buyingPrice: 360, sellingPrice: 420, stock: 25, category: 'Beverages', lowStockThreshold: 5 },
        { name: 'Signal Toothpaste 140g', barcode: '4010', buyingPrice: 130, sellingPrice: 165, stock: 50, category: 'Personal Care', lowStockThreshold: 10 },
    ]);
    await db.suppliers.bulkAdd([
        { companyName: 'Sunshine Traders', contactPerson: 'Amal Perera', phone: '0771234567', email: 'amal@sunshine.lk', products: 'Soap, Detergents', address: 'Colombo 03' },
        { companyName: 'Lanka Food Dist.', contactPerson: 'Nalini Silva', phone: '0769876543', email: 'nalini@lfood.lk', products: 'Rice, Noodles', address: 'Gampaha' },
    ]);
    await db.customers.bulkAdd([
        { name: 'Kamal Perera', phone: '0771112233', email: '', address: '', totalSpent: 0, visitCount: 0 },
        { name: 'Nimal Silva', phone: '0762223344', email: '', address: '', totalSpent: 0, visitCount: 0 },
    ]);
}

// ── CLOCK
function tick() {
    const n = new Date();
    setText('hdr-time', n.toLocaleTimeString('en-LK'));
    setText('hdr-date', n.toLocaleDateString('en-LK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }));
}

// ── NAVIGATION
const PM = {
    dashboard: { t: 'Dashboard', s: 'Store overview & key metrics' },
    pos: { t: 'Point of Sale', s: 'Scan & bill your customers' },
    inventory: { t: 'Inventory', s: 'Manage products & stock levels' },
    grn: { t: 'GRN', s: 'Goods Received Notes — update stock from supplier' },
    customers: { t: 'Customers', s: 'Registered customers & purchase history' },
    suppliers: { t: 'Suppliers', s: 'Manage your suppliers' },
    reports: { t: 'Reports', s: 'Sales analytics & export' },
};
function showPage(p) {
    document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.ni').forEach(x => x.classList.remove('active'));
    document.getElementById('page-' + p).classList.add('active');
    const nb = document.getElementById('nav-' + p);
    if (nb) nb.classList.add('active');
    setText('pg-title', PM[p]?.t || p);
    setText('pg-sub', PM[p]?.s || '');
    if (p === 'dashboard') loadDashboard();
    if (p === 'pos') { allProds = []; db.products.toArray().then(a => { allProds = a; posSearch(); }); }
    if (p === 'inventory') loadInventory();
    if (p === 'grn') loadGrn();
    if (p === 'customers') loadCustomers();
    if (p === 'suppliers') loadSuppliers();
    if (p === 'reports') genReport();
}

// ── DASHBOARD
async function loadDashboard() {
    const { s, e } = todayRange();
    const ts = await db.sales.where('timestamp').between(s, e).toArray();
    let rev = 0, prof = 0;
    ts.forEach(x => { rev += x.totalAmount || 0; prof += x.profit || 0; });
    setText('kpi-rev', 'Rs. ' + fmt(rev));
    setText('kpi-profit', 'Rs. ' + fmt(prof));
    setText('kpi-orders', ts.length);
    setText('kpi-prods', await db.products.count());
    await renderLowStock();
    await render7DayChart();
    await renderRecent();
}

async function render7DayChart() {
    const labels = [], revs = [], profs = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
        const nd = new Date(d); nd.setDate(nd.getDate() + 1);
        const ss = await db.sales.where('timestamp').between(d.getTime(), nd.getTime()).toArray();
        let r = 0, p = 0; ss.forEach(x => { r += x.totalAmount || 0; p += x.profit || 0; });
        labels.push(d.toLocaleDateString('en-LK', { weekday: 'short' }));
        revs.push(r); profs.push(p);
    }
    if (salesChart) salesChart.destroy();
    salesChart = new Chart(document.getElementById('salesChart'), {
        type: 'bar',
        data: {
            labels, datasets: [
                { label: 'Revenue', data: revs, backgroundColor: 'rgba(99,102,241,.5)', borderColor: '#6366f1', borderWidth: 2, borderRadius: 6 },
                { label: 'Profit', data: profs, backgroundColor: 'rgba(16,185,129,.45)', borderColor: '#10b981', borderWidth: 2, borderRadius: 6 },
            ]
        },
        options: cOpts(),
    });
}

async function renderRecent() {
    const ss = await db.sales.orderBy('id').reverse().limit(8).toArray();
    const tb = document.getElementById('recent-table');
    if (!ss.length) { tb.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:#334155">No transactions yet.</td></tr>'; return; }
    tb.innerHTML = (await Promise.all(ss.map(async s => {
        const cnt = await db.saleItems.where('saleId').equals(s.id).count();
        return `<tr>
      <td style="color:#475569">#${s.id}</td>
      <td style="color:#64748b;font-size:12px">${new Date(s.timestamp).toLocaleString('en-LK')}</td>
      <td style="color:#a5b4fc;font-size:12px">${esc(s.customerName || '—')}</td>
      <td><span class="badge" style="${s.paymentMethod === 'cash' ? 'background:rgba(16,185,129,.12);color:#34d399' : 'background:rgba(139,92,246,.12);color:#a78bfa'}">${cap(s.paymentMethod)}</span></td>
      <td style="text-align:right;font-weight:700;color:#fff">Rs. ${fmt(s.totalAmount)}</td>
    </tr>`;
    }))).join('');
}

async function renderLowStock() {
    const ps = await db.products.toArray();
    const low = ps.filter(p => p.stock <= (p.lowStockThreshold || 5));
    const badge = document.getElementById('alert-badge');
    if (low.length) { badge.textContent = low.length; badge.style.display = 'flex'; } else { badge.style.display = 'none'; }
    const el = document.getElementById('low-stock-list');
    if (!low.length) { el.innerHTML = '<div style="text-align:center;padding:14px;color:#334155;font-size:13px">✅ All stocks OK</div>'; return; }
    el.innerHTML = low.map(p => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 11px;border-radius:9px;background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.18)">
      <div><div style="font-size:12px;font-weight:600;color:#e2e8f0">${esc(p.name)}</div><div style="font-size:10px;color:#64748b">${esc(p.category)}</div></div>
      <span class="badge" style="background:rgba(239,68,68,.15);color:#f87171">${p.stock} left</span>
    </div>`).join('');
}

function showAlerts() { openModal('alert-modal'); _fillAlerts(); }
async function _fillAlerts() {
    const low = (await db.products.toArray()).filter(p => p.stock <= (p.lowStockThreshold || 5));
    const el = document.getElementById('alert-list');
    if (!low.length) { el.innerHTML = '<div style="text-align:center;padding:20px;color:#334155">No low-stock items 🎉</div>'; return; }
    el.innerHTML = low.map(p => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:11px 13px;border-radius:10px;background:rgba(13,24,41,.9);border:1px solid rgba(99,179,237,.08)">
      <div><div style="font-size:13px;font-weight:600;color:#e2e8f0">${esc(p.name)}</div><div style="font-size:11px;color:#64748b">Alert ≤ ${p.lowStockThreshold || 5}</div></div>
      <span class="badge" style="background:rgba(239,68,68,.15);color:#f87171">${p.stock} left</span>
    </div>`).join('');
}

// ── POS — SEARCH & BARCODE
let _bcTimer = null;
let _bcBuf = '';

function posInput() {
    const q = (document.getElementById('pos-search').value || '').trim();
    // Barcode scanner detection: fill buffer
    clearTimeout(_bcTimer);
    _bcBuf = q;
    // Live preview if exact barcode match
    const exact = allProds.find(p => (p.barcode || '') === q);
    if (exact && q.length >= 3) { showPreview(exact); }
    else { clearPreview(); }
    posSearch();
}

function posKey(e) {
    if (e.key !== 'Enter') return;
    const q = (document.getElementById('pos-search').value || '').trim();
    if (previewProd) { addPreviewItem(); return; }
    const hit = allProds.find(p => (p.barcode || '') === q);
    if (hit) { addToCart(hit); document.getElementById('pos-search').value = ''; clearPreview(); posSearch(); }
    else if (q) { toast('Barcode not found: ' + q, 'error'); }
}

function showPreview(p) {
    previewProd = p;
    const sc = p.stock <= 0 ? 'color:#f87171' : p.stock <= (p.lowStockThreshold || 5) ? 'color:#fbbf24' : 'color:#34d399';
    setText('bc-name', p.name);
    setText('bc-cat', p.category + ' • Barcode: ' + (p.barcode || '—'));
    setText('bc-price', 'Rs. ' + fmt(p.sellingPrice));
    document.getElementById('bc-stock').innerHTML = `<span style="${sc}">Stock: ${p.stock}</span>`;
    document.getElementById('bc-prev').style.display = 'block';
}

function clearPreview() { previewProd = null; document.getElementById('bc-prev').style.display = 'none'; }

function addPreviewItem() {
    if (!previewProd) return;
    addToCart(previewProd);
    document.getElementById('pos-search').value = '';
    clearPreview();
    posSearch();
}

function posSearch() {
    const q = (document.getElementById('pos-search')?.value || '').toLowerCase();
    const cat = (document.getElementById('pos-cat')?.value || '').toLowerCase();
    let list = allProds;
    if (q) list = list.filter(p => p.name.toLowerCase().includes(q) || (p.barcode || '').toLowerCase().includes(q));
    if (cat) list = list.filter(p => p.category.toLowerCase() === cat);
    renderGrid(list);
}

function renderGrid(prods) {
    const g = document.getElementById('product-grid');
    if (!prods.length) { g.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:#1e3a5f"><i class="fas fa-search" style="font-size:36px;display:block;margin-bottom:12px"></i>No products found.</div>'; return; }
    g.innerHTML = prods.map(p => {
        const out = p.stock <= 0;
        const sc = out ? '#f87171' : p.stock <= (p.lowStockThreshold || 5) ? '#fbbf24' : '#34d399';
        const sb = out ? 'rgba(239,68,68,.12)' : p.stock <= (p.lowStockThreshold || 5) ? 'rgba(245,158,11,.12)' : 'rgba(16,185,129,.12)';
        return `<div class="pc ${out ? 'out' : ''}" onclick="${out ? '' : 'addToCart(' + p.id + ')'}">
      <div style="width:34px;height:34px;border-radius:10px;background:rgba(99,102,241,.15);display:flex;align-items:center;justify-content:center;margin-bottom:9px"><i class="fas fa-box" style="color:#818cf8;font-size:13px"></i></div>
      <div style="font-size:12px;font-weight:700;color:#e2e8f0;line-height:1.35;margin-bottom:4px">${esc(p.name)}</div>
      <div style="font-size:10px;color:#475569;margin-bottom:9px">${esc(p.category)}</div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:14px;font-weight:900;color:#a5b4fc">Rs.${fmt(p.sellingPrice)}</span>
        <span style="padding:2px 7px;border-radius:999px;font-size:10px;font-weight:700;background:${sb};color:${sc}">${p.stock}</span>
      </div>
    </div>`;
    }).join('');
}

// ── CART
function addToCart(pOrId) {
    const p = typeof pOrId === 'object' ? pOrId : allProds.find(x => x.id === pOrId);
    if (!p) return;
    if (p.stock <= 0) { toast('Out of stock!', 'error'); return; }
    const ex = cart.find(c => c.product.id === p.id);
    if (ex) { if (ex.qty >= p.stock) { toast('Max stock!', 'warning'); return; } ex.qty++; }
    else cart.push({ product: p, qty: 1 });
    renderCart();
    toast(p.name + ' added', 'success');
}

function chgQty(id, d) {
    const it = cart.find(c => c.product.id === id);
    if (!it) return;
    it.qty += d;
    if (it.qty <= 0) cart = cart.filter(c => c.product.id !== id);
    renderCart();
}

function rmCart(id) { cart = cart.filter(c => c.product.id !== id); renderCart(); }

function clearCart() { cart = []; const d = document.getElementById('disc-inp'); if (d) d.value = 0; renderCart(); }

function renderCart() {
    const ci = document.getElementById('cart-items');
    const ce = document.getElementById('cart-empty');
    const cc = document.getElementById('cart-count');
    const tot = cart.reduce((s, c) => s + c.qty, 0);
    if (cc) cc.textContent = tot;
    if (!cart.length) { ci.style.display = 'none'; ce.style.display = 'flex'; }
    else {
        ci.style.display = 'flex'; ce.style.display = 'none';
        ci.innerHTML = cart.map(it => `
      <div class="ci">
        <div style="display:flex;align-items:flex-start;gap:7px">
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600;color:#e2e8f0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(it.product.name)}</div>
            <div style="font-size:11px;color:#6366f1;margin-top:2px">Rs.${fmt(it.product.sellingPrice)} × ${it.qty} = <b>Rs.${fmt(it.product.sellingPrice * it.qty)}</b></div>
          </div>
          <button onclick="rmCart(${it.product.id})" style="background:rgba(239,68,68,.12);border:none;width:24px;height:24px;border-radius:6px;color:#f87171;cursor:pointer;flex-shrink:0;font-size:11px;display:flex;align-items:center;justify-content:center"><i class="fas fa-trash"></i></button>
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:7px">
          <button onclick="chgQty(${it.product.id},-1)" style="width:26px;height:26px;border-radius:7px;background:rgba(255,255,255,.07);border:1px solid rgba(99,179,237,.12);color:#e2e8f0;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center">−</button>
          <span style="font-size:13px;font-weight:700;color:#fff;min-width:22px;text-align:center">${it.qty}</span>
          <button onclick="chgQty(${it.product.id},1)" style="width:26px;height:26px;border-radius:7px;background:rgba(255,255,255,.07);border:1px solid rgba(99,179,237,.12);color:#e2e8f0;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center">+</button>
          <span style="font-size:10px;color:#334155">/ ${it.product.stock}</span>
        </div>
      </div>`).join('');
    }
    updateTotals();
}

function updateTotals() {
    const sub = cart.reduce((s, c) => s + c.product.sellingPrice * c.qty, 0);
    const dc = Math.min(100, Math.max(0, parseFloat(document.getElementById('disc-inp')?.value) || 0));
    setText('cart-sub', 'Rs. ' + fmt(sub));
    setText('cart-total', 'Rs. ' + fmt(sub * (1 - dc / 100)));
}

function setPay(m) {
    payMethod = m;
    const cc = document.getElementById('btn-cash'), cd = document.getElementById('btn-card');
    if (m === 'cash') {
        cc.style.cssText = 'flex:1;justify-content:center;font-size:12px;padding:7px;background:rgba(99,102,241,.2);border:2px solid #4f46e5;color:#a5b4fc;font-weight:700;display:inline-flex;align-items:center;gap:7px;border-radius:10px;cursor:pointer;transition:all .2s';
        cd.style.cssText = 'flex:1;justify-content:center;font-size:12px;padding:7px;background:rgba(255,255,255,.04);border:2px solid rgba(255,255,255,.1);color:#475569;font-weight:600;display:inline-flex;align-items:center;gap:7px;border-radius:10px;cursor:pointer;transition:all .2s';
    } else {
        cc.style.cssText = 'flex:1;justify-content:center;font-size:12px;padding:7px;background:rgba(255,255,255,.04);border:2px solid rgba(255,255,255,.1);color:#475569;font-weight:600;display:inline-flex;align-items:center;gap:7px;border-radius:10px;cursor:pointer;transition:all .2s';
        cd.style.cssText = 'flex:1;justify-content:center;font-size:12px;padding:7px;background:rgba(139,92,246,.2);border:2px solid #7c3aed;color:#a78bfa;font-weight:700;display:inline-flex;align-items:center;gap:7px;border-radius:10px;cursor:pointer;transition:all .2s';
    }
}

// ── CUSTOMER SEARCH IN POS
let custResults = [];
async function searchCust() {
    const q = (document.getElementById('pos-cust')?.value || '').trim().toLowerCase();
    const dr = document.getElementById('cust-drop');
    if (!q || q.length < 2) { dr.style.display = 'none'; return; }
    const all = await db.customers.toArray();
    custResults = all.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
    if (!custResults.length) { dr.style.display = 'none'; return; }
    dr.style.display = 'block';
    dr.innerHTML = custResults.map((c, i) => `
    <div onclick="selectCust(${i})" style="padding:8px 12px;font-size:12px;cursor:pointer;border-bottom:1px solid rgba(99,179,237,.07);color:#e2e8f0" onmouseover="this.style.background='rgba(99,102,241,.1)'" onmouseout="this.style.background=''">
      <b>${esc(c.name)}</b> <span style="color:#6366f1">${esc(c.phone)}</span>
    </div>`).join('');
}

function custKey(e) { if (e.key === 'Enter' && custResults.length) selectCust(0); }

function selectCust(i) {
    selCust = custResults[i];
    const cs = document.getElementById('cust-selected');
    if (cs) { cs.style.display = 'flex'; setText('cust-name-show', selCust.name + ' • ' + selCust.phone); }
    document.getElementById('cust-drop').style.display = 'none';
    document.getElementById('pos-cust').value = '';
}

function clearCust() {
    selCust = null;
    const cs = document.getElementById('cust-selected');
    if (cs) cs.style.display = 'none';
}

// ── CHECKOUT
function openCheckout() {
    if (!cart.length) { toast('Cart is empty!', 'warning'); return; }
    const sub = cart.reduce((s, c) => s + c.product.sellingPrice * c.qty, 0);
    const dc = Math.min(100, Math.max(0, parseFloat(document.getElementById('disc-inp')?.value) || 0));
    const tot = sub * (1 - dc / 100);
    ckTotal = tot;
    setText('ck-sub', 'Rs. ' + fmt(sub));
    setText('ck-disc', '-Rs. ' + fmt(sub * dc / 100) + ' (' + dc + '%)');
    setText('ck-total', 'Rs. ' + fmt(tot));
    setText('ck-method', payMethod);
    setText('ck-cust', selCust ? selCust.name + ' (' + selCust.phone + ')' : '— Guest');
    document.getElementById('cash-row').style.display = payMethod === 'cash' ? 'block' : 'none';
    const ci = document.getElementById('cash-in'); if (ci) ci.value = '';
    setText('change-out', 'Rs. 0.00');
    openModal('ckout-modal');
}

function calcChange() {
    const r = parseFloat(document.getElementById('cash-in').value) || 0;
    setText('change-out', 'Rs. ' + fmt(Math.max(0, r - ckTotal)));
}

async function completeSale() {
    if (!cart.length) return;
    if (payMethod === 'cash') {
        const r = parseFloat(document.getElementById('cash-in').value) || 0;
        if (r < ckTotal - 0.005) { toast('Cash received is less than total!', 'error'); return; }
    }
    const sub = cart.reduce((s, c) => s + c.product.sellingPrice * c.qty, 0);
    const dc = Math.min(100, Math.max(0, parseFloat(document.getElementById('disc-inp')?.value) || 0));
    const tot = sub * (1 - dc / 100);
    const recv = payMethod === 'cash' ? (parseFloat(document.getElementById('cash-in').value) || tot) : tot;
    let rawP = 0; cart.forEach(c => { rawP += (c.product.sellingPrice - c.product.buyingPrice) * c.qty; });
    const profit = rawP * (1 - dc / 100);
    const sid = await db.sales.add({
        timestamp: Date.now(), subTotal: sub, discount: dc, totalAmount: tot,
        paymentMethod: payMethod, profit,
        customerId: selCust?.id || null, customerName: selCust?.name || null,
    });
    for (const it of cart) {
        await db.saleItems.add({ saleId: sid, productId: it.product.id, productName: it.product.name, qty: it.qty, priceAtSale: it.product.sellingPrice, buyPrice: it.product.buyingPrice });
        await db.products.update(it.product.id, { stock: Math.max(0, it.product.stock - it.qty) });
    }
    // Update customer stats
    if (selCust) {
        await db.customers.update(selCust.id, {
            totalSpent: (selCust.totalSpent || 0) + tot,
            visitCount: (selCust.visitCount || 0) + 1,
        });
    }
    const rc = [...cart];
    closeModal('ckout-modal');
    buildReceipt({ sid, rc, sub, dc, tot, payMethod, recv, cust: selCust });
    openModal('rcpt-modal');
    // WhatsApp auto-send
    if (selCust?.phone) {
        setTimeout(() => sendWhatsAppBill(selCust, { sid, rc, sub, dc, tot, payMethod, recv }), 800);
    }
    clearCart(); clearCust();
    allProds = await db.products.toArray();
    posSearch();
    await renderLowStock();
    toast('Sale #' + sid + ' completed! 🎉', 'success');
}

function buildReceipt({ sid, rc, sub, dc, tot, payMethod, recv, cust }) {
    const now = new Date();
    setText('r-date', now.toLocaleString('en-LK'));
    setText('r-id', 'Receipt #' + sid);
    setText('r-cust-name', cust ? 'Customer: ' + cust.name : '');
    setText('r-cust-phone', cust ? 'Phone: ' + cust.phone : '');
    setText('r-sub', 'Rs.' + fmt(sub));
    setText('r-disc', dc > 0 ? '-Rs.' + fmt(sub * dc / 100) + ' (' + dc + '%)' : '—');
    setText('r-total', 'Rs.' + fmt(tot));
    setText('r-method', payMethod.toUpperCase());
    setText('r-cash', payMethod === 'cash' ? 'Rs.' + fmt(recv) : '—');
    setText('r-change', payMethod === 'cash' ? 'Rs.' + fmt(Math.max(0, recv - tot)) : '—');
    document.getElementById('r-items').innerHTML = rc.map(c => `
    <div style="display:flex;justify-content:space-between;margin-bottom:3px">
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.product.name)}</span>
      <span style="margin:0 8px">${c.qty}</span>
      <span>Rs.${fmt(c.product.sellingPrice * c.qty)}</span>
    </div>`).join('');
}

// ── WHATSAPP BILL
function sendWhatsAppBill(cust, { sid, rc, sub, dc, tot, payMethod, recv }) {
    let msg = `🛒 *SUPERMART POS — Bill #${sid}*\n`;
    msg += `📅 ${new Date().toLocaleString('en-LK')}\n`;
    msg += `👤 ${cust.name}\n`;
    msg += `━━━━━━━━━━━━━━\n`;
    rc.forEach(c => { msg += `• ${c.product.name} × ${c.qty} = Rs.${fmt(c.product.sellingPrice * c.qty)}\n`; });
    msg += `━━━━━━━━━━━━━━\n`;
    if (dc > 0) msg += `Discount: ${dc}% (-Rs.${fmt(sub * dc / 100)})\n`;
    msg += `*TOTAL: Rs.${fmt(tot)}*\n`;
    msg += `Payment: ${payMethod.toUpperCase()}\n`;
    if (payMethod === 'cash') msg += `Cash: Rs.${fmt(recv)} | Change: Rs.${fmt(Math.max(0, recv - tot))}\n`;
    msg += `━━━━━━━━━━━━━━\n`;
    msg += `Thank you for shopping at SuperMart! 🙏`;
    // Format phone: Sri Lanka +94 prefix
    let ph = cust.phone.replace(/\D/g, '');
    if (ph.startsWith('0')) ph = '94' + ph.slice(1);
    window.open(`https://wa.me/${ph}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ── INVENTORY
async function loadInventory() {
    const q = (document.getElementById('inv-search')?.value || '').toLowerCase();
    const cat = (document.getElementById('inv-cat')?.value || '').toLowerCase();
    let ps = await db.products.toArray();
    if (q) ps = ps.filter(p => p.name.toLowerCase().includes(q) || (p.barcode || '').toLowerCase().includes(q));
    if (cat) ps = ps.filter(p => p.category.toLowerCase() === cat);
    const tb = document.getElementById('inv-table');
    const em = document.getElementById('inv-empty');
    if (!ps.length) { tb.innerHTML = ''; em.style.display = 'block'; return; }
    em.style.display = 'none';
    tb.innerHTML = ps.map(p => {
        const mg = p.buyingPrice > 0 ? (((p.sellingPrice - p.buyingPrice) / p.buyingPrice) * 100).toFixed(1) : '—';
        const sc = p.stock <= 0 ? '#f87171' : p.stock <= (p.lowStockThreshold || 5) ? '#fbbf24' : '#34d399';
        const sb = p.stock <= 0 ? 'rgba(239,68,68,.12)' : p.stock <= (p.lowStockThreshold || 5) ? 'rgba(245,158,11,.12)' : 'rgba(16,185,129,.12)';
        return `<tr>
      <td><div style="font-weight:600;color:#e2e8f0">${esc(p.name)}</div><div style="font-size:10px;color:#334155">Alert ≤ ${p.lowStockThreshold || 5}</div></td>
      <td style="font-family:monospace;color:#475569;font-size:12px">${esc(p.barcode || '—')}</td>
      <td><span class="badge" style="background:rgba(139,92,246,.12);color:#a78bfa">${esc(p.category)}</span></td>
      <td style="text-align:right;color:#64748b">Rs.${fmt(p.buyingPrice)}</td>
      <td style="text-align:right;font-weight:700;color:#a5b4fc">Rs.${fmt(p.sellingPrice)}</td>
      <td style="text-align:center"><span class="badge" style="background:${sb};color:${sc}">${p.stock}</span></td>
      <td style="text-align:center;font-weight:600;font-size:12px;color:${parseFloat(mg) >= 20 ? '#34d399' : parseFloat(mg) >= 10 ? '#fbbf24' : '#f87171'}">${mg}%</td>
      <td style="text-align:center">
        <div style="display:flex;gap:5px;justify-content:center">
          <button class="btn bico" onclick="openProdModal(${p.id})" style="background:rgba(99,102,241,.1);color:#818cf8;border:1px solid rgba(99,102,241,.2)"><i class="fas fa-pen" style="font-size:11px"></i></button>
          <button class="btn bico" onclick="quickStock(${p.id})" style="background:rgba(16,185,129,.1);color:#34d399;border:1px solid rgba(16,185,129,.2)"><i class="fas fa-plus" style="font-size:11px"></i></button>
          <button class="btn bico" onclick="delProd(${p.id})" style="background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.2)"><i class="fas fa-trash" style="font-size:11px"></i></button>
        </div>
      </td>
    </tr>`;
    }).join('');
}

async function openProdModal(id = null) {
    ['p-name', 'p-barcode', 'p-cat', 'p-buy', 'p-sell', 'p-stock'].forEach(f => { const el = document.getElementById(f); if (el) el.value = ''; });
    document.getElementById('p-low').value = 5;
    document.getElementById('p-id').value = '';
    document.getElementById('margin-prev').style.display = 'none';
    if (id) {
        const p = await db.products.get(id); if (!p) return;
        ['name', 'barcode', 'category', 'buyingPrice', 'sellingPrice', 'stock', 'lowStockThreshold'].forEach((k, i) => {
            const ids = ['p-name', 'p-barcode', 'p-cat', 'p-buy', 'p-sell', 'p-stock', 'p-low'];
            const el = document.getElementById(ids[i]); if (el) el.value = p[k] || '';
        });
        document.getElementById('p-id').value = p.id;
        setText('pm-title', 'Edit Product');
        calcMargin();
    } else { setText('pm-title', 'Add Product'); }
    await fillCatDl();
    openModal('prod-modal');
}

function calcMargin() {
    const b = parseFloat(document.getElementById('p-buy')?.value) || 0;
    const s = parseFloat(document.getElementById('p-sell')?.value) || 0;
    const el = document.getElementById('margin-prev'); if (!el) return;
    if (b > 0 && s > 0) {
        const m = ((s - b) / b * 100).toFixed(1); const pf = s - b;
        el.style.display = 'block';
        el.style.background = pf >= 0 ? 'rgba(16,185,129,.08)' : 'rgba(239,68,68,.08)';
        el.style.border = pf >= 0 ? '1px solid rgba(16,185,129,.2)' : '1px solid rgba(239,68,68,.2)';
        el.style.color = pf >= 0 ? '#34d399' : '#f87171';
        el.textContent = `📊 Margin: ${m}% — Rs.${fmt(pf)} profit per unit`;
    } else { el.style.display = 'none'; }
}

async function saveProduct() {
    const name = (document.getElementById('p-name').value || '').trim();
    const cat = (document.getElementById('p-cat').value || '').trim();
    const buy = parseFloat(document.getElementById('p-buy').value);
    const sell = parseFloat(document.getElementById('p-sell').value);
    const stock = parseInt(document.getElementById('p-stock').value);
    const low = parseInt(document.getElementById('p-low').value) || 5;
    if (!name || !cat || isNaN(buy) || isNaN(sell) || isNaN(stock)) { toast('Fill all required fields!', 'error'); return; }
    if (sell < buy && !confirm('Sell price < buy price. Continue?')) return;
    const data = { name, barcode: document.getElementById('p-barcode').value.trim(), category: cat, buyingPrice: buy, sellingPrice: sell, stock, lowStockThreshold: low };
    const eid = parseInt(document.getElementById('p-id').value);
    eid ? await db.products.update(eid, data) : await db.products.add(data);
    toast(eid ? 'Product updated!' : 'Product added!', 'success');
    closeModal('prod-modal');
    await loadInventory(); await refreshCats(); await renderLowStock();
    allProds = await db.products.toArray(); posSearch();
}

async function delProd(id) {
    if (!confirm('Delete this product?')) return;
    await db.products.delete(id);
    toast('Deleted.', 'success');
    await loadInventory(); await refreshCats(); await renderLowStock();
    allProds = await db.products.toArray(); posSearch();
}

async function quickStock(id) {
    const p = await db.products.get(id); if (!p) return;
    const n = prompt(`Add stock for "${p.name}"\nCurrent: ${p.stock}\nAdd qty:`);
    if (!n) return; const v = parseInt(n);
    if (isNaN(v) || v <= 0) { toast('Enter valid number!', 'error'); return; }
    await db.products.update(id, { stock: p.stock + v });
    toast(`Added ${v} units.`, 'success');
    await loadInventory(); await renderLowStock();
    allProds = await db.products.toArray(); posSearch();
}

// -- CUSTOMERS
async function loadCustomers(){
  const q=(document.getElementById('cust-search')?.value||'').toLowerCase();
  let cs=await db.customers.toArray();
  if(q)cs=cs.filter(c=>c.name.toLowerCase().includes(q)||c.phone.includes(q));
  const tb=document.getElementById('cust-table');
  const em=document.getElementById('cust-empty');
  if(!cs.length){tb.innerHTML='';em.style.display='block';return;}
  em.style.display='none';
  tb.innerHTML=cs.map(c=>`
    <tr>
      <td><div style="font-weight:600;color:#e2e8f0">${esc(c.name)}</div></td>
      <td style="color:#a5b4fc;font-size:13px">${esc(c.phone)}</td>
      <td style="color:#64748b;font-size:12px">${esc(c.email||'�')}</td>
      <td style="text-align:center;color:#e2e8f0">${c.visitCount||0}</td>
      <td style="text-align:right;font-weight:700;color:#10b981">Rs. ${fmt(c.totalSpent||0)}</td>
      <td style="text-align:center"><a href="https://wa.me/${waPhone(c.phone)}" target="_blank" class="btn" style="background:rgba(37,211,102,.12);color:#25d366;border:1px solid rgba(37,211,102,.25);padding:5px 10px;font-size:11px;border-radius:8px;text-decoration:none"><i class="fab fa-whatsapp"></i> Chat</a></td>
      <td style="text-align:center">
        <div style="display:flex;gap:5px;justify-content:center">
          <button class="btn bico" onclick="openCustModal(${c.id})" style="background:rgba(99,102,241,.1);color:#818cf8;border:1px solid rgba(99,102,241,.2)"><i class="fas fa-pen" style="font-size:11px"></i></button>
          <button class="btn bico" onclick="delCust(${c.id})" style="background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.2)"><i class="fas fa-trash" style="font-size:11px"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

async function openCustModal(id=null){
  ['c-name','c-phone','c-email','c-addr'].forEach(f=>{const el=document.getElementById(f);if(el)el.value='';});
  document.getElementById('c-id').value='';
  if(id){
    const c=await db.customers.get(id);if(!c)return;
    document.getElementById('c-name').value=c.name||'';
    document.getElementById('c-phone').value=c.phone||'';
    document.getElementById('c-email').value=c.email||'';
    document.getElementById('c-addr').value=c.address||'';
    document.getElementById('c-id').value=c.id;
    setText('cm-title','Edit Customer');
  } else { setText('cm-title','Add Customer'); }
  openModal('cust-modal');
}

async function saveCustomer(){
  const name=(document.getElementById('c-name').value||'').trim();
  const phone=(document.getElementById('c-phone').value||'').trim();
  if(!name||!phone){toast('Name & Phone required!','error');return;}
  const data={name,phone,email:document.getElementById('c-email').value.trim(),address:document.getElementById('c-addr').value.trim()};
  const eid=parseInt(document.getElementById('c-id').value);
  if(eid){
    await db.customers.update(eid,data);toast('Customer updated!','success');
  } else {
    const ex=await db.customers.where('phone').equals(phone).first();
    if(ex){toast('Phone already registered: '+ex.name,'error');return;}
    await db.customers.add({...data,totalSpent:0,visitCount:0});
    toast('Customer added!','success');
  }
  closeModal('cust-modal');loadCustomers();
}

async function delCust(id){
  if(!confirm('Delete this customer?'))return;
  await db.customers.delete(id);toast('Deleted.','success');loadCustomers();
}

function waPhone(ph){let p=ph.replace(/\D/g,'');if(p.startsWith('0'))p='94'+p.slice(1);return p;}

// -- SUPPLIERS
async function loadSuppliers(){
  const q=(document.getElementById('sup-search')?.value||'').toLowerCase();
  let ss=await db.suppliers.toArray();
  if(q)ss=ss.filter(s=>s.companyName.toLowerCase().includes(q)||(s.contactPerson||'').toLowerCase().includes(q));
  const gr=document.getElementById('sup-grid');
  const em=document.getElementById('sup-empty');
  if(!ss.length){gr.innerHTML='';em.style.display='block';return;}
  em.style.display='none';
  gr.innerHTML=ss.map(s=>`
    <div class="supc">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
        <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,rgba(99,102,241,.2),rgba(139,92,246,.15));display:flex;align-items:center;justify-content:center"><i class="fas fa-building" style="color:#818cf8;font-size:16px"></i></div>
        <div style="display:flex;gap:5px">
          <button class="btn bico" onclick="openSupModal(${s.id})" style="background:rgba(99,102,241,.1);color:#818cf8;border:1px solid rgba(99,102,241,.2)"><i class="fas fa-pen" style="font-size:11px"></i></button>
          <button class="btn bico" onclick="delSup(${s.id})" style="background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.2)"><i class="fas fa-trash" style="font-size:11px"></i></button>
        </div>
      </div>
      <div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:2px">${esc(s.companyName)}</div>
      <div style="font-size:12px;color:#475569;margin-bottom:10px">${esc(s.contactPerson||'')}</div>
      <div style="display:flex;flex-direction:column;gap:5px">
        ${s.phone?`<div style="font-size:12px;color:#94a3b8"><i class="fas fa-phone" style="color:#6366f1;width:14px"></i> ${esc(s.phone)}</div>`:''}
        ${s.email?`<div style="font-size:12px;color:#94a3b8"><i class="fas fa-envelope" style="color:#8b5cf6;width:14px"></i> ${esc(s.email)}</div>`:''}
        ${s.products?`<div style="font-size:11px;color:#64748b;margin-top:4px"><i class="fas fa-box" style="color:#10b981;width:14px"></i> ${esc(s.products)}</div>`:''}
      </div>
    </div>`).join('');
}

async function openSupModal(id=null){
  ['s-company','s-contact','s-phone','s-email','s-prods','s-addr'].forEach(f=>{const el=document.getElementById(f);if(el)el.value='';});
  document.getElementById('s-id').value='';
  if(id){
    const s=await db.suppliers.get(id);if(!s)return;
    document.getElementById('s-company').value=s.companyName||'';
    document.getElementById('s-contact').value=s.contactPerson||'';
    document.getElementById('s-phone').value=s.phone||'';
    document.getElementById('s-email').value=s.email||'';
    document.getElementById('s-prods').value=s.products||'';
    document.getElementById('s-addr').value=s.address||'';
    document.getElementById('s-id').value=s.id;
    setText('sm-title','Edit Supplier');
  } else { setText('sm-title','Add Supplier'); }
  openModal('sup-modal');
}

async function saveSupplier(){
  const company=(document.getElementById('s-company').value||'').trim();
  if(!company){toast('Company name required!','error');return;}
  const data={companyName:company,contactPerson:document.getElementById('s-contact').value.trim(),phone:document.getElementById('s-phone').value.trim(),email:document.getElementById('s-email').value.trim(),products:document.getElementById('s-prods').value.trim(),address:document.getElementById('s-addr').value.trim()};
  const eid=parseInt(document.getElementById('s-id').value);
  eid?await db.suppliers.update(eid,data):await db.suppliers.add(data);
  toast(eid?'Supplier updated!':'Supplier added!','success');
  closeModal('sup-modal');loadSuppliers();
}

async function delSup(id){if(!confirm('Delete?'))return;await db.suppliers.delete(id);toast('Deleted.','success');loadSuppliers();}

// -- GRN
let _grnRows=[];

async function loadGrn(){
  const gs=await db.grn.orderBy('id').reverse().toArray();
  const tb=document.getElementById('grn-table');
  const em=document.getElementById('grn-empty');
  if(!gs.length){tb.innerHTML='';em.style.display='block';return;}
  em.style.display='none';
  tb.innerHTML=(await Promise.all(gs.map(async g=>{
    const cnt=await db.grnItems.where('grnId').equals(g.id).count();
    return `<tr>
      <td style="color:#475569">#${g.id}</td>
      <td style="font-size:12px;color:#64748b">${new Date(g.timestamp).toLocaleDateString('en-LK')}</td>
      <td style="color:#e2e8f0;font-weight:600">${esc(g.supplierName||'�')}</td>
      <td style="color:#94a3b8">${cnt} items</td>
      <td style="text-align:right;font-weight:700;color:#10b981">Rs. ${fmt(g.totalCost)}</td>
      <td style="color:#475569;font-size:12px">${esc(g.notes||'')}</td>
      <td style="text-align:center"><button class="btn" onclick="viewGrn(${g.id})" style="background:rgba(99,102,241,.1);color:#818cf8;border:1px solid rgba(99,102,241,.2);padding:5px 10px;font-size:11px;border-radius:8px"><i class="fas fa-eye"></i> View</button></td>
    </tr>`;
  }))).join('');
}

async function openGrnModal(){
  _grnRows=[];renderGrnRows();
  document.getElementById('grn-notes').value='';
  document.getElementById('grn-search').value='';
  document.getElementById('grn-qty').value=1;
  document.getElementById('grn-buy').value='';
  // Fill supplier dropdown
  const sups=await db.suppliers.toArray();
  const sel=document.getElementById('grn-sup');
  sel.innerHTML='<option value="">-- Select Supplier --</option>'+sups.map(s=>`<option value="${s.id}">${esc(s.companyName)}</option>`).join('');
  // Set today's date
  document.getElementById('grn-date').value=new Date().toISOString().split('T')[0];
  // Fill prod dropdown
  await grnSearch();
  openModal('grn-modal');
}

async function grnSearch(){
  const q=(document.getElementById('grn-search')?.value||'').toLowerCase();
  const ps=await db.products.toArray();
  const filt=q?ps.filter(p=>p.name.toLowerCase().includes(q)||(p.barcode||'').toLowerCase().includes(q)):ps;
  const sel=document.getElementById('grn-prod');
  sel.innerHTML='<option value="">-- Select product --</option>'+filt.map(p=>`<option value="${p.id}">${esc(p.name)} (Stock: ${p.stock})</option>`).join('');
}

function addGrnRow(){
  const pid=parseInt(document.getElementById('grn-prod').value);
  const qty=parseInt(document.getElementById('grn-qty').value)||0;
  const buy=parseFloat(document.getElementById('grn-buy').value)||0;
  if(!pid||qty<=0||buy<=0){toast('Select product, qty and price!','error');return;}
  const prod=document.getElementById('grn-prod');
  const name=prod.options[prod.selectedIndex]?.text.split(' (')[0]||'';
  const ex=_grnRows.find(r=>r.productId===pid);
  if(ex){ex.qty+=qty;ex.buyPrice=buy;}
  else _grnRows.push({productId:pid,productName:name,qty,buyPrice:buy});
  renderGrnRows();
  document.getElementById('grn-qty').value=1;
  document.getElementById('grn-buy').value='';
  document.getElementById('grn-search').value='';
}

function removeGrnRow(i){_grnRows.splice(i,1);renderGrnRows();}

function renderGrnRows(){
  const c=document.getElementById('grn-rows');
  const em=document.getElementById('grn-empty-msg');
  let total=0;
  if(!_grnRows.length){c.innerHTML='';if(em)em.style.display='block';setText('grn-total','Rs. 0.00');return;}
  if(em)em.style.display='none';
  c.innerHTML=_grnRows.map((r,i)=>{
    const t=r.qty*r.buyPrice;total+=t;
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(99,179,237,.07)">
      <div style="flex:1;font-size:13px;color:#e2e8f0">${esc(r.productName)}</div>
      <span style="font-size:12px;color:#94a3b8">�${r.qty}</span>
      <span style="font-size:12px;color:#a5b4fc">Rs.${fmt(r.buyPrice)}</span>
      <span style="font-size:13px;font-weight:700;color:#10b981;min-width:70px;text-align:right">Rs.${fmt(t)}</span>
      <button onclick="removeGrnRow(${i})" style="background:rgba(239,68,68,.12);border:none;width:24px;height:24px;border-radius:6px;color:#f87171;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center"><i class="fas fa-trash"></i></button>
    </div>`;
  }).join('');
  setText('grn-total','Rs. '+fmt(total));
}

async function saveGrn(){
  if(!_grnRows.length){toast('Add at least one item!','error');return;}
  const supId=parseInt(document.getElementById('grn-sup').value)||null;
  const supEl=document.getElementById('grn-sup');
  const supName=supEl.options[supEl.selectedIndex]?.text||'';
  const notes=document.getElementById('grn-notes').value.trim();
  const total=_grnRows.reduce((s,r)=>s+r.qty*r.buyPrice,0);
  const gid=await db.grn.add({timestamp:Date.now(),supplierId:supId,supplierName:supName!='-- Select Supplier --'?supName:'',totalCost:total,notes});
  for(const r of _grnRows){
    await db.grnItems.add({grnId:gid,productId:r.productId,productName:r.productName,qty:r.qty,buyPrice:r.buyPrice});
    const p=await db.products.get(r.productId);
    if(p) await db.products.update(r.productId,{stock:p.stock+r.qty,buyingPrice:r.buyPrice});
  }
  _grnRows=[];closeModal('grn-modal');
  toast('GRN #'+gid+' saved! Stock updated ?','success');
  await loadGrn();await renderLowStock();
  allProds=await db.products.toArray();
}

async function viewGrn(id){
  const g=await db.grn.get(id);
  const items=await db.grnItems.where('grnId').equals(id).toArray();
  setText('gv-title','GRN #'+id);
  let total=0;
  const rows=items.map(it=>{const t=it.qty*it.buyPrice;total+=t;return `<tr><td style="padding:5px 0">${esc(it.productName)}</td><td style="text-align:center">${it.qty}</td><td style="text-align:right">Rs.${fmt(it.buyPrice)}</td><td style="text-align:right;font-weight:700">Rs.${fmt(t)}</td></tr>`;}).join('');
  document.getElementById('grn-print-content').innerHTML=`
    <div style="text-align:center;margin-bottom:10px;padding-bottom:8px;border-bottom:2px dashed #000">
      <div style="font-size:16px;font-weight:900;color:#000">SUPERMART POS</div>
      <div style="font-size:11px;color:#555">Goods Received Note</div>
      <div style="font-size:11px;color:#666;margin-top:3px">GRN #${id} � ${new Date(g.timestamp).toLocaleDateString('en-LK')} � Supplier: ${esc(g.supplierName||'�')}</div>
      ${g.notes?`<div style="font-size:11px;color:#666">Notes: ${esc(g.notes)}</div>`:''}
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="border-bottom:1px solid #ccc"><th style="text-align:left;padding:4px">Product</th><th style="text-align:center;padding:4px">Qty</th><th style="text-align:right;padding:4px">Unit Price</th><th style="text-align:right;padding:4px">Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:10px;padding-top:8px;border-top:2px dashed #000;text-align:right;font-size:15px;font-weight:900;color:#000">Total: Rs.${fmt(total)}</div>`;
  openModal('grn-view');
}

function printGrnNote(){ window.print(); }

// -- REPORTS
function setRptDefaults(){
  const t=new Date();const f=new Date(t);f.setDate(f.getDate()-6);
  const fi=document.getElementById('rpt-from');const ti=document.getElementById('rpt-to');
  if(fi)fi.value=f.toISOString().split('T')[0];
  if(ti)ti.value=t.toISOString().split('T')[0];
}

async function genReport(){
  const fs=document.getElementById('rpt-from')?.value;
  const ts=document.getElementById('rpt-to')?.value;
  if(!fs||!ts)return;
  const from=new Date(fs+'T00:00:00');const to=new Date(ts+'T23:59:59');
  reportData=await db.sales.where('timestamp').between(from.getTime(),to.getTime()).toArray();
  let rev=0,prof=0;
  reportData.forEach(s=>{rev+=s.totalAmount||0;prof+=s.profit||0;});
  setText('r-rev','Rs. '+fmt(rev));
  setText('r-profit','Rs. '+fmt(prof));
  setText('r-count',reportData.length);
  setText('r-avg','Rs. '+fmt(reportData.length?rev/reportData.length:0));
  // Line chart
  const byD={};
  reportData.forEach(s=>{const k=new Date(s.timestamp).toLocaleDateString('en-LK');if(!byD[k])byD[k]={r:0,p:0};byD[k].r+=s.totalAmount||0;byD[k].p+=s.profit||0;});
  const dl=Object.keys(byD);
  if(rptChart)rptChart.destroy();
  rptChart=new Chart(document.getElementById('rpt-chart'),{type:'line',data:{labels:dl,datasets:[
    {label:'Revenue',data:dl.map(k=>byD[k].r),borderColor:'#6366f1',backgroundColor:'rgba(99,102,241,.1)',fill:true,tension:.4,pointRadius:4},
    {label:'Profit',data:dl.map(k=>byD[k].p),borderColor:'#10b981',backgroundColor:'rgba(16,185,129,.1)',fill:true,tension:.4,pointRadius:4},
  ]},options:cOpts()});
  // Doughnut
  const pm={};
  for(const s of reportData){(await db.saleItems.where('saleId').equals(s.id).toArray()).forEach(it=>{pm[it.productName]=(pm[it.productName]||0)+it.qty;});}
  const top=Object.entries(pm).sort((a,b)=>b[1]-a[1]).slice(0,7);
  if(topChart)topChart.destroy();
  if(top.length)topChart=new Chart(document.getElementById('top-chart'),{type:'doughnut',data:{labels:top.map(e=>e[0]),datasets:[{data:top.map(e=>e[1]),backgroundColor:['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4'],borderColor:'#0d1829',borderWidth:2}]},options:{responsive:true,plugins:{legend:{position:'right',labels:{color:'#64748b',font:{size:10},boxWidth:10,padding:8}}}}});
  // Table
  const tb=document.getElementById('rpt-table');
  if(!reportData.length){tb.innerHTML='<tr><td colspan="7" style="text-align:center;padding:24px;color:#334155">No data.</td></tr>';return;}
  tb.innerHTML=reportData.map(s=>`<tr>
    <td style="color:#475569">#${s.id}</td>
    <td style="font-size:12px;color:#64748b">${new Date(s.timestamp).toLocaleString('en-LK')}</td>
    <td style="font-size:12px;color:#a5b4fc">${esc(s.customerName||'�')}</td>
    <td style="text-align:right;font-weight:700;color:#fff">Rs.${fmt(s.totalAmount)}</td>
    <td style="text-align:right;color:#f87171;font-size:12px">${s.discount}%</td>
    <td style="text-align:right;font-weight:600;color:#34d399">Rs.${fmt(s.profit)}</td>
    <td><span class="badge" style="${s.paymentMethod==='cash'?'background:rgba(16,185,129,.12);color:#34d399':'background:rgba(139,92,246,.12);color:#a78bfa'}">${cap(s.paymentMethod)}</span></td>
  </tr>`).join('');
}

function exportCSV(){
  if(!reportData.length){toast('No data!','warning');return;}
  let c='ID,DateTime,Customer,Revenue,Discount%,Profit,Payment\n';
  reportData.forEach(s=>{c+=`${s.id},"${new Date(s.timestamp).toLocaleString('en-LK')}","${s.customerName||''}",${fmt(s.totalAmount)},${s.discount},${fmt(s.profit)},${s.paymentMethod}\n`;});
  dlBlob(c,'text/csv','report_'+Date.now()+'.csv');
  toast('CSV exported!','success');
}

// -- BACKUP
async function exportDB(){
  const d={exported:new Date().toISOString(),products:await db.products.toArray(),sales:await db.sales.toArray(),saleItems:await db.saleItems.toArray(),suppliers:await db.suppliers.toArray(),customers:await db.customers.toArray(),grn:await db.grn.toArray(),grnItems:await db.grnItems.toArray()};
  dlBlob(JSON.stringify(d,null,2),'application/json','supermart_backup_'+Date.now()+'.json');
  toast('Backup downloaded!','success');
}

function dlBlob(txt,mime,name){
  const u=URL.createObjectURL(new Blob([txt],{type:mime}));
  const a=Object.assign(document.createElement('a'),{href:u,download:name});
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u);
}

// -- CATEGORY HELPERS
async function refreshCats(){
  const ps=await db.products.toArray();
  const cats=[...new Set(ps.map(p=>p.category))].sort();
  ['pos-cat','inv-cat'].forEach(id=>{
    const el=document.getElementById(id);if(!el)return;
    const cur=el.value;
    el.innerHTML='<option value="">All Categories</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
    if(cur)el.value=cur;
  });
}

async function fillCatDl(){
  const ps=await db.products.toArray();
  const cats=[...new Set(ps.map(p=>p.category))].sort();
  const dl=document.getElementById('cat-dl');
  if(dl)dl.innerHTML=cats.map(c=>`<option value="${esc(c)}">`).join('');
}

// -- CHART OPTIONS
function cOpts(){
  const g='rgba(99,179,237,.05)';
  return{responsive:true,plugins:{legend:{labels:{color:'#475569',font:{size:11},padding:10}}},
    scales:{x:{ticks:{color:'#334155',font:{size:10}},grid:{color:g}},y:{ticks:{color:'#334155',font:{size:10},callback:v=>'Rs.'+v},grid:{color:g}}}};
}

// -- MODAL HELPERS
function openModal(id){const el=document.getElementById(id);if(el)el.classList.add('open');}
function closeModal(id){const el=document.getElementById(id);if(el)el.classList.remove('open');}
function oc(e,id){if(e.target===document.getElementById(id))closeModal(id);}

// -- TOAST
let _tt;
function toast(msg,type='success'){
  const colors={success:'#059669',error:'#dc2626',warning:'#d97706',info:'#4f46e5'};
  const icons={success:'fa-check-circle',error:'fa-xmark-circle',warning:'fa-triangle-exclamation',info:'fa-circle-info'};
  const el=document.getElementById('ti');
  el.style.background=colors[type]||colors.success;
  el.innerHTML=`<i class="fas ${icons[type]||icons.success}" style="font-size:15px"></i><span>${msg}</span>`;
  const t=document.getElementById('toast');t.classList.add('show');
  clearTimeout(_tt);_tt=setTimeout(()=>t.classList.remove('show'),3000);
}

// -- UTILS
function fmt(n){return Number(n||0).toFixed(2);}
function cap(s){return s?s[0].toUpperCase()+s.slice(1):'';}
function setText(id,v){const el=document.getElementById(id);if(el)el.textContent=v;}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function todayRange(){const s=new Date();s.setHours(0,0,0,0);const e=new Date(s);e.setDate(e.getDate()+1);return{s:s.getTime(),e:e.getTime()};}
