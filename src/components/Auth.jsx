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
    <div className="auth-overlay" onClick={onCancel}>
      <div className="auth-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close" onClick={onCancel} aria-label="Close authentication">
          <X size={18} />
        </button>
        
        <section className="auth-art">
          <div className="auth-logo-wrapper">
            <img 
              src="/logo.png" 
              alt="Slipzo" 
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
                alt="Slipzo" 
                className="mobile-auth-logo"
              />
            </div>
            <p className="eyebrow">{isRegister ? "CREATE ACCOUNT" : "WELCOME BACK"}</p>
            <h2>{isRegister ? "Create your account" : "Sign in to Slipzo"}</h2>
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
              {loading ? "Please wait..." : isRegister ? "Create account" : "Enter Slipzo"}
              <ArrowRight size={17} />
            </button>
          </form>

          <button
            data-testid="google-sign-in-button"
            className="google disabled-google-btn"
            disabled
            type="button"
            title="Google Sign-In is coming soon"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Google</span>
            <span className="coming-soon-badge">Coming soon</span>
          </button>

          <p className="switch">
            {isRegister ? "Already have an account?" : "New to Slipzo?"}
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
          
          <button className="back-to-site" onClick={onCancel}>
            ← Back to site
          </button>
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
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .password-input-wrap input {
          width: 100% !important;
          padding-right: 2.8rem !important;
        }

        .password-toggle-btn {
          position: absolute;
          right: 0.75rem;
          background: none !important;
          border: none !important;
          color: #64748b !important;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.35rem;
          border-radius: 6px;
          transition: color 0.2s;
        }

        .password-toggle-btn:hover {
          color: #0f172a !important;
        }

        .auth-error-banner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          font-size: 0.82rem;
          font-weight: 500;
          padding: 0.65rem 0.85rem;
          border-radius: 8px;
          margin-top: 0.25rem;
        }

        /* Validation Failure Popup Overlay */
        .validation-popup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.25rem;
          animation: fadeIn 0.2s ease;
        }

        .validation-popup-card {
          background: #ffffff;
          border-radius: 18px;
          width: 100%;
          max-width: 420px;
          padding: 1.5rem;
          box-shadow: 0 20px 48px rgba(15, 23, 42, 0.25);
          border: 1px solid #e2e8f0;
          animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .validation-popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .popup-icon-title {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }

        .popup-alert-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #fee2e2;
          color: #ef4444;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .popup-icon-title h3 {
          font-size: 1.15rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .popup-close-btn {
          background: #f1f5f9;
          border: none;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .popup-close-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .popup-desc {
          font-size: 0.88rem;
          color: #64748b;
          line-height: 1.5;
          margin: 0 0 1rem 0;
        }

        .popup-rules-list {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0.75rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
          margin-bottom: 1.25rem;
        }

        .popup-rule-row {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          font-size: 0.84rem;
          font-weight: 500;
        }

        .popup-rule-row.passed {
          color: #059669;
        }

        .popup-rule-row.missing {
          color: #dc2626;
        }

        .popup-rule-status {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .popup-rule-row.passed .popup-rule-status {
          background: #d1fae5;
          color: #059669;
        }

        .popup-rule-row.missing .popup-rule-status {
          background: #fee2e2;
          color: #dc2626;
        }

        .popup-rule-text {
          line-height: 1.3;
        }

        .popup-ok-btn {
          width: 100%;
          padding: 0.75rem 1rem;
          background: #0f172a;
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.92rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .popup-ok-btn:hover {
          background: #1e293b;
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

        /* Auth Left Side - Unified Dark Theme */
        .auth-art {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important;
          color: #ffffff !important;
          padding: 2.25rem !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
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
          background: radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        .auth-logo-wrapper {
          margin-bottom: 1rem;
          position: relative;
          z-index: 1;
        }

        .auth-logo-wrapper img {
          width: auto !important;
          height: 44px !important;
          max-height: 44px !important;
          max-width: 180px !important;
          min-width: 0 !important;
          object-fit: contain !important;
          object-position: left center !important;
          display: block !important;
          filter: brightness(0) invert(1) drop-shadow(0 2px 10px rgba(14, 165, 233, 0.3)) !important;
        }

        .auth-art .eyebrow {
          font-size: 10px !important;
          letter-spacing: 2.5px !important;
          text-transform: uppercase !important;
          color: rgba(255, 255, 255, 0.5) !important;
          margin-bottom: 0.35rem !important;
          position: relative;
          z-index: 1;
        }

        .auth-art h1 {
          font-size: 1.85rem !important;
          font-weight: 700 !important;
          line-height: 1.25 !important;
          margin: 0 0 0.5rem 0 !important;
          color: #ffffff !important;
          position: relative;
          z-index: 1;
        }

        .auth-art h1 em {
          color: #38bdf8 !important;
          font-style: normal;
        }

        .auth-art .art-note {
          color: rgba(255, 255, 255, 0.7) !important;
          font-size: 0.92rem !important;
          max-width: 320px !important;
          line-height: 1.5 !important;
          margin-bottom: 1.5rem !important;
          position: relative;
          z-index: 1;
        }

        .auth-art .receipt-stamp {
          display: inline-flex !important;
          align-items: center !important;
          gap: 0.75rem !important;
          background: rgba(255, 255, 255, 0.08) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          backdrop-filter: blur(8px) !important;
          padding: 0.55rem 1rem !important;
          border-radius: 10px !important;
          color: rgba(255, 255, 255, 0.85) !important;
          font-size: 0.8rem !important;
          width: fit-content !important;
          position: relative;
          z-index: 1;
          margin-top: auto !important;
        }

        .auth-art .receipt-stamp b {
          color: #ffffff !important;
          font-weight: 600 !important;
        }

        .disabled-google-btn {
          opacity: 0.65 !important;
          cursor: not-allowed !important;
          pointer-events: none !important;
          user-select: none !important;
          background: #f8fafc !important;
          border: 1.5px solid #e2e8f0 !important;
          color: #64748b !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 0.6rem !important;
        }

        .coming-soon-badge {
          font-size: 0.68rem !important;
          font-weight: 600 !important;
          color: #94a3b8 !important;
          background: #f1f5f9 !important;
          padding: 0.15rem 0.45rem !important;
          border-radius: 6px !important;
          margin-left: 0.25rem !important;
        }

        .auth-form input.input-error {
          border-color: #ef4444 !important;
          background: #fef2f2 !important;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .auth-art {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}