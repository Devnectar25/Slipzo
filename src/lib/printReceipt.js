/**
 * printReceipt.js
 * Opens a full-screen popup window and prints the receipt.
 *
 * @param {string} elementId  - ID of the receipt DOM element
 * @param {string} pageWidth  - Paper width: "58mm" or "80mm" (default "58mm")
 */

export function printReceiptElement(elementId = "receipt-to-print", pageWidth = "58mm") {
  const el = document.getElementById(elementId)
  if (!el) {
    console.error(`[printReceipt] Element #${elementId} not found`)
    alert("Could not find receipt to print. Please try again.")
    return
  }

  // Clone the element to avoid modifying the original
  const clone = el.cloneNode(true)

  // Clean up any inline styles that might interfere
  clone.style.margin = '0 auto'
  clone.style.maxWidth = pageWidth === "80mm" ? '80mm' : '58mm'
  clone.style.width = '100%'
  clone.style.boxSizing = 'border-box'

  const receiptHTML = clone.outerHTML

  // Use the full available screen for the popup window
  const availW = window.screen.availWidth || 1440
  const availH = window.screen.availHeight || 900

  // Open popup at full available screen size, anchored to top-left
  const printWindow = window.open(
    "",
    "SlipzoReceipt",
    `width=${availW},height=${availH},left=0,top=0,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no`
  )

  if (!printWindow) {
    alert("Popup blocked! Please allow popups for localhost to enable receipt printing.")
    return
  }

  // Best-effort: move and resize to fill the available screen
  try {
    printWindow.moveTo(0, 0)
    printWindow.resizeTo(availW, availH)
  } catch (_) { /* silently ignore if browser blocks */ }

  const isThermal = pageWidth === "58mm" || pageWidth === "80mm"
  const paperSizeName = pageWidth === "58mm" ? "58mm thermal" : pageWidth === "80mm" ? "80mm thermal" : pageWidth

  printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Receipt – Slipzo</title>
  <style>
    /* ===== RESET ===== */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    /* ===== SCREEN VIEW ===== */
    html {
      background: #e0e0e0;
      min-height: 100%;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 24px;
      padding-bottom: 24px;
    }

    body {
      background: #ffffff;
      color: #000000;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      line-height: 1.45;

      /* Exact paper width on screen */
      width: ${pageWidth};
      min-width: ${pageWidth};
      max-width: ${pageWidth};
      box-sizing: border-box;

      margin: 0 auto;
      padding: 6px 8px 16px;

      /* Subtle card shadow */
      box-shadow: 0 2px 12px rgba(0,0,0,0.18);
    }

    /* ===== PRINT MEDIA ===== */
    @media print {
      /* Remove all backgrounds and shadows */
      * {
        background: transparent !important;
        box-shadow: none !important;
      }

      @page {
        /* Set exact paper size - this is the key for thermal printers */
        size: ${pageWidth} auto;
        margin: 0;
      }

      html {
        background: #ffffff !important;
        display: block !important;
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
        min-height: auto !important;
      }

      body {
        width: ${pageWidth} !important;
        min-width: ${pageWidth} !important;
        max-width: ${pageWidth} !important;
        margin: 0 auto !important;
        padding: 3mm 2mm !important;
        box-shadow: none !important;
        display: block !important;
        background: #ffffff !important;
        font-size: 10px !important;
      }

      /* Ensure all content fits within the thermal width */
      .receipt-shop,
      .receipt-meta,
      .receipt-customer-line,
      .receipt-items,
      .receipt-totals,
      .receipt-footer {
        max-width: 100% !important;
        overflow: hidden !important;
      }

      .receipt-items-header,
      .receipt-item-row {
        display: grid !important;
        grid-template-columns: 2fr 0.5fr 0.8fr 1fr !important;
        gap: 2px !important;
        max-width: 100% !important;
      }

      .receipt-item-name {
        white-space: normal !important;
        word-break: break-word !important;
        overflow: visible !important;
      }
    }

    /* ===== RECEIPT SECTIONS ===== */
    .receipt-shop {
      text-align: center;
      padding-bottom: 5px;
      border-bottom: 1px dashed #000;
      margin-bottom: 5px;
    }

    .receipt-logo {
      display: none;
    }

    .receipt-shop-name {
      font-size: 15px;
      font-weight: 900;
      letter-spacing: 0.3px;
      color: #000;
      margin-bottom: 2px;
    }

    .receipt-shop p,
    .receipt-shop-address,
    .receipt-shop-phone {
      font-size: 9px;
      color: #222;
      display: block;
      text-align: center;
      margin: 1px 0;
    }

    svg { display: none !important; }

    .receipt-meta {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #000;
      padding: 3px 0;
      border-bottom: 1px dashed #555;
      margin-bottom: 4px;
    }

    .receipt-customer-line {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #000;
      padding: 2px 0;
      margin-bottom: 2px;
    }

    .receipt-divider {
      border: none;
      border-top: 1px dashed #000;
      margin: 4px 0;
    }

    .receipt-items {
      margin-bottom: 4px;
    }

    .receipt-items-header {
      display: grid;
      grid-template-columns: 2fr 0.5fr 1fr 1fr;
      gap: 2px;
      font-size: 9px;
      font-weight: 700;
      padding: 2px 0;
      border-bottom: 1px solid #000;
      margin-bottom: 2px;
    }

    .receipt-item-row {
      display: grid;
      grid-template-columns: 2fr 0.5fr 1fr 1fr;
      gap: 2px;
      font-size: 9px;
      padding: 2px 0;
    }

    .receipt-item-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
      color: #000;
    }

    .receipt-item-qty {
      text-align: center;
      color: #000;
    }

    .receipt-item-rate,
    .receipt-item-amount {
      text-align: right;
      color: #000;
    }

    .receipt-empty-items {
      text-align: center;
      padding: 8px 0;
      color: #444;
      font-size: 10px;
    }

    .receipt-totals {
      padding-top: 3px;
    }

    .receipt-total-row {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      padding: 1px 0;
      color: #000;
    }

    .receipt-grand-total {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      font-weight: 900;
      padding: 4px 0 3px;
      margin-top: 3px;
      border-top: 2px solid #000;
      color: #000;
    }

    .receipt-footer {
      text-align: center;
      padding-top: 4px;
      border-top: 1px dashed #000;
      margin-top: 4px;
    }

    .receipt-payment {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      font-weight: 700;
      color: #000;
      margin-bottom: 3px;
    }

    .receipt-thanks {
      font-size: 9px;
      color: #333;
      margin-top: 2px;
      font-style: italic;
    }

    .print-btn-bar {
      margin-top: 12px;
      text-align: center;
      padding: 12px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    @media print {
      .print-btn-bar { display: none !important; }
    }

    .print-btn {
      background: #0f172a;
      color: #fff;
      border: none;
      padding: 8px 24px;
      font-size: 13px;
      font-family: sans-serif;
      border-radius: 6px;
      cursor: pointer;
      letter-spacing: 0.3px;
    }

    .print-btn:hover { background: #1e293b; }

    .print-tip {
      font-family: sans-serif;
      font-size: 11px;
      color: #555;
      margin-bottom: 8px;
      line-height: 1.5;
    }

    .print-tip strong {
      color: #0f172a;
      background: #f1f5f9;
      padding: 1px 6px;
      border-radius: 4px;
    }

    .print-tip .highlight {
      color: #0ea5e9;
      font-weight: 600;
    }
  </style>
</head>
<body>
  ${receiptHTML}

  <div class="print-btn-bar">
    <p class="print-tip">
      📄 <strong>Important:</strong> In the print dialog, click <strong>More settings</strong> → 
      set <strong>Paper size</strong> to <span class="highlight">${paperSizeName}</span> 
      and <strong>Margins</strong> to <span class="highlight">None</span>
      <br/>
      <span style="font-size: 10px; color: #94a3b8;">
        ⚡ If "${paperSizeName}" isn't available, choose "Custom" and set width to ${pageWidth}
      </span>
    </p>
    <button class="print-btn" onclick="window.print()">🖨️ Print Receipt</button>
  </div>

  <script>
    // Auto-open print dialog after a short delay
    window.addEventListener('load', function () {
      setTimeout(function () {
        window.print();
      }, 500);
    });

    // Close window automatically after printing
    window.addEventListener('afterprint', function () {
      setTimeout(function () { window.close(); }, 500);
    });
  </script>
</body>
</html>`)

  printWindow.document.close()
  printWindow.focus()
}