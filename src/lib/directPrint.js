import Swal from "sweetalert2"
import i18n from "../i18n/i18n"
import { call, canPrintFree, getActivePlanDetails, syncUserQuota, getCurrentUserKey } from "./utils"
import { printReceiptElement, saveReceiptAsPdf } from "./printReceipt"
import { claimPrint, releasePrint, printIdentity } from "./printClaim"
import { reportPrint } from "./printReport"

const t = (key, fallback, values) => i18n.t(key, fallback, values)

// Printing from the bill result screen. The print dialog opens first; one print credit is used once the receipt
// has printed. In the app the print screen says whether it printed, so a cancelled print costs nothing there.
// A browser never says whether Print or Cancel was pressed, so once its print window closes the receipt counts as printed.
// Resolves true when it was printed, "cancelled" when it was not, "failed" when it could not be printed (already
// explained in a popup), false when there were no print credits, and (only with chargeLater) "sent" when a browser's
// print window closed: no credit used yet. Only true counts as printed.
// billId: the bill is claimed first, so another device with the same account cannot print it at the same moment; "busy"
// comes back when it was refused (already explained in a popup). After a print the claim ends in markBillPrinted.
export async function chargeAndPrint({ user, elementId, pageWidth = "80mm", onNeedPlan, billNumber, chargeLater = false, billId, firstPrint = true }) {
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

  const needPlan = () => {
    const plan = getActivePlanDetails(userKey)
    if (plan?.isFreeTier) {
      window.dispatchEvent(new CustomEvent("slipzo-show-free-reward-expired", { detail: { force: true } }))
    } else {
      askForPlan()
    }
    return false
  }
  if (!(await hasCredits(userKey))) return needPlan()

  const claim = await claimPrint({ billId, firstPrint, user })
  if (!claim.ok) return claim.quota ? needPlan() : "busy"

  let result = null
  try {
    result = await printReceiptElement(elementId, { pageWidth })
  } finally {
    if (!result?.printed) releasePrint({ billId })
  }
  if (!result?.printed) return result?.cancelled ? "cancelled" : "failed"

  // A browser's print window closes the same way for Print and Cancel and never says which was pressed.
  // With chargeLater the caller uses the credit itself later (spendPrintCredit) and "sent" comes back;
  // otherwise it counts as printed now. (The Android app's print screen reports a cancel: "cancelled" above.)
  if (result?.unconfirmed && chargeLater) return "sent"
  await spendPrintCredit(user, billId)
  return true
}

// Credits as this device knows them; when it thinks there are none, the server is asked first (a plan may just have
// been bought on another device)
export async function hasCredits(userKey) {
  if (canPrintFree(userKey)) return true
  try {
    const mine = await call("/subscriptions/my", { noCache: true })
    if (mine?.quota) syncUserQuota(mine.quota, userKey)
  } catch (_) { /* keep what is known */ }
  return canPrintFree(userKey)
}

/** Uses one print credit for a receipt that printed, and shows the low-prints / no-prints reminders */
export async function spendPrintCredit(user, billId) {
  const userKey = user?.email || user?.id || getCurrentUserKey(user)
  // It printed: now the credit is used
  let quota = null
  try {
    const res = await reportPrint("charge", { billId, ...printIdentity() })
    if (res && res.quota) {
      quota = res.quota
      syncUserQuota(res.quota, userKey)
    }
  } catch (err) {
    // The receipt is already printed, so it still counts as printed; the server keeps the credit count right
    if (err?.data?.quota) syncUserQuota(err.data.quota, userKey)
    console.error("Print credit could not be used after printing:", err)
  }

  if (quota && Number(quota.printsRemaining) <= 10 && Number(quota.printsRemaining) > 0) {
    window.dispatchEvent(new CustomEvent("slipzo-low-prints-reminder", { detail: { force: true, quota, printsRemaining: Number(quota.printsRemaining) } }))
  }

  if (quota && quota.isFreeTier && Number(quota.printsRemaining) === 0) {
    window.dispatchEvent(new CustomEvent("slipzo-show-free-reward-expired", { detail: { force: true, quota } }))
  }
  return true
}

/**
 * Saving the bill as a PDF counts as a print: it needs a print credit and uses one once the file is saved.
 * free: true when this bill's credit was already used (it was printed), so the PDF costs nothing more.
 * Resolves true when the PDF was saved, false when there were no print credits or it was not saved.
 */
export async function chargeAndSavePdf({ user, elementId, pageWidth = "80mm", billNumber, onNeedPlan, free = false, billId }) {
  const userKey = user?.email || user?.id || getCurrentUserKey(user)
  const needPlan = () => {
    const plan = getActivePlanDetails(userKey)
    if (plan?.isFreeTier) {
      window.dispatchEvent(new CustomEvent("slipzo-show-free-reward-expired", { detail: { force: true } }))
    } else {
      Swal.fire({
        title: t("bills.quotaTitle", "Print Quota Limit Reached"),
        text: t("bills.quotaTextPdf", "Saving a bill as PDF uses a print credit. Please view pricing plans to add print credits."),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: t("bills.viewPlans", "View Pricing Plans"),
        cancelButtonText: t("common.cancel", "Cancel"),
        confirmButtonColor: "#0284c7"
      }).then((r) => { if (r.isConfirmed) onNeedPlan?.() })
    }
    return false
  }
  if (!free && !(await hasCredits(userKey))) return needPlan()

  const claim = free ? { ok: true } : await claimPrint({ billId, firstPrint: false, user })
  if (!claim.ok) return claim.quota ? needPlan() : false
  try {
    const res = await downloadReceiptPdf({ elementId, pageWidth, billNumber })
    if (!res?.saved) return false
    if (!free) await spendPrintCredit(user, billId)
    return true
  } finally {
    if (!free) releasePrint({ billId })
  }
}

// The bill as a PDF file, named after the bill number (no print credit used: see chargeAndSavePdf)
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
