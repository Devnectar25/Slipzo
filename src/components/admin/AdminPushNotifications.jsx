import { useEffect, useState } from "react"
import { Bell, Send, Megaphone, BadgePercent, CalendarClock, Users, User, AlertCircle, RefreshCw, Smartphone } from "lucide-react"
import Swal from "sweetalert2"
import { call } from "../../lib/utils"
import "../../styles/AdminPush.css"

const KINDS = [
  { id: "announcement", label: "Announcement", icon: Megaphone, hint: "News or an update for shop owners" },
  { id: "discount", label: "Discount offer", icon: BadgePercent, hint: "Opens the Pricing page when tapped" },
  { id: "plan_reminder", label: "Plan reminder", icon: CalendarClock, hint: "Recharge reminder, opens Pricing" }
]

const TEMPLATES = {
  announcement: { title: "New in Slipzen", body: "We have added new features to make billing faster. Open the app to try them." },
  discount: { title: "Limited offer: 20% off", body: "Recharge any plan this week and save 20%. Use the code below at checkout." },
  plan_reminder: { title: "Time to recharge", body: "Keep billing without a break. Recharge your Slipzen plan today." }
}

const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) } catch { return "" }
}

/** Platform admin: send push notifications to the Android app (shown even when the app is closed) */
export function AdminPushNotifications() {
  const [status, setStatus] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [kind, setKind] = useState("announcement")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [code, setCode] = useState("")
  const [target, setTarget] = useState("all")
  const [phone, setPhone] = useState("")
  const [error, setError] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      const [s, h] = await Promise.all([
        call("/admin/push/status", { noCache: true }).catch(() => null),
        call("/admin/push/messages", { noCache: true }).catch(() => [])
      ])
      setStatus(s)
      setHistory(Array.isArray(h) ? h : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const useTemplate = () => {
    const tpl = TEMPLATES[kind]
    setTitle(tpl.title)
    setBody(tpl.body)
    setError("")
  }

  const send = async (e) => {
    e?.preventDefault()
    setError("")
    if (title.trim().length < 3) return setError("Enter a title (at least 3 characters).")
    if (body.trim().length < 3) return setError("Enter a message (at least 3 characters).")
    if (target === "user" && phone.replace(/\D/g, "").length < 10) return setError("Enter the user's 10-digit mobile number.")

    const who = target === "all" ? "all users (notification bell, and phones with the app)" : `the user ${phone}`
    const ok = await Swal.fire({
      title: "Send this notification?",
      html: `<b>${title.trim().replace(/</g, "&lt;")}</b><br/><span style="color:#64748b">${body.trim().replace(/</g, "&lt;")}</span><br/><br/>It goes to ${who} straight away.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Send now",
      confirmButtonColor: "#0284c7"
    })
    if (!ok.isConfirmed) return

    setSending(true)
    try {
      const res = await call("/admin/push/send", {
        method: "POST",
        body: JSON.stringify({
          kind,
          title: title.trim(),
          body: body.trim(),
          code: kind === "discount" ? code.trim() : "",
          target,
          phone: target === "user" ? phone.trim() : ""
        })
      })
      Swal.fire({
        title: "Notification sent",
        text: `It is in the app's notification bell for ${target === "all" ? "all users" : "this user"}.` +
          (res.configured ? ` Phone pop-up delivered to ${res.sent_count} phone(s)${res.failed_count ? `, ${res.failed_count} failed` : ""}.` : " Phone pop-ups are off until Firebase is set up."),
        icon: "success",
        confirmButtonColor: "#0284c7"
      })
      setTitle("")
      setBody("")
      setCode("")
      load()
    } catch (err) {
      setError(err?.message || "Could not send the notification.")
    } finally {
      setSending(false)
    }
  }

  const configured = status?.configured

  return (
    <div className="apn">
      <div className="apn-stats">
        <div className={`apn-stat ${configured ? "ok" : "warn"}`}>
          <Bell size={18} />
          <div>
            <strong>{loading ? "…" : configured ? "Ready" : "Not set up"}</strong>
            <span>Push service</span>
          </div>
        </div>
        <div className="apn-stat">
          <Users size={18} />
          <div>
            <strong>{loading ? "…" : status?.users ?? 0}</strong>
            <span>Users with notifications on</span>
          </div>
        </div>
        <div className="apn-stat">
          <Smartphone size={18} />
          <div>
            <strong>{loading ? "…" : status?.devices ?? 0}</strong>
            <span>Phones</span>
          </div>
        </div>
        <button type="button" className="admin-refresh-btn apn-refresh" onClick={load} disabled={loading}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {!loading && !configured && (
        <div className="apn-setup">
          <AlertCircle size={18} />
          <div>
            <strong>Phone pop-ups are not set up yet</strong>
            <span>Messages you send still appear in every user's notification bell in the app. For pop-ups on phones, add the Firebase service account as <code>FIREBASE_SERVICE_ACCOUNT</code> in the server settings and restart the server. The Android app also needs <code>google-services.json</code>.</span>
          </div>
        </div>
      )}

      <div className="apn-grid">
        <form className="apn-card" onSubmit={send}>
          <h3 className="apn-card-title"><Send size={17} /> New notification</h3>

          <span className="apn-label">Type</span>
          <div className="apn-kinds">
            {KINDS.map((k) => {
              const Icon = k.icon
              return (
                <button key={k.id} type="button" className={`apn-kind ${kind === k.id ? "active" : ""}`} onClick={() => setKind(k.id)}>
                  <Icon size={18} />
                  <span>{k.label}</span>
                  <small>{k.hint}</small>
                </button>
              )
            })}
          </div>

          <div className="apn-row-between">
            <label className="apn-label" htmlFor="apn-title">Title</label>
            <button type="button" className="apn-link" onClick={useTemplate}>Use a sample text</button>
          </div>
          <input id="apn-title" className="apn-input" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Diwali offer: 20% off all plans" />

          <label className="apn-label" htmlFor="apn-body">Message <small>{body.length}/500</small></label>
          <textarea id="apn-body" className="apn-input apn-textarea" maxLength={500} rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What should shop owners know?" />

          {kind === "discount" && (
            <>
              <label className="apn-label" htmlFor="apn-code">Discount code (optional)</label>
              <input id="apn-code" className="apn-input apn-code" maxLength={30} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))} placeholder="DIWALI20" />
            </>
          )}

          <span className="apn-label">Send to</span>
          <div className="apn-targets">
            <button type="button" className={`apn-target ${target === "all" ? "active" : ""}`} onClick={() => setTarget("all")}>
              <Users size={15} /> All users with the app
            </button>
            <button type="button" className={`apn-target ${target === "user" ? "active" : ""}`} onClick={() => setTarget("user")}>
              <User size={15} /> One user
            </button>
          </div>
          {target === "user" && (
            <input className="apn-input" inputMode="numeric" maxLength={14} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="User's mobile number" />
          )}

          {error && <p className="apn-error"><AlertCircle size={14} /> {error}</p>}

          <button type="submit" className="apn-send" disabled={sending}>
            <Send size={16} /> {sending ? "Sending…" : "Send notification"}
          </button>
          <p className="apn-note">Messages appear in the app's notification bell (and as phone pop-ups when set up). Plan reminders, low prints and low stock notices are added automatically.</p>
        </form>

        <div className="apn-card apn-preview-card">
          <h3 className="apn-card-title"><Smartphone size={17} /> Preview</h3>
          <div className="apn-phone">
            <div className="apn-notif">
              <div className="apn-notif-head">
                <span className="apn-notif-app"><img src="/favicon.png" alt="" onError={(e) => { e.currentTarget.style.display = "none" }} /> Slipzen</span>
                <span>now</span>
              </div>
              <strong>{title || "Notification title"}</strong>
              <p>{body || "Your message appears here."}{kind === "discount" && code ? ` Code: ${code}` : ""}</p>
            </div>
          </div>

          <h3 className="apn-card-title apn-history-title">Sent before</h3>
          {history.length === 0 ? (
            <p className="apn-empty">{loading ? "Loading…" : "No notifications sent yet."}</p>
          ) : (
            <ul className="apn-history">
              {history.map((m) => (
                <li key={m.id}>
                  <div className="apn-history-top">
                    <span className={`apn-badge ${m.kind}`}>{(KINDS.find((k) => k.id === m.kind) || KINDS[0]).label}</span>
                    <span className="apn-history-date">{fmtDate(m.created_at)}</span>
                  </div>
                  <strong>{m.title}</strong>
                  <p>{m.body}{m.code ? ` · Code ${m.code}` : ""}</p>
                  <span className="apn-history-meta">
                    {m.target === "all" ? "All users" : "One user"} · delivered {m.sent_count}{Number(m.failed_count) ? `, failed ${m.failed_count}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminPushNotifications
