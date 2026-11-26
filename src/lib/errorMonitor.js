import { API, isNativeApp } from './utils.js'

/**
 * Sends the errors this device's console sees to the admin panel's Error Monitor: console.error calls, uncaught
 * errors and unhandled promise rejections. Repeats are counted here and sent together, so an error that fires
 * 500 times in a loop is one report with count 500, not 500 requests.
 */
const MAX_DISTINCT = 60 // per page load: a page that keeps making new errors stops being reported after this
const FLUSH_MS = 8000
let queue = new Map()
let distinct = 0
let timer = null
let sending = false
let installed = false

// Not real problems, or not ours: API refusals the screen already explains (4xx), browser extension noise, aborted loads
const IGNORE = [
  /^❌ API Error \(4\d\d\)/,
  /ResizeObserver loop/i,
  /chrome-extension:|moz-extension:|safari-extension:/i,
  /^Script error\.?$/i,
  /AbortError|The user aborted a request|signal is aborted/i
]

const str = (a) => {
  if (a instanceof Error) return a.message || String(a)
  if (typeof a === 'string') return a
  try { return JSON.stringify(a) } catch { return String(a) }
}

const add = (message, stack, level = 'error') => {
  try {
    message = String(message || '').replace(/%[sdoOc]/g, '').replace(/\s+/g, ' ').trim().slice(0, 2000)
    if (!message || IGNORE.some((r) => r.test(message) || (stack && r.test(stack)))) return
    // the same error with a different id or number in it (item 3, item 4…) is one error: count it, don't list it again
    const key = message.slice(0, 300).replace(/\b[0-9a-f]{8}-[0-9a-f-]{27}\b/gi, '#').replace(/\d+/g, '#') + '|' +
      String(stack || '').split('\n').slice(0, 2).join('|').replace(/:\d+:\d+/g, '')
    const hit = queue.get(key)
    if (hit) { hit.count += 1; return }
    if (distinct >= MAX_DISTINCT) return
    distinct += 1
    queue.set(key, { message, stack: stack ? String(stack).slice(0, 6000) : null, url: location.pathname + location.search, level, count: 1 })
    if (queue.size >= 20) flush()
    else if (!timer) timer = setTimeout(flush, FLUSH_MS)
  } catch { /* monitoring must never break the app */ }
}

export const flushErrors = (leaving = false) => flush(leaving)

function flush(leaving = false) {
  clearTimeout(timer)
  timer = null
  if (!queue.size || (sending && !leaving)) return
  const errors = [...queue.values()]
  queue = new Map()
  sending = true
  try {
    const token = localStorage.getItem('slipzo_token')
    fetch(`${API}/errors`, {
      method: 'POST',
      keepalive: leaving, // lets the report finish while the page closes
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ errors, platform: isNativeApp ? 'android' : 'web', appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0' })
    }).catch(() => { }).finally(() => { sending = false; if (queue.size && !timer) timer = setTimeout(flush, FLUSH_MS) })
  } catch { sending = false }
}

export function installErrorMonitor() {
  if (installed || typeof window === 'undefined') return
  // the developer's own console while running `npm run dev` stays out of the live list
  if (import.meta.env.DEV && import.meta.env.VITE_ERROR_MONITOR !== 'on') return
  installed = true

  const original = console.error.bind(console)
  console.error = (...args) => {
    original(...args)
    const err = args.find((a) => a instanceof Error)
    add(args.map(str).join(' '), err?.stack)
  }
  window.addEventListener('error', (e) => {
    if (e.target && e.target !== window) return // a picture or script that failed to load: not a code error
    add(e.message || str(e.error), e.error?.stack || (e.filename ? `at ${e.filename}:${e.lineno}:${e.colno}` : null))
  })
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason
    add(`Unhandled promise rejection: ${str(r)}`, r instanceof Error ? r.stack : null)
  })
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(true) })
  window.addEventListener('pagehide', () => flush(true))
}
