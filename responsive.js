/* responsive.js — SuperMart POS v3 — Auto Screen Fit
   Scales the entire UI to fit any monitor size automatically.
   Design reference: 1440 x 900 px
*/
(function () {

    const DESIGN_W = 1440;
    const DESIGN_H = 900;
    const MIN_ZOOM = 0.55;
    const MAX_ZOOM = 1.20;

    function applyZoom() {
        const sw = window.innerWidth;
        const sh = window.innerHeight;

        const zx = sw / DESIGN_W;
        const zy = sh / DESIGN_H;

        // Use the smaller scale so everything fits in both dimensions
        let scale = Math.min(zx, zy);
        scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale));

        // Apply to <html> so everything scales including px-fixed elements
        document.documentElement.style.zoom = scale;

        // Compensate height so page still fills viewport (zoom shrinks the effective height)
        document.documentElement.style.height = (100 / scale) + 'vh';
        document.body.style.height = '100%';

        // Store current zoom for debugging
        window._currentZoom = scale;
        // console.log('[responsive] zoom:', scale.toFixed(3), '| screen:', sw, 'x', sh);
    }

    // Apply immediately and on every resize
    applyZoom();
    window.addEventListener('resize', applyZoom);

    // Also add a small floating zoom control
    function addZoomControl() {
        if (document.getElementById('zoom-ctrl')) return;
        const ctrl = document.createElement('div');
        ctrl.id = 'zoom-ctrl';
        ctrl.style.cssText = [
            'position:fixed',
            'bottom:16px',
            'left:228px',
            'z-index:8000',
            'display:flex',
            'align-items:center',
            'gap:6px',
            'background:rgba(13,24,41,.92)',
            'border:1px solid rgba(99,179,237,.15)',
            'border-radius:10px',
            'padding:5px 10px',
            'backdrop-filter:blur(8px)',
            'box-shadow:0 4px 16px rgba(0,0,0,.4)',
        ].join(';');

        ctrl.innerHTML = `
      <span style="font-size:11px;color:#475569;font-weight:600;">🔍</span>
      <button id="zm-out" title="Zoom Out" style="width:22px;height:22px;border-radius:6px;background:rgba(255,255,255,.06);border:1px solid rgba(99,179,237,.12);color:#94a3b8;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;line-height:1;">−</button>
      <span id="zm-label" style="font-size:11px;color:#64748b;font-weight:700;min-width:34px;text-align:center;">100%</span>
      <button id="zm-in" title="Zoom In" style="width:22px;height:22px;border-radius:6px;background:rgba(255,255,255,.06);border:1px solid rgba(99,179,237,.12);color:#94a3b8;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;line-height:1;">+</button>
      <button id="zm-reset" title="Auto Fit" style="width:22px;height:22px;border-radius:6px;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.25);color:#818cf8;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;" title="Auto-fit">⟳</button>
    `;
        document.body.appendChild(ctrl);

        let manualZoom = null;

        function updateLabel() {
            const z = manualZoom || window._currentZoom || 1;
            document.getElementById('zm-label').textContent = Math.round(z * 100) + '%';
        }

        document.getElementById('zm-out').onclick = function () {
            manualZoom = Math.max(0.4, ((manualZoom || window._currentZoom) - 0.05));
            document.documentElement.style.zoom = manualZoom;
            document.documentElement.style.height = (100 / manualZoom) + 'vh';
            updateLabel();
        };

        document.getElementById('zm-in').onclick = function () {
            manualZoom = Math.min(1.5, ((manualZoom || window._currentZoom) + 0.05));
            document.documentElement.style.zoom = manualZoom;
            document.documentElement.style.height = (100 / manualZoom) + 'vh';
            updateLabel();
        };

        document.getElementById('zm-reset').onclick = function () {
            manualZoom = null;
            applyZoom();
            updateLabel();
        };

        // Update label on resize too
        window.addEventListener('resize', updateLabel);
        updateLabel();
    }

    // Add zoom control after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addZoomControl);
    } else {
        addZoomControl();
    }

    // Make body not overflow during zoom
    const style = document.createElement('style');
    style.textContent = `
    html {
      overflow: hidden;
    }
    body {
      overflow: hidden;
      min-height: 100vh;
    }
    /* Ensure all pages fill available space */
    #app-wrap {
      width: 100% !important;
    }
    /* Smooth resize transition */
    #app-wrap, #sidebar, #topbar, #page-wrap {
      transition: none !important;
    }
    /* Scrollable areas stay scrollable */
    #page-wrap {
      overflow-y: auto !important;
    }
    /* Hide zoom control for printing */
    @media print {
      #zoom-ctrl { display: none !important; }
    }
  `;
    document.head.appendChild(style);

})();
