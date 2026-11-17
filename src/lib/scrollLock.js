// Keeps the page still while a popup or modal is open.
//
// SweetAlert2 normally does this by setting overflow on <html>/<body>, but this app's own styles keep those scrollable,
// so the page behind a popup could still be scrolled (mouse wheel, keys, swipe). These styles are set inline with
// !important, which wins over the stylesheet rules, and they are put back exactly as they were when the popup closes.
//
// Every modal must use this (directly or through usePageScrollLock) instead of saving and restoring
// body/html overflow on its own. The locks are counted: the page is remembered once, when the first lock is taken,
// and put back only when the last one is released. Modals that each saved "the original overflow" themselves broke
// when they overlapped, e.g. one opening while a SweetAlert was showing, then "restoring" overflow: hidden on close,
// which left the page unable to scroll until it was reloaded.

let locks = 0
let saved = null
let touchLocks = 0

const props = ["overflow", "padding-right"]

const remember = (el) => props.map((p) => [p, el.style.getPropertyValue(p), el.style.getPropertyPriority(p)])
const restore = (el, list) => list.forEach(([p, value, priority]) => (value ? el.style.setProperty(p, value, priority) : el.style.removeProperty(p)))

const blockTouchOnBackdrop = (e) => {
  // Swiping on the dark area around a popup must not scroll the page; swiping inside the popup itself is left alone
  if (!e.target.closest || !e.target.closest(".swal2-popup")) e.preventDefault()
}

// blockBackdropTouch: also stop swipes outside a SweetAlert popup. Only for SweetAlert; React modals scroll their own
// content with touch, which this would block.
export function lockPageScroll({ blockBackdropTouch = false } = {}) {
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
  }
  if (blockBackdropTouch) {
    touchLocks += 1
    if (touchLocks === 1) document.addEventListener("touchmove", blockTouchOnBackdrop, { passive: false })
  }
  let released = false
  return () => {
    if (released) return
    released = true
    if (blockBackdropTouch) {
      touchLocks = Math.max(0, touchLocks - 1)
      if (touchLocks === 0) document.removeEventListener("touchmove", blockTouchOnBackdrop)
    }
    locks = Math.max(0, locks - 1)
    if (locks === 0 && saved) {
      restore(document.documentElement, saved.html)
      restore(document.body, saved.body)
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
    if (wanted && !unlock) unlock = lockPageScroll({ blockBackdropTouch: true })
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
