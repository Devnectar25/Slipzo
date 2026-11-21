import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Bell, Megaphone, BadgePercent, CalendarClock, Boxes, Settings2, CheckCheck, X } from "lucide-react"
import { call } from "../../lib/utils"
import "../../styles/NotificationBell.css"

const KIND_ICON = {
  announcement: Megaphone,
  discount: BadgePercent,
  plan_reminder: CalendarClock,
  stock: Boxes,
  setup: Settings2
}

const timeAgo = (iso, t) => {
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return ""
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return t("notif.justNow", "Just now")
  if (mins < 60) return t("notif.minsAgo", "{{n}} min ago", { n: mins })
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return t("notif.hoursAgo", "{{n}} h ago", { n: hrs })
  const days = Math.floor(hrs / 24)
  if (days < 7) return t("notif.daysAgo", "{{n}} d ago", { n: days })
  try { return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short" }) } catch { return "" }
}

/**
 * Bell in the app header: messages from Slipzen (offers, announcements) and the shop's own notices
 * (plan ending, prints running low, low stock, setup). Opening it marks everything as read.
 * onNavigate(view): a notification that points somewhere (e.g. Pricing) opens that page.
 */
export function NotificationBell({ user, onNavigate }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef(null)

  const load = async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await call("/notifications", { noCache: true })
      if (res && Array.isArray(res.items)) {
        setItems(res.items)
        setUnread(Number(res.unread) || 0)
      }
    } catch (_) {
      // the bell stays as it was; next check tries again
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user?.id) return undefined
    load()
    const tick = setInterval(() => { if (document.visibilityState === "visible") load() }, 120000)
    // a push notification arrived while the app is open, or a plan / stock change
    const refresh = () => load()
    window.addEventListener("slipzo_push_received", refresh)
    window.addEventListener("slipzo-quota-update", refresh)
    window.addEventListener("focus", refresh)
    return () => {
      clearInterval(tick)
      window.removeEventListener("slipzo_push_received", refresh)
      window.removeEventListener("slipzo-quota-update", refresh)
      window.removeEventListener("focus", refresh)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("touchstart", onDown, { passive: true })
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("touchstart", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) {
      load()
      if (unread > 0) {
        // opening the list reads everything; the dots stay until it is closed so new ones can still be spotted
        setUnread(0)
        call("/notifications/read", { method: "POST" }).catch(() => {})
      }
    } else {
      setItems((prev) => prev.map((n) => ({ ...n, unread: false })))
    }
  }

  const openItem = (n) => {
    if (n.view && onNavigate) {
      setOpen(false)
      setItems((prev) => prev.map((x) => ({ ...x, unread: false })))
      onNavigate(n.view)
    }
  }

  if (!user) return null

  return (
    <div className="nbell" ref={wrapRef}>
      <button
        type="button"
        className={`nbell-btn ${open ? "open" : ""}`}
        onClick={toggle}
        aria-label={unread > 0 ? t("notif.ariaUnread", "Notifications, {{n}} unread", { n: unread }) : t("notif.aria", "Notifications")}
        aria-expanded={open}
        data-testid="notification-bell"
      >
        <Bell size={20} />
        {unread > 0 && <span className="nbell-badge" data-testid="notification-count">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="nbell-panel" role="dialog" aria-label={t("notif.title", "Notifications")}>
          <div className="nbell-head">
            <strong>{t("notif.title", "Notifications")}</strong>
            <button type="button" className="nbell-close" onClick={toggle} aria-label={t("common.close", "Close")}><X size={16} /></button>
          </div>

          {items.length === 0 ? (
            <div className="nbell-empty">
              <CheckCheck size={26} />
              <span>{loading ? t("notif.loading", "Loading…") : t("notif.empty", "You're all caught up")}</span>
            </div>
          ) : (
            <ul className="nbell-list">
              {items.map((n) => {
                const Icon = KIND_ICON[n.kind] || Bell
                const clickable = Boolean(n.view && onNavigate)
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={`nbell-item kind-${n.kind} ${n.unread ? "unread" : ""} ${clickable ? "clickable" : ""}`}
                      onClick={() => openItem(n)}
                      disabled={!clickable}
                    >
                      <span className="nbell-icon"><Icon size={16} /></span>
                      <span className="nbell-text">
                        <span className="nbell-item-title">{n.title}</span>
                        <span className="nbell-item-body">{n.body}</span>
                        {n.code && <span className="nbell-code">{t("notif.code", "Code")}: <b>{n.code}</b></span>}
                        <span className="nbell-time">{timeAgo(n.created_at, t)}</span>
                      </span>
                      {n.unread && <span className="nbell-dot" aria-hidden="true" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationBell
