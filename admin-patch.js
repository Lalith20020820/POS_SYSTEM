/* admin-patch.js — SuperMart POS v3
   Fixes:
   1. Auto-login (no password required on refresh)
   2. Dashboard zoom forced to 100%
   3. Cashier can access Reports page
   4. Export all data as Excel (.xlsx)
   5. Export reports as PDF
*/

(function () {

    /* ═══════════════════════════════════════════════════
       1. AUTO-LOGIN — persist session across refresh
       Uses localStorage to keep the session alive.
       User only needs to log in once.
    ═══════════════════════════════════════════════════ */

    // Override initSession to auto-restore session without showing login
    const _origInitSession = window.initSession;
    window.initSession = async function () {
        // Check for existing saved session first
        const saved = localStorage.getItem('sm_session');
        if (saved) {
            try {
                const sess = JSON.parse(saved);
                if (sess && sess.username && sess.role) {
                    window.SESSION = sess;
                    console.log('[admin-patch] Auto-login as:', sess.username);
                    // Skip login screen, go straight to app
                    const ls = document.getElementById('login-screen');
                    if (ls) ls.style.display = 'none';
                    const aw = document.getElementById('app-wrap');
                    if (aw) aw.style.display = 'flex';
                    // Verify user still exists in DB (after DB opens)
                    setTimeout(async () => {
                        try {
                            const user = await db.users.where('username').equals(sess.username).first();
                            if (!user) {
                                // User deleted — force re-login
                                localStorage.removeItem('sm_session');
                                window.SESSION = null;
                                window.location.reload();
                                return;
                            }
                            // Update session with latest user data
                            window.SESSION = { id: user.id, username: user.username, role: user.role, fullName: user.fullName || user.username };
                            localStorage.setItem('sm_session', JSON.stringify(window.SESSION));
                            if (typeof onLoggedIn === 'function') onLoggedIn();
                        } catch (e) {
                            // DB not ready yet — use cached session
                            if (typeof onLoggedIn === 'function') onLoggedIn();
                        }
                    }, 600);
                    return;
                }
            } catch (e) {
                localStorage.removeItem('sm_session');
            }
        }
        // No session — show login normally
        if (_origInitSession) return _origInitSession();
        if (typeof showLogin === 'function') showLogin();
    };

    /* ═══════════════════════════════════════════════════
       2. FORCE 100% ZOOM — override responsive.js scaling
    ═══════════════════════════════════════════════════ */

    function forceFullZoom() {
        // Remove zoom restrictions imposed by responsive.js
        document.documentElement.style.zoom = '1';
        document.documentElement.style.height = '100vh';
        document.body.style.height = '100%';
        window._currentZoom = 1;
        // Update zoom label if zoom control exists
        const lbl = document.getElementById('zm-label');
        if (lbl) lbl.textContent = '100%';
    }

    // Apply immediately and override resize handler
    forceFullZoom();
    window.addEventListener('resize', forceFullZoom);

    // Also apply after DOM is ready (responsive.js may run later)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(forceFullZoom, 100);
            setTimeout(forceFullZoom, 500);
        });
    } else {
        setTimeout(forceFullZoom, 100);
        setTimeout(forceFullZoom, 500);
    }

    /* ═══════════════════════════════════════════════════
       3. CASHIER REPORTS ACCESS
       Add 'reports' page to cashier's allowed pages
    ═══════════════════════════════════════════════════ */

    // Patch ROLE_PAGES to give cashier access to reports
    if (typeof window.ROLE_PAGES !== 'undefined') {
        if (window.ROLE_PAGES.cashier && !window.ROLE_PAGES.cashier.includes('reports')) {
            window.ROLE_PAGES.cashier.push('reports');
        }
    } else {
        // Define it proactively in case auth.js hasn't loaded yet
        window.ROLE_PAGES = {
            manager: ['dashboard', 'pos', 'inventory', 'grn', 'customers', 'suppliers', 'reports', 'users'],
            supervisor: ['dashboard', 'pos', 'inventory', 'grn', 'customers', 'suppliers', 'reports'],
            cashier: ['pos', 'reports'],
        };
    }

    // Also patch guardPage to reflect the updated roles
    const _origGuardPage = window.guardPage;
    window.guardPage = function (page) {
        if (!window.SESSION) { if (typeof showLogin === 'function') showLogin(); return false; }
        const allowed = (window.ROLE_PAGES && window.ROLE_PAGES[window.SESSION.role]) || [];
        if (!allowed.includes(page)) {
            if (typeof toast === 'function') toast('Access denied for your role!', 'error');
            return false;
        }
        return true;
    };

    // Show nav-reports for cashier after applyRole runs
    const _origApplyRole = window.applyRole;
    window.applyRole = function () {
        if (_origApplyRole) _origApplyRole();
        // After original applyRole, ensure cashier sees reports nav
        if (window.SESSION && window.SESSION.role === 'cashier') {
            const navRep = document.getElementById('nav-reports');
            if (navRep) navRep.style.display = '';
        }
    };

    /* ═══════════════════════════════════════════════════
       4 & 5. EXCEL + PDF EXPORT — inject SheetJS + jsPDF
       and add export buttons to the reports page
    ═══════════════════════════════════════════════════ */

    function loadScript(src, cb) {
        const s = document.createElement('script');
        s.src = src;
        s.onload = cb || (() => { });
        s.onerror = () => console.warn('[admin-patch] Failed to load:', src);
        document.head.appendChild(s);
    }

    // Load SheetJS (xlsx) and jsPDF
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.7.0/jspdf.plugin.autotable.min.js');

    /* ── EXCEL EXPORT: Full database export ── */
    window.exportExcel = async function () {
        if (typeof XLSX === 'undefined') {
            toast('Excel library loading, try again…', 'warning');
            return;
        }
        try {
            toast('Preparing Excel export…', 'info');

            const wb = XLSX.utils.book_new();

            // ── Sheet 1: Sales Report
            const sales = await db.sales.orderBy('id').reverse().toArray();
            const salesData = [
                ['Sale ID', 'Date & Time', 'Customer', 'Sub Total (Rs.)', 'Discount %', 'Total (Rs.)', 'Profit (Rs.)', 'Payment Method'],
                ...sales.map(s => [
                    s.id,
                    new Date(s.timestamp).toLocaleString('en-LK'),
                    s.customerName || 'Guest',
                    parseFloat((s.subTotal || 0).toFixed(2)),
                    s.discount || 0,
                    parseFloat((s.totalAmount || 0).toFixed(2)),
                    parseFloat((s.profit || 0).toFixed(2)),
                    s.paymentMethod || ''
                ])
            ];
            const wsSales = XLSX.utils.aoa_to_sheet(salesData);
            wsSales['!cols'] = [{ wch: 8 }, { wch: 22 }, { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
            XLSX.utils.book_append_sheet(wb, wsSales, 'Sales');

            // ── Sheet 2: Sale Items
            const items = await db.saleItems.toArray();
            const itemsData = [
                ['Item ID', 'Sale ID', 'Product', 'Qty', 'Price at Sale (Rs.)', 'Buy Price (Rs.)', 'Line Total (Rs.)', 'Profit (Rs.)'],
                ...items.map(it => [
                    it.id, it.saleId,
                    it.productName,
                    it.qty,
                    parseFloat((it.priceAtSale || 0).toFixed(2)),
                    parseFloat((it.buyPrice || 0).toFixed(2)),
                    parseFloat(((it.priceAtSale || 0) * it.qty).toFixed(2)),
                    parseFloat(((it.priceAtSale - (it.buyPrice || 0)) * it.qty).toFixed(2))
                ])
            ];
            const wsItems = XLSX.utils.aoa_to_sheet(itemsData);
            wsItems['!cols'] = [{ wch: 8 }, { wch: 8 }, { wch: 24 }, { wch: 6 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, wsItems, 'Sale Items');

            // ── Sheet 3: Products / Inventory
            const products = await db.products.toArray();
            const prodsData = [
                ['ID', 'Product Name', 'Barcode', 'Category', 'Buy Price (Rs.)', 'Sell Price (Rs.)', 'Margin %', 'Stock Qty', 'Low Stock Alert'],
                ...products.map(p => {
                    const margin = p.buyingPrice > 0 ? (((p.sellingPrice - p.buyingPrice) / p.buyingPrice) * 100).toFixed(1) : 0;
                    return [
                        p.id, p.name, p.barcode || '', p.category || '',
                        parseFloat((p.buyingPrice || 0).toFixed(2)),
                        parseFloat((p.sellingPrice || 0).toFixed(2)),
                        parseFloat(margin),
                        p.stock || 0,
                        p.lowStockThreshold || 5
                    ];
                })
            ];
            const wsProds = XLSX.utils.aoa_to_sheet(prodsData);
            wsProds['!cols'] = [{ wch: 6 }, { wch: 26 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 14 }];
            XLSX.utils.book_append_sheet(wb, wsProds, 'Inventory');

            // ── Sheet 4: Customers
            const customers = await db.customers.toArray();
            const custData = [
                ['ID', 'Name', 'Phone', 'Email', 'Address', 'Total Spent (Rs.)', 'Visit Count'],
                ...customers.map(c => [
                    c.id, c.name, c.phone || '', c.email || '', c.address || '',
                    parseFloat((c.totalSpent || 0).toFixed(2)),
                    c.visitCount || 0
                ])
            ];
            const wsCust = XLSX.utils.aoa_to_sheet(custData);
            wsCust['!cols'] = [{ wch: 6 }, { wch: 20 }, { wch: 14 }, { wch: 22 }, { wch: 20 }, { wch: 16 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, wsCust, 'Customers');

            // ── Sheet 5: Suppliers
            const suppliers = await db.suppliers.toArray();
            const supData = [
                ['ID', 'Company', 'Contact Person', 'Phone', 'Email', 'Products', 'Address'],
                ...suppliers.map(s => [s.id, s.companyName, s.contactPerson || '', s.phone || '', s.email || '', s.products || '', s.address || ''])
            ];
            const wsSup = XLSX.utils.aoa_to_sheet(supData);
            wsSup['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 22 }, { wch: 20 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(wb, wsSup, 'Suppliers');

            // ── Sheet 6: Item-wise Summary
            const itemMap = {};
            for (const it of items) {
                if (!itemMap[it.productName]) itemMap[it.productName] = { name: it.productName, qty: 0, revenue: 0, profit: 0 };
                itemMap[it.productName].qty += it.qty;
                itemMap[it.productName].revenue += (it.priceAtSale || 0) * it.qty;
                itemMap[it.productName].profit += ((it.priceAtSale || 0) - (it.buyPrice || 0)) * it.qty;
            }
            const summary = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue);
            const summaryData = [
                ['Product Name', 'Total Qty Sold', 'Total Revenue (Rs.)', 'Total Profit (Rs.)', 'Margin %'],
                ...summary.map(r => [
                    r.name, r.qty,
                    parseFloat(r.revenue.toFixed(2)),
                    parseFloat(r.profit.toFixed(2)),
                    parseFloat(r.revenue > 0 ? ((r.profit / r.revenue) * 100).toFixed(1) : 0)
                ])
            ];
            const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
            wsSummary['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 10 }];
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Item Summary');

            const filename = 'SuperMart_Export_' + new Date().toISOString().split('T')[0] + '.xlsx';
            XLSX.writeFile(wb, filename);
            toast('Excel exported successfully! 📊', 'success');
        } catch (e) {
            console.error('[admin-patch] Excel export error:', e);
            toast('Export failed: ' + e.message, 'error');
        }
    };

    /* ── PDF EXPORT: Sales Report ── */
    window.exportPDF = async function () {
        if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
            toast('PDF library loading, try again…', 'warning');
            return;
        }
        try {
            toast('Generating PDF…', 'info');

            const jsPDFClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
            const doc = new jsPDFClass({ orientation: 'landscape', unit: 'mm', format: 'a4' });

            // Get date range from report page inputs
            const fs = document.getElementById('rpt-from')?.value;
            const ts = document.getElementById('rpt-to')?.value;
            const from = fs ? new Date(fs + 'T00:00:00') : new Date(Date.now() - 7 * 86400000);
            const to = ts ? new Date(ts + 'T23:59:59') : new Date();

            const sales = await db.sales.where('timestamp').between(from.getTime(), to.getTime()).toArray();

            // ── Header
            doc.setFillColor(229, 0, 43);
            doc.rect(0, 0, 297, 20, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('SUPERMART POS — Sales Report', 14, 13);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text('Period: ' + from.toLocaleDateString('en-LK') + ' to ' + to.toLocaleDateString('en-LK'), 200, 13);

            // ── KPI Summary boxes
            let rev = 0, prof = 0;
            sales.forEach(s => { rev += s.totalAmount || 0; prof += s.profit || 0; });
            const avg = sales.length ? rev / sales.length : 0;

            doc.setTextColor(0, 0, 0);
            const kpis = [
                { label: 'Total Revenue', value: 'Rs. ' + rev.toFixed(2), color: [229, 0, 43] },
                { label: 'Total Profit', value: 'Rs. ' + prof.toFixed(2), color: [22, 163, 74] },
                { label: 'Total Orders', value: String(sales.length), color: [59, 130, 246] },
                { label: 'Avg. Order Value', value: 'Rs. ' + avg.toFixed(2), color: [124, 58, 237] },
            ];
            kpis.forEach((k, i) => {
                const x = 14 + i * 68;
                doc.setFillColor(...k.color);
                doc.roundedRect(x, 24, 64, 16, 3, 3, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.text(k.label, x + 3, 30);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(k.value, x + 3, 37);
            });

            // ── Sales Table
            doc.setTextColor(0, 0, 0);
            doc.autoTable({
                startY: 44,
                head: [['#', 'Date & Time', 'Customer', 'Total (Rs.)', 'Discount %', 'Profit (Rs.)', 'Payment']],
                body: sales.map(s => [
                    '#' + s.id,
                    new Date(s.timestamp).toLocaleString('en-LK'),
                    s.customerName || 'Guest',
                    'Rs. ' + (s.totalAmount || 0).toFixed(2),
                    (s.discount || 0) + '%',
                    'Rs. ' + (s.profit || 0).toFixed(2),
                    (s.paymentMethod || '').toUpperCase()
                ]),
                headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 8 },
                bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    0: { cellWidth: 12 },
                    1: { cellWidth: 44 },
                    2: { cellWidth: 40 },
                    3: { cellWidth: 30, halign: 'right' },
                    4: { cellWidth: 20, halign: 'center' },
                    5: { cellWidth: 30, halign: 'right' },
                    6: { cellWidth: 24, halign: 'center' },
                },
                margin: { left: 14, right: 14 },
            });

            // ── Item-wise breakdown on next page
            doc.addPage();

            doc.setFillColor(229, 0, 43);
            doc.rect(0, 0, 297, 16, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Item-Wise Sales Breakdown', 14, 11);

            const saleItems = await db.saleItems.toArray();
            // Filter to selected date range
            const saleIds = new Set(sales.map(s => s.id));
            const filteredItems = saleItems.filter(it => saleIds.has(it.saleId));

            const itemMap = {};
            filteredItems.forEach(it => {
                if (!itemMap[it.productName]) itemMap[it.productName] = { name: it.productName, qty: 0, revenue: 0, profit: 0 };
                itemMap[it.productName].qty += it.qty;
                itemMap[it.productName].revenue += (it.priceAtSale || 0) * it.qty;
                itemMap[it.productName].profit += ((it.priceAtSale || 0) - (it.buyPrice || 0)) * it.qty;
            });
            const itemRows = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue);

            doc.autoTable({
                startY: 20,
                head: [['#', 'Product Name', 'Qty Sold', 'Revenue (Rs.)', 'Profit (Rs.)', 'Margin %']],
                body: itemRows.map((r, i) => {
                    const margin = r.revenue > 0 ? ((r.profit / r.revenue) * 100).toFixed(1) : '0';
                    return [i + 1, r.name, r.qty, 'Rs. ' + r.revenue.toFixed(2), 'Rs. ' + r.profit.toFixed(2), margin + '%'];
                }),
                headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 8 },
                bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    0: { cellWidth: 10 },
                    1: { cellWidth: 80 },
                    2: { cellWidth: 22, halign: 'center' },
                    3: { cellWidth: 36, halign: 'right' },
                    4: { cellWidth: 36, halign: 'right' },
                    5: { cellWidth: 22, halign: 'center' },
                },
                margin: { left: 14, right: 14 },
            });

            // ── Footer on all pages
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(7);
                doc.setTextColor(148, 163, 184);
                doc.setFont('helvetica', 'normal');
                doc.text('Generated by SuperMart POS  •  ' + new Date().toLocaleString('en-LK'), 14, 205);
                doc.text('Page ' + i + ' of ' + pageCount, 270, 205);
            }

            const filename = 'SuperMart_Report_' + (fs || 'all') + '_to_' + (ts || 'today') + '.pdf';
            doc.save(filename);
            toast('PDF report downloaded! 📄', 'success');
        } catch (e) {
            console.error('[admin-patch] PDF export error:', e);
            toast('PDF failed: ' + e.message, 'error');
        }
    };

    /* ── INJECT EXPORT BUTTONS into Reports page ── */
    function injectExportButtons() {
        const rp = document.getElementById('page-reports');
        if (!rp || document.getElementById('export-btn-wrap')) return;

        // Find the genReport button area
        const wrap = document.createElement('div');
        wrap.id = 'export-btn-wrap';
        wrap.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;';
        wrap.innerHTML = `
      <button onclick="exportExcel()"
        style="display:flex;align-items:center;gap:7px;padding:9px 16px;background:linear-gradient(135deg,#16a34a,#22c55e);border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 3px 12px rgba(22,163,74,.3);transition:all .2s;font-family:'DM Sans',sans-serif;"
        onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        Export Full Data (Excel)
      </button>
      <button onclick="exportPDF()"
        style="display:flex;align-items:center;gap:7px;padding:9px 16px;background:linear-gradient(135deg,#e5002b,#ff6b35);border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 3px 12px rgba(229,0,43,.3);transition:all .2s;font-family:'DM Sans',sans-serif;"
        onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
        Export Report (PDF)
      </button>
      <button onclick="exportCSV()"
        style="display:flex;align-items:center;gap:7px;padding:9px 16px;background:rgba(100,116,139,.15);border:1.5px solid rgba(100,116,139,.3);border-radius:10px;color:#475569;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;font-family:'DM Sans',sans-serif;"
        onmouseover="this.style.background='rgba(100,116,139,.25)'" onmouseout="this.style.background='rgba(100,116,139,.15)'">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 16 12 20 8 16"/><line x1="12" y1="12" x2="12" y2="20"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
        Export CSV
      </button>`;

        // Insert after the filter card (first .card in reports page)
        const firstCard = rp.querySelector('.card');
        if (firstCard) {
            firstCard.style.position = 'relative';
            // Append inside the first card
            firstCard.appendChild(wrap);
        } else {
            rp.insertBefore(wrap, rp.firstChild);
        }
    }

    /* ── Patch showPage to inject buttons when reports is visited ── */
    const _prevSP = window.showPage;
    window.showPage = function (p) {
        if (_prevSP) _prevSP(p);
        if (p === 'reports') {
            setTimeout(injectExportButtons, 200);
        }
    };

    /* ── Also try injecting on DOM ready ── */
    function tryInject() {
        injectExportButtons();
        // Re-apply zoom in case responsive.js ran after us
        forceFullZoom();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(tryInject, 800));
    } else {
        setTimeout(tryInject, 800);
    }

    console.log('[admin-patch] Loaded: auto-login, 100% zoom, cashier reports, Excel + PDF export.');

})();
