// Today's analytics data for the Home page, shared by the page and by sign in.
// Sign in starts the request right away (prefetchTodayAnalytics) while the app is still checking the account,
// so the Home page can show the numbers as soon as it appears instead of starting its own request then.
import { call, accountScope as accountId } from "./utils"

export const ANALYTICS_STORAGE_KEY = "slipzo_today_analytics"

export const localMidnight = (d = new Date()) => {
  const m = new Date(d)
  m.setHours(0, 0, 0, 0)
  return m
}

// Kept on the phone (not only for the session), so the Home page opens with today's last numbers after the app was closed
let prefetched = null // { day, promise }

/** GET today's analytics; keeps a copy for this session so the Home page opens with it */
export function fetchTodayAnalytics({ noCache = false } = {}) {
  const from = localMidnight()
  return call(`/bills/analytics/today?from=${encodeURIComponent(from.toISOString())}`, noCache ? { noCache: true } : {})
    .then((res) => {
      if (res && typeof res === "object") {
        try {
          localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify({ _day: from.toDateString(), _account: accountId(), data: res }))
        } catch (_) { }
      }
      return res
    })
}

/** Called at sign in / app start: begins loading today's analytics in the background */
export function prefetchTodayAnalytics() {
  const day = localMidnight().toDateString()
  if (prefetched?.day === day) return prefetched.promise
  const promise = fetchTodayAnalytics({ noCache: true }).catch(() => null)
  prefetched = { day, promise }
  // forget it after a minute so a later visit loads fresh numbers
  setTimeout(() => { if (prefetched?.promise === promise) prefetched = null }, 60000)
  return promise
}

/** The Home page's first load: uses the request sign in already started, if any (used once) */
export function takePrefetchedAnalytics() {
  const day = localMidnight().toDateString()
  if (!prefetched || prefetched.day !== day) return null
  const { promise } = prefetched
  prefetched = null
  return promise
}

/** Saved copy from earlier today, of the account that is signed in */
export function readSavedAnalytics() {
  try {
    const saved = localStorage.getItem(ANALYTICS_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed && parsed._day === localMidnight().toDateString() && parsed._account === accountId() && parsed.data) return parsed.data
    }
  } catch (_) { }
  return null
}
