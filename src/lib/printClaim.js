import Swal from "sweetalert2"
import i18n from "../i18n/i18n"
import { call, isNativeApp, syncUserQuota, getCurrentUserKey } from "./utils"
import { reportPrint } from "./printReport"

// The same account can be open on several devices (phone, computer, workers' phones). Before printing, a device claims
// the bill or table on the server; the server refuses it while another device is printing the same one, when the last
// print credits are in use, or when the goods were just sold elsewhere. See Slipzo_api/src/models/PrintLock.js.
//
// If the server cannot be reached, or is an older one without this step, printing goes on as before.

const t = (key, fallback, values) => i18n.t(key, { defaultValue: fallback, ...values })

let memoryId = ""
/** Identifies this open app or browser tab (two tabs on one computer count as two) */
export const printHolder = () => {
  if (memoryId) return memoryId
  try { memoryId = sessionStorage.getItem("slipzo_print_holder") || "" } catch (_) { /* storage can be unavailable */ }
  if (!memoryId) {
    memoryId = globalThis.crypto?.randomUUID?.() || `h${Date.now()}${Math.random().toString(36).slice(2)}`
    try { sessionStorage.setItem("slipzo_print_holder", memoryId) } catch (_) { /* kept in memory */ }
  }
  return memoryId
}

/** "phone app" | "phone browser" | "computer": the server keeps it, other devices show it in their own language */
export const printDevice = () => (isNativeApp ? "phone app" : /Mobi|Android|iPhone/i.test(navigator.userAgent || "") ? "phone browser" : "computer")

/** What every request about a print carries */
export const printIdentity = () => ({ holder: printHolder(), device: printDevice() })

const deviceLabel = (device) =>
  device === "phone app" ? t("multi.phoneApp", "the phone app")
    : device === "phone browser" ? t("multi.phoneBrowser", "a phone browser")
      : device === "computer" ? t("multi.computer", "a computer")
        : t("multi.anotherDevice", "another device")

const timeLabel = (ms) => (ms ? new Date(Number(ms)).toLocaleTimeString(i18n.language === "en" ? "en-IN" : `${i18n.language}-IN`, { hour: "numeric", minute: "2-digit" }) : "")

const notice = (title, text, icon = "info") => Swal.fire({ title, text, icon, confirmButtonText: t("multi.ok", "OK"), confirmButtonColor: "#0284c7" })

/**
 * Shows why the server refused because of another device. Resolves true when the error was one of those.
 */
export async function explainDeviceConflict(err) {
  switch (err?.code) {
    case "PRINTING_ELSEWHERE":
      await notice(t("multi.busyTitle", "Printing on another device"), t("multi.busyText", "This is being printed on {{device}} right now. Please wait a moment and try again.", { device: deviceLabel(err.data?.device) }))
      return true
    case "LAST_CREDIT_IN_USE":
      await notice(t("multi.lastCreditTitle", "Last print credit in use"), t("multi.lastCreditText", "Your last print credit is being used on another device right now."), "warning")
      return true
    case "ALREADY_PRINTED":
      await notice(t("multi.printedTitle", "Already printed"), t("multi.cannotChange", "This bill was printed on {{device}} at {{time}}, so it cannot be changed here. Start a new bill for more items.", { device: deviceLabel(err.data?.device), time: timeLabel(err.data?.printed_at) }))
      return true
    case "OUT_OF_STOCK":
      await notice(t("multi.stockTitle", "Not enough stock"), `${err.message}. ${t("multi.stockText", "It may have been sold on another device. Change the bill and try again.")}`, "warning")
      return true
    case "BILL_GONE":
      await notice(t("multi.goneTitle", "Bill not found"), t("multi.goneText", "This bill was deleted on another device."), "warning")
      return true
    default:
      return false
  }
}

/**
 * Claims a bill (billId) or a restaurant table (table) before printing it.
 * credit: printing it will use a print credit. firstPrint: the person expects it has not printed yet, so when another
 * device printed it meanwhile they are asked before a second copy comes out.
 * Resolves { ok: true }, or { ok: false, quota: true } when no credits are left, or { ok: false } (already explained).
 */
export async function claimPrint({ billId, table, credit = true, firstPrint = true, user }) {
  if (!billId && !table) return { ok: true }
  let res
  try {
    res = await call("/bills/print-claim", {
      method: "POST",
      body: JSON.stringify({ ...printIdentity(), ...(billId ? { bill_id: billId, credit } : { table: String(table) }) })
    })
  } catch (err) {
    if (err?.data?.quota) syncUserQuota(err.data.quota, getCurrentUserKey(user))
    if (err?.code === "QUOTA_EXHAUSTED") return { ok: false, quota: true }
    if (await explainDeviceConflict(err)) return { ok: false, code: err.code }
    console.warn("Print claim not available, printing without it:", err?.message)
    return { ok: true, unclaimed: true }
  }
  if (res?.quota) syncUserQuota(res.quota, getCurrentUserKey(user))

  if (firstPrint && res?.printed_elsewhere) {
    const choice = await Swal.fire({
      title: t("multi.printedTitle", "Already printed"),
      text: t("multi.printedText", "This bill was already printed on {{device}} at {{time}}. Print another copy?", { device: deviceLabel(res.printed_elsewhere.device), time: timeLabel(res.printed_elsewhere.at) }),
      icon: "question",
      showCancelButton: true,
      confirmButtonText: t("multi.printCopy", "Print a copy"),
      cancelButtonText: t("multi.dontPrint", "Don't print"),
      confirmButtonColor: "#0284c7",
      reverseButtons: true
    })
    if (!choice.isConfirmed) {
      releasePrint({ billId, table })
      return { ok: false, code: "PRINTED_ELSEWHERE" }
    }
  }
  return { ok: true, printed: res?.printed }
}

/** The print was cancelled or is over: another device may print it now */
export function releasePrint({ billId, table }) {
  if (!billId && !table) return Promise.resolve()
  return call("/bills/print-release", {
    method: "POST",
    body: JSON.stringify({ ...printIdentity(), ...(billId ? { bill_id: billId } : {}), ...(table ? { table: String(table) } : {}) })
  }).catch(() => { /* the claim ends by itself */ })
}

/** The bill has printed: it moves to the printed bills, and its claim ends. Sent again later if the connection drops. */
export const markBillPrinted = (billId) =>
  reportPrint("printed", { billId, ...printIdentity() })
