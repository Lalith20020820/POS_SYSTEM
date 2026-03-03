/* extras.js — SuperMart POS v3
   1. Barcode generator (JsBarcode + print labels)
   2. GRN stock auto-update verify/fix
   3. PDF item-wise report (jsPDF + autotable)
   4. Supervisor: hide profit columns
   5. GRN Operator role
   6. GRN item inline edit (add/remove/price edit)
*/
(function () {

    // ── 1. LOAD CDN LIBRARIES DYNAMICALLY ────────────────────────────────────────
    function loadScript(src, cb) {
        if (document.querySelector('script[src="' + src + '"]')) { if (cb) cb(); return; }
        const s = document.createElement('script'); s.src = src; s.onload = cb || null;
        document.head.appendChild(s);
    }

    // Load JsBarcode
    loadScript('https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js');
    // Load jsPDF
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.7.1/jspdf.plugin.autotable.min.js');


    // ── 2. GRN OPERATOR ROLE ─────────────────────────────────────────────────────
    // Extend ROLE_PAGES to include grn_operator
    if (typeof ROLE_PAGES !== 'undefined') {
        ROLE_PAGES['grn_operator'] = ['grn', 'inventory'];
    }

    // Patch applyRole to handle grn_operator in session seeds
    const _origAR = window.applyRole;
    window.applyRole = function () {
        if (_origAR) _origAR();
        // Ensure GRN Operator sees GRN + Inventory only
        if (window.SESSION && window.SESSION.role === 'grn_operator') {
            ['dashboard', 'pos', 'customers', 'suppliers', 'reports', 'users'].forEach(pg => {
                const btn = document.getElementById('nav-' + pg); if (btn) btn.style.display = 'none';
            });
            ['inventory', 'grn'].forEach(pg => {
                const btn = document.getElementById('nav-' + pg); if (btn) btn.style.display = '';
            });
            // Auto-navigate to GRN
            setTimeout(() => { if (typeof showPage === 'function') showPage('grn'); }, 200);
        }
    };


    // ── 3. SUPERVISOR: HIDE PROFIT COLUMNS ───────────────────────────────────────
    function applyProfitVisibility() {
        if (!window.SESSION) return;
        const hideProfit = window.SESSION.role === 'supervisor' || window.SESSION.role === 'cashier' || window.SESSION.role === 'grn_operator';
        // Add CSS to hide profit columns and elements
        let styleEl = document.getElementById('profit-hide-css');
        if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'profit-hide-css'; document.head.appendChild(styleEl); }
        styleEl.textContent = hideProfit ? `
    .profit-col, .profit-cell, [data-profit] { display:none !important; }
    #kpi-profit, #kpi-profit-card { display:none !important; }
    #r-profit-col { display:none !important; }
  ` : '';
    }

    // Call on role change
    const _origAR2 = window.applyRole;
    window.applyRole = function () {
        if (_origAR2) _origAR2();
        applyProfitVisibility();
    };


    // ── 4. BARCODE GENERATOR ─────────────────────────────────────────────────────
    window.openBarcodeModal = async function (productId) {
        const p = productId ? await db.products.get(productId) : null;
        injectBarcodeModal();

        // Fill product selector
        const ps = await db.products.toArray();
        const sel = document.getElementById('bc-prod-sel');
        if (sel) {
            sel.innerHTML = '<option value="">-- Select product --</option>'
                + ps.map(x => `<option value="${x.id}" ${x.id === productId ? 'selected' : ''}>${esc(x.name)} ${x.barcode ? '[' + x.barcode + ']' : ''}</option>`).join('');
        }

        // Set barcode value
        if (p) {
            if (document.getElementById('bc-value')) document.getElementById('bc-value').value = p.barcode || ('PM' + String(p.id).padStart(6, '0'));
            if (document.getElementById('bc-prod-name')) document.getElementById('bc-prod-name').value = p.name;
            if (document.getElementById('bc-price')) document.getElementById('bc-price').value = p.sellingPrice || '';
        }

        const m = document.getElementById('barcode-modal');
        if (m) m.classList.add('open');
        setTimeout(generateBarcodePreview, 200);
    };

    window.generateBarcodePreview = function () {
        const val = (document.getElementById('bc-value')?.value || '').trim();
        const canvas = document.getElementById('bc-canvas');
        if (!canvas || !val) return;
        try {
            if (typeof JsBarcode !== 'undefined') {
                JsBarcode(canvas, val, {
                    format: 'CODE128', width: 2, height: 70,
                    displayValue: true, fontSize: 13, margin: 8,
                    background: '#ffffff', lineColor: '#000000',
                });
            } else {
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#000'; ctx.font = '12px monospace';
                ctx.fillText('JsBarcode loading... ' + val, 10, 40);
            }
        } catch (e) { console.warn('Barcode error:', e); }
    };

    window.saveBarcodeToProduct = async function () {
        const pid = parseInt(document.getElementById('bc-prod-sel')?.value);
        const bv = (document.getElementById('bc-value')?.value || '').trim();
        if (!pid || !bv) { toast('Select product and barcode value!', 'error'); return; }
        await db.products.update(pid, { barcode: bv });
        if (window.allProds) { const i = window.allProds.findIndex(p => p.id === pid); if (i >= 0) window.allProds[i].barcode = bv; }
        toast('Barcode saved to product!', 'success');
    };

    window.printBarcodeLabel = function () {
        const canvas = document.getElementById('bc-canvas');
        const name = (document.getElementById('bc-prod-name')?.value || '').trim();
        const price = (document.getElementById('bc-price')?.value || '').trim();
        const val = (document.getElementById('bc-value')?.value || '').trim();
        if (!canvas) return;
        const dataUrl = canvas.toDataURL('image/png');
        const count = parseInt(document.getElementById('bc-count')?.value) || 1;

        let html = '<!DOCTYPE html><html><head><style>@page{size:62mm 30mm;margin:0}body{margin:0;font-family:Arial,sans-serif} .label{width:62mm;height:30mm;padding:2mm;display:flex;flex-direction:column;align-items:center;justify-content:center;page-break-after:always;box-sizing:border-box;} .label img{max-width:58mm;height:16mm;object-fit:contain;} .pname{font-size:7pt;font-weight:700;text-align:center;margin-bottom:1mm;overflow:hidden;white-space:nowrap;max-width:58mm;} .price{font-size:9pt;font-weight:900;color:#000;margin-top:1mm;}</style></head><body>';
        for (let i = 0; i < count; i++) html += `<div class="label"><div class="pname">${name}</div><img src="${dataUrl}"/><div class="price">Rs. ${price}</div></div>`;
        html += '</body></html>';

        const w = window.open('', '_blank', 'width=400,height=500');
        w.document.write(html);
        w.document.close();
        w.onload = () => { w.print(); };
    };

    window.closeBarcodeModal = function () {
        const m = document.getElementById('barcode-modal'); if (m) m.classList.remove('open');
    };

    function injectBarcodeModal() {
        if (document.getElementById('barcode-modal')) return;
        const m = document.createElement('div');
        m.className = 'mb'; m.id = 'barcode-modal';
        m.onclick = function (e) { if (e.target === m) closeBarcodeModal(); };
        m.innerHTML = `
    <div class="mbox" style="max-width:480px;" onclick="event.stopPropagation()">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <div style="font-size:15px;font-weight:800;color:#fff;"><i class="fas fa-barcode" style="color:#6366f1;margin-right:8px;"></i>Barcode Generator</div>
        <button onclick="closeBarcodeModal()" class="btn bgh bico"><i class="fas fa-xmark"></i></button>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div><label class="lbl">Select Product</label>
          <select id="bc-prod-sel" class="inp" onchange="(async()=>{const p=await db.products.get(parseInt(this.value));if(p){document.getElementById('bc-value').value=p.barcode||('PM'+String(p.id).padStart(6,'0'));document.getElementById('bc-prod-name').value=p.name;document.getElementById('bc-price').value=p.sellingPrice||'';}generateBarcodePreview();})()" ></select></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div><label class="lbl">Barcode Value</label><input id="bc-value" class="inp" placeholder="e.g. 4001234567890" oninput="generateBarcodePreview()"/></div>
          <div><label class="lbl">Price (Rs.)</label><input id="bc-price" class="inp" placeholder="0.00"/></div>
        </div>
        <div><label class="lbl">Product Name (on label)</label><input id="bc-prod-name" class="inp" placeholder="Shown on printed label"/></div>
        <!-- Preview -->
        <div style="background:#fff;border-radius:10px;padding:12px;text-align:center;">
          <canvas id="bc-canvas" style="max-width:100%;"></canvas>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="flex:1;"><label class="lbl">Print Copies</label><input id="bc-count" type="number" min="1" max="100" value="1" class="inp"/></div>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:14px;">
        <button onclick="closeBarcodeModal()" class="btn bgh" style="flex:1;justify-content:center;">Cancel</button>
        <button onclick="saveBarcodeToProduct()" class="btn" style="flex:1;justify-content:center;background:rgba(245,158,11,.12);color:#fbbf24;border:1px solid rgba(245,158,11,.25);border-radius:10px;padding:9px;font-size:12px;font-weight:700;cursor:pointer;"><i class="fas fa-save"></i> Save Barcode</button>
        <button onclick="printBarcodeLabel()" class="btn bp" style="flex:1;justify-content:center;"><i class="fas fa-print"></i> Print Labels</button>
      </div>
    </div>`;
        document.body.appendChild(m);
    }


    // ── 5. PDF REPORT ─────────────────────────────────────────────────────────────
    window.exportPDF = async function () {
        const fs = document.getElementById('rpt-from')?.value;
        const ts = document.getElementById('rpt-to')?.value;
        const q = (document.getElementById('pdf-search')?.value || '').trim().toLowerCase();
        if (!fs || !ts) { toast('Select date range!', 'warning'); return; }

        if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
            toast('PDF library loading... try again in a moment', 'warning'); return;
        }
        const { jsPDF } = window.jspdf || { jsPDF: window.jsPDF };

        const from = new Date(fs + 'T00:00:00');
        const to = new Date(ts + 'T23:59:59');
        const sales = await db.sales.where('timestamp').between(from.getTime(), to.getTime()).toArray();

        // Build item map
        const map = {};
        for (const s of sales) {
            const items = await db.saleItems.where('saleId').equals(s.id).toArray();
            items.forEach(it => {
                if (q && !it.productName.toLowerCase().includes(q)) return;
                if (!map[it.productName]) map[it.productName] = { name: it.productName, qty: 0, revenue: 0, profit: 0 };
                map[it.productName].qty += it.qty;
                map[it.productName].revenue += it.priceAtSale * it.qty;
                map[it.productName].profit += (it.priceAtSale - (it.buyPrice || 0)) * it.qty;
            });
        }
        const rows = Object.values(map).sort((a, b) => b.revenue - a.revenue);

        const showProfit = window.SESSION && (window.SESSION.role === 'manager');

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        doc.setFontSize(16); doc.setFont(undefined, 'bold');
        doc.text('SuperMart POS — Item-Wise Sales Report', 14, 16);
        doc.setFontSize(10); doc.setFont(undefined, 'normal');
        doc.text('Period: ' + fs + ' to ' + ts + (q ? ' | Filter: ' + q : ''), 14, 23);
        doc.text('Generated: ' + new Date().toLocaleString('en-LK'), 14, 29);

        let totalRev = 0, totalPrf = 0, totalQty = 0;
        rows.forEach(r => { totalRev += r.revenue; totalPrf += r.profit; totalQty += r.qty; });

        const cols = showProfit
            ? ['#', 'Product Name', 'Qty Sold', 'Revenue (Rs.)', 'Profit (Rs.)', 'Margin %']
            : ['#', 'Product Name', 'Qty Sold', 'Revenue (Rs.)'];

        const data = rows.map((r, i) => {
            const mg = r.revenue > 0 ? ((r.profit / r.revenue) * 100).toFixed(1) + '%' : '0%';
            return showProfit
                ? [i + 1, r.name, r.qty, fmt(r.revenue), fmt(r.profit), mg]
                : [i + 1, r.name, r.qty, fmt(r.revenue)];
        });

        doc.autoTable({
            head: [cols], body: data,
            startY: 34, theme: 'grid',
            styles: { fontSize: 9, cellPadding: 2 },
            headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 247, 255] },
            foot: [showProfit
                ? ['', 'TOTAL', totalQty, fmt(totalRev), fmt(totalPrf), '']
                : ['', 'TOTAL', totalQty, fmt(totalRev)]
            ],
            footStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
            columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 70 }, 2: { cellWidth: 20, halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'center' } },
        });

        // Sales transaction table (2nd page)
        doc.addPage();
        doc.setFontSize(13); doc.setFont(undefined, 'bold');
        doc.text('Transaction Log', 14, 14);

        const txCols = showProfit
            ? ['#', 'Date', 'Customer', 'Amount', 'Discount', 'Profit', 'Payment']
            : ['#', 'Date', 'Customer', 'Amount', 'Discount', 'Payment'];

        const txData = sales.map(s => showProfit
            ? [s.id, new Date(s.timestamp).toLocaleString('en-LK'), s.customerName || 'Guest', fmt(s.totalAmount), s.discount + '%', fmt(s.profit || 0), s.paymentMethod]
            : [s.id, new Date(s.timestamp).toLocaleString('en-LK'), s.customerName || 'Guest', fmt(s.totalAmount), s.discount + '%', s.paymentMethod]
        );

        doc.autoTable({
            head: [txCols], body: txData,
            startY: 18, theme: 'striped',
            styles: { fontSize: 8, cellPadding: 1.5 },
            headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
        });

        doc.save('supermart_report_' + fs + '_to_' + ts + '.pdf');
        toast('PDF exported!', 'success');
    };


    // ── 6. ADD PDF SEARCH + BUTTON TO REPORTS PAGE ───────────────────────────────
    function addPdfControls() {
        const rp = document.getElementById('page-reports');
        if (!rp || document.getElementById('pdf-export-row')) return;
        const row = document.createElement('div');
        row.id = 'pdf-export-row';
        row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap;';
        row.innerHTML = `
    <input id="pdf-search" class="inp" style="flex:1;min-width:180px;" placeholder="🔍 Filter by product name (for PDF)..."/>
    <button onclick="exportPDF()" class="btn" style="background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;border:none;padding:9px 16px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 3px 10px rgba(220,38,38,.3);"><i class="fas fa-file-pdf"></i> Export PDF</button>`;

        // Find existing export CSV button area and insert before it
        const firstChild = rp.querySelector('.card');
        if (firstChild) rp.insertBefore(row, firstChild.nextSibling);
        else rp.insertBefore(row, rp.firstChild);
    }


    // ── 7. ADD BARCODE BUTTON TO INVENTORY ───────────────────────────────────────
    // Override loadInventory to add barcode button column
    const _origLI = window.loadInventory;
    window.loadInventory = async function () {
        if (_origLI) await _origLI();
        // Add barcode generate buttons to existing inventory table rows
        setTimeout(() => {
            const rows = document.querySelectorAll('#inv-table tr');
            rows.forEach(tr => {
                if (tr.querySelector('.bc-gen-btn')) return; // already added
                const tds = tr.querySelectorAll('td');
                if (!tds.length) return;
                // Get product id from edit button onclick attribute
                const editBtn = tr.querySelector('button[onclick*="openProdModal"]');
                if (!editBtn) return;
                const match = editBtn.getAttribute('onclick').match(/openProdModal\((\d+)\)/);
                if (!match) return;
                const pid = parseInt(match[1]);
                const td = document.createElement('td');
                td.style.textAlign = 'center';
                td.innerHTML = `<button class="bc-gen-btn btn" onclick="openBarcodeModal(${pid})" style="background:rgba(99,102,241,.1);color:#818cf8;border:1px solid rgba(99,102,241,.2);padding:4px 8px;font-size:11px;border-radius:7px;cursor:pointer;" title="Generate barcode"><i class="fas fa-barcode"></i></button>`;
                tds[tds.length - 1].parentNode.insertBefore(td, tds[tds.length - 1]);
            });
        }, 500);
    };


    // ── 8. GRN INLINE ITEM EDIT ───────────────────────────────────────────────────
    // Override renderGrnRows to add edit capability
    const _origRGR = window.renderGrnRows;
    window.renderGrnRows = function () {
        const c = document.getElementById('grn-rows');
        const em = document.getElementById('grn-empty-msg');
        if (!c) return;
        const rows = window._grnRows || [];
        let total = 0;
        if (!rows.length) {
            c.innerHTML = '';
            if (em) em.style.display = 'block';
            setText('grn-total', 'Rs. 0.00');
            return;
        }
        if (em) em.style.display = 'none';
        c.innerHTML = rows.map((r, i) => {
            const t = r.qty * r.buyPrice; total += t;
            return `<div style="background:rgba(13,24,41,.8);border:1px solid rgba(99,179,237,.1);border-radius:10px;padding:10px 12px;margin-bottom:6px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <div style="flex:1;font-size:13px;font-weight:600;color:#e2e8f0;">${esc(r.productName)}</div>
        <button onclick="removeGrnRow(${i})" style="background:rgba(239,68,68,.12);border:none;width:24px;height:24px;border-radius:6px;color:#f87171;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-trash"></i></button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
        <div>
          <label style="font-size:10px;color:#475569;font-weight:700;letter-spacing:.05em;display:block;margin-bottom:3px;">QTY</label>
          <input type="number" min="1" value="${r.qty}" onchange="updateGrnRow(${i},'qty',this.value)"
            style="width:100%;height:30px;border-radius:7px;background:rgba(255,255,255,.07);border:1.5px solid rgba(99,179,237,.2);color:#fff;font-size:13px;font-weight:700;text-align:center;outline:none;padding:0;"/>
        </div>
        <div>
          <label style="font-size:10px;color:#475569;font-weight:700;letter-spacing:.05em;display:block;margin-bottom:3px;">BUY PRICE</label>
          <input type="number" min="0" step="0.01" value="${r.buyPrice}" onchange="updateGrnRow(${i},'buyPrice',this.value)"
            style="width:100%;height:30px;border-radius:7px;background:rgba(255,255,255,.07);border:1.5px solid rgba(99,179,237,.2);color:#fff;font-size:13px;font-weight:700;text-align:center;outline:none;padding:0;"/>
        </div>
        <div>
          <label style="font-size:10px;color:#475569;font-weight:700;letter-spacing:.05em;display:block;margin-bottom:3px;">TOTAL</label>
          <div style="height:30px;border-radius:7px;background:rgba(16,185,129,.08);border:1.5px solid rgba(16,185,129,.15);color:#34d399;font-size:13px;font-weight:900;display:flex;align-items:center;justify-content:center;">Rs.${fmt(t)}</div>
        </div>
      </div>
    </div>`;
        }).join('');
        setText('grn-total', 'Rs. ' + fmt(total));
    };

    window.updateGrnRow = function (i, field, val) {
        const rows = window._grnRows || [];
        if (!rows[i]) return;
        if (field === 'qty') rows[i].qty = Math.max(1, parseInt(val) || 1);
        if (field === 'buyPrice') rows[i].buyPrice = Math.max(0, parseFloat(val) || 0);
        window.renderGrnRows();
    };

    // Ensure removeGrnRow is correct
    window.removeGrnRow = function (i) {
        const rows = window._grnRows || [];
        rows.splice(i, 1);
        window._grnRows = rows;
        window.renderGrnRows();
    };


    // ── 9. INIT ───────────────────────────────────────────────────────────────────
    function init() {
        addPdfControls();
        applyProfitVisibility();

        // Add "Barcode Generator" standalone button in nav/topbar
        const nr = document.getElementById('nav-reports');
        if (nr && !document.getElementById('nav-barcode')) {
            const b = document.createElement('button');
            b.className = 'ni'; b.id = 'nav-barcode';
            b.onclick = function () { openBarcodeModal(null); };
            b.innerHTML = '<span class="ic"><i class="fas fa-barcode"></i></span>Barcode Gen';
            nr.parentNode.insertBefore(b, nr.nextSibling);
        }

        // Seed GRN Operator default account
        db.users.where('role').equals('grn_operator').count().then(n => {
            if (n === 0) {
                db.users.add({ fullName: 'GRN Operator', username: 'grn', password: 'grn123', role: 'grn_operator' })
                    .then(() => console.log('[extras] GRN Operator account created: grn/grn123'));
            }
        });

        // Update user modal role options to include grn_operator
        setTimeout(() => {
            const sel = document.getElementById('um-role');
            if (sel && !sel.querySelector('option[value="grn_operator"]')) {
                const opt = document.createElement('option');
                opt.value = 'grn_operator'; opt.textContent = '📦 GRN Operator — Inventory & GRN only';
                sel.appendChild(opt);
            }
        }, 500);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
    window.addEventListener('load', () => setTimeout(init, 800));

    // ── UTILS ─────────────────────────────────────────────────────────────────────
    function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v || ''; }
    function fmt(n) { return Number(n || 0).toFixed(2); }
    function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    console.log('[extras] Barcode, PDF report, GRN edit, role patches loaded.');
})();
