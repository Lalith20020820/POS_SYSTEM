/* pos-rebuild.js — SuperMart POS v3 — Keells-Style Modern UI
   Complete POS page rebuild with premium Sri Lankan supermarket aesthetics.
   All original business logic preserved intact.
*/
(function () {

    /* ─────────────────────────────────────────────
       INJECT GLOBAL STYLES
    ───────────────────────────────────────────── */
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500&display=swap');

      #page-pos * { box-sizing: border-box; }

      #pos-root {
        display: flex;
        gap: 0;
        height: 100%;
        overflow: hidden;
        font-family: 'DM Sans', sans-serif;
        background: #f1f4f9;
      }

      /* ── LEFT PANEL ── */
      #pos-left {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background: #f1f4f9;
      }

      /* Search bar */
      #pos-searchbar {
        display: flex;
        gap: 8px;
        align-items: center;
        padding: 12px 14px;
        background: #fff;
        border-bottom: 1px solid #e5eaf2;
        flex-shrink: 0;
      }

      #pos-search-wrap {
        flex: 1;
        position: relative;
      }

      #pos-search {
        width: 100%;
        height: 40px;
        padding: 0 12px 0 40px;
        border: 1.5px solid #e0e7ef;
        border-radius: 10px;
        font-size: 13.5px;
        font-family: 'DM Sans', sans-serif;
        font-weight: 500;
        background: #f8fafc;
        color: #1e293b;
        outline: none;
        transition: border-color .2s, box-shadow .2s;
      }
      #pos-search:focus {
        border-color: #e5002b;
        box-shadow: 0 0 0 3px rgba(229,0,43,.1);
        background: #fff;
      }
      #pos-search::placeholder { color: #94a3b8; }

      #pos-search-icon {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: #cbd5e1;
        font-size: 14px;
        pointer-events: none;
      }

      #pos-cat {
        height: 40px;
        padding: 0 10px;
        border: 1.5px solid #e0e7ef;
        border-radius: 10px;
        font-size: 12.5px;
        font-family: 'DM Sans', sans-serif;
        font-weight: 600;
        background: #f8fafc;
        color: #334155;
        outline: none;
        cursor: pointer;
        min-width: 130px;
        transition: border-color .2s;
      }
      #pos-cat:focus { border-color: #e5002b; }

      #pos-clear-btn {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        border: 1.5px solid #e0e7ef;
        background: #f8fafc;
        color: #94a3b8;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        flex-shrink: 0;
        transition: all .18s;
      }
      #pos-clear-btn:hover { background: #fee2e2; border-color: #fca5a5; color: #e5002b; }

      /* Barcode preview */
      #pos-preview {
        display: none;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        background: #fff8f0;
        border-bottom: 2px solid #fed7aa;
        flex-shrink: 0;
      }
      #pos-preview.show { display: flex; }

      #prev-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: linear-gradient(135deg, #e5002b, #ff6b35);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        flex-shrink: 0;
      }

      #prev-add-btn {
        padding: 9px 18px;
        background: linear-gradient(135deg, #16a34a, #22c55e);
        border: none;
        border-radius: 10px;
        color: #fff;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
        font-family: 'DM Sans', sans-serif;
        box-shadow: 0 3px 10px rgba(22,163,74,.3);
        transition: all .18s;
      }
      #prev-add-btn:hover { transform: translateY(-1px); box-shadow: 0 5px 14px rgba(22,163,74,.4); }

      /* Category tabs */
      #pos-cat-tabs {
        display: flex;
        gap: 6px;
        padding: 10px 14px;
        overflow-x: auto;
        flex-shrink: 0;
        background: #fff;
        border-bottom: 1px solid #e5eaf2;
        scrollbar-width: none;
      }
      #pos-cat-tabs::-webkit-scrollbar { display: none; }

      .cat-tab {
        padding: 5px 14px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        font-family: 'DM Sans', sans-serif;
        cursor: pointer;
        border: 1.5px solid #e0e7ef;
        background: #f8fafc;
        color: #64748b;
        white-space: nowrap;
        transition: all .18s;
        flex-shrink: 0;
      }
      .cat-tab:hover { border-color: #e5002b; color: #e5002b; background: #fff5f5; }
      .cat-tab.active { background: #e5002b; color: #fff; border-color: #e5002b; }

      /* Product grid */
      #pos-grid {
        flex: 1;
        overflow-y: auto;
        padding: 12px 14px;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
        gap: 10px;
        align-content: start;
        scrollbar-width: thin;
        scrollbar-color: #cbd5e1 transparent;
      }

      .prod-card {
        background: #fff;
        border-radius: 14px;
        padding: 12px;
        cursor: pointer;
        border: 1.5px solid #e5eaf2;
        transition: all .18s;
        position: relative;
        box-shadow: 0 1px 4px rgba(0,0,0,.04);
        overflow: hidden;
      }
      .prod-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(229,0,43,.12);
        border-color: #e5002b;
      }
      .prod-card.oos { opacity: .55; cursor: not-allowed; }
      .prod-card.oos:hover { transform: none; box-shadow: none; border-color: #fca5a5; }

      .prod-card-accent {
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 3px;
        background: linear-gradient(90deg, #e5002b, #ff6b35);
        opacity: 0;
        transition: opacity .18s;
      }
      .prod-card:hover .prod-card-accent { opacity: 1; }

      .prod-card-icon {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        margin-bottom: 8px;
      }

      .prod-stock-badge {
        position: absolute;
        top: 9px; right: 9px;
        font-size: 10px;
        padding: 2px 7px;
        border-radius: 999px;
        font-weight: 700;
      }
      .stock-ok { background: #dcfce7; color: #16a34a; }
      .stock-low { background: #fef9c3; color: #ca8a04; }
      .stock-out { background: #fee2e2; color: #dc2626; }

      /* ── RIGHT PANEL (CART) ── */
      #pos-right {
        width: 308px;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        background: #fff;
        border-left: 1px solid #e5eaf2;
        box-shadow: -4px 0 20px rgba(0,0,0,.05);
      }

      /* Cart header */
      #cart-header {
        padding: 14px 16px 10px;
        border-bottom: 1px solid #f1f4f9;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      #cart-clear-btn {
        font-size: 11px;
        padding: 4px 10px;
        border-radius: 8px;
        background: #fee2e2;
        border: none;
        color: #dc2626;
        font-weight: 700;
        cursor: pointer;
        font-family: 'DM Sans', sans-serif;
        transition: all .15s;
      }
      #cart-clear-btn:hover { background: #fecaca; }

      /* Customer section */
      #pos-cust-section {
        padding: 10px 14px;
        border-bottom: 1px solid #f1f4f9;
        flex-shrink: 0;
        position: relative;
      }

      #pos-cust {
        width: 100%;
        height: 36px;
        padding: 0 10px 0 34px;
        border: 1.5px solid #e5eaf2;
        border-radius: 9px;
        font-size: 12.5px;
        font-family: 'DM Sans', sans-serif;
        font-weight: 500;
        color: #1e293b;
        background: #f8fafc;
        outline: none;
        transition: border-color .2s;
      }
      #pos-cust:focus { border-color: #e5002b; background: #fff; }
      #pos-cust::placeholder { color: #94a3b8; }

      #cust-drop {
        display: none;
        position: absolute;
        left: 14px;
        right: 14px;
        top: 54px;
        background: #fff;
        border: 1.5px solid #e5eaf2;
        border-radius: 12px;
        z-index: 600;
        max-height: 180px;
        overflow-y: auto;
        box-shadow: 0 8px 28px rgba(0,0,0,.12);
      }

      #cust-selected {
        display: none;
        margin-top: 7px;
        padding: 8px 10px;
        background: #f0fdf4;
        border: 1.5px solid #bbf7d0;
        border-radius: 9px;
        align-items: center;
        justify-content: space-between;
      }

      /* Cart items */
      #cart-items-wrap {
        flex: 1;
        overflow-y: auto;
        padding: 8px 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        scrollbar-width: thin;
        scrollbar-color: #e2e8f0 transparent;
      }

      #cart-empty {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 32px 16px;
        color: #cbd5e1;
        text-align: center;
      }

      .cart-item-row {
        background: #f8fafc;
        border: 1.5px solid #e5eaf2;
        border-radius: 12px;
        padding: 9px 11px;
        transition: border-color .15s;
      }
      .cart-item-row:hover { border-color: #e5002b33; }

      .ci-qty-btn {
        width: 26px;
        height: 26px;
        border-radius: 7px;
        background: #f1f5f9;
        border: 1.5px solid #e2e8f0;
        color: #475569;
        cursor: pointer;
        font-size: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all .15s;
        font-weight: 700;
      }
      .ci-qty-btn:hover { background: #e5002b; border-color: #e5002b; color: #fff; }

      .ci-qty-input {
        width: 48px;
        height: 26px;
        border-radius: 7px;
        background: #fff;
        border: 1.5px solid #e5002b;
        color: #1e293b;
        font-size: 13px;
        font-weight: 700;
        font-family: 'DM Mono', monospace;
        text-align: center;
        outline: none;
        padding: 0;
      }

      /* Totals panel */
      #pos-totals {
        padding: 12px 14px;
        border-top: 1px solid #f1f4f9;
        flex-shrink: 0;
        background: #fff;
      }

      #disc-inp {
        width: 64px;
        height: 28px;
        border-radius: 8px;
        background: #f8fafc;
        border: 1.5px solid #e5eaf2;
        color: #1e293b;
        font-size: 13px;
        font-weight: 700;
        font-family: 'DM Mono', monospace;
        text-align: center;
        outline: none;
        padding: 0 6px;
        transition: border-color .2s;
      }
      #disc-inp:focus { border-color: #e5002b; }

      .pay-btn {
        flex: 1;
        padding: 8px;
        border-radius: 10px;
        border: 2px solid #e5eaf2;
        background: #f8fafc;
        color: #64748b;
        font-size: 12px;
        font-weight: 700;
        font-family: 'DM Sans', sans-serif;
        cursor: pointer;
        transition: all .18s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
      }
      .pay-btn.active-cash {
        background: #f0fdf4;
        border-color: #16a34a;
        color: #16a34a;
      }
      .pay-btn.active-card {
        background: #eff6ff;
        border-color: #3b82f6;
        color: #3b82f6;
      }

      #checkout-btn {
        width: 100%;
        padding: 13px;
        background: linear-gradient(135deg, #e5002b, #c20025);
        border: none;
        border-radius: 12px;
        color: #fff;
        font-size: 15px;
        font-weight: 800;
        font-family: 'DM Sans', sans-serif;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(229,0,43,.35);
        transition: all .2s;
        letter-spacing: .3px;
      }
      #checkout-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(229,0,43,.45); }
      #checkout-btn:active { transform: translateY(0); }

      /* ── CHECKOUT MODAL ── */
      #ckout-modal .mbox {
        background: #fff;
        border-radius: 20px;
        color: #1e293b;
        border: none;
        box-shadow: 0 25px 80px rgba(0,0,0,.18);
      }
      #ckout-modal .mbox * { color: inherit; }

      /* ── RECEIPT MODAL ── */
      #rcpt-modal .mbox {
        background: #fff;
        border-radius: 16px;
        border: none;
      }
    `;
    document.head.appendChild(styleEl);

    /* ─────────────────────────────────────────────
       CATEGORY EMOJI MAP
    ───────────────────────────────────────────── */
    const CAT_EMOJI = {
        'Beverages': '🥤', 'Dairy': '🥛', 'Bakery': '🍞', 'Snacks': '🍿',
        'Fruits': '🍎', 'Vegetables': '🥦', 'Meat': '🥩', 'Seafood': '🐟',
        'Frozen': '🧊', 'Cleaning': '🧹', 'Personal Care': '🧴',
        'Electronics': '🔌', 'Stationery': '📝', 'Condiments': '🍶',
        'Rice & Grains': '🌾', 'Noodles': '🍜', 'Oil': '🫙',
    };
    function catEmoji(cat) { return CAT_EMOJI[cat] || '🛒'; }

    /* ─────────────────────────────────────────────
       BUILD POS PAGE HTML
    ───────────────────────────────────────────── */
    function buildPosPage() {
        const pg = document.getElementById('page-pos');
        if (!pg) return;

        pg.innerHTML = `
