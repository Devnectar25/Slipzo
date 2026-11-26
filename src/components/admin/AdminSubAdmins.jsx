import { useEffect, useState } from "react"
import { UserCog, Plus, Edit2, Trash2, X, Eye, EyeOff, ShieldCheck, Power } from "lucide-react"
import Swal from "sweetalert2"
import { call, escapeHtml } from "../../lib/utils"
import "../../styles/AdminSubAdmins.css"

/** The admin pages a sub-admin can be given, in the order of the menu */
export const ADMIN_PAGE_OPTIONS = [
  { id: "overview", label: "Overview Stats" },
  { id: "users", label: "Users & Shops" },
  { id: "grant_credits", label: "Give print credits", sub: "On Users & Shops and Plan Buyer Users", needs: "users" },
  { id: "plan_buyers", label: "Plan Buyer Users" },
  { id: "plans", label: "Pricing Plans" },
  { id: "products", label: "Product Catalog" },
  { id: "menu", label: "Menu Catalog" },
  { id: "templates", label: "Manage Templates" },
  { id: "bills", label: "Bill History" },
  { id: "contacts", label: "Support Messages" },
  { id: "notifications", label: "Push Notifications" },
  { id: "errors", label: "Error Monitor" }
]
const pageLabel = (id) => ADMIN_PAGE_OPTIONS.find((p) => p.id === id)?.label || id
const fmt = (iso) => {
  if (!iso) return "Never"
  try { return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) } catch { return "" }
}
const headers = () => {
  const token = localStorage.getItem("slipzo_admin_token") || localStorage.getItem("slipzo_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}
const emptyForm = { name: "", email: "", password: "", permissions: [] }

/** Super admin only: make sub-admins and choose which admin pages each one may open */
export function AdminSubAdmins() {
  const [list, setList] = useState(null)
  const [error, setError] = useState("")
  const [editing, setEditing] = useState(null) // null = closed, "new", or the sub-admin being changed
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState("")
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const load = async () => {
    try {
      const res = await call("/admin/sub-admins", { headers: headers(), noCache: true })
      setList(Array.isArray(res?.subAdmins) ? res.subAdmins : [])
      setError("")
    } catch (err) {
      setList([])
      setError(err?.message || "Could not load the sub-admins.")
    }
  }
  useEffect(() => { load() }, [])

  const open = (item) => {
    setEditing(item || "new")
    setForm(item ? { name: item.name, email: item.email, password: "", permissions: item.permissions || [] } : emptyForm)
    setFormError("")
    setShowPassword(false)
  }

  const toggle = (id) => setForm((f) => {
    const has = f.permissions.includes(id)
    let next = has ? f.permissions.filter((p) => p !== id) : [...f.permissions, id]
    if (id === "users" && has) next = next.filter((p) => p !== "grant_credits") // credits are given on the Users page
    if (id === "grant_credits" && !has && !next.includes("users")) next = [...next, "users"]
    return { ...f, permissions: next }
  })

  const save = async (e) => {
    e.preventDefault()
    if (saving) return
    const creating = editing === "new"
    if (form.name.trim().length < 2) return setFormError("Please enter a name.")
    if (creating && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setFormError("Please enter a valid email address.")
    if ((creating || form.password) && (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password))) {
      return setFormError("The password needs at least 8 characters, with letters and numbers.")
    }
    if (form.permissions.length === 0) return setFormError("Choose at least one page this admin may open.")
    setSaving(true)
    setFormError("")
    try {
      const body = creating
        ? { name: form.name.trim(), email: form.email.trim(), password: form.password, permissions: form.permissions }
        : { name: form.name.trim(), permissions: form.permissions, ...(form.password ? { password: form.password } : {}) }
      await call(creating ? "/admin/sub-admins" : `/admin/sub-admins/${editing.id}`, { method: creating ? "POST" : "PUT", headers: headers(), body: JSON.stringify(body) })
      setEditing(null)
      await load()
      Swal.fire({
        icon: "success",
        title: creating ? "Sub-admin created" : "Changes saved",
        html: creating
          ? `They sign in to the admin panel with <b>${escapeHtml(form.email.trim().toLowerCase())}</b> and the password you chose. They do not need the security code.`
          : "Their new pages apply within a minute.",
        confirmButtonColor: "#0284c7"
      })
    } catch (err) {
      setFormError(err?.message || "Could not save. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const setActive = async (item, active) => {
    if (!active) {
      const answer = await Swal.fire({
        title: `Turn off ${item.name}?`,
        text: "They are signed out and cannot sign in until you turn them on again.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Turn off",
        confirmButtonColor: "#ef4444",
        reverseButtons: true
      })
      if (!answer.isConfirmed) return
    }
    try {
      await call(`/admin/sub-admins/${item.id}`, { method: "PUT", headers: headers(), body: JSON.stringify({ active }) })
      await load()
    } catch (err) {
      Swal.fire({ icon: "error", title: "Could not change it", text: err?.message || "", confirmButtonColor: "#0284c7" })
    }
  }

  const remove = async (item) => {
    const answer = await Swal.fire({
      title: `Remove ${item.name}?`,
      text: "Their admin account is deleted and they are signed out.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Remove",
      confirmButtonColor: "#ef4444",
      reverseButtons: true
    })
    if (!answer.isConfirmed) return
    try {
      await call(`/admin/sub-admins/${item.id}`, { method: "DELETE", headers: headers() })
      await load()
    } catch (err) {
      Swal.fire({ icon: "error", title: "Could not remove", text: err?.message || "", confirmButtonColor: "#0284c7" })
    }
  }

  return (
    <div className="admin-table-container sa-wrap" data-testid="sub-admins">
      <div className="admin-table-header">
        <div>
          <h4 className="admin-table-title">Sub-admins ({list ? list.length : "…"})</h4>
          <p className="sa-sub">People who help run the admin panel. Each one opens only the pages you give them.</p>
        </div>
        <button type="button" className="sa-primary" onClick={() => open(null)} data-testid="sub-admin-new">
          <Plus size={16} /> Add sub-admin
        </button>
      </div>

      {error && <p className="sa-error" role="alert">{error}</p>}

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Sub-admin</th>
              <th>Pages they can open</th>
              <th>Status</th>
              <th>Last sign in</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(list || []).map((item) => (
              <tr key={item.id} data-testid="sub-admin-row">
                <td>
                  <span className="admin-user-text">
                    <b title={item.name}>{item.name}</b>
                    <small title={item.email}>{item.email}</small>
                  </span>
                </td>
                <td>
                  <div className="sa-pages">
                    {item.permissions.length === 0
                      ? <span className="sa-muted">None</span>
                      : item.permissions.map((p) => <span key={p} className="admin-tag admin-tag-blue">{pageLabel(p)}</span>)}
                  </div>
                </td>
                <td>
                  <span className={`admin-tag ${item.active ? "admin-tag-green" : "sa-tag-off"}`}>{item.active ? "Active" : "Turned off"}</span>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>{fmt(item.last_login_at)}</td>
                <td>
                  <div className="sa-actions">
                    <button type="button" className="sa-icon" onClick={() => open(item)} title="Change name, pages or password" aria-label={`Edit ${item.name}`}><Edit2 size={15} /></button>
                    <button type="button" className={`sa-icon ${item.active ? "" : "on"}`} onClick={() => setActive(item, !item.active)} title={item.active ? "Turn off" : "Turn on"} aria-label={item.active ? `Turn off ${item.name}` : `Turn on ${item.name}`}><Power size={15} /></button>
                    <button type="button" className="sa-icon danger" onClick={() => remove(item)} title="Remove" aria-label={`Remove ${item.name}`}><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {list && list.length === 0 && (
              <tr>
                <td colSpan={5} className="sa-empty">
                  <UserCog size={26} />
                  <div>No sub-admins yet. Add one to share the work without sharing your super admin login.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="sa-backdrop" role="dialog" aria-modal="true" aria-labelledby="sa-title" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setEditing(null) }}>
          <form className="sa-modal" onSubmit={save} noValidate>
            <div className="sa-modal-head">
              <h3 id="sa-title"><ShieldCheck size={18} /> {editing === "new" ? "Add sub-admin" : `Edit ${editing.name}`}</h3>
              <button type="button" className="sa-icon" onClick={() => setEditing(null)} aria-label="Close" disabled={saving}><X size={18} /></button>
            </div>

            <div className="sa-modal-body">
              <label className="sa-field">
                <span>Name</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Priya (Support)" maxLength={80} data-testid="sub-admin-name" />
              </label>
              <label className="sa-field">
                <span>Email (their sign-in)</span>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" disabled={editing !== "new"} data-testid="sub-admin-email" />
              </label>
              <label className="sa-field">
                <span>{editing === "new" ? "Password" : "New password (leave empty to keep it)"}</span>
                <span className="sa-pass">
                  <input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters, letters and numbers" autoComplete="new-password" data-testid="sub-admin-password" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </span>
              </label>

              <fieldset className="sa-perms">
                <legend>Pages they can open</legend>
                <div className="sa-perm-tools">
                  <button type="button" onClick={() => setForm((f) => ({ ...f, permissions: ADMIN_PAGE_OPTIONS.map((p) => p.id) }))}>Select all</button>
                  <button type="button" onClick={() => setForm((f) => ({ ...f, permissions: [] }))}>Clear</button>
                </div>
                <div className="sa-perm-grid">
                  {ADMIN_PAGE_OPTIONS.map((p) => (
                    <label key={p.id} className={`sa-perm ${p.needs ? "sa-perm-sub" : ""}`}>
                      <input type="checkbox" checked={form.permissions.includes(p.id)} onChange={() => toggle(p.id)} data-testid={`sub-admin-perm-${p.id}`} />
                      <span>
                        {p.label}
                        {p.sub && <small>{p.sub}</small>}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="sa-note">Only you (the super admin) can add, change or remove sub-admins.</p>
              </fieldset>

              {formError && <p className="sa-error" role="alert">{formError}</p>}
            </div>

            <div className="sa-modal-foot">
              <button type="button" className="sa-secondary" onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
              <button type="submit" className="sa-primary" disabled={saving} data-testid="sub-admin-save">{saving ? "Saving…" : editing === "new" ? "Create sub-admin" : "Save changes"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default AdminSubAdmins
