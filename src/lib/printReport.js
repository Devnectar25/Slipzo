import { call, accountScope, getCurrentUserKey, syncUserQuota } from "./utils"

// What the server must hear about a receipt that came out: the print count (charge) and that the bill is printed
// (printed). When the connection drops just then, the report is kept on the phone and sent again, so the print count,
// the waiting bills and the stock never miss a print. Every print has its own id: the server counts it once, however
// often it is sent.
const KEY = "slipzo_print_reports"
const ONCE_KEY = "slipzo_server_counts_once" // the server is new enough to count a repeated report once
const KEEP_MS = 7 * 24 * 60 * 60 * 1000

const readAll = () => {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]")
    return Array.isArray(list) ? list.filter((r) => r && Date.now() - r.at < KEEP_MS) : []
  } catch (_) { return [] }
}
const writeAll = (list) => {
  try {
    if (list.length) localStorage.setItem(KEY, JSON.stringify(list.slice(-200)))
    else localStorage.removeItem(KEY)
  } catch (_) { /* storage full or unavailable */ }
}

const newId = () => globalThis.crypto?.randomUUID?.() || `p${Date.now()}${Math.random().toString(36).slice(2)}`
const countsOnce = () => { try { return localStorage.getItem(ONCE_KEY) === "1" } catch (_) { return false } }
// no answer, or the server could not work just now: worth sending again. Anything else is the server's answer.
const worthRetrying = (err) => !err?.status || err.status >= 500 || err.status === 408 || err.status === 429

const send = (r, { late = false, background = false } = {}) => {
  const path = r.kind === "charge" ? "/subscriptions/consume-print" : `/bills/${r.bill_id}/print`
  return call(path, {
    method: "POST",
    ...(background ? { keepSession: true, isRevalidation: true } : {}),
    body: JSON.stringify({ holder: r.holder, device: r.device, print_id: r.id, ...(r.bill_id ? { bill_id: r.bill_id } : {}), ...(late ? { late: true } : {}) })
  })
}

/**
 * kind: "charge" (uses one print credit) or "printed" (the bill leaves the waiting bills).
 * Resolves the server's answer, or null when it could not be reached and the report waits to be sent again.
 * Rejects when the server refused it.
 */
export async function reportPrint(kind, { billId, holder, device }) {
  const r = { id: newId(), kind, bill_id: billId || "", holder, device, scope: accountScope(), at: Date.now() }
  try {
    const res = await send(r)
    if (kind === "charge" && res?.counted_once) { try { localStorage.setItem(ONCE_KEY, "1") } catch (_) { /* fine */ } }
    return res
  } catch (err) {
    // the receipt is out: when other devices took the last credits in that moment it is still counted
    if (kind === "charge" && err?.code === "QUOTA_EXHAUSTED" && countsOnce()) return send(r, { late: true })
    if (!worthRetrying(err)) throw err
    // an older server would count a repeated report twice
    if (kind === "charge" && !countsOnce()) throw err
    writeAll([...readAll(), r])
    setTimeout(sendPrintReports, 8000)
    return null
  }
}

let sending = false
/** Sends what is still waiting for the account that is signed in */
export async function sendPrintReports() {
  if (sending) return
  const scope = accountScope()
  if (!scope) return
  sending = true
  let changed = false
  try {
    for (const r of readAll().filter((x) => x.scope === scope)) {
      if (accountScope() !== scope) break
      try {
        const res = await send(r, { late: true, background: true })
        if (res?.quota) syncUserQuota(res.quota, getCurrentUserKey())
      } catch (err) {
        // still no connection, signed out, or the shop changed meanwhile: later
        if (worthRetrying(err) || err?.status === 401 || err?.code === "SHOP_CHANGED") break
        console.warn("Print report refused:", err?.message) // e.g. the bill was deleted
      }
      changed = true
      writeAll(readAll().filter((x) => x.id !== r.id))
    }
  } finally {
    sending = false
  }
  if (changed) window.dispatchEvent(new CustomEvent("slipzo_bill_printed", { detail: {} }))
}

export const printReportsWaiting = () => readAll().filter((r) => r.scope === accountScope()).length
