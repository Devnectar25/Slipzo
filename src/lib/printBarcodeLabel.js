import { encodeCode128 } from "./code128"

/**
 * Barcode label formats. A label holds only the bars and the number under them.
 *
 * The bars are stretched to fill `maxWidthMm`, the printable width (see moduleWidthMm). `moduleMm` is the
 * format's usual narrowest bar; a short code grows to at most twice that.
 *
 * - sticker (50x25mm): a label printer with 50x25 stock, so one 50x25 page per label.
 * - roll (58mm, 80mm): a receipt printer. ONE page, roll width wide, the labels one after another with a tear
 *   line, each centred across the roll. The page is never wider than it is tall (Chrome would turn a wider page
 *   sideways). `printableWidthMm` is the part the head can reach; the bars stay inside it (`maxWidthMm`).
 * - sheet (A4): a 3-column grid of labels.
 */
export const LABEL_FORMATS = {
  "50x25mm": {
    id: "50x25mm",
    name: "50 × 25 mm (Thermal Sticker)",
    kind: "sticker",
    pageWidthMm: 50,
    pageHeightMm: 25,
    labelHeightMm: 25,
    moduleMm: 0.25,
    maxWidthMm: 46,
    barHeightMm: 13,
    textPt: 7.5
  },
  "58mm": {
    id: "58mm",
    name: "58 mm (Thermal Roll)",
    kind: "roll",
    pageWidthMm: 58,
    printableWidthMm: 48,
    labelHeightMm: 28,
    moduleMm: 0.25,
    maxWidthMm: 38, // narrower than the 48 mm printable width, so the code has clear white on both sides
    barHeightMm: 16,
    textPt: 8.5
  },
  "80mm": {
    id: "80mm",
    name: "80 mm (POS Roll)",
    kind: "roll",
    pageWidthMm: 80,
    printableWidthMm: 72,
    labelHeightMm: 32,
    moduleMm: 0.375,
    maxWidthMm: 66,
    barHeightMm: 19,
    textPt: 10
  },
  "standard": {
    id: "standard",
    name: "Standard Sheet (A4 Grid / 1-30 Labels)",
    kind: "sheet",
    pageWidthMm: 210,
    pageHeightMm: 297,
    columns: 3,
    labelHeightMm: 30,
    moduleMm: 0.375,
    maxWidthMm: 56,
    barHeightMm: 16,
    textPt: 9
  }
}

const DOT_MM = 0.125 // one dot of a 203 dpi thermal printer
const MIN_QUIET_MODULES = 10 // Code 128 needs at least 10 narrow-bar widths of white on each side

// width of one label's box: the page, or one column of the A4 grid (8 mm margins, 3 mm gaps)
const labelWidthMm = (fmt) => (fmt.kind === "sheet"
  ? (fmt.pageWidthMm - 16 - (fmt.columns - 1) * 3) / fmt.columns
  : fmt.pageWidthMm)

/**
 * Narrowest bar width. The bars are stretched to fill `maxWidthMm` (the part of the paper the printer can print)
 * instead of being held to whole dots: on a 58 mm roll a whole-dot code is either 36 mm wide (2 dots) or too wide
 * to print (3 dots), which left wide empty sides. Limits: the quiet zone (10 modules each side) must fit on the
 * label, it may run into the unprintable edge since that is white anyway, and a short code grows to at most
 * twice the format's module so it does not turn huge. Never under one dot.
 */
const moduleWidthMm = (fmt, barModules) => {
  const byPrintable = fmt.maxWidthMm / barModules
  const byLabel = labelWidthMm(fmt) / (barModules + 2 * MIN_QUIET_MODULES)
  return Math.max(DOT_MM, Math.min(byPrintable, byLabel, fmt.moduleMm * 2))
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]))

/**
 * Prints barcode labels through a hidden iframe and the browser's print dialog.
 *
 * A web page, not a PDF: Chrome prints a page that sets its own size (@page size) on paper of exactly that size,
 * so the labels are always centred and never cut off. A PDF goes on whatever paper the printer is set to, in its
 * top-left corner unless Scale is "Fit to printable area", and is cut when it is longer than that paper.
 *
 * The page sets zero margins, so Chrome has no room for its own header and footer (date, title, web address,
 * page number) as long as the print window's Margins setting is "Default". BarcodeModal tells the person.
 *
 * options: { labelSize: one of LABEL_FORMATS' ids, copies }
 */
