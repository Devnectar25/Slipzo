import Swal from "sweetalert2"

export function printReceiptElement(elementId = "receipt-to-print", options = {}) {
  const el = document.getElementById(elementId) || 
             document.querySelector(".realistic-thermal-receipt") || 
             document.querySelector(".receipt-preview-content")
             
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
  const is58 = rawWidth === "58mm" || rawWidth === "58"
  const rollMm = isA4 ? 210 : (is55 ? 55 : (is58 ? 58 : 80))

  const showShopDetails = config.showShopDetails !== false
  const showCustomer = config.showCustomer !== false
  const showTax = config.showTax !== false
  const showFooter = config.showFooter !== false

  // Clone element to manipulate without affecting original UI
  const clone = el.cloneNode(true)

  // Remove elements requested to be hidden by print settings
  if (!showShopDetails) {
    const addr = clone.querySelector(".receipt-shop-address")
    const phone = clone.querySelectorAll(".receipt-shop-phone")
    if (addr) addr.remove()
    phone.forEach(p => p.remove())
  }

  if (!showCustomer) {
    const cust = clone.querySelector(".receipt-customer-line")
    if (cust) cust.remove()
  }

  // Always remove tax / GST elements from printed receipts
  clone.querySelectorAll(".receipt-total-row, .classic-gst-box, .mini-tax-breakdown, .mini-cgst-sgst, .elite-tax-banner, .elite-tax-analysis-table").forEach(row => {
    if (row.textContent.toLowerCase().includes("tax") || row.textContent.toLowerCase().includes("gst") || row.classList.contains("classic-gst-box") || row.classList.contains("mini-tax-breakdown") || row.classList.contains("mini-cgst-sgst") || row.classList.contains("elite-tax-analysis-table")) {
      row.remove()
    }
  })

  if (!showFooter) {
    const footer = clone.querySelector(".receipt-footer")
    if (footer) footer.remove()
  }

  // Remove decorative paper tear edges for clean thermal output
  clone.querySelectorAll(".receipt-paper-top, .receipt-paper-bottom").forEach(n => n.remove())

  // Clean wrapper styles on clone
  clone.removeAttribute("id")
  clone.style.display = "block"
  clone.style.margin = "0 auto"
  clone.style.width = isA4 ? "100%" : `${rollMm}mm`
  clone.style.maxWidth = isA4 ? "100%" : `${rollMm}mm`
  clone.style.boxShadow = "none"
  clone.style.border = "none"
  clone.style.borderRadius = "0"
  clone.style.background = "#ffffff"

  const realisticEl = clone.querySelector(".realistic-thermal-receipt") || (clone.classList.contains("realistic-thermal-receipt") ? clone : null)
  if (realisticEl) {
    realisticEl.style.margin = "0 auto"
    realisticEl.style.width = isA4 ? "100%" : `${rollMm}mm`
    realisticEl.style.maxWidth = isA4 ? "100%" : `${rollMm}mm`
    realisticEl.style.boxShadow = "none"
    realisticEl.style.border = "none"
    realisticEl.style.borderRadius = "0"
    realisticEl.style.background = "#ffffff"
  }

  // Pre-measure element rendered bounding height in CSS pixels for accurate @page sizing
  const measureDiv = document.createElement("div")
  measureDiv.style.position = "fixed"
  measureDiv.style.left = "-9999px"
  measureDiv.style.top = "0"
  measureDiv.style.width = isA4 ? "210mm" : `${rollMm}mm`
  measureDiv.style.maxWidth = isA4 ? "210mm" : `${rollMm}mm`
  measureDiv.style.visibility = "hidden"
  measureDiv.style.zIndex = "-9999"
  measureDiv.style.margin = "0"
  measureDiv.style.padding = "0"
  measureDiv.style.boxSizing = "border-box"
  measureDiv.style.background = "#ffffff"

  const cloneForMeasure = clone.cloneNode(true)
  cloneForMeasure.style.width = isA4 ? "100%" : `${rollMm}mm`
  cloneForMeasure.style.maxWidth = isA4 ? "100%" : `${rollMm}mm`
  cloneForMeasure.style.display = "block"
  measureDiv.appendChild(cloneForMeasure)
  document.body.appendChild(measureDiv)

  const measuredPx = Math.ceil(measureDiv.getBoundingClientRect().height || measureDiv.offsetHeight || 380)
  document.body.removeChild(measureDiv)

  // Exact physical millimeter height: 96 CSS px = 1 inch = 25.4mm + 2mm safe bottom buffer
  const initialHeightMm = isA4 ? 297 : Math.max(45, Math.ceil(measuredPx * (25.4 / 96)) + 2)

  // Collect all existing stylesheets from main document
  let stylesHtml = ""
  document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    stylesHtml += link.outerHTML + "\n"
  })
  document.querySelectorAll("style").forEach(style => {
    if (style.id !== "slipzo-dynamic-print-page") {
      stylesHtml += style.outerHTML + "\n"
    }
  })

  // Remove existing print iframe if present
  let printFrame = document.getElementById("slipzo-isolated-print-frame")
  if (printFrame && printFrame.parentNode) {
    printFrame.parentNode.removeChild(printFrame)
  }

  // Create clean isolated print iframe
  printFrame = document.createElement("iframe")
  printFrame.id = "slipzo-isolated-print-frame"
  printFrame.setAttribute("aria-hidden", "true")
  printFrame.style.position = "fixed"
  printFrame.style.left = "-9999px"
  printFrame.style.top = "0"
  printFrame.style.width = isA4 ? "210mm" : `${rollMm}mm`
  printFrame.style.height = `${initialHeightMm}mm`
  printFrame.style.border = "0"
  printFrame.style.visibility = "hidden"
  printFrame.style.zIndex = "-9999"
  document.body.appendChild(printFrame)

  const iframeDoc = printFrame.contentDocument || printFrame.contentWindow.document
  iframeDoc.open()
  iframeDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt</title>
  ${stylesHtml}
  <style id="slipzo-thermal-print-styles">
    @charset "utf-8";

    *, *::before, *::after {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    @page {
      size: ${isA4 ? "A4 portrait" : `${rollMm}mm ${initialHeightMm}mm`};
      margin: 0mm;
    }

    @page :first {
      margin: 0mm;
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: ${isA4 ? "100%" : `${rollMm}mm`} !important;
      max-width: ${isA4 ? "100%" : `${rollMm}mm`} !important;
      height: ${isA4 ? "auto" : `${initialHeightMm}mm`} !important;
      max-height: ${isA4 ? "auto" : `${initialHeightMm}mm`} !important;
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, monospace !important;
      -webkit-font-smoothing: antialiased;
      overflow: hidden !important;
    }

    .slipzo-isolated-receipt-container {
      width: ${isA4 ? "100%" : `${rollMm}mm`} !important;
      max-width: ${isA4 ? "100%" : `${rollMm}mm`} !important;
      height: ${isA4 ? "auto" : `${initialHeightMm}mm`} !important;
      margin: 0 auto !important;
      padding: 0 !important;
      background: #ffffff !important;
    }

    .receipt-preview-content,
    .realistic-thermal-receipt {
      width: ${isA4 ? "100%" : `${rollMm}mm`} !important;
      max-width: ${isA4 ? "100%" : `${rollMm}mm`} !important;
      margin: 0 auto !important;
      padding: 0 !important;
      border: none !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      background: #ffffff !important;
      overflow: visible !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .receipt-paper-top,
    .receipt-paper-bottom {
      display: none !important;
    }

    .realistic-thermal-receipt .receipt-content {
      width: 100% !important;
      box-sizing: border-box !important;
      padding: ${rollMm === 55 ? "2mm 1.5mm 3.5mm 1.5mm" : "3mm 2.5mm 4.5mm 2.5mm"} !important;
    }

    @media print {
      @page {
        size: ${isA4 ? "A4 portrait" : `${rollMm}mm ${initialHeightMm}mm`};
        margin: 0mm;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: ${isA4 ? "100%" : `${rollMm}mm`} !important;
        max-width: ${isA4 ? "100%" : `${rollMm}mm`} !important;
        height: ${isA4 ? "auto" : `${initialHeightMm}mm`} !important;
        max-height: ${isA4 ? "auto" : `${initialHeightMm}mm`} !important;
        background: #ffffff !important;
        overflow: hidden !important;
      }
      .slipzo-isolated-receipt-container {
        width: ${isA4 ? "100%" : `${rollMm}mm`} !important;
        max-width: ${isA4 ? "100%" : `${rollMm}mm`} !important;
        height: ${isA4 ? "auto" : `${initialHeightMm}mm`} !important;
        margin: 0 !important;
        padding: 0 !important;
      }
    }
  </style>
</head>
<body>
  <div class="slipzo-isolated-receipt-container">
    ${clone.outerHTML}
  </div>
</body>
</html>`)
  iframeDoc.close()

  const executePrint = () => {
    try {
      printFrame.contentWindow.focus()
      printFrame.contentWindow.print()
    } catch (err) {
      console.error("[printReceipt] iframe print execution failed:", err)
    }
  }

  // Allow web fonts & layout in the isolated frame to settle before opening print dialog
  if (iframeDoc.fonts && iframeDoc.fonts.ready) {
    iframeDoc.fonts.ready.then(() => {
      setTimeout(executePrint, 120)
    }).catch(() => {
      setTimeout(executePrint, 180)
    })
  } else {
    setTimeout(executePrint, 220)
  }
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
      confirmButtonColor: "#0ea5e9"
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
    const config = typeof options === "string" ? { pageWidth: options } : (options || {})
    const rawWidth = (config.pageWidth || "80mm").trim().toLowerCase()
    const isA4 = rawWidth === "a4" || rawWidth === "full"
    const is55 = rawWidth === "55mm" || rawWidth === "55"
    const is58 = rawWidth === "58mm" || rawWidth === "58"
    const rollMm = isA4 ? 210 : (is55 ? 55 : (is58 ? 58 : 80))
    const filename = `Slipzo_Receipt_${Date.now()}.pdf`

    const clone = el.cloneNode(true)
    clone.removeAttribute("id")
    clone.style.margin = "0 auto"
    clone.style.width = isA4 ? "100%" : `${rollMm}mm`
    clone.style.maxWidth = isA4 ? "100%" : `${rollMm}mm`
    clone.style.background = "#ffffff"
    clone.style.boxShadow = "none"
    clone.style.border = "none"
    clone.style.borderRadius = "0"

    const wrapper = document.createElement("div")
    wrapper.style.padding = isA4 ? "8mm 6mm" : "0"
    wrapper.style.margin = "0 auto"
    wrapper.style.background = "#ffffff"
    wrapper.style.boxSizing = "border-box"
    wrapper.style.width = isA4 ? "210mm" : `${rollMm}mm`
    wrapper.appendChild(clone)

    // Mount container to DOM for accurate font and CSS measurement during PDF capture
    const measureWrap = document.createElement("div")
    measureWrap.style.position = "fixed"
    measureWrap.style.left = "-9999px"
    measureWrap.style.top = "0"
    measureWrap.style.width = isA4 ? "210mm" : `${rollMm}mm`
    measureWrap.style.background = "#ffffff"
    measureWrap.style.zIndex = "-9999"
    measureWrap.appendChild(wrapper)
    document.body.appendChild(measureWrap)

    const measuredPx = Math.ceil(wrapper.getBoundingClientRect().height || wrapper.offsetHeight)
    const calculatedHeightMm = isA4 ? 297 : Math.max(65, Math.ceil(measuredPx * (25.4 / 96)) + 4)

    if (html2pdf) {
      const pdfOpt = {
        margin: isA4 ? [8, 8, 8, 8] : [0, 0, 0, 0],
        filename: filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2.5, useCORS: true, logging: false, scrollY: 0 },
        jsPDF: {
          unit: "mm",
          format: isA4 ? "a4" : [rollMm, calculatedHeightMm],
          orientation: "portrait"
        }
      }
      try {
        await html2pdf().set(pdfOpt).from(wrapper).save()
        Swal.fire({
          title: "PDF Saved! 📄",
          text: `Receipt (${isA4 ? "A4" : rollMm + "mm"}) has been downloaded successfully.`,
          icon: "success",
          timer: 2000,
          showConfirmButton: false
        })
      } finally {
        if (measureWrap && measureWrap.parentNode) {
          measureWrap.parentNode.removeChild(measureWrap)
        }
      }
    } else {
      if (measureWrap && measureWrap.parentNode) {
        measureWrap.parentNode.removeChild(measureWrap)
      }
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
    denyButtonColor: "#0ea5e9",
    cancelButtonColor: "#64748b"
  }).then((result) => {
    if (result.isConfirmed) {
      printReceiptElement(elementId, options)
      if (onChoiceDone) onChoiceDone("print")
    } else if (result.isDenied) {
      saveReceiptAsPdf(elementId, options)
      if (onChoiceDone) onChoiceDone("pdf")
    }
  })
}