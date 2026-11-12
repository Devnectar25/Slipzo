import Swal from "sweetalert2"
import i18n from "../i18n/i18n"
import { call, canPrintFree, getActivePlanDetails, syncUserQuota, getCurrentUserKey } from "./utils"
import { printReceiptElement, saveReceiptAsPdf } from "./printReceipt"

const t = (key, fallback, values) => i18n.t(key, fallback, values)

// Printing straight from the billing screen (no separate preview page): uses one print credit, then opens
// the print dialog for the receipt already shown on screen. Resolves true when the print dialog was opened.
export async function chargeAndPrint({ user, elementId, pageWidth = "80mm", onNeedPlan }) {
  const userKey = user?.email || user?.id || getCurrentUserKey(user)

  const askForPlan = (text) => Swal.fire({
    title: t("bills.quotaTitle", "Print Quota Limit Reached"),
    text: text || t("bills.quotaText", "You have used all available prints in your plan. Please view pricing plans to add print credits."),
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: t("bills.viewPlans", "View Pricing Plans"),
    cancelButtonText: t("common.cancel", "Cancel"),
    confirmButtonColor: "#0284c7"
  }).then((r) => { if (r.isConfirmed) onNeedPlan?.() })

  if (!canPrintFree(userKey)) {
    const plan = getActivePlanDetails(userKey)
    if (plan?.isFreeTier) {
      window.dispatchEvent(new CustomEvent("slipzo-show-free-reward-expired", { detail: { force: true } }))
    } else {
      askForPlan()
    }
    return false
  }

  let quota = null
  try {
    const res = await call("/subscriptions/consume-print", { method: "POST" })
    if (res && res.quota) {
      quota = res.quota
      syncUserQuota(res.quota, userKey)
    }
  } catch (err) {
    console.error("Print credit could not be used:", err)
    askForPlan(err?.detail || err?.message)
    return false
  }

  await printReceiptElement(elementId, { pageWidth })

  if (quota && quota.isFreeTier && Number(quota.printsRemaining) === 0) {
    window.dispatchEvent(new CustomEvent("slipzo-show-free-reward-expired", { detail: { force: true, quota } }))
  }
  return true
}

// The bill as a PDF file, named after the bill number (no print credit used)
export function downloadReceiptPdf({ elementId, pageWidth = "80mm", billNumber }) {
  const safe = String(billNumber || "").replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "")
  return saveReceiptAsPdf(elementId, {
    pageWidth,
    filename: safe ? `Slipzen_Bill_${safe}.pdf` : undefined
  })
}

// "55mm" / "58mm" / "80mm" / "a4" as the print helpers expect it
export const printWidthOf = (width) => {
  const w = String(width || "80mm").toLowerCase()
  if (w === "a4" || w === "full") return "a4"
  if (w.startsWith("55") || w.startsWith("58")) return "55mm"
  return "80mm"
}
