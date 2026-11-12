import { useEffect, useState } from "react"
import { Users, Phone, Trash2, UserPlus, ShieldCheck, Printer, AlertCircle, Copy, Check, KeyRound, RefreshCw, LogOut, Store } from "lucide-react"
import { useTranslation } from "react-i18next"
import Swal from "sweetalert2"
import { call, clearApiCache, clearStoredMenuItems } from "../lib/utils"
import { useToast } from "./common/Toast"
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
const reloadWithFreshData = (user) => {
  clearApiCache()
  clearStoredMenuItems(user)
  window.location.reload()
}

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
  const { success, error: toastError } = useToast()
  const [members, setMembers] = useState(null)
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState("")
  const [inviting, setInviting] = useState(false)
  const [newInvite, setNewInvite] = useState(null) // { email, code }, shown once
  const [copied, setCopied] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [joinCode, setJoinCode] = useState("")
  const [joinError, setJoinError] = useState("")
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    let isMounted = true
    call("/shop/staff", { noCache: true })
      .then((rows) => { if (isMounted) setMembers(Array.isArray(rows) ? rows : []) })
      .catch(() => { if (isMounted) setMembers([]) })
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
    if (entered.includes("@")) {
      if (!EMAIL_REGEX.test(entered.toLowerCase())) return setEmailError(t("profile.emailInvalid", "Please enter a valid 10-digit mobile number."))
      body = { email: entered.toLowerCase() }
    } else {
      const mobile = normalizeMobile(entered)
      if (!mobile) return setEmailError(t("profile.emailInvalid", "Please enter a valid 10-digit mobile number."))
      body = { phone: mobile }
    }
    setInviting(true)
    try {
      const res = await call("/shop/staff", { method: "POST", body: JSON.stringify(body) })
      setMembers((prev) => [res.member, ...(prev || [])])
      setEmail("")
      setEmailError("")
      showInvite(memberLabel(res.member), res.invite_code)
    } catch (err) {
      setEmailError(err?.message || t("profile.staffActionFailed", "Something went wrong. Please try again."))
    } finally {
      setInviting(false)
    }
  }

  const handleNewCode = async (member) => {
    setBusyId(member.id)
    try {
      const res = await call(`/shop/staff/${member.id}/regenerate`, { method: "POST" })
      setMembers((prev) => prev.map((m) => (m.id === member.id ? res.member : m)))
      showInvite(memberLabel(res.member), res.invite_code)
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

  const handleJoin = async () => {
    if (!joinCode.trim()) return setJoinError(t("profile.staffJoinRequired", "Please enter your invite code."))
    const answer = await Swal.fire({
      title: t("profile.staffJoinConfirmTitle", "Join this shop?"),
      text: t("profile.staffJoinConfirmText", "You will bill and print for that shop instead of your own. Your own shop stays saved, and you can leave at any time."),
      icon: "question",
      showCancelButton: true,
      confirmButtonText: t("profile.staffJoinBtn", "Join Shop"),
      cancelButtonText: t("common.cancel", "Cancel"),
      confirmButtonColor: "#0284c7",
    })
    if (!answer.isConfirmed) return
    setJoining(true)
    setJoinError("")
    try {
      await call("/shop/staff/join", { method: "POST", body: JSON.stringify({ code: joinCode.trim() }) })
      reloadWithFreshData(user)
    } catch (err) {
      setJoinError(err?.message || t("profile.staffActionFailed", "Something went wrong. Please try again."))
      setJoining(false)
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
            {t("profile.workerEmailHelper", "The worker must already have a Slipzen account. You will get an invite code to give them.")}
          </p>
        )}
      </div>

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
            <li>{t("profile.staffStep2", "They open Shop Profile and enter this code under \"Joining a shop?\".")}</li>
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
                  <div style={{ fontSize: "0.84rem", fontWeight: 600, color: "#0C1F41", overflowWrap: "anywhere" }}>{memberLabel(member)}</div>
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

      {/* For someone who was invited by another shop */}
      <div style={{ marginTop: "1.1rem", paddingTop: "0.9rem", borderTop: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>
          <KeyRound size={14} style={{ color: "#0284c7" }} />
          <span>{t("profile.staffJoinTitle", "Joining a shop?")}</span>
        </div>
        <p style={{ fontSize: "0.74rem", color: "#64748b", margin: "0.2rem 0 0.5rem" }}>
          {t("profile.staffJoinHelp", "If a shop owner gave you an invite code, enter it here.")}
        </p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "stretch" }}>
          <div className={`sp-input-wrap ${joinError ? "error" : ""}`} style={{ flex: 1, minWidth: "160px" }}>
            <KeyRound size={16} className="sp-input-icon" />
            <input
              type="text"
              className="sp-input"
              data-testid="staff-join-input"
              autoComplete="off"
              placeholder="ABCD-EFGH"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value)
                if (joinError) setJoinError("")
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleJoin()
                }
              }}
            />
          </div>
          <button type="button" data-testid="staff-join-button" onClick={handleJoin} disabled={joining} style={{ background: "#ffffff", color: "#0284c7", border: "1.5px solid #7dd3fc", borderRadius: "10px", padding: "0 1rem", minHeight: "44px", fontWeight: 700, fontSize: "0.84rem", cursor: joining ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
            {joining ? <ButtonLoader text={t("profile.staffJoining", "Joining...")} /> : t("profile.staffJoinBtn", "Join Shop")}
          </button>
        </div>
        {joinError && (
          <div style={{ color: "#ef4444", fontSize: "0.76rem", marginTop: "0.35rem", display: "flex", alignItems: "flex-start", gap: "0.25rem" }}>
            <AlertCircle size={12} style={{ flexShrink: 0, marginTop: "2px" }} /> <span>{joinError}</span>
          </div>
        )}
      </div>
    </div>
  )
}

