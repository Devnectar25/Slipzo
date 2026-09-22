import { useEffect, useState, useMemo } from "react"
import { ArrowLeft, Printer, User } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useDbTranslation } from "../lib/translator"
import { call, money, cleanTextLines, canPrintFree, getActivePlanDetails, syncUserQuota, incrementFreePrintCount, getCurrentUserKey, findTemplateMatch } from "../lib/utils"
import { printReceiptElement } from "../lib/printReceipt"
import { ReceiptSkeleton, ButtonLoader } from "./common/Skeleton"
import { useToast } from "./common/Toast"
import { BUILTIN_TEMPLATES } from "./Templates"
import { RealisticReceiptView } from "./RealisticReceiptView"
import Swal from "sweetalert2"

export function Reprint({ billId, setView, requireAuth, user }) {
  const { t } = useTranslation()
  const { tDb, formatNum, lang } = useDbTranslation()
  const [bill, setBill] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isPrinting, setIsPrinting] = useState(false)

  const { success, error: toastError } = useToast()

  const actualBillId = sessionStorage.getItem("slipzo-reprint-id") || billId

  const handleBack = () => {
    const origin = sessionStorage.getItem("slipzo-print-origin") || "history"
    setView(origin)
  }

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

  // Set default print format based on bill template width
  useEffect(() => {
    if (bill) {
      const matched = findTemplateMatch(BUILTIN_TEMPLATES, bill.template_id || bill.template_name)
      const width = bill.template_width || matched?.width
      if (width === "58mm" || width === "55mm" || width === "55") {
        setPrintFormat("55mm")
      } else if (width === "80mm" || width === "80") {
        setPrintFormat("80mm")
      }
    }
  }, [bill])

  // Resolve template object and populated preview data for dynamic realistic rendering
  const templateForView = useMemo(() => {
    if (!bill) return null
    const matched = findTemplateMatch(BUILTIN_TEMPLATES, bill.template_id || bill.template_name) || BUILTIN_TEMPLATES[0]

    const itemsList = Array.isArray(bill.items)
      ? bill.items.map((it) => {
          const qty = Number(it.quantity !== undefined ? it.quantity : (it.qty !== undefined ? it.qty : 0))
          const rate = Number(it.rate !== undefined ? it.rate : (it.price !== undefined ? it.price : 0))
          const tot = Number(it.total !== undefined ? it.total : (it.amount !== undefined ? it.amount : (qty * rate)))
          return {
            name: it.name || "Item",
            qty,
            rate,
            total: tot
          }
        })
      : []

    const formattedDate = bill.created_at
      ? new Date(bill.created_at).toLocaleDateString(lang === "mr" ? "mr-IN" : lang === "hi" ? "hi-IN" : "en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
      : ""

    return {
      ...matched,
      id: matched.id,
      templateId: matched.templateId,
      name: bill.template_name || matched.name,
      width: printFormat === "a4" ? "80mm" : (printFormat === "55mm" ? "58mm" : (printFormat || matched.width || "58mm")),
      footer: bill.footer || matched.footer || "Thank you for shopping with us! Please come again.",
      previewData: {
        shopName: bill.shop_name || "Slipzo Mart",
        address: bill.shop_address || "",
        phone: bill.shop_phone || "",
        gst: bill.gst || bill.gstin || "",
        customerName: bill.customer_name || "",
        customerPhone: bill.customer_phone || "",
        invoiceNo: bill.number || "",
        date: formattedDate,
        items: itemsList,
        subtotal: Number(bill.subtotal || 0),
        discount: Number(bill.discount || 0),
        taxRate: Number(bill.tax_rate || 0),
        tax: Number(bill.tax_amount || 0),
        total: Number(bill.total || 0),
        payment: bill.payment_mode || "Cash",
        footer: bill.footer || matched.footer || "Thank you for shopping with us! Please come again."
      }
    }
  }, [bill, printFormat, lang])

  const printReceipt = async () => {
    if (isPrinting) return
    setIsPrinting(true)

    const userAuthKey = user?.email || user?.id || getCurrentUserKey(user)

    if (!canPrintFree(userAuthKey)) {
      const plan = getActivePlanDetails(userAuthKey)
      if (plan?.isFreeTier) {
        window.dispatchEvent(new CustomEvent("slipzo-show-free-reward-expired", { detail: { force: true } }))
      } else {
        Swal.fire({
          title: "Print Quota Limit Reached",
          text: "You have used all available prints in your plan. Please view pricing plans to add print credits.",
          icon: "warning",
          confirmButtonText: "View Pricing Plans",
          confirmButtonColor: "#0284c7"
        }).then(() => {
          setView?.("pricing")
        })
      }
      setIsPrinting(false)
      return
    }

    try {
      if (user) {
        let quota = null
        try {
          const res = await call("/subscriptions/consume-print", { method: "POST" })
          if (res && res.quota) {
            quota = res.quota
            syncUserQuota(res.quota, userAuthKey)
          }
        } catch (err) {
          console.error("Print quota deduction failed:", err)
          const errMsg = err?.detail || err?.message || "No print credits available"
          Swal.fire({
            title: "Print Quota Reached",
            text: errMsg,
            icon: "warning",
            confirmButtonText: "View Plans",
            confirmButtonColor: "#0284c7"
          })
          setIsPrinting(false)
          return
        }

        printReceiptElement("receipt-to-print", {
          pageWidth: printFormat === "55mm" ? "55mm" : (printFormat === "a4" ? "a4" : "80mm")
        })

        success(t("bills.printedSuccess", "Printed successfully!"))

        if (quota && quota.isFreeTier && Number(quota.printsRemaining) === 0) {
          window.dispatchEvent(new CustomEvent("slipzo-show-free-reward-expired", { detail: { force: true, quota } }))
        }
      } else {
        incrementFreePrintCount(userAuthKey)
        printReceiptElement("receipt-to-print", {
          pageWidth: printFormat === "55mm" ? "55mm" : (printFormat === "a4" ? "a4" : "80mm")
        })
        success(t("bills.printedSuccess", "Printed successfully!"))
      }
    } catch (err) {
      console.error("Printing failed:", err)
      toastError?.("Printing failed. Please check printer connection.")
    } finally {
      setTimeout(() => {
        setIsPrinting(false)
      }, 800)
    }
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
          onClick={handleBack}
          style={{ marginTop: "1rem" }}
        >
          <ArrowLeft size={16} /> {t("common.back", "Back")}
        </button>
      </div>
    )
  }

  return (
    <div className="page reprint-page fade-in">
      <div className="page-intro">
        <div>
          <p className="eyebrow accent">{t("history.savedReceipt", "SAVED RECEIPT")}</p>
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
          <button className="secondary-button" onClick={handleBack}>
            <ArrowLeft size={16} /> {t("common.back", "Back")}
          </button>
          <button className="primary-button" onClick={printReceipt} disabled={isPrinting}>
            {isPrinting ? <ButtonLoader text={t("bills.printing", "Printing...")} /> : <><Printer size={16} /> {t("bills.print", "Print")}</>}
          </button>
        </div>
      </div>

      <div className="receipt-preview-panel" style={{ maxWidth: printFormat === "a4" ? "600px" : (printFormat === "80mm" ? "400px" : "320px"), margin: "0 auto", transition: "max-width 0.2s ease" }}>
        <div className="preview-header" style={{ marginBottom: "0.75rem" }}>
          <div className="preview-title-wrap">
            <span className="preview-badge">
              {templateForView?.name ? `${templateForView.name} • ` : ""}
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
        <div 
          id="receipt-to-print" 
          className={`receipt-preview-content format-${printFormat}`}
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            boxShadow: "none",
            width: "100%",
            display: "flex",
            justifyContent: "center"
          }}
        >
          <RealisticReceiptView template={templateForView} />
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
    </div>
  )
}