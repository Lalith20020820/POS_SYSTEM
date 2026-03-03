/* inject.js — Automatically builds Login UI + User Management + Item Report
   Loaded via index.html, runs before auth.js via DOMContentLoaded */

(function () {
    function buildUI() {

        // ─── 1. LOGIN SCREEN
        if (!document.getElementById('login-screen')) {
            const ls = document.createElement('div');
            ls.id = 'login-screen';
            ls.style.cssText = 'display:flex;position:fixed;inset:0;z-index:9000;background:linear-gradient(135deg,#060d1a,#0a1628,#0d1f3c);align-items:center;justify-content:center;';
            ls.innerHTML = `
        <div style="width:100%;max-width:420px;padding:16px;">
          <div style="text-align:center;margin-bottom:26px;">
            <div style="width:64px;height:64px;border-radius:18px;background:linear-gradient(135deg,#4f46e5,#7c3aed);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;box-shadow:0 8px 28px rgba(79,70,229,.4);font-size:28px;">🛒</div>
            <div style="font-size:24px;font-weight:900;color:#fff;letter-spacing:1px;">SuperMart POS</div>
            <div style="font-size:12px;color:#475569;margin-top:4px;">Sign in to your account</div>
          </div>
          <div style="background:linear-gradient(145deg,#0d1829,#111f35);border:1px solid rgba(99,179,237,.12);border-radius:20px;padding:26px;box-shadow:0 20px 60px rgba(0,0,0,.6);">
            <div style="margin-bottom:13px;">
              <label class="lbl">Username</label>
              <div style="position:relative;"><i class="fas fa-user" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#4f46e5;font-size:13px;"></i>
              <input id="li-user" class="inp" style="padding-left:36px;" placeholder="username" onkeydown="if(event.key==='Enter')doLogin()"/></div>
            </div>
            <div style="margin-bottom:16px;">
              <label class="lbl">Password</label>
              <div style="position:relative;"><i class="fas fa-lock" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#4f46e5;font-size:13px;"></i>
              <input id="li-pass" class="inp" type="password" style="padding-left:36px;" placeholder="password" onkeydown="if(event.key==='Enter')doLogin()"/></div>
            </div>
            <div id="li-err" style="display:none;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);border-radius:8px;padding:8px 12px;font-size:12px;font-weight:600;color:#f87171;margin-bottom:10px;"></div>
            <button onclick="doLogin()" class="btn bp" style="width:100%;justify-content:center;padding:12px;font-size:15px;font-weight:800;border-radius:12px;">
              <i class="fas fa-right-to-bracket"></i> Sign In
            </button>
            <div style="margin-top:14px;padding:11px;background:rgba(99,102,241,.07);border-radius:10px;border:1px solid rgba(99,102,241,.15);font-size:11px;color:#475569;line-height:1.9;">
              <div style="font-weight:700;color:#a5b4fc;margin-bottom:4px;"><i class="fas fa-circle-info"></i> Default Accounts:</div>
              <div>👑 <b>admin</b> / admin123 — Manager (Full Access)</div>
              <div>🔑 <b>supervisor</b> / super123 — Supervisor</div>
              <div>💼 <b>cashier</b> / cash123 — Cashier (POS only)</div>
            </div>
          </div>
        </div>`;
            document.body.insertBefore(ls, document.body.firstChild);
        }

        // ─── 2. USER MODAL
        if (!document.getElementById('user-modal')) {
            const um = document.createElement('div');
            um.className = 'mb';
            um.id = 'user-modal';
            um.onclick = function (e) { if (e.target === um) closeModal('user-modal'); };
            um.innerHTML = `
        <div class="mbox" style="max-width:430px;" onclick="event.stopPropagation()">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <div style="font-size:16px;font-weight:800;color:#fff;" id="umm-title">New User Account</div>
            <button onclick="closeModal('user-modal')" class="btn bgh bico"><i class="fas fa-xmark"></i></button>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div><label class="lbl">Full Name *</label><input id="um-fullname" class="inp" placeholder="e.g. Kasun Perera"/></div>
            <div><label class="lbl">Username *</label><input id="um-user" class="inp" placeholder="e.g. kasun01"/></div>
            <div>
              <label class="lbl">Password</label>
              <input id="um-pass" class="inp" type="password" placeholder="New password"/>
              <div id="um-pass-hint" style="display:none;font-size:11px;color:#475569;margin-top:3px;"><i class="fas fa-info-circle" style="color:#6366f1;"></i> Leave blank to keep current password.</div>
            </div>
            <div>
              <label class="lbl">Role *</label>
              <select id="um-role" class="inp">
                <option value="cashier">💼 Cashier — POS billing only</option>
                <option value="supervisor">🔑 Supervisor — POS, Inventory, GRN, Customers, Reports</option>
                <option value="manager">👑 Manager — Full Access incl. User Management</option>
              </select>
            </div>
          </div>
          <input type="hidden" id="um-id"/>
          <div style="display:flex;gap:10px;margin-top:18px;">
            <button onclick="closeModal('user-modal')" class="btn bgh" style="flex:1;justify-content:center;">Cancel</button>
            <button onclick="saveUser()" class="btn bp" style="flex:1;justify-content:center;"><i class="fas fa-save"></i> Save User</button>
          </div>
        </div>`;
            document.body.appendChild(um);
        }

        // ─── 3. WRAP sidebar + main in #app-wrap
        const sb = document.getElementById('sidebar');
        if (sb && !document.getElementById('app-wrap')) {
            const wrap = document.createElement('div');
            wrap.id = 'app-wrap';
            wrap.style.cssText = 'display:flex;height:100vh;overflow:hidden;';
            const parent = sb.parentNode;
            while (parent.firstChild) wrap.appendChild(parent.firstChild);
            parent.appendChild(wrap);
        }

        // ─── 4. USERS NAV BUTTON
        const navRep = document.getElementById('nav-reports');
        if (navRep && !document.getElementById('nav-users')) {
            const b = document.createElement('button');
            b.className = 'ni'; b.id = 'nav-users'; b.style.display = 'none';
            b.onclick = function () { window.showPage('users'); };
            b.innerHTML = '<span class="ic"><i class="fas fa-users-cog"></i></span>User Accounts';
            navRep.parentNode.insertBefore(b, navRep.nextSibling);
        }

        // ─── 5. USERS PAGE
        const pw = document.getElementById('page-wrap');
        if (pw && !document.getElementById('page-users')) {
            const up = document.createElement('div');
            up.className = 'page'; up.id = 'page-users';
            up.innerHTML = `
        <div class="card" style="padding:12px;margin-bottom:12px;display:flex;gap:10px;align-items:center;">
          <div style="flex:1;font-size:14px;font-weight:700;color:#fff;"><i class="fas fa-users-cog" style="color:#6366f1;margin-right:8px;"></i>User Account Management</div>
          <button onclick="openUserModal()" class="btn bp"><i class="fas fa-user-plus"></i> New User</button>
        </div>
        <div class="card" style="overflow:hidden;">
          <table class="tbl" style="width:100%;border-collapse:collapse;">
            <thead><tr><th>Full Name</th><th>Username</th><th>Role</th><th style="text-align:center;">Actions</th></tr></thead>
            <tbody id="users-table"></tbody>
          </table>
          <div id="users-empty" style="display:none;text-align:center;padding:48px;color:#1e3a5f;">
            <i class="fas fa-users" style="font-size:36px;display:block;margin-bottom:10px;"></i>No users.
          </div>
        </div>`;
            pw.appendChild(up);
        }

        // ─── 6. ITEM-WISE REPORT SECTION (appended to reports page)
        const rp = document.getElementById('page-reports');
        if (rp && !document.getElementById('item-rpt-body')) {
            const ir = document.createElement('div');
            ir.style.marginTop = '14px';
            ir.innerHTML = `
        <div class="card" style="padding:18px;overflow:hidden;">
          <div style="font-weight:700;color:#10b981;margin-bottom:12px;font-size:13px;display:flex;align-items:center;gap:8px;">
            <i class="fas fa-boxes-stacked"></i> Item-Wise Sales Breakdown
          </div>
          <table class="tbl" style="width:100%;border-collapse:collapse;">
            <thead><tr>
              <th>#</th><th>Product Name</th>
              <th style="text-align:center;">Qty Sold</th>
              <th style="text-align:right;">Revenue</th>
              <th style="text-align:right;">Profit</th>
              <th style="text-align:center;">Margin</th>
            </tr></thead>
            <tbody id="item-rpt-body"></tbody>
          </table>
          <div id="item-rpt-empty" style="display:none;text-align:center;padding:24px;color:#334155;font-size:13px;">
            Generate a report above to see item-wise breakdown.
          </div>
        </div>`;
            rp.appendChild(ir);
        }

        // ─── 7. TOPBAR: user info + logout button
        const tb = document.getElementById('topbar');
        if (tb && !document.getElementById('topbar-user')) {
            const ud = document.createElement('div');
            ud.id = 'topbar-user';
            ud.style.cssText = 'font-size:13px;font-weight:600;color:#64748b;display:flex;align-items:center;gap:6px;';
            const lb = document.createElement('button');
            lb.onclick = function () { if (typeof doLogout === 'function') doLogout(); };
            lb.className = 'btn bgh';
            lb.style.cssText = 'font-size:11px;padding:6px 10px;';
            lb.innerHTML = '<i class="fas fa-right-from-bracket"></i> Logout';
            const bell = document.getElementById('bell-btn');
            if (bell) { bell.parentNode.insertBefore(ud, bell); bell.parentNode.insertBefore(lb, bell); }
        }

        // ─── 8. PATCH showPage for role guard + extra pages
        const _oSP = window.showPage;
        window.showPage = function (p) {
            if (typeof guardPage === 'function' && !guardPage(p)) return;
            if (_oSP) _oSP(p);
            if (p === 'users') setTimeout(function () { if (typeof loadUsers === 'function') loadUsers(); }, 50);
            if (p === 'reports') setTimeout(function () { if (typeof loadItemReport === 'function') loadItemReport(); }, 400);
        };

        // ─── 9. PATCH genReport to also run item report
        const _oGR = window.genReport;
        window.genReport = async function () {
            if (_oGR) await _oGR();
            if (typeof loadItemReport === 'function') await loadItemReport();
        };
    }

    // Run after DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildUI);
    } else {
        buildUI();
    }

    // Trigger session init after everything loads
    window.addEventListener('load', function () {
        if (typeof initSession === 'function') initSession();
    });
})();
