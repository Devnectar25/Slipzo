import { useEffect, useState } from "react"
import { Users, Phone, Trash2, UserPlus, ShieldCheck, Printer, AlertCircle, Copy, Check, RefreshCw, LogOut, Store, X, CheckCircle2, Sparkles } from "lucide-react"
import { useTranslation } from "react-i18next"
import Swal from "sweetalert2"
import { call, clearApiCache, clearStoredMenuItems } from "../lib/utils"
import { useDbTranslation } from "../lib/translator"
import { useToast } from "./common/Toast"
import { StaffShopProfile } from "./StaffShopProfile"
import { ButtonLoader, Skeleton, Spinner } from "./common/Skeleton"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// "+91 98765-43210", "09876543210" and "9876543210" are all the same number
const normalizeMobile = (value) => {
  let digits = String(value || "").replace(/[\s\-().]/g, "")
  if (digits.startsWith("+")) digits = digits.slice(1)
  if (!/^\d+$/.test(digits)) return null
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2)
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1)
  return /^[6-9]\d{9}$/.test(digits) ? digits : null
}

// Workers are shown by mobile number; an older worker account made with an email shows that instead
const memberLabel = (m) => (m?.phone ? `+91 ${m.phone}` : m?.email || "")

// Joining or leaving swaps every piece of data on screen, so start clean
const reloadWithFreshData = (user, staffOf) => {
  clearApiCache()
  clearStoredMenuItems(user)
  // the app opens from what is saved on the phone: it must already know the new shop
  if (staffOf !== undefined) {
    try {
      const known = JSON.parse(localStorage.getItem("slipzo_user_info") || "null")
      if (known) localStorage.setItem("slipzo_user_info", JSON.stringify({ ...known, staff_of: staffOf || null }))
    } catch (_) { /* checked with the server after the reload */ }
  }
  window.location.reload()
}

