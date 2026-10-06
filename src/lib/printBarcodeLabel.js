import { encodeCode128 } from "./code128"

/**
 * Single source of truth for supported barcode label formats and physical print dimensions.
 */
export const LABEL_FORMATS = {
  "50x25mm": {
    id: "50x25mm",
    name: "50 × 25 mm (Thermal Sticker)",
    isSheet: false,
    pageWidthMm: 50,
    pageHeightMm: 25,
    pageMargin: "0mm",
    labelPaddingMm: "1.2mm 2mm",
    shopFontSizePt: "6.5pt",
    nameFontSizePt: "8.5pt",
    barcodeHeight: 34,
    barcodeFontSize: 9.5,
    maxBarcodeWidthMm: "46mm"
  },
  "58mm": {
    id: "58mm",
    name: "58 mm (Thermal Roll)",
    isSheet: false,
    pageWidthMm: 58,
    pageHeightMm: 38,
    pageMargin: "0mm",
    labelPaddingMm: "2mm 3mm",
    shopFontSizePt: "7.5pt",
    nameFontSizePt: "10pt",
    barcodeHeight: 46,
    barcodeFontSize: 11,
    maxBarcodeWidthMm: "52mm"
  },
  "80mm": {
    id: "80mm",
    name: "80 mm (POS Roll)",
    isSheet: false,
    pageWidthMm: 80,
    pageHeightMm: 48,
    pageMargin: "0mm",
    labelPaddingMm: "2.5mm 4mm",
    shopFontSizePt: "8.5pt",
    nameFontSizePt: "12pt",
    barcodeHeight: 56,
    barcodeFontSize: 12,
    maxBarcodeWidthMm: "72mm"
  },
  "standard": {
    id: "standard",
    name: "Standard Sheet (A4 Grid / 1-30 Labels)",
    isSheet: true,
    pageWidthMm: 210,
    pageHeightMm: 297,
    columns: 3,
    pageMargin: "6mm 6mm",
    labelPaddingMm: "2mm 2.5mm",
    shopFontSizePt: "7.5pt",
    nameFontSizePt: "9.5pt",
    barcodeHeight: 40,
    barcodeFontSize: 10,
    maxBarcodeWidthMm: "56mm"
  }
}

/**
 * Print Barcode Label (Dedicated Thermal Roll / Sticker & A4 Sheet Grid Printing)
 *
 * Sizing Architecture:
 * - For Thermal Rolls (50x25mm, 58mm, 80mm): Strict 1:1 @page size with roll feed breaks.
 * - For Standard Sheet (A4 Grid): 210x297mm A4 page with multi-column CSS grid tiling all copies on a single A4 page.
 * - Dedicated hidden print iframe with physical millimeter viewport dimensions.
 * - Sharp vector SVG Code 128 rendering filling printable label width.
 * - 100% DOM & CSS isolation from main application and receipt printing.
 */
