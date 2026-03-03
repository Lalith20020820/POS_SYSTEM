/* session-report.js — SuperMart POS v3
   1. Switch User (no full app reload)
   2. Session tracking (login time, logout time, sales)
   3. Cashier Cash Balance Report
   4. Refresh = stay logged in
*/
(function () {

    // ── DB VERSION 3 — sessions table ─────────────────────────────────────────────
    try {
        db.version(3).stores({
            products: '++id, name, barcode, category, buyingPrice, sellingPrice, stock, lowStockThreshold',
            sales: '++id, timestamp, subTotal, discount, totalAmount, paymentMethod, profit, customerId, customerName, sessionId',
            saleItems: '++id, saleId, productId, productName, qty, priceAtSale, buyPrice',
            suppliers: '++id, companyName, contactPerson, phone, email, products, address',
            grn: '++id, timestamp, supplierId, supplierName, totalCost, notes',
            grnItems: '++id, grnId, productId, productName, qty, buyPrice',
            customers: '++id, name, phone, email, address, totalSpent, visitCount',
            users: '++id, username, role',
            sessions: '++id, userId, username, fullName, role, loginTime, logoutTime',
        });
        console.log('[sessions] DB v3 registered.');
    } catch (e) { console.warn('[sessions] DB v3:', e.message); }

    // ── SESSION STATE ──────────────────────────────────────────────────────────────
    window._currentSessionId = parseInt(localStorage.getItem('sm_session_id') || '0') || null;

    // ── ON LOGIN: create session record ───────────────────────────────────────────
    const _origOnLoggedIn = window.onLoggedIn;
    window.onLoggedIn = async function () {
        if (window.SESSION) {
            try {
                const sid = await db.sessions.add({
                    userId: window.SESSION.id,
                    username: window.SESSION.username,
                    fullName: window.SESSION.fullName,
                    role: window.SESSION.role,
                    loginTime: Date.now(),
                    logoutTime: null,
                });
                window._currentSessionId = sid;
                localStorage.setItem('sm_session_id', sid);
                console.log('[sessions] Session started:', sid);
            } catch (e) { console.warn('[sessions] Could not create session:', e.message); }
        }
        if (_origOnLoggedIn) _origOnLoggedIn();
    };

    // ── ON LOGOUT: close session record ───────────────────────────────────────────
    const _origDoLogout = window.doLogout;
    window.doLogout = async function () {
        await closeCurrentSession();
        localStorage.removeItem('sm_session_id');
        window._currentSessionId = null;
        if (_origDoLogout) _origDoLogout();
    };

    async function closeCurrentSession() {
        const sid = window._currentSessionId;
        if (!sid) return;
        try {
            await db.sessions.update(sid, { logoutTime: Date.now() });
            console.log('[sessions] Session closed:', sid);
        } catch (e) { console.warn('[sessions] Could not close session:', e.message); }
    }

    // ── SWITCH USER ────────────────────────────────────────────────────────────────
    window.openSwitchUser = function () {
        injectSwitchUserModal();
        const m = document.getElementById('switch-user-modal');
        if (m) m.classList.add('open');
        ['su-user', 'su-pass'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        const err = document.getElementById('su-err'); if (err) err.style.display = 'none';
        setTimeout(() => { const el = document.getElementById('su-user'); if (el) el.focus(); }, 150);
    };

    window.closeSwitchUser = function () {
        const m = document.getElementById('switch-user-modal'); if (m) m.classList.remove('open');
    };

    window.doSwitchUser = async function () {
        const uv = (document.getElementById('su-user')?.value || '').trim();
        const pv = (document.getElementById('su-pass')?.value || '').trim();
        const err = document.getElementById('su-err');
        const showE = m => { if (err) { err.textContent = m; err.style.display = 'block'; } };
        if (!uv || !pv) { showE('Enter username and password.'); return; }
        const user = await db.users.where('username').equals(uv).first();
        if (!user || user.password !== pv) { showE('Invalid credentials!'); return; }

        // Close previous session
        await closeCurrentSession();

        // Set new session
        window.SESSION = { id: user.id, username: user.username, role: user.role, fullName: user.fullName || user.username };
        localStorage.setItem('sm_session', JSON.stringify(window.SESSION));

        // Create new session record
        try {
            const sid = await db.sessions.add({
                userId: user.id, username: user.username, fullName: user.fullName,
                role: user.role, loginTime: Date.now(), logoutTime: null,
            });
            window._currentSessionId = sid;
            localStorage.setItem('sm_session_id', sid);
        } catch (e) { }

        closeSwitchUser();

        // Refresh the UI for new role
        if (typeof applyRole === 'function') applyRole();
        if (typeof startApp === 'function') startApp();

        toast('Switched to ' + (user.fullName || user.username) + ' (' + user.role + ')', 'success');
    };

    function injectSwitchUserModal() {
        if (document.getElementById('switch-user-modal')) return;
        const m = document.createElement('div');
        m.className = 'mb'; m.id = 'switch-user-modal';
        m.onclick = function (e) { if (e.target === m) closeSwitchUser(); };
        m.innerHTML = `
    <div class="mbox" style="max-width:360px;" onclick="event.stopPropagation()">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
        <div style="font-size:15px;font-weight:800;color:#fff;"><i class="fas fa-people-arrows" style="color:#6366f1;margin-right:8px;"></i>Switch User</div>
        <button onclick="closeSwitchUser()" class="btn bgh bico"><i class="fas fa-xmark"></i></button>
      </div>
      <div style="background:rgba(99,102,241,.07);border:1px solid rgba(99,102,241,.15);border-radius:10px;padding:10px 12px;margin-bottom:16px;font-size:12px;color:#94a3b8;">
        Current: <span id="su-current" style="color:#a5b4fc;font-weight:700;"></span>
      </div>
      <div style="display:flex;flex-direction:column;gap:11px;">
        <div><label class="lbl">Username</label>
          <div style="position:relative;"><i class="fas fa-user" style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#4f46e5;font-size:12px;"></i>
          <input id="su-user" class="inp" style="padding-left:34px;" placeholder="New user's username" onkeydown="if(event.key==='Enter')doSwitchUser()"/></div></div>
        <div><label class="lbl">Password</label>
          <div style="position:relative;"><i class="fas fa-lock" style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#4f46e5;font-size:12px;"></i>
          <input id="su-pass" class="inp" type="password" style="padding-left:34px;" placeholder="Password" onkeydown="if(event.key==='Enter')doSwitchUser()"/></div></div>
      </div>
      <div id="su-err" style="display:none;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);border-radius:8px;padding:8px 12px;font-size:12px;font-weight:600;color:#f87171;margin-top:10px;"></div>
      <div style="display:flex;gap:8px;margin-top:16px;">
        <button onclick="closeSwitchUser()" class="btn bgh" style="flex:1;justify-content:center;">Cancel</button>
        <button onclick="doSwitchUser()" class="btn bp" style="flex:1;justify-content:center;"><i class="fas fa-right-to-bracket"></i> Switch</button>
      </div>
    </div>`;
        document.body.appendChild(m);
    }

    // Update "current user" label when modal opens
    const _origOpenSU = window.openSwitchUser;
    window.openSwitchUser = function () {
        injectSwitchUserModal();
        const cur = document.getElementById('su-current');
        if (cur && window.SESSION) cur.textContent = (window.SESSION.fullName || window.SESSION.username) + ' (' + window.SESSION.role + ')';
        const m = document.getElementById('switch-user-modal');
        if (m) m.classList.add('open');
        ['su-user', 'su-pass'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        const err = document.getElementById('su-err'); if (err) err.style.display = 'none';
        setTimeout(() => { const el = document.getElementById('su-user'); if (el) el.focus(); }, 150);
    };

    // ── TOPBAR: Switch User + Logout buttons ──────────────────────────────────────
    function buildTopbarActions() {
        const tb = document.getElementById('topbar');
        if (!tb || document.getElementById('topbar-actions')) return;

        const wrap = document.createElement('div');
        wrap.id = 'topbar-actions';
        wrap.style.cssText = 'display:flex;align-items:center;gap:6px;';

        // User info
        const ud = document.createElement('div');
        ud.id = 'topbar-user';
        ud.style.cssText = 'font-size:12px;font-weight:600;color:#64748b;display:flex;align-items:center;gap:5px;';

        // Switch user button
        const sb = document.createElement('button');
        sb.className = 'btn bgh';
        sb.style.cssText = 'font-size:11px;padding:6px 10px;';
        sb.title = 'Switch to another user account';
        sb.innerHTML = '<i class="fas fa-people-arrows"></i> Switch';
        sb.onclick = function () { openSwitchUser(); };

        // Change password button
        const pb = document.createElement('button');
        pb.className = 'btn bgh';
        pb.style.cssText = 'font-size:11px;padding:6px 10px;';
        pb.title = 'Change my password';
        pb.innerHTML = '<i class="fas fa-key"></i>';
        pb.onclick = function () { if (typeof openChangePassword === 'function') openChangePassword(null); };

        // Logout button
        const lb = document.createElement('button');
        lb.className = 'btn';
        lb.style.cssText = 'font-size:11px;padding:6px 10px;background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.2);border-radius:8px;cursor:pointer;';
        lb.title = 'Logout';
        lb.innerHTML = '<i class="fas fa-right-from-bracket"></i> Logout';
        lb.onclick = function () { if (confirm('Logout?')) doLogout(); };

        wrap.appendChild(ud);
        wrap.appendChild(sb);
        wrap.appendChild(pb);
        wrap.appendChild(lb);

        // Insert before the clock (last child) or append
        const clock = document.getElementById('pos-clock') || tb.lastElementChild;
        if (clock) tb.insertBefore(wrap, clock);
        else tb.appendChild(wrap);
    }

    // ── CASHIER CASH BALANCE REPORT ───────────────────────────────────────────────
    window.openCashierReport = async function () {
        injectCashierReportModal();
        await loadCashierReport();
        const m = document.getElementById('cashier-report-modal');
        if (m) m.classList.add('open');
    };

    window.closeCashierReport = function () {
        const m = document.getElementById('cashier-report-modal'); if (m) m.classList.remove('open');
    };

    async function loadCashierReport() {
        const sessions = await db.sessions.orderBy('id').reverse().limit(50).toArray();
        const tb = document.getElementById('cr-table');
        const em = document.getElementById('cr-empty');
        if (!sessions.length) { if (tb) tb.innerHTML = ''; if (em) em.style.display = 'block'; return; }
        if (em) em.style.display = 'none';

        const rows = await Promise.all(sessions.map(async s => {
            const from = s.loginTime;
            const to = s.logoutTime || Date.now();
            // Get sales in this session window - by sessionId if available, fallback to time range
            let sales = [];
            try { sales = await db.sales.where('sessionId').equals(s.id).toArray(); } catch (e) { }
            if (!sales.length) sales = await db.sales.where('timestamp').between(from, to).toArray();

            let cash = 0, card = 0, total = 0, profit = 0;
            sales.forEach(sl => {
                total += sl.totalAmount || 0;
                profit += sl.profit || 0;
                if (sl.paymentMethod === 'cash') cash += sl.totalAmount || 0;
                else card += sl.totalAmount || 0;
            });

            const dur = s.logoutTime ? msToHMS(s.logoutTime - s.loginTime) : '<span style="color:#10b981;font-size:10px;">● Active</span>';
            const rc = { manager: 'rgba(99,102,241,.15);color:#a5b4fc', supervisor: 'rgba(16,185,129,.15);color:#34d399', cashier: 'rgba(245,158,11,.15);color:#fbbf24' }[s.role] || '';
            return `<tr>
      <td style="font-size:11px;color:#475569;">#${s.id}</td>
      <td>
        <div style="font-weight:700;color:#e2e8f0;font-size:13px;">${esc(s.fullName || s.username)}</div>
        <div style="font-size:10px;color:#475569;">@${esc(s.username)}</div>
      </td>
      <td><span class="badge" style="background:${rc}">${esc(s.role)}</span></td>
      <td style="font-size:11px;color:#64748b;">${new Date(s.loginTime).toLocaleString('en-LK')}</td>
      <td style="font-size:11px;color:#475569;">${s.logoutTime ? new Date(s.logoutTime).toLocaleString('en-LK') : '—'}</td>
      <td style="font-size:12px;color:#94a3b8;">${dur}</td>
      <td style="text-align:center;font-weight:700;color:#a5b4fc;">${sales.length}</td>
      <td style="text-align:right;font-weight:700;color:#34d399;">Rs.${fmt(cash)}</td>
      <td style="text-align:right;font-weight:700;color:#a78bfa;">Rs.${fmt(card)}</td>
      <td style="text-align:right;font-weight:900;color:#fff;">Rs.${fmt(total)}</td>
      <td style="text-align:right;font-size:12px;color:#10b981;">Rs.${fmt(profit)}</td>
    </tr>`;
        }));
        if (tb) tb.innerHTML = rows.join('');
    }

    function msToHMS(ms) {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        return (h ? h + 'h ' : '') + (m ? m + 'm ' : '') + (s + 's');
    }

    function injectCashierReportModal() {
        if (document.getElementById('cashier-report-modal')) return;
        const m = document.createElement('div');
        m.className = 'mb'; m.id = 'cashier-report-modal';
        m.onclick = function (e) { if (e.target === m) closeCashierReport(); };
        m.innerHTML = `
    <div style="background:#0a1628;border:1px solid rgba(99,179,237,.12);border-radius:20px;padding:20px;width:95vw;max-width:1000px;max-height:85vh;display:flex;flex-direction:column;" onclick="event.stopPropagation()">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-shrink:0;">
        <div style="font-size:16px;font-weight:800;color:#fff;"><i class="fas fa-clock-rotate-left" style="color:#6366f1;margin-right:8px;"></i>Cashier Session & Cash Report</div>
        <div style="display:flex;gap:8px;">
          <button onclick="loadCashierReport()" class="btn bgh" style="font-size:12px;"><i class="fas fa-refresh"></i> Refresh</button>
          <button onclick="closeCashierReport()" class="btn bgh bico"><i class="fas fa-xmark"></i></button>
        </div>
      </div>
      <!-- Summary KPIs -->
      <div id="cr-kpis" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;flex-shrink:0;"></div>
      <!-- Table -->
      <div style="overflow:auto;flex:1;">
        <table class="tbl" style="width:100%;border-collapse:collapse;min-width:800px;">
          <thead><tr>
            <th>#</th><th>Staff</th><th>Role</th><th>Login</th><th>Logout</th>
            <th>Duration</th><th style="text-align:center;">Sales</th>
            <th style="text-align:right;">Cash</th><th style="text-align:right;">Card</th>
            <th style="text-align:right;">Total</th><th style="text-align:right;">Profit</th>
          </tr></thead>
          <tbody id="cr-table"></tbody>
        </table>
        <div id="cr-empty" style="display:none;text-align:center;padding:36px;color:#334155;">
          <i class="fas fa-clock" style="font-size:28px;display:block;margin-bottom:8px;"></i>
          No sessions recorded yet.
        </div>
      </div>
    </div>`;
        document.body.appendChild(m);
    }

    // ── LINK SALES TO SESSION ─────────────────────────────────────────────────────
    // Patch completeSale to store sessionId
    const _origCompleteSale = window.completeSale;
    window.completeSale = async function () {
        // Store session ID for the sale being created
        window._saleSessionId = window._currentSessionId || null;
        if (_origCompleteSale) await _origCompleteSale();
    };

    // Patch db.sales.add to include sessionId  
    // (Since we can't easily intercept Dexie's add, we use a different approach)
    // Override in pos-rebuild: after saving sale, update it with sessionId
    const _origSaleAdd = db.sales.add.bind(db.sales);
    db.sales.add = async function (obj) {
        if (window._saleSessionId) obj.sessionId = window._saleSessionId;
        return _origSaleAdd(obj);
    };

    // ── ADD "Cashier Report" TO REPORTS PAGE ─────────────────────────────────────
    function addCashierReportButton() {
        const rp = document.getElementById('page-reports');
        if (!rp || document.getElementById('open-cashier-rpt')) return;
        const btn = document.createElement('button');
        btn.id = 'open-cashier-rpt';
        btn.className = 'btn';
        btn.style.cssText = 'background:rgba(99,102,241,.12);color:#818cf8;border:1px solid rgba(99,102,241,.25);padding:8px 16px;border-radius:10px;font-size:12px;font-weight:700;margin-bottom:14px;cursor:pointer;';
        btn.innerHTML = '<i class="fas fa-clock-rotate-left"></i> Cashier Session & Cash Report';
        btn.onclick = openCashierReport;
        rp.insertBefore(btn, rp.firstChild);
    }

    // ── INIT ─────────────────────────────────────────────────────────────────────
    function init() {
        buildTopbarActions();
        addCashierReportButton();
        // Update topbar user after role applied
        const uel = document.getElementById('topbar-user');
        if (uel && window.SESSION) {
            const rc = { manager: '#a5b4fc', supervisor: '#34d399', cashier: '#fbbf24' }[window.SESSION.role] || '#94a3b8';
            uel.innerHTML = `<i class="fas fa-user-circle" style="color:#6366f1;"></i>${esc(window.SESSION.fullName)}<span style="font-size:10px;background:rgba(99,102,241,.2);color:${rc};padding:2px 7px;border-radius:999px;margin-left:4px;">${window.SESSION.role}</span>`;
        }
    }

    // Re-patch applyRole to update topbar user
    const _origAR2 = window.applyRole;
    window.applyRole = function () {
        if (_origAR2) _origAR2();
        const uel = document.getElementById('topbar-user');
        if (uel && window.SESSION) {
            const rc = { manager: '#a5b4fc', supervisor: '#34d399', cashier: '#fbbf24' }[window.SESSION.role] || '#94a3b8';
            uel.innerHTML = `<i class="fas fa-user-circle" style="color:#6366f1;"></i> ${esc(window.SESSION.fullName)} <span style="font-size:10px;background:rgba(99,102,241,.2);color:${rc};padding:2px 7px;border-radius:999px;margin-left:4px;">${window.SESSION.role}</span>`;
        }
        setTimeout(addCashierReportButton, 300);
    };

    // Run after DOM ready
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
    window.addEventListener('load', () => setTimeout(init, 800));

    // ── UTILS ─────────────────────────────────────────────────────────────────────
    function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function fmt(n) { return Number(n || 0).toFixed(2); }

    console.log('[session-report] Switch user, session tracking, cashier report ready.');
})();
