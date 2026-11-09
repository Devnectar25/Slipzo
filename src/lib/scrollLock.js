// Keeps the page still while a popup is open.
//
// SweetAlert2 normally does this by setting overflow on <html>/<body>, but this app's own styles keep those scrollable,
// so the page behind a popup could still be scrolled (mouse wheel, keys, swipe). These styles are set inline with
// !important, which wins over the stylesheet rules, and they are put back exactly as they were when the popup closes.

let locks = 0
let saved = null

const props = ["overflow", "padding-right"]

const remember = (el) => props.map((p) => [p, el.style.getPropertyValue(p), el.style.getPropertyPriority(p)])
const restore = (el, list) => list.forEach(([p, value, priority]) => (value ? el.style.setProperty(p, value, priority) : el.style.removeProperty(p)))

const blockTouchOnBackdrop = (e) => {
  // Swiping on the dark area around a popup must not scroll the page; swiping inside the popup itself is left alone
  if (!e.target.closest || !e.target.closest(".swal2-popup")) e.preventDefault()
}

export function lockPageScroll() {
  if (typeof document === "undefined") return () => {}
  locks += 1
  if (locks === 1) {
    const html = document.documentElement
    const body = document.body
    // the width of the scrollbar that is about to disappear, so the page does not jump sideways
    const scrollbar = Math.max(0, window.innerWidth - html.clientWidth)
    saved = { html: remember(html), body: remember(body) }
    html.style.setProperty("overflow", "hidden", "important")
    body.style.setProperty("overflow", "hidden", "important")
    if (scrollbar > 0) body.style.setProperty("padding-right", `${scrollbar}px`, "important")
    document.addEventListener("touchmove", blockTouchOnBackdrop, { passive: false })
  }
  let released = false
  return () => {
    if (released) return
    released = true
    locks = Math.max(0, locks - 1)
    if (locks === 0 && saved) {
      restore(document.documentElement, saved.html)
      restore(document.body, saved.body)
      document.removeEventListener("touchmove", blockTouchOnBackdrop)
      saved = null
    }
  }
}

// Locks the page whenever a SweetAlert2 popup (not a small toast) is showing, and unlocks when it is gone.
export function installPopupScrollLock() {
  if (typeof document === "undefined" || window.__slipzoPopupLockInstalled) return
  window.__slipzoPopupLockInstalled = true
  let unlock = null
  const sync = () => {
    const html = document.documentElement
    const body = document.body
    const shown = html.classList.contains("swal2-shown") || body.classList.contains("swal2-shown")
    const small = html.classList.contains("swal2-toast-shown") || body.classList.contains("swal2-toast-shown")
    const noBackdrop = html.classList.contains("swal2-no-backdrop") || body.classList.contains("swal2-no-backdrop")
    const wanted = shown && !small && !noBackdrop
    if (wanted && !unlock) unlock = lockPageScroll()
    else if (!wanted && unlock) {
      unlock()
      unlock = null
    }
  }
  const observer = new MutationObserver(sync)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
  observer.observe(document.body, { attributes: true, attributeFilter: ["class"] })
  sync()
}
