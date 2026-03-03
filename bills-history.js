/* bills-history.js — SuperMart POS v3
   Past Bills / Sales History viewer
   - View all past bills from any page
   - Search by receipt#, customer, date
   - Reprint any bill
   - Accessible from POS page + nav
*/
(function () {

    /* ── STYLES ── */
    const style = document.createElement('style');
    style.textContent = `
    #bills-modal .mbox {
      max-width: 860px;
      padding: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      max-height: 88vh;
    }
    #bh-header {
      padding: 18px 22px 14px;
      border-bottom: 1px solid rgba(99,179,237,.1);
      flex-shrink: 0;
      background: linear-gradient(145deg,#0d1829,#111f35);
    }
    #bh-search {
      width: 100%;
      height: 38px;
      padding: 0 12px 0 36px;
      border: 1.5px solid rgba(99,179,237,.15);
      border-radius: 10px;
      background: rgba(255,255,255,.05);
      color: #e2e8f0;
      font-size: 13px;
      outline: none;
      transition: border-color .2s;
    }
    #bh-search:focus { border-color: #6366f1; }
    #bh-search::placeholder { color: #334155; }

    #bh-list {
      flex: 1;
      overflow-y: auto;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .bh-row {
      background: rgba(13,24,41,.8);
      border: 1.5px solid rgba(99,179,237,.07);
      border-radius: 12px;
      padding: 11px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      transition: all .18s;
    }
    .bh-row:hover {
      border-color: rgba(99,102,241,.35);
      background: rgba(99,102,241,.06);
      transform: translateX(2px);
    }
    .bh-badge {
      font-size: 11px;
      padding: 3px 9px;
      border-radius: 999px;
      font-weight: 700;
      flex-shrink: 0;
    }

    /* Bill detail panel */
    #bill-detail-modal .mbox {
      max-width: 400px;
    }
    `;
    document.head.appendChild(style);

    /* ── BUILD BILLS MODAL ── */
    function buildBillsModal() {
        if (document.getElementById('bills-modal')) return;
        const m = document.createElement('div');
        m.className = 'mb';
        m.id = 'bills-modal';
        m.onclick = function (e) { if (e.target === m) closeBillsModal(); };
        m.innerHTML = `
    <div class="mbox" onclick="event.stopPropagation()">
      <div id="bh-header">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#4f46e5,#7c3aed);display:flex;align-items:center;justify-content:center;">
              <i class="fas fa-receipt" style="color:#fff;font-size:14px;"></i>
            </div>
            <div>
              <div style="font-size:15px;font-weight:800;color:#fff;">Sales History</div>
              <div id="bh-count" style="font-size:11px;color:#475569;">Loading...</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <select id="bh-filter" class="inp" style="width:130px;font-size:12px;" onchange="bhLoad()">
              <option value="all">All Time</option>
              <option value="today" selected>Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            <button onclick="closeBillsModal()" class="btn bgh bico"><i class="fas fa-xmark"></i></button>
          </div>
        </div>
        <div style="position:relative;">
          <i class="fas fa-search" style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#334155;font-size:12px;pointer-events:none;"></i>
          <input id="bh-search" placeholder="Search by receipt #, customer name, phone…" oninput="bhSearch(this.value)"/>
        </div>
      </div>

      <div id="bh-list">
        <div style="text-align:center;padding:40px;color:#334155;">
          <i class="fas fa-spinner fa-spin" style="font-size:24px;display:block;margin-bottom:8px;"></i>
          Loading bills…
        </div>
      </div>

      <div style="padding:10px 16px;border-top:1px solid rgba(99,179,237,.08);flex-shrink:0;display:flex;justify-content:space-between;align-items:center;background:rgba(6,13,26,.5);">
        <div id="bh-total-bar" style="font-size:12px;color:#475569;"></div>
        <button onclick="closeBillsModal()" class="btn bgh" style="font-size:12px;padding:6px 14px;">Close</button>
      </div>
    </div>`;
        document.body.appendChild(m);
    }

    /* ── BUILD BILL DETAIL MODAL ── */
    function buildBillDetailModal() {
        if (document.getElementById('bill-detail-modal')) return;
        const m = document.createElement('div');
        m.className = 'mb';
        m.id = 'bill-detail-modal';
        m.onclick = function (e) { if (e.target === m) closeBillDetail(); };
        m.innerHTML = `
    <div class="mbox" style="max-width:380px;" onclick="event.stopPropagation()">
      <div style="display:flex;gap:8px;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <div style="font-size:14px;font-weight:800;color:#fff;" id="bd-title">Receipt #</div>
        <div style="display:flex;gap:6px;">
          <button onclick="bdPrint()"
            style="display:flex;align-items:center;gap:5px;padding:6px 12px;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.25);border-radius:8px;color:#a5b4fc;font-size:12px;font-weight:700;cursor:pointer;">
            <i class="fas fa-print"></i> Print
          </button>
          <button onclick="closeBillDetail()" class="btn bgh bico"><i class="fas fa-xmark"></i></button>
        </div>
      </div>
      <div id="bd-thermal" style="font-family:'Courier New',monospace;font-size:12px;color:#000;background:#fff;padding:14px;border-radius:10px;line-height:1.6;max-height:75vh;overflow-y:auto;">
      </div>
    </div>`;
        document.body.appendChild(m);
    }

    /* ── STATE ── */
    let _allBills = [];
    let _filteredBills = [];
    let _bdSaleData = null;

    /* ── OPEN ── */
    window.openBillsHistory = async function () {
        buildBillsModal();
        buildBillDetailModal();
        const m = document.getElementById('bills-modal');
        if (m) m.classList.add('open');
        await bhLoad();
    };

    window.closeBillsModal = function () {
        const m = document.getElementById('bills-modal');
        if (m) m.classList.remove('open');
    };

    window.closeBillDetail = function () {
        const m = document.getElementById('bill-detail-modal');
        if (m) m.classList.remove('open');
    };

    /* ── LOAD BILLS ── */
    window.bhLoad = async function () {
        const filter = document.getElementById('bh-filter')?.value || 'today';
        const now = new Date();

        let from, to;
        if (filter === 'today') {
            from = new Date(now); from.setHours(0, 0, 0, 0);
            to = new Date(now); to.setHours(23, 59, 59, 999);
        } else if (filter === 'week') {
            from = new Date(now); from.setDate(from.getDate() - 6); from.setHours(0, 0, 0, 0);
            to = new Date(now); to.setHours(23, 59, 59, 999);
        } else if (filter === 'month') {
            from = new Date(now.getFullYear(), now.getMonth(), 1);
            to = new Date(now); to.setHours(23, 59, 59, 999);
        } else {
            // all
            from = new Date(0);
            to = new Date(now); to.setHours(23, 59, 59, 999);
        }

        _allBills = await db.sales
            .where('timestamp').between(from.getTime(), to.getTime())
            .reverse()
            .toArray();

        _filteredBills = [..._allBills];
        bhRender();
    };

    /* ── SEARCH ── */
    window.bhSearch = function (q) {
        q = (q || '').trim().toLowerCase();
        if (!q) {
            _filteredBills = [..._allBills];
        } else {
            _filteredBills = _allBills.filter(s =>
                String(s.id).includes(q) ||
                (s.customerName || '').toLowerCase().includes(q) ||
                (s.paymentMethod || '').toLowerCase().includes(q)
            );
        }
        bhRender();
    };

    /* ── RENDER LIST ── */
    function bhRender() {
        const list = document.getElementById('bh-list');
        const countEl = document.getElementById('bh-count');
        const totalBar = document.getElementById('bh-total-bar');
        if (!list) return;

        const total = _filteredBills.reduce((s, b) => s + (b.totalAmount || 0), 0);
        if (countEl) countEl.textContent = _filteredBills.length + ' receipts found';
        if (totalBar) totalBar.textContent = 'Total: Rs. ' + total.toFixed(2);

        if (!_filteredBills.length) {
            list.innerHTML = `
        <div style="text-align:center;padding:48px 20px;color:#1e3a5f;">
          <i class="fas fa-receipt" style="font-size:36px;display:block;margin-bottom:10px;"></i>
          <div style="font-size:13px;font-weight:600;">No bills found</div>
          <div style="font-size:12px;margin-top:4px;color:#0f2140;">Try changing the date filter</div>
        </div>`;
            return;
        }

        list.innerHTML = _filteredBills.map(s => {
            const dt = new Date(s.timestamp).toLocaleString('en-LK');
            const isCash = s.paymentMethod === 'cash';
            const hasCust = s.customerName && s.customerName !== 'null';
            return `<div class="bh-row" onclick="bhViewBill(${s.id})">
        <div style="width:38px;height:38px;border-radius:10px;background:${isCash ? 'rgba(16,185,129,.12)' : 'rgba(139,92,246,.12)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <i class="fas ${isCash ? 'fa-money-bill-wave' : 'fa-credit-card'}" style="color:${isCash ? '#34d399' : '#a78bfa'};font-size:14px;"></i>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:13px;font-weight:800;color:#fff;">Receipt #${s.id}</span>
            ${hasCust ? `<span style="font-size:11px;color:#6366f1;"><i class="fas fa-user" style="font-size:9px;margin-right:3px;"></i>${esc(s.customerName)}</span>` : '<span style="font-size:11px;color:#334155;">Guest</span>'}
          </div>
          <div style="font-size:11px;color:#475569;margin-top:2px;">${dt}${s.discount > 0 ? ' · <span style="color:#f59e0b;">Disc: ' + s.discount + '%</span>' : ''}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-size:14px;font-weight:900;color:#fff;">Rs. ${(s.totalAmount || 0).toFixed(2)}</div>
          <span class="bh-badge" style="${isCash ? 'background:rgba(16,185,129,.12);color:#34d399;' : 'background:rgba(139,92,246,.12);color:#a78bfa;'}">
            ${(s.paymentMethod || 'cash').toUpperCase()}
          </span>
        </div>
        <div style="flex-shrink:0;color:#334155;">
          <i class="fas fa-chevron-right" style="font-size:11px;"></i>
        </div>
      </div>`;
        }).join('');
    }

    /* ── VIEW SINGLE BILL ── */
    window.bhViewBill = async function (saleId) {
        const s = await db.sales.get(saleId);
        if (!s) return;
        const items = await db.saleItems.where('saleId').equals(saleId).toArray();
        _bdSaleData = { s, items };

        setText('bd-title', 'Receipt #' + saleId);

        const now = new Date(s.timestamp).toLocaleString('en-LK');
        const hasCust = s.customerName && s.customerName !== 'null';
        let html = `
      <div style="text-align:center;margin-bottom:8px;">
        <div style="font-size:17px;font-weight:900;letter-spacing:2px;">SUPERMART</div>
        <div style="font-size:10px;">Point of Sale</div>
        <div style="font-size:10px;margin-top:3px;">${now}</div>
        <div style="font-size:11px;font-weight:700;">Receipt #${saleId}</div>
        ${hasCust ? `<div style="font-size:10px;margin-top:2px;">Customer: ${esc(s.customerName)}</div>` : ''}
      </div>
      <hr style="border:none;border-top:1px dashed #000;margin:6px 0;"/>
      <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:700;border-bottom:1px dashed #000;padding-bottom:3px;margin-bottom:5px;">
        <span style="flex:1;">ITEM</span><span style="width:30px;text-align:center;">QTY</span><span style="width:60px;text-align:right;">PRICE</span>
      </div>`;

        items.forEach(it => {
            const lineTotal = (it.priceAtSale || 0) * it.qty;
            html += `<div style="display:flex;justify-content:space-between;margin-bottom:3px;font-size:11px;">
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:4px;">${esc(it.productName)}</span>
        <span style="width:30px;text-align:center;">${it.qty}</span>
        <span style="width:60px;text-align:right;">Rs.${lineTotal.toFixed(2)}</span>
      </div>`;
        });

        const sub = s.subTotal || s.totalAmount || 0;
        const disc = s.discount || 0;
        const tot = s.totalAmount || 0;

        html += `
      <hr style="border:none;border-top:1px dashed #000;margin:6px 0;"/>
      <div style="display:flex;justify-content:space-between;font-size:11px;"><span>Subtotal</span><span>Rs.${sub.toFixed(2)}</span></div>
      ${disc > 0 ? `<div style="display:flex;justify-content:space-between;font-size:11px;color:#d97706;"><span>Discount (${disc}%)</span><span>-Rs.${(sub * disc / 100).toFixed(2)}</span></div>` : ''}
      <hr style="border:none;border-top:1px dashed #000;margin:6px 0;"/>
      <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:900;"><span>TOTAL</span><span>Rs.${tot.toFixed(2)}</span></div>
      <hr style="border:none;border-top:1px dashed #000;margin:6px 0;"/>
      <div style="display:flex;justify-content:space-between;font-size:10px;"><span>Payment</span><span>${(s.paymentMethod || 'cash').toUpperCase()}</span></div>
      <hr style="border:none;border-top:1px dashed #000;margin:8px 0;"/>
      <div style="text-align:center;font-size:10px;">Thank you for shopping at SuperMart! 🙏<br/>Please come again.</div>`;

        const bd = document.getElementById('bd-thermal');
        if (bd) bd.innerHTML = html;

        const m = document.getElementById('bill-detail-modal');
        if (m) m.classList.add('open');
    };

    /* ── PRINT BILL ── */
    window.bdPrint = function () {
        if (!_bdSaleData) return;
        const bd = document.getElementById('bd-thermal');
        if (!bd) return;
        const content = bd.innerHTML;
        const w = window.open('', '_blank', 'width=350,height=600');
        w.document.write(`<!DOCTYPE html><html><head><style>
      @page{size:80mm auto;margin:4mm}
      body{margin:0;font-family:'Courier New',monospace;font-size:12px;color:#000;background:#fff;}
    </style></head><body>${content}</body></html>`);
        w.document.close();
        w.onload = () => { w.print(); };
    };

    /* ── INJECT HISTORY BUTTON ── */
    function injectHistoryButton() {
        // Add to POS page cart header area
        if (!document.getElementById('bills-history-btn')) {
            // Try to add near the topbar
            const topbar = document.getElementById('topbar');
            if (topbar) {
                const btn = document.createElement('button');
                btn.id = 'bills-history-btn';
                btn.onclick = function () { openBillsHistory(); };
                btn.style.cssText = 'display:flex;align-items:center;gap:6px;padding:7px 13px;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.2);border-radius:10px;color:#a5b4fc;font-size:12px;font-weight:700;cursor:pointer;transition:all .18s;white-space:nowrap;';
                btn.innerHTML = '<i class="fas fa-receipt" style="font-size:12px;"></i> Bills History';
                btn.onmouseover = function () { this.style.background = 'rgba(99,102,241,.22)'; };
                btn.onmouseout = function () { this.style.background = 'rgba(99,102,241,.12)'; };

                // Insert before the bell button
                const bellBtn = document.getElementById('bell-btn') || topbar.querySelector('button');
                if (bellBtn) {
                    bellBtn.parentNode.insertBefore(btn, bellBtn);
                } else {
                    topbar.appendChild(btn);
                }
            }
        }

        // Also add as nav item
        const navRep = document.getElementById('nav-reports');
        if (navRep && !document.getElementById('nav-bills-history')) {
            const b = document.createElement('button');
            b.className = 'ni';
            b.id = 'nav-bills-history';
            b.onclick = function () { openBillsHistory(); };
            b.innerHTML = '<span class="ic"><i class="fas fa-receipt"></i></span>Bills History';
            navRep.parentNode.insertBefore(b, navRep);
        }
    }

    /* ── PATCH showPage — show Bills History button for all roles ── */
    const _origSP = window.showPage;
    window.showPage = function (p) {
        if (_origSP) _origSP(p);
        setTimeout(injectHistoryButton, 300);
    };

    /* ── INIT ── */
    function init() {
        buildBillsModal();
        buildBillDetailModal();
        setTimeout(injectHistoryButton, 1000);
        // Also apply role visibility to history nav
        const _origAR = window.applyRole;
        window.applyRole = function () {
            if (_origAR) _origAR();
            // Bills history visible to all roles
            const btn = document.getElementById('nav-bills-history');
            if (btn) btn.style.display = '';
        };
    }

    function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v || ''; }
    function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
    window.addEventListener('load', () => setTimeout(injectHistoryButton, 1500));

    console.log('[bills-history] Loaded — past bills viewer ready.');
})();
