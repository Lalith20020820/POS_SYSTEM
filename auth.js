/* auth.js — SuperMart POS v3 Add-ons
   Login, Role-based Access, User Management,
   Keyboard Qty, Item-wise Reports, WhatsApp Message
*/

// ── ROLE CONFIG
const ROLE_PAGES = {
    manager: ['dashboard', 'pos', 'inventory', 'grn', 'customers', 'suppliers', 'reports', 'users'],
    supervisor: ['dashboard', 'pos', 'inventory', 'grn', 'customers', 'suppliers', 'reports'],
    cashier: ['pos'],
};

// ── SESSION
window.SESSION = null;

async function initSession() {
    try {
        // Seed default users if none exist
        const cnt = await db.users.count();
        if (cnt === 0) {
            await db.users.bulkAdd([
                { fullName: 'Admin Manager', username: 'admin', password: 'admin123', role: 'manager' },
                { fullName: 'Store Supervisor', username: 'supervisor', password: 'super123', role: 'supervisor' },
                { fullName: 'Cashier', username: 'cashier', password: 'cash123', role: 'cashier' },
            ]);
        }
    } catch (e) {
        console.error('[auth] Users table error:', e);
        // If users table missing, show error
        const err = document.getElementById('li-err');
        if (err) { err.textContent = 'DB Error: ' + e.message + ' — Please clear browser storage & reload.'; err.style.display = 'block'; }
    }
    const saved = localStorage.getItem('sm_session');
    if (saved) { try { window.SESSION = JSON.parse(saved); } catch (e) { window.SESSION = null; } }
    if (!window.SESSION) { showLogin(); } else { onLoggedIn(); }
}

function showLogin() {
    // app-wrap may not exist yet if inject.js hasn't run — use timeout
    const tryHide = () => {
        const aw = document.getElementById('app-wrap');
        if (aw) { aw.style.display = 'none'; }
        else { setTimeout(tryHide, 50); return; }
        const ls = document.getElementById('login-screen');
        if (ls) ls.style.display = 'flex';
        setTimeout(() => { const u = document.getElementById('li-user'); if (u) u.focus(); }, 200);
    };
    tryHide();
}

function hideLogin() {
    const ls = document.getElementById('login-screen');
    if (ls) ls.style.display = 'none';
    const aw = document.getElementById('app-wrap');
    if (aw) aw.style.display = 'flex';
}

async function doLogin() {
    const uv = (document.getElementById('li-user')?.value || '').trim();
    const pv = (document.getElementById('li-pass')?.value || '').trim();
    const err = document.getElementById('li-err');
    if (!uv || !pv) { showErr(err, 'Enter username and password.'); return; }
    const user = await db.users.where('username').equals(uv).first();
    if (!user || user.password !== pv) { showErr(err, 'Invalid username or password!'); return; }
    window.SESSION = { id: user.id, username: user.username, role: user.role, fullName: user.fullName || user.username };
    localStorage.setItem('sm_session', JSON.stringify(window.SESSION));
    if (err) err.style.display = 'none';
    hideLogin();
    onLoggedIn();
}

function showErr(el, msg) { if (el) { el.textContent = msg; el.style.display = 'block'; } }

function loginKey(e) { if (e.key === 'Enter') doLogin(); }

function onLoggedIn() {
    applyRole();
    if (typeof startApp === 'function') startApp();
}

function doLogout() {
    window.SESSION = null;
    localStorage.removeItem('sm_session');
    if (typeof cart !== 'undefined') { cart = []; }
    if (typeof selCust !== 'undefined') { selCust = null; }
    showLogin();
}

function applyRole() {
    if (!window.SESSION) return;
    // Topbar user info
    const uel = document.getElementById('topbar-user');
    if (uel) {
        const roleColor = { manager: '#a5b4fc', supervisor: '#34d399', cashier: '#fbbf24' }[window.SESSION.role] || '#94a3b8';
        uel.innerHTML = '<i class="fas fa-user-circle" style="color:#6366f1;margin-right:5px"></i>'
            + esc(window.SESSION.fullName)
            + '<span style="font-size:10px;margin-left:6px;background:rgba(99,102,241,.2);color:' + roleColor + ';padding:2px 7px;border-radius:999px">' + window.SESSION.role + '</span>';
    }
    // Show/hide nav
    const allowed = ROLE_PAGES[window.SESSION.role] || [];
    ['dashboard', 'pos', 'inventory', 'grn', 'customers', 'suppliers', 'reports', 'users'].forEach(pg => {
        const btn = document.getElementById('nav-' + pg);
        if (btn) btn.style.display = allowed.includes(pg) ? '' : 'none';
    });
}

