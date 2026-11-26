/**
 * Puts a newly opened page at its top. The window is not always what scrolls: the admin panel scrolls inside
 * .admin-body, and some layouts scroll #root or <main>. All of them are reset, now and again after the new page
 * has drawn (its content can arrive a frame later).
 */
const SCROLLERS = [".admin-body", ".admin-dashboard-container", ".admin-main-content", ".app-shell main", "main", "#root"]

const reset = () => {
  try {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" })
  } catch {
    window.scrollTo(0, 0)
  }
  if (document.scrollingElement) document.scrollingElement.scrollTop = 0
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
  for (const sel of SCROLLERS) {
    document.querySelectorAll(sel).forEach((el) => { if (el.scrollTop) el.scrollTop = 0 })
  }
}

export function scrollPageToTop() {
  if (typeof window === "undefined") return
  reset()
  requestAnimationFrame(() => {
    reset()
    requestAnimationFrame(reset)
  })
}
