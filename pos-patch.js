/* pos-patch.js — SuperMart POS v3 — Full POS Page Fix
   Fixes: Cart qty input, Customer search/select, Bill preview/print
*/
(function () {

    // ══════════════════════════════════════════════════════
    // 1. RENDER CART — with editable qty input
    // ══════════════════════════════════════════════════════
    window.renderCart = function () {
        const ci = document.getElementById('cart-items');
        const ce = document.getElementById('cart-empty');
        const cc = document.getElementById('cart-count');
        if (!ci || !ce) return;

        const tot = cart.reduce((s, c) => s + c.qty, 0);
        if (cc) cc.textContent = tot;

        if (!cart.length) {
            ci.style.display = 'none';
            ce.style.display = 'flex';
        } else {
            ci.style.display = 'flex';
            ce.style.display = 'none';
            ci.innerHTML = cart.map(it => `
        <div class="ci" style="background:rgba(13,24,41,.9);border:1.5px solid rgba(99,179,237,.08);border-radius:12px;padding:10px 12px;animation:si .2s ease;margin-bottom:2px">
          <div style="display:flex;align-items:flex-start;gap:7px">
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:600;color:#e2e8f0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(it.product.name)}</div>
              <div style="font-size:11px;color:#6366f1;margin-top:2px">Rs.${fmt(it.product.sellingPrice)} × <b style="color:#a5b4fc">${it.qty}</b> = <b style="color:#fff">Rs.${fmt(it.product.sellingPrice * it.qty)}</b></div>
            </div>
            <button onclick="rmCart(${it.product.id})" style="background:rgba(239,68,68,.12);border:none;width:24px;height:24px;border-radius:6px;color:#f87171;cursor:pointer;flex-shrink:0;font-size:11px;display:flex;align-items:center;justify-content:center"><i class="fas fa-trash"></i></button>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:8px">
            <button onclick="setQty(${it.product.id},-1)" style="width:26px;height:26px;border-radius:7px;background:rgba(255,255,255,.07);border:1px solid rgba(99,179,237,.12);color:#e2e8f0;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0">−</button>
            <input type="number" min="1" max="${it.product.stock}" value="${it.qty}"
              onchange="setQtyVal(${it.product.id},this.value)"
              onclick="this.select()"
              style="width:52px;height:26px;border-radius:7px;background:rgba(255,255,255,.07);border:1.5px solid rgba(99,102,241,.3);color:#fff;font-size:13px;font-weight:700;text-align:center;outline:none;padding:0 4px"/>
            <button onclick="setQty(${it.product.id},1)" style="width:26px;height:26px;border-radius:7px;background:rgba(255,255,255,.07);border:1px solid rgba(99,179,237,.12);color:#e2e8f0;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0">+</button>
            <span style="font-size:10px;color:#334155;margin-left:2px">/ ${it.product.stock}</span>
          </div>
        </div>`).join('');
        }
        updateTotals();
    };

    // setQty: increment/decrement
    window.setQty = function (id, d) {
        const it = cart.find(c => c.product.id === id);
        if (!it) return;
        const n = it.qty + d;
        if (n <= 0) { cart = cart.filter(c => c.product.id !== id); }
        else if (n > it.product.stock) { toast('Max stock: ' + it.product.stock, 'warning'); return; }
        else { it.qty = n; }
        renderCart();
    };

    // setQtyVal: direct input
    window.setQtyVal = function (id, val) {
        const it = cart.find(c => c.product.id === id);
        if (!it) return;
        const n = parseInt(val);
        if (isNaN(n) || n <= 0) { it.qty = 1; }
        else if (n > it.product.stock) { it.qty = it.product.stock; toast('Max stock: ' + it.product.stock, 'warning'); }
        else { it.qty = n; }
        renderCart();
    };

    // Keep chgQty alias for backward compat
    window.chgQty = window.setQty;

    // ══════════════════════════════════════════════════════
    // 2. PRODUCT CARD — click for qty prompt
    // ══════════════════════════════════════════════════════
    window.addToCart = function (pOrId) {
        const p = typeof pOrId === 'object' ? pOrId : (window.allProds || []).find(x => x.id === pOrId);
        if (!p) return;
        if (p.stock <= 0) { toast('Out of stock!', 'error'); return; }
        const ex = cart.find(c => c.product.id === p.id);
        if (ex) {
            if (ex.qty >= p.stock) { toast('Max stock reached!', 'warning'); return; }
            ex.qty++;
        } else {
            cart.push({ product: p, qty: 1 });
        }
        renderCart();
        toast(p.name + ' added ✓', 'success');
    };

    // ══════════════════════════════════════════════════════
    // 3. CUSTOMER SEARCH — robust implementation
    // ══════════════════════════════════════════════════════
    let _custResults = [];

    window.searchCust = async function () {
        const inp = document.getElementById('pos-cust');
        const drop = document.getElementById('cust-drop');
        if (!inp || !drop) return;
        const q = (inp.value || '').trim().toLowerCase();
        if (!q || q.length < 1) { drop.style.display = 'none'; return; }

        const all = await db.customers.toArray();
        _custResults = all.filter(c =>
            c.name.toLowerCase().includes(q) || (c.phone || '').includes(q)
        );

        if (!_custResults.length) {
            drop.innerHTML = '<div style="padding:10px 12px;font-size:12px;color:#475569;">No match. Press Enter to add new.</div>';
            drop.style.display = 'block';
            return;
        }

        drop.style.display = 'block';
        drop.innerHTML = _custResults.map((c, i) =>
            `<div onclick="selectCust(${i})" style="padding:9px 12px;font-size:12px;cursor:pointer;border-bottom:1px solid rgba(99,179,237,.07);color:#e2e8f0;transition:background .15s"
        onmouseover="this.style.background='rgba(99,102,241,.12)'"
        onmouseout="this.style.background=''">
        <b style="color:#a5b4fc">${esc(c.name)}</b>
        <span style="color:#475569;margin-left:8px">${esc(c.phone || '')}</span>
        <span style="float:right;font-size:10px;color:#334155">${c.visitCount || 0} visits</span>
      </div>`
        ).join('');
    };

    window.custKey = function (e) {
        if (e.key === 'Enter') {
            if (_custResults.length) { selectCust(0); }
            else {
                // Quick add customer by phone
                const inp = document.getElementById('pos-cust');
                const v = (inp?.value || '').trim();
                if (v) quickAddCust(v);
            }
        } else if (e.key === 'Escape') {
            const drop = document.getElementById('cust-drop');
            if (drop) drop.style.display = 'none';
        }
    };

    window.selectCust = function (i) {
        const c = _custResults[i];
        if (!c) return;
        window.selCust = c;
        const inp = document.getElementById('pos-cust');
        const drop = document.getElementById('cust-drop');
        const sel = document.getElementById('cust-selected');
        const nm = document.getElementById('cust-name-show');
        if (inp) inp.value = '';
        if (drop) drop.style.display = 'none';
        if (sel) { sel.style.display = 'flex'; sel.style.removeProperty('display'); sel.style.cssText += ';display:flex!important'; }
        if (nm) nm.textContent = c.name + '   📞 ' + c.phone;
        toast('Customer: ' + c.name, 'info');
    };

    window.clearCust = function () {
        window.selCust = null;
        const sel = document.getElementById('cust-selected');
        const inp = document.getElementById('pos-cust');
        if (sel) { sel.style.display = 'none'; }
        if (inp) inp.value = '';
        _custResults = [];
    };

    // Quick add customer inline
    async function quickAddCust(input) {
        const isPhone = /^\d{7,}$/.test(input.replace(/\D/g, ''));
        const name = isPhone ? prompt('Name for ' + input + ':') || input : input;
        const phone = isPhone ? input : prompt('Phone for ' + name + ':') || '';
        if (!name) return;
        const ex = phone ? await db.customers.where('phone').equals(phone).first() : null;
        if (ex) { window.selCust = ex; selectCust(-1); _custResults = [ex]; selectCust(0); return; }
        const id = await db.customers.add({ name, phone, email: '', address: '', totalSpent: 0, visitCount: 0 });
        const nc = await db.customers.get(id);
        window.selCust = nc;
        _custResults = [nc];
        selectCust(0);
        toast('Customer added: ' + name, 'success');
    }

    // Fix initial cust-selected display (CSS conflict fix)
    document.addEventListener('DOMContentLoaded', function () {
        const sel = document.getElementById('cust-selected');
        if (sel) sel.style.display = 'none';
    });

    // ══════════════════════════════════════════════════════
    // 4. OPEN CHECKOUT — robust
    // ══════════════════════════════════════════════════════
    window.openCheckout = function () {
        if (!cart || !cart.length) { toast('Cart is empty!', 'warning'); return; }
        const sub = cart.reduce((s, c) => s + c.product.sellingPrice * c.qty, 0);
        const discEl = document.getElementById('disc-inp');
        const dc = Math.min(100, Math.max(0, parseFloat(discEl?.value) || 0));
        const tot = sub * (1 - dc / 100);
        window.ckTotal = tot;

        setText('ck-sub', 'Rs. ' + fmt(sub));
        setText('ck-disc', dc > 0 ? '-Rs. ' + fmt(sub * dc / 100) + ' (' + dc + '%)' : 'None');
        setText('ck-total', 'Rs. ' + fmt(tot));
        setText('ck-method', payMethod);
        setText('ck-cust', window.selCust ? window.selCust.name + ' (' + window.selCust.phone + ')' : '— Guest');

        const cashRow = document.getElementById('cash-row');
        if (cashRow) cashRow.style.display = payMethod === 'cash' ? 'block' : 'none';

        const ci = document.getElementById('cash-in');
        if (ci) { ci.value = ''; ci.focus(); }
        setText('change-out', 'Rs. 0.00');
        openModal('ckout-modal');
    };

    window.calcChange = function () {
        const r = parseFloat(document.getElementById('cash-in')?.value) || 0;
        const tot = window.ckTotal || 0;
        setText('change-out', 'Rs. ' + fmt(Math.max(0, r - tot)));
    };

    // ══════════════════════════════════════════════════════
    // 5. COMPLETE SALE — robust
    // ══════════════════════════════════════════════════════
    window.completeSale = async function () {
        if (!cart || !cart.length) return;
        const sub = cart.reduce((s, c) => s + c.product.sellingPrice * c.qty, 0);
        const discEl = document.getElementById('disc-inp');
        const dc = Math.min(100, Math.max(0, parseFloat(discEl?.value) || 0));
        const tot = sub * (1 - dc / 100);

        if (payMethod === 'cash') {
            const recv = parseFloat(document.getElementById('cash-in')?.value) || 0;
            if (recv < tot - 0.01) { toast('Cash received is less than total!', 'error'); return; }
        }

        const recv = payMethod === 'cash' ? (parseFloat(document.getElementById('cash-in')?.value) || tot) : tot;
        let rawPf = 0;
        cart.forEach(c => { rawPf += (c.product.sellingPrice - c.product.buyingPrice) * c.qty; });
        const profit = rawPf * (1 - dc / 100);

        const sid = await db.sales.add({
            timestamp: Date.now(), subTotal: sub, discount: dc, totalAmount: tot,
            paymentMethod: payMethod, profit,
            customerId: window.selCust?.id || null,
            customerName: window.selCust?.name || null,
        });

        for (const it of cart) {
            await db.saleItems.add({
                saleId: sid, productId: it.product.id, productName: it.product.name,
                qty: it.qty, priceAtSale: it.product.sellingPrice, buyPrice: it.product.buyingPrice,
            });
            const cur = await db.products.get(it.product.id);
            if (cur) await db.products.update(it.product.id, { stock: Math.max(0, cur.stock - it.qty) });
        }

        // Update customer stats
        if (window.selCust) {
            await db.customers.update(window.selCust.id, {
                totalSpent: (window.selCust.totalSpent || 0) + tot,
                visitCount: (window.selCust.visitCount || 0) + 1,
            });
        }

        const rc = [...cart];
        closeModal('ckout-modal');

        // Build and show receipt
        buildReceipt({ sid, rc, sub, dc, tot, payMethod, recv, cust: window.selCust });
        openModal('rcpt-modal');

        // WhatsApp
        if (window.selCust?.phone) {
            setTimeout(() => {
                if (typeof sendWA === 'function') sendWA(window.selCust, { sid, rc, sub, dc, tot, payMethod, recv });
                else if (typeof sendWhatsAppBill === 'function') sendWhatsAppBill(window.selCust, { sid, rc, sub, dc, tot, payMethod, recv });
            }, 1000);
        }

        clearCart();
        clearCust();

        if (typeof allProds !== 'undefined') {
            allProds = await db.products.toArray();
            if (typeof posSearch === 'function') posSearch();
        }
        if (typeof renderLowStock === 'function') await renderLowStock();
        toast('Sale #' + sid + ' completed! 🎉', 'success');
    };

    // ══════════════════════════════════════════════════════
    // 6. BUILD RECEIPT — bulletproof thermal format
    // ══════════════════════════════════════════════════════
    window.buildReceipt = function ({ sid, rc, sub, dc, tot, payMethod, recv, cust }) {
        const now = new Date();
        const dateStr = now.toLocaleString('en-LK');

        // Header
        setText('r-date', dateStr);
        setText('r-id', 'Receipt #' + sid);
        setText('r-cust-name', cust ? 'Customer: ' + cust.name : '');
        setText('r-cust-phone', cust ? 'Phone:    ' + cust.phone : '');

        // Items
        const rib = document.getElementById('r-items');
        if (rib) {
            rib.innerHTML = rc.map(c => {
                const lineTotal = c.product.sellingPrice * c.qty;
                const name = c.product.name.length > 20 ? c.product.name.slice(0, 19) + '…' : c.product.name;
                return `<div style="display:flex;justify-content:space-between;margin-bottom:3px;font-size:11px;">
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:8px;">${esc(name)}</span>
          <span style="white-space:nowrap;">${c.qty} × Rs.${fmt(c.product.sellingPrice)}</span>
          <span style="white-space:nowrap;font-weight:700;min-width:60px;text-align:right;">Rs.${fmt(lineTotal)}</span>
        </div>`;
            }).join('');
        }

        // Totals
        setText('r-sub', 'Rs.' + fmt(sub));
        setText('r-disc', dc > 0 ? '-Rs.' + fmt(sub * dc / 100) + ' (' + dc + '%)' : '—');
        setText('r-total', 'Rs.' + fmt(tot));
        setText('r-method', payMethod.toUpperCase());
        setText('r-cash', payMethod === 'cash' ? 'Rs.' + fmt(recv) : '—');
        setText('r-change', payMethod === 'cash' ? 'Rs.' + fmt(Math.max(0, recv - tot)) : '—');
    };

    // ══════════════════════════════════════════════════════
    // 7. CLOSE RECEIPT MODAL
    // ══════════════════════════════════════════════════════
    window.closeReceipt = function () { closeModal('rcpt-modal'); };

    // Make rcpt-modal closeable by clicking background  
    document.addEventListener('DOMContentLoaded', function () {
        const rm = document.getElementById('rcpt-modal');
        if (rm) {
            rm.onclick = function (e) {
                if (e.target === rm) closeModal('rcpt-modal');
            };
        }
    });

    // ══════════════════════════════════════════════════════
    // 8. UTILS (in case app.js versions differ)
    // ══════════════════════════════════════════════════════
    function setText(id, v) {
        const el = document.getElementById(id);
        if (el) el.textContent = v || '';
    }
    function fmt(n) { return Number(n || 0).toFixed(2); }
    function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    console.log('[pos-patch] POS functions patched: cart, customer, checkout, receipt.');

})();
