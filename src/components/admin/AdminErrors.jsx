import { useCallback, useEffect, useRef, useState } from "react"
import { Bug, CheckCircle2, RotateCcw, Trash2, Search, RefreshCw, ChevronDown, Globe, Smartphone, Server, Users, Copy, Flame, Clock3, AlertTriangle } from "lucide-react"
import Swal from "sweetalert2"
import { call } from "../../lib/utils"
import "../../styles/AdminErrors.css"

const headers = () => {
  const token = localStorage.getItem("slipzo_admin_token") || localStorage.getItem("slipzo_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}
const ago = (iso) => {
  if (!iso) return ""
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}
const when = (iso) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "")
const countText = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}K` : String(n))
const PLATFORM = {
  web: { icon: Globe, label: "Website" },
  android: { icon: Smartphone, label: "Android app" },
  ios: { icon: Smartphone, label: "iOS app" },
  server: { icon: Server, label: "Server" }
}

/** Errors seen on the website, in the Android app and on the server. One row per distinct error, with how often it fired. */
export function AdminErrors() {
  const [status, setStatus] = useState("open")
  const [source, setSource] = useState("all")
  const [sort, setSort] = useState("recent")
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [open, setOpen] = useState(null)
  const searchTimer = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ status, source, sort, search: query })
      const res = await call(`/admin/errors?${qs}`, { headers: headers(), noCache: true })
      setData(res)
      setError("")
    } catch (err) {
      setError(err?.message || "Could not load the errors.")
    } finally {
      setLoading(false)
    }
  }, [status, source, sort, query])

  useEffect(() => { load() }, [load])
  // new errors keep arriving: refresh every 30 seconds while the page is open and visible
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") load() }, 30000)
    return () => clearInterval(t)
  }, [load])

  const onSearch = (v) => {
    setSearch(v)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setQuery(v.trim()), 350)
  }

  const setRowStatus = async (item, next) => {
    try {
      await call(`/admin/errors/${item.id}`, { method: "PUT", headers: headers(), body: JSON.stringify({ status: next }) })
      await load()
    } catch (err) {
      Swal.fire({ icon: "error", title: "Could not change it", text: err?.message || "", confirmButtonColor: "#0284c7" })
    }
  }

  const remove = async (item) => {
    const answer = await Swal.fire({
      title: "Delete this error?",
      text: "If it happens again it comes back as a new error.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#ef4444",
      reverseButtons: true
    })
    if (!answer.isConfirmed) return
    try {
      await call(`/admin/errors/${item.id}`, { method: "DELETE", headers: headers() })
      await load()
    } catch (err) {
      Swal.fire({ icon: "error", title: "Could not delete", text: err?.message || "", confirmButtonColor: "#0284c7" })
    }
  }

  const clearResolved = async () => {
    const answer = await Swal.fire({
      title: "Delete all resolved errors?",
      text: `${data?.summary?.resolved || 0} resolved error${data?.summary?.resolved === 1 ? "" : "s"} will be deleted.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete resolved",
      confirmButtonColor: "#ef4444",
      reverseButtons: true
    })
    if (!answer.isConfirmed) return
    try {
      await call("/admin/errors/resolved", { method: "DELETE", headers: headers() })
      await load()
    } catch (err) {
      Swal.fire({ icon: "error", title: "Could not delete", text: err?.message || "", confirmButtonColor: "#0284c7" })
    }
  }

  const copy = async (item) => {
    const text = `${item.message}\n\nPage: ${item.url || "-"}\nWhere: ${PLATFORM[item.platform]?.label || item.platform || "-"}\nTimes: ${item.count}\nFirst: ${when(item.firstSeen)}\nLast: ${when(item.lastSeen)}\n\n${item.stack || ""}`
    try { await navigator.clipboard.writeText(text) } catch { /* the browser refused */ }
    Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Copied", showConfirmButton: false, timer: 1400 })
  }

  const sum = data?.summary || {}
  const list = data?.errors || []

  return (
    <div className="ae" data-testid="admin-errors">
      <div className="ae-cards">
        <div className="ae-card"><span className="ae-ic red"><AlertTriangle size={18} /></span><div><b>{sum.open ?? "…"}</b><small>Open errors</small></div></div>
        <div className="ae-card"><span className="ae-ic orange"><Flame size={18} /></span><div><b>{sum.openEvents !== undefined ? countText(sum.openEvents) : "…"}</b><small>Times they fired</small></div></div>
        <div className="ae-card"><span className="ae-ic blue"><Clock3 size={18} /></span><div><b>{sum.activeToday ?? "…"}</b><small>Fired in last 24 h</small></div></div>
        <div className="ae-card"><span className="ae-ic purple"><Bug size={18} /></span><div><b>{sum.newToday ?? "…"}</b><small>New in last 24 h</small></div></div>
      </div>

      <div className="admin-table-container ae-box">
        <div className="ae-toolbar">
          <div className="ae-seg" role="tablist" aria-label="Status">
            {[["open", `Open${sum.open !== undefined ? ` (${sum.open})` : ""}`], ["resolved", `Resolved${sum.resolved !== undefined ? ` (${sum.resolved})` : ""}`], ["all", "All"]].map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={status === k} className={status === k ? "on" : ""} onClick={() => setStatus(k)}>{l}</button>
            ))}
          </div>
          <select className="ae-select" value={source} onChange={(e) => setSource(e.target.value)} aria-label="Where">
            <option value="all">Everywhere</option>
            <option value="client">Website & app</option>
            <option value="server">Server</option>
          </select>
          <select className="ae-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            <option value="recent">Last seen</option>
            <option value="count">Most times</option>
            <option value="first">Newest first</option>
          </select>
          <label className="ae-search">
            <Search size={15} />
            <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search message or page…" />
          </label>
          <div className="ae-tools">
            {sum.resolved > 0 && <button type="button" className="ae-btn ghost" onClick={clearResolved}><Trash2 size={14} /> Delete resolved</button>}
            <button type="button" className="ae-btn" onClick={load} disabled={loading} aria-label="Refresh"><RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh</button>
          </div>
        </div>

        {error && <p className="ae-error" role="alert">{error}</p>}

        <ul className="ae-list">
          {list.map((item) => {
            const P = PLATFORM[item.platform] || PLATFORM.web
            const expanded = open === item.id
            return (
              <li key={item.id} className={`ae-row ${item.status === "resolved" ? "done" : ""} ${expanded ? "open" : ""}`} data-testid="error-row">
                <button type="button" className="ae-main" onClick={() => setOpen(expanded ? null : item.id)} aria-expanded={expanded}>
                  <span className={`ae-count ${item.count >= 100 ? "hot" : item.count >= 10 ? "warm" : ""}`} title={`Fired ${item.count.toLocaleString("en-IN")} times`}>
                    ×{countText(item.count)}
                  </span>
                  <span className="ae-text">
                    <span className="ae-msg" title={item.message}>{item.message}</span>
                    <span className="ae-meta">
                      <span className={`ae-src ${item.source}`}><P.icon size={12} /> {P.label}</span>
                      {item.url && <span className="ae-url" title={item.url}>{item.url}</span>}
                      <span>Last {ago(item.lastSeen)}</span>
                      <span>First {ago(item.firstSeen)}</span>
                      {item.affectedUsers > 0 && <span><Users size={12} /> {item.affectedUsers} user{item.affectedUsers === 1 ? "" : "s"}</span>}
                      {item.status === "resolved" && <span className="ae-resolved"><CheckCircle2 size={12} /> Resolved</span>}
                    </span>
                  </span>
                  <ChevronDown size={18} className="ae-chev" />
                </button>
                {expanded && (
                  <div className="ae-detail">
                    <dl>
                      <div><dt>Times fired</dt><dd>{item.count.toLocaleString("en-IN")}</dd></div>
                      <div><dt>First seen</dt><dd>{when(item.firstSeen)}</dd></div>
                      <div><dt>Last seen</dt><dd>{when(item.lastSeen)}</dd></div>
                      <div><dt>Where</dt><dd>{P.label}{item.appVersion ? ` · v${item.appVersion}` : ""}</dd></div>
                      {item.url && <div><dt>Page</dt><dd>{item.url}</dd></div>}
                      {item.lastUserId && <div><dt>Last user id</dt><dd>{item.lastUserId}</dd></div>}
                      {item.userAgent && <div className="wide"><dt>Device</dt><dd>{item.userAgent}</dd></div>}
                    </dl>
                    <pre className="ae-stack">{item.message}{item.stack ? `\n\n${item.stack}` : ""}</pre>
                    <div className="ae-actions">
                      {item.status === "open"
                        ? <button type="button" className="ae-btn ok" onClick={() => setRowStatus(item, "resolved")}><CheckCircle2 size={14} /> Mark resolved</button>
                        : <button type="button" className="ae-btn" onClick={() => setRowStatus(item, "open")}><RotateCcw size={14} /> Open again</button>}
                      <button type="button" className="ae-btn" onClick={() => copy(item)}><Copy size={14} /> Copy details</button>
                      <button type="button" className="ae-btn danger" onClick={() => remove(item)}><Trash2 size={14} /> Delete</button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
          {data && list.length === 0 && (
            <li className="ae-empty">
              <CheckCircle2 size={30} />
              <b>{status === "open" ? "No open errors" : "Nothing here"}</b>
              <span>{status === "open" ? "Errors from the website, the app and the server appear here, each once with the number of times it fired." : "No errors match these filters."}</span>
            </li>
          )}
          {!data && !error && <li className="ae-empty"><RefreshCw size={22} className="spin" /><span>Loading…</span></li>}
        </ul>
      </div>
      <p className="ae-note">Resolved errors open again automatically if they fire again.</p>
    </div>
  )
}

export default AdminErrors
