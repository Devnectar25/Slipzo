import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Phone, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, AlertCircle, Check, X } from "lucide-react"
import { call } from "../../lib/utils"
import { PASSWORD_RULES, normalizeMobile, sanitizeMobileInput, mobileProblem } from "../../lib/authFields"
import { ButtonLoader } from "../common/Skeleton"
import { OtpVerify, otpErrorText } from "./OtpVerify"

/**
 * Forgot password: mobile number -> code sent to it -> new password.
 * onDone(phone) after the password is changed; onCancel to go back to sign in.
 */
export function ForgotPassword({ initialPhone = "", onDone, onCancel }) {
  const { t } = useTranslation()
  const [stage, setStage] = useState("phone") // "phone" | "code" | "password"
  const [phoneInput, setPhoneInput] = useState(sanitizeMobileInput(initialPhone))
  const [phone, setPhone] = useState("")
  const [sendInfo, setSendInfo] = useState(null)
  const [sendError, setSendError] = useState(null)
  const [otpToken, setOtpToken] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [phoneError, setPhoneError] = useState("")
  const [noAccount, setNoAccount] = useState(false)
  const [loading, setLoading] = useState(false)
  const required = <span className="auth-required" aria-hidden="true">*</span>

  const sendCode = async (e) => {
    e?.preventDefault()
    if (loading) return
    setError("")
    setNoAccount(false)
    const problem = mobileProblem(phoneInput)
    if (problem) {
      setPhoneError(t(problem[0], problem[1], problem[2]))
      return
    }
    const clean = normalizeMobile(phoneInput)
    setPhoneError("")
    setLoading(true)
    try {
      const res = await call("/auth/otp/send", { method: "POST", body: JSON.stringify({ phone: clean, purpose: "reset" }) })
      setPhone(clean)
      setSendInfo(res)
      setSendError(null)
      setStage("code")
    } catch (err) {
      // a code was sent a moment ago: go on to enter it (a new one can be asked for after the wait)
      if (err?.code === "OTP_COOLDOWN") {
        setPhone(clean)
        setSendInfo(null)
        setSendError(err)
        setStage("code")
        return
      }
      if (err?.code === "NO_ACCOUNT") setNoAccount(true)
      setError(otpErrorText(err, t))
    } finally {
      setLoading(false)
    }
  }

  const rulesOk = PASSWORD_RULES.every((rule) => rule.test(password))

  const savePassword = async (e) => {
    e?.preventDefault()
    if (loading) return
    setError("")
    if (!password) return setError(t("auth.err_password_required", "Please enter your password"))
    if (!rulesOk) return setError(t("auth.err_password_rules", "Password does not meet the security requirements"))
    if (password !== confirm) return setError(t("auth.err_mismatch", "Passwords do not match"))
    setLoading(true)
    try {
      await call("/auth/password/reset", { method: "POST", body: JSON.stringify({ phone, otp_token: otpToken, password }) })
      onDone?.(phone)
    } catch (err) {
      if (err?.code === "OTP_REQUIRED") {
        // the 15 minutes to choose a password ran out: verify again
        setOtpToken("")
        setSendInfo(null)
        setSendError(null)
        setStage("phone")
      }
      setError(err?.code === "SAME_PASSWORD"
        ? t("forgot.errSame", "Please choose a password you have not used for this account.")
        : otpErrorText(err, t))
    } finally {
      setLoading(false)
    }
  }

  const titles = {
    phone: [t("forgot.eyebrow1", "FORGOT PASSWORD · STEP 1 OF 3"), t("forgot.title1", "Reset your password"), t("forgot.sub1", "Enter the mobile number of your account. We will send a code to it.")],
    code: [t("forgot.eyebrow2", "FORGOT PASSWORD · STEP 2 OF 3"), t("forgot.title2", "Enter the code"), t("forgot.sub2", "This confirms the number is yours.")],
    password: [t("forgot.eyebrow3", "FORGOT PASSWORD · STEP 3 OF 3"), t("forgot.title3", "Choose a new password"), t("forgot.sub3", "You will be signed out on other devices.")]
  }
  const [eyebrow, title, sub] = titles[stage]

  return (
    <>
      <div className="auth-header-block">
        <div className="mobile-brand">
          <img src="/logo.png" alt="Slipzen" className="mobile-auth-logo" />
        </div>
        <div className="auth-steps" aria-hidden="true">
          {["phone", "code", "password"].map((s, i) => {
            const now = ["phone", "code", "password"].indexOf(stage)
            return <span key={s} className={`auth-step-dot ${i < now ? "done" : ""} ${i === now ? "now" : ""}`} />
          })}
        </div>
        <p className="eyebrow" data-testid="forgot-eyebrow">{eyebrow}</p>
        <h2 data-testid="forgot-title">{title}</h2>
        <p className="subtle">{sub}</p>
      </div>

      {stage === "phone" && (
        <form onSubmit={sendCode} noValidate>
          <label>
            <span className="auth-label-text">{t("auth.mobile", "Mobile number")} {required}</span>
            <div className="auth-field">
              <Phone size={17} className="auth-field-icon" />
              <input
                data-testid="forgot-phone-input"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={16}
                autoFocus
                placeholder={t("auth.mobilePlaceholder", "10-digit mobile number")}
                value={phoneInput}
                onChange={(e) => { setPhoneInput(sanitizeMobileInput(e.target.value)); setPhoneError(""); setError(""); setNoAccount(false) }}
                className={phoneError ? "input-error" : ""}
              />
            </div>
            {phoneError && <span className="auth-field-error" role="alert">{phoneError}</span>}
          </label>

          {error && (
            <div className="auth-error-banner" data-testid="forgot-error" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
              {noAccount && (
                <button type="button" className="auth-error-action" onClick={() => onCancel?.("register")}>
                  {t("forgot.createInstead", "Create an account")} <ArrowRight size={14} />
                </button>
              )}
            </div>
          )}

          <div className="auth-actions">
            <button type="button" className="auth-step-back" data-testid="forgot-cancel" onClick={() => onCancel?.()} disabled={loading}>
              <ArrowLeft size={16} /> {t("forgot.backToSignIn", "Sign in")}
            </button>
            <button type="submit" className="primary full" data-testid="forgot-send" disabled={loading}>
              {loading ? <ButtonLoader text={t("auth.pleaseWait", "Please wait...")} /> : t("forgot.sendCode", "Send code")}
              {!loading && <ArrowRight size={17} />}
            </button>
          </div>
        </form>
      )}

      {stage === "code" && (
        <OtpVerify
          phone={phone}
          purpose="reset"
          initial={sendInfo}
          initialError={sendError}
          onVerified={(token) => { setOtpToken(token); setError(""); setStage("password") }}
          onBack={() => { setStage("phone"); setError("") }}
        />
      )}

      {stage === "password" && (
        <form onSubmit={savePassword} noValidate>
          <p className="auth-summary forgot-verified">
            <Check size={14} strokeWidth={3} />
            <span>{t("forgot.verified", "Mobile number verified")} · +91 {phone}</span>
          </p>
          <label>
            <span className="auth-label-text">{t("forgot.newPassword", "New password")} {required}</span>
            <div className="auth-field password-input-wrap">
              <Lock size={17} className="auth-field-icon" />
              <input
                data-testid="forgot-password-input"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                autoFocus
                placeholder={t("auth.createPassword", "Create a password")}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError("") }}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t("auth.hidePassword", "Hide password") : t("auth.showPassword", "Show password")}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <ul className="forgot-rules" data-testid="forgot-rules">
            {PASSWORD_RULES.map((rule) => {
              const ok = rule.test(password)
              return (
                <li key={rule.id} className={ok ? "ok" : ""}>
                  {ok ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
                  {t(`auth.rule_${rule.id}`, rule.label)}
                </li>
              )
            })}
          </ul>

          <label>
            <span className="auth-label-text">{t("auth.confirmPassword", "Re-enter password")} {required}</span>
            <div className="auth-field password-input-wrap">
              <Lock size={17} className="auth-field-icon" />
              <input
                data-testid="forgot-confirm-input"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder={t("auth.confirmPlaceholder", "Re-enter your password")}
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError("") }}
                className={confirm && confirm !== password ? "input-error" : ""}
              />
            </div>
          </label>

          {error && (
            <div className="auth-error-banner" data-testid="forgot-error" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="auth-actions">
            <button type="submit" className="primary full" data-testid="forgot-save" disabled={loading}>
              {loading ? <ButtonLoader text={t("auth.pleaseWait", "Please wait...")} /> : t("forgot.save", "Save new password")}
              {!loading && <ArrowRight size={17} />}
            </button>
          </div>
        </form>
      )}
    </>
  )
}

export default ForgotPassword
