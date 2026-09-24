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
  const is55 = rawWidth === "55mm" || rawWidth === "55" || rawWidth === "58mm" || rawWidth === "58"
  const is80 = rawWidth === "80mm" || rawWidth === "80"

  const rollMm = isA4 ? 210 : (is55 ? 58 : 80)
  const rollWidth = isA4 ? "210mm" : `${rollMm}mm`

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

  // Clean wrapper styles on clone
  clone.removeAttribute("style")
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

  // Measure rendered bounding height in CSS pixels for @page sizing
  let targetHeightMm = isA4 ? 297 : 120
  if (!isA4) {
    try {
      const measureDiv = document.createElement("div")
      measureDiv.id = "slipzo-print-measure"
      measureDiv.style.position = "fixed"
      measureDiv.style.left = "-9999px"
      measureDiv.style.top = "0"
      measureDiv.style.width = `${rollMm}mm`
      measureDiv.style.maxWidth = `${rollMm}mm`
      measureDiv.style.visibility = "hidden"
      measureDiv.style.pointerEvents = "none"
      measureDiv.style.zIndex = "-9999"
      measureDiv.style.margin = "0"
      measureDiv.style.padding = "0"
      measureDiv.style.boxSizing = "border-box"
      measureDiv.style.background = "#ffffff"

      const cloneForMeasure = clone.cloneNode(true)
      measureDiv.appendChild(cloneForMeasure)
      document.body.appendChild(measureDiv)

      const measuredPx = Math.ceil(measureDiv.getBoundingClientRect().height || measureDiv.offsetHeight)
      document.body.removeChild(measureDiv)

      if (measuredPx > 40) {
        // Standard CSS unit: 1 inch = 96 CSS pixels = 25.4mm + 8mm safe buffer
        targetHeightMm = Math.max(70, Math.ceil(measuredPx * (25.4 / 96)) + 8)
      }
    } catch (err) {
      console.warn("[printReceipt] Height measurement fallback:", err)
      targetHeightMm = 140
    }
  }

  const receiptHTML = clone.outerHTML

  // Extract application stylesheets so print output perfectly mirrors on-screen & PDF rendering
  const pageStyles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
    .map((node) => node.outerHTML)
    .join("\n")

  const printHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title> </title>
  ${pageStyles}
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    @page {
      ${isA4 ? "size: A4 portrait; margin: 8mm;" : `margin: 0; size: ${rollMm}mm ${targetHeightMm}mm;`}
    }

    html, body {
      background: #ffffff !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      overflow: visible !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      display: flex;
      justify-content: center;
    }

    .print-outer-container {
      width: ${isA4 ? "100%" : `${rollMm}mm`} !important;
      max-width: ${isA4 ? "700px" : `${rollMm}mm`} !important;
      margin: 0 auto !important;
      padding: 0 !important;
      box-sizing: border-box !important;
      background: #ffffff !important;
    }

    .receipt-preview-content,
    #receipt-to-print,
    .realistic-thermal-receipt {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 auto !important;
      padding: 0 !important;
      box-shadow: none !important;
      border: none !important;
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
      padding-bottom: 8mm !important;
      box-sizing: border-box !important;
    }

    @media print {
      @page {
        ${isA4 ? "size: A4 portrait; margin: 8mm;" : `margin: 0; size: ${rollMm}mm ${targetHeightMm}mm;`}
      }
      html, body {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
      }
      .print-outer-container {
        width: ${isA4 ? "100%" : `${rollMm}mm`} !important;
        max-width: ${isA4 ? "700px" : `${rollMm}mm`} !important;
        margin: 0 auto !important;
        padding: 0 !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-outer-container">
    ${receiptHTML}
  </div>
</body>
</html>`

  // Strategy 1: Try dedicated popup window (enables true @page sizing in modern Chromium)
  let printWin = null
  try {
    const winWidth = isA4 ? 700 : (is55 ? 380 : 440)
    printWin = window.open(
      "",
      "_blank",
      `width=${winWidth},height=650,left=150,top=100,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`
    )
  } catch (err) {
    console.warn("[printReceipt] Popup window open blocked:", err)
    printWin = null
  }

  if (printWin && printWin.document) {
    try {
      printWin.document.open()
      printWin.document.write(printHtml)
      printWin.document.close()

      const triggerPopupPrint = () => {
        try {
          printWin.focus()
          printWin.onafterprint = () => {
            setTimeout(() => {
              try {
                if (!printWin.closed) printWin.close()
              } catch (_) {}
            }, 400)
          }
          printWin.print()
        } catch (e) {
          console.warn("[printReceipt] Popup print invocation error:", e)
        }
      }

      if (printWin.document.readyState === "complete") {
        setTimeout(triggerPopupPrint, 180)
      } else {
        printWin.onload = () => setTimeout(triggerPopupPrint, 180)
        setTimeout(triggerPopupPrint, 350)
      }
      return
    } catch (popupErr) {
      console.warn("[printReceipt] Popup write failed, falling back to iframe:", popupErr)
    }
  }

  // Strategy 2: Clean iframe fallback if popup blocker is active
  const existingFrame = document.getElementById("slipzo-silent-print-frame")
  if (existingFrame && existingFrame.parentNode) {
    existingFrame.parentNode.removeChild(existingFrame)
  }

  const iframe = document.createElement("iframe")
  iframe.id = "slipzo-silent-print-frame"
  iframe.setAttribute("aria-hidden", "true")
  iframe.setAttribute("tabindex", "-1")
  iframe.style.position = "fixed"
  iframe.style.left = "-9999px"
  iframe.style.top = "0"
  iframe.style.width = isA4 ? "210mm" : rollWidth
  iframe.style.height = "100vh"
  iframe.style.border = "none"
  iframe.style.opacity = "0"
  iframe.style.pointerEvents = "none"
  iframe.style.zIndex = "-9999"

  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) {
    window.print()
    return
  }

  doc.open()
  doc.write(printHtml)
  doc.close()

  const triggerIframePrint = () => {
    try {
      const cw = iframe.contentWindow
      if (cw) {
        cw.focus()
        cw.onafterprint = () => {
          setTimeout(() => {
            try {
              if (iframe.parentNode) {
                iframe.parentNode.removeChild(iframe)
              }
            } catch (_) {}
          }, 500)
        }
        cw.print()
      } else {
        window.print()
      }
    } catch (err) {
      console.warn("[printReceiptElement] iframe print error, falling back to window.print:", err)
      window.print()
    }
  }

  if (doc.readyState === "complete") {
    setTimeout(triggerIframePrint, 150)
  } else {
    iframe.onload = () => setTimeout(triggerIframePrint, 150)
    setTimeout(triggerIframePrint, 250)
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
    const is55 = rawWidth === "55mm" || rawWidth === "55" || rawWidth === "58mm" || rawWidth === "58"
    const rollMm = is55 ? 58 : 80
    const filename = `Slipzo_Receipt_${Date.now()}.pdf`

    const clone = el.cloneNode(true)
    clone.style.margin = "0 auto"
    clone.style.width = isA4 ? "100%" : `${rollMm}mm`
    clone.style.maxWidth = isA4 ? "100%" : `${rollMm}mm`
    clone.style.background = "#ffffff"
    clone.style.color = "#000000"
    clone.style.boxShadow = "none"
    clone.style.border = "none"
    clone.style.borderRadius = "0"

    const wrapper = document.createElement("div")
    wrapper.style.padding = isA4 ? "10mm" : "3mm 2mm"
    wrapper.style.background = "#ffffff"
    wrapper.style.boxSizing = "border-box"
    wrapper.style.width = isA4 ? "210mm" : `${rollMm}mm`
    wrapper.appendChild(clone)

    // Temporary measure container
    const measureWrap = document.createElement("div")
    measureWrap.style.position = "fixed"
    measureWrap.style.left = "-9999px"
    measureWrap.style.top = "0"
    measureWrap.style.visibility = "hidden"
    measureWrap.style.zIndex = "-9999"
    measureWrap.appendChild(wrapper)
    document.body.appendChild(measureWrap)

    const measuredPx = wrapper.getBoundingClientRect().height || wrapper.offsetHeight
    const calculatedHeightMm = isA4 ? 297 : Math.max(75, Math.ceil(measuredPx * (25.4 / 96)) + 8)
    document.body.removeChild(measureWrap)

    if (html2pdf) {
      const pdfOpt = {
        margin: isA4 ? [8, 8, 8, 8] : [2, 1, 2, 1],
        filename: filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2.5, useCORS: true, logging: false, scrollY: 0 },
        jsPDF: {
          unit: "mm",
          format: isA4 ? "a4" : [rollMm, calculatedHeightMm],
          orientation: "portrait"
        }
      }
      await html2pdf().set(pdfOpt).from(wrapper).save()
      Swal.fire({
        title: "PDF Saved! 📄",
        text: `Receipt (${isA4 ? "A4" : rollMm + "mm"}) has been downloaded successfully.`,
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