const printNumber = { width: "62px", textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }
const printRow = (extra) => ({ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 62px 62px", alignItems: "center", gap: "0.4rem", padding: "0.5rem 0.8rem", fontSize: "0.82rem", color: "#334155", ...extra })

const STATUS_STYLES = {
  active: { background: "#dcfce7", color: "#166534" },
  pending: { background: "#fef3c7", color: "#92400e" },
  expired: { background: "#fee2e2", color: "#991b1b" },
}

function StatusBadge({ member }) {
  const { t } = useTranslation()
  const key = member.status === "active" ? "active" : member.invite_expired ? "expired" : "pending"
  const label = {
    active: t("profile.staffStatusActive", "Active"),
    pending: t("profile.staffStatusPending", "Waiting to join"),
    expired: t("profile.staffStatusExpired", "Code expired"),
  }[key]
  return (
    <span style={{ ...STATUS_STYLES[key], fontSize: "0.68rem", fontWeight: 700, padding: "0.1rem 0.5rem", borderRadius: "999px", whiteSpace: "nowrap" }}>
      {label}
    </span>
  )
}

/** Shop owner's card: invite workers, see who has access, remove them, and enter a code from another shop. */
export function StaffAccessCard({ user }) {
  const { t } = useTranslation()
  const { formatNum } = useDbTranslation()
  const { success, error: toastError } = useToast()
  const [members, setMembers] = useState(null)
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState("")
  const [unregisteredPhone, setUnregisteredPhone] = useState(null)
  const [inviting, setInviting] = useState(false)
  const [newInvite, setNewInvite] = useState(null) // { email, code }, shown once
  const [copied, setCopied] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [prints, setPrints] = useState(null) // { workers, today, month }: prints per person

  // Registration modal for new staff
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [registerForm, setRegisterForm] = useState({ phone: "", name: "", password: "" })
  const [registering, setRegistering] = useState(false)
  const [registerError, setRegisterError] = useState("")

  // Credentials banner for newly registered staff
  const [newStaffCredentials, setNewStaffCredentials] = useState(null)
  const [copiedCreds, setCopiedCreds] = useState(false)

  // Incoming invitations from other shops for this user
  const [myInvitations, setMyInvitations] = useState([])
  const [acceptingInviteId, setAcceptingInviteId] = useState(null)

  useEffect(() => {
    let isMounted = true
    call("/shop/staff", { noCache: true })
      .then((rows) => { if (isMounted) setMembers(Array.isArray(rows) ? rows : []) })
      .catch(() => { if (isMounted) setMembers([]) })

    const midnight = new Date()
    midnight.setHours(0, 0, 0, 0)
    call(`/shop/staff/prints?from=${encodeURIComponent(midnight.toISOString())}`, { noCache: true })
      .then((res) => { if (isMounted && Array.isArray(res?.workers)) setPrints(res) })
      .catch(() => {})

    call("/shop/staff/invitations", { noCache: true })
      .then((invites) => { if (isMounted && Array.isArray(invites)) setMyInvitations(invites) })
      .catch(() => {})

    return () => { isMounted = false }
  }, [])

  const showInvite = (memberEmail, code) => {
    setNewInvite({ email: memberEmail, code })
    setCopied(false)
  }

  const handleInvite = async () => {
    const entered = email.trim()
    if (!entered) return setEmailError(t("profile.emailRequired", "Please enter the worker's mobile number."))
    let body
    let phoneNum = null
    if (entered.includes("@")) {
      if (!EMAIL_REGEX.test(entered.toLowerCase())) return setEmailError(t("profile.emailInvalid", "Please enter a valid 10-digit mobile number."))
      body = { email: entered.toLowerCase() }
    } else {
      const mobile = normalizeMobile(entered)
      if (!mobile) return setEmailError(t("profile.emailInvalid", "Please enter a valid 10-digit mobile number."))
      phoneNum = mobile
      body = { phone: mobile }
    }
    setInviting(true)
    setEmailError("")
    setUnregisteredPhone(null)
    try {
      const res = await call("/shop/staff", { method: "POST", body: JSON.stringify(body) })

      // If user is not registered, open registration modal right away
      if (res?.not_registered || res?.requires_registration) {
        const p = res.phone || phoneNum || normalizeMobile(entered) || entered.replace(/\D/g, "").slice(-10)
        setUnregisteredPhone(p)
        setRegisterForm({
          phone: p,
          name: "",
          password: p ? p.slice(-6) : ""
        })
        setRegisterError("")
        setEmailError("")
        setShowRegisterModal(true)
        return
      }

      setMembers((prev) => [res.member, ...(prev || [])])
      setEmail("")
      setEmailError("")
      if (res.is_invite) {
        showInvite(memberLabel(res.member), res.invite_code)
        success(res.message || t("profile.staffInviteSent", "Invitation sent to worker with push notification!"))
      } else {
        success(res.message || t("profile.workerAddedSuccess", "Worker added as active staff!"))
      }
    } catch (err) {
      const errMsg = String(err?.message || err?.rawMessage || "")
      const isUnregistered =
        Boolean(err?.data?.not_registered) ||
        Boolean(err?.not_registered) ||
        err?.status === 404 ||
        errMsg.toLowerCase().includes("register them as a new staff member") ||
        errMsg.toLowerCase().includes("no slipzo account found") ||
        errMsg.toLowerCase().includes("not registered")

      if (isUnregistered && (phoneNum || entered)) {
        const p = phoneNum || err?.data?.phone || normalizeMobile(entered) || entered.replace(/\D/g, "").slice(-10)
        setUnregisteredPhone(p)
        setRegisterForm({
          phone: p,
          name: "",
          password: p ? p.slice(-6) : ""
        })
        setRegisterError("")
        setShowRegisterModal(true)
      } else {
        setEmailError(err?.message || t("profile.staffActionFailed", "Something went wrong. Please try again."))
      }
    } finally {
      setInviting(false)
    }
  }

  const handleRegisterStaff = async () => {
    if (!registerForm.name.trim()) {
      return setRegisterError(t("profile.staffNameRequired", "Please enter the staff member's name."))
    }
    const password = String(registerForm.password || "").trim()
    if (!password || password.length < 4) {
      return setRegisterError(t("profile.staffPassLength", "Password must be at least 4 characters."))
    }
    setRegistering(true)
    setRegisterError("")
    try {
      const res = await call("/shop/staff", {
        method: "POST",
        body: JSON.stringify({
          phone: registerForm.phone,
          name: registerForm.name.trim(),
          password: password,
          create_account: true
        })
      })
      setMembers((prev) => [res.member, ...(prev || [])])
      setEmail("")
      setEmailError("")
      setUnregisteredPhone(null)
      setShowRegisterModal(false)
      if (res.is_new) {
        setNewStaffCredentials({
          phone: registerForm.phone,
          name: registerForm.name.trim(),
          password: res.temp_password || password
        })
        success(t("profile.staffCreatedSuccess", "Staff registered and added to your shop successfully!"))
      } else {
        // the number already has an account: the password typed here was not used, so it must not be shown as the login
        if (res.is_invite) showInvite(memberLabel(res.member), res.invite_code)
        Swal.fire({
          icon: "info",
          title: t("workers.hasAccountTitle", "This number already has an account"),
          text: t("workers.hasAccountText", "Your worker signs in with their own password. If they do not remember it, they can use Forgot password on the sign-in screen."),
          confirmButtonColor: "#0284c7"
        })
      }
    } catch (err) {
      setRegisterError(err?.message || t("profile.staffActionFailed", "Something went wrong. Please try again."))
    } finally {
      setRegistering(false)
    }
  }

  const handleAcceptInvitation = async (invite) => {
    const answer = await Swal.fire({
      title: t("profile.acceptInviteTitle", "Join {{shop}}?", { shop: invite.shop_name || invite.owner_name }),
      text: t("profile.acceptInviteText", "You will bill and print for that shop instead of your own. Your own shop stays saved, and you can leave at any time."),
      icon: "question",
      showCancelButton: true,
      confirmButtonText: t("profile.acceptAndJoin", "Accept & Join Shop"),
      cancelButtonText: t("common.cancel", "Cancel"),
      confirmButtonColor: "#0284c7"
    })
    if (!answer.isConfirmed) return
    setAcceptingInviteId(invite.id)
    try {
      const res = await call(`/shop/staff/invitations/${invite.id}/accept`, { method: "POST" })
      reloadWithFreshData(user, res?.staff_of)
    } catch (err) {
      toastError(err?.message || t("profile.staffActionFailed", "Something went wrong."))
      setAcceptingInviteId(null)
    }
  }

  const handleNewCode = async (member) => {
    setBusyId(member.id)
    try {
      const res = await call(`/shop/staff/${member.id}/regenerate`, { method: "POST" })
      setMembers((prev) => prev.map((m) => (m.id === member.id ? res.member : m)))
      showInvite(memberLabel(res.member), res.invite_code)
      success(t("profile.staffCodeRegenerated", "New invite code generated and notification sent!"))
    } catch (err) {
      toastError(err?.message || t("profile.staffActionFailed", "Something went wrong. Please try again."))
    } finally {
      setBusyId(null)
    }
  }

  const handleRevoke = async (member) => {
    const answer = await Swal.fire({
      title: t("profile.staffRevokeTitle", "Remove this worker?"),
      text: t("profile.staffRevokeText", "They will no longer be able to bill or print for your shop."),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: t("profile.revoke", "Revoke"),
      cancelButtonText: t("common.cancel", "Cancel"),
      confirmButtonColor: "#ef4444",
    })
    if (!answer.isConfirmed) return
    setBusyId(member.id)
    try {
      await call(`/shop/staff/${member.id}`, { method: "DELETE" })
      setMembers((prev) => prev.filter((m) => m.id !== member.id))
      if (newInvite?.email === memberLabel(member)) setNewInvite(null)
      success(t("profile.workerEmailRemoved", "Worker access removed."))
    } catch (err) {
      toastError(err?.message || t("profile.staffActionFailed", "Something went wrong. Please try again."))
    } finally {
      setBusyId(null)
    }
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(newInvite.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (_) {
      toastError(t("profile.staffCopyFailed", "Could not copy. Please note the code down."))
    }
  }



  return (
    <div className="sp-card sp-subusers-card">
      <div className="sp-card-header">
        <div className="sp-icon-box blue">
          <Users size={18} />
        </div>
        <div className="sp-card-titles">
          <h3 className="sp-card-title">{t("profile.subusersTitle", "Staff & Sub-Users (Printer Sharing)")}</h3>
          <p className="sp-card-subtitle">{t("profile.subusersSub", "Share receipt printing and billing access with your workers' mobile numbers")}</p>
        </div>
      </div>

      {/* Incoming Invitations Banner (if this user was invited by another shop) */}
      {myInvitations.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          {myInvitations.map((inv) => (
            <div key={inv.id} style={{
              background: "linear-gradient(135deg, #e0f2fe 0%, #f0fdf4 100%)",
              border: "1.5px solid #7dd3fc",
              borderRadius: "12px",
              padding: "0.85rem 1rem",
              marginBottom: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              flexWrap: "wrap"
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#0369a1", fontWeight: 800, fontSize: "0.86rem" }}>
                  <Sparkles size={16} />
                  <span>{t("profile.inviteBannerTitle", "You have a Staff Role Invitation!")}</span>
                </div>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.78rem", color: "#334155" }}>
                  <strong>{inv.shop_name || inv.owner_name}</strong> {t("profile.inviteBannerBody", "invited you to join as staff.")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleAcceptInvitation(inv)}
                disabled={acceptingInviteId === inv.id}
                style={{
                  background: "#0284c7",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.45rem 0.9rem",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem"
                }}
              >
                {acceptingInviteId === inv.id ? <ButtonLoader text={t("profile.joining", "Joining...")} /> : <><Check size={14} /> <span>{t("profile.acceptAndJoin", "Accept & Join")}</span></>}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="sp-field-group full-width">
        <label className="sp-label">{t("profile.addWorkerLabel", "Worker / Staff Mobile Number")}</label>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "stretch" }}>
          <div className={`sp-input-wrap ${emailError ? "error" : ""}`} style={{ flex: 1, minWidth: "220px" }}>
            <Phone size={16} className="sp-input-icon" />
            <input
              type="tel"
              inputMode={/[a-zA-Z@]/.test(email) ? "email" : "numeric"}
              className="sp-input"
              data-testid="staff-email-input"
              placeholder={t("profile.workerEmailPlaceholder", "e.g. 9876543210")}
              value={email}
              maxLength={/[a-zA-Z@]/.test(email) ? 64 : 10}
              onChange={(e) => {
                const val = e.target.value
                if (val.includes("@") || /[a-zA-Z]/.test(val)) {
                  setEmail(val.slice(0, 64))
                } else {
                  let raw = val.replace(/\D/g, "")
                  if (raw.length === 12 && raw.startsWith("91")) raw = raw.slice(2)
                  else if (raw.length === 11 && raw.startsWith("0")) raw = raw.slice(1)
                  setEmail(raw.slice(0, 10))
                }
                if (emailError) setEmailError("")
                if (unregisteredPhone) setUnregisteredPhone(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleInvite()
                }
              }}
            />
          </div>
          <button
            type="button"
            data-testid="staff-invite-button"
            onClick={handleInvite}
            disabled={inviting}
            style={{ background: "#0284c7", color: "#ffffff", border: "none", borderRadius: "10px", padding: "0 1.1rem", minHeight: "44px", fontWeight: 700, fontSize: "0.84rem", cursor: inviting ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", whiteSpace: "nowrap" }}
          >
            {inviting ? <ButtonLoader text={t("profile.staffInviting", "Adding...")} /> : <><UserPlus size={16} /><span>{t("profile.addWorkerBtn", "+ Add Access")}</span></>}
          </button>
        </div>
        {emailError ? (
          <div style={{ color: "#ef4444", fontSize: "0.76rem", marginTop: "0.35rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <AlertCircle size={12} /> {emailError}
          </div>
        ) : (
          <p style={{ fontSize: "0.74rem", color: "#64748b", margin: "0.35rem 0 0" }}>
            {t("profile.workerEmailHelper", "Enter your worker's mobile number. If they are new, you can register them directly.")}
          </p>
        )}

        {/* Option to register staff when not found */}
        {(unregisteredPhone || (emailError && (emailError.toLowerCase().includes("no slipzo account") || emailError.toLowerCase().includes("register")))) && (
          <div style={{ marginTop: "0.6rem" }}>
            <button
              type="button"
              onClick={() => {
                const p = unregisteredPhone || normalizeMobile(email) || email.replace(/\D/g, "").slice(-10)
                setRegisterForm({ phone: p, name: "", password: p ? p.slice(-6) : "" })
                setRegisterError("")
                setShowRegisterModal(true)
              }}
              style={{
                background: "#0284c7",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "0.5rem 1rem",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                boxShadow: "0 2px 4px rgba(2, 132, 199, 0.25)"
              }}
            >
              <UserPlus size={16} />
              <span>{t("profile.registerStaffBtn", "+ Register this staff member now")}</span>
            </button>
          </div>
        )}
      </div>

      {/* Login Credentials Banner for newly created staff */}
      {newStaffCredentials && (
        <div style={{
          background: "#f0fdf4",
          border: "1.5px solid #86efac",
          borderRadius: "12px",
          padding: "0.85rem 1rem",
          marginTop: "0.85rem",
          marginBottom: "0.5rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#166534", fontWeight: 800, fontSize: "0.86rem" }}>
            <CheckCircle2 size={16} />
            <span>{t("profile.staffCreatedTitle", "Staff Account Created & Added!")}</span>
          </div>
          <p style={{ margin: "0.25rem 0 0.5rem", fontSize: "0.76rem", color: "#1e293b" }}>
            {t("profile.staffCreatedNotice", "Give these login details to your staff member so they can log in:")}
          </p>
          <div style={{
            background: "#ffffff",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            padding: "0.5rem 0.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
            fontSize: "0.8rem"
          }}>
            <div><strong>{t("profile.staffName", "Name")}:</strong> {newStaffCredentials.name}</div>
            <div><strong>{t("profile.staffPhone", "Mobile")}:</strong> +91 {newStaffCredentials.phone}</div>
            <div><strong>{t("profile.staffPassword", "Password")}:</strong> <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>{newStaffCredentials.password}</code></div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(`Slipzen Staff Login:\nMobile: ${newStaffCredentials.phone}\nPassword: ${newStaffCredentials.password}`)
                setCopiedCreds(true)
                setTimeout(() => setCopiedCreds(false), 2000)
              }}
              style={{
                background: "#ffffff",
                color: "#166534",
                border: "1px solid #86efac",
                borderRadius: "8px",
                padding: "0.35rem 0.75rem",
                fontSize: "0.76rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem"
              }}
            >
              {copiedCreds ? <Check size={13} /> : <Copy size={13} />}
              {copiedCreds ? t("profile.staffCopied", "Copied") : t("profile.copyCredentials", "Copy Login Details")}
            </button>
            <a
              href={`https://wa.me/91${newStaffCredentials.phone}?text=${encodeURIComponent(`Hello ${newStaffCredentials.name || 'there'}, you have been added as staff for ${user?.shop?.name || user?.name || 'our shop'} on Slipzen.\n\nLogin Mobile: ${newStaffCredentials.phone}\nPassword: ${newStaffCredentials.password}\n\nLogin here: https://slipzen.com`)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "#25d366",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "0.35rem 0.75rem",
                fontSize: "0.76rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                textDecoration: "none"
              }}
            >
              <span>{t("profile.shareWhatsApp", "Share on WhatsApp")}</span>
            </a>
            <button
              type="button"
              onClick={() => setNewStaffCredentials(null)}
              style={{
                background: "transparent",
                color: "#64748b",
                border: "none",
                padding: "0.35rem 0.5rem",
                fontSize: "0.76rem",
                fontWeight: 600,
                cursor: "pointer",
                marginLeft: "auto"
              }}
            >
              {t("common.close", "Dismiss")}
            </button>
          </div>
        </div>
      )}

      {newInvite && (
        <div data-testid="staff-invite-panel" style={{ background: "#f0f9ff", border: "1.5px solid #7dd3fc", borderRadius: "12px", padding: "0.85rem 1rem", marginTop: "0.85rem" }}>
          <div style={{ fontSize: "0.78rem", color: "#0369a1", fontWeight: 700, overflowWrap: "anywhere" }}>
            {t("profile.staffCodeFor", "Invite code for")} {newInvite.email}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", margin: "0.4rem 0", flexWrap: "wrap" }}>
            <code data-testid="staff-invite-code" style={{ fontFamily: "ui-monospace, Consolas, monospace", fontSize: "1.3rem", fontWeight: 800, letterSpacing: "0.08em", color: "#0C1F41" }}>{newInvite.code}</code>
            <button type="button" onClick={copyCode} style={{ background: "#ffffff", color: "#0284c7", border: "1px solid #7dd3fc", borderRadius: "8px", padding: "0.3rem 0.7rem", fontWeight: 700, fontSize: "0.76rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? t("profile.staffCopied", "Copied") : t("profile.staffCopy", "Copy")}
            </button>
          </div>
          <ol style={{ listStyle: "decimal", margin: "0.3rem 0 0.2rem", paddingLeft: "1.1rem", fontSize: "0.74rem", color: "#334155", lineHeight: 1.5 }}>
            <li>{t("profile.staffStep1", "Your worker logs in to Slipzen with this mobile number.")}</li>
            <li>{t("profile.staffStep2", "They open Shop Profile and accept the invitation to join your shop.")}</li>
          </ol>
          <p style={{ fontSize: "0.72rem", color: "#92400e", margin: "0.3rem 0 0", fontWeight: 600 }}>
            {t("profile.staffCodeOnce", "Note it down now: it is shown only once and works for 7 days.")}
          </p>
        </div>
      )}

      <div style={{ marginTop: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.5rem" }}>
          <ShieldCheck size={14} style={{ color: "#0284c7" }} />
          <span>{t("profile.authorizedWorkersList", "Authorized Workers")} ({members ? members.length : "…"})</span>
        </div>

        {members === null ? (
          <Skeleton height="56px" borderRadius="10px" />
        ) : members.length === 0 ? (
          <div style={{ border: "1.5px dashed #cbd5e1", borderRadius: "12px", padding: "1.25rem", textAlign: "center", color: "#64748b", fontSize: "0.82rem" }}>
            <Printer size={20} style={{ marginBottom: "0.35rem" }} />
            <div>{t("profile.noWorkersYet", "No workers added yet. Add a mobile number above to share printer & billing access.")}</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "260px", overflowY: "auto" }}>
            {members.map((member) => (
              <div key={member.id} data-testid="staff-member-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", padding: "0.55rem 0.8rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", gap: "0.4rem" }}>
                <div style={{ minWidth: 0, flex: "1 1 170px" }}>
                  {member.name && (
                    <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "#0f172a" }}>
                      {member.name}
                    </div>
                  )}
                  <div style={{ fontSize: member.name ? "0.76rem" : "0.84rem", fontWeight: member.name ? 500 : 600, color: member.name ? "#64748b" : "#0C1F41", overflowWrap: "anywhere" }}>
                    {memberLabel(member)}
                  </div>
                  <div style={{ marginTop: "0.15rem" }}><StatusBadge member={member} /></div>
                </div>
                <div style={{ display: "flex", gap: "0.25rem", flexShrink: 0 }}>
                  {member.status === "pending" && (
                    <button type="button" onClick={() => handleNewCode(member)} disabled={busyId === member.id} title={t("profile.staffNewCodeHint", "Replaces any earlier code")} style={{ background: "transparent", border: "none", color: "#0284c7", cursor: "pointer", padding: "4px 8px", borderRadius: "6px", fontSize: "0.76rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                      {busyId === member.id ? <Spinner size="xs" /> : <RefreshCw size={13} />}
                      <span>{t("profile.staffNewCode", "New code")}</span>
                    </button>
                  )}
                  <button type="button" data-testid="staff-revoke-button" onClick={() => handleRevoke(member)} disabled={busyId === member.id} title={t("profile.revokeAccess", "Revoke Access")} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px 8px", borderRadius: "6px", fontSize: "0.76rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                    <Trash2 size={13} />
                    <span>{t("profile.revoke", "Revoke")}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Who printed how much: it all counts on this shop's plan */}
      {prints?.workers?.length > 0 && (
        <div data-testid="staff-prints" style={{ marginTop: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.5rem" }}>
            <Printer size={14} style={{ color: "#0284c7" }} />
            <span>{t("workers.printsTitle", "Prints by person")}</span>
          </div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", background: "#ffffff" }}>
            <div style={printRow({ background: "#f8fafc", fontSize: "0.72rem", fontWeight: 700, color: "#64748b" })}>
              <span />
              <span style={printNumber}>{t("workers.today", "Today")}</span>
              <span style={printNumber}>{t("workers.days30", "30 days")}</span>
            </div>
            {prints.workers.map((w) => (
              <div key={w.worker_id} style={printRow({ borderTop: "1px solid #f1f5f9" })}>
                <span style={{ minWidth: 0, overflowWrap: "anywhere", fontWeight: 600, color: "#0f172a" }}>
                  {w.is_owner ? t("workers.owner", "You (owner)") : w.name || t("workers.former", "Former worker")}
                </span>
                <span style={printNumber}>{formatNum(w.today)}</span>
                <span style={printNumber}>{formatNum(w.month)}</span>
              </div>
            ))}
            <div style={printRow({ borderTop: "1px solid #e2e8f0", background: "#f0f9ff", fontWeight: 800, color: "#0369a1" })}>
              <span>{t("workers.total", "Total")}</span>
              <span style={printNumber}>{formatNum(prints.today)}</span>
              <span style={printNumber}>{formatNum(prints.month)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Registration Modal for New Staff */}
      {showRegisterModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          background: "rgba(15, 23, 42, 0.55)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem"
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "16px",
            maxWidth: "420px",
            width: "100%",
            padding: "1.25rem 1.4rem",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e2e8f0"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#e0f2fe", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <UserPlus size={18} />
                </div>
                <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
                  {t("profile.registerStaffTitle", "Register New Staff")}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "0.78rem", color: "#475569", lineHeight: 1.45, margin: "0 0 1rem" }}>
              {t("profile.registerStaffDesc", "This mobile number is not registered yet. Create their staff profile so they can log in immediately and start billing.")}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "#334155", marginBottom: "3px" }}>
                  {t("profile.staffPhone", "Mobile Number")}
                </label>
                <input
                  type="text"
                  value={`+91 ${registerForm.phone}`}
                  disabled
                  style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#f8fafc", color: "#64748b", fontSize: "0.85rem", fontWeight: 600, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "#334155", marginBottom: "3px" }}>
                  {t("profile.staffNameLabel", "Staff Member Name")} *
                </label>
                <input
                  type="text"
                  placeholder={t("profile.staffNamePlaceholder", "e.g. Ramesh Kumar")}
                  value={registerForm.name}
                  onChange={(e) => {
                    setRegisterForm(prev => ({ ...prev, name: e.target.value }))
                    if (registerError) setRegisterError("")
                  }}
                  autoFocus
                  style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1.5px solid #0284c7", fontSize: "0.85rem", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "#334155", marginBottom: "3px" }}>
                  {t("profile.staffPassLabel", "Staff Login Password / PIN")} *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 123456"
                  value={registerForm.password}
                  onChange={(e) => {
                    setRegisterForm(prev => ({ ...prev, password: e.target.value }))
                    if (registerError) setRegisterError("")
                  }}
                  style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box" }}
                />
                <small style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px", display: "block" }}>
                  {t("profile.staffPassHelper", "Your staff will use their mobile number and this password to log in.")}
                </small>
              </div>

              {registerError && (
                <div style={{ color: "#ef4444", fontSize: "0.76rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <AlertCircle size={13} /> <span>{registerError}</span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.25rem" }}>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                disabled={registering}
                style={{ background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "8px", padding: "0.55rem 1rem", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" }}
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                type="button"
                onClick={handleRegisterStaff}
                disabled={registering}
                style={{ background: "#0284c7", color: "#ffffff", border: "none", borderRadius: "8px", padding: "0.55rem 1.1rem", fontSize: "0.82rem", fontWeight: 700, cursor: registering ? "not-allowed" : "pointer" }}
              >
                {registering ? <ButtonLoader text={t("profile.registering", "Creating...")} /> : t("profile.registerAndAddBtn", "Register & Add Staff")}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

/** What a worker sees instead of the shop settings: the profile to read, and leaving the shop. */
export function StaffMemberView({ user }) {
  const { t } = useTranslation()
  const { error: toastError } = useToast()
  const [leaving, setLeaving] = useState(false)

  const handleLeave = async () => {
    const answer = await Swal.fire({
      title: t("profile.staffLeaveTitle", "Leave this shop?"),
      text: t("profile.staffLeaveText", "You will go back to your own shop. The owner would need to invite you again."),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: t("profile.staffLeaveBtn", "Leave Shop"),
      cancelButtonText: t("common.cancel", "Cancel"),
      confirmButtonColor: "#ef4444",
    })
    if (!answer.isConfirmed) return
    setLeaving(true)
    try {
      const res = await call("/shop/staff/leave", { method: "POST" })
      reloadWithFreshData(user, res?.staff_of || null)
    } catch (err) {
      toastError(err?.message || t("profile.staffActionFailed", "Something went wrong. Please try again."))
      setLeaving(false)
    }
  }

  return (
    <StaffShopProfile user={user}>
      <section className="ssp-card ssp-leave">
        <p>{t("profile.staffOwnerManages", "You can create bills, print and manage tables for this shop. Its settings, menu and plans are managed by the owner.")}</p>
        <button type="button" data-testid="staff-leave-button" onClick={handleLeave} disabled={leaving}>
          {leaving ? <ButtonLoader text={t("profile.staffLeaving", "Leaving...")} /> : <><LogOut size={16} /> {t("profile.staffLeaveBtn", "Leave Shop")}</>}
        </button>
      </section>
    </StaffShopProfile>
  )
}