<div id="pos-root">

  <!-- ════════ LEFT: PRODUCTS ════════ -->
  <div id="pos-left">

    <!-- Search Bar -->
    <div id="pos-searchbar">
      <div id="pos-search-wrap">
        <i class="fas fa-barcode" id="pos-search-icon"></i>
        <input id="pos-search" placeholder="Scan barcode or type product name…"
          oninput="posSearch()" onkeydown="posSearchKey(event)" autofocus/>
      </div>
      <select id="pos-cat" onchange="posSearch()">
        <option value="">All Items</option>
      </select>
      <button id="pos-clear-btn" onclick="clearSearch()" title="Clear search">
        <i class="fas fa-xmark"></i>
      </button>
    </div>

    <!-- Barcode Preview Bar -->
    <div id="pos-preview">
      <div id="prev-icon">📦</div>
      <div style="flex:1;">
        <div id="prev-name" style="font-size:14px;font-weight:700;color:#1e293b;"></div>
        <div style="display:flex;gap:10px;margin-top:3px;flex-wrap:wrap;">
          <span id="prev-price" style="font-size:13px;font-weight:800;color:#e5002b;"></span>
          <span id="prev-cat" style="font-size:12px;color:#64748b;"></span>
          <span id="prev-stock-badge" class="prod-stock-badge"></span>
        </div>
      </div>
      <button id="prev-add-btn" onclick="addPreviewItem()">
        <i class="fas fa-plus"></i> Add to Cart
      </button>
    </div>

    <!-- Category Quick Tabs -->
    <div id="pos-cat-tabs">
      <button class="cat-tab active" data-cat="" onclick="setCatTab(this,'')">
        🛒 All
      </button>
    </div>

    <!-- Product Grid -->
    <div id="pos-grid">
      <div style="grid-column:1/-1;text-align:center;padding:48px 0;color:#cbd5e1;">
        <i class="fas fa-box-open" style="font-size:36px;display:block;margin-bottom:10px;"></i>
        <span style="font-size:13px;">Loading products…</span>
      </div>
    </div>
  </div>

  <!-- ════════ RIGHT: CART ════════ -->
  <div id="pos-right">

    <!-- Cart Header -->
    <div id="cart-header">
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,#e5002b,#ff6b35);display:flex;align-items:center;justify-content:center;">
          <i class="fas fa-cart-shopping" style="color:#fff;font-size:13px;"></i>
        </div>
        <div>
          <div style="font-size:13px;font-weight:800;color:#1e293b;">Shopping Cart</div>
          <div style="font-size:11px;color:#94a3b8;">
            <span id="cart-count" style="font-weight:700;color:#e5002b;">0</span> items
          </div>
        </div>
      </div>
      <button id="cart-clear-btn" onclick="clearCart()">
        <i class="fas fa-trash" style="font-size:10px;margin-right:3px;"></i> Clear
      </button>
    </div>

    <!-- Customer Section -->
    <div id="pos-cust-section">
      <div style="font-size:10.5px;font-weight:700;color:#94a3b8;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px;">
        <i class="fas fa-user" style="color:#e5002b;margin-right:4px;"></i>Customer (optional)
      </div>
      <div style="position:relative;">
        <i class="fas fa-search" style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#cbd5e1;font-size:11px;"></i>
        <input id="pos-cust" placeholder="Name or phone number…"
          oninput="searchCust()" onkeydown="custKey(event)"/>
      </div>
      <div id="cust-drop"></div>
      <div id="cust-selected">
        <div>
          <div id="cust-name-show" style="font-size:12px;font-weight:700;color:#16a34a;"></div>
          <div id="cust-phone-show" style="font-size:11px;color:#64748b;margin-top:1px;"></div>
        </div>
        <button onclick="clearCust()" style="background:#fee2e2;border:none;width:22px;height:22px;border-radius:6px;color:#dc2626;cursor:pointer;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;">×</button>
      </div>
    </div>

    <!-- Cart Items -->
    <div id="cart-items-wrap">
      <div id="cart-empty">
        <div style="font-size:48px;margin-bottom:10px;">🛒</div>
        <div style="font-size:13px;font-weight:700;color:#94a3b8;">Cart is empty</div>
        <div style="font-size:11px;color:#cbd5e1;margin-top:4px;">Scan or click a product to add</div>
      </div>
      <div id="cart-items" style="display:none;flex-direction:column;gap:6px;"></div>
    </div>

    <!-- Totals + Checkout -->
    <div id="pos-totals">
      <!-- Discount Row -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:12px;font-weight:600;color:#64748b;">Discount %</span>
        <input id="disc-inp" type="number" min="0" max="100" value="0" onchange="updateTotals()"/>
      </div>

      <!-- Subtotal -->
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:12px;color:#94a3b8;">Subtotal</span>
        <span id="cart-sub" style="font-size:12px;color:#475569;font-weight:600;font-family:'DM Mono',monospace;">Rs. 0.00</span>
      </div>

      <!-- Divider -->
      <div style="border-top:2px dashed #f1f4f9;margin:8px 0;"></div>

      <!-- Total -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <span style="font-size:15px;font-weight:800;color:#1e293b;">Total</span>
        <span id="cart-total" style="font-size:20px;font-weight:900;color:#e5002b;font-family:'DM Mono',monospace;letter-spacing:-.5px;">Rs. 0.00</span>
      </div>

      <!-- Payment Method -->
      <div style="display:flex;gap:7px;margin-bottom:10px;">
        <button class="pay-btn active-cash" id="pay-cash" onclick="setPay('cash')">
          <i class="fas fa-money-bill-wave"></i> Cash
        </button>
        <button class="pay-btn" id="pay-card" onclick="setPay('card')">
          <i class="fas fa-credit-card"></i> Card
        </button>
      </div>

      <!-- Checkout Button -->
      <button id="checkout-btn" onclick="openCheckout()">
        <i class="fas fa-cash-register" style="margin-right:6px;"></i> Checkout
      </button>
    </div>
  </div>

