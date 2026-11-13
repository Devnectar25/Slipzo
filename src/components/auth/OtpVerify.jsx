import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { ShieldCheck, AlertCircle, ArrowLeft, ArrowRight, RefreshCw, KeyRound } from "lucide-react"
import { call } from "../../lib/utils"
import { ButtonLoader } from "../common/Skeleton"

const LENGTH = 6

// Readable message for a failed send / check of a phone code
export const otpErrorText = (err, t) => {
  const d = err?.data || {}
  switch (err?.code) {
    case "OTP_WRONG": return t("otp.errWrong", "That code is not right. {{n}} tries left.", { n: d.tries_left ?? "" })
    case "OTP_EXPIRED": return t("otp.errExpired", "This code has expired. Please ask for a new one.")
    case "OTP_LOCKED": return t("otp.errLocked", "Too many wrong tries. Please ask for a new code.")
    case "OTP_COOLDOWN": return t("otp.errCooldown", "Please wait {{n}} seconds before asking for a new code.", { n: d.retry_after ?? 30 })
    case "OTP_TOO_MANY": return t("otp.errTooMany", "Too many codes asked for this number. Please try again in an hour.")
    case "OTP_FORMAT": return t("otp.errFormat", "Enter the 6-digit code.")
    case "OTP_REQUIRED": return t("otp.errRequired", "Your verification has expired. Please verify your mobile number again.")
    case "NO_ACCOUNT": return t("otp.errNoAccount", "No account found with this mobile number.")
    default: return err?.message || t("otp.errGeneric", "Something went wrong. Please try again.")
  }
}

