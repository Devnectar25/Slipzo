// Today's two bill lists (waiting to print, printed) as this phone last saw them. History and Home show them at once and
// load the current ones behind. They are kept apart from the normal request cache, which is emptied by every new bill.
import { call, accountScope as scope } from "./utils"
import { filterToday, localMidnight, todayBillsUrl } from "./todayBills"

// clearApiCache (sign out, another account) removes everything that starts with slipzo_cache_
const KEY = "slipzo_cache_known_lists"

const readAll = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null")
    if (saved && saved.scope === scope() && saved.day === localMidnight().toDateString()) return saved.lists || {}
  } catch (_) { /* nothing usable */ }
  return {}
}

/** The server's answer (a page of bills, or an older plain list) as { bills, total, totalPages } */
export const toList = (data) => {
  if (data && Array.isArray(data.bills)) {
    const bills = filterToday(data.bills)
    return { bills, total: data.total !== undefined ? Number(data.total) : bills.length, totalPages: Number(data.totalPages) || 1 }
  }
  const bills = filterToday(Array.isArray(data) ? data : [])
  return { bills, total: bills.length, totalPages: 1 }
}

/** { bills, total, totalPages } of the first page, or null when it is not known yet */
export const readKnownBills = (isSaved) => readAll()[isSaved ? "saved" : "printed"] || null

export const keepKnownBills = (isSaved, list) => {
  const owner = scope()
  if (!owner || !list) return
  try {
    localStorage.setItem(KEY, JSON.stringify({ scope: owner, day: localMidnight().toDateString(), lists: { ...readAll(), [isSaved ? "saved" : "printed"]: list } }))
  } catch (_) { /* storage full or unavailable */ }
}

/** Loads the current first page and keeps it */
export async function refreshKnownBills(isSaved) {
  const owner = scope()
  const list = toList(await call(todayBillsUrl({ isSaved }), { noCache: true }))
  if (owner && owner === scope()) keepKnownBills(isSaved, list)
  return list
}

let timer = null
/** Both lists, a moment later (several bills in a row load them once), so History is up to date when it is opened */
export const refreshKnownBillsSoon = (delay = 1200) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    if (!scope()) return
    refreshKnownBills(true).catch(() => {})
    refreshKnownBills(false).catch(() => {})
  }, delay)
}
