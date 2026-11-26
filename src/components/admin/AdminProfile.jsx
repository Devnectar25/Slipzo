import { useEffect, useState } from "react"
import {
  ShieldCheck,
  User,
  AtSign,
  Mail,
  Phone,
  FileText,
  Edit2,
  Check,
  X,
  Lock,
  Eye,
  EyeOff,
  Clock,
  CheckCircle2,
  AlertCircle,
  KeyRound
} from "lucide-react"
import { call } from "../../lib/utils"
import { ButtonLoader } from "../common/Skeleton"
import "../../styles/AdminProfile.css"

const formatTimestamp = (iso) => {
  if (!iso) return "Just now"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "Just now"
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  })
}

const getAdminHeaders = () => {
  const token = localStorage.getItem("slipzo_admin_token") || localStorage.getItem("slipzo_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function AdminProfile({ admin, onAdminUpdated }) {
  const [profile, setProfile] = useState(admin || {})
  const [loadingProfile, setLoadingProfile] = useState(false)

  // View vs Edit profile details state
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: admin?.name || "",
    username: admin?.username || "",
    email: admin?.email || "",
    phone: admin?.phone || "",
    bio: admin?.bio || ""
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState("")
  const [profileSuccess, setProfileSuccess] = useState("")

  // Change password state
  const [passForm, setPassForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  const [showPass, setShowPass] = useState({ current: false, next: false, confirm: false })
  const [savingPass, setSavingPass] = useState(false)
  const [passError, setPassError] = useState("")
  const [passSuccess, setPassSuccess] = useState("")

  // Sync when parent admin changes
  useEffect(() => {
    if (admin) {
      setProfile((prev) => ({ ...prev, ...admin }))
      if (!editing) {
        setForm({
          name: admin.name || "",
          username: admin.username || "",
          email: admin.email || "",
          phone: admin.phone || "",
          bio: admin.bio || ""
        })
      }
    }
  }, [admin, editing])

  // Load freshest profile from server
  useEffect(() => {
    let active = true
    const loadFresh = async () => {
      setLoadingProfile(true)
      try {
        const res = await call("/admin/me", { headers: getAdminHeaders(), noCache: true })
        if (!active || !res?.admin) return
        setProfile(res.admin)
        setForm({
          name: res.admin.name || "",
          username: res.admin.username || "",
          email: res.admin.email || "",
          phone: res.admin.phone || "",
          bio: res.admin.bio || ""
        })
      } catch (_) {
        // Fallback silently to existing admin prop
      } finally {
        if (active) setLoadingProfile(false)
      }
    }
    loadFresh()
    return () => { active = false }
  }, [])

  const isSuper = profile?.isSuper !== false
  const initialLetter = (profile?.name || profile?.username || profile?.email || "A").trim().charAt(0).toUpperCase()
  const displayName = profile?.name || (isSuper ? "Super Admin" : "Sub Admin")

  const startEdit = () => {
    setForm({
      name: profile?.name || "",
      username: profile?.username || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
      bio: profile?.bio || ""
    })
    setProfileError("")
    setProfileSuccess("")
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setProfileError("")
    setForm({
      name: profile?.name || "",
      username: profile?.username || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
      bio: profile?.bio || ""
    })
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setProfileError("")
    setProfileSuccess("")

    const cleanName = form.name.trim()
    const cleanEmail = form.email.trim().toLowerCase()
    const cleanUsername = form.username.trim().toLowerCase()

    if (cleanName.length < 2 || cleanName.length > 80) {
      setProfileError("Display name must be between 2 and 80 characters.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setProfileError("Please enter a valid email address.")
      return
    }
    if (cleanUsername && !/^[a-zA-Z0-9._-]{3,40}$/.test(cleanUsername)) {
      setProfileError("Username must be 3–40 characters using letters, numbers, '.', '_' or '-'.")
      return
    }

    setSavingProfile(true)
    try {
      const res = await call("/admin/profile", {
        method: "PUT",
        headers: getAdminHeaders(),
        body: JSON.stringify({
          name: cleanName,
          username: cleanUsername,
          email: cleanEmail,
          phone: form.phone.trim(),
          bio: form.bio.trim()
        })
      })

      if (res?.admin) {
        setProfile(res.admin)
        onAdminUpdated?.(res.admin, res.token)
      }
      setEditing(false)
      setProfileSuccess(res?.detail || "Profile updated successfully.")
    } catch (err) {
      setProfileError(err?.detail || err?.message || "Could not update profile details.")
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPassError("")
    setPassSuccess("")

    if (!passForm.currentPassword) {
      setPassError("Please enter your current password.")
      return
    }
    if (passForm.newPassword.length < 8 || !/[A-Za-z]/.test(passForm.newPassword) || !/\d/.test(passForm.newPassword)) {
      setPassError("New password must be at least 8 characters with letters and numbers.")
      return
    }
    if (passForm.newPassword !== passForm.confirmPassword) {
      setPassError("New password and confirm password do not match.")
      return
    }
    if (passForm.newPassword === passForm.currentPassword) {
      setPassError("New password must be different from your current password.")
      return
    }

    setSavingPass(true)
    try {
      const res = await call("/admin/profile/password", {
        method: "PUT",
        headers: getAdminHeaders(),
        body: JSON.stringify({
          currentPassword: passForm.currentPassword,
          newPassword: passForm.newPassword,
          confirmPassword: passForm.confirmPassword
        })
      })
      if (res?.token) {
        localStorage.setItem("slipzo_admin_token", res.token)
        onAdminUpdated?.(res.admin || profile, res.token)
      }
      setPassForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
      setShowPass({ current: false, next: false, confirm: false })
      setPassSuccess(res?.detail || "Password changed successfully.")
    } catch (err) {
      setPassError(err?.detail || err?.message || "Could not update password.")
    } finally {
      setSavingPass(false)
    }
  }

  return (
    <div className="apf-wrap">
      {/* Top Hero Profile Card */}
      <section className="apf-hero">
        <div className="apf-hero-cover" />
        <div className="apf-hero-body">
          <div className="apf-hero-top">
            <div className="apf-hero-identity">
              <div className="apf-avatar">{initialLetter}</div>
              <div className="apf-hero-titles">
                <div className="apf-hero-name-row">
                  <h3>{displayName}</h3>
                  <span className={`admin-role-pill ${isSuper ? "super" : "sub"}`}>
                    <ShieldCheck size={12} /> {isSuper ? "Super Admin" : "Sub-admin"}
                  </span>
                </div>
                <div className="apf-hero-sub-row">
                  {profile?.username && (
                    <span className="apf-handle">@{profile.username}</span>
                  )}
                  <span className="apf-email-chip">{profile?.email}</span>
                </div>
                {profile?.bio && <p className="apf-bio-text">{profile.bio}</p>}
              </div>
            </div>

            {!editing && (
              <button type="button" className="apf-edit-btn" onClick={startEdit}>
                <Edit2 size={14} /> <span>Edit Profile</span>
              </button>
            )}
          </div>

          <div className="apf-meta-strip">
            <div className="apf-meta-item">
              <span className="apf-meta-lbl"><AtSign size={13} /> Username</span>
              <strong>{profile?.username ? `@${profile.username}` : "Not set"}</strong>
            </div>
            <div className="apf-meta-item">
              <span className="apf-meta-lbl"><Phone size={13} /> Phone</span>
              <strong>{profile?.phone || "Not added"}</strong>
            </div>
            <div className="apf-meta-item">
              <span className="apf-meta-lbl"><Clock size={13} /> Last Sign-In</span>
              <strong>{loadingProfile ? "Checking..." : formatTimestamp(profile?.lastLoginAt || profile?.loginTime)}</strong>
            </div>
            <div className="apf-meta-item">
              <span className="apf-meta-lbl"><ShieldCheck size={13} /> Access Level</span>
              <strong>
                {isSuper
                  ? "Full Platform Control"
                  : `${Array.isArray(profile?.permissions) ? profile.permissions.length : 0} Modules Enabled`}
              </strong>
            </div>
          </div>
        </div>
      </section>

      {/* Main 2-Column Settings Grid */}
      <div className="apf-grid">
        {/* Card 1: View & Edit Profile Details */}
        <section className="apf-card">
          <div className="apf-card-head">
            <div className="apf-card-head-left">
              <span className="apf-card-icon tone-blue"><User size={18} /></span>
              <div>
                <h4>Profile Details</h4>
                <p>Manage your admin display name, login username, and contact details</p>
              </div>
            </div>
            {!editing && (
              <button type="button" className="apf-ghost-btn" onClick={startEdit}>
                <Edit2 size={13} /> Edit
              </button>
            )}
          </div>

          {profileError && (
            <div className="apf-alert error">
              <AlertCircle size={16} /> <span>{profileError}</span>
            </div>
          )}
          {profileSuccess && (
            <div className="apf-alert success">
              <CheckCircle2 size={16} /> <span>{profileSuccess}</span>
            </div>
          )}

          {!editing ? (
            <dl className="apf-details-list">
              <div className="apf-detail-row">
                <dt><User size={14} /> Display Name</dt>
                <dd>{displayName}</dd>
              </div>
              <div className="apf-detail-row">
                <dt><AtSign size={14} /> Login Username</dt>
                <dd>{profile?.username ? <code>@{profile.username}</code> : <span className="apf-muted">Not set (sign in via email)</span>}</dd>
              </div>
              <div className="apf-detail-row">
                <dt><Mail size={14} /> Email Address</dt>
                <dd>{profile?.email || "—"}</dd>
              </div>
              <div className="apf-detail-row">
                <dt><Phone size={14} /> Phone Number</dt>
                <dd>{profile?.phone || <span className="apf-muted">Not provided</span>}</dd>
              </div>
              <div className="apf-detail-row">
                <dt><FileText size={14} /> Role / Bio</dt>
                <dd>{profile?.bio || <span className="apf-muted">No bio added</span>}</dd>
              </div>
            </dl>
          ) : (
            <form onSubmit={handleSaveProfile} className="apf-form">
              <div className="apf-field">
                <label htmlFor="apf-name">Display Name *</label>
                <div className="apf-input-box">
                  <User size={15} className="apf-input-ic" />
                  <input
                    id="apf-name"
                    type="text"
                    required
                    minLength={2}
                    maxLength={80}
                    placeholder="e.g. Kuldeep Mahajan"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="apf-form-row2">
                <div className="apf-field">
                  <label htmlFor="apf-username">Login Username</label>
                  <div className="apf-input-box">
                    <AtSign size={15} className="apf-input-ic" />
                    <input
                      id="apf-username"
                      type="text"
                      maxLength={40}
                      placeholder="e.g. admin or kuldeep"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                    />
                  </div>
                  <small>Use this username or your email to log in.</small>
                </div>

                <div className="apf-field">
                  <label htmlFor="apf-email">Email Address *</label>
                  <div className="apf-input-box">
                    <Mail size={15} className="apf-input-ic" />
                    <input
                      id="apf-email"
                      type="email"
                      required
                      maxLength={120}
                      placeholder="admin@slipzo.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="apf-field">
                <label htmlFor="apf-phone">Phone Number</label>
                <div className="apf-input-box">
                  <Phone size={15} className="apf-input-ic" />
                  <input
                    id="apf-phone"
                    type="tel"
                    maxLength={24}
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="apf-field">
                <label htmlFor="apf-bio">Role Title / Bio</label>
                <textarea
                  id="apf-bio"
                  rows={2}
                  maxLength={200}
                  placeholder="Short note about your role..."
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </div>

              <div className="apf-form-actions">
                <button type="button" className="apf-btn-secondary" onClick={cancelEdit} disabled={savingProfile}>
                  <X size={14} /> Cancel
                </button>
                <button type="submit" className="apf-btn-primary" disabled={savingProfile}>
                  {savingProfile ? <ButtonLoader text="Saving..." /> : <><Check size={15} /> Save Profile</>}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Card 2: Change Password */}
        <section className="apf-card">
          <div className="apf-card-head">
            <div className="apf-card-head-left">
              <span className="apf-card-icon tone-indigo"><KeyRound size={18} /></span>
              <div>
                <h4>Password &amp; Security</h4>
                <p>Update your login password anytime to keep your panel protected</p>
              </div>
            </div>
          </div>

          {passError && (
            <div className="apf-alert error">
              <AlertCircle size={16} /> <span>{passError}</span>
            </div>
          )}
          {passSuccess && (
            <div className="apf-alert success">
              <CheckCircle2 size={16} /> <span>{passSuccess}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="apf-form">
            <div className="apf-field">
              <label htmlFor="apf-curr-pass">Current Password *</label>
              <div className="apf-input-box">
                <Lock size={15} className="apf-input-ic" />
                <input
                  id="apf-curr-pass"
                  type={showPass.current ? "text" : "password"}
                  required
                  placeholder="Enter current password"
                  value={passForm.currentPassword}
                  onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })}
                />
                <button
                  type="button"
                  className="apf-eye-btn"
                  onClick={() => setShowPass((p) => ({ ...p, current: !p.current }))}
                  tabIndex={-1}
                  aria-label="Toggle current password visibility"
                >
                  {showPass.current ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="apf-field">
              <label htmlFor="apf-new-pass">New Password *</label>
              <div className="apf-input-box">
                <KeyRound size={15} className="apf-input-ic" />
                <input
                  id="apf-new-pass"
                  type={showPass.next ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="Enter new password (min 6 chars)"
                  value={passForm.newPassword}
                  onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                />
                <button
                  type="button"
                  className="apf-eye-btn"
                  onClick={() => setShowPass((p) => ({ ...p, next: !p.next }))}
                  tabIndex={-1}
                  aria-label="Toggle new password visibility"
                >
                  {showPass.next ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <small>Use at least 6 characters combining letters and numbers for stronger security.</small>
            </div>

            <div className="apf-field">
              <label htmlFor="apf-conf-pass">Confirm New Password *</label>
              <div className="apf-input-box">
                <KeyRound size={15} className="apf-input-ic" />
                <input
                  id="apf-conf-pass"
                  type={showPass.confirm ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="Re-enter new password"
                  value={passForm.confirmPassword}
                  onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                />
                <button
                  type="button"
                  className="apf-eye-btn"
                  onClick={() => setShowPass((p) => ({ ...p, confirm: !p.confirm }))}
                  tabIndex={-1}
                  aria-label="Toggle confirm password visibility"
                >
                  {showPass.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="apf-form-actions">
              <button type="submit" className="apf-btn-primary" disabled={savingPass}>
                {savingPass ? <ButtonLoader text="Updating..." /> : <><Lock size={14} /> Update Password</>}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