const mmss = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`

/**
 * "Enter the code we sent" panel, used for sign up and forgot password.
 * - initial: the answer of a send already made (phone_masked, demo_code, resend_in), or null to send now
 * - initialError: the error of a send already made (e.g. "wait 20 seconds")
 * - onVerified(otpToken) once the right code is entered; onBack to change the number
 */
export function OtpVerify({ phone, purpose, initial = null, initialError = null, onVerified, onBack, backLabel }) {
  const { t } = useTranslation()
  const [info, setInfo] = useState(initial)
  const [digits, setDigits] = useState(() => Array(LENGTH).fill(""))
  const [error, setError] = useState(initialError ? otpErrorText(initialError, t) : "")
  const [resendIn, setResendIn] = useState(() => initial?.resend_in || initialError?.data?.retry_after || 0)
  const [sending, setSending] = useState(false)
  const [checking, setChecking] = useState(false)
  const [codeDead, setCodeDead] = useState(false) // expired / locked: only a new code helps
  const boxes = useRef([])
  const sentOnce = useRef(Boolean(initial || initialError))

  useEffect(() => {
    if (resendIn <= 0) return undefined
    const id = setTimeout(() => setResendIn((s) => Math.max(0, s - 1)), 1000)
    return () => clearTimeout(id)
  }, [resendIn])

  const focusBox = (i) => setTimeout(() => boxes.current[Math.max(0, Math.min(LENGTH - 1, i))]?.focus(), 0)

  const send = async () => {
    if (sending) return
    setSending(true)
    setError("")
    try {
      const res = await call("/auth/otp/send", { method: "POST", body: JSON.stringify({ phone, purpose }) })
      setInfo(res)
      setResendIn(res?.resend_in || 30)
      setDigits(Array(LENGTH).fill(""))
      setCodeDead(false)
      focusBox(0)
    } catch (err) {
      setError(otpErrorText(err, t))
      if (err?.code === "OTP_COOLDOWN") setResendIn(err?.data?.retry_after || 30)
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    if (!sentOnce.current) {
      sentOnce.current = true
      send()
    } else {
      focusBox(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const verify = async (code) => {
    if (checking || codeDead) return
    if (code.length !== LENGTH) {
      setError(t("otp.errFormat", "Enter the 6-digit code."))
      return
    }
    setChecking(true)
    setError("")
    try {
      const res = await call("/auth/otp/verify", { method: "POST", body: JSON.stringify({ phone, purpose, code }) })
      onVerified?.(res.otp_token)
    } catch (err) {
      setError(otpErrorText(err, t))
      setDigits(Array(LENGTH).fill(""))
      if (err?.code === "OTP_LOCKED" || err?.code === "OTP_EXPIRED") setCodeDead(true)
      else focusBox(0)
    } finally {
      setChecking(false)
    }
  }

  const setAt = (i, value) => {
    const clean = value.replace(/\D/g, "")
    if (clean.length > 1) {
      // pasted or auto-filled: spread the digits over the boxes
      const next = [...digits]
      clean.slice(0, LENGTH - i).split("").forEach((d, k) => { next[i + k] = d })
      setDigits(next)
      const filled = next.join("")
      if (filled.length === LENGTH) verify(filled)
      else focusBox(i + clean.length)
      return
    }
    const next = [...digits]
    next[i] = clean
    setDigits(next)
    if (error && !codeDead) setError("")
    if (clean && i < LENGTH - 1) focusBox(i + 1)
    const filled = next.join("")
    if (clean && filled.length === LENGTH) verify(filled)
  }

  const onKeyDown = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault()
      const next = [...digits]
      next[i - 1] = ""
      setDigits(next)
      focusBox(i - 1)
    } else if (e.key === "ArrowLeft") focusBox(i - 1)
    else if (e.key === "ArrowRight") focusBox(i + 1)
    else if (e.key === "Enter") {
      e.preventDefault()
      verify(digits.join(""))
    }
  }

  const fillDemo = () => {
    if (!info?.demo_code) return
    const next = info.demo_code.split("").slice(0, LENGTH)
    setDigits(next)
    verify(next.join(""))
  }

  const masked = info?.phone_masked || `+91 ${String(phone).slice(0, 2)}******${String(phone).slice(-2)}`

  return (
    <div className="otp-panel" data-testid="otp-panel">
      <div className="otp-sent">
        <span className="otp-sent-icon"><ShieldCheck size={18} /></span>
        <p>
          {t("otp.sentTo", "We sent a 6-digit code to")} <b>{masked}</b>
          <span className="otp-sent-sub">{t("otp.validFor", "The code works for 10 minutes.")}</span>
        </p>
      </div>

      {info?.demo_code && (
        <div className="otp-demo" data-testid="otp-demo">
          <KeyRound size={16} />
          <div className="otp-demo-text">
            <span className="otp-demo-label">{t("otp.demoLabel", "Demo mode: no SMS is sent. Your code is")}</span>
            <b className="otp-demo-code" data-testid="otp-demo-code">{info.demo_code}</b>
          </div>
          <button type="button" className="otp-demo-fill" onClick={fillDemo} disabled={checking || codeDead}>
            {t("otp.fillCode", "Fill code")}
          </button>
        </div>
      )}

      <div className={`otp-boxes ${error && !checking ? "has-error" : ""}`} role="group" aria-label={t("otp.enterCode", "Enter the 6-digit code")}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { boxes.current[i] = el }}
            className="otp-box"
            data-testid={`otp-box-${i}`}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={i === 0 ? LENGTH : 1}
            value={d}
            disabled={checking || codeDead}
            aria-label={t("otp.digitN", "Digit {{n}}", { n: i + 1 })}
            onChange={(e) => setAt(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
          />
        ))}
      </div>

      {error && (
        <div className="auth-error-banner otp-error" data-testid="otp-error" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="otp-resend">
        {resendIn > 0 ? (
          <span>{t("otp.resendIn", "Didn't get it? Ask again in {{time}}", { time: mmss(resendIn) })}</span>
        ) : (
          <button type="button" className="otp-resend-btn" data-testid="otp-resend" onClick={send} disabled={sending}>
            <RefreshCw size={14} className={sending ? "otp-spin" : ""} /> {t("otp.resend", "Send a new code")}
          </button>
        )}
      </div>

      <div className="auth-actions">
        {onBack && (
          <button type="button" className="auth-step-back" data-testid="otp-back" onClick={onBack} disabled={checking}>
            <ArrowLeft size={16} /> {backLabel || t("otp.changeNumber", "Change number")}
          </button>
        )}
        <button
          type="button"
          className="primary full"
          data-testid="otp-verify"
          onClick={() => verify(digits.join(""))}
          disabled={checking || codeDead || digits.join("").length !== LENGTH}
        >
          {checking ? <ButtonLoader text={t("otp.checking", "Checking...")} /> : t("otp.verify", "Verify")}
          {!checking && <ArrowRight size={17} />}
        </button>
      </div>
    </div>
  )
}

export default OtpVerify