function guardPage(page) {
    if (!window.SESSION) { showLogin(); return false; }
    const allowed = ROLE_PAGES[window.SESSION.role] || [];
    if (!allowed.includes(page)) { toast('Access denied for your role!', 'error'); return false; }
    return true;
}

// ── USER MANAGEMENT PAGE
async function loadUsers() {
    const us = await db.users.toArray();
    const tb = document.getElementById('users-table');
    const em = document.getElementById('users-empty');
    if (!tb) return;
    if (!us.length) { tb.innerHTML = ''; if (em) em.style.display = 'block'; return; }
    if (em) em.style.display = 'none';
    tb.innerHTML = us.map(u => {
        const rc = { manager: 'rgba(99,102,241,.15);color:#a5b4fc', supervisor: 'rgba(16,185,129,.15);color:#34d399', cashier: 'rgba(245,158,11,.15);color:#fbbf24' }[u.role] || 'rgba(255,255,255,.07);color:#94a3b8';
        const isSelf = window.SESSION && window.SESSION.id === u.id;
        return '<tr>'
            + '<td style="font-weight:600;color:#e2e8f0">' + esc(u.fullName || u.username) + (isSelf ? ' <span style="font-size:10px;color:#6366f1;font-style:italic">(you)</span>' : '') + '</td>'
            + '<td style="color:#94a3b8;font-family:monospace;font-size:13px">' + esc(u.username) + '</td>'
            + '<td><span class="badge" style="background:' + rc + '">' + esc(u.role) + '</span></td>'
            + '<td style="text-align:center"><div style="display:flex;gap:5px;justify-content:center">'
            + '<button class="btn bico" onclick="openUserModal(' + u.id + ')" style="background:rgba(99,102,241,.1);color:#818cf8;border:1px solid rgba(99,102,241,.2)"><i class="fas fa-pen" style="font-size:11px"></i></button>'
            + (!isSelf ? '<button class="btn bico" onclick="delUser(' + u.id + ')" style="background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.2)"><i class="fas fa-trash" style="font-size:11px"></i></button>' : '')
            + '</div></td>'
            + '</tr>';
    }).join('');
}

async function openUserModal(id = null) {
    ['um-fullname', 'um-user', 'um-pass'].forEach(f => { const el = document.getElementById(f); if (el) el.value = ''; });
    const rsel = document.getElementById('um-role'); if (rsel) rsel.value = 'cashier';
    document.getElementById('um-id').value = '';
    setText('umm-title', id ? 'Edit User' : 'New User Account');
    if (id) {
        const u = await db.users.get(id); if (!u) return;
        const set = (i, v) => { const el = document.getElementById(i); if (el) el.value = v || ''; };
        set('um-fullname', u.fullName); set('um-user', u.username); if (rsel) rsel.value = u.role || 'cashier';
        document.getElementById('um-id').value = u.id;
        const ph = document.getElementById('um-pass-hint');
        if (ph) ph.style.display = 'block';
    } else {
        const ph = document.getElementById('um-pass-hint'); if (ph) ph.style.display = 'none';
    }
    openModal('user-modal');
}

async function saveUser() {
    const fullName = (document.getElementById('um-fullname')?.value || '').trim();
    const username = (document.getElementById('um-user')?.value || '').trim().toLowerCase();
    const pass = (document.getElementById('um-pass')?.value || '').trim();
    const role = (document.getElementById('um-role')?.value || 'cashier');
    if (!fullName || !username) { toast('Full name and username required!', 'error'); return; }
    const eid = parseInt(document.getElementById('um-id')?.value);
    if (eid) {
        const upd = { fullName, username, role };
        if (pass) upd.password = pass;
        await db.users.update(eid, upd);
        if (window.SESSION && window.SESSION.id === eid) {
            window.SESSION = { ...window.SESSION, fullName, username, role };
            localStorage.setItem('sm_session', JSON.stringify(window.SESSION));
            applyRole();
        }
        toast('User updated!', 'success');
    } else {
        if (!pass) { toast('Password required!', 'error'); return; }
        const ex = await db.users.where('username').equals(username).first();
        if (ex) { toast('Username already taken!', 'error'); return; }
        await db.users.add({ fullName, username, password: pass, role });
        toast('User created!', 'success');
    }
    closeModal('user-modal'); loadUsers();
}

async function delUser(id) {
    if (window.SESSION && window.SESSION.id === id) { toast('Cannot delete your own account!', 'error'); return; }
    if (!confirm('Delete this user?')) return;
    await db.users.delete(id); toast('User deleted.', 'success'); loadUsers();
}

