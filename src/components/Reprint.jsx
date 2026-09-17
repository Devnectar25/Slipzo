import { useEffect, useState } from "react"
import { ArrowLeft, Printer, User } from "lucide-react"
import { call, money, cleanTextLines, canPrintFree, getActivePlanDetails } from "../lib/utils"
import { printReceiptElement } from "../lib/printReceipt"
import { PrintModal } from "./PrintModal"
import { ReceiptSkeleton, ButtonLoader } from "./common/Skeleton"
import { useToast } from "./common/Toast"
import Swal from "sweetalert2"

export function Reprint({ billId, setView }) {
  const [bill, setBill] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)

  const { success } = useToast()

  const actualBillId = billId || sessionStorage.getItem("slipzo-reprint-id")

  useEffect(() => {
    const loadBill = async () => {
      try {
        setLoading(true)
        if (!actualBillId) {
          setError("No bill selected")
          return
        }
          const data = await call(`/bills/${actualBillId}`)
          if (data && typeof data === "object") {
            let parsedItems = data.items
            if (typeof parsedItems === "string") {
              try { parsedItems = JSON.parse(parsedItems) } catch(e) { parsedItems = [] }
            }
            if (!Array.isArray(parsedItems)) parsedItems = []
            setBill({ ...data, items: parsedItems })
          } else {
            setBill(null)
          }
      } catch (err) {
        console.error("Failed to load bill:", err)
        setError(err.message || "Failed to load bill")
      } finally {
        setLoading(false)
      }
    }

    loadBill()
  }, [actualBillId])

  const [printFormat, setPrintFormat] = useState(() => {
    const saved = localStorage.getItem("slipzo_print_settings")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.pageWidth) {
          if (parsed.pageWidth === "55mm" || parsed.pageWidth === "55") return "55mm"
          if (parsed.pageWidth === "80mm" || parsed.pageWidth === "80") return "80mm"
          if (parsed.pageWidth === "a4") return "a4"
        }
      } catch (_) { }
    }
    return "80mm"
  })

  const handleFormatChange = (fmt) => {
    setPrintFormat(fmt)
    const saved = localStorage.getItem("slipzo_print_settings")
    let settings = {}
    if (saved) {
      try { settings = JSON.parse(saved) } catch (_) { }
    }
    settings.pageWidth = fmt
    localStorage.setItem("slipzo_print_settings", JSON.stringify(settings))
  }

  const printReceipt = () => {
    if (!canPrintFree()) {
      const plan = getActivePlanDetails()
      if (plan?.isFreeTier) {
        window.dispatchEvent(new CustomEvent("slipzo-show-free-reward-expired", { detail: { force: true } }))
      } else {
        Swal.fire({
          title: "Print Quota Reached",
          text: "You have used all available prints in your plan. Please select a plan to add print credits and continue.",
          icon: "warning",
          confirmButtonText: "View Pricing Plans",
          confirmButtonColor: "#0ea5e9"
        }).then(() => {
          setView?.("pricing")
        })
      }
      return
    }
    setShowPrintModal(true)
  }

  if (loading) {
    return (
      <div className="page reprint-page fade-in">
        <div className="page-intro">
          <div>
            <p className="eyebrow accent">SAVED RECEIPT</p>
            <h2>Loading Receipt...</h2>
          </div>
        </div>
        <div style={{ maxWidth: "380px", margin: "0 auto" }}>
          <ReceiptSkeleton />
        </div>
      </div>
    )
  }

  if (error || !bill) {
    return (
      <div className="page reprint-page fade-in">
        <div className="error-message">{error || "Bill not found"}</div>
        <button
          className="secondary-button"
          onClick={() => setView("history")}
          style={{ marginTop: "1rem" }}
        >
          <ArrowLeft size={16} /> Back to history
        </button>
      </div>
    )
  }

  return (
    <div className="page reprint-page fade-in">
      <div className="page-intro">
        <div>
          <p className="eyebrow accent">SAVED RECEIPT</p>
          <h2>{bill.number}</h2>
          <p className="subtle">
            {new Date(bill.created_at).toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            })}
          </p>
        </div>
        <div className="bill-header-actions">
          <button className="secondary-button" onClick={() => setView("history")}>
            <ArrowLeft size={16} /> Back
          </button>
          <button className="primary-button" onClick={printReceipt} disabled={isPrinting}>
            {isPrinting ? <ButtonLoader text="Printing..." /> : <><Printer size={16} /> Print</>}
          </button>
        </div>
      </div>

      <div className="receipt-preview-panel" style={{ maxWidth: printFormat === "a4" ? "600px" : (printFormat === "80mm" ? "400px" : "280px"), margin: "0 auto", transition: "max-width 0.2s ease" }}>
        <div className="preview-header" style={{ marginBottom: "0.75rem" }}>
          <div className="preview-title-wrap">
            <span className="preview-badge">
              {printFormat === "a4" ? "A4 Sheet" : `${printFormat} Thermal`}
            </span>
          </div>
          <div className="print-format-toggle-group" role="group" aria-label="Print Size">
            <button
              type="button"
              className={`format-toggle-btn ${printFormat === "55mm" ? "active" : ""}`}
              onClick={() => handleFormatChange("55mm")}
              title="55mm Thermal Roll"
            >
              55mm
            </button>
            <button
              type="button"
              className={`format-toggle-btn ${printFormat === "80mm" ? "active" : ""}`}
              onClick={() => handleFormatChange("80mm")}
              title="80mm Thermal Roll"
            >
              80mm
            </button>
            <button
              type="button"
              className={`format-toggle-btn ${printFormat === "a4" ? "active" : ""}`}
              onClick={() => handleFormatChange("a4")}
              title="A4 Standard Document"
            >
              A4
            </button>
          </div>
        </div>
        <div id="receipt-to-print" className={`receipt-preview-content format-${printFormat}`}>
          {/* Shop Header */}
          <div className="receipt-shop">
            <div className="receipt-logo">S</div>
            <h2 className="receipt-shop-name">
              {cleanTextLines(bill.shop_name || "Slipzo Shop").map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </h2>
            {bill.shop_address && cleanTextLines(bill.shop_address).length > 0 && (
              <div className="receipt-shop-address">
                {cleanTextLines(bill.shop_address).map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
              </div>
            )}
            {bill.shop_phone && (
              <p className="receipt-shop-phone">{bill.shop_phone}</p>
            )}
          </div>

          {/* Receipt Meta */}
          <div className="receipt-meta">
            <span className="receipt-number" style={{ whiteSpace: 'nowrap' }}>#{bill.number}</span>
            <span className="receipt-date" style={{ whiteSpace: 'nowrap' }}>
              {new Date(bill.created_at).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric"
              })}
            </span>
          </div>

          {/* Customer Line */}
          {bill.customer_name && (
            <div className="receipt-customer-line">
              <span>Customer: <b>{bill.customer_name}</b></span>
              {bill.customer_phone && <small>Ph: {bill.customer_phone}</small>}
            </div>
          )}

          {/* Divider */}
          <div className="receipt-divider"></div>

          {/* Items */}
          <div className="receipt-items">
            <div className="receipt-items-header">
              <span>Item</span>
              <span>Qty</span>
              <span>Rate</span>
              <span>Amount</span>
            </div>
            {Array.isArray(bill.items) && bill.items.length > 0 ? (
              bill.items.map((item, index) => {
                const qty = Number(item.quantity) || 0
                const rate = Number(item.rate) || 0
                const amount = qty * rate
                return (
                  <div className="receipt-item-row" key={item.id || index}>
                    <span className="receipt-item-name">{item.name}</span>
                    <span className="receipt-item-qty">{qty}</span>
                    <span className="receipt-item-rate">{money(rate)}</span>
                    <span className="receipt-item-amount">{money(amount)}</span>
                  </div>
                )
              })
            ) : (
              <div className="receipt-empty-items">
                <p>No items found</p>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="receipt-totals">
            <div className="receipt-total-row">
              <span>Subtotal</span>
              <span>{money(bill.subtotal || 0)}</span>
            </div>

            {Number(bill.discount) > 0 && (
              <div className="receipt-total-row discount">
                <span>Discount</span>
                <span>-{money(bill.discount)}</span>
              </div>
            )}

            {Number(bill.tax_rate) > 0 && (
              <div className="receipt-total-row">
                <span>Tax ({bill.tax_rate}%)</span>
                <span>{money(bill.tax_amount || 0)}</span>
              </div>
            )}

            <div className="receipt-grand-total">
              <span>Grand Total</span>
              <span>{money(bill.total || 0)}</span>
            </div>
          </div>

          {/* Divider */}
          <div className="receipt-divider"></div>

          {/* Footer */}
          <div className="receipt-footer">
            <div className="receipt-payment">
              <span>Payment</span>
              <span>{bill.payment_mode || "Cash"}</span>
            </div>
            <p className="receipt-thanks">Thank you for shopping with us!</p>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .reprint-page {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
            padding-left: 0.85rem !important;
            padding-right: 0.85rem !important;
            padding-bottom: 5.5rem !important;
          }

          .reprint-page .page-intro {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.75rem !important;
          }

          .reprint-page .page-intro h2 {
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            font-size: 1.35rem !important;
          }

          .reprint-page .bill-header-actions {
            width: 100% !important;
            max-width: 100% !important;
            display: flex !important;
            flex-direction: row !important;
            gap: 0.5rem !important;
            box-sizing: border-box !important;
          }

          .reprint-page .bill-header-actions button {
            flex: 1 1 0% !important;
            width: 50% !important;
            min-width: 0 !important;
            justify-content: center !important;
            min-height: 44px !important;
            white-space: nowrap !important;
          }

          .reprint-page .receipt-preview-panel {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            padding: 1rem 0.75rem !important;
            margin: 0 auto !important;
            overflow: hidden !important;
          }

          .reprint-page .preview-header {
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
            gap: 0.5rem !important;
            flex-wrap: wrap !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }

          .reprint-page .print-format-toggle-group {
            max-width: 100% !important;
            overflow-x: auto !important;
            flex-wrap: nowrap !important;
            -webkit-overflow-scrolling: touch;
          }

          .reprint-page .receipt-preview-content {
            max-width: 100% !important;
            box-sizing: border-box !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
          }

          .reprint-page .receipt-preview-content.format-80mm,
          .reprint-page .receipt-preview-content.format-a4 {
            max-width: 100% !important;
            padding: 1rem 0.65rem !important;
          }
        }
      `}</style>

      {/* Thermal Print Setup & Adjustment Modal */}
      <PrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        defaultWidth={printFormat}
        elementId="receipt-to-print"
      />
    </div>
  )
}