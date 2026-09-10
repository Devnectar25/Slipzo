import { useState, useEffect } from "react"
import { Printer, X, Sliders, Check, ZoomIn, ZoomOut, CheckCircle, RefreshCw, Scissors, Sparkles } from "lucide-react"
import { printReceiptElement } from "../lib/printReceipt"
import { useToast } from "./common/Toast"

export function PrintModal({
  isOpen,
  onClose,
  onPrinted,
  defaultWidth = "58mm",
  elementId = "receipt-to-print"
}) {
  const { success } = useToast()

  // Load initial settings from localStorage or defaults
  const [pageWidth, setPageWidth] = useState(() => {
    const saved = localStorage.getItem("slipzo_print_settings")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.pageWidth) return parsed.pageWidth
      } catch (_) {}
    }
    return defaultWidth || "58mm"
  })

  const [scale, setScale] = useState(() => {
    const saved = localStorage.getItem("slipzo_print_settings")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.scale) return Number(parsed.scale)
      } catch (_) {}
    }
    return 100
  })

  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem("slipzo_print_settings")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.fontSize) return Number(parsed.fontSize)
      } catch (_) {}
    }
    return defaultWidth === "80mm" ? 13.5 : (defaultWidth === "a4" ? 14 : 12)
  })

  const [density, setDensity] = useState(() => {
    const saved = localStorage.getItem("slipzo_print_settings")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.density) return parsed.density
      } catch (_) {}
    }
    return "normal"
  })

  const [highContrast, setHighContrast] = useState(true)
  const [showShopDetails, setShowShopDetails] = useState(true)
  const [showCustomer, setShowCustomer] = useState(true)
  const [showTax, setShowTax] = useState(true)
  const [showFooter, setShowFooter] = useState(true)

  // Update width if defaultWidth prop changes and no saved setting
  useEffect(() => {
    if (defaultWidth && !localStorage.getItem("slipzo_print_settings")) {
      setPageWidth(defaultWidth)
    }
  }, [defaultWidth])

  if (!isOpen) return null

  const handlePrint = () => {
    printReceiptElement(elementId, {
      pageWidth,
      scale: scale / 100,
      fontSize,
      density,
      highContrast,
      showShopDetails,
      showCustomer,
      showTax,
      showFooter
    })
    onClose()
    if (onPrinted) {
      onPrinted()
    }
  }

  const handleSaveDefaults = () => {
    const settings = {
      pageWidth,
      scale,
      fontSize,
      density,
      highContrast
    }
    localStorage.setItem("slipzo_print_settings", JSON.stringify(settings))
    success("Printer defaults saved for this device")
  }

  const handleReset = () => {
    setPageWidth(defaultWidth || "58mm")
    setScale(100)
    setFontSize(defaultWidth === "80mm" ? 11.5 : 10)
    setDensity("normal")
    setHighContrast(true)
    setShowShopDetails(true)
    setShowCustomer(true)
    setShowTax(true)
    setShowFooter(true)
  }

  const previewWidthStyle = pageWidth === "a4" ? "100%" : (pageWidth === "80mm" ? "320px" : "240px")

  return (
    <div className="modal-backdrop print-modal-backdrop fade-in" onClick={onClose}>
      <div className="modal-card print-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="print-modal-header">
          <div className="print-header-left">
            <div className="print-icon-pill">
              <Printer size={18} />
            </div>
            <div>
              <h3>Thermal Print & Paper Setup</h3>
              <p>Configure paper width, text size, and thermal density</p>
            </div>
          </div>
          <div className="print-header-actions">
            <button
              type="button"
              data-testid="header-print-button"
              className="print-header-cta-btn"
              onClick={handlePrint}
            >
              <Printer size={15} /> Print Now
            </button>
            <button className="modal-close-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body: Controls on Left, Live Thermal Preview on Right */}
        <div className="print-modal-body">
          {/* Controls Column */}
          <div className="print-controls-col">
            {/* Paper Size / Width Selector */}
            <div className="print-control-group">
              <label className="print-group-label">
                <span>Paper Width / Format</span>
                <span className="label-badge">{pageWidth.toUpperCase()}</span>
              </label>
              <div className="paper-format-pills">
                <button
                  type="button"
                  className={`paper-format-btn ${pageWidth === "58mm" ? "active" : ""}`}
                  onClick={() => {
                    setPageWidth("58mm")
                    if (fontSize > 11) setFontSize(10)
                  }}
                >
                  <span className="format-name">58mm Thermal</span>
                  <span className="format-desc">2-inch Portable / POS-58</span>
                </button>
                <button
                  type="button"
                  className={`paper-format-btn ${pageWidth === "80mm" ? "active" : ""}`}
                  onClick={() => {
                    setPageWidth("80mm")
                    if (fontSize < 11) setFontSize(11.5)
                  }}
                >
                  <span className="format-name">80mm Thermal</span>
                  <span className="format-desc">3-inch Retail Counter</span>
                </button>
                <button
                  type="button"
                  className={`paper-format-btn ${pageWidth === "a4" ? "active" : ""}`}
                  onClick={() => {
                    setPageWidth("a4")
                    setFontSize(13)
                  }}
                >
                  <span className="format-name">A4 Sheet</span>
                  <span className="format-desc">Standard Desk Printer</span>
                </button>
              </div>
            </div>

            {/* Print Scale Adjuster */}
            <div className="print-control-group">
              <div className="print-label-row">
                <label className="print-group-label">Print Scale / Zoom</label>
                <span className="val-pill">{scale}%</span>
              </div>
              <div className="slider-with-presets">
                <input
                  type="range"
                  min="75"
                  max="125"
                  step="5"
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                  className="print-range-slider"
                />
                <div className="preset-chip-row">
                  <button
                    type="button"
                    className={`preset-chip ${scale === 85 ? "active" : ""}`}
                    onClick={() => setScale(85)}
                  >
                    85% Compact
                  </button>
                  <button
                    type="button"
                    className={`preset-chip ${scale === 100 ? "active" : ""}`}
                    onClick={() => setScale(100)}
                  >
                    100% Normal
                  </button>
                  <button
                    type="button"
                    className={`preset-chip ${scale === 115 ? "active" : ""}`}
                    onClick={() => setScale(115)}
                  >
                    115% Large
                  </button>
                </div>
              </div>
            </div>

            {/* Font Size Selector */}
            <div className="print-control-group">
              <div className="print-label-row">
                <label className="print-group-label">Font Size</label>
                <span className="val-pill">{fontSize}px</span>
              </div>
              <div className="button-group-row">
                <button
                  type="button"
                  className={`segment-btn ${fontSize <= 11 ? "active" : ""}`}
                  onClick={() => setFontSize(10.5)}
                >
                  Compact (10.5px)
                </button>
                <button
                  type="button"
                  className={`segment-btn ${fontSize > 11 && fontSize <= 13 ? "active" : ""}`}
                  onClick={() => setFontSize(12)}
                >
                  Standard (12px)
                </button>
                <button
                  type="button"
                  className={`segment-btn ${fontSize > 13 ? "active" : ""}`}
                  onClick={() => setFontSize(14)}
                >
                  Large (14px)
                </button>
              </div>
            </div>

            {/* Line Spacing / Density */}
            <div className="print-control-group">
              <label className="print-group-label">Line Spacing / Density</label>
              <div className="button-group-row">
                <button
                  type="button"
                  className={`segment-btn ${density === "tight" ? "active" : ""}`}
                  onClick={() => setDensity("tight")}
                >
                  Tight (Eco)
                </button>
                <button
                  type="button"
                  className={`segment-btn ${density === "normal" ? "active" : ""}`}
                  onClick={() => setDensity("normal")}
                >
                  Normal
                </button>
                <button
                  type="button"
                  className={`segment-btn ${density === "relaxed" ? "active" : ""}`}
                  onClick={() => setDensity("relaxed")}
                >
                  Relaxed
                </button>
              </div>
            </div>

            {/* Toggles */}
            <div className="print-control-group toggles-group">
              <label className="print-group-label">Receipt Content Options</label>
              <div className="print-checkbox-grid">
                <label className="print-checkbox-label">
                  <input
                    type="checkbox"
                    checked={highContrast}
                    onChange={(e) => setHighContrast(e.target.checked)}
                  />
                  <span>High-Contrast Pure Black (Thermal Needle)</span>
                </label>
                <label className="print-checkbox-label">
                  <input
                    type="checkbox"
                    checked={showShopDetails}
                    onChange={(e) => setShowShopDetails(e.target.checked)}
                  />
                  <span>Shop Address & Phone</span>
                </label>
                <label className="print-checkbox-label">
                  <input
                    type="checkbox"
                    checked={showCustomer}
                    onChange={(e) => setShowCustomer(e.target.checked)}
                  />
                  <span>Customer Details</span>
                </label>
                <label className="print-checkbox-label">
                  <input
                    type="checkbox"
                    checked={showTax}
                    onChange={(e) => setShowTax(e.target.checked)}
                  />
                  <span>Tax / GST Breakdown</span>
                </label>
                <label className="print-checkbox-label">
                  <input
                    type="checkbox"
                    checked={showFooter}
                    onChange={(e) => setShowFooter(e.target.checked)}
                  />
                  <span>Footer Note & Thank You</span>
                </label>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="print-helper-box">
              <Sparkles size={14} className="helper-icon" />
              <p>
                <strong>Thermal Setup Tip:</strong> In the browser's print dialog, choose your thermal printer, set <strong>Margins to None</strong>, and verify paper size matches <strong>{pageWidth}</strong>.
              </p>
            </div>
          </div>

          {/* Live Thermal Preview Column */}
          <div className="print-preview-col">
            <div className="preview-col-header">
              <span className="live-badge">LIVE THERMAL TICKET PREVIEW</span>
              <span className="paper-width-badge">
                {pageWidth === "a4" ? "A4 (210mm)" : `${pageWidth} Roll Tape`}
              </span>
            </div>

            {/* Thermal Ticket Rendering */}
            <div className="thermal-roll-stage">
              <div className="thermal-paper-tape" style={{ width: previewWidthStyle }}>
                {/* Jagged / Tear paper top */}
                <div className="thermal-tear-edge-top" />

                <div
                  className="thermal-paper-inner"
                  style={{
                    fontSize: `${fontSize}px`,
                    transform: `scale(${scale / 100})`,
                    transformOrigin: "top center",
                    fontWeight: highContrast ? "600" : "normal"
                  }}
                >
                  <div className="thermal-preview-mock">
                    <div className="thermal-mock-shop">
                      <h4>SLIPZO MART</h4>
                      {showShopDetails && (
                        <>
                          <p>123 Commercial Street, Indiranagar</p>
                          <p>Ph: +91 98765 43210 · GSTIN: 29AAAAA0000A1Z5</p>
                        </>
                      )}
                    </div>

                    <div className="thermal-mock-meta">
                      <span>#INV-1029</span>
                      <span>10 Sep 2026, 02:00 PM</span>
                    </div>

                    {showCustomer && (
                      <div className="thermal-mock-customer">
                        <span>Customer: Walk-in</span>
                        <span>Cashier: Admin</span>
                      </div>
                    )}

                    <div className="thermal-mock-divider" />

                    <div className="thermal-mock-table">
                      <div className="thermal-mock-row head">
                        <span>ITEM</span>
                        <span className="tc">QTY</span>
                        <span className="tr">RATE</span>
                        <span className="tr">AMT</span>
                      </div>
                      <div className="thermal-mock-row">
                        <span>Basmati Rice 1kg</span>
                        <span className="tc">2</span>
                        <span className="tr">₹120</span>
                        <span className="tr">₹240</span>
                      </div>
                      <div className="thermal-mock-row">
                        <span>Sunflower Oil 1L</span>
                        <span className="tc">1</span>
                        <span className="tr">₹195</span>
                        <span className="tr">₹195</span>
                      </div>
                    </div>

                    <div className="thermal-mock-divider" />

                    <div className="thermal-mock-totals">
                      <div className="mock-total-line">
                        <span>Subtotal</span>
                        <span>₹435.00</span>
                      </div>
                      {showTax && (
                        <div className="mock-total-line">
                          <span>GST (18%)</span>
                          <span>₹78.30</span>
                        </div>
                      )}
                      <div className="mock-grand-total">
                        <span>TOTAL</span>
                        <span>{showTax ? "₹513.30" : "₹435.00"}</span>
                      </div>
                    </div>

                    {showFooter && (
                      <div className="thermal-mock-footer">
                        <span>Payment: Cash</span>
                        <p>Thank you for shopping with us!</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Jagged / Tear paper bottom */}
                <div className="thermal-tear-edge-bottom" />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="print-modal-footer">
          <div className="footer-left">
            <button type="button" className="text-btn" onClick={handleReset}>
              <RefreshCw size={13} /> Reset
            </button>
            <button type="button" className="text-btn" onClick={handleSaveDefaults}>
              <Check size={13} /> Save Defaults
            </button>
          </div>
          <div className="footer-right">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="primary-button print-main-cta" onClick={handlePrint}>
              <Printer size={16} /> Print {pageWidth} Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
