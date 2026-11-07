import { useEffect, useRef, useState } from "react"

// Requests faster than this finish without any flicker on screen
const SHOW_AFTER_MS = 300

/**
 * Thin bar at the top of the window while API requests are running, so every action
 * has feedback even where a screen has no loader of its own.
 * Background cache refreshes do not count (see executeFetch in lib/utils.js).
 */
export function TopProgressBar() {
  const [visible, setVisible] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    const onActivity = (e) => {
      clearTimeout(timer.current)
      if (e.detail.active > 0) {
        timer.current = setTimeout(() => setVisible(true), SHOW_AFTER_MS)
      } else {
        setVisible(false)
      }
    }
    window.addEventListener("slipzo-network-activity", onActivity)
    return () => {
      clearTimeout(timer.current)
      window.removeEventListener("slipzo-network-activity", onActivity)
    }
  }, [])

  if (!visible) return null
  return (
    <div className="top-progress-bar" role="progressbar" aria-label="Loading">
      <div className="top-progress-bar-fill" />
    </div>
  )
}
