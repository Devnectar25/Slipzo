import Swal from "sweetalert2"
import html2canvas from "html2canvas"

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

// Preload html2pdf library in background for instantaneous PDF downloads
if (typeof window !== "undefined") {
  setTimeout(() => {
    loadHtml2Pdf().catch(() => {})
  }, 500)
}

// Global beforeprint / afterprint listeners for keyboard Ctrl+P in the main window
if (typeof window !== "undefined") {
  window.addEventListener("beforeprint", () => {
    const el = document.getElementById("receipt-to-print") || 
               document.getElementById("receipt-print-area") || 
               document.querySelector(".receipt-print-area") || 
               document.querySelector(".realistic-thermal-receipt") || 
               document.querySelector(".receipt-preview-content")
    if (el) {
      let rollMm = 80
      if (el.classList.contains("format-55mm") || el.classList.contains("width-55mm") || el.closest(".format-55mm")) rollMm = 55
      else if (el.classList.contains("format-58mm") || el.classList.contains("width-58mm") || el.closest(".format-58mm")) rollMm = 58
      else if (el.classList.contains("format-a4") || el.closest(".format-a4")) rollMm = 210

      document.body.classList.add("slipzo-printing")
      if (rollMm === 210) document.body.classList.add("slipzo-print-a4")
      else if (rollMm <= 58) document.body.classList.add("slipzo-print-58mm")
      else document.body.classList.add("slipzo-print-80mm")

      let dynamicStyle = document.getElementById("slipzo-main-window-print-style")
      if (!dynamicStyle) {
        dynamicStyle = document.createElement("style")
        dynamicStyle.id = "slipzo-main-window-print-style"
        document.head.appendChild(dynamicStyle)
      }
      dynamicStyle.textContent = `
        @page {
          size: ${rollMm === 210 ? "A4 portrait" : `${rollMm}mm auto`} !important;
          margin: 0mm !important;
        }
        @page :first {
          margin: 0mm !important;
        }
      `
    }
  })

  window.addEventListener("afterprint", () => {
    document.body.classList.remove("slipzo-printing", "slipzo-print-55mm", "slipzo-print-58mm", "slipzo-print-80mm", "slipzo-print-a4")
    const dynamicStyle = document.getElementById("slipzo-main-window-print-style")
    if (dynamicStyle && dynamicStyle.parentNode) {
      dynamicStyle.parentNode.removeChild(dynamicStyle)
    }
  })
}

/**
 * Direct DOM thermal receipt printer via isolated iframe
 * Strictly avoids A4 centering, sets dynamic roll size, and preserves typography
 */
