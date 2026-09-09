// Traditional-style thermal receipt printing (ESC/POS-friendly browsers path).
// Uses a hidden iframe instead of window.open so popup blockers never block it,
// works identically for USB / WiFi / Bluetooth receipt printers via the OS driver,
// forces 80mm portrait paper and eliminates blank trailing pages.

const BASE_THERMAL_CSS = `
    @page { size: 80mm auto; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    /* 72mm keeps ALL text inside the printable area of 80mm rolls (real printable
       area is ~72-76mm depending on model). Content wider than that gets its edge
       characters physically clipped by the printer — e.g. RTL labels on the right
       side like "المجموع النهائي". */
    html, body { width: 72mm; background: #fff !important; margin: 0 !important; padding: 0 !important; border: 0 !important; }
    body {
        font-family: Tahoma, Arial, 'Segoe UI', sans-serif;
        direction: rtl;
        color: #000;
        font-size: 12px;
        line-height: 1.35;
        overflow: visible;
        height: auto;
        min-height: 0;
    }
    img, svg { max-width: 100%; }
    .receipt { width: 72mm; padding: 3mm; }
    .header { text-align: center; margin-bottom: 3mm; padding-bottom: 2mm; border-bottom: 1px dashed #000; page-break-inside: avoid; break-inside: avoid; }
    .header .meta { font-size: 10px; color: #000; text-align: center; }
    .header .meta span { display: block; padding: 0.4mm 0; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    th { padding: 1.5mm 0.5mm; text-align: center; font-size: 10px; color: #000; border-bottom: 1px solid #000; font-weight: bold; }
    th:first-child { text-align: right; }
    th:last-child { text-align: right; }
    td { padding: 1.2mm 0.5mm; text-align: center; vertical-align: top; border-bottom: 1px solid #ccc; color: #000; }
    td:first-child { text-align: right; font-weight: bold; }
    td:last-child { text-align: right; font-weight: bold; }
    .item-notes { font-size: 9px; display: block; color: #333; font-weight: normal; }
    .totals { margin-top: 1.5mm; padding-top: 1.5mm; border-top: 1px solid #000; page-break-inside: avoid; break-inside: avoid; }
    .totals .row { display: flex; justify-content: space-between; padding: 0.8mm 0; font-size: 11px; color: #000; }
    .totals .row span:last-child { font-weight: bold; }
    .totals .grand { font-size: 14px; font-weight: bold; padding-top: 1.5mm; border-top: 1px solid #000; margin-top: 1mm; }
    .footer { text-align: center; margin-top: 3mm; padding-top: 1.5mm; border-top: 1px dashed #000; font-size: 9px; color: #000; page-break-before: avoid; page-break-after: avoid; }
    .footer .brand { font-weight: bold; font-size: 11px; letter-spacing: 1px; margin-bottom: 0.5mm; color: #000; }
    .footer p { color: #000; }
    .barcode { text-align: center; margin: 1.5mm 0; font-family: 'Courier New', monospace; font-size: 13px; letter-spacing: 1px; color: #000; font-weight: bold; page-break-before: avoid; }
    /* Critical: cap the document to exactly its content height — any extra height
       becomes trailing blank pages on continuous-roll thermal printers. */
    @media print {
        html, body { width: 72mm; height: auto !important; min-height: 0 !important; overflow: visible !important; display: block !important; position: static !important; }
        body > *:not(.receipt) { display: none !important; }
        .receipt { margin: 0 auto; float: none !important; position: static !important; page-break-after: auto; }
    }
`;

/**
 * Prints a thermal receipt through a hidden iframe.
 * @param {Object} opts
 * @param {string} opts.bodyHtml   Inner HTML of the receipt (the .receipt div content wrapper included by caller).
 * @param {string} [opts.title]    Document title.
 * @param {string} [opts.css]      Extra component-specific CSS appended after the base thermal CSS.
 * @param {string} [opts.extraHeadHtml] Extra <head> content (e.g. external scripts such as JsBarcode).
 * @param {number} [opts.printDelay] Delay before triggering print in ms (allow scripts/fonts to settle).
 */