export function printBarcodeLabel(item, options = {}) {
  if (!item || !item.barcode) {
    console.error("[printBarcodeLabel] Missing item or barcode value")
    return false
  }

  const {
    labelSize = "50x25mm",
    shopName = "SLIPZO POS",
    copies = 1
  } = options

  // 1. Resolve selected label format configuration
  const fmt = LABEL_FORMATS[labelSize] || LABEL_FORMATS["50x25mm"]
  const widthMm = fmt.pageWidthMm
  const heightMm = fmt.pageHeightMm
  const numCopies = Math.max(1, parseInt(copies, 10) || 1)

  const cleanBarcode = String(item.barcode).trim()
  const cleanName = String(item.name || "Product Item").trim()
  const cleanShop = String(shopName || "SLIPZO POS").trim()

  // 2. Compute Code 128 barcode bars
  const encoded = encodeCode128(cleanBarcode)
  if (!encoded) {
    console.error("[printBarcodeLabel] Failed to encode Code 128 barcode")
    return false
  }

  // 3. Build proportional SVG markup
  const svgBarHeight = fmt.barcodeHeight || 44
  const svgTextHeight = 15
  const totalSvgHeight = svgBarHeight + svgTextHeight

  const barsSvg = encoded.bars
    .map(b => `<rect x="${b.x}" y="0" width="${b.width}" height="${svgBarHeight}" fill="#000000" shape-rendering="crispEdges" />`)
    .join("")

  const svgMarkup = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${encoded.totalModules} ${totalSvgHeight}" class="slipzo-barcode-svg" preserveAspectRatio="none" shape-rendering="crispEdges">
      <rect width="100%" height="100%" fill="#ffffff" shape-rendering="crispEdges" />
      ${barsSvg}
      <text x="${encoded.totalModules / 2}" y="${svgBarHeight + 12}" text-anchor="middle" fill="#000000" font-size="${fmt.barcodeFontSize || 11}" font-family="monospace, 'Courier New', Courier, sans-serif" font-weight="700" letter-spacing="1.5">
        ${encoded.text}
      </text>
    </svg>
  `

  // 4. Generate label copies HTML (Grid layout for A4 sheet, individual pages for thermal roll)
  let labelsHtml = ""
  if (fmt.isSheet) {
    let itemsHtml = ""
    for (let c = 0; c < numCopies; c++) {
      itemsHtml += `
        <div class="slipzo-sheet-label">
          <div class="slipzo-label-header">${cleanShop}</div>
          <div class="slipzo-label-item-name">${cleanName}</div>
          <div class="slipzo-label-barcode-box">
            ${svgMarkup}
          </div>
        </div>
      `
    }
    labelsHtml = `<div class="slipzo-sheet-grid">${itemsHtml}</div>`
  } else {
    for (let c = 0; c < numCopies; c++) {
      labelsHtml += `
        <div class="slipzo-label-page">
          <div class="slipzo-label-header">${cleanShop}</div>
          <div class="slipzo-label-item-name">${cleanName}</div>
          <div class="slipzo-label-barcode-box">
            ${svgMarkup}
          </div>
        </div>
      `
    }
  }

  // 5. Build isolated hidden printing iframe with physical dimensions
  const frameId = "slipzo-barcode-print-iframe"
  let iframe = document.getElementById(frameId)
  if (iframe && iframe.parentNode) {
    iframe.parentNode.removeChild(iframe)
  }

  iframe = document.createElement("iframe")
  iframe.id = frameId
  iframe.setAttribute("aria-hidden", "true")
  iframe.style.position = "fixed"
  iframe.style.top = "0"
  iframe.style.left = "-9999px"
  iframe.style.width = `${widthMm}mm`
  iframe.style.height = `${heightMm}mm`
  iframe.style.border = "none"
  iframe.style.visibility = "hidden"
  iframe.style.zIndex = "-9999"
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow.document
  doc.open()

  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Barcode - ${cleanBarcode}</title>
        <style>
          @charset "utf-8";

          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            margin: 0;
            padding: 0;
          }

          @page {
            size: ${widthMm}mm ${heightMm}mm;
            margin: ${fmt.pageMargin || "0mm"};
          }

          @page :first {
            margin: ${fmt.pageMargin || "0mm"};
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: ${fmt.isSheet ? "100%" : `${widthMm}mm`} !important;
            max-width: ${fmt.isSheet ? "100%" : `${widthMm}mm`} !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            -webkit-font-smoothing: antialiased;
            ${fmt.isSheet ? "" : "overflow: hidden !important;"}
          }

          /* Sheet Grid Layout (A4 Sheet Multi-Label Printing) */
          .slipzo-sheet-grid {
            display: grid !important;
            grid-template-columns: repeat(${fmt.columns || 3}, 1fr) !important;
            grid-gap: 3.5mm !important;
            gap: 3.5mm !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }

          .slipzo-sheet-label {
            box-sizing: border-box !important;
            border: 1px dashed #cbd5e1 !important;
            border-radius: 4px !important;
            padding: ${fmt.labelPaddingMm} !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            background: #ffffff !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            height: 38mm !important;
            max-height: 42mm !important;
            overflow: hidden !important;
          }

          /* Single Roll / Sticker Page Layout */
          .slipzo-label-page {
            width: ${widthMm}mm !important;
            height: ${heightMm}mm !important;
            max-width: ${widthMm}mm !important;
            max-height: ${heightMm}mm !important;
            padding: ${fmt.labelPaddingMm} !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            background: #ffffff !important;
            overflow: hidden !important;
            page-break-after: always;
            break-after: page;
          }

          .slipzo-label-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          .slipzo-label-header {
            font-size: ${fmt.shopFontSizePt} !important;
            font-weight: 800 !important;
            letter-spacing: 0.6px !important;
            text-transform: uppercase !important;
            color: #334155 !important;
            line-height: 1 !important;
            margin-bottom: 0.6mm !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            width: 100% !important;
          }

          .slipzo-label-item-name {
            font-size: ${fmt.nameFontSizePt} !important;
            font-weight: 800 !important;
            color: #000000 !important;
            width: 100% !important;
            max-width: 100% !important;
            line-height: 1.1 !important;
            margin-bottom: 0.6mm !important;
            word-break: break-word !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          .slipzo-label-barcode-box {
            width: 100% !important;
            max-width: ${fmt.maxBarcodeWidthMm} !important;
            margin: 0 auto !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
          }

          .slipzo-barcode-svg {
            width: 100% !important;
            height: auto !important;
            display: block !important;
            margin: 0 auto !important;
            shape-rendering: crispEdges !important;
            image-rendering: pixelated !important;
            image-rendering: crisp-edges !important;
          }

          .slipzo-barcode-svg rect {
            shape-rendering: crispEdges !important;
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
      </body>
    </html>
  `)
  doc.close()

  // 6. Trigger native print after layout calculation
  setTimeout(() => {
    try {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
    } catch (err) {
      console.error("[printBarcodeLabel] Print trigger failed:", err)
    } finally {
      setTimeout(() => {
        if (iframe && iframe.parentNode) {
          iframe.parentNode.removeChild(iframe)
        }
      }, 3000)
    }
  }, 200)

  return true
}
