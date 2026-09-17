import { useState, useEffect } from "react"
import { Printer, X, Check, RefreshCw, Sparkles } from "lucide-react"
import { printReceiptElement } from "../lib/printReceipt"
import { call, syncUserQuota, canPrintFree, getActivePlanDetails, incrementFreePrintCount } from "../lib/utils"
import { ButtonLoader } from "./common/Skeleton"
import { useToast } from "./common/Toast"
import Swal from "sweetalert2"

export function PrintModal({
  isOpen,
  onClose,
  onPrinted,
  defaultWidth = "58mm",
  elementId = "receipt-to-print"
}) {
  const { success, error: toastError } = useToast()
  const [isSubmittingPrint, setIsSubmittingPrint] = useState(false)

  // Load initial settings from localStorage or defaults
  const [pageWidth, setPageWidth] = useState(() => {
    const saved = localStorage.getItem("slipzo_print_settings")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.pageWidth) {
          if (parsed.pageWidth === "55mm") return "55mm"
          if (parsed.pageWidth === "80mm") return "80mm"
        }
      } catch (_) { }
    }
    if (defaultWidth === "55mm") return "55mm"
    return "80mm"
  })

  const [scale, setScale] = useState(() => {
    const saved = localStorage.getItem("slipzo_print_settings")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.scale) return Number(parsed.scale)
      } catch (_) { }
    }
    return 100
  })

  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem("slipzo_print_settings")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.fontSize) return Number(parsed.fontSize)
      } catch (_) { }
    }
    return (defaultWidth === "55mm") ? 10.5 : 12.5
  })

  const [density, setDensity] = useState(() => {
    const saved = localStorage.getItem("slipzo_print_settings")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.density) return parsed.density
      } catch (_) { }
    }
    return "normal"
  })

  const [highContrast, setHighContrast] = useState(true)
  const [showShopDetails, setShowShopDetails] = useState(true)
  const [showCustomer, setShowCustomer] = useState(true)
  const [showTax, setShowTax] = useState(true)
  const [showFooter, setShowFooter] = useState(true)

  // Update width if defaultWidth prop changes or when modal opens
  useEffect(() => {
    if (defaultWidth) {
      const sanitized = (defaultWidth === "55mm") ? "55mm" : "80mm"
      setPageWidth(sanitized)
      if (sanitized === "55mm") {
        setFontSize(10.5)
      } else if (sanitized === "80mm") {
        setFontSize(12.5)
      }
    }
  }, [defaultWidth, isOpen])

  const [realReceiptHTML, setRealReceiptHTML] = useState("")

  useEffect(() => {
    if (isOpen && elementId) {
      const el = document.getElementById(elementId)
      if (el) {
        const clone = el.cloneNode(true)
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
        clone.removeAttribute("id")
        setRealReceiptHTML(clone.innerHTML)
      }
    }
  }, [isOpen, elementId, showShopDetails, showCustomer, showTax, showFooter])

  if (!isOpen) return null

  const handlePrint = async () => {
    if (isSubmittingPrint) return
    setIsSubmittingPrint(true)

    const token = typeof window !== "undefined" ? localStorage.getItem("slipzo_token") : null

    try {
      if (token) {
        // Authenticated user: call backend /subscriptions/consume-print
        let quota = null
        try {
          const res = await call("/subscriptions/consume-print", {
            method: "POST"
          })
          if (res && res.quota) {
            quota = res.quota
            syncUserQuota(res.quota)
          }
        } catch (err) {
          console.error("Print quota deduction failed:", err)
          const errMsg = err?.detail || err?.message || "No print credits available"
          const plan = getActivePlanDetails()

          if (plan?.isFreeTier || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("0 prints")) {
            window.dispatchEvent(new CustomEvent("slipzo-show-free-reward-expired", { detail: { force: true } }))
          } else {
            Swal.fire({
              title: "Print Quota Limit Reached",
              text: errMsg,
              icon: "warning",
              confirmButtonText: "View Pricing Plans",
              confirmButtonColor: "#0ea5e9"
            })
          }
          setIsSubmittingPrint(false)
          return
        }

        // Trigger physical print after successful deduction
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
          onPrinted(quota)
        }

        // Show expiry popup if user just reached 0 remaining prints on free tier
        if (quota && quota.isFreeTier && Number(quota.printsRemaining) === 0) {
          window.dispatchEvent(new CustomEvent("slipzo-show-free-reward-expired", { detail: { force: true } }))
        }
      } else {
        // Guest user: check local quota
        if (!canPrintFree()) {
          window.dispatchEvent(new CustomEvent("slipzo-show-free-reward-expired", { detail: { force: true } }))
          setIsSubmittingPrint(false)
          return
        }

        incrementFreePrintCount()

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

        const plan = getActivePlanDetails()
        if (plan?.isFreeTier && Number(plan.printsRemaining) <= 0) {
          window.dispatchEvent(new CustomEvent("slipzo-show-free-reward-expired", { detail: { force: true } }))
        }
      }
    } catch (err) {
      console.error("Failed to execute print:", err)
      if (toastError) toastError(err.message || "Failed to print receipt")
    } finally {
      setIsSubmittingPrint(false)
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
    const resetWidth = (defaultWidth === "55mm") ? "55mm" : "80mm"
    setPageWidth(resetWidth)
    setScale(100)
    setFontSize(resetWidth === "55mm" ? 10.5 : 12.5)
    setDensity("normal")
    setHighContrast(true)
    setShowShopDetails(true)
    setShowCustomer(true)
    setShowTax(true)
    setShowFooter(true)
  }

  const previewWidthStyle = pageWidth === "80mm" ? "320px" : "220px"

  const previewLineHeight = density === "tight" ? 1.3 : (density === "relaxed" ? 1.75 : 1.5)
  const previewItemPadding = density === "tight" ? "2px 0" : (density === "relaxed" ? "6px 0" : "3.5px 0")
  const previewTotalPadding = density === "tight" ? "1.5px 0" : (density === "relaxed" ? "4.5px 0" : "2.5px 0")
  const previewDividerMargin = density === "tight" ? "3px 0" : (density === "relaxed" ? "8px 0" : "5px 0")
  const previewShopMargin = density === "tight" ? "4px" : (density === "relaxed" ? "10px" : "7px")

  const titleSize = Math.round(fontSize * 1.35)
  const bodySize = fontSize
  const subSize = Math.max(9, Math.round(fontSize * 0.9))
  const grandTotalSize = Math.round(fontSize * 1.25)

  return (
    <div className="modal-backdrop print-modal-backdrop fade-in" onClick={onClose}>
      <div className="modal-card print-modal-card print-modal-card--stacked" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header (Print Now & X buttons removed) */}
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
        </div>

        {/* Modal Body: Stacked layout — Controls on top, Preview below */}
        <div className="print-modal-body print-modal-body--stacked">
          {/* Controls Section */}
          <div className="print-controls-col print-controls-col--single">
            <div className="print-control-group">
              <label className="print-group-label">
                <span>Paper Width / Format</span>
                <span className="label-badge">{pageWidth.toUpperCase()}</span>
              </label>
              <div className="paper-format-pills paper-format-pills--two">
                <button
                  type="button"
                  className={`paper-format-btn ${pageWidth === "55mm" ? "active" : ""}`}
                  onClick={() => {
                    setPageWidth("55mm")
                    setFontSize(10.5)
                  }}
                >
                  <span className="format-name">55mm Thermal</span>
                  <span className="format-desc">2-inch Compact Roll</span>
                </button>
                <button
                  type="button"
                  className={`paper-format-btn ${pageWidth === "80mm" ? "active" : ""}`}
                  onClick={() => {
                    setPageWidth("80mm")
                    setFontSize(12.5)
                  }}
                >
                  <span className="format-name">80mm Thermal</span>
                  <span className="format-desc">3-inch Retail Counter</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Thermal Preview Section */}
          <div className="print-preview-col">
            <div className="preview-col-header">
              <span className="live-badge">LIVE THERMAL TICKET PREVIEW</span>
              <span className="paper-width-badge">
                {pageWidth === "55mm" ? "55mm Roll Tape" : "80mm Roll Tape"}
              </span>
            </div>

            <div className="thermal-roll-stage">
              <div
                className="thermal-paper-tape"
                style={{
                  width: previewWidthStyle,
                  transform: `scale(${scale / 100})`,
                  transformOrigin: "top center",
                  transition: "transform 0.2s ease, width 0.2s ease"
                }}
              >
                <div className="thermal-tear-edge-top" />

                <div
                  className="thermal-paper-inner"
                  style={{
                    fontSize: `${fontSize}px`,
                    lineHeight: previewLineHeight,
                    fontWeight: highContrast ? "600" : "normal"
                  }}
                >
                  <style>{`
                    .thermal-paper-inner,
                    .thermal-paper-inner .receipt-preview-content {
                      font-size: ${bodySize}px !important;
                      line-height: ${previewLineHeight} !important;
                    }
                    .thermal-paper-inner .receipt-shop-name,
                    .thermal-paper-inner .thermal-mock-shop h4 {
                      font-size: ${titleSize}px !important;
                      line-height: 1.2 !important;
                    }
                    .thermal-paper-inner .receipt-shop p,
                    .thermal-paper-inner .receipt-shop-address,
                    .thermal-paper-inner .receipt-shop-phone,
                    .thermal-paper-inner .receipt-customer-line,
                    .thermal-paper-inner .thermal-mock-customer {
                      font-size: ${subSize}px !important;
                      line-height: ${previewLineHeight} !important;
                    }
                    .thermal-paper-inner .receipt-meta,
                    .thermal-paper-inner .thermal-mock-meta {
                      font-size: ${subSize}px !important;
                      line-height: ${previewLineHeight} !important;
                      display: flex !important;
                      justify-content: space-between !important;
                      align-items: center !important;
                      flex-wrap: wrap !important;
                      row-gap: 2px !important;
                      column-gap: 6px !important;
                    }
                    .thermal-paper-inner .receipt-items-header,
                    .thermal-paper-inner .receipt-item-row,
                    .thermal-paper-inner .thermal-mock-row {
                      display: grid !important;
                      grid-template-columns: ${pageWidth === "55mm"
                      ? "1.15fr 0.35fr 1.05fr 1.15fr"
                      : "2.2fr 0.5fr 1fr 1fr"
                    } !important;
                      gap: 4px !important;
                      font-size: ${bodySize}px !important;
                      padding: ${previewItemPadding} !important;
                      line-height: ${previewLineHeight} !important;
                      align-items: start !important;
                    }
                    .thermal-paper-inner .receipt-item-name {
                      word-break: break-word !important;
                      overflow-wrap: break-word !important;
                      white-space: normal !important;
                    }
                    .thermal-paper-inner .receipt-item-qty,
                    .thermal-paper-inner .thermal-mock-row .tc {
                      text-align: center !important;
                      white-space: nowrap !important;
                    }
                    .thermal-paper-inner .receipt-item-rate,
                    .thermal-paper-inner .receipt-item-amount,
                    .thermal-paper-inner .thermal-mock-row .tr {
                      text-align: right !important;
                      white-space: nowrap !important;
                    }
                    .thermal-paper-inner .receipt-items-header span:last-child {
                      text-align: right !important;
                    }
                    .thermal-paper-inner .receipt-total-row,
                    .thermal-paper-inner .mock-total-line {
                      font-size: ${bodySize}px !important;
                      padding: ${previewTotalPadding} !important;
                    }
                    .thermal-paper-inner .receipt-grand-total,
                    .thermal-paper-inner .mock-grand-total {
                      font-size: ${grandTotalSize}px !important;
                      padding: ${previewItemPadding} !important;
                      margin-top: ${previewDividerMargin} !important;
                    }
                    .thermal-paper-inner .receipt-divider,
                    .thermal-paper-inner .thermal-mock-divider {
                      margin: ${previewDividerMargin} !important;
                    }
                    .thermal-paper-inner .receipt-shop,
                    .thermal-paper-inner .thermal-mock-shop {
                      padding-bottom: ${previewShopMargin} !important;
                      margin-bottom: ${previewShopMargin} !important;
                    }
                    .thermal-paper-inner .receipt-footer,
                    .thermal-paper-inner .thermal-mock-footer {
                      padding-top: ${previewDividerMargin} !important;
                      margin-top: ${previewDividerMargin} !important;
                    }
                    .thermal-paper-inner .receipt-payment,
                    .thermal-paper-inner .receipt-thanks,
                    .thermal-paper-inner .thermal-mock-footer p {
                      font-size: ${subSize}px !important;
                      line-height: ${previewLineHeight} !important;
                    }
                  `}</style>
                  {realReceiptHTML ? (
                    <div
                      className={`receipt-preview-content format-${pageWidth}`}
                      style={{
                        padding: 0,
                        margin: 0,
                        border: "none",
                        boxShadow: "none",
                        background: "transparent",
                        width: "100%",
                        maxWidth: "100%"
                      }}
                      dangerouslySetInnerHTML={{ __html: realReceiptHTML }}
                    />
                  ) : (
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
                  )}
                </div>

                <div className="thermal-tear-edge-bottom" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions: Only Cancel + Print, in one straight line under preview */}
        <div className="print-modal-footer print-modal-footer--single-row">
          <button type="button" className="secondary-button" onClick={onClose} disabled={isSubmittingPrint}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-button print-main-cta"
            onClick={handlePrint}
            disabled={isSubmittingPrint}
            style={isSubmittingPrint ? { opacity: 0.8, cursor: "not-allowed" } : undefined}
          >
            {isSubmittingPrint ? (
              <ButtonLoader text="Printing..." size={15} />
            ) : (
              <>
                <Printer size={15} />
                <span className="cta-full-text">Print {pageWidth} Receipt</span>
                <span className="cta-short-text">Print {pageWidth}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}