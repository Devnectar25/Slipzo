import Swal from "sweetalert2"

export function printReceiptElement(elementId = "receipt-to-print", options = {}) {
  const el = document.getElementById(elementId)
  if (!el) {
    console.error(`[printReceipt] Element #${elementId} not found`)
    Swal.fire({
      title: "Element Not Found",
      text: "Could not find receipt to print. Please try again.",
      icon: "error",
      confirmButtonColor: "#F66016"
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
  const fontSize = Number(config.fontSize) || (pageWidth === "80mm" ? 13.5 : (isA4 ? 15 : (pageWidth === "55mm" ? 12 : 12.5)))
  const density = config.density || "normal" // "tight" | "normal" | "relaxed"
  const highContrast = config.highContrast !== false
  const showShopDetails = config.showShopDetails !== false
  const showCustomer = config.showCustomer !== false
  const showTax = config.showTax !== false
  const showFooter = config.showFooter !== false

  // Balanced, highly legible, crisp bold font sizes for thermal printing (80mm & 55mm/58mm)
  const shopTitleSize = isA4 ? "22px" : (pageWidth === "80mm" ? "21px" : (pageWidth === "55mm" ? "17.5px" : "18px"))
  const shopSubSize = isA4 ? "14.5px" : (pageWidth === "80mm" ? "13.5px" : (pageWidth === "55mm" ? "12px" : "12.5px"))
  const metaSize = isA4 ? "14px" : (pageWidth === "80mm" ? "13.5px" : (pageWidth === "55mm" ? "12px" : "12.5px"))
  const itemHeaderSize = isA4 ? "14.5px" : (pageWidth === "80mm" ? "13.5px" : (pageWidth === "55mm" ? "12px" : "12.5px"))
  const itemRowSize = isA4 ? "14.5px" : (pageWidth === "80mm" ? "13.5px" : (pageWidth === "55mm" ? "12px" : "12.5px"))
  const totalRowSize = isA4 ? "14.5px" : (pageWidth === "80mm" ? "13.5px" : (pageWidth === "55mm" ? "12px" : "12.5px"))
  const grandTotalSize = isA4 ? "20px" : (pageWidth === "80mm" ? "19px" : (pageWidth === "55mm" ? "16.5px" : "17px"))
  const footerSize = isA4 ? "13.5px" : (pageWidth === "80mm" ? "12.5px" : (pageWidth === "55mm" ? "11.5px" : "12px"))
  const gridColumns = isA4
    ? "2.5fr 0.6fr 1fr 1fr"
    : (pageWidth === "80mm"
      ? "2.2fr 0.5fr 1fr 1fr"
      : (pageWidth === "55mm"
        ? "1.15fr 0.35fr 1.05fr 1.15fr"
        : "1.3fr 0.4fr 1.05fr 1.1fr"))

  const lineHeight = density === "tight" ? 1.4 : (density === "relaxed" ? 1.75 : 1.55)
  const itemPadding = density === "tight" ? "3px 0" : (density === "relaxed" ? "6px 0" : "4.5px 0")

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

  clone.style.margin = "0"
  clone.style.width = "100%"
  clone.style.maxWidth = isA4 ? "180mm" : pageWidth
  clone.style.height = "auto"
  clone.style.boxSizing = "border-box"

  // Base CSS for thermal receipt (used both for off-screen measurement and in print window)
  const receiptCSS = `
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .receipt-preview-content,
    #receipt-to-print {
      padding: 0 !important;
      margin: 0 !important;
      border: none !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, monospace;
      font-size: ${fontSize}px;
      line-height: ${lineHeight};
      letter-spacing: normal;
    }

    .receipt-paper-top,
    .receipt-paper-bottom {
      display: none !important;
    }

    .realistic-thermal-receipt {
      width: 100% !important;
      max-width: 100% !important;
      box-shadow: none !important;
      border: none !important;
      border-radius: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    .realistic-thermal-receipt .receipt-content {
      padding: 0 !important;
      margin: 0 !important;
    }

    .receipt-shop {
      text-align: center;
      padding-bottom: 8px;
      border-bottom: 1.5px dashed #000000;
      margin-bottom: 8px;
    }

    .receipt-logo {
      display: none !important;
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
      padding: 4px 0;
      margin-top: 4px;
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
      padding-top: 4px;
      padding-bottom: 0;
      border-top: 1.5px dashed #000000;
      margin-top: 4px;
      margin-bottom: 0;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .receipt-payment {
      display: flex;
      justify-content: space-between;
      font-size: ${footerSize};
      font-weight: 800;
      color: #000000;
      margin-bottom: 2px;
    }

    .receipt-thanks {
      font-size: ${footerSize};
      font-weight: 700;
      color: #000000;
      margin-top: 2px;
      margin-bottom: 0;
      word-break: break-word;
    }

    .receipt-tax-badge,
    .receipt-boutique-badge {
      text-align: center;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 1px;
      padding: 3px 6px;
      border: 1.5px solid #000000;
      margin-bottom: 6px;
      text-transform: uppercase;
    }

    .receipt-pro-extras {
      margin: 6px 0;
      text-align: center;
    }

    .receipt-qr-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      margin-bottom: 4px;
    }

    .receipt-qr-box {
      border: 1.5px solid #000000;
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }

    .receipt-qr-wrapper span {
      font-size: 10px;
      font-weight: 600;
    }

    .receipt-loyalty-tag {
      font-size: 11px;
      font-weight: 800;
      padding: 2px 0;
    }

    .receipt-signatory-wrapper {
      margin-top: 16px;
      margin-bottom: 8px;
      text-align: right;
    }

    .signatory-line {
      width: 120px;
      margin-left: auto;
      border-top: 1px solid #000000;
      margin-bottom: 4px;
    }

    .receipt-signatory-wrapper span {
      font-size: 10px;
      font-weight: 700;
    }

    /* Structural Template Print Styles */
    .classic-crest {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1.5px solid #000000;
      margin: 0 auto 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 14px;
    }
    .classic-meta-grid {
      display: grid !important;
      grid-template-columns: 1fr 1fr;
      gap: 3px;
      border: 1px solid #000000;
      padding: 4px;
      margin: 4px 0;
      font-size: ${metaSize};
    }
    .classic-meta-grid div { display: flex; justify-content: space-between; }
    .classic-divider-double { border-top: 2.5px double #000000; margin: 4px 0; }
    .classic-items-table { border: 1px solid #000000; margin: 4px 0; }
    .classic-gst-box { border: 1px dashed #000000; padding: 4px; margin: 4px 0; }
    .classic-gst-box .gst-line { display: flex; justify-content: space-between; }
    .classic-grand-banner {
      border: 2px solid #000000;
      display: flex;
      justify-content: space-between;
      padding: 4px 6px;
      font-weight: 900;
      margin: 4px 0;
    }
    .receipt-barcode-wrap { text-align: center; margin: 6px 0 2px; }
    .receipt-barcode-bars { font-size: 14px; letter-spacing: 2px; font-weight: 900; }
    .receipt-barcode-num { font-size: 10px; }
    .classic-policy-footer { font-size: 9px; text-align: center; border-top: 1px solid #000000; padding-top: 4px; margin-top: 4px; }

    /* Minimal */
    .minimal-dot-logo { display: none !important; }
    .minimal-meta-clean { display: flex; justify-content: space-between; font-size: ${metaSize}; margin: 4px 0; border-bottom: 1px solid #000000; }
    .minimal-item-entry { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 0.5px solid #ccc; }
    .minimal-total-hero { display: flex; justify-content: space-between; border-top: 2px solid #000000; padding-top: 4px; margin-top: 4px; font-weight: 900; }
    .minimal-paid-stamp { border: 1px solid #000000; padding: 2px 6px; font-weight: 800; display: inline-block; margin: 4px auto; }

    /* Pro */
    .pro-store-ribbon { border: 1.5px solid #000000; padding: 4px; text-align: center; margin-bottom: 4px; }
    .pro-meta-bar { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #000000; padding: 3px; font-size: ${metaSize}; margin-bottom: 4px; }
    .pro-meta-bar div { display: flex; justify-content: space-between; }
    .pro-savings-banner { border: 1.5px dashed #000000; padding: 4px; text-align: center; font-weight: 800; margin: 4px 0; }
    .pro-loyalty-widget { border: 1px solid #000000; padding: 4px; margin: 4px 0; }
    .pro-loyalty-header { display: flex; justify-content: space-between; font-weight: 800; }
    .pro-upi-card { border: 1px solid #000000; padding: 4px; text-align: center; margin: 4px 0; }
    .pro-upi-badge { border: 1px solid #000000; display: inline-block; padding: 1px 4px; font-weight: 800; font-size: 10px; margin-bottom: 2px; }

    /* Eco */
    .eco-sawtooth-top, .eco-sawtooth-bottom { border-top: 1px dashed #000000; margin: 3px 0; }
    .eco-header-box { border: 1px dashed #000000; text-align: center; padding: 3px 0; margin-bottom: 4px; }
    .eco-token-line { display: flex; justify-content: space-between; border-bottom: 1px dotted #000000; padding: 2px 0; font-weight: 800; }
    .eco-item-row-mono { display: flex; justify-content: space-between; padding: 1px 0; }
    .eco-total-box { border: 2px solid #000000; display: flex; justify-content: space-between; padding: 4px; font-weight: 900; margin: 4px 0; }
    .eco-paper-saver-badge { font-weight: 800; font-size: 10px; text-align: center; margin-top: 4px; }

    /* Modern */
    .modern-boutique-pill { border: 1px solid #000000; padding: 1px 6px; font-weight: 800; display: inline-block; margin-bottom: 4px; }
    .modern-client-card { border: 1px solid #000000; padding: 3px; display: flex; justify-content: space-between; margin: 4px 0; }
    .modern-item-card { border-bottom: 1px solid #000000; padding: 3px 0; display: flex; justify-content: space-between; }
    .modern-social-card { border-top: 1px solid #000000; padding-top: 4px; margin-top: 4px; text-align: center; }

    /* Elite */
    .elite-tax-banner { border: 1.5px solid #000000; padding: 3px 6px; font-weight: 900; display: flex; justify-content: space-between; margin-bottom: 4px; }
    .elite-parties-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 4px; }
    .elite-party-card { border: 1px solid #000000; padding: 4px; font-size: 10px; }
    .elite-party-card .party-role { font-weight: 800; text-transform: uppercase; font-size: 9px; margin-bottom: 2px; }
    .elite-tax-analysis-table { width: 100%; border-collapse: collapse; margin: 4px 0; border: 1px solid #000000; font-size: 10px; }
    .elite-tax-analysis-table th, .elite-tax-analysis-table td { border: 1px solid #000000; padding: 2px 4px; text-align: right; }
    .elite-tax-analysis-table th:first-child, .elite-tax-analysis-table td:first-child { text-align: left; }
    .elite-amount-words { border-left: 2px solid #000000; padding-left: 4px; margin: 4px 0; font-size: 10px; }
    .elite-bank-block { border: 1px dashed #000000; padding: 3px; margin: 4px 0; font-size: 10px; }
    .elite-signatory-stamp { text-align: right; margin-top: 8px; }
    .elite-sign-rule { width: 100px; margin-left: auto; border-top: 1px solid #000000; margin-bottom: 2px; }
  `

  // Accurately measure the receipt height before opening print window
  let targetHeightMm = isA4 ? 297 : 120

  if (!isA4) {
    try {
      const measureDiv = document.createElement("div")
      measureDiv.id = "slipzo-print-measure"
      measureDiv.style.position = "fixed"
      measureDiv.style.left = "-9999px"
      measureDiv.style.top = "0"
      measureDiv.style.width = pageWidth
      measureDiv.style.maxWidth = pageWidth
      measureDiv.style.minWidth = pageWidth
      measureDiv.style.visibility = "hidden"
      measureDiv.style.pointerEvents = "none"
      measureDiv.style.zIndex = "-9999"
      measureDiv.style.margin = "0"
      measureDiv.style.padding = "1mm 1.5mm 0 1.5mm"
      measureDiv.style.boxSizing = "border-box"
      measureDiv.style.background = "#ffffff"

      const measureStyle = document.createElement("style")
      measureStyle.textContent = receiptCSS
      measureDiv.appendChild(measureStyle)

      const cloneForMeasure = clone.cloneNode(true)
      cloneForMeasure.style.width = "100%"
      cloneForMeasure.style.maxWidth = "100%"
      cloneForMeasure.style.margin = "0"
      cloneForMeasure.style.padding = "0"
      cloneForMeasure.style.border = "none"
      cloneForMeasure.style.boxShadow = "none"
      cloneForMeasure.style.background = "#ffffff"
      measureDiv.appendChild(cloneForMeasure)

      document.body.appendChild(measureDiv)

      // Measure rendered bounding height in CSS pixels
      const measuredPx = Math.ceil(measureDiv.getBoundingClientRect().height || measureDiv.offsetHeight)
      document.body.removeChild(measureDiv)

      if (measuredPx > 40) {
        // Standard CSS unit: 1 inch = 96 CSS pixels = 25.4mm
        // Add 2.5mm safe buffer so thermal cutter cuts cleanly after thank you message
        targetHeightMm = Math.ceil(measuredPx * (25.4 / 96)) + 2.5
      }
    } catch (err) {
      console.warn("[printReceipt] Height measurement fallback:", err)
      targetHeightMm = 140
    }
  }

  const paperLabel = isA4 ? "A4 Standard" : `${pageWidth} Thermal Roll`
  const receiptHTML = clone.outerHTML

  const pageCssRule = isA4
    ? "size: A4 portrait; margin: 8mm !important;"
    : `size: ${pageWidth} ${targetHeightMm}mm !important; margin: 0 !important;`

  // Clean up any existing print iframe from prior prints
  const existingFrame = document.getElementById("slipzo-silent-print-frame")
  if (existingFrame && existingFrame.parentNode) {
    existingFrame.parentNode.removeChild(existingFrame)
  }

  // Create an invisible offscreen iframe for direct printing without window popups or about:blank flashes
  const iframe = document.createElement("iframe")
  iframe.id = "slipzo-silent-print-frame"
  iframe.setAttribute("aria-hidden", "true")
  iframe.setAttribute("tabindex", "-1")
  iframe.style.position = "fixed"
  iframe.style.right = "0"
  iframe.style.bottom = "0"
  iframe.style.width = "0"
  iframe.style.height = "0"
  iframe.style.border = "none"
  iframe.style.visibility = "hidden"
  iframe.style.zIndex = "-9999"

  document.body.appendChild(iframe)

  const printHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=${isA4 ? "210mm" : pageWidth}, initial-scale=1.0" />
  <title>Receipt (${paperLabel}) – Slipzo</title>
  <style>
    ${receiptCSS}

    /* Page size matching measured content height exactly — ends after thank you message */
    @page {
      ${pageCssRule}
    }

    html, body {
      background: #ffffff !important;
      color: #000000 !important;
      margin: 0 !important;
      padding: 0 !important;
      width: ${isA4 ? "210mm" : pageWidth} !important;
      max-width: ${isA4 ? "210mm" : pageWidth} !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, monospace;
      font-size: ${fontSize}px;
      line-height: ${lineHeight};
    }

    @media print {
      html, body {
        width: ${isA4 ? "210mm" : pageWidth} !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
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
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    }
  </style>
</head>
<body>
  ${receiptHTML}
</body>
</html>`

  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) {
    window.print()
    return
  }

  doc.open()
  doc.write(printHtml)
  doc.close()

  const executePrint = () => {
    try {
      const cw = iframe.contentWindow
      if (cw) {
        cw.focus()
        cw.print()
      } else {
        window.print()
      }
    } catch (err) {
      console.warn("[printReceiptElement] iframe print error, falling back to window.print:", err)
      window.print()
    } finally {
      setTimeout(() => {
        try {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe)
          }
        } catch (_) {}
      }, 1500)
    }
  }

  // Trigger print directly without intermediate window or about:blank popup
  setTimeout(executePrint, 60)
}

const loadHtml2Pdf = () => {
  return new Promise((resolve) => {
    if (window.html2pdf) return resolve(window.html2pdf)
    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"
    script.onload = () => resolve(window.html2pdf)
    script.onerror = () => resolve(null)
    document.body.appendChild(script)
  })
}

export async function saveReceiptAsPdf(elementId = "receipt-to-print", options = {}) {
  const el = document.getElementById(elementId)
  if (!el) {
    console.error(`[saveReceiptAsPdf] Element #${elementId} not found`)
    Swal.fire({
      title: "Element Not Found",
      text: "Could not find receipt to export as PDF.",
      icon: "error",
      confirmButtonColor: "#F66016"
    })
    return
  }

  Swal.fire({
    title: "Generating PDF...",
    text: "Preparing your receipt PDF for download.",
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading()
    }
  })

  try {
    const html2pdf = await loadHtml2Pdf()
    const clone = el.cloneNode(true)
    
    clone.style.margin = "0 auto"
    clone.style.background = "#ffffff"
    clone.style.color = "#000000"
    clone.style.boxShadow = "none"

    const wrapper = document.createElement("div")
    wrapper.style.padding = "15px"
    wrapper.style.background = "#ffffff"
    wrapper.appendChild(clone)

    const config = typeof options === "string" ? { pageWidth: options } : (options || {})
    const rawWidth = (config.pageWidth || "80mm").trim().toLowerCase()
    const isA4 = rawWidth === "a4" || rawWidth === "full"
    const filename = `Slipzo_Receipt_${Date.now()}.pdf`

    if (html2pdf) {
      const pdfOpt = {
        margin: [5, 5, 5, 5],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: isA4 ? 'a4' : [80, 200], orientation: 'portrait' }
      }
      await html2pdf().set(pdfOpt).from(wrapper).save()
      Swal.fire({
        title: "PDF Saved! 📄",
        text: "Receipt PDF has been saved successfully.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false
      })
    } else {
      Swal.close()
      printReceiptElement(elementId, options)
    }
  } catch (err) {
    console.error("[saveReceiptAsPdf] error:", err)
    Swal.close()
    printReceiptElement(elementId, options)
  }
}

export function promptPrintOrPdfChoice(elementId = "receipt-to-print", options = {}, onChoiceDone) {
  Swal.fire({
    title: "Choose Action 📄🖨️",
    text: "Select how you would like to output this receipt:",
    icon: "question",
    showCancelButton: true,
    showDenyButton: true,
    confirmButtonText: "🖨️ Print Receipt",
    denyButtonText: "📄 Save as PDF",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#10b981",
    denyButtonColor: "#F66016",
    cancelButtonColor: "#64748b"
  }).then((result) => {
    if (result.isConfirmed) {
      printReceiptElement(elementId, options)
      if (onChoiceDone) onChoiceDone('print')
    } else if (result.isDenied) {
      saveReceiptAsPdf(elementId, options)
      if (onChoiceDone) onChoiceDone('pdf')
    }
  })
}