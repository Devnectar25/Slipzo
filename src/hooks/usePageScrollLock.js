import { useEffect } from "react"
import { lockPageScroll } from "../lib/scrollLock"

// Stops the page behind a modal from scrolling while `active` is true. Safe to use in any number of modals at once.
export function usePageScrollLock(active = true) {
  useEffect(() => {
    if (!active) return
    return lockPageScroll()
  }, [active])
}
