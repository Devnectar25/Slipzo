import Swal from "sweetalert2"

export function printReceiptElement(elementId = "receipt-to-print", options = {}) {
  const el = document.getElementById(elementId)
  if (!el) {
    console.error(`[printReceipt] Element #${elementId} not found`)
    Swal.fire({
      title: "Element Not Found",
      text: "Could not find receipt to print. Please try again.",
      icon: "error",
      confirmButtonColor: "#0ea5e9"
    })
    return
  }

  // Support legacy string argument or full options object
  const config = typeof options === "string" ? { pageWidth: options } : (options || {})
  const rawWidth = (config.pageWidth || "80mm").trim().toLowerCase()
  const isA4 = rawWidth === "a4" || rawWidth === "full"
  const is55 = rawWidth === "55mm" || rawWidth === "55"
  const is80 = rawWidth === "80mm" || rawWidth === "80"
  
  let pageWidth = "80mm"
  if (isA4) {
    pageWidth = "210mm"
  } else if (is80) {
    pageWidth = "80mm"
  } else if (is55) {
    pageWidth = "55mm"
  } else if (rawWidth === "58mm" || rawWidth === "58") {
    pageWidth = "58mm"
  } else if (rawWidth.endsWith("mm")) {
    pageWidth = rawWidth
  }

  const scale = Number(config.scale) || 1
  const fontSize = Number(config.fontSize) || (pageWidth === "80mm" ? 12 : (isA4 ? 14 : (pageWidth === "55mm" ? 10 : 11)))
  const density = config.density || "normal" // "tight" | "normal" | "relaxed"
  const highContrast = config.highContrast !== false
  const showShopDetails = config.showShopDetails !== false
  const showCustomer = config.showCustomer !== false
  const showTax = config.showTax !== false
  const showFooter = config.showFooter !== false

  // Balanced, highly legible font sizes for thermal printing
  const shopTitleSize = isA4 ? "20px" : (pageWidth === "80mm" ? "18px" : (pageWidth === "55mm" ? "14px" : "15px"))
  const shopSubSize = isA4 ? "13.5px" : (pageWidth === "80mm" ? "12px" : (pageWidth === "55mm" ? "10px" : "11px"))
  const metaSize = isA4 ? "13px" : (pageWidth === "80mm" ? "11.5px" : (pageWidth === "55mm" ? "9.5px" : "10.5px"))
  const itemHeaderSize = isA4 ? "13.5px" : (pageWidth === "80mm" ? "12px" : (pageWidth === "55mm" ? "10px" : "11px"))
  const itemRowSize = isA4 ? "13.5px" : (pageWidth === "80mm" ? "12px" : (pageWidth === "55mm" ? "10px" : "11px"))
  const totalRowSize = isA4 ? "13.5px" : (pageWidth === "80mm" ? "12px" : (pageWidth === "55mm" ? "10px" : "11px"))
  const grandTotalSize = isA4 ? "18px" : (pageWidth === "80mm" ? "16px" : (pageWidth === "55mm" ? "13.5px" : "14px"))
  const footerSize = isA4 ? "13px" : (pageWidth === "80mm" ? "11.5px" : (pageWidth === "55mm" ? "9.5px" : "10.5px"))
  const gridColumns = isA4 ? "2.5fr 0.6fr 1fr 1fr" : (pageWidth === "80mm" ? "2.2fr 0.5fr 1fr 1fr" : (pageWidth === "55mm" ? "1.8fr 0.5fr 0.85fr 0.95fr" : "2fr 0.5fr 0.9fr 1fr"))

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

  // Measure content height accurately (at 96 DPI: 1px = 0.264583 mm)
  const scrollH = Math.max(150, (el.scrollHeight || el.offsetHeight || 250) - 30)
  const estimatedHeightMm = isA4 
    ? 297 
    : Math.max(25, Math.ceil(scrollH * 0.264583 * scale) + 5)

  const pageCssSize = isA4 ? "A4 portrait" : `${pageWidth} auto`
  const paperLabel = isA4 ? "A4 Standard" : `${pageWidth} Thermal Roll`

  clone.style.margin = "0"
  clone.style.width = "100%"
  clone.style.maxWidth = isA4 ? "180mm" : pageWidth
  clone.style.height = "auto"
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
    Swal.fire({
      title: "Popup Blocked",
      text: "Please allow popups in your browser to enable thermal receipt printing.",
      icon: "warning",
      confirmButtonColor: "#0ea5e9"
    })
    return
  }

  try {
    printWindow.moveTo(0, 0)
    printWindow.resizeTo(availW, availH)
  } catch (_) { /* browser restricted */ }

  const lineHeight = density === "tight" ? 1.4 : (density === "relaxed" ? 1.75 : 1.55)
  const itemPadding = density === "tight" ? "3px 0" : (density === "relaxed" ? "6px 0" : "4.5px 0")

  printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=${isA4 ? "210mm" : pageWidth}, initial-scale=1.0" />
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

    /* ===== PAGE SIZE — thermal paper width with continuous length ===== */
    @page {
      ${isA4 ? "size: A4 portrait; margin: 8mm;" : `size: ${pageWidth} 297mm; margin: 0;`}
    }

    /* ===== SCREEN VIEW — html/body locked to thermal width, no wide centering ===== */
    html {
      background: #0f172a;
      width: ${isA4 ? "210mm" : pageWidth};
      max-width: 100%;
      margin: 0 auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    body {
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", Courier, monospace;
      font-size: ${fontSize}px;
      line-height: ${lineHeight};
      width: ${isA4 ? "210mm" : pageWidth};
      max-width: ${isA4 ? "210mm" : pageWidth};
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      letter-spacing: normal;
    }

    /* Screen top toolbar — shown on screen, hidden on print */
    .screen-control-bar {
      width: 100%;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 14px;
      padding: 14px 16px;
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      color: #f8fafc;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
    }

    .screen-control-bar *, .screen-control-bar button, .screen-control-bar span {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
    }

    .screen-control-bar .bar-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .screen-control-bar .bar-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }

    .screen-control-bar .paper-pill {
      background: #0ea5e9;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 6px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      display: inline-block;
    }

    .screen-control-bar .stats-pill {
      font-size: 11.5px;
      color: #94a3b8;
      font-weight: 500;
      margin-top: 2px;
    }

    .screen-control-bar .print-trigger-btn {
      background: #10b981;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 13.5px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
      box-shadow: 0 3px 10px rgba(16, 185, 129, 0.3);
      flex-shrink: 0;
    }

    .screen-control-bar .print-trigger-btn:hover {
      background: #059669;
      transform: translateY(-1px);
    }

    .screen-control-bar .bar-tips {
      font-size: 11.5px;
      color: #cbd5e1;
      line-height: 1.5;
      border-top: 1px solid #334155;
      padding-top: 10px;
    }

    .screen-control-bar .bar-tips strong {
      color: #38bdf8;
    }

    /* Receipt wrapper on screen */
    .screen-receipt-wrapper {
      background: #ffffff;
      width: 100%;
      max-width: 100%;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      border-radius: 4px;
      overflow: visible;
      position: relative;
      padding: ${isA4 ? "12mm 15mm" : "2mm 1mm 4mm 1mm"};
    }

    /* Override screen preview padding on cloned receipt element */
    .receipt-preview-content {
      padding: ${isA4 ? "0" : "1mm 0.5mm"} !important;
      margin: 0 !important;
      border: none !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
    }

    /* ===== THERMAL RECEIPT STYLING ===== */
    .receipt-shop {
      text-align: center;
      padding-bottom: 8px;
      border-bottom: 1.5px dashed #000000;
      margin-bottom: 8px;
    }

    .receipt-logo {
      display: none;
    }

    .receipt-shop-name {
      font-size: ${shopTitleSize};
      font-weight: 900;
      letter-spacing: 0.3px;
      color: #000000;
      margin-bottom: 4px;
      text-transform: uppercase;
      line-height: 1.25;
      word-break: break-word;
      overflow-wrap: break-word;
    }

    .receipt-shop p,
    .receipt-shop-address,
    .receipt-shop-phone {
      font-size: ${shopSubSize};
      color: #000000;
      display: block;
      text-align: center;
      margin: 2px 0;
      font-weight: 700;
      line-height: 1.3;
      word-break: break-word;
      overflow-wrap: break-word;
    }

    svg { display: none !important; }

    .receipt-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
      font-size: ${metaSize};
      font-weight: 700;
      color: #000000;
      padding: 5px 0;
      border-bottom: 1.5px dashed #000000;
      margin-bottom: 6px;
      word-break: break-word;
    }

    .receipt-meta .receipt-number,
    .receipt-meta .receipt-date,
    .receipt-number,
    .receipt-date {
      white-space: nowrap !important;
    }

    .receipt-customer-line {
      display: flex;
      justify-content: space-between;
      font-size: ${metaSize};
      font-weight: 700;
      color: #000000;
      padding: 4px 0;
      margin-bottom: 4px;
      word-break: break-word;
    }

    .receipt-divider {
      border: none;
      border-top: 1.5px dashed #000000;
      margin: 6px 0;
    }

    .receipt-items {
      margin-bottom: 6px;
      width: 100%;
    }

    .receipt-items-header {
      display: grid !important;
      grid-template-columns: ${gridColumns};
      gap: 3px;
      font-size: ${itemHeaderSize};
      font-weight: 900;
      padding: 4px 0;
      border-bottom: 1.5px solid #000000;
      margin-bottom: 4px;
      width: 100%;
      box-sizing: border-box;
    }

    .receipt-item-row {
      display: grid !important;
      grid-template-columns: ${gridColumns};
      gap: 3px;
      font-size: ${itemRowSize};
      padding: ${itemPadding};
      font-weight: ${highContrast ? "800" : "700"};
      color: #000000;
      width: 100%;
      box-sizing: border-box;
      align-items: start;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .receipt-item-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: normal;
      word-break: break-word;
      overflow-wrap: break-word;
      color: #000000;
    }

    .receipt-item-qty {
      text-align: center;
      white-space: nowrap !important;
      color: #000000;
    }

    .receipt-item-rate,
    .receipt-item-amount {
      text-align: right;
      white-space: nowrap !important;
      color: #000000;
    }

    .receipt-empty-items {
      text-align: center;
      padding: 12px 0;
      color: #000000;
      font-size: ${itemRowSize};
    }

    .receipt-totals {
      padding-top: 6px;
      width: 100%;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .receipt-total-row {
      display: flex;
      justify-content: space-between;
      font-size: ${totalRowSize};
      padding: 3px 0;
      font-weight: 700;
      color: #000000;
      word-break: break-word;
    }

    .receipt-total-row span:last-child {
      white-space: nowrap !important;
    }

    .receipt-grand-total {
      display: flex;
      justify-content: space-between;
      font-size: ${grandTotalSize};
      font-weight: 900;
      padding: 8px 0 6px;
      margin-top: 6px;
      border-top: 2.5px solid #000000;
      color: #000000;
      word-break: break-word;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .receipt-grand-total span:last-child {
      white-space: nowrap !important;
    }

    .receipt-footer {
      text-align: center;
      padding-top: 8px;
      border-top: 1.5px dashed #000000;
      margin-top: 8px;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .receipt-payment {
      display: flex;
      justify-content: space-between;
      font-size: ${footerSize};
      font-weight: 800;
      color: #000000;
      margin-bottom: 4px;
    }

    .receipt-thanks {
      font-size: ${footerSize};
      font-weight: 700;
      color: #000000;
      margin-top: 4px;
      word-break: break-word;
    }

    /* ===== PRINT MEDIA — overrides for clean thermal output ===== */
    @media print {
      /* Hide screen-only controls */
      .screen-control-bar {
        display: none !important;
      }

      /* Enforce @page thermal size with fallback */
      @page {
        ${isA4 
          ? "size: A4 portrait; margin: 8mm !important;" 
          : `size: ${pageWidth} 297mm !important; margin: 0 !important;`}
      }

      html {
        background: #ffffff !important;
        display: block !important;
        width: ${isA4 ? "100%" : pageWidth} !important;
        max-width: ${isA4 ? "100%" : pageWidth} !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
      }

      body {
        background: #ffffff !important;
        display: block !important;
        width: ${isA4 ? "100%" : pageWidth} !important;
        max-width: ${isA4 ? "100%" : pageWidth} !important;
        margin: 0 !important;
        padding: ${isA4 ? "0" : "0.5mm 0.5mm 1mm 0.5mm"} !important;
        height: auto !important;
        min-height: 0 !important;
        box-shadow: none !important;
        border: none !important;
        overflow: visible !important;
        transform: none !important;
      }

      .screen-receipt-wrapper {
        background: #ffffff !important;
        width: ${isA4 ? "100%" : pageWidth} !important;
        max-width: ${isA4 ? "100%" : pageWidth} !important;
        height: auto !important;
        min-height: 0 !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        page-break-inside: auto !important;
      }

      #receipt-to-print,
      .receipt-preview-content {
        background: #ffffff !important;
        width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        page-break-inside: auto !important;
      }
    }
  </style>
</head>
<body>
  <div class="screen-control-bar">
    <div class="bar-top">
      <div class="bar-info">
        <span class="paper-pill">${paperLabel}</span>
        <span class="stats-pill">Scale: ${Math.round(scale * 100)}% · Font: ${fontSize}px</span>
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
    // Auto-print after load — all page sizing is handled via inline CSS above
    window.addEventListener('load', function () {
      setTimeout(function () {
        window.print();
      }, 350);
    });

    // Close window after printing
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