// ── KEYBOARD QUANTITY (POS)
let _kbuf = '';
let _ktimer = null;
document.addEventListener('keydown', function (e) {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;
    const posPage = document.getElementById('page-pos');
    if (!posPage || !posPage.classList.contains('active')) return;
    if (e.key >= '0' && e.key <= '9') {
        _kbuf += e.key;
        clearTimeout(_ktimer);
        _ktimer = setTimeout(() => {
            const n = parseInt(_kbuf);
            if (n > 0 && typeof cart !== 'undefined' && cart.length > 0) {
                const last = cart[cart.length - 1];
                if (n <= last.product.stock) {
                    last.qty = n;
                    if (typeof renderCart === 'function') renderCart();
                    toast('Qty of last item set to ' + n, 'info');
                } else { toast('Max stock: ' + last.product.stock, 'warning'); }
            }
            _kbuf = '';
        }, 700);
    }
});

// ── ITEM-WISE REPORTS
async function loadItemReport() {
    const fs = document.getElementById('rpt-from')?.value;
    const ts = document.getElementById('rpt-to')?.value;
    if (!fs || !ts) return;
    const from = new Date(fs + 'T00:00:00');
    const to = new Date(ts + 'T23:59:59');
    const sales = await db.sales.where('timestamp').between(from.getTime(), to.getTime()).toArray();
    const map = {};
    for (const s of sales) {
        const items = await db.saleItems.where('saleId').equals(s.id).toArray();
        items.forEach(it => {
            if (!map[it.productName]) map[it.productName] = { name: it.productName, qty: 0, revenue: 0, profit: 0 };
            map[it.productName].qty += it.qty;
            map[it.productName].revenue += it.priceAtSale * it.qty;
            map[it.productName].profit += (it.priceAtSale - (it.buyPrice || 0)) * it.qty;
        });
    }
    const rows = Object.values(map).sort((a, b) => b.revenue - a.revenue);
    const tb = document.getElementById('item-rpt-body');
    const em = document.getElementById('item-rpt-empty');
    if (!rows.length) { if (tb) tb.innerHTML = ''; if (em) em.style.display = 'block'; return; }
    if (em) em.style.display = 'none';
    if (tb) tb.innerHTML = rows.map((r, i) => {
        const mg = r.revenue > 0 ? ((r.profit / r.revenue) * 100).toFixed(1) : '0';
        return '<tr>'
            + '<td style="color:#475569;font-size:12px">' + (i + 1) + '</td>'
            + '<td style="font-weight:600;color:#e2e8f0">' + esc(r.name) + '</td>'
            + '<td style="text-align:center;font-weight:700;color:#a5b4fc">' + r.qty + '</td>'
            + '<td style="text-align:right;font-weight:700;color:#fff">Rs. ' + fmt(r.revenue) + '</td>'
            + '<td style="text-align:right;font-weight:600;color:#34d399">Rs. ' + fmt(r.profit) + '</td>'
            + '<td style="text-align:center;font-weight:700;color:' + (parseFloat(mg) >= 25 ? '#34d399' : parseFloat(mg) >= 12 ? '#fbbf24' : '#f87171') + '">' + mg + '%</td>'
            + '</tr>';
    }).join('');
}

// ── WHATSAPP — Natural message
function sendWhatsAppBill(cust, { sid, rc, sub, dc, tot, payMethod, recv }) {
    const now = new Date().toLocaleString('en-LK');
    let msg = 'Hello ' + cust.name + '!\n\n';
    msg += 'Thank you for shopping at *SuperMart*. Here is your receipt:\n\n';
    msg += 'Receipt #' + sid + '\n';
    msg += 'Date: ' + now + '\n';
    msg += '----------------------------\n';
    rc.forEach(c => {
        msg += c.product.name + '\n';
        msg += '  ' + c.qty + ' x Rs.' + fmt(c.product.sellingPrice) + ' = Rs.' + fmt(c.product.sellingPrice * c.qty) + '\n';
    });
    msg += '----------------------------\n';
    if (dc > 0) {
        msg += 'Subtotal: Rs.' + fmt(sub) + '\n';
        msg += 'Discount: ' + dc + '% = -Rs.' + fmt(sub * dc / 100) + '\n';
    }
    msg += '*Total Paid: Rs.' + fmt(tot) + '*\n';
    if (payMethod === 'cash') {
        msg += 'Cash: Rs.' + fmt(recv) + '\n';
        msg += 'Change: Rs.' + fmt(Math.max(0, recv - tot)) + '\n';
    } else { msg += 'Payment: Card\n'; }
    msg += '\nHave a great day!\nSuperMart POS';
    let ph = cust.phone.replace(/\D/g, '');
    if (ph.startsWith('0')) ph = '94' + ph.slice(1);
    window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent(msg), '_blank');
}

// Override the sendWA function from app.js
window.sendWA = sendWhatsAppBill;
