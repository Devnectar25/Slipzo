import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react"
import { createPortal } from "react-dom"
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react"
import i18n from "../../i18n/i18n"

const ToastContext = createContext(null)

// Where the visible part of the screen starts. On a phone the keyboard can shift what is visible inside
// the page (the Android app especially), and a message pinned to the page's top then showed up halfway
// down the screen. Following the visible area keeps it just under the status bar.
function useVisibleTop() {
  const [top, setTop] = useState(0)
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null
    if (!vv) return undefined
    const update = () => setTop(Math.max(0, Math.round(vv.offsetTop)))
    update()
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
    }
  }, [])
  return top
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const visibleTop = useVisibleTop()

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((message, type = "info", duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5)
    setToasts((prev) => {
      if (prev.some((t) => t.message === message && t.type === type)) {
        return prev
      }
      return [...prev, { id, message, type }]
    })

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
    return id
  }, [removeToast])

  const success = useCallback((msg, duration) => showToast(msg, "success", duration), [showToast])
  const error = useCallback((msg, duration) => showToast(msg, "error", duration), [showToast])
  const warning = useCallback((msg, duration) => showToast(msg, "warning", duration), [showToast])
  const info = useCallback((msg, duration) => showToast(msg, "info", duration), [showToast])
  const show = useCallback((msg, type = "info", duration = 4000) => showToast(msg, type, duration), [showToast])

  const contextValue = useMemo(() => ({
    showToast,
    show,
    success,
    error,
    warning,
    info,
    removeToast
  }), [showToast, show, success, error, warning, info, removeToast])

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Rendered straight into <body>, so nothing on the page can change where it sits */}
      {typeof document !== "undefined" && createPortal(
      <div className="toast-container" aria-live="polite" style={{ "--toast-visible-top": `${visibleTop}px` }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-item toast-${toast.type} slide-up`}
          >
            <div className="toast-icon">
              {toast.type === "success" && <CheckCircle2 size={18} />}
              {toast.type === "error" && <AlertCircle size={18} />}
              {toast.type === "warning" && <AlertTriangle size={18} />}
              {toast.type === "info" && <Info size={18} />}
            </div>
            <div className="toast-message">{toast.message}</div>
            <button
              className="toast-close"
              onClick={() => removeToast(toast.id)}
              aria-label={i18n.t("common.closeNotification", "Close notification")}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>,
      document.body
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    // Fallback if rendered outside provider
    return {
      showToast: () => {},
      show: () => {},
      success: (msg) => console.log("Success:", msg),
      error: (msg) => console.error("Error:", msg),
      warning: (msg) => console.warn("Warning:", msg),
      info: (msg) => console.log("Info:", msg),
      removeToast: () => {}
    }
  }
  return context
}