/** What a worker sees instead of the shop settings, which only the owner can change. */
export function StaffMemberView({ user }) {
  const { t } = useTranslation()
  const { error: toastError } = useToast()
  const [leaving, setLeaving] = useState(false)
  const shopName = user?.staff_of?.shop_name

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
      await call("/shop/staff/leave", { method: "POST" })
      reloadWithFreshData(user)
    } catch (err) {
      toastError(err?.message || t("profile.staffActionFailed", "Something went wrong. Please try again."))
      setLeaving(false)
    }
  }

  return (
    <div className="page shop-page fade-in">
      {/* Styled inline: the .sp-* rules are in a style block that only Shop's full settings view renders */}
      <div data-testid="staff-member-view" style={{ maxWidth: "520px", margin: "1.5rem auto", padding: "2rem 1.5rem", textAlign: "center", background: "#ffffff", border: "1px solid #bae6fd", borderRadius: "16px", boxShadow: "0 4px 16px rgba(15, 23, 42, 0.04)" }}>
        <div style={{ width: "52px", height: "52px", margin: "0 auto 0.85rem", borderRadius: "14px", background: "#e0f2fe", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Store size={24} />
        </div>
        <h3 style={{ margin: "0 0 0.4rem", fontSize: "1.15rem", fontWeight: 800, color: "#0C1F41" }}>
          {t("profile.staffWorkingFor", "You are working for")} {shopName}
        </h3>
        <p style={{ margin: "0 0 1.25rem", fontSize: "0.86rem", lineHeight: 1.55, color: "#64748b" }}>
          {t("profile.staffOwnerManages", "You can create bills, print and manage tables for this shop. Its settings, menu and plans are managed by the owner.")}
        </p>
        <button type="button" data-testid="staff-leave-button" onClick={handleLeave} disabled={leaving} style={{ background: "#ffffff", color: "#ef4444", border: "1.5px solid #fecaca", borderRadius: "10px", padding: "0.55rem 1.1rem", fontWeight: 700, fontSize: "0.84rem", cursor: leaving ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
          {leaving ? <ButtonLoader text={t("profile.staffLeaving", "Leaving...")} /> : <><LogOut size={15} /> {t("profile.staffLeaveBtn", "Leave Shop")}</>}
        </button>
      </div>
    </div>
  )
}
