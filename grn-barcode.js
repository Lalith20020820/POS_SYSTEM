/* grn-barcode.js — SuperMart POS v3
   1. GRN: Barcode scan/type → auto-select product instantly
   2. GRN: Auto-generate barcode for new products (no barcode set)
   3. Barcode modal: scan existing barcode to load product
*/
(function () {

    /* ── LOAD JsBarcode ── */
    function loadScript(src, cb) {
        if (document.querySelector('script[src="' + src + '"]')) { if (cb) cb(); return; }
        const s = document.createElement('script');
        s.src = src;
        s.onload = cb || null;
        document.head.appendChild(s);
    }
    loadScript('https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js');

    /* ═══════════════════════════════════════════════════
       1. GRN — BARCODE SCAN / TYPE → AUTO-SELECT PRODUCT
    ═══════════════════════════════════════════════════ */

    // Patch openGrnModal to add a barcode scan input
    const _origOpenGrn = window.openGrnModal;
    window.openGrnModal = async function () {
        if (_origOpenGrn) await _origOpenGrn();
        // Inject barcode scan row into GRN modal if not already there
        setTimeout(injectGrnBarcodeRow, 150);
    };

    function injectGrnBarcodeRow() {
        const addSection = document.querySelector('#grn-modal .mbox > div[style*="rgba(16,185,129"]');
        if (!addSection || document.getElementById('grn-barcode-row')) return;

        const row = document.createElement('div');
        row.id = 'grn-barcode-row';
        row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:8px;';
        row.innerHTML = `
      <div style="position:relative;flex:1;">
        <i class="fas fa-barcode" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#10b981;font-size:14px;pointer-events:none;"></i>
        <input id="grn-bc-input"
          class="inp"
          style="padding-left:34px;font-size:13px;font-weight:600;border-color:rgba(16,185,129,.3);background:rgba(16,185,129,.05);"
          placeholder="⚡ Scan or type barcode → auto-select product"
          oninput="grnBarcodeInput(this.value)"
          onkeydown="grnBarcodeKey(event)"
          autocomplete="off"
        />
      </div>
      <div id="grn-bc-status" style="font-size:11px;color:#475569;white-space:nowrap;min-width:100px;text-align:right;"></div>`;

        // Insert before the search/product row
        const searchDiv = addSection.querySelector('div[style*="display:flex;gap:8px"]');
        if (searchDiv) {
            addSection.insertBefore(row, searchDiv);
        } else {
            addSection.insertBefore(row, addSection.firstChild.nextSibling);
        }

        // Auto-focus the barcode input
        setTimeout(() => {
            const inp = document.getElementById('grn-bc-input');
            if (inp) inp.focus();
        }, 100);
    }

    // Barcode input handler — debounced
    let _grnBcTimer = null;
    window.grnBarcodeInput = function (val) {
        clearTimeout(_grnBcTimer);
        const status = document.getElementById('grn-bc-status');
        if (!val || val.trim().length < 2) {
            if (status) status.textContent = '';
            return;
        }
        if (status) status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching…';
        _grnBcTimer = setTimeout(async () => {
            await grnFindByBarcode(val.trim());
        }, 300);
    };

    // Enter key = immediate search
    window.grnBarcodeKey = async function (e) {
        if (e.key === 'Enter') {
            clearTimeout(_grnBcTimer);
            const val = (e.target.value || '').trim();
            if (val) await grnFindByBarcode(val);
        }
    };

    async function grnFindByBarcode(bc) {
        const status = document.getElementById('grn-bc-status');
        const ps = await db.products.toArray();

        // Exact barcode match first
        let found = ps.find(p => (p.barcode || '').toLowerCase() === bc.toLowerCase());

        // Partial match if no exact
        if (!found) {
            const matches = ps.filter(p =>
                (p.barcode || '').toLowerCase().includes(bc.toLowerCase()) ||
                p.name.toLowerCase().includes(bc.toLowerCase())
            );
            if (matches.length === 1) found = matches[0];
            else if (matches.length > 1) {
                // Show dropdown of matches
                if (status) status.innerHTML = `<span style="color:#f59e0b;">${matches.length} matches</span>`;
                showGrnBcDropdown(matches, bc);
                return;
            }
        }

        if (found) {
            selectGrnProduct(found);
            if (status) status.innerHTML = `<span style="color:#10b981;"><i class="fas fa-check-circle"></i> ${esc(found.name)}</span>`;
            // Clear barcode input after short delay
            setTimeout(() => {
                const inp = document.getElementById('grn-bc-input');
                if (inp) { inp.value = ''; inp.focus(); }
                if (status) status.textContent = '';
            }, 1500);
        } else {
            if (status) status.innerHTML = `<span style="color:#f87171;"><i class="fas fa-xmark-circle"></i> Not found</span>`;
            // Offer to create new product with this barcode
            showGrnNewProductOffer(bc);
        }
    }

    function selectGrnProduct(p) {
        // Set the product dropdown
        const sel = document.getElementById('grn-prod');
        if (sel) {
            // Check if option exists
            const opt = Array.from(sel.options).find(o => parseInt(o.value) === p.id);
            if (opt) {
                sel.value = p.id;
            } else {
                // Add option dynamically
                const o = document.createElement('option');
                o.value = p.id;
                o.textContent = p.name + ' (Stock: ' + p.stock + ')';
                sel.appendChild(o);
                sel.value = p.id;
            }
        }

        // Flash the search field to show match
        const searchInp = document.getElementById('grn-search');
        if (searchInp) {
            searchInp.value = p.name;
            searchInp.style.borderColor = '#10b981';
            setTimeout(() => { searchInp.style.borderColor = ''; }, 1500);
        }

        // Focus on qty
        setTimeout(() => {
            const qtyInp = document.getElementById('grn-qty');
            if (qtyInp) { qtyInp.select(); qtyInp.focus(); }
        }, 100);

        if (typeof toast === 'function') toast('✓ ' + p.name + ' selected', 'success');
    }

    // Dropdown for multiple matches
    function showGrnBcDropdown(prods, query) {
        let drop = document.getElementById('grn-bc-drop');
        if (!drop) {
            drop = document.createElement('div');
            drop.id = 'grn-bc-drop';
            drop.style.cssText = 'position:absolute;z-index:9999;background:#0d1829;border:1.5px solid rgba(16,185,129,.3);border-radius:10px;max-height:200px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,.5);min-width:280px;';
            const row = document.getElementById('grn-barcode-row');
            if (row) { row.style.position = 'relative'; row.appendChild(drop); }
            else { document.body.appendChild(drop); }
        }
        drop.innerHTML = prods.map(p =>
            `<div onclick="selectGrnProduct(window._grnBcProds.find(x=>x.id===${p.id}));document.getElementById('grn-bc-drop').remove();"
          style="padding:9px 12px;font-size:12px;cursor:pointer;border-bottom:1px solid rgba(99,179,237,.07);color:#e2e8f0;"
          onmouseover="this.style.background='rgba(16,185,129,.1)'" onmouseout="this.style.background=''">
          <b style="color:#34d399;">${esc(p.name)}</b>
          <span style="color:#475569;margin-left:8px;font-size:11px;">${p.barcode ? '[' + p.barcode + ']' : 'No barcode'}</span>
          <span style="float:right;font-size:11px;color:#334155;">Stock: ${p.stock}</span>
        </div>`
        ).join('');
        drop.style.display = 'block';
        window._grnBcProds = prods;
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', function closeDrop(e) {
                if (!drop.contains(e.target)) { drop.remove(); document.removeEventListener('click', closeDrop); }
            });
        }, 100);
    }

    // Offer to create a new product with this barcode
    function showGrnNewProductOffer(barcode) {
        if (!confirm('Barcode "' + barcode + '" not found.\n\nCreate new product with this barcode?')) return;
        const name = prompt('Product name:');
        if (!name) return;
        const sell = parseFloat(prompt('Selling price (Rs.):') || '0');
        const buy = parseFloat(prompt('Buying price (Rs.):') || '0');
        const cat = prompt('Category:') || 'General';
        db.products.add({
            name, barcode, category: cat,
            buyingPrice: buy, sellingPrice: sell,
            stock: 0, lowStockThreshold: 5,
        }).then(async id => {
            const p = await db.products.get(id);
            if (p) {
                if (window.allProds) window.allProds.push(p);
                // Refresh GRN prod dropdown
                if (typeof grnSearch === 'function') await grnSearch();
                selectGrnProduct(p);
                if (typeof toast === 'function') toast('New product created & selected!', 'success');
            }
        });
    }

    /* ═══════════════════════════════════════════════════
       2. AUTO-GENERATE BARCODE for products without one
    ═══════════════════════════════════════════════════ */

    // When GRN modal opens, show which products have no barcode
    // And add a "Generate" button next to grn-prod dropdown
    const _origOpenGrn2 = window.openGrnModal;
    window.openGrnModal = async function () {
        if (_origOpenGrn2) await _origOpenGrn2();
        setTimeout(addGrnBarcodeGenerateBtn, 300);
    };

    function addGrnBarcodeGenerateBtn() {
        if (document.getElementById('grn-bc-gen-btn')) return;
        const prodSel = document.getElementById('grn-prod');
        if (!prodSel) return;

        const btn = document.createElement('button');
        btn.id = 'grn-bc-gen-btn';
        btn.type = 'button';
        btn.title = 'Generate / View barcode for selected product';
        btn.style.cssText = 'height:38px;padding:0 10px;border-radius:9px;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.25);color:#818cf8;cursor:pointer;font-size:12px;flex-shrink:0;display:flex;align-items:center;gap:5px;white-space:nowrap;';
        btn.innerHTML = '<i class="fas fa-barcode"></i> Barcode';
        btn.onclick = async function () {
            const pid = parseInt(document.getElementById('grn-prod')?.value);
            if (!pid) { if (typeof toast === 'function') toast('Select a product first!', 'warning'); return; }
            if (typeof openBarcodeModal === 'function') openBarcodeModal(pid);
        };

        // Insert after the product dropdown
        prodSel.parentNode.insertBefore(btn, prodSel.nextSibling);
    }

    /* ═══════════════════════════════════════════════════
       3. BARCODE MODAL — scan existing barcode to load
    ═══════════════════════════════════════════════════ */

    // Patch the barcode modal to add a "scan to load" input at top
    const _origOpenBcModal = window.openBarcodeModal;
    window.openBarcodeModal = async function (productId) {
        if (_origOpenBcModal) await _origOpenBcModal(productId);
        setTimeout(injectBcModalScanInput, 200);
    };

    function injectBcModalScanInput() {
        const modal = document.getElementById('barcode-modal');
        if (!modal || document.getElementById('bm-scan-input')) return;

        const scanRow = document.createElement('div');
        scanRow.style.cssText = 'margin-bottom:10px;';
        scanRow.innerHTML = `
      <label class="lbl" style="color:#10b981;"><i class="fas fa-barcode" style="margin-right:5px;"></i>Scan / Type barcode to load product</label>
      <div style="position:relative;">
        <i class="fas fa-qrcode" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#6366f1;font-size:13px;pointer-events:none;"></i>
        <input id="bm-scan-input"
          class="inp"
          style="padding-left:34px;"
          placeholder="Scan barcode or type barcode number…"
          oninput="bmScanLookup(this.value)"
          onkeydown="if(event.key==='Enter')bmScanLookup(this.value,true)"
          autocomplete="off"
        />
      </div>
      <div id="bm-scan-status" style="font-size:11px;color:#475569;margin-top:4px;"></div>`;

        // Find the mbox content area
        const mbox = modal.querySelector('.mbox');
        if (!mbox) return;
        // Insert after the title row
        const titleRow = mbox.querySelector('div[style*="justify-content:space-between"]');
        if (titleRow) {
            titleRow.parentNode.insertBefore(scanRow, titleRow.nextSibling);
        } else {
            mbox.insertBefore(scanRow, mbox.firstChild.nextSibling);
        }
    }

    let _bmTimer = null;
    window.bmScanLookup = async function (val, immediate) {
        clearTimeout(_bmTimer);
        const status = document.getElementById('bm-scan-status');
        if (!val || val.trim().length < 2) {
            if (status) status.textContent = '';
            return;
        }
        const delay = immediate ? 0 : 400;
        _bmTimer = setTimeout(async () => {
            const ps = await db.products.toArray();
            const found = ps.find(p => (p.barcode || '').toLowerCase() === val.trim().toLowerCase());
            if (found) {
                // Load this product in the barcode modal
                const sel = document.getElementById('bc-prod-sel');
                if (sel) sel.value = found.id;
                const valInp = document.getElementById('bc-value');
                if (valInp) valInp.value = found.barcode || ('PM' + String(found.id).padStart(6, '0'));
                const nameInp = document.getElementById('bc-prod-name');
                if (nameInp) nameInp.value = found.name;
                const priceInp = document.getElementById('bc-price');
                if (priceInp) priceInp.value = found.sellingPrice || '';
                if (typeof generateBarcodePreview === 'function') generateBarcodePreview();
                if (status) status.innerHTML = `<span style="color:#10b981;"><i class="fas fa-check-circle"></i> Loaded: ${esc(found.name)}</span>`;
                // Clear scan input
                const scanInp = document.getElementById('bm-scan-input');
                if (scanInp) scanInp.value = '';
            } else {
                // Not found — pre-fill the barcode value field so user can assign it
                const valInp = document.getElementById('bc-value');
                if (valInp) valInp.value = val.trim();
                if (typeof generateBarcodePreview === 'function') generateBarcodePreview();
                if (status) status.innerHTML = `<span style="color:#f59e0b;"><i class="fas fa-info-circle"></i> New barcode — select a product to assign it</span>`;
            }
        }, delay);
    };

    /* ═══════════════════════════════════════════════════
       4. AUTO-GENERATE BARCODE for products that have none
          Shown when opening barcode modal for a product
    ═══════════════════════════════════════════════════ */

    // Override bc-value input: if it's empty after loading, auto-generate
    const _origGenPreview = window.generateBarcodePreview;
    window.generateBarcodePreview = function () {
        const valInp = document.getElementById('bc-value');
        const selInp = document.getElementById('bc-prod-sel');

        // Auto-generate if empty and product is selected
        if (valInp && selInp && !valInp.value.trim() && selInp.value) {
            const pid = parseInt(selInp.value);
            if (pid) valInp.value = 'PM' + String(pid).padStart(6, '0');
        }

        if (_origGenPreview) _origGenPreview();
    };

    /* ─── UTILS ─── */
    function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    console.log('[grn-barcode] GRN barcode scan & auto-generate loaded.');
})();
