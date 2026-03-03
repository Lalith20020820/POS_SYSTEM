/* db-fix.js — Runs AFTER app.js, BEFORE DOMContentLoaded fires
   Fixes: 1) Adds users table to DB  2) Blocks startup until login */

// ── 1. ADD USERS TABLE (version 2 upgrade)
// db is defined by app.js (synchronously), DB not yet opened — safe to add version
try {
    db.version(2).stores({
        products: '++id, name, barcode, category, buyingPrice, sellingPrice, stock, lowStockThreshold',
        sales: '++id, timestamp, subTotal, discount, totalAmount, paymentMethod, profit, customerId, customerName',
        saleItems: '++id, saleId, productId, productName, qty, priceAtSale, buyPrice',
        suppliers: '++id, companyName, contactPerson, phone, email, products, address',
        grn: '++id, timestamp, supplierId, supplierName, totalCost, notes',
        grnItems: '++id, grnId, productId, productName, qty, buyPrice',
        customers: '++id, name, phone, email, address, totalSpent, visitCount',
        users: '++id, username, role',
    });
    console.log('[db-fix] DB v2 schema registered — users table added.');
} catch (e) {
    console.warn('[db-fix] db.version(2) failed (DB may already be open):', e.message);
}

// ── 2. BLOCK PREMATURE STARTUP (hide app until login)
window._appReady = false;

// Override loadDashboard — no-op until logged in
const _origLD = window.loadDashboard;
window.loadDashboard = async function () {
    if (!window._appReady) { console.log('[db-fix] loadDashboard blocked until login.'); return; }
    const fn = window._dashboardFn || _origLD;
    if (fn) return fn();
};

// Override refreshCats — no-op until logged in
const _origRC = window.refreshCats;
window.refreshCats = async function () {
    if (!window._appReady) return;
    if (_origRC) return _origRC();
};

// Override posSearch — no-op until logged in
const _origPS = window.posSearch;
window.posSearch = function () {
    if (!window._appReady) return;
    if (_origPS) return _origPS();
};

// ── 3. startApp unlocks the app
const _origSA = window.startApp;
window.startApp = async function () {
    window._appReady = true;
    console.log('[db-fix] App unlocked — starting...');
    // Now run the real startup
    try {
        if (typeof setRptDefaults === 'function') setRptDefaults();
        if (typeof loadDashboard === 'function') await loadDashboard();
        if (typeof refreshCats === 'function') await refreshCats();
        allProds = await db.products.toArray();
        if (typeof renderLowStock === 'function') await renderLowStock();
    } catch (e) { console.error('[db-fix] startApp error:', e); }
};

// ── 4. Also seed default users if needed (called here so it's available early)
async function ensureDefaultUsers() {
    try {
        const cnt = await db.users.count();
        if (cnt === 0) {
            await db.users.bulkAdd([
                { fullName: 'Admin Manager', username: 'admin', password: 'admin123', role: 'manager' },
                { fullName: 'Store Supervisor', username: 'supervisor', password: 'super123', role: 'supervisor' },
                { fullName: 'Cashier', username: 'cashier', password: 'cash123', role: 'cashier' },
            ]);
            console.log('[db-fix] Default users seeded.');
        }
    } catch (e) {
        console.error('[db-fix] Could not seed users:', e);
    }
}

// Hook into DOMContentLoaded (fires after app.js's handler completes seedDemo)
document.addEventListener('DOMContentLoaded', async function () {
    // Ensure users are seeded after DB opens (seedDemo opens DB)
    setTimeout(async function () {
        await ensureDefaultUsers();
        console.log('[db-fix] Users ready. Waiting for login...');
    }, 500);
});

console.log('[db-fix] Loaded. Login required before app start.');