export function printReceiptDom(el, isA4, rollMm, config = {}) {
  const clone = el.cloneNode(true)
  clone.removeAttribute("id")
  clone.classList.remove("format-55mm", "format-58mm", "format-80mm", "format-a4")
  clone.classList.add(isA4 ? "format-a4" : (rollMm <= 58 ? "format-58mm" : "format-80mm"))
  clone.style.display = "block"
  clone.style.margin = "0"
  clone.style.width = isA4 ? "100%" : `${rollMm}mm`
  clone.style.maxWidth = isA4 ? "100%" : `${rollMm}mm`
  clone.style.boxShadow = "none"
  clone.style.border = "none"
  clone.style.borderRadius = "0"
  clone.style.background = "#ffffff"
  clone.style.padding = "0"

  if (config.fontSize) clone.style.fontSize = `${config.fontSize}px`
  if (config.highContrast) clone.style.filter = "contrast(1.15) brightness(0.98)"

  if (config.showShopDetails === false) {
    const addr = clone.querySelector(".receipt-shop-address")
    const phone = clone.querySelectorAll(".receipt-shop-phone")
    if (addr) addr.remove()
    phone.forEach(p => p.remove())
  }
  if (config.showCustomer === false) {
    const cust = clone.querySelector(".receipt-customer-line")
    if (cust) cust.remove()
  }
  if (config.showTax === false) {
    clone.querySelectorAll(".classic-gst-box, .mini-tax-breakdown, .mini-cgst-sgst, .elite-tax-banner, .elite-tax-analysis-table").forEach(row => row.remove())
  }
  if (config.showFooter === false) {
    const footer = clone.querySelector(".receipt-footer")
    if (footer) footer.remove()
  }

  // Remove decorative jaggy edges for physical printout
  const paperTops = clone.querySelectorAll(".receipt-paper-top, .receipt-paper-bottom")
  paperTops.forEach(pt => pt.remove())

  // Strip margins and centering from any cloned thermal receipt
  clone.querySelectorAll(".realistic-thermal-receipt").forEach(r => {
    r.style.margin = "0"
    r.style.width = "100%"
    r.style.maxWidth = "100%"
    r.style.boxShadow = "none"
    r.style.border = "none"
    r.style.borderRadius = "0"
  })

  let stylesHtml = ""
  document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    stylesHtml += link.outerHTML + "\n"
  })
  document.querySelectorAll("style").forEach(style => {
    if (style.id !== "slipzo-dynamic-print-page" && style.id !== "slipzo-main-window-print-style") {
      stylesHtml += style.outerHTML + "\n"
    }
  })

  let printFrame = document.getElementById("slipzo-isolated-print-frame")
  if (printFrame && printFrame.parentNode) {
    printFrame.parentNode.removeChild(printFrame)
  }

  printFrame = document.createElement("iframe")
  printFrame.id = "slipzo-isolated-print-frame"
  printFrame.setAttribute("aria-hidden", "true")
  printFrame.style.position = "fixed"
  printFrame.style.left = "0"
  printFrame.style.top = "0"
  printFrame.style.width = isA4 ? "210mm" : `${rollMm}mm`
  printFrame.style.height = "100%"
  printFrame.style.border = "0"
  printFrame.style.opacity = "0"
  printFrame.style.pointerEvents = "none"
  printFrame.style.zIndex = "-9999"
  document.body.appendChild(printFrame)

  const iframeDoc = printFrame.contentDocument || printFrame.contentWindow.document
  iframeDoc.open()
  iframeDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
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
      size: ${isA4 ? "A4 portrait" : `${rollMm}mm auto`} !important;
      margin: 0mm !important;
      padding: 0mm !important;
    }
    @page :first {
      margin: 0mm !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: ${isA4 ? "100%" : `${rollMm}mm`} !important;
      max-width: ${isA4 ? "100%" : `${rollMm}mm`} !important;
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
      background: #ffffff !important;
    }
    .slipzo-isolated-receipt-container {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      margin: 0 !important;
      padding: ${isA4 ? "8mm 6mm" : (rollMm <= 58 ? "1.5mm 2.5mm" : "2mm 3mm")} !important;
      width: ${isA4 ? "100%" : `${rollMm}mm`} !important;
      max-width: ${isA4 ? "100%" : `${rollMm}mm`} !important;
      background: #ffffff !important;
      border: none !important;
      box-shadow: none !important;
      box-sizing: border-box !important;
    }
    .receipt-preview-content,
    .realistic-thermal-receipt {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      border: none !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      background: #ffffff !important;
      height: auto !important;
      min-height: 0 !important;
    }
    .receipt-paper-top,
    .receipt-paper-bottom {
      display: none !important;
    }
    .receipt-item-row,
    .receipt-total-row,
    .receipt-grand-total,
    .receipt-payment,
    .receipt-shop,
    .receipt-meta,
    .minimal-meta-clean,
    .receipt-customer-line,
    .receipt-footer,
    .receipt-thanks,
    .receipt-qr-section {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    @media print {
      @page {
        size: ${isA4 ? "A4 portrait" : `${rollMm}mm auto`} !important;
        margin: 0mm !important;
        padding: 0mm !important;
      }
      @page :first {
        margin: 0mm !important;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: ${isA4 ? "100%" : `${rollMm}mm`} !important;
        max-width: ${isA4 ? "100%" : `${rollMm}mm`} !important;
        height: auto !important;
        min-height: 0 !important;
        background: #ffffff !important;
      }
      .slipzo-isolated-receipt-container {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        margin: 0 !important;
        padding: ${isA4 ? "8mm 6mm" : (rollMm <= 58 ? "1.5mm 2.5mm" : "2mm 3mm")} !important;
        width: ${isA4 ? "100%" : `${rollMm}mm`} !important;
        max-width: ${isA4 ? "100%" : `${rollMm}mm`} !important;
        border: none !important;
        box-shadow: none !important;
        box-sizing: border-box !important;
      }
      .receipt-preview-content,
      .realistic-thermal-receipt {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        border: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        background: #ffffff !important;
        height: auto !important;
        min-height: 0 !important;
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
      printFrame.contentWindow.onafterprint = () => {
        setTimeout(() => {
          if (printFrame && printFrame.parentNode) {
            printFrame.parentNode.removeChild(printFrame)
          }
        }, 800)
      }
    } catch (err) {
      console.error("[printReceipt] DOM print execution failed:", err)
    }
  }

  // Ensure fonts and images are ready before triggering the print dialog
  const imgs = iframeDoc.querySelectorAll("img")
  let pendingImages = imgs.length
  const onReady = () => {
    if (iframeDoc.fonts && iframeDoc.fonts.ready) {
      iframeDoc.fonts.ready.then(() => setTimeout(executePrint, 60)).catch(() => setTimeout(executePrint, 100))
    } else {
      setTimeout(executePrint, 100)
    }
  }

  if (pendingImages === 0) {
    onReady()
  } else {
    imgs.forEach(img => {
      if (img.complete) {
        pendingImages--
        if (pendingImages === 0) onReady()
      } else {
        img.onload = () => {
          pendingImages--
          if (pendingImages === 0) onReady()
        }
        img.onerror = () => {
          pendingImages--
          if (pendingImages === 0) onReady()
        }
      }
    })
  }
}

