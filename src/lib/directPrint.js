import Swal from "sweetalert2"
import i18n from "../i18n/i18n"
import { call, canPrintFree, getActivePlanDetails, syncUserQuota, getCurrentUserKey } from "./utils"
import { printReceiptElement, saveReceiptAsPdf } from "./printReceipt"

const t = (key, fallback, values) => i18n.t(key, fallback, values)

// After a browser's print dialog closes it never says whether the receipt printed, so the person is asked
const confirmBrowserPrint = async (billNumber) => {
  const res = await Swal.fire({
    title: t("bills.didItPrint", "Did the receipt print?"),
    text: billNumber ? t("bills.didItPrintBill", "Bill #{{n}}", { n: billNumber }) : undefined,
    icon: "question",
    showCancelButton: true,
    reverseButtons: true,
    focusConfirm: true,
    confirmButtonText: t("bills.yesPrinted", "Yes, it printed"),
    cancelButtonText: t("bills.notPrinted", "No"),
    confirmButtonColor: "#0284c7",
    cancelButtonColor: "#94a3b8",
    allowOutsideClick: false
  })
  return Boolean(res.isConfirmed)
}

// Printing straight from the billing screen (no separate preview page). The print dialog opens first; one print
// credit is used only once the receipt has printed (in the app the print screen says so, in a browser the person
// is asked), so a cancelled print costs nothing.
// Resolves true when it was printed, "cancelled" when it was not, "failed" when it could not be printed (already
// explained in a popup), false when there were no print credits. Only true counts as printed.
export async function chargeAndPrint({ user, elementId, pageWidth = "80mm", onNeedPlan, billNumber }) {
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

  const result = await printReceiptElement(elementId, { pageWidth })
  if (!result?.printed) return result?.cancelled ? "cancelled" : "failed"
  if (result.unconfirmed && !(await confirmBrowserPrint(billNumber))) return "cancelled"

  // It printed: now the credit is used
  let quota = null
  try {
    const res = await call("/subscriptions/consume-print", { method: "POST" })
    if (res && res.quota) {
      quota = res.quota
      syncUserQuota(res.quota, userKey)
    }
  } catch (err) {
    // The receipt is already printed, so it still counts as printed; the server keeps the credit count right
    console.error("Print credit could not be used after printing:", err)
  }

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
