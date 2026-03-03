/* print-pos.js
   1. Thermal print (single page, correct format)
   2. Barcode scanner auto-detect → add to cart + qty popup
   3. Hold Bill — save/restore cart
   4. Live bill preview panel on POS page
*/
(function () {

    // ── 1. PRINT STYLES (thermal 80mm, single page) ─────────────────────────────
    (function addPrintStyles() {
        if (document.getElementById('thermal-print-css')) return;
        const s = document.createElement('style');
        s.id = 'thermal-print-css';
        s.textContent = `
@media print {
  body > *                    { display:none !important; }
  #print-area                 { display:block !important; }
  #print-area                 { position:fixed;top:0;left:0;width:80mm;font-family:'Courier New',monospace;font-size:11pt;color:#000;background:#fff; }
  .no-print                   { display:none !important; }
  @page { size:80mm auto; margin:4mm; }
}
#print-area { display:none; }
`;
        document.head.appendChild(s);
    })();

    // ── 2. PRINT AREA ─────────────────────────────────────────────────────────────
    function ensurePrintArea() {
        if (document.getElementById('print-area')) return;
        const d = document.createElement('div');
        d.id = 'print-area';
        document.body.appendChild(d);
    }

    window.printThermal = function (data) {
        ensurePrintArea();
        const { sid, rc, sub, dc, tot, payMethod, recv, cust } = data;
        const now = new Date().toLocaleString('en-LK');
        const line = '--------------------------------';
        let html = `
    <div style="text-align:center;margin-bottom:6px;">
      <div style="font-size:16pt;font-weight:900;letter-spacing:1px;">SUPERMART POS</div>
      <div style="font-size:9pt;">Colombo, Sri Lanka</div>
      <div style="font-size:9pt;">Tel: 011-XXXXXXX</div>
    </div>
    <div style="border-top:1px dashed #000;margin:4px 0;"></div>
    <div style="font-size:9pt;text-align:center;">${now}</div>
    <div style="font-size:10pt;font-weight:900;text-align:center;">Receipt #${sid}</div>`;
        if (cust) html += `<div style="font-size:9pt;">Customer: ${cust.name}<br>Phone: ${cust.phone}</div>`;
        html += `<div style="border-top:1px dashed #000;margin:4px 0;"></div>`;
        html += `<table style="width:100%;border-collapse:collapse;font-size:10pt;">`;
        rc.forEach(c => {
            const name = c.product.name.length > 20 ? c.product.name.slice(0, 19) + '…' : c.product.name;
            html += `<tr><td colspan="2">${name}</td></tr>
             <tr><td style="padding-left:8px;">${c.qty} x Rs.${fmt(c.product.sellingPrice)}</td>
                 <td style="text-align:right;font-weight:700;">Rs.${fmt(c.product.sellingPrice * c.qty)}</td></tr>`;
        });
        html += `</table><div style="border-top:1px dashed #000;margin:4px 0;"></div>
    <table style="width:100%;font-size:10pt;">`;
        if (dc > 0) html += `<tr><td>Subtotal</td><td style="text-align:right;">Rs.${fmt(sub)}</td></tr>
    <tr><td>Discount ${dc}%</td><td style="text-align:right;">-Rs.${fmt(sub * dc / 100)}</td></tr>`;
        html += `<tr style="font-weight:900;font-size:13pt;"><td>TOTAL</td><td style="text-align:right;">Rs.${fmt(tot)}</td></tr>
    <tr><td>Payment</td><td style="text-align:right;">${payMethod.toUpperCase()}</td></tr>`;
        if (payMethod === 'cash') html += `
    <tr><td>Cash</td><td style="text-align:right;">Rs.${fmt(recv)}</td></tr>
    <tr style="font-weight:700;"><td>Change</td><td style="text-align:right;">Rs.${fmt(Math.max(0, recv - tot))}</td></tr>`;
        html += `</table>
    <div style="border-top:1px dashed #000;margin:6px 0;text-align:center;font-size:9pt;line-height:1.8;">
      Thank you for shopping!<br>Please come again 🙏<br>Powered by SuperMart POS
    </div>`;
        document.getElementById('print-area').innerHTML = html;
        window.print();
    };

    // ── 3. BARCODE SCANNER AUTO-DETECT ────────────────────────────────────────────
    // Scanners type very fast (< 50ms per char) and end with Enter
    let _barcodeBuffer = '';
    let _barcodeTimer = null;
    const SCANNER_SPEED = 60; // ms threshold

    document.addEventListener('keydown', async function (e) {
        const active = document.activeElement;
        // If focused on pos-search input, let normal search handle it
        if (active && active.id === 'pos-search') return;
        // If focused on any input/textarea/select, skip scanner detection
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;
        // Only when POS page is active
        const posPage = document.getElementById('page-pos');
        if (!posPage || !posPage.classList.contains('active')) return;

        if (e.key === 'Enter') {
            if (_barcodeBuffer.length >= 3) {
                // Barcode complete — find product
                const bc = _barcodeBuffer;
                _barcodeBuffer = '';
                clearTimeout(_barcodeTimer);
                await handleBarcodeScan(bc);
            }
            _barcodeBuffer = '';
            return;
        }

        if (e.key.length === 1) {
            _barcodeBuffer += e.key;
            clearTimeout(_barcodeTimer);
            _barcodeTimer = setTimeout(() => { _barcodeBuffer = ''; }, 300);
            e.preventDefault();
        }
    });

    async function handleBarcodeScan(barcode) {
        const ps = window.allProds || await db.products.toArray();
        window.allProds = ps;
        const p = ps.find(x => (x.barcode || '').toLowerCase() === barcode.toLowerCase());
        if (!p) {
            toast('Barcode not found: ' + barcode, 'error');
            return;
        }
        if (p.stock <= 0) { toast('Out of stock: ' + p.name, 'error'); return; }
        // Show qty input popup
        showQtyPopup(p);
    }

    function showQtyPopup(p) {
        // Remove any existing
        const existing = document.getElementById('qty-popup');
        if (existing) existing.remove();

        const pop = document.createElement('div');
        pop.id = 'qty-popup';
        pop.style.cssText = 'position:fixed;inset:0;z-index:8500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);';
        pop.innerHTML = `
    <div style="background:linear-gradient(145deg,#0d1829,#111f35);border:1.5px solid rgba(99,102,241,.3);border-radius:20px;padding:24px;width:320px;box-shadow:0 20px 60px rgba(0,0,0,.7);">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
        <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#4f46e5,#7c3aed);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-barcode" style="color:#fff;font-size:18px;"></i></div>
        <div>
          <div style="font-size:14px;font-weight:800;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px;">${esc(p.name)}</div>
          <div style="font-size:12px;color:#6366f1;margin-top:2px;">Rs. ${fmt(p.sellingPrice)} &nbsp;|&nbsp; <span style="color:#34d399;">Stock: ${p.stock}</span></div>
        </div>
      </div>
      <label style="font-size:11px;font-weight:700;color:#475569;letter-spacing:.08em;text-transform:uppercase;display:block;margin-bottom:6px;">Quantity</label>
      <input id="qty-popup-inp" type="number" min="1" max="${p.stock}" value="1"
        style="width:100%;height:48px;border-radius:12px;background:rgba(255,255,255,.07);border:2px solid rgba(99,102,241,.4);color:#fff;font-size:22px;font-weight:900;text-align:center;outline:none;padding:0;"
        onkeydown="qtyPopupKey(event,${p.id})"/>
      <div style="display:flex;gap:8px;margin-top:14px;">
        <button onclick="closeQtyPopup()" style="flex:1;padding:11px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(99,179,237,.15);color:#64748b;font-size:13px;cursor:pointer;">Cancel</button>
        <button onclick="confirmQtyPopup(${p.id})" style="flex:1;padding:11px;border-radius:10px;background:linear-gradient(135deg,#059669,#10b981);border:none;color:#fff;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(16,185,129,.3);"><i class="fas fa-plus"></i> Add to Cart</button>
      </div>
    </div>`;
        document.body.appendChild(pop);
        pop.onclick = function (e) { if (e.target === pop) closeQtyPopup(); };
        setTimeout(() => { const inp = document.getElementById('qty-popup-inp'); if (inp) { inp.select(); inp.focus(); } }, 80);
        // Store product ref
        window._qtyPopupProd = p;
    }

    window.qtyPopupKey = function (e, pid) {
        if (e.key === 'Enter') confirmQtyPopup(pid);
        if (e.key === 'Escape') closeQtyPopup();
    };

    window.confirmQtyPopup = function (pid) {
        const p = window._qtyPopupProd || (window.allProds || []).find(x => x.id === pid);
        const el = document.getElementById('qty-popup-inp');
        let qty = parseInt(el?.value) || 1;
        if (qty < 1) qty = 1;
        if (qty > p.stock) { qty = p.stock; toast('Max stock: ' + qty, 'warning'); }
        closeQtyPopup();
        // Add to cart with specified qty
        const ex = cart.find(c => c.product.id === p.id);
        if (ex) { ex.qty = Math.min(ex.qty + qty, p.stock); }
        else { cart.push({ product: p, qty }); }
        if (typeof renderCart === 'function') renderCart();
        toast(p.name + ' × ' + qty + ' added ✓', 'success');
    };

    window.closeQtyPopup = function () {
        const pop = document.getElementById('qty-popup');
        if (pop) pop.remove();
        window._qtyPopupProd = null;
    };

    // ── 4. HOLD BILL ──────────────────────────────────────────────────────────────
    const HOLD_KEY = 'sm_held_bills';

    function getHeld() { try { return JSON.parse(localStorage.getItem(HOLD_KEY) || '[]'); } catch (e) { return []; } }
    function saveHeld(arr) { localStorage.setItem(HOLD_KEY, JSON.stringify(arr)); }

    window.holdBill = function () {
        if (!cart || !cart.length) { toast('Cart is empty!', 'warning'); return; }
        const held = getHeld();
        const id = Date.now();
        held.push({
            id,
            timestamp: new Date().toLocaleString('en-LK'),
            cart: cart.map(c => ({ product: c.product, qty: c.qty })),
            cust: window.selCust || null,
            disc: parseFloat(document.getElementById('disc-inp')?.value) || 0,
            total: cart.reduce((s, c) => s + c.product.sellingPrice * c.qty, 0),
        });
        saveHeld(held);
        cart = [];
        window.selCust = null;
        if (typeof renderCart === 'function') renderCart();
        if (typeof clearCust === 'function') clearCust();
        toast('Bill held! #' + id, 'info');
        renderHeldBills();
    };

    window.recallBill = function (id) {
        const held = getHeld();
        const bill = held.find(b => b.id === id);
        if (!bill) { toast('Bill not found!', 'error'); return; }
        if (cart && cart.length) {
            if (!confirm('Replace current cart with held bill?')) return;
        }
        cart = bill.cart.map(c => ({ product: c.product, qty: c.qty }));
        window.selCust = bill.cust || null;
        const di = document.getElementById('disc-inp'); if (di) di.value = bill.disc || 0;
        if (typeof renderCart === 'function') renderCart();
        if (window.selCust && typeof selectCust === 'function') {
            setText('cust-name-show', window.selCust.name);
            setText('cust-phone-show', window.selCust.phone || '');
            const sel = document.getElementById('cust-selected'); if (sel) sel.style.display = 'block';
        }
        // Remove from held
        saveHeld(held.filter(b => b.id !== id));
        renderHeldBills();
        toast('Bill recalled!', 'success');
    };

    window.deleteHeld = function (id) {
        saveHeld(getHeld().filter(b => b.id !== id));
        renderHeldBills();
        toast('Held bill deleted.', 'info');
    };

    function renderHeldBills() {
        const container = document.getElementById('held-bills-panel');
        if (!container) return;
        const held = getHeld();
        if (!held.length) {
            container.innerHTML = '<div style="font-size:11px;color:#334155;text-align:center;padding:10px;">No held bills</div>';
            return;
        }
        container.innerHTML = held.map(b => `
    <div style="background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.2);border-radius:10px;padding:8px 10px;margin-bottom:6px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:11px;font-weight:700;color:#fbbf24;">${b.cust ? b.cust.name : 'Guest'}</div>
          <div style="font-size:10px;color:#475569;">${b.timestamp} &nbsp;•&nbsp; ${b.cart.length} items &nbsp;•&nbsp; Rs.${fmt(b.total)}</div>
        </div>
        <div style="display:flex;gap:4px;">
          <button onclick="recallBill(${b.id})" style="background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.25);color:#34d399;padding:4px 8px;border-radius:7px;font-size:11px;cursor:pointer;"><i class="fas fa-rotate-left"></i> Recall</button>
          <button onclick="deleteHeld(${b.id})" style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);color:#f87171;padding:4px 8px;border-radius:7px;font-size:11px;cursor:pointer;"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>`).join('');
    }

    // ── 5. INJECT HOLD BUTTON + HELD BILLS PANEL + LIVE PREVIEW ─────────────────
    function injectPosExtras() {
        // Hold button in the cart section
        const cartTotal = document.querySelector('#page-pos .card:last-child');
        if (cartTotal && !document.getElementById('hold-btn')) {
            const hb = document.createElement('button');
            hb.id = 'hold-btn';
            hb.onclick = holdBill;
            hb.title = 'Hold current bill';
            hb.style.cssText = 'width:100%;padding:8px;background:rgba(245,158,11,.12);border:1.5px solid rgba(245,158,11,.25);border-radius:10px;color:#fbbf24;font-size:12px;font-weight:700;cursor:pointer;margin-bottom:6px;';
            hb.innerHTML = '<i class="fas fa-pause"></i> Hold Bill';
            const checkoutBtn = cartTotal.querySelector('button:last-child');
            if (checkoutBtn) cartTotal.insertBefore(hb, checkoutBtn);
        }

        // Held bills panel (inject below cart section)
        if (!document.getElementById('held-bills-section')) {
            const posRight = document.querySelector('#page-pos > div > div:last-child');
            if (posRight) {
                const sec = document.createElement('div');
                sec.id = 'held-bills-section';
                sec.className = 'card';
                sec.style.cssText = 'padding:10px;flex-shrink:0;max-height:200px;overflow-y:auto;';
                sec.innerHTML = `
        <div style="font-size:11px;font-weight:700;color:#f59e0b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">
          <i class="fas fa-pause-circle" style="margin-right:4px;"></i>Held Bills
        </div>
        <div id="held-bills-panel"></div>`;
                posRight.appendChild(sec);
                renderHeldBills();
            }
        }

        // Live preview panel — inject below product grid (left side)
        if (!document.getElementById('live-preview-panel')) {
            const posLeft = document.querySelector('#page-pos > div > div:first-child');
            if (posLeft) {
                const pv = document.createElement('div');
                pv.id = 'live-preview-panel';
                pv.className = 'card';
                pv.style.cssText = 'padding:12px;flex-shrink:0;max-height:220px;overflow:auto;';
                pv.innerHTML = `
        <div style="font-size:11px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;display:flex;justify-content:space-between;">
          <span><i class="fas fa-receipt" style="margin-right:5px;"></i>Bill Preview</span>
          <span id="preview-total-badge" style="background:rgba(16,185,129,.15);color:#34d399;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:900;"></span>
        </div>
        <div id="live-preview-items" style="font-size:11px;color:#64748b;">
          <div style="color:#1e3a5f;text-align:center;padding:12px;">Add items to see preview</div>
        </div>`;
                posLeft.appendChild(pv);
            }
        }
    }

    // ── 6. LIVE BILL PREVIEW UPDATE ───────────────────────────────────────────────
    const _origRenderCart = window.renderCart;
    window.renderCart = function () {
        if (_origRenderCart) _origRenderCart();
        updateLivePreview();
    };

    function updateLivePreview() {
        const lp = document.getElementById('live-preview-items');
        const tb = document.getElementById('preview-total-badge');
        if (!lp) return;
        if (!cart || !cart.length) {
            lp.innerHTML = '<div style="color:#1e3a5f;text-align:center;padding:8px;">Add items to see preview</div>';
            if (tb) tb.textContent = '';
            return;
        }
        const dc = Math.min(100, Math.max(0, parseFloat(document.getElementById('disc-inp')?.value) || 0));
        const sub = cart.reduce((s, c) => s + c.product.sellingPrice * c.qty, 0);
        const tot = sub * (1 - dc / 100);
        if (tb) tb.textContent = 'Rs. ' + fmt(tot);
        lp.innerHTML = cart.map(c => {
            const lt = c.product.sellingPrice * c.qty;
            const nm = c.product.name.length > 22 ? c.product.name.slice(0, 21) + '…' : c.product.name;
            return `<div style="display:flex;justify-content:space-between;margin-bottom:3px;padding-bottom:3px;border-bottom:1px solid rgba(99,179,237,.05);">
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#94a3b8;">${esc(nm)} <span style="color:#475569;">×${c.qty}</span></span>
      <span style="font-weight:700;color:#e2e8f0;min-width:70px;text-align:right;">Rs.${fmt(lt)}</span>
    </div>`;
        }).join('')
            + (dc > 0 ? `<div style="display:flex;justify-content:space-between;color:#f59e0b;font-size:10px;margin-top:4px;"><span>Discount ${dc}%</span><span>-Rs.${fmt(sub * dc / 100)}</span></div>` : '')
            + `<div style="display:flex;justify-content:space-between;font-weight:900;color:#fff;font-size:13px;margin-top:6px;padding-top:6px;border-top:1px dashed rgba(99,179,237,.15);"><span>TOTAL</span><span style="color:#10b981;">Rs.${fmt(tot)}</span></div>`;
    }

    // ── 7. PATCH completeSale TO USE printThermal ─────────────────────────────────
    const _origCS = window.completeSale;
    window.completeSale = async function () {
        // Allow original to run, then intercept receipt
        if (_origCS) { await _origCS(); }
    };

    // Override buildReceipt to store last data for printing
    const _origBR = window.buildReceipt;
    window.buildReceipt = function (data) {
        window._lastReceiptData = data; // store for printThermal
        if (_origBR) _origBR(data);
    };

    // Override print button in receipt modal
    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(() => {
            const rcptModal = document.getElementById('rcpt-modal');
            if (rcptModal) {
                const printBtn = rcptModal.querySelector('button');
                if (printBtn && printBtn.innerHTML.includes('Print')) {
                    printBtn.onclick = function () {
                        if (window._lastReceiptData) printThermal(window._lastReceiptData);
                        else window.print();
                    };
                }
            }
            injectPosExtras();
            renderHeldBills();
        }, 1000);
    });

    // Re-inject when navigating to POS
    const _origSP2 = window.showPage;
    window.showPage = function (p) {
        if (_origSP2) _origSP2(p);
        if (p === 'pos') {
            setTimeout(() => { injectPosExtras(); renderHeldBills(); updateLivePreview(); }, 300);
        }
    };

    // ── UTILS ─────────────────────────────────────────────────────────────────────
    function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v || ''; }
    function fmt(n) { return Number(n || 0).toFixed(2); }
    function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    console.log('[print-pos] Thermal print, barcode scanner, hold bill, live preview ready.');
})();
