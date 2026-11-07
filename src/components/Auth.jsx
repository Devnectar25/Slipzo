import { useState, useEffect } from "react"
import { ButtonLoader } from "./common/Skeleton"
import { ArrowRight, Receipt, X, Check, Eye, EyeOff, AlertCircle, Mail, Lock, User } from "lucide-react"
import { call } from "../lib/utils"
import "../styles/Auth.css"

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
            <ul className="auth-benefits">
              <li><span><Check size={12} strokeWidth={3} /></span>Print on 58mm, 80mm and A4 paper</li>
              <li><span><Check size={12} strokeWidth={3} /></span>Scan barcodes to bill faster</li>
              <li><span><Check size={12} strokeWidth={3} /></span>Works in English, Hindi and Marathi</li>
            </ul>
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
                <span className="auth-label-text">Your name</span>
                <div className="auth-field">
                  <User size={17} className="auth-field-icon" />
                  <input
                    data-testid="auth-name-input"
                    required
                    autoComplete="name"
                    placeholder="Your full name"
                    value={form.name}
                    onChange={(e) => {
                      setForm({ ...form, name: e.target.value })
                      if (error) setError("")
                    }}
                    className={error && (!form.name || !form.name.trim()) ? "input-error" : ""}
                  />
                </div>
              </label>
            )}

            <label>
              <span className="auth-label-text">Email address</span>
              <div className="auth-field">
                <Mail size={17} className="auth-field-icon" />
                <input
                  data-testid="auth-email-input"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@yourshop.com"
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value })
                    if (error) setError("")
                  }}
                  className={error && (!form.email || !form.email.trim() || error.includes("email")) ? "input-error" : ""}
                />
              </div>
            </label>

            <label>
              <span className="auth-label-text">Password</span>
              <div className="auth-field password-input-wrap">
                <Lock size={17} className="auth-field-icon" />
                <input
                  data-testid="auth-password-input"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  placeholder={isRegister ? "Create a password" : "Enter your password"}
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
                <span className="auth-label-text">Re-enter password</span>
                <div className="auth-field password-input-wrap">
                  <Lock size={17} className="auth-field-icon" />
                  <input
                    data-testid="auth-confirm-password-input"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
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
              {loading ? <ButtonLoader text="Please wait..." /> : isRegister ? "Create account" : "Enter Slipzen"}
              {!loading && <ArrowRight size={17} />}
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
          
          {onCancel && (
            <button type="button" className="back-to-site" onClick={onCancel}>
              ← Back
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
      `}</style>
    </div>
  )
}