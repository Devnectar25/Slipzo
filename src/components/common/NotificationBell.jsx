import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Bell,
  Megaphone,
  BadgePercent,
  CalendarClock,
  Boxes,
  Settings2,
  CheckCheck,
  X,
  Copy,
  Check,
  Clock,
  ArrowRight,
  Sparkles
} from "lucide-react"
import { call } from "../../lib/utils"
import "../../styles/NotificationBell.css"

const KIND_META = {
  announcement: { icon: Megaphone, label: "Announcement", colorClass: "kind-announcement" },
  discount: { icon: BadgePercent, label: "Special Offer", colorClass: "kind-discount" },
  plan_reminder: { icon: CalendarClock, label: "Plan Reminder", colorClass: "kind-plan_reminder" },
  stock: { icon: Boxes, label: "Stock Alert", colorClass: "kind-stock" },
  setup: { icon: Settings2, label: "Shop Setup", colorClass: "kind-setup" }
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
 * (plan ending, prints running low, low stock, setup).
 */
export function NotificationBell({ user, onNavigate }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [copiedCode, setCopiedCode] = useState("")
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
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
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
        setUnread(0)
        call("/notifications/read", { method: "POST" }).catch(() => {})
      }
    } else {
      setItems((prev) => prev.map((n) => ({ ...n, unread: false })))
    }
  }

  const markAllAsRead = (e) => {
    e?.stopPropagation?.()
    setUnread(0)
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })))
    call("/notifications/read", { method: "POST" }).catch(() => {})
  }

  const openItem = (n) => {
    if (n.view && onNavigate) {
      setOpen(false)
      setItems((prev) => prev.map((x) => ({ ...x, unread: false })))
      onNavigate(n.view)
    }
  }

  const copyPromoCode = (code, e) => {
    e.stopPropagation()
    if (!code) return
    try {
      navigator.clipboard?.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(""), 2000)
    } catch (_) {}
  }

  if (!user) return null

  const hasUnread = items.some((i) => i.unread)

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
        <Bell size={19} className="nbell-btn-icon" />
        {unread > 0 && <span className="nbell-badge" data-testid="notification-count">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <>
          {/* Subtle backdrop overlay to focus attention and prevent visual clashing with underlying page cards */}
          <div className="nbell-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />

          <div className="nbell-panel" role="dialog" aria-label={t("notif.title", "Notifications")}>
            {/* Header */}
            <div className="nbell-head">
              <div className="nbell-head-left">
                <div className="nbell-head-icon-box">
                  <Bell size={16} />
                </div>
                <div className="nbell-head-text">
                  <strong className="nbell-head-title">{t("notif.title", "Notifications")}</strong>
                  {items.length > 0 && (
                    <span className="nbell-head-pill">
                      {hasUnread ? `${items.filter(i => i.unread).length} new` : `${items.length} total`}
                    </span>
                  )}
                </div>
              </div>

              <div className="nbell-head-right">
                {hasUnread && (
                  <button
                    type="button"
                    className="nbell-mark-btn"
                    onClick={markAllAsRead}
                    title="Mark all as read"
                  >
                    <CheckCheck size={13} />
                    <span>{t("notif.markRead", "Mark read")}</span>
                  </button>
                )}
                <button
                  type="button"
                  className="nbell-close"
                  onClick={toggle}
                  aria-label={t("common.close", "Close")}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* List */}
            {items.length === 0 ? (
              <div className="nbell-empty">
                <div className="nbell-empty-graphic">
                  <CheckCheck size={28} />
                </div>
                <h4>{loading ? t("notif.loading", "Loading…") : t("notif.empty", "You're all caught up")}</h4>
                <p>{t("notif.emptySub", "No new alerts or announcements right now.")}</p>
              </div>
            ) : (
              <div className="nbell-list-wrapper">
                <ul className="nbell-list">
                  {items.map((n) => {
                    const meta = KIND_META[n.kind] || KIND_META.announcement
                    const Icon = meta.icon
                    const clickable = Boolean(n.view && onNavigate)

                    return (
                      <li key={n.id} className="nbell-list-item">
                        <div
                          className={`nbell-card ${meta.colorClass} ${n.unread ? "unread" : ""} ${clickable ? "clickable" : ""}`}
                          onClick={() => openItem(n)}
                          role={clickable ? "button" : undefined}
                          tabIndex={clickable ? 0 : undefined}
                        >
                          <div className={`nbell-icon-box ${meta.colorClass}`}>
                            <Icon size={16} />
                          </div>

                          <div className="nbell-card-body">
                            <div className="nbell-meta-row">
                              <span className={`nbell-category-pill ${meta.colorClass}`}>
                                {meta.label}
                              </span>
                              <div className="nbell-time-wrap">
                                <Clock size={11} className="nbell-clock-icon" />
                                <span className="nbell-time">{timeAgo(n.created_at, t)}</span>
                              </div>
                              {n.unread && <span className="nbell-dot" title="Unread" />}
                            </div>

                            <h4 className="nbell-item-title">{n.title}</h4>
                            <p className="nbell-item-body">{n.body}</p>

                            {n.code && (
                              <div
                                className="nbell-coupon-chip"
                                onClick={(e) => copyPromoCode(n.code, e)}
                                title="Click to copy code"
                              >
                                <div className="nbell-coupon-left">
                                  <span className="nbell-coupon-lbl">{t("notif.code", "Code")}:</span>
                                  <span className="nbell-coupon-val">{n.code}</span>
                                </div>
                                <button type="button" className="nbell-coupon-copy-btn">
                                  {copiedCode === n.code ? (
                                    <>
                                      <Check size={12} className="text-emerald-600" />
                                      <span>Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={12} />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}

                            {clickable && (
                              <div className="nbell-action-row">
                                <span className="nbell-action-text">
                                  {t("common.viewDetails", "View details")}
                                  <ArrowRight size={12} className="nbell-action-arrow" />
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {/* Footer */}
            <div className="nbell-footer">
              <span className="nbell-footer-msg">
                <Sparkles size={13} className="nbell-footer-sparkle" />
                {t("notif.footerText", "Official notifications & account updates")}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default NotificationBell
