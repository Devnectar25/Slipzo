import Swal from "sweetalert2"
import { registerPlugin } from "@capacitor/core"

const isMobileBrowser = () => {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent || ""
  // iPadOS reports itself as a Mac, so also check for touch
  return /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

function triggerBlobDownload(blob, filename) {
  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = blobUrl
  link.download = filename
  link.rel = "noopener"
  link.style.display = "none"
  document.body.appendChild(link)
  link.click()
  setTimeout(() => { if (link.parentNode) link.parentNode.removeChild(link) }, 1000)
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
}

// "PDF ready" dialog for phones: Download and Share run inside the person's own tap
function offerMobilePdf(pdfBlob, filename, formatLabel) {
  const file = typeof File !== "undefined" ? new File([pdfBlob], filename, { type: "application/pdf" }) : null
  const canShare = Boolean(
    file && typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })
  )

  return new Promise((resolve) => {
    let result = { saved: false, filename }
    Swal.fire({
      title: "PDF Ready",
      text: `${filename} (${formatLabel})`,
      icon: "success",
      showConfirmButton: true,
      confirmButtonText: "Download PDF",
      showDenyButton: canShare,
      denyButtonText: "Share / Save to Files",
      showCancelButton: true,
      cancelButtonText: "Close",
      confirmButtonColor: "#0284c7",
      denyButtonColor: "#0f766e",
      // Handle the taps with plain listeners so the download/share starts synchronously inside the tap
      // (capture on the popup runs before SweetAlert's own button handler, which would close the dialog)
      didOpen: (popup) => {
        popup.addEventListener("click", (e) => {
          if (e.target.closest(".swal2-confirm")) {
            e.stopPropagation()
            triggerBlobDownload(pdfBlob, filename)
            result = { saved: true, filename }
            Swal.update({
              title: "Download started",
              text: canShare
                ? "Check your Downloads folder or the download notification. If nothing appears, tap Share / Save to Files."
                : "Check your Downloads folder or the download notification.",
              confirmButtonText: "Download again"
            })
          } else if (e.target.closest(".swal2-deny")) {
            e.stopPropagation()
            navigator.share({ title: filename, files: [file] })
              .then(() => { result = { saved: true, filename }; Swal.close() })
              .catch(() => {}) // the person closed the share sheet
          }
        }, true)
      }
    }).then(() => resolve(result))
  })
}

const HTML2PDF_CDNS = [
  "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js",
  "https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js",
  "https://unpkg.com/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js"
]

let html2pdfLoadPromise = null

const loadHtml2Pdf = () => {
  if (typeof window === "undefined") return Promise.resolve(null)
  if (window.html2pdf) return Promise.resolve(window.html2pdf)
  if (html2pdfLoadPromise) return html2pdfLoadPromise

  html2pdfLoadPromise = (async () => {
    for (const src of HTML2PDF_CDNS) {
      if (window.html2pdf) return window.html2pdf
      const loaded = await new Promise((resolve) => {
        const script = document.createElement("script")
        script.src = src
        script.async = true
        script.onload = () => resolve(window.html2pdf || null)
        script.onerror = () => {
          script.remove()
          resolve(null)
        }
        document.body.appendChild(script)
      })
      if (loaded) return loaded
    }
    html2pdfLoadPromise = null
    return null
  })()

  return html2pdfLoadPromise
}

const sanitizePdfFilename = (raw) => {
  const fallback = `Slipzen_Receipt_${Date.now()}.pdf`
  if (!raw || typeof raw !== "string") return fallback
  const cleaned = raw.trim().replace(/[^a-zA-Z0-9._-]/g, "_")
  if (!cleaned) return fallback
  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`
}

const waitForMediaReady = async (root) => {
  try {
    if (document.fonts && document.fonts.ready) {
      await Promise.race([
        document.fonts.ready,
        new Promise((r) => setTimeout(r, 1200))
      ])
    }
  } catch {
    // ignore font wait errors
  }

  const imgs = Array.from(root?.querySelectorAll?.("img") || [])
  if (imgs.length === 0) return

  await Promise.race([
    Promise.all(
      imgs.map((img) => {
        if (img.complete) return Promise.resolve()
        return new Promise((res) => {
          img.addEventListener("load", res, { once: true })
          img.addEventListener("error", res, { once: true })
        })
      })
    ),
    new Promise((r) => setTimeout(r, 3000))
  ])
}

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : ""
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl
      if (!base64) {
        reject(new Error("Could not encode generated PDF"))
        return
      }
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error || new Error("Failed reading generated PDF"))
    reader.readAsDataURL(blob)
  })

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
          margin: ${rollMm === 210 ? "10mm 12mm" : "0mm"} !important;
        }
        @page :first {
          margin: ${rollMm === 210 ? "10mm 12mm" : "0mm"} !important;
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

// Thermal heads cannot print to the paper edge: an 80mm roll prints ~72mm and a 58mm roll ~48mm.
// Content is kept inside that printable width and centred so nothing is clipped on either side.
const PRINTABLE_WIDTH_MM = { 80: 72, 58: 48 }

const PX_TO_MM = 25.4 / 96

// Collect the app's CSS as text so the print frame is styled immediately (no stylesheet download race).
// Cross-origin sheets (e.g. Google Fonts) cannot be read, so they are passed through as <link> tags.
// @media print blocks are unwrapped so the frame lays out on screen exactly as it will on paper,
// which keeps the measured receipt length (and so the page height) accurate.
function ruleToPrintCss(rule) {
  if (typeof CSSMediaRule !== "undefined" && rule instanceof CSSMediaRule) {
    const media = rule.media.mediaText.toLowerCase()
    if (/^(only\s+)?print$/.test(media.trim())) {
      return Array.from(rule.cssRules).map(ruleToPrintCss).join("\n")
    }
  }
  return rule.cssText
}

function collectAppStyles() {
  let cssText = ""
  let linksHtml = ""
  Array.from(document.styleSheets).forEach((sheet) => {
    const owner = sheet.ownerNode
    if (owner && (owner.id === "slipzo-dynamic-print-page" || owner.id === "slipzo-main-window-print-style")) return
    try {
      cssText += Array.from(sheet.cssRules).map(ruleToPrintCss).join("\n") + "\n"
    } catch (_) {
      if (sheet.href) linksHtml += `<link rel="stylesheet" href="${sheet.href}">\n`
    }
  })
  return { cssText, linksHtml }
}

/**
 * Prints a receipt element through an isolated iframe that contains only the receipt,
 * so no app layout, modal or off-screen wrapper can hide, clip or shift it.
 * rollMm: 58 or 80 for thermal rolls, 210 for A4.
 */
export function printReceiptDom(el, isA4, rollMm, config = {}) {
  const paperMm = isA4 ? 210 : (rollMm <= 58 ? 58 : 80)
  const contentMm = isA4 ? null : PRINTABLE_WIDTH_MM[paperMm]
  const sidePadMm = isA4 ? 0 : (paperMm - contentMm) / 2

  const clone = el.cloneNode(true)
  clone.removeAttribute("id")
  // The on-screen receipt classes carry print.css positioning/padding meant for the main window; the frame lays it out itself
  clone.classList.remove("receipt-print-area", "format-55mm", "format-58mm", "format-80mm", "format-a4")
  clone.classList.add(isA4 ? "format-a4" : (paperMm === 58 ? "format-58mm" : "format-80mm"))
  clone.removeAttribute("style")

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
  clone.querySelectorAll(".receipt-paper-top, .receipt-paper-bottom").forEach(pt => pt.remove())

  const { cssText, linksHtml } = collectAppStyles()

  let printFrame = document.getElementById("slipzo-isolated-print-frame")
  if (printFrame && printFrame.parentNode) {
    printFrame.parentNode.removeChild(printFrame)
  }

  printFrame = document.createElement("iframe")
  printFrame.id = "slipzo-isolated-print-frame"
  printFrame.setAttribute("aria-hidden", "true")
  printFrame.style.position = "fixed"
  printFrame.style.left = "-10000px"
  printFrame.style.top = "0"
  printFrame.style.width = `${paperMm}mm`
  printFrame.style.height = "100vh"
  printFrame.style.border = "0"
  printFrame.style.opacity = "0"
  printFrame.style.pointerEvents = "none"
  document.body.appendChild(printFrame)

  const pageWidth = isA4 ? "100%" : `${paperMm}mm`
  const containerPadding = isA4 ? "0" : `2mm ${sidePadMm}mm 4mm`

  const iframeDoc = printFrame.contentDocument || printFrame.contentWindow.document
  iframeDoc.open()
  iframeDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt</title>
  <base href="${document.baseURI}">
  ${linksHtml}
  <style>${cssText}</style>
  <style id="slipzo-thermal-print-styles">
    *, *::before, *::after {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    /* print.css hides "body *" for main-window printing; this document only holds the receipt */
    body *, body *::before, body *::after {
      visibility: visible !important;
    }
    @page {
      size: ${isA4 ? "A4 portrait" : `${paperMm}mm 297mm`};
      margin: ${isA4 ? "10mm 12mm" : "0"};
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: ${isA4 ? "100%" : pageWidth} !important;
      min-width: 0 !important;
      max-width: ${isA4 ? "100%" : pageWidth} !important;
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
      background: #ffffff !important;
      color: #000000;
      box-sizing: border-box !important;
    }
    .slipzo-isolated-receipt-container {
      position: static !important;
      display: block !important;
      margin: 0 auto !important;
      padding: ${isA4 ? "0" : containerPadding} !important;
      width: 100% !important;
      max-width: ${isA4 ? "100%" : pageWidth} !important;
      background: #ffffff !important;
      opacity: 1 !important;
      transform: none !important;
      box-sizing: border-box !important;
    }
    .slipzo-isolated-receipt-container > .receipt-preview-content,
    .slipzo-isolated-receipt-container .realistic-thermal-receipt {
      position: static !important;
      display: block !important;
      margin: 0 auto !important;
      padding: 0 !important;
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      background: #ffffff !important;
      opacity: 1 !important;
      transform: none !important;
      overflow: visible !important;
      box-sizing: border-box !important;
    }
    .slipzo-isolated-receipt-container img {
      max-width: 100% !important;
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
      break-inside: avoid !important;
    }
  </style>
</head>
<body class="${isA4 ? 'slipzo-print-a4' : (paperMm === 58 ? 'slipzo-print-58mm' : 'slipzo-print-80mm')}">
  <div class="slipzo-isolated-receipt-container">${clone.outerHTML}</div>
</body>
</html>`)
  iframeDoc.close()

  const removeFrame = () => {
    if (printFrame && printFrame.parentNode) {
      printFrame.parentNode.removeChild(printFrame)
    }
  }

  const executePrint = () => {
    try {
      // Size the thermal page to the receipt's real length so the printer feeds exactly one slip
      if (!isA4) {
        const container = iframeDoc.querySelector(".slipzo-isolated-receipt-container")
        const heightMm = Math.ceil((container ? container.scrollHeight : 0) * PX_TO_MM) + 2
        const pageStyle = iframeDoc.createElement("style")
        pageStyle.textContent = `@page { size: ${pageWidth} ${Math.max(heightMm, 40)}mm; margin: 0; }`
        iframeDoc.head.appendChild(pageStyle)
      }

      const win = printFrame.contentWindow
      win.onafterprint = () => setTimeout(removeFrame, 500)
      win.focus()
      win.print()
      // Fallback for browsers that never fire afterprint on iframes
      setTimeout(removeFrame, 60000)
    } catch (err) {
      console.error("[printReceipt] DOM print execution failed:", err)
      removeFrame()
    }
  }

  // Wait for cross-origin stylesheets, images and fonts so the dialog never opens on a half-rendered slip
  const waitFor = (nodes, timeoutMs) => Promise.all(Array.from(nodes).map((node) => {
    if (node.tagName === "IMG" && node.complete) return Promise.resolve()
    if (node.tagName === "LINK" && node.sheet) return Promise.resolve()
    return new Promise((resolve) => {
      node.addEventListener("load", resolve, { once: true })
      node.addEventListener("error", resolve, { once: true })
      setTimeout(resolve, timeoutMs)
    })
  }))

  waitFor(iframeDoc.querySelectorAll('link[rel="stylesheet"]'), 1500)
    .then(() => waitFor(iframeDoc.querySelectorAll("img"), 2000))
    .then(() => (iframeDoc.fonts && iframeDoc.fonts.ready ? iframeDoc.fonts.ready.catch(() => {}) : null))
    .then(() => new Promise((resolve) => setTimeout(resolve, 80)))
    .then(executePrint)
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
  const rawWidth = String(config.pageWidth || "80mm").trim().toLowerCase()
  const isA4 = rawWidth === "a4" || rawWidth === "full"
  // "55mm" is the app's name for the small roll, which is physically 58mm paper
  const isSmallRoll = ["55mm", "55", "58mm", "58"].includes(rawWidth)
  const rollMm = isA4 ? 210 : (isSmallRoll ? 58 : 80)

  // Ensure all receipt images and logos are fully loaded before cloning
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

  printReceiptDom(el, isA4, rollMm, config)
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
    return { saved: false }
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
    if (!html2pdf) {
      throw new Error("Could not load the PDF generator. Please check your internet connection and try again.")
    }

    const config = typeof options === "string" ? { pageWidth: options } : (options || {})
    const rawWidth = (config.pageWidth || "80mm").trim().toLowerCase()
    const isA4 = rawWidth === "a4" || rawWidth === "full"
    const is55 = rawWidth === "55mm" || rawWidth === "55"
    const is58 = rawWidth === "58mm" || rawWidth === "58"
    const rollMm = isA4 ? 210 : (is55 ? 55 : (is58 ? 58 : 80))
    const formatLabel = isA4 ? "A4" : `${rollMm}mm`
    const filename = sanitizePdfFilename(config.filename)

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
    wrapper.style.padding = "0"
    wrapper.style.margin = "0 auto"
    wrapper.style.background = "#ffffff"
    wrapper.style.boxSizing = "border-box"
    wrapper.style.width = isA4 ? "190mm" : `${rollMm}mm`
    wrapper.appendChild(clone)

    // Mount container to DOM for accurate font and CSS measurement during PDF capture
    const measureWrap = document.createElement("div")
    measureWrap.style.position = "fixed"
    measureWrap.style.left = "-9999px"
    measureWrap.style.top = "0"
    measureWrap.style.width = isA4 ? "190mm" : `${rollMm}mm`
    measureWrap.style.background = "#ffffff"
    measureWrap.style.pointerEvents = "none"
    measureWrap.style.zIndex = "-9999"
    measureWrap.appendChild(wrapper)
    document.body.appendChild(measureWrap)

    let pdfBlob = null
    try {
      await waitForMediaReady(wrapper)

      const measuredPx = Math.ceil(wrapper.getBoundingClientRect().height || wrapper.offsetHeight)
      const calculatedHeightMm = isA4 ? 297 : Math.max(65, Math.ceil(measuredPx * (25.4 / 96)) + 4)
      const captureScale = measuredPx > 4000 ? 1.5 : 2.5

      const pdfOpt = {
        margin: isA4 ? [10, 10, 10, 10] : [0, 0, 0, 0],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: captureScale,
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          backgroundColor: "#ffffff"
        },
        jsPDF: {
          unit: "mm",
          format: isA4 ? "a4" : [rollMm, calculatedHeightMm],
          orientation: "portrait"
        }
      }

      const worker = html2pdf().set(pdfOpt).from(wrapper)
      const rawBlob = typeof worker.outputPdf === "function"
        ? await worker.outputPdf("blob")
        : await worker.toPdf().get("pdf").then((doc) => doc?.output?.("blob"))

      if (rawBlob instanceof Blob && rawBlob.size >= 100) {
        pdfBlob = new Blob([rawBlob], { type: "application/pdf" })
      } else {
        throw new Error("Generated PDF file was empty.")
      }
    } finally {
      if (measureWrap && measureWrap.parentNode) {
        measureWrap.parentNode.removeChild(measureWrap)
      }
    }

    const cap = typeof window !== "undefined" ? window.Capacitor : null
    const isCapacitorNative = Boolean(cap?.isNativePlatform?.() || cap?.isNative)
    // Capacitor 3+ no longer guarantees custom plugins on Capacitor.Plugins; registerPlugin always finds them
    const nativeSaver = isCapacitorNative
      ? (cap?.Plugins?.NativeFileSaver || (cap?.isPluginAvailable?.("NativeFileSaver") ? registerPlugin("NativeFileSaver") : null))
      : null

    if (isCapacitorNative) {
      if (nativeSaver?.savePdf) {
        const base64Data = await blobToBase64(pdfBlob)
        const nativeRes = await nativeSaver.savePdf({
          filename,
          base64Data,
          mimeType: "application/pdf"
        })
        if (!nativeRes?.saved || !nativeRes?.uri) {
          throw new Error("Device storage did not confirm saving the PDF.")
        }

        const swalResult = await Swal.fire({
          title: "PDF Saved!",
          text: `${filename} (${formatLabel}) saved to ${nativeRes.location || "Downloads/Slipzen"}.`,
          icon: "success",
          showCancelButton: Boolean(nativeSaver?.openPdf),
          confirmButtonText: nativeSaver?.openPdf ? "Open PDF" : "OK",
          cancelButtonText: "Done",
          confirmButtonColor: "#0284c7"
        })

        if (swalResult.isConfirmed && nativeSaver?.openPdf) {
          try {
            await nativeSaver.openPdf({ uri: nativeRes.uri, mimeType: "application/pdf" })
          } catch (openErr) {
            Swal.fire({
              title: "Saved to Downloads",
              text: `${nativeRes.location || filename} was saved, but no PDF viewer app could be opened (${openErr?.message || "no viewer found"}).`,
              icon: "info",
              confirmButtonColor: "#0284c7"
            })
          }
        }
        return { saved: true, filename, uri: nativeRes.uri, location: nativeRes.location }
      }

      if (typeof navigator !== "undefined" && typeof navigator.share === "function" && typeof File !== "undefined") {
        const file = new File([pdfBlob], filename, { type: "application/pdf" })
        if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
          Swal.close()
          await navigator.share({ title: filename, files: [file] })
          return { saved: true, filename }
        }
      }

      throw new Error("Direct PDF download requires the latest Android app build.")
    }

    if (typeof window.navigator?.msSaveOrOpenBlob === "function") {
      window.navigator.msSaveOrOpenBlob(pdfBlob, filename)
      Swal.close()
      return { saved: true, filename }
    }

    // Mobile browsers: the PDF is made asynchronously, so by now the original tap has "expired" and many
    // mobile browsers (in-app browsers, iOS home-screen apps, some Android Chrome setups) silently drop a
    // programmatic blob download while we would still report success. Instead, offer a button: the
    // download then starts inside a fresh tap, which every browser allows. Sharing is offered too.
    if (isMobileBrowser()) {
      return offerMobilePdf(pdfBlob, filename, formatLabel)
    }

    // Desktop browser download
    triggerBlobDownload(pdfBlob, filename)

    Swal.fire({
      title: "PDF Saved!",
      text: `${filename} (${formatLabel}) has been downloaded.`,
      icon: "success",
      timer: 2500,
      showConfirmButton: false
    })
    return { saved: true, filename }
  } catch (err) {
    console.error("[saveReceiptAsPdf] error:", err)
    const msg = err?.message || "Could not generate or download the receipt PDF."
    Swal.fire({
      title: "PDF Download Failed",
      text: msg,
      icon: "error",
      confirmButtonColor: "#0284c7"
    })
    return { saved: false, error: msg }
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