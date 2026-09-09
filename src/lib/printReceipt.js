/**
 * printReceipt.js
 * High-precision thermal receipt printing with dynamic page sizing and adjustable settings.
 *
 * @param {string} elementId - ID of the receipt DOM element (default "receipt-to-print")
 * @param {string|object} options - Paper width ("58mm" | "80mm" | "a4") or full configuration object
 */

export function printReceiptElement(elementId = "receipt-to-print", options = {}) {
  const el = document.getElementById(elementId)
  if (!el) {
    console.error(`[printReceipt] Element #${elementId} not found`)
    alert("Could not find receipt to print. Please try again.")
    return
  }

  // Support legacy string argument or full options object
  const config = typeof options === "string" ? { pageWidth: options } : (options || {})
  const rawWidth = (config.pageWidth || "58mm").trim().toLowerCase()
  const isA4 = rawWidth === "a4" || rawWidth === "full"
  const pageWidth = isA4 ? "210mm" : (rawWidth === "80mm" ? "80mm" : (rawWidth.endsWith("mm") ? rawWidth : "58mm"))
  const scale = Number(config.scale) || 1
  const fontSize = Number(config.fontSize) || (pageWidth === "80mm" ? 11.5 : (isA4 ? 13 : 10))
  const density = config.density || "normal" // "tight" | "normal" | "relaxed"
  const highContrast = config.highContrast !== false
  const showShopDetails = config.showShopDetails !== false
  const showCustomer = config.showCustomer !== false
  const showTax = config.showTax !== false
  const showFooter = config.showFooter !== false

  // Clone element to manipulate without affecting original
  const clone = el.cloneNode(true)

  // Apply visibility toggles
  if (!showShopDetails) {
    const addr = clone.querySelector(".receipt-shop-address")
    const phone = clone.querySelector(".receipt-shop-phone")
    if (addr) addr.remove()
    if (phone) phone.remove()
  }

  if (!showCustomer) {
    const cust = clone.querySelector(".receipt-customer-line")
    if (cust) cust.remove()
  }

  if (!showTax) {
    clone.querySelectorAll(".receipt-total-row").forEach(row => {
      if (row.textContent.toLowerCase().includes("tax") || row.textContent.toLowerCase().includes("gst")) {
        row.remove()
      }
    })
  }

  if (!showFooter) {
    const footer = clone.querySelector(".receipt-footer")
    if (footer) footer.remove()
  }

  // Measure content height (at 96 DPI: 1px = 0.264583 mm)
  const scrollH = el.scrollHeight || el.offsetHeight || 420
  const estimatedHeightMm = isA4 
    ? 297 
    : Math.max(70, Math.ceil(scrollH * 0.264583 * scale) + 14)

  // Valid W3C CSS Paged Media `@page` size declaration:
  // For thermal, explicitly declaring `<width> <height>` (e.g. `58mm 165mm`)
  // forces Chrome / Edge print preview to render an exact thermal roll preview rather than A4!
  const pageCssSize = isA4 ? "A4 portrait" : `${pageWidth} ${estimatedHeightMm}mm`
  const paperLabel = isA4 ? "A4 Standard" : `${pageWidth} Thermal Roll`

  clone.style.margin = "0 auto"
  clone.style.width = "100%"
  clone.style.maxWidth = isA4 ? "180mm" : pageWidth
  clone.style.boxSizing = "border-box"

  const receiptHTML = clone.outerHTML

  // Use full available screen for popup
  const availW = window.screen.availWidth || 1200
  const availH = window.screen.availHeight || 800

  const printWindow = window.open(
    "",
    "SlipzoThermalReceipt",
    `width=${availW},height=${availH},left=0,top=0,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no`
  )

  if (!printWindow) {
    alert("Popup blocked! Please allow popups for localhost to enable thermal printing.")
    return
  }

  try {
    printWindow.moveTo(0, 0)
    printWindow.resizeTo(availW, availH)
  } catch (_) { /* browser restricted */ }

  const lineHeight = density === "tight" ? 1.25 : (density === "relaxed" ? 1.55 : 1.4)
  const itemPadding = density === "tight" ? "1px 0" : (density === "relaxed" ? "3px 0" : "2px 0")

  printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Receipt (${paperLabel}) – Slipzo</title>
  <style>
    /* ===== RESET ===== */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* ===== SCREEN VIEW ===== */
    html {
      background: #0f172a;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 20px 10px 40px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* Screen top toolbar */
    .screen-control-bar {
      width: 100%;
      max-width: 520px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 12px 16px;
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      color: #f8fafc;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
    }

    .screen-control-bar .bar-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .screen-control-bar .paper-pill {
      background: #0ea5e9;
      color: white;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .screen-control-bar .print-trigger-btn {
      background: #10b981;
      color: #ffffff;
      border: none;
      padding: 6px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }

    .screen-control-bar .print-trigger-btn:hover {
      background: #059669;
      transform: translateY(-1px);
    }

    .screen-control-bar .bar-tips {
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.4;
      border-top: 1px solid #334155;
      padding-top: 8px;
    }

    .screen-control-bar .bar-tips strong {
      color: #38bdf8;
    }

    /* Receipt container on screen */
    .screen-receipt-wrapper {
      background: #ffffff;
      width: ${isA4 ? "210mm" : pageWidth};
      max-width: 100%;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }

    body {
      background: #ffffff;
      color: #000000;
      font-family: 'Courier New', Courier, monospace;
      font-size: ${fontSize}px;
      line-height: ${lineHeight};
      width: 100%;
      margin: 0 auto;
      padding: ${isA4 ? "12mm 15mm" : "3mm 2mm 8mm 2mm"};
      box-sizing: border-box;
      transform: scale(${scale});
      transform-origin: top center;
    }

    /* ===== THERMAL RECEIPT STYLING ===== */
    .receipt-shop {
      text-align: center;
      padding-bottom: 4px;
      border-bottom: 1.5px dashed #000000;
      margin-bottom: 4px;
    }

    .receipt-logo {
      display: none;
    }

    .receipt-shop-name {
      font-size: ${isA4 ? "20px" : (pageWidth === "80mm" ? "17px" : "15px")};
      font-weight: 900;
      letter-spacing: 0.3px;
      color: #000000;
      margin-bottom: 2px;
      text-transform: uppercase;
    }

    .receipt-shop p,
    .receipt-shop-address,
    .receipt-shop-phone {
      font-size: ${isA4 ? "12px" : (pageWidth === "80mm" ? "10.5px" : "9.5px")};
      color: #111111;
      display: block;
      text-align: center;
      margin: 1px 0;
      font-weight: 600;
    }

    svg { display: none !important; }

    .receipt-meta {
      display: flex;
      justify-content: space-between;
      font-size: ${isA4 ? "11px" : (pageWidth === "80mm" ? "10px" : "9px")};
      font-weight: 700;
      color: #000000;
      padding: 3px 0;
      border-bottom: 1px dashed #000000;
      margin-bottom: 4px;
    }

    .receipt-customer-line {
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      font-weight: 700;
      color: #000000;
      padding: 2px 0;
      margin-bottom: 2px;
    }

    .receipt-divider {
      border: none;
      border-top: 1.5px dashed #000000;
      margin: 4px 0;
    }

    .receipt-items {
      margin-bottom: 4px;
    }

    .receipt-items-header {
      display: grid !important;
      grid-template-columns: 2fr 0.5fr 1fr 1fr;
      gap: 2px;
      font-size: ${isA4 ? "12px" : (pageWidth === "80mm" ? "10.5px" : "9.5px")};
      font-weight: 900;
      padding: 2px 0;
      border-bottom: 1.5px solid #000000;
      margin-bottom: 2px;
    }

    .receipt-item-row {
      display: grid !important;
      grid-template-columns: 2fr 0.5fr 1fr 1fr;
      gap: 2px;
      font-size: ${isA4 ? "11.5px" : (pageWidth === "80mm" ? "10px" : "9px")};
      padding: ${itemPadding};
      font-weight: ${highContrast ? "700" : "600"};
      color: #000000;
    }

    .receipt-item-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: normal;
      word-break: break-word;
      color: #000000;
    }

    .receipt-item-qty {
      text-align: center;
      color: #000000;
    }

    .receipt-item-rate,
    .receipt-item-amount {
      text-align: right;
      color: #000000;
    }

    .receipt-empty-items {
      text-align: center;
      padding: 8px 0;
      color: #000000;
      font-size: 10px;
    }

    .receipt-totals {
      padding-top: 3px;
    }

    .receipt-total-row {
      display: flex;
      justify-content: space-between;
      font-size: ${isA4 ? "12px" : (pageWidth === "80mm" ? "10.5px" : "9.5px")};
      padding: 1.5px 0;
      font-weight: 700;
      color: #000000;
    }

    .receipt-grand-total {
      display: flex;
      justify-content: space-between;
      font-size: ${isA4 ? "16px" : (pageWidth === "80mm" ? "14px" : "12.5px")};
      font-weight: 900;
      padding: 4px 0 3px;
      margin-top: 3px;
      border-top: 2px solid #000000;
      color: #000000;
    }

    .receipt-footer {
      text-align: center;
      padding-top: 4px;
      border-top: 1.5px dashed #000000;
      margin-top: 4px;
    }

    .receipt-payment {
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      font-weight: 800;
      color: #000000;
      margin-bottom: 2px;
    }

    .receipt-thanks {
      font-size: 9px;
      font-weight: 600;
      color: #000000;
      margin-top: 2px;
    }

    /* ===== EXACT PRINT MEDIA ===== */
    @media print {
      .screen-control-bar {
        display: none !important;
      }

      @page {
        size: ${pageCssSize};
        margin: ${isA4 ? "8mm" : "0mm"};
      }

      html, body {
        background: #ffffff !important;
        display: block !important;
        padding: 0 !important;
        margin: 0 auto !important;
        width: 100% !important;
        min-height: auto !important;
        box-shadow: none !important;
        border: none !important;
      }

      .screen-receipt-wrapper {
        background: #ffffff !important;
        width: 100% !important;
        max-width: 100% !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        margin: 0 auto !important;
        padding: 0 !important;
      }

      body {
        width: ${isA4 ? "100%" : pageWidth} !important;
        max-width: ${isA4 ? "100%" : pageWidth} !important;
        padding: ${isA4 ? "0" : "1mm 1.5mm 3mm 1.5mm"} !important;
        transform: scale(${scale});
        transform-origin: top center;
      }
    }
  </style>
</head>
<body>
  <div class="screen-control-bar">
    <div class="bar-top">
      <div>
        <span class="paper-pill">${paperLabel}</span>
        <span style="font-size: 11px; margin-left: 8px; color: #94a3b8;">Scale: ${Math.round(scale * 100)}% · Font: ${fontSize}px</span>
      </div>
      <button class="print-trigger-btn" onclick="window.print()">
        🖨️ Print Now
      </button>
    </div>
    <div class="bar-tips">
      <strong>Thermal Tip:</strong> In the browser print dialog, select your thermal printer, set <strong>Margins</strong> to <strong>None</strong>, and verify <strong>Paper size</strong> matches ${paperLabel}.
    </div>
  </div>

  <div class="screen-receipt-wrapper">
    ${receiptHTML}
  </div>

  <script>
    // Automatically trigger print dialog
    window.addEventListener('load', function () {
      setTimeout(function () {
        window.print();
      }, 400);
    });

    // Close window after printing if desired
    window.addEventListener('afterprint', function () {
      setTimeout(function () {
        window.close();
      }, 800);
    });
  </script>
</body>
</html>`)

  printWindow.document.close()
  printWindow.focus()
}