export function printBarcodeLabel(item, options = {}) {
  if (!item || !item.barcode) {
    console.error("[printBarcodeLabel] Missing item or barcode value")
    return false
  }

  const { labelSize = "50x25mm", copies = 1 } = options
  const fmt = LABEL_FORMATS[labelSize] || LABEL_FORMATS["50x25mm"]
  const numCopies = Math.max(1, parseInt(copies, 10) || 1)
  const cleanBarcode = String(item.barcode).trim()

  const encoded = encodeCode128(cleanBarcode)
  if (!encoded) {
    console.error("[printBarcodeLabel] Failed to encode Code 128 barcode")
    return false
  }

  // bars drawn in real millimetres, one SVG unit = one module; the SVG keeps a 10-module quiet zone each side
  const barModules = encoded.totalModules - 2 * encoded.quietZoneModules
  const moduleMm = moduleWidthMm(fmt, barModules)
  const svgModules = barModules + 2 * MIN_QUIET_MODULES
  const widthMm = svgModules * moduleMm
  const bars = encoded.bars
    .map((b) => `<rect x="${b.x}" y="0" width="${b.width}" height="1" />`)
    .join("")
  const labelInner = `
    <svg xmlns="http://www.w3.org/2000/svg" class="bc-svg" viewBox="${encoded.quietZoneModules - MIN_QUIET_MODULES} 0 ${svgModules} 1" preserveAspectRatio="none"
      style="width:${widthMm}mm;height:${fmt.barHeightMm}mm" shape-rendering="crispEdges">${bars}</svg>
    <div class="bc-text">${escapeHtml(encoded.text)}</div>
  `
  // roll: the page is the roll width by all the labels, at least as tall as wide; labels share the height
  const rollPageMm = fmt.kind === "roll" ? Math.max(fmt.pageWidthMm, numCopies * fmt.labelHeightMm) : 0
  const rollLabelMm = fmt.kind === "roll" ? rollPageMm / numCopies : 0

  const labelClass = fmt.kind === "sheet" ? "bc-label bc-sheet-label" : "bc-label"
  const labels = Array.from({ length: numCopies }, () => `<div class="${labelClass}">${labelInner}</div>`).join("")
  // A4: one padded grid per sheet (rows that fit in 297 mm), so every sheet keeps its 8 mm border
  const sheetRows = Math.max(1, Math.floor((297 - 16 + 3) / ((fmt.labelHeightMm || 30) + 3)))
  const perSheet = sheetRows * (fmt.columns || 3)
  const sheets = []
  for (let i = 0; i < numCopies; i += perSheet) {
    const count = Math.min(perSheet, numCopies - i)
    sheets.push(`<div class="bc-sheet">${Array.from({ length: count }, () => `<div class="${labelClass}">${labelInner}</div>`).join("")}</div>`)
  }
  const body = fmt.kind === "sheet" ? sheets.join("") : labels

  const pageCss = {
    sticker: `@page { size: ${fmt.pageWidthMm}mm ${fmt.pageHeightMm}mm; margin: 0; }`,
    roll: `@page { size: ${fmt.pageWidthMm}mm ${rollPageMm}mm; margin: 0; }
      html, body { width: ${fmt.pageWidthMm}mm; }`,
    // the sheet's 8 mm border is padding, not a page margin, so Chrome has no margin to put its header in
    sheet: "@page { size: A4 portrait; margin: 0; }"
  }[fmt.kind]

  const labelCss = {
    // one label per sticker page
    sticker: `
      .bc-label { width: ${fmt.pageWidthMm}mm; height: ${fmt.labelHeightMm}mm; break-after: page; page-break-after: always; }
      .bc-label:last-child { break-after: auto; page-break-after: auto; }`,
    // labels one after another on the roll, centred across its full width, a dashed line to tear along
    roll: `
      .bc-label { width: 100%; height: ${rollLabelMm}mm; }
      .bc-label + .bc-label { border-top: 0.25mm dashed #000; }`,
    sheet: `
      .bc-sheet { display: grid; grid-template-columns: repeat(${fmt.columns}, 1fr); align-content: start; gap: 3mm; padding: 8mm; height: 297mm; break-after: page; page-break-after: always; }
      .bc-sheet:last-child { break-after: auto; page-break-after: auto; }
      .bc-sheet-label { height: ${fmt.labelHeightMm}mm; border: 0.2mm dashed #999; border-radius: 1mm; }`
  }[fmt.kind]

  const frameId = "slipzo-barcode-print-iframe"
  const old = document.getElementById(frameId)
  if (old && old.parentNode) old.parentNode.removeChild(old)

  const iframe = document.createElement("iframe")
  iframe.id = frameId
  iframe.setAttribute("aria-hidden", "true")
  Object.assign(iframe.style, {
    position: "fixed",
    top: "0",
    left: "-9999px",
    width: `${fmt.pageWidthMm}mm`,
    height: "100mm",
    border: "none",
    visibility: "hidden",
    zIndex: "-9999"
  })
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow.document
  doc.open()
  doc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(cleanBarcode)}</title>
<style>
  ${pageCss}
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  html, body { background: #fff; color: #000; }
  .bc-label {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1mm;
    overflow: hidden;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .bc-svg { display: block; fill: #000; shape-rendering: crispEdges; }
  .bc-text {
    font-family: "Consolas", "Courier New", monospace;
    font-size: ${fmt.textPt}pt;
    font-weight: 700;
    letter-spacing: 0.08em;
    line-height: 1;
    color: #000;
  }
  ${labelCss}
</style>
</head>
<body>${body}</body>
</html>`)
  doc.close()

  setTimeout(() => {
    try {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
    } catch (err) {
      console.error("[printBarcodeLabel] Print trigger failed:", err)
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
      }, 3000)
    }
  }, 200)

  return true
}