export async function printReceiptElement(elementId = "receipt-to-print", options = {}) {
  const el = document.getElementById(elementId) || 
             document.getElementById("receipt-print-area") || 
             document.querySelector(".receipt-print-area") || 
             document.querySelector(".realistic-thermal-receipt") || 
             document.querySelector(".receipt-preview-content")
             
  if (!el) {
    console.error(`[printReceipt] Element #${elementId} not found`)
    Swal.fire({
      title: "Element Not Found",
      text: "Could not find receipt to print. Please try again.",
      icon: "error",
      confirmButtonColor: "#0284c7"
    })
    return
  }

  const config = typeof options === "string" ? { pageWidth: options } : (options || {})
  const rawWidth = (config.pageWidth || "80mm").trim().toLowerCase()
  const isA4 = rawWidth === "a4" || rawWidth === "full"
  const is55 = rawWidth === "55mm" || rawWidth === "55"
  const is58 = rawWidth === "58mm" || rawWidth === "58"
  const rollMm = isA4 ? 210 : (is55 ? 55 : (is58 ? 58 : 80))

  // Ensure all receipt images and logos are fully loaded before opening print preview
  const imgs = Array.from(el.querySelectorAll("img"))
  await Promise.all(
    imgs.map((img) => {
      if (img.complete) return Promise.resolve()
      return new Promise((resolve) => {
        img.onload = resolve
        img.onerror = resolve
        setTimeout(resolve, 350)
      })
    })
  )

  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready
    } catch (_) {}
  }

  // If iframe printing is explicitly requested, delegate to printReceiptDom
  if (config.useIframe) {
    printReceiptDom(el, isA4, rollMm, config)
    return
  }

  // Direct clean window printing using receipt-sized @page and top-left alignment
  const formatClass = isA4 ? "slipzo-print-a4" : (rollMm <= 58 ? "slipzo-print-58mm" : "slipzo-print-80mm")
  document.body.classList.remove("slipzo-print-55mm", "slipzo-print-58mm", "slipzo-print-80mm", "slipzo-print-a4")
  document.body.classList.add("slipzo-printing", formatClass)

  let dynamicStyle = document.getElementById("slipzo-dynamic-print-page")
  if (!dynamicStyle) {
    dynamicStyle = document.createElement("style")
    dynamicStyle.id = "slipzo-dynamic-print-page"
    document.head.appendChild(dynamicStyle)
  }

  dynamicStyle.textContent = `
    @page {
      size: ${isA4 ? "A4 portrait" : `${rollMm}mm auto`} !important;
      margin: 0mm !important;
    }
    @page :first {
      margin: 0mm !important;
    }
    @media print {
      @page {
        size: ${isA4 ? "A4 portrait" : `${rollMm}mm auto`} !important;
        margin: 0mm !important;
      }
      @page :first {
        margin: 0mm !important;
      }
      html, body {
        width: ${isA4 ? "100%" : `${rollMm}mm`} !important;
        max-width: ${isA4 ? "100%" : `${rollMm}mm`} !important;
        height: auto !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        background: #ffffff !important;
      }
      body * {
        visibility: hidden !important;
      }
      #${el.id || "receipt-to-print"},
      #${el.id || "receipt-to-print"} *,
      #receipt-to-print,
      #receipt-to-print *,
      #receipt-print-area,
      #receipt-print-area *,
      .receipt-print-area,
      .receipt-print-area * {
        visibility: visible !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      #${el.id || "receipt-to-print"},
      #receipt-to-print,
      #receipt-print-area,
      .receipt-print-area {
        display: block !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: ${isA4 ? "100%" : `${rollMm}mm`} !important;
        max-width: ${isA4 ? "210mm" : `${rollMm}mm`} !important;
        height: auto !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: ${isA4 ? "8mm 6mm" : (rollMm <= 58 ? "1.5mm 2.5mm" : "2mm 3mm")} !important;
        box-sizing: border-box !important;
        overflow: visible !important;
        border: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        background: #ffffff !important;
      }
      .realistic-thermal-receipt {
        margin: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        border: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        background: #ffffff !important;
        height: auto !important;
        min-height: 0 !important;
      }
      .realistic-thermal-receipt .receipt-content {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      .receipt-paper-top,
      .receipt-paper-bottom {
        display: none !important;
      }
    }
  `

  const cleanup = () => {
    document.body.classList.remove("slipzo-printing", "slipzo-print-55mm", "slipzo-print-58mm", "slipzo-print-80mm", "slipzo-print-a4")
    if (dynamicStyle && dynamicStyle.parentNode) {
      dynamicStyle.parentNode.removeChild(dynamicStyle)
    }
    window.removeEventListener("afterprint", cleanup)
  }

  window.addEventListener("afterprint", cleanup)

  // Give the browser one event loop frame to render styles before opening the print preview dialog
  setTimeout(() => {
    window.print()
    setTimeout(cleanup, 2500)
  }, 50)
}

export async function saveReceiptAsPdf(elementId = "receipt-to-print", options = {}) {
  const el = document.getElementById(elementId)
  if (!el) {
    console.error(`[saveReceiptAsPdf] Element #${elementId} not found`)
    Swal.fire({
      title: "Element Not Found",
      text: "Could not find receipt to export as PDF.",
      icon: "error",
      confirmButtonColor: "#0284c7"
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
    denyButtonColor: "#0284c7",
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