</div>

<!-- ════════ CHECKOUT MODAL ════════ -->
<div class="mb" id="ckout-modal" onclick="if(event.target===this)closeModal('ckout-modal')">
  <div class="mbox" style="max-width:420px;" onclick="event.stopPropagation()">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#e5002b,#ff6b35);display:flex;align-items:center;justify-content:center;">
          <i class="fas fa-cash-register" style="color:#fff;font-size:15px;"></i>
        </div>
        <div style="font-size:17px;font-weight:800;color:#1e293b;">Checkout</div>
      </div>
      <button onclick="closeModal('ckout-modal')" style="width:32px;height:32px;border-radius:8px;background:#f1f5f9;border:none;color:#64748b;cursor:pointer;font-size:14px;">✕</button>
    </div>

    <!-- Order Summary -->
    <div style="background:#f8fafc;border:1.5px solid #e5eaf2;border-radius:14px;padding:12px;margin-bottom:14px;">
      <div style="font-size:10.5px;font-weight:700;color:#94a3b8;letter-spacing:.07em;text-transform:uppercase;margin-bottom:8px;">Order Summary</div>
      <div id="ck-items" style="max-height:140px;overflow-y:auto;font-size:12.5px;color:#475569;"></div>
      <div style="border-top:1.5px dashed #e5eaf2;margin:8px 0;padding-top:8px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#94a3b8;margin-bottom:3px;">
          <span>Subtotal</span><span id="ck-sub" style="font-family:'DM Mono',monospace;"></span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#f59e0b;margin-bottom:3px;">
          <span>Discount</span><span id="ck-disc" style="font-family:'DM Mono',monospace;"></span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:900;color:#1e293b;">
          <span>TOTAL</span><span id="ck-total" style="color:#e5002b;font-family:'DM Mono',monospace;"></span>
        </div>
      </div>
    </div>

    <div style="display:flex;gap:10px;margin-bottom:12px;">
      <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:8px 12px;">
        <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;">Customer</div>
        <div id="ck-cust" style="font-size:12.5px;font-weight:700;color:#16a34a;margin-top:2px;"></div>
      </div>
      <div style="flex:1;background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:8px 12px;">
        <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;">Payment</div>
        <div id="ck-method" style="font-size:12.5px;font-weight:700;color:#0ea5e9;margin-top:2px;text-transform:uppercase;"></div>
      </div>
    </div>

    <div id="cash-row" style="margin-bottom:14px;">
      <label style="font-size:11.5px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">Cash Received (Rs.)</label>
      <input id="cash-in" type="number"
        style="width:100%;height:44px;border-radius:10px;background:#f8fafc;border:2px solid #e5eaf2;color:#1e293b;font-size:18px;font-weight:800;font-family:'DM Mono',monospace;text-align:center;outline:none;transition:border-color .2s;"
        placeholder="0.00" oninput="calcChange()"
        onfocus="this.style.borderColor='#e5002b'"
        onblur="this.style.borderColor='#e5eaf2'"/>
      <div style="display:flex;justify-content:space-between;margin-top:8px;padding:10px 14px;background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;">
        <span style="font-size:13px;color:#64748b;font-weight:600;">Change Due</span>
        <span id="change-out" style="font-size:15px;font-weight:800;color:#16a34a;font-family:'DM Mono',monospace;">Rs. 0.00</span>
      </div>
    </div>

    <button onclick="completeSale()"
      style="width:100%;padding:14px;background:linear-gradient(135deg,#16a34a,#22c55e);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:800;cursor:pointer;font-family:'DM Sans',sans-serif;box-shadow:0 4px 16px rgba(22,163,74,.35);transition:all .2s;letter-spacing:.3px;"
      onmouseover="this.style.transform='translateY(-1px)'"
      onmouseout="this.style.transform=''">
      <i class="fas fa-check-circle" style="margin-right:7px;"></i> Complete Sale
    </button>
  </div>
