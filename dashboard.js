/* dashboard.js — SuperMart POS v3 — Enhanced Dashboard */
(function () {

    // Inject dashboard page HTML override
    function buildDashboard() {
        const page = document.getElementById('page-dashboard');
        if (!page) return;

        page.innerHTML = `
      <!-- WELCOME BAR -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
        <div>
          <div id="dash-welcome" style="font-size:22px;font-weight:900;color:#fff;">Good Morning! 👋</div>
          <div style="font-size:13px;color:#475569;margin-top:2px;">Here's your store overview for today</div>
        </div>
        <button onclick="showPage('pos')" style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border:none;padding:12px 22px;border-radius:14px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 6px 20px rgba(79,70,229,.4);display:flex;align-items:center;gap:8px;transition:all .2s" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
          <i class="fas fa-cash-register"></i> Open POS
        </button>
      </div>

      <!-- KPI CARDS -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px;">
        <div class="kpi-card" style="background:linear-gradient(135deg,#1e3a8a,#3b82f6);border-radius:18px;padding:20px;box-shadow:0 6px 20px rgba(59,130,246,.3);position:relative;overflow:hidden;" onclick="showPage('reports');">
          <div style="position:absolute;right:-14px;top:-14px;width:70px;height:70px;border-radius:50%;background:rgba(255,255,255,.08);"></div>
          <div style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:28px;opacity:.3;"><i class="fas fa-coins"></i></div>
          <div style="font-size:10px;font-weight:700;letter-spacing:.1em;opacity:.7;margin-bottom:8px;">TODAY'S REVENUE</div>
          <div id="kpi-rev" style="font-size:26px;font-weight:900;letter-spacing:-.5px;">Rs. 0.00</div>
          <div style="font-size:11px;opacity:.6;margin-top:5px;"><i class="fas fa-arrow-trend-up"></i> Sales today</div>
        </div>
        <div class="kpi-card" style="background:linear-gradient(135deg,#065f46,#10b981);border-radius:18px;padding:20px;box-shadow:0 6px 20px rgba(16,185,129,.3);position:relative;overflow:hidden;" onclick="showPage('reports');">
          <div style="position:absolute;right:-14px;top:-14px;width:70px;height:70px;border-radius:50%;background:rgba(255,255,255,.08);"></div>
          <div style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:28px;opacity:.3;"><i class="fas fa-sack-dollar"></i></div>
          <div style="font-size:10px;font-weight:700;letter-spacing:.1em;opacity:.7;margin-bottom:8px;">TODAY'S PROFIT</div>
          <div id="kpi-profit" style="font-size:26px;font-weight:900;letter-spacing:-.5px;">Rs. 0.00</div>
          <div style="font-size:11px;opacity:.6;margin-top:5px;"><i class="fas fa-chart-line"></i> Net margin</div>
        </div>
        <div class="kpi-card" style="background:linear-gradient(135deg,#92400e,#f59e0b);border-radius:18px;padding:20px;box-shadow:0 6px 20px rgba(245,158,11,.3);position:relative;overflow:hidden;" onclick="showPage('pos');">
          <div style="position:absolute;right:-14px;top:-14px;width:70px;height:70px;border-radius:50%;background:rgba(255,255,255,.08);"></div>
          <div style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:28px;opacity:.3;"><i class="fas fa-receipt"></i></div>
          <div style="font-size:10px;font-weight:700;letter-spacing:.1em;opacity:.7;margin-bottom:8px;">BILLS TODAY</div>
          <div id="kpi-orders" style="font-size:26px;font-weight:900;letter-spacing:-.5px;">0</div>
          <div style="font-size:11px;opacity:.6;margin-top:5px;"><i class="fas fa-clock"></i> Transactions</div>
        </div>
        <div class="kpi-card" style="background:linear-gradient(135deg,#4c1d95,#8b5cf6);border-radius:18px;padding:20px;box-shadow:0 6px 20px rgba(139,92,246,.3);position:relative;overflow:hidden;" onclick="showPage('inventory');">
          <div style="position:absolute;right:-14px;top:-14px;width:70px;height:70px;border-radius:50%;background:rgba(255,255,255,.08);"></div>
          <div style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:28px;opacity:.3;"><i class="fas fa-boxes-stacked"></i></div>
          <div style="font-size:10px;font-weight:700;letter-spacing:.1em;opacity:.7;margin-bottom:8px;">PRODUCTS</div>
          <div id="kpi-prods" style="font-size:26px;font-weight:900;letter-spacing:-.5px;">0</div>
          <div style="font-size:11px;opacity:.6;margin-top:5px;"><i class="fas fa-box"></i> In catalogue</div>
        </div>
      </div>

      <!-- MODULE QUICK-ACCESS CARDS -->
      <div style="margin-bottom:18px;">
        <div style="font-size:13px;font-weight:700;color:#475569;margin-bottom:12px;letter-spacing:.05em;text-transform:uppercase;">Quick Access</div>
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:12px;">
          ${moduleCard('pos', 'fa-cash-register', '#4f46e5,#818cf8', 'Point of Sale', 'Billing')}
          ${moduleCard('inventory', 'fa-boxes-stacked', '#059669,#34d399', 'Inventory', 'Products')}
          ${moduleCard('grn', 'fa-truck-ramp-box', '#0891b2,#22d3ee', 'GRN', 'Stock In')}
          ${moduleCard('customers', 'fa-users', '#db2777,#f472b6', 'Customers', 'Register')}
          ${moduleCard('suppliers', 'fa-building', '#d97706,#fbbf24', 'Suppliers', 'Manage')}
          ${moduleCard('reports', 'fa-chart-bar', '#7c3aed,#a78bfa', 'Reports', 'Analytics')}
        </div>
      </div>

      <!-- CHARTS + LOW STOCK -->
      <div style="display:grid;grid-template-columns:1fr 1fr 280px;gap:14px;margin-bottom:14px;">
        <div style="background:#0d1829;border:1px solid rgba(99,179,237,.09);border-radius:16px;padding:18px;">
          <div style="font-weight:700;color:#a5b4fc;margin-bottom:14px;font-size:13px;display:flex;align-items:center;gap:7px;"><i class="fas fa-chart-area" style="color:#6366f1;"></i> 7-Day Revenue</div>
          <canvas id="salesChart"></canvas>
        </div>
        <div style="background:#0d1829;border:1px solid rgba(99,179,237,.09);border-radius:16px;padding:18px;">
          <div style="font-weight:700;color:#a5b4fc;margin-bottom:14px;font-size:13px;display:flex;align-items:center;gap:7px;"><i class="fas fa-chart-pie" style="color:#8b5cf6;"></i> Top Categories</div>
          <canvas id="catChart"></canvas>
        </div>
        <div style="background:#0d1829;border:1px solid rgba(99,179,237,.09);border-radius:16px;padding:18px;">
          <div style="font-weight:700;color:#f59e0b;margin-bottom:12px;font-size:13px;display:flex;align-items:center;gap:7px;justify-content:space-between;">
            <span><i class="fas fa-triangle-exclamation"></i> Low Stock</span>
            <button onclick="showPage('inventory')" style="font-size:10px;color:#6366f1;background:none;border:none;cursor:pointer;">View All</button>
          </div>
          <div id="low-stock-list" style="max-height:180px;overflow-y:auto;display:flex;flex-direction:column;gap:7px;">
            <div style="text-align:center;padding:14px;color:#334155;font-size:12px;">✅ All stocks OK</div>
          </div>
        </div>
      </div>

      <!-- RECENT TRANSACTIONS -->
      <div style="background:#0d1829;border:1px solid rgba(99,179,237,.09);border-radius:16px;padding:18px;">
        <div style="font-weight:700;color:#a5b4fc;margin-bottom:14px;font-size:13px;display:flex;align-items:center;justify-content:space-between;">
          <span><i class="fas fa-clock-rotate-left" style="color:#6366f1;"></i> Recent Transactions</span>
          <button onclick="showPage('reports')" style="font-size:11px;color:#6366f1;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.2);padding:5px 12px;border-radius:8px;cursor:pointer;">View Reports</button>
        </div>
        <table class="tbl" style="width:100%;border-collapse:collapse;">
          <thead><tr><th>#</th><th>Date & Time</th><th>Customer</th><th>Payment</th><th style="text-align:right;">Amount</th><th style="text-align:right;">Profit</th></tr></thead>
          <tbody id="recent-table"></tbody>
        </table>
      </div>
    `;

        // Add kpi-card hover styles
        if (!document.getElementById('dash-styles')) {
            const st = document.createElement('style');
            st.id = 'dash-styles';
            st.textContent = `
        .kpi-card { cursor:pointer; transition:transform .2s, box-shadow .2s; }
        .kpi-card:hover { transform:translateY(-3px); }
        .mod-card { cursor:pointer; transition:all .2s; }
        .mod-card:hover { transform:translateY(-4px); }
        .mod-card:active { transform:scale(.96); }
      `;
            document.head.appendChild(st);
        }
    }

    function moduleCard(page, icon, grad, title, sub) {
        return `
      <div class="mod-card" onclick="showPage('${page}')" style="background:linear-gradient(145deg,#0d1829,#111f35);border:1px solid rgba(99,179,237,.1);border-radius:16px;padding:18px 12px;text-align:center;">
        <div style="width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,${grad});margin:0 auto 10px;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px rgba(0,0,0,.35);">
          <i class="fas ${icon}" style="font-size:20px;color:#fff;"></i>
        </div>
        <div style="font-size:13px;font-weight:700;color:#e2e8f0;">${title}</div>
        <div style="font-size:11px;color:#475569;margin-top:3px;">${sub}</div>
      </div>`;
    }

    // Enhanced loadDashboard
    async function loadDashboard() {
        // Welcome greeting
        const h = new Date().getHours();
        const gr = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
        const wEl = document.getElementById('dash-welcome');
        if (wEl) {
            const name = (window.SESSION && window.SESSION.fullName) ? window.SESSION.fullName.split(' ')[0] : 'Team';
            wEl.textContent = gr + ', ' + name + '! ' + (h < 12 ? '☀️' : h < 17 ? '🌤️' : '🌙');
        }

        // KPIs
        const now = new Date();
        const start = new Date(now); start.setHours(0, 0, 0, 0);
        const end = new Date(start); end.setDate(end.getDate() + 1);
        const todaySales = await db.sales.where('timestamp').between(start.getTime(), end.getTime()).toArray();
        let rev = 0, prof = 0;
        todaySales.forEach(s => { rev += s.totalAmount || 0; prof += s.profit || 0; });
        setText('kpi-rev', 'Rs. ' + fmt(rev));
        setText('kpi-profit', 'Rs. ' + fmt(prof));
        setText('kpi-orders', todaySales.length);
        setText('kpi-prods', await db.products.count());

        // Low stock
        await renderLowStock();

        // 7-day chart
        const labels = [], revs = [], profs = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
            const nd = new Date(d); nd.setDate(nd.getDate() + 1);
            const ss = await db.sales.where('timestamp').between(d.getTime(), nd.getTime()).toArray();
            let r = 0, p = 0; ss.forEach(s => { r += s.totalAmount || 0; p += s.profit || 0; });
            labels.push(d.toLocaleDateString('en-LK', { weekday: 'short', day: 'numeric' }));
            revs.push(r); profs.push(p);
        }

        if (window._salesChartInst) window._salesChartInst.destroy();
        const sc = document.getElementById('salesChart');
        if (sc) {
            window._salesChartInst = new Chart(sc, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        { label: 'Revenue', data: revs, backgroundColor: 'rgba(99,102,241,.6)', borderColor: '#6366f1', borderWidth: 2, borderRadius: 6 },
                        { label: 'Profit', data: profs, backgroundColor: 'rgba(16,185,129,.5)', borderColor: '#10b981', borderWidth: 2, borderRadius: 6 },
                    ]
                },
                options: dashChartOpts()
            });
        }

        // Category donut
        const prods = await db.products.toArray();
        const catMap = {};
        prods.forEach(p => { catMap[p.category] = (catMap[p.category] || 0) + 1; });
        const catLabels = Object.keys(catMap);
        const catData = Object.values(catMap);
        const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];

        if (window._catChartInst) window._catChartInst.destroy();
        const cc = document.getElementById('catChart');
        if (cc && catLabels.length) {
            window._catChartInst = new Chart(cc, {
                type: 'doughnut',
                data: {
                    labels: catLabels,
                    datasets: [{ data: catData, backgroundColor: colors, borderColor: '#0d1829', borderWidth: 2, hoverOffset: 8 }]
                },
                options: {
                    responsive: true,
                    cutout: '65%',
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#475569', font: { size: 10 }, boxWidth: 10, padding: 8 } }
                    }
                }
            });
        }

        // Recent transactions
        await renderRecent();
    }

    async function renderRecent() {
        const ss = await db.sales.orderBy('id').reverse().limit(8).toArray();
        const tb = document.getElementById('recent-table');
        if (!tb) return;
        if (!ss.length) {
            tb.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:28px;color:#334155;">No transactions yet. Start billing! 🚀</td></tr>';
            return;
        }
        tb.innerHTML = (await Promise.all(ss.map(async s => {
            const pm = s.paymentMethod === 'cash'
                ? '<span class="badge" style="background:rgba(16,185,129,.12);color:#34d399;">Cash</span>'
                : '<span class="badge" style="background:rgba(139,92,246,.12);color:#a78bfa;">Card</span>';
            const profColor = (s.profit || 0) >= 0 ? '#34d399' : '#f87171';
            return `<tr>
        <td style="color:#475569;font-size:12px;">#${s.id}</td>
        <td style="color:#64748b;font-size:12px;">${new Date(s.timestamp).toLocaleString('en-LK')}</td>
        <td style="color:#a5b4fc;font-size:12px;">${esc(s.customerName || '— Guest')}</td>
        <td>${pm}</td>
        <td style="text-align:right;font-weight:700;color:#fff;">Rs. ${fmt(s.totalAmount)}</td>
        <td style="text-align:right;font-weight:600;color:${profColor};font-size:12px;">Rs. ${fmt(s.profit || 0)}</td>
      </tr>`;
        }))).join('');
    }

    function dashChartOpts() {
        const g = 'rgba(99,179,237,.05)';
        return {
            responsive: true,
            plugins: { legend: { labels: { color: '#475569', font: { size: 11 }, padding: 10 } } },
            scales: {
                x: { ticks: { color: '#334155', font: { size: 10 } }, grid: { color: g } },
                y: { ticks: { color: '#334155', font: { size: 10 }, callback: v => 'Rs.' + (v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v) }, grid: { color: g } }
            }
        };
    }

    // Override global loadDashboard
    window._origLoadDashboard = window.loadDashboard;
    window.loadDashboard = loadDashboard;

    // Also override renderRecent globally
    window.renderRecent = renderRecent;

    // Build UI on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildDashboard);
    } else {
        buildDashboard();
    }

    // Helper fallbacks
    function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
    function fmt(n) { return Number(n || 0).toFixed(2); }
    function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

})();