export function printThermalReceipt({ bodyHtml, title = 'فاتورة', css = '', extraHeadHtml = '', printDelay = 350 }) {
    const safeBodyHtml = String(bodyHtml || '').trim();

    // Wintec fix: never use visibility:hidden or 0x0 iframe.
    // Wintec Windows driver + Chrome treat a 0-size / visibility:hidden iframe as
    // "empty page" and silently discard the job → "لا يحدث أي شيء".
    // Off-screen but layouted iframe is required so the print engine can measure @page 80mm.
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    // 302px ≈ 80mm at 96dpi — gives the engine a real printable width
    iframe.style.cssText = 'position:absolute;left:-9999px;top:0;width:302px;min-height:200px;border:0;overflow:visible;pointer-events:none;';
    // Some Wintec drivers also reject background pages if iframe has no title/name
    iframe.title = title;
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(
        `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8">` +
        `<meta name="viewport" content="width=device-width, initial-scale=1">` +
        `<title>${title}</title>${extraHeadHtml}` +
        `<style>${BASE_THERMAL_CSS}${css}</style>` +
        `</head><body>${safeBodyHtml}</body></html>`
    );
    doc.close();

    let removed = false;
    let printed = false; // hard guard: never send the job twice (double jobs = blank rolls)
    const cleanup = () => {
        if (removed) return;
        removed = true;
        try { iframe.contentWindow.removeEventListener('afterprint', onAfter); } catch (e) { /* noop */ }
        try { window.removeEventListener('afterprint', onAfter); } catch (e) { /* noop */ }
        // Wintec raw queue often never fires afterprint → keep a fallback timeout
        setTimeout(() => { try { iframe.remove(); } catch (e) { /* noop */ } }, 60000);
        // Immediate removal also breaks Wintec spooler that reads DOM async — delay a bit
        setTimeout(() => { try { if (iframe.parentNode) iframe.remove(); } catch (e) { /* noop */ } }, 1200);
    };
    const onAfter = () => cleanup();

    const fallbackWindowPrint = () => {
        try {
            const win = window.open('', '_blank');
            if (!win) { cleanup(); return false; }
            win.document.open();
            // Use same CSS + no external script dependency for Wintec offline stores
            win.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>${title}</title><style>${BASE_THERMAL_CSS}${css}</style>${extraHeadHtml}</head><body>${safeBodyHtml}<script>setTimeout(function(){ window.focus(); window.print(); }, 400);<\/script></body></html>`);
            win.document.close();
            win.focus();
            // If popup blocked focus may fail — still schedule close
            setTimeout(() => { try { win.close(); } catch (e) {} }, 60000);
            return true;
        } catch (e2) { return false; }
    };

    const doPrint = () => {
        if (printed) return;
        printed = true;
        const win = iframe.contentWindow;
        try {
            // Ensure fonts are ready before measuring — Wintec driver captures page
            // at print() call time, not async.
            const doNativePrint = () => {
                try {
                    win.focus();
                    // Listen on both window and iframe — afterprint source varies by driver
                    try { win.addEventListener('afterprint', onAfter); } catch (e) {}
                    try { window.addEventListener('afterprint', onAfter); } catch (e) {}
                    // Double rAF ensures layout is flushed before spooler grabs the bitmap
                    win.requestAnimationFrame(() => {
                        win.requestAnimationFrame(() => {
                            const result = win.print();
                            // Fallback if print() is silently ignored (Wintec case)
                            // Chrome returns undefined, so we detect via timeout
                            setTimeout(() => {
                                if (!removed) {
                                    // If afterprint never fired after 1s, still cleanup but keep iframe longer
                                    // Do not auto-fallback to window.open here to avoid double dialogs
                                }
                            }, 1500);
                        });
                    });
                    // Safety: if afterprint never fires (Wintec raw queue), cleanup after timeout
                    setTimeout(() => { if (!removed) cleanup(); }, 4000);
                } catch (e) {
                    if (!fallbackWindowPrint()) cleanup();
                }
            };

            // Wait for fonts + external scripts (JsBarcode) — with timeout for offline Wintec stores
            const fontsReady = win.document.fonts ? win.document.fonts.ready.catch(() => {}) : Promise.resolve();
            let fontsTimedOut = false;
            const fontTimeout = new Promise(res => setTimeout(() => { fontsTimedOut = true; res(); }, Math.max(printDelay, 700)));
            Promise.race([fontsReady, fontTimeout]).then(() => {
                // Extra tick for external <script src="jsbarcode"> in extraHeadHtml
                const extraDelay = fontsTimedOut ? 0 : Math.min(printDelay, 600);
                setTimeout(doNativePrint, extraDelay);
            });
        } catch (e) {
            if (!fallbackWindowPrint()) cleanup();
        }
    };

    // Robust trigger: doc.write + close does not reliably fire iframe.onload in Chrome
    // especially with visibility tricks — use both readyState and load + timeout.
    // This is why Wintec "لا يحدث أي شيء": neither branch fired.
    let triggered = false;
    const triggerOnce = () => { if (!triggered) { triggered = true; doPrint(); } };

    try { if (doc.readyState === 'complete') setTimeout(triggerOnce, 80); } catch (e) {}
    iframe.onload = triggerOnce;
    // Absolute fallback timer — guarantees job is sent even if onload never fires
    setTimeout(triggerOnce, Math.max(printDelay + 100, 800));
}