</div>

<!-- ════════ RECEIPT MODAL ════════ -->
<div class="mb" id="rcpt-modal" onclick="if(event.target===this)closeModal('rcpt-modal')">
  <div class="mbox" style="max-width:360px;" onclick="event.stopPropagation()">
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:12px;">
      <button onclick="window.print()"
        style="display:flex;align-items:center;gap:6px;padding:7px 14px;background:#1e293b;border:none;border-radius:9px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;">
        <i class="fas fa-print"></i> Print
      </button>
      <button onclick="closeModal('rcpt-modal')"
        style="display:flex;align-items:center;gap:6px;padding:7px 14px;background:#f1f5f9;border:none;border-radius:9px;color:#475569;font-size:12px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;">
        <i class="fas fa-xmark"></i> Close
      </button>
    </div>
    <div id="thermal-bill" style="font-family:'Courier New',monospace;font-size:12px;color:#000;background:#fff;padding:16px;border-radius:8px;line-height:1.6;">
      <div style="text-align:center;margin-bottom:8px;">
        <div style="font-size:18px;font-weight:900;letter-spacing:1px;">SUPERMART</div>
        <div style="font-size:10px;">Colombo, Sri Lanka | Tel: 011-XXXXXXX</div>
        <div style="border-top:1px dashed #000;margin:6px 0;"></div>
      </div>
      <div id="r-date" style="font-size:10px;text-align:center;"></div>
      <div id="r-id" style="font-size:11px;font-weight:700;text-align:center;margin-bottom:4px;"></div>
      <div id="r-cust-name" style="font-size:10px;"></div>
      <div id="r-cust-phone" style="font-size:10px;margin-bottom:4px;"></div>
      <div style="border-top:1px dashed #000;margin:6px 0;"></div>
      <div id="r-items"></div>
      <div style="border-top:1px dashed #000;margin:6px 0;"></div>
      <table style="width:100%;font-size:11px;">
        <tr><td>Subtotal</td><td style="text-align:right;" id="r-sub"></td></tr>
        <tr><td>Discount</td><td style="text-align:right;" id="r-disc"></td></tr>
        <tr style="font-weight:900;font-size:14px;"><td>TOTAL</td><td style="text-align:right;" id="r-total"></td></tr>
        <tr><td>Payment</td><td style="text-align:right;" id="r-method"></td></tr>
        <tr><td>Cash</td><td style="text-align:right;" id="r-cash"></td></tr>
        <tr style="font-weight:700;color:#059669;"><td>Change</td><td style="text-align:right;" id="r-change"></td></tr>
      </table>
      <div style="border-top:1px dashed #000;margin:8px 0;text-align:center;font-size:10px;">
        Thank you for shopping at SuperMart! 🙏<br/>Please come again.
      </div>
    </div>
  </div>
