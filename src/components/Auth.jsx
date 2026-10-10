import { useState, useEffect } from "react"
import { ArrowRight, Receipt, X, Check, Eye, EyeOff, AlertCircle } from "lucide-react"
import { call } from "../lib/utils"

export const PASSWORD_RULES = [
  { 
    id: "length", 
    label: "At least 8 characters", 
    test: (pwd) => /.{8,}/.test(pwd) 
  },
  { 
    id: "uppercase", 
    label: "At least 1 uppercase letter (A-Z)", 
    test: (pwd) => /(?=.*[A-Z])/.test(pwd) 
  },
  { 
    id: "lowercase", 
    label: "At least 1 lowercase letter (a-z)", 
    test: (pwd) => /(?=.*[a-z])/.test(pwd) 
  },
  { 
    id: "number", 
    label: "At least 1 number (0-9)", 
    test: (pwd) => /(?=.*[0-9])/.test(pwd) 
  },
  { 
    id: "special", 
    label: "At least 1 symbol like !@#$%^&*", 
    test: (pwd) => /(?=.*?[#?!@$%^&*-])/.test(pwd) || /[#?!@$%^&*+\-=_~`(){}[\]|\\:;"'<>,./]/.test(pwd) 
  }
]

export function Auth({ onLogin, onCancel, initialRegister = false }) {
  const [isRegister, setIsRegister] = useState(initialRegister)
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "", name: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showValidationPopup, setShowValidationPopup] = useState(false)

  useEffect(() => {
    setIsRegister(initialRegister)
    setError("")
    setShowValidationPopup(false)
    setForm({ email: "", password: "", confirmPassword: "", name: "" })
  }, [initialRegister])

  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow

    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = originalBodyOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
    }
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError("")

    if (isRegister && (!form.name || !form.name.trim())) {
      setError("Please enter your full name")
      return
    }

    if (isRegister && form.name.trim().length < 2) {
      setError("Name must be at least 2 characters")
      return
    }

    if (!form.email || !form.email.trim()) {
      setError("Please enter your email address")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email.trim())) {
      setError("Please enter a valid email address (e.g. name@domain.com)")
      return
    }

    if (!form.password) {
      setError("Please enter your password")
      return
    }

    if (isRegister) {
      if (!form.confirmPassword) {
        setError("Please re-enter your password")
        return
      }

      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match")
        return
      }

      const allRulesPassed = PASSWORD_RULES.every(rule => rule.test(form.password))
      if (!allRulesPassed) {
        setError("Password does not meet the security requirements")
        setShowValidationPopup(true)
        return
      }
    } else {
      if (form.password.length < 4) {
        setError("Password must be at least 4 characters")
        return
      }
    }

    setLoading(true)
    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login"
      const user = await call(endpoint, {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          ...(isRegister ? { name: form.name.trim() } : {})
        })
      })
      onLogin(user, isRegister)
    } catch (err) {
      setError(err.message || "Authentication failed. Please check your credentials.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-overlay" onClick={onCancel ? onCancel : undefined}>
      <div className="auth-modal-box" onClick={(e) => e.stopPropagation()}>
        {onCancel && (
          <button className="auth-close" onClick={onCancel} aria-label="Close authentication">
            <X size={18} />
          </button>
        )}
        
        <section className="auth-art">
          <div className="auth-logo-wrapper">
            <img 
              src="/logo-white.png" 
              alt="Slipzen" 
              className="auth-logo"
            />
          </div>
          <div>
            <p className="eyebrow">THE DIGITAL RECEIPT BOOK</p>
            <h1>
              Make every sale<br />
              <em>feel effortless.</em>
            </h1>
            <p className="art-note">
              A calm, quick billing desk for the shops that keep communities moving.
            </p>
          </div>
          <div className="receipt-stamp">
            <Receipt size={16} />
            <span>
              Ready to print<br />
              <b>58mm · 80mm · A4</b>
            </span>
          </div>
        </section>

        <section className="auth-form">
          <div className="auth-header-block">
            <div className="mobile-brand">
              <img 
                src="/logo.png" 
                alt="Slipzen" 
                className="mobile-auth-logo"
              />
            </div>
            <p className="eyebrow">{isRegister ? "CREATE ACCOUNT" : "WELCOME BACK"}</p>
            <h2>{isRegister ? "Create your account" : "Sign in to Slipzen"}</h2>
            <p className="subtle">
              {isRegister
                ? "Set up your digital receipt desk in a minute."
                : "Your shop, your templates, ready when you are."}
            </p>
          </div>

          <form onSubmit={submit} noValidate>
            {isRegister && (
              <label>
                YOUR NAME
                <input
                  data-testid="auth-name-input"
                  required
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value })
                    if (error) setError("")
                  }}
                  className={error && (!form.name || !form.name.trim()) ? "input-error" : ""}
                />
              </label>
            )}

            <label>
              EMAIL ADDRESS
              <input
                data-testid="auth-email-input"
                type="email"
                required
                value={form.email}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value })
                  if (error) setError("")
                }}
                className={error && (!form.email || !form.email.trim() || error.includes("email")) ? "input-error" : ""}
              />
            </label>

            <label>
              PASSWORD
              <div className="password-input-wrap">
                <input
                  data-testid="auth-password-input"
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) => {
                    setForm({ ...form, password: e.target.value })
                    if (error) setError("")
                  }}
                  className={error && (!form.password || error.includes("password")) ? "input-error" : ""}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {isRegister && (
              <label>
                RE-ENTER PASSWORD
                <div className="password-input-wrap">
                  <input
                    data-testid="auth-confirm-password-input"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={form.confirmPassword}
                    onChange={(e) => {
                      setForm({ ...form, confirmPassword: e.target.value })
                      if (error) setError("")
                    }}
                    className={error && (!form.confirmPassword || error.includes("match") || error.includes("re-enter")) ? "input-error" : ""}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
            )}

            {error && (
              <div data-testid="auth-error" className="auth-error-banner">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              data-testid="auth-submit-button"
              className="primary full"
              type="submit"
              disabled={loading}
            >
              {loading ? "Please wait..." : isRegister ? "Create account" : "Enter Slipzen"}
              <ArrowRight size={17} />
            </button>
          </form>


          <p className="switch">
            {isRegister ? "Already have an account?" : "New to Slipzen?"}
            <button
              data-testid="auth-toggle-button"
              onClick={() => {
                setIsRegister(!isRegister)
                setError("")
                setShowValidationPopup(false)
                setForm({ email: "", password: "", confirmPassword: "", name: "" })
              }}
            >
              {isRegister ? "Sign in" : "Create an account"}
            </button>
          </p>
          
          {onCancel ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '1rem' }}>
              <button type="button" className="back-to-site" onClick={onCancel} style={{ margin: 0 }}>
                ← Back
              </button>
              <button 
                type="button" 
                className="back-to-site" 
                onClick={() => { window.location.href = "/admin/login" }}
                style={{ fontSize: '0.72rem', opacity: 0.8, margin: 0 }}
              >
                Admin Portal →
              </button>
            </div>
          ) : (
            <button 
              type="button" 
              className="back-to-site" 
              onClick={() => { window.location.href = "/admin/login" }}
              style={{ fontSize: '0.72rem', opacity: 0.8 }}
            >
              Admin Portal →
            </button>
          )}
        </section>
      </div>

      {/* Validation Failure Popup Modal */}
      {showValidationPopup && (
        <div 
          className="validation-popup-overlay" 
          onClick={() => setShowValidationPopup(false)}
        >
          <div 
            className="validation-popup-card" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="validation-popup-header">
              <div className="popup-icon-title">
                <div className="popup-alert-icon">
                  <AlertCircle size={20} />
                </div>
                <h3>Password Requirements</h3>
              </div>
              <button 
                type="button"
                className="popup-close-btn" 
                onClick={() => setShowValidationPopup(false)}
                aria-label="Close popup"
              >
                <X size={18} />
              </button>
            </div>

            <p className="popup-desc">
              Your password must meet all 5 security rules to create an account:
            </p>

            <div className="popup-rules-list">
              {PASSWORD_RULES.map((rule) => {
                const isPassed = rule.test(form.password)
                return (
                  <div 
                    key={rule.id} 
                    className={`popup-rule-row ${isPassed ? "passed" : "missing"}`}
                  >
                    <span className="popup-rule-status">
                      {isPassed ? (
                        <Check size={13} strokeWidth={3} />
                      ) : (
                        <X size={13} strokeWidth={3} />
                      )}
                    </span>
                    <span className="popup-rule-text">{rule.label}</span>
                  </div>
                )
              })}
            </div>

            <button 
              type="button" 
              className="popup-ok-btn"
              onClick={() => {
                setShowValidationPopup(false)
                const pwdInput = document.querySelector('input[data-testid="auth-password-input"]')
                if (pwdInput) pwdInput.focus()
              }}
            >
              Got it, update password
            </button>
          </div>
        </div>
      )}

      <style>{`
        /* Password input container with show/hide toggle */
        .password-input-wrap {
          position: relative !important;
          display: flex !important;
          align-items: center !important;
          width: 100% !important;
        }

        .password-input-wrap input {
          width: 100% !important;
          padding-right: 2.6rem !important;
        }

        .password-toggle-btn {
          position: absolute !important;
          right: 0.5rem !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          background: none !important;
          border: none !important;
          color: #64748b !important;
          cursor: pointer !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0.35rem !important;
          border-radius: 6px !important;
          transition: color 0.2s !important;
          z-index: 2 !important;
        }

        .password-toggle-btn:hover {
          color: #0f172a !important;
        }

        .auth-error-banner {
          display: flex !important;
          align-items: center !important;
          gap: 0.45rem !important;
          background: #FFE1E5 !important;
          border: 1px solid #FFB8BD !important;
          color: #b91c1c !important;
          font-size: clamp(0.75rem, 2.2vw, 0.82rem) !important;
          font-weight: 500 !important;
          padding: 0.45rem 0.75rem !important;
          border-radius: 8px !important;
          margin-top: 0.15rem !important;
          line-height: 1.3 !important;
        }

        /* Validation Failure Popup Overlay */
        .validation-popup-overlay {
          position: fixed !important;
          inset: 0 !important;
          background: rgba(15, 23, 42, 0.65) !important;
          backdrop-filter: blur(4px) !important;
          -webkit-backdrop-filter: blur(4px) !important;
          z-index: 10000 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: clamp(8px, 3vw, 16px) !important;
          animation: fadeIn 0.2s ease !important;
          overflow-y: auto !important;
        }

        .validation-popup-card {
          background: #ffffff !important;
          border-radius: 16px !important;
          width: 100% !important;
          max-width: 420px !important;
          max-height: min(92vh, 92dvh) !important;
          overflow-y: auto !important;
          padding: clamp(1rem, 3.5vw, 1.4rem) !important;
          box-shadow: 0 20px 48px rgba(15, 23, 42, 0.25) !important;
          border: 1px solid #bae6fd !important;
          animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
          box-sizing: border-box !important;
        }

        .validation-popup-header {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-bottom: 0.65rem !important;
        }

        .popup-icon-title {
          display: flex !important;
          align-items: center !important;
          gap: 0.55rem !important;
        }

        .popup-alert-icon {
          width: 32px !important;
          height: 32px !important;
          border-radius: 8px !important;
          background: #fee2e2 !important;
          color: #ef4444 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-shrink: 0 !important;
        }

        .popup-icon-title h3 {
          font-size: clamp(1rem, 3.5vw, 1.12rem) !important;
          font-weight: 700 !important;
          color: #0C1F41 !important;
          margin: 0 !important;
        }

        .popup-close-btn {
          background: #f0f9ff !important;
          border: 1px solid #bae6fd !important;
          width: 28px !important;
          height: 28px !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: #0284c7 !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
          flex-shrink: 0 !important;
        }

        .popup-close-btn:hover {
          background: #e0f2fe !important;
          color: #0369a1 !important;
        }

        .popup-desc {
          font-size: clamp(0.78rem, 2.5vw, 0.85rem) !important;
          color: #64748b !important;
          line-height: 1.4 !important;
          margin: 0 0 0.75rem 0 !important;
        }

        .popup-rules-list {
          background: #f0f9ff !important;
          border: 1px solid #bae6fd !important;
          border-radius: 10px !important;
          padding: 0.65rem 0.85rem !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 0.45rem !important;
          margin-bottom: 1rem !important;
        }

        .popup-rule-row {
          display: flex !important;
          align-items: center !important;
          gap: 0.55rem !important;
          font-size: clamp(0.76rem, 2.4vw, 0.82rem) !important;
          font-weight: 500 !important;
        }

        .popup-rule-row.passed {
          color: #059669 !important;
        }

        .popup-rule-row.missing {
          color: #dc2626 !important;
        }

        .popup-rule-status {
          width: 18px !important;
          height: 18px !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-shrink: 0 !important;
        }

        .popup-rule-row.passed .popup-rule-status {
          background: #d1fae5 !important;
          color: #059669 !important;
        }

        .popup-rule-row.missing .popup-rule-status {
          background: #fee2e2 !important;
          color: #dc2626 !important;
        }

        .popup-rule-text {
          line-height: 1.25 !important;
        }

        .popup-ok-btn {
          width: 100% !important;
          padding: 0.65rem 1rem !important;
          background: #0284c7 !important;
          color: #ffffff !important;
          border: none !important;
          border-radius: 9px !important;
          font-weight: 600 !important;
          font-size: clamp(0.84rem, 2.5vw, 0.9rem) !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
          min-height: 38px !important;
        }

        .popup-ok-btn:hover {
          background: #0369a1 !important;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleUp {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* Overlay & Modal Box */
        .auth-overlay {
          position: fixed !important;
          inset: 0 !important;
          background: radial-gradient(ellipse at top, #1e293b 0%, #0f172a 100%) !important;
          backdrop-filter: blur(6px) !important;
          -webkit-backdrop-filter: blur(6px) !important;
          z-index: 9999 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: clamp(8px, 2.5vw, 16px) !important;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;
          overscroll-behavior: contain !important;
          box-sizing: border-box !important;
        }

        .auth-modal-box {
          background: #ffffff !important;
          border-radius: 18px !important;
          width: 100% !important;
          max-width: 730px !important;
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) !important;
          overflow: hidden !important;
          display: grid !important;
          grid-template-columns: 0.9fr 1.1fr !important;
          position: relative !important;
          height: auto !important;
          max-height: min(90vh, 600px) !important;
          margin: auto !important;
          box-sizing: border-box !important;
        }

        /* Close Button */
        .auth-close {
          position: absolute !important;
          top: 0.85rem !important;
          right: 0.85rem !important;
          z-index: 40 !important;
          background: #f1f5f9 !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 50% !important;
          width: 32px !important;
          height: 32px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08) !important;
          transition: all 0.2s !important;
          color: #64748b !important;
          padding: 0 !important;
        }

        .auth-close:hover {
          background: #e2e8f0 !important;
          color: #0f172a !important;
          transform: rotate(90deg) !important;
        }

        /* Auth Left Side - Dark Navy Slate Theme */
        .auth-art {
          background: linear-gradient(145deg, #111c2e 0%, #1c283d 100%) !important;
          border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #ffffff !important;
          padding: 1.4rem 1.6rem !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
          gap: 1.15rem !important;
          position: relative !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
          height: 100% !important;
        }

        .auth-art::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(14, 165, 233, 0.18) 0%, transparent 70%);
          pointer-events: none;
        }

        .auth-logo-wrapper {
          margin-bottom: 0 !important;
          position: relative;
          z-index: 1;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }

        .auth-logo-wrapper img {
          width: auto !important;
          height: 38px !important;
          max-height: 40px !important;
          max-width: 150px !important;
          min-width: 0 !important;
          object-fit: contain !important;
          object-position: left center !important;
          display: block !important;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          filter: none !important;
        }

        .auth-art .eyebrow {
          font-size: 0.68rem !important;
          letter-spacing: 2px !important;
          text-transform: uppercase !important;
          color: #94a3b8 !important;
          font-weight: 700 !important;
          margin-bottom: 0.3rem !important;
          position: relative;
          z-index: 1;
        }

        .auth-art h1 {
          font-size: clamp(1.35rem, 2.6vw, 1.55rem) !important;
          font-weight: 800 !important;
          line-height: 1.25 !important;
          margin: 0 0 0.35rem 0 !important;
          color: #ffffff !important;
          position: relative;
          z-index: 1;
        }

        .auth-art h1 em {
          color: #0ea5e9 !important;
          font-style: normal !important;
          font-weight: 800 !important;
        }

        .auth-art .art-note {
          color: #94a3b8 !important;
          font-size: 0.82rem !important;
          max-width: 300px !important;
          line-height: 1.45 !important;
          margin-bottom: 0 !important;
          position: relative;
          z-index: 1;
        }

        .auth-art .receipt-stamp {
          display: inline-flex !important;
          align-items: center !important;
          gap: 0.65rem !important;
          background: rgba(255, 255, 255, 0.06) !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2) !important;
          padding: 0.35rem 0.75rem !important;
          border-radius: 9px !important;
          color: #94a3b8 !important;
          font-size: 0.75rem !important;
          width: fit-content !important;
          position: relative;
          z-index: 1;
          margin-top: 0 !important;
        }

        .auth-art .receipt-stamp svg {
          color: #ffffff !important;
          flex-shrink: 0;
        }

        .auth-art .receipt-stamp b {
          color: #ffffff !important;
          font-weight: 700 !important;
        }

        /* Right Form Side Styling */
        .auth-form {
          background: #ffffff !important;
          padding: 1.25rem 1.65rem 1rem 1.65rem !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
          width: 100% !important;
          box-sizing: border-box !important;
          overflow-y: auto !important;
          max-height: min(90vh, 600px) !important;
          scrollbar-width: thin !important;
          scrollbar-color: #cbd5e1 transparent !important;
        }

        .auth-form::-webkit-scrollbar {
          width: 5px;
        }
        .auth-form::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .auth-form .mobile-brand {
          display: none !important;
        }

        .auth-header-block {
          margin-bottom: 0.45rem !important;
          text-align: center !important;
        }

        .auth-form .eyebrow {
          font-size: 0.65rem !important;
          letter-spacing: 2px !important;
          text-transform: uppercase !important;
          color: #64748b !important;
          margin-bottom: 0.1rem !important;
          text-align: center !important;
          font-weight: 700 !important;
        }

        .auth-form h2 {
          font-size: 1.25rem !important;
          font-weight: 800 !important;
          margin: 0 0 0.1rem 0 !important;
          color: #0f172a !important;
          text-align: center !important;
          line-height: 1.2 !important;
        }

        .auth-form .subtle {
          color: #64748b !important;
          font-size: 0.78rem !important;
          margin-bottom: 0.45rem !important;
          text-align: center !important;
          line-height: 1.3 !important;
        }

        .auth-form form {
          display: flex !important;
          flex-direction: column !important;
          gap: 0.38rem !important;
          width: 100% !important;
        }

        .auth-form label {
          font-size: 0.65rem !important;
          font-weight: 700 !important;
          color: #475569 !important;
          letter-spacing: 0.5px !important;
          text-transform: uppercase !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 0.15rem !important;
          margin-bottom: 0 !important;
          text-align: left !important;
        }

        .auth-form input {
          display: block !important;
          width: 100% !important;
          height: 35px !important;
          padding: 0.38rem 0.7rem !important;
          border: 1.5px solid #cbd5e1 !important;
          border-radius: 8px !important;
          font-size: 0.86rem !important;
          color: #0f172a !important;
          background: #f8fafc !important;
          box-sizing: border-box !important;
          transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s !important;
        }

        .auth-form input:focus {
          outline: none !important;
          border-color: #0ea5e9 !important;
          background: #ffffff !important;
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15) !important;
        }

        .auth-form button.primary.full {
          background: #0f172a !important;
          color: #ffffff !important;
          border: none !important;
          min-height: 38px !important;
          height: 38px !important;
          padding: 0.45rem 1rem !important;
          border-radius: 8px !important;
          font-weight: 700 !important;
          font-size: 0.88rem !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 0.4rem !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          margin-top: 0.25rem !important;
          width: 100% !important;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.2) !important;
        }

        .auth-form button.primary.full:hover:not(:disabled) {
          background: #1e293b !important;
          transform: translateY(-1px) !important;
        }

        .auth-form .switch {
          text-align: center !important;
          font-size: 0.78rem !important;
          color: #64748b !important;
          margin-top: 0.35rem !important;
          margin-bottom: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 0.35rem !important;
          flex-wrap: wrap !important;
        }

        .auth-form .switch button {
          background: none !important;
          border: none !important;
          outline: none !important;
          color: #0284c7 !important;
          font-weight: 700 !important;
          cursor: pointer !important;
          padding: 0.15rem 0.25rem !important;
          font-size: inherit !important;
        }

        .auth-form .switch button:hover {
          color: #0369a1 !important;
          text-decoration: underline !important;
        }

        .auth-form .back-to-site {
          background: #f1f5f9 !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 20px !important;
          color: #64748b !important;
          font-size: 0.74rem !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          margin: 0.3rem auto 0 auto !important;
          padding: 0.22rem 0.8rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: all 0.2s ease !important;
          outline: none !important;
          width: max-content !important;
        }

        .auth-form .back-to-site:hover {
          color: #0f172a !important;
          background: #e2e8f0 !important;
        }

        .auth-form input.input-error {
          border-color: #ef4444 !important;
          background: #FFE1E5 !important;
        }

        /* ----------------------------------------------------
           RESPONSIVE: Tablet & Mobile (< 768px)
           ---------------------------------------------------- */
        @media (max-width: 768px) {
          .auth-overlay {
            padding: clamp(8px, 2.5vw, 14px) !important;
          }

          .auth-modal-box {
            grid-template-columns: 1fr !important;
            max-width: 420px !important;
            width: min(420px, 100%) !important;
            max-height: min(94vh, 94dvh, calc(100vh - 16px)) !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            border-radius: 18px !important;
            margin: auto !important;
            box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.35) !important;
            scrollbar-width: thin !important;
            scrollbar-color: #cbd5e1 transparent !important;
          }

          .auth-modal-box::-webkit-scrollbar {
            width: 4px;
          }
          .auth-modal-box::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }

          .auth-close {
            top: 0.65rem !important;
            right: 0.65rem !important;
            width: 30px !important;
            height: 30px !important;
          }

          .auth-art {
            display: none !important;
          }

          .auth-form {
            padding: clamp(1rem, 3.5vw, 1.35rem) clamp(1rem, 4vw, 1.35rem) clamp(1rem, 3.5vw, 1.25rem) !important;
            width: 100% !important;
            box-sizing: border-box !important;
            max-height: none !important;
            overflow-y: visible !important;
            justify-content: flex-start !important;
          }

          .auth-form .mobile-brand {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            margin: 0 auto clamp(0.35rem, 1.2vh, 0.55rem) auto !important;
          }

          .auth-form .mobile-brand img,
          .mobile-auth-logo {
            width: auto !important;
            height: clamp(28px, 4.5vh, 32px) !important;
            max-height: 34px !important;
            max-width: 120px !important;
            object-fit: contain !important;
            display: block !important;
            margin: 0 auto !important;
          }

          .auth-header-block {
            margin-bottom: clamp(0.35rem, 1.2vh, 0.55rem) !important;
          }

          .auth-form .eyebrow {
            font-size: clamp(0.62rem, 2vw, 0.66rem) !important;
            letter-spacing: 1.5px !important;
            margin-bottom: 0.1rem !important;
          }

          .auth-form h2 {
            font-size: clamp(1.15rem, 4vw, 1.28rem) !important;
            margin-bottom: 0.15rem !important;
          }

          .auth-form .subtle {
            font-size: clamp(0.74rem, 2.6vw, 0.8rem) !important;
            margin-bottom: clamp(0.45rem, 1.4vh, 0.65rem) !important;
          }

          .auth-form form {
            gap: clamp(0.35rem, 1.2vh, 0.48rem) !important;
          }

          .auth-form label {
            font-size: clamp(0.63rem, 2vw, 0.67rem) !important;
            gap: 0.18rem !important;
          }

          .auth-form input {
            height: clamp(36px, 4.5vh, 39px) !important;
            padding: 0.4rem 0.7rem !important;
            font-size: 0.86rem !important;
          }

          .auth-form button.primary.full {
            min-height: clamp(38px, 4.8vh, 40px) !important;
            font-size: 0.86rem !important;
            margin-top: clamp(0.2rem, 1vh, 0.35rem) !important;
            padding: 0.5rem 1rem !important;
          }

          .auth-form .switch {
            font-size: clamp(0.75rem, 2.5vw, 0.8rem) !important;
            margin-top: clamp(0.35rem, 1.2vh, 0.5rem) !important;
          }

          .auth-form .back-to-site {
            margin: clamp(0.3rem, 1vh, 0.45rem) auto 0 auto !important;
            padding: 0.25rem 0.75rem !important;
            font-size: 0.74rem !important;
          }
        }

        /* ----------------------------------------------------
           RESPONSIVE: Extra Small Devices (<= 380px)
           ---------------------------------------------------- */
        @media (max-width: 380px) {
          .auth-overlay {
            padding: 6px !important;
          }

          .auth-modal-box {
            border-radius: 14px !important;
            max-width: 100% !important;
          }

          .auth-form {
            padding: 0.85rem 0.85rem 0.85rem !important;
          }

          .auth-form .mobile-brand img,
          .mobile-auth-logo {
            height: 26px !important;
          }

          .auth-form h2 {
            font-size: 1.1rem !important;
          }

          .auth-form .subtle {
            font-size: 0.72rem !important;
            margin-bottom: 0.4rem !important;
          }

          .auth-form form {
            gap: 0.32rem !important;
          }

          .auth-form input {
            height: 35px !important;
            padding: 0.35rem 0.6rem !important;
            font-size: 0.82rem !important;
          }

          .auth-form button.primary.full {
            min-height: 36px !important;
            font-size: 0.82rem !important;
          }
        }

        /* ----------------------------------------------------
           RESPONSIVE: Short Height Screens & Landscape Orientation
           ---------------------------------------------------- */
        @media (max-height: 640px) {
          .auth-overlay {
            padding: 6px !important;
          }

          .auth-modal-box {
            max-height: calc(100vh - 12px) !important;
            max-height: calc(100dvh - 12px) !important;
          }

          .auth-form {
            padding: 0.75rem 1rem !important;
          }

          .auth-form .mobile-brand {
            margin-bottom: 0.2rem !important;
          }

          .auth-form .mobile-brand img,
          .mobile-auth-logo {
            height: 24px !important;
          }

          .auth-header-block {
            margin-bottom: 0.25rem !important;
          }

          .auth-form .subtle {
            display: none !important;
          }

          .auth-form form {
            gap: 0.28rem !important;
          }

          .auth-form input {
            height: 34px !important;
            padding: 0.3rem 0.6rem !important;
            font-size: 0.82rem !important;
          }

          .auth-form button.primary.full {
            min-height: 35px !important;
            padding: 0.4rem 0.75rem !important;
            font-size: 0.82rem !important;
            margin-top: 0.2rem !important;
          }

          .auth-form .switch {
            margin-top: 0.3rem !important;
            font-size: 0.74rem !important;
          }

          .auth-form .back-to-site {
            margin: 0.25rem auto 0 auto !important;
            padding: 0.2rem 0.65rem !important;
            font-size: 0.7rem !important;
          }
        }
      `}</style>
    </div>
  )
}