</div>`;
    }

    /* ─────────────────────────────────────────────
       STATE
    ───────────────────────────────────────────── */
    window.cart = window.cart || [];
    window.selCust = window.selCust || null;
    window.payMethod = window.payMethod || 'cash';
    window.allProds = window.allProds || [];
    let _custRes = [];
    let _previewProd = null;
    let _activeCat = '';

    /* ─────────────────────────────────────────────
       CATEGORY TABS
    ───────────────────────────────────────────── */
    window.setCatTab = function (el, cat) {
        _activeCat = cat;
        document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
        if (el) el.classList.add('active');
        const sel = document.getElementById('pos-cat');
        if (sel) sel.value = cat;
        posSearch();
    };

    function buildCatTabs(cats) {
        const wrap = document.getElementById('pos-cat-tabs');
        if (!wrap) return;
        wrap.innerHTML = `<button class="cat-tab${_activeCat === '' ? ' active' : ''}" data-cat="" onclick="setCatTab(this,'')">🛒 All</button>`
            + cats.map(c => `<button class="cat-tab${_activeCat === c ? ' active' : ''}" data-cat="${esc(c)}" onclick="setCatTab(this,'${esc(c)}')">${catEmoji(c)} ${esc(c)}</button>`).join('');
    }

    /* ─────────────────────────────────────────────
       POS SEARCH
    ───────────────────────────────────────────── */
    window.posSearch = async function () {
        const q = (document.getElementById('pos-search')?.value || '').trim().toLowerCase();
        const cat = (document.getElementById('pos-cat')?.value || '');
        let ps = window.allProds.length ? window.allProds : await db.products.toArray();
        window.allProds = ps;

        if (q) ps = ps.filter(p => p.name.toLowerCase().includes(q) || (p.barcode || '').toLowerCase().includes(q));
        if (cat) ps = ps.filter(p => p.category === cat);

        const exact = q ? ps.find(p => (p.barcode || '').toLowerCase() === q) : null;
        showPreview(exact || null);

        const grid = document.getElementById('pos-grid');
        if (!grid) return;

        if (!ps.length) {
            grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 0;color:#cbd5e1;">
        <i class="fas fa-search" style="font-size:32px;display:block;margin-bottom:10px;"></i>
        <div style="font-size:13px;font-weight:600;">No products found</div>
        <div style="font-size:12px;margin-top:4px;">Try a different search term</div>
      </div>`;
            return;
        }

        grid.innerHTML = ps.map(p => {
            const oos = p.stock <= 0;
            const low = p.stock > 0 && p.stock <= (p.lowStockThreshold || 5);
            const stockClass = oos ? 'stock-out' : low ? 'stock-low' : 'stock-ok';
            const stockLabel = oos ? 'Out of Stock' : low ? '⚠ Low: ' + p.stock : p.stock + ' left';
            const emoji = catEmoji(p.category || '');
            return `<div class="prod-card${oos ? ' oos' : ''}" onclick="${oos ? '' : 'addToCart(' + p.id + ')'}">
        <div class="prod-card-accent"></div>
        <div class="prod-card-icon">${emoji}</div>
        <div class="prod-stock-badge ${stockClass}">${stockLabel}</div>
        <div style="font-size:12px;font-weight:700;color:#1e293b;line-height:1.35;margin-bottom:3px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${esc(p.name)}</div>
        <div style="font-size:10.5px;color:#94a3b8;margin-bottom:6px;">${esc(p.category || '')}</div>
        <div style="font-size:15px;font-weight:900;color:#e5002b;font-family:'DM Mono',monospace;">Rs.${fmt(p.sellingPrice)}</div>
        ${!oos ? `<div style="margin-top:8px;padding:5px;background:#fff5f5;border-radius:8px;text-align:center;font-size:11px;font-weight:700;color:#e5002b;border:1px solid #fecaca;">
          <i class="fas fa-plus" style="font-size:9px;"></i> Add
        </div>` : ''}
      </div>`;
        }).join('');
    };

    window.posSearchKey = function (e) {
        if (e.key === 'Enter' && _previewProd) {
            addPreviewItem();
            const el = document.getElementById('pos-search');
            if (el) el.value = '';
            showPreview(null);
        }
    };

    window.clearSearch = function () {
        const el = document.getElementById('pos-search');
        if (el) el.value = '';
        showPreview(null);
        posSearch();
    };

    function showPreview(p) {
        _previewProd = p;
        const pv = document.getElementById('pos-preview');
        if (!pv) return;
        if (!p) { pv.classList.remove('show'); return; }
        pv.classList.add('show');
        setText('prev-name', p.name);
        setText('prev-price', 'Rs. ' + fmt(p.sellingPrice));
        setText('prev-cat', p.category || '');
        const sb = document.getElementById('prev-stock-badge');
        if (sb) {
            if (p.stock > 0) { sb.textContent = 'In Stock: ' + p.stock; sb.className = 'prod-stock-badge stock-ok'; }
            else { sb.textContent = 'Out of Stock'; sb.className = 'prod-stock-badge stock-out'; }
        }
        const icon = document.getElementById('prev-icon');
        if (icon) icon.textContent = catEmoji(p.category || '');
        const ab = document.getElementById('prev-add-btn');
        if (ab) ab.disabled = p.stock <= 0;
    }

    window.addPreviewItem = function () {
        if (!_previewProd) return;
        window.addToCart(_previewProd);
        const el = document.getElementById('pos-search');
        if (el) el.value = '';
        showPreview(null);
    };

    /* ─────────────────────────────────────────────
       CART
    ───────────────────────────────────────────── */
    window.addToCart = function (pOrId) {
        const p = typeof pOrId === 'object' ? pOrId : window.allProds.find(x => x.id === pOrId);
        if (!p) { toast('Product not found', 'error'); return; }
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

    window.renderCart = function () {
        const ce = document.getElementById('cart-empty');
        const ci = document.getElementById('cart-items');
        const cc = document.getElementById('cart-count');
        if (!ci || !ce) return;

        const tot = cart.reduce((s, c) => s + c.qty, 0);
        if (cc) cc.textContent = tot;

        if (!cart.length) {
            ce.style.display = 'flex';
            ci.style.display = 'none';
            updateTotals();
            return;
        }

        ce.style.display = 'none';
        ci.style.display = 'flex';

        ci.innerHTML = cart.map(it => `
      <div class="cart-item-row">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:6px;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:12px;font-weight:700;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(it.product.name)}</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">Rs.${fmt(it.product.sellingPrice)} × ${it.qty} = <b style="color:#e5002b;">Rs.${fmt(it.product.sellingPrice * it.qty)}</b></div>
          </div>
          <button onclick="rmCart(${it.product.id})"
            style="background:#fee2e2;border:none;width:26px;height:26px;border-radius:7px;color:#dc2626;cursor:pointer;flex-shrink:0;font-size:11px;display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-trash"></i>
          </button>
        </div>
        <div style="display:flex;align-items:center;gap:5px;">
          <button class="ci-qty-btn" onclick="setQty(${it.product.id},-1)">−</button>
          <input class="ci-qty-input" type="number" min="1" max="${it.product.stock}" value="${it.qty}"
            onclick="this.select()"
            onchange="setQtyVal(${it.product.id},this.value)"/>
          <button class="ci-qty-btn" onclick="setQty(${it.product.id},1)">+</button>
          <span style="font-size:10px;color:#cbd5e1;margin-left:2px;">/ ${it.product.stock}</span>
        </div>
      </div>`).join('');

        updateTotals();
    };

    window.setQty = function (id, d) {
        const it = cart.find(c => c.product.id === id);
        if (!it) return;
        const n = it.qty + d;
        if (n <= 0) { cart = cart.filter(c => c.product.id !== id); }
        else if (n > it.product.stock) { toast('Max stock: ' + it.product.stock, 'warning'); return; }
        else { it.qty = n; }
        renderCart();
    };

    window.setQtyVal = function (id, v) {
        const it = cart.find(c => c.product.id === id);
        if (!it) return;
        let n = parseInt(v);
        if (isNaN(n) || n < 1) n = 1;
        if (n > it.product.stock) { n = it.product.stock; toast('Max: ' + n, 'warning'); }
        it.qty = n;
        renderCart();
    };

    window.rmCart = function (id) { cart = cart.filter(c => c.product.id !== id); renderCart(); };
    window.clearCart = function () { cart = []; selCust = null; renderCart(); clearCust(); };
    window.chgQty = window.setQty;

    window.updateTotals = function () {
        const sub = cart.reduce((s, c) => s + c.product.sellingPrice * c.qty, 0);
        const dc = Math.min(100, Math.max(0, parseFloat(document.getElementById('disc-inp')?.value) || 0));
        const tot = sub * (1 - dc / 100);
        setText('cart-sub', 'Rs. ' + fmt(sub));
        setText('cart-total', 'Rs. ' + fmt(tot));
    };

    window.setPay = function (m) {
        payMethod = m;
        const bc = document.getElementById('pay-cash');
        const bd = document.getElementById('pay-card');
        if (bc) bc.className = 'pay-btn' + (m === 'cash' ? ' active-cash' : '');
        if (bd) bd.className = 'pay-btn' + (m === 'card' ? ' active-card' : '');
    };

    /* ─────────────────────────────────────────────
       CUSTOMER
    ───────────────────────────────────────────── */
    window.searchCust = async function () {
        const inp = document.getElementById('pos-cust');
        const drop = document.getElementById('cust-drop');
        if (!inp || !drop) return;
        const q = (inp.value || '').trim().toLowerCase();
        if (!q) { drop.style.display = 'none'; return; }
        const all = await db.customers.toArray();
        _custRes = all.filter(c => c.name.toLowerCase().includes(q) || (c.phone || '').includes(q));
        if (!_custRes.length) {
            drop.innerHTML = '<div style="padding:10px 12px;font-size:12px;color:#94a3b8;">No match — press Enter to add new</div>';
            drop.style.display = 'block';
            return;
        }
        drop.style.display = 'block';
        drop.innerHTML = _custRes.map((c, i) =>
            `<div onclick="selectCust(${i})"
        style="padding:9px 12px;font-size:12px;cursor:pointer;border-bottom:1px solid #f1f4f9;color:#1e293b;display:flex;justify-content:space-between;align-items:center;"
        onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
        <div><b style="color:#1e293b;">${esc(c.name)}</b><span style="color:#94a3b8;margin-left:8px;">${esc(c.phone || '')}</span></div>
        <span style="font-size:10px;color:#cbd5e1;">${c.visitCount || 0} visits</span>
      </div>`
        ).join('');
    };

    window.selectCust = function (i) {
        const c = _custRes[i];
        if (!c) return;
        window.selCust = c;
        const inp = document.getElementById('pos-cust');
        const drop = document.getElementById('cust-drop');
        const sel = document.getElementById('cust-selected');
        if (inp) inp.value = '';
        if (drop) drop.style.display = 'none';
        if (sel) sel.style.display = 'flex';
        setText('cust-name-show', '✓ ' + c.name);
        setText('cust-phone-show', c.phone || '');
        toast('Customer: ' + c.name, 'info');
    };

    window.clearCust = function () {
        window.selCust = null;
        _custRes = [];
        const sel = document.getElementById('cust-selected');
        const inp = document.getElementById('pos-cust');
        const drop = document.getElementById('cust-drop');
        if (sel) sel.style.display = 'none';
        if (inp) inp.value = '';
        if (drop) drop.style.display = 'none';
    };

    window.custKey = async function (e) {
        if (e.key === 'Escape') { const d = document.getElementById('cust-drop'); if (d) d.style.display = 'none'; return; }
        if (e.key === 'Enter') {
            if (_custRes.length) { selectCust(0); }
            else {
                const v = (document.getElementById('pos-cust')?.value || '').trim();
                if (!v) return;
                const name = prompt('Customer Name:') || v;
                const id = await db.customers.add({ name, phone: v, email: '', address: '', totalSpent: 0, visitCount: 0 });
                const nc = await db.customers.get(id);
                window.selCust = nc; _custRes = [nc]; selectCust(0);
                toast('Customer added: ' + name, 'success');
            }
        }
    };

    /* ─────────────────────────────────────────────
       CHECKOUT
    ───────────────────────────────────────────── */
    window.openCheckout = function () {
        if (!cart || !cart.length) { toast('Cart is empty!', 'warning'); return; }
        const sub = cart.reduce((s, c) => s + c.product.sellingPrice * c.qty, 0);
        const dc = Math.min(100, Math.max(0, parseFloat(document.getElementById('disc-inp')?.value) || 0));
        const tot = sub * (1 - dc / 100);
        window._ckTot = tot;

        setText('ck-sub', 'Rs. ' + fmt(sub));
        setText('ck-disc', dc > 0 ? '- Rs. ' + fmt(sub * dc / 100) + ' (' + dc + '%)' : 'None');
        setText('ck-total', 'Rs. ' + fmt(tot));
        setText('ck-cust', selCust ? selCust.name + ' (' + (selCust.phone || '') + ')' : '— Guest');
        setText('ck-method', payMethod);

        const ckItems = document.getElementById('ck-items');
        if (ckItems) ckItems.innerHTML = cart.map(c =>
            `<div style="display:flex;justify-content:space-between;margin-bottom:4px;padding-bottom:4px;border-bottom:1px solid #f1f4f9;">
          <span style="color:#475569;">${esc(c.product.name)} <b style="color:#94a3b8;">×${c.qty}</b></span>
          <span style="font-weight:700;color:#1e293b;font-family:'DM Mono',monospace;">Rs.${fmt(c.product.sellingPrice * c.qty)}</span>
        </div>`
        ).join('');

        const cr = document.getElementById('cash-row');
        if (cr) cr.style.display = payMethod === 'cash' ? 'block' : 'none';
        const ci = document.getElementById('cash-in');
        if (ci) { ci.value = ''; setTimeout(() => ci.focus(), 200); }
        setText('change-out', 'Rs. 0.00');
        openModal('ckout-modal');
    };

    window.calcChange = function () {
        const r = parseFloat(document.getElementById('cash-in')?.value) || 0;
        setText('change-out', 'Rs. ' + fmt(Math.max(0, r - window._ckTot)));
    };

    window.completeSale = async function () {
        if (!cart || !cart.length) return;
        const sub = cart.reduce((s, c) => s + c.product.sellingPrice * c.qty, 0);
        const dc = Math.min(100, Math.max(0, parseFloat(document.getElementById('disc-inp')?.value) || 0));
        const tot = sub * (1 - dc / 100);
        const recv = payMethod === 'cash' ? (parseFloat(document.getElementById('cash-in')?.value) || 0) : tot;
        if (payMethod === 'cash' && recv < tot - 0.01) { toast('Cash received less than total!', 'error'); return; }
        let pf = 0;
        cart.forEach(c => { pf += (c.product.sellingPrice - c.product.buyingPrice) * c.qty; });
        const profit = pf * (1 - dc / 100);

        const sid = await db.sales.add({
            timestamp: Date.now(), subTotal: sub, discount: dc, totalAmount: tot,
            paymentMethod: payMethod, profit, customerId: selCust?.id || null, customerName: selCust?.name || null
        });
        for (const it of cart) {
            await db.saleItems.add({ saleId: sid, productId: it.product.id, productName: it.product.name, qty: it.qty, priceAtSale: it.product.sellingPrice, buyPrice: it.product.buyingPrice || 0 });
            const cur = await db.products.get(it.product.id);
            if (cur) await db.products.update(it.product.id, { stock: Math.max(0, cur.stock - it.qty) });
        }
        if (selCust) await db.customers.update(selCust.id, { totalSpent: (selCust.totalSpent || 0) + tot, visitCount: (selCust.visitCount || 0) + 1 });

        const rc = [...cart];
        const sc = selCust;
        closeModal('ckout-modal');
        buildReceipt({ sid, rc, sub, dc, tot, payMethod, recv, cust: sc });
        openModal('rcpt-modal');

        if (sc?.phone) {
            setTimeout(() => {
                if (typeof sendWA === 'function') sendWA(sc, { sid, rc, sub, dc, tot, payMethod, recv });
                else if (typeof sendWhatsAppBill === 'function') sendWhatsAppBill(sc, { sid, rc, sub, dc, tot, payMethod, recv });
            }, 1200);
        }

        clearCart();
        window.allProds = await db.products.toArray();
        posSearch();
        if (typeof renderLowStock === 'function') renderLowStock();
        toast('Sale #' + sid + ' complete! 🎉', 'success');
    };

    window.buildReceipt = function ({ sid, rc, sub, dc, tot, payMethod, recv, cust }) {
        const now = new Date().toLocaleString('en-LK');
        setText('r-date', now);
        setText('r-id', 'Receipt #' + sid);
        setText('r-cust-name', cust ? 'Customer: ' + cust.name : '');
        setText('r-cust-phone', cust ? 'Phone: ' + cust.phone : '');
        const ri = document.getElementById('r-items');
        if (ri) ri.innerHTML = rc.map(c =>
            `<div style="display:flex;justify-content:space-between;margin-bottom:3px;font-size:11px;">
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:8px;">${esc(c.product.name.slice(0, 22))}</span>
          <span>${c.qty}×Rs.${fmt(c.product.sellingPrice)}</span>
          <span style="font-weight:700;min-width:56px;text-align:right;">Rs.${fmt(c.product.sellingPrice * c.qty)}</span>
        </div>`
        ).join('');
        setText('r-sub', 'Rs.' + fmt(sub));
        setText('r-disc', dc > 0 ? '-Rs.' + fmt(sub * dc / 100) + ' (' + dc + '%)' : '—');
        setText('r-total', 'Rs.' + fmt(tot));
        setText('r-method', payMethod.toUpperCase());
        setText('r-cash', payMethod === 'cash' ? 'Rs.' + fmt(recv) : '—');
        setText('r-change', payMethod === 'cash' ? 'Rs.' + fmt(Math.max(0, recv - tot)) : '—');
    };

    /* ─────────────────────────────────────────────
       UTILS
    ───────────────────────────────────────────── */
    function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v || ''; }
    function fmt(n) { return Number(n || 0).toFixed(2); }
    function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    /* ─────────────────────────────────────────────
       INIT
    ───────────────────────────────────────────── */
    function init() {
        buildPosPage();
        db.products.toArray().then(ps => {
            window.allProds = ps;
            posSearch();
            const cats = [...new Set(ps.map(p => p.category).filter(Boolean))].sort();
            const sel = document.getElementById('pos-cat');
            if (sel) sel.innerHTML = '<option value="">All Items</option>' + cats.map(c => `<option value="${c}">${esc(c)}</option>`).join('');
            buildCatTabs(cats);
        });
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); }
    else { init(); }

    /* ─────────────────────────────────────────────
       PATCH showPage
    ───────────────────────────────────────────── */
    const _origSP = window.showPage;
    window.showPage = function (p) {
        if (typeof guardPage === 'function' && !guardPage(p)) return;
        document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.ni').forEach(el => el.classList.remove('active'));
        const page = document.getElementById('page-' + p);
        if (page) page.classList.add('active');
        const nav = document.getElementById('nav-' + p);
        if (nav) nav.classList.add('active');
        const titleEl = document.getElementById('page-title');
        const titles = { dashboard: 'Dashboard', pos: 'Point of Sale', inventory: 'Inventory', grn: 'GRN', customers: 'Customers', suppliers: 'Suppliers', reports: 'Reports', users: 'User Accounts' };
        if (titleEl) titleEl.textContent = titles[p] || p;

        if (p === 'pos') {
            db.products.toArray().then(ps => {
                window.allProds = ps;
                posSearch();
                const cats = [...new Set(ps.map(x => x.category).filter(Boolean))].sort();
                const sel = document.getElementById('pos-cat');
                if (sel) sel.innerHTML = '<option value="">All Items</option>' + cats.map(c => `<option value="${c}">${esc(c)}</option>`).join('');
                buildCatTabs(cats);
            });
        }
        if (p === 'dashboard' && typeof loadDashboard === 'function') setTimeout(loadDashboard, 50);
        if (p === 'inventory' && typeof loadInventory === 'function') setTimeout(loadInventory, 50);
        if (p === 'suppliers' && typeof loadSuppliers === 'function') setTimeout(loadSuppliers, 50);
        if (p === 'grn' && typeof loadGrn === 'function') setTimeout(loadGrn, 50);
        if (p === 'customers' && typeof loadCustomers === 'function') setTimeout(loadCustomers, 50);
        if (p === 'reports') { if (typeof setRptDefaults === 'function') setRptDefaults(); }
        if (p === 'users' && typeof loadUsers === 'function') setTimeout(loadUsers, 50);
    };
    window.showPage.__rebuilt = true;

    console.log('[pos-rebuild] Keells-style POS loaded successfully.');
})();
