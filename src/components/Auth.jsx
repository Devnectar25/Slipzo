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
  const [form, setForm] = useState({ email: "", password: "", name: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showValidationPopup, setShowValidationPopup] = useState(false)

  useEffect(() => {
    setIsRegister(initialRegister)
    setError("")
    setShowValidationPopup(false)
  }, [initialRegister])

  const submit = async (e) => {
    e.preventDefault()
    setError("")

    // Validate email
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.com$/
    if (!emailRegex.test(form.email.trim())) {
      setError("Please enter a valid email address (e.g. you@shop.com)")
      return
    }

    if (isRegister) {
      if (!form.name.trim() || form.name.trim().length < 2) {
        setError("Please enter your full name (at least 2 characters)")
        return
      }

      // Check all 5 password validation rules
      const allRulesPassed = PASSWORD_RULES.every(rule => rule.test(form.password))
      if (!allRulesPassed) {
        setError("Password does not meet the security requirements")
        setShowValidationPopup(true)
        return
      }
    } else {
      if (!form.password) {
        setError("Please enter your password")
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
      onLogin(user)
    } catch (err) {
      setError(err.message || "Authentication failed. Please check your credentials.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <button className="auth-close" onClick={onCancel} aria-label="Close authentication">
        <X size={24} />
      </button>
      
      <section className="auth-art">
        <div className="auth-logo-wrapper">
          <img 
            src="/logo.png" 
            alt="Slipzo" 
            className="auth-logo"
          />
        </div>
        <p className="eyebrow">THE DIGITAL RECEIPT BOOK</p>
        <h1>
          Make every sale<br />
          <em>feel effortless.</em>
        </h1>
        <p className="art-note">
          A calm, quick billing desk for the shops that keep communities moving.
        </p>
        <div className="receipt-stamp">
          <Receipt size={20} />
          <span>
            Ready to print<br />
            <b>58mm · 80mm · A4</b>
          </span>
        </div>
      </section>

      <section className="auth-form">
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

        <form onSubmit={submit} noValidate>
          {isRegister && (
            <label>
              YOUR NAME
              <input
                data-testid="auth-name-input"
                required
                placeholder="e.g. Ramesh Kumar"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value })
                  if (error) setError("")
                }}
              />
            </label>
          )}

          <label>
            EMAIL ADDRESS
            <input
              data-testid="auth-email-input"
              type="email"
              required
              placeholder="you@yourshop.com"
              value={form.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value })
                if (error) setError("")
              }}
            />
          </label>

          <label>
            PASSWORD
            <div className="password-input-wrap">
              <input
                data-testid="auth-password-input"
                type={showPassword ? "text" : "password"}
                required
                placeholder={isRegister ? "Create a strong password" : "Enter your password"}
                value={form.password}
                onChange={(e) => {
                  setForm({ ...form, password: e.target.value })
                  if (error) setError("")
                }}
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
          className="google"
          disabled
          title="Google sign-in can be connected when a Google client is provided"
        >
          Continue with Google <span>G</span>
        </button>

        <p className="switch">
          {isRegister ? "Already have an account?" : "New to Slipzo?"}
          <button
            data-testid="auth-toggle-button"
            onClick={() => {
              setIsRegister(!isRegister)
              setError("")
              setShowValidationPopup(false)
            }}
          >
            {isRegister ? "Sign in" : "Create an account"}
          </button>
        </p>
        
        <button className="back-to-site" onClick={onCancel}>
          ← Browse without signing in
        </button>
      </section>

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

        /* Auth Left Side - Using Footer Gradient */
        .auth-art {
          background: #EEF4FF !important;
          color: #0f172a !important;
          padding: 3rem 4rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .auth-art::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(14, 165, 233, 0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .auth-logo-wrapper {
          margin-bottom: 1.5rem;
          position: relative;
          z-index: 1;
        }

        .auth-logo-wrapper img {
          width: auto !important;
          height: 120px !important;
          max-width: 280px !important;
          min-width: 0 !important;
          object-fit: contain !important;
          object-position: left center !important;
          display: block !important;
        }

        .auth-art .eyebrow {
          font-size: 11px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: rgba(15, 23, 42, 0.4) !important;
          margin-bottom: 0.5rem;
          position: relative;
          z-index: 1;
        }

        .auth-art h1 {
          font-size: 2.75rem;
          font-weight: 600;
          line-height: 1.15;
          margin: 0 0 1rem 0;
          color: #0f172a !important;
          position: relative;
          z-index: 1;
        }

        .auth-art h1 em {
          color: #0ea5e9 !important;
          font-style: normal;
        }

        .auth-art .art-note {
          color: rgba(15, 23, 42, 0.6) !important;
          font-size: 1rem;
          max-width: 380px;
          line-height: 1.6;
          margin-bottom: 2rem;
          position: relative;
          z-index: 1;
        }

        .auth-art .receipt-stamp {
          display: inline-flex;
          align-items: center;
          gap: 1rem;
          background: rgba(255, 255, 255, 0.7) !important;
          border: 1px solid rgba(15, 23, 42, 0.08) !important;
          padding: 0.75rem 1.25rem;
          border-radius: 12px;
          color: rgba(15, 23, 42, 0.7) !important;
          font-size: 0.85rem;
          width: fit-content;
          position: relative;
          z-index: 1;
        }

        .auth-art .receipt-stamp b {
          color: #0f172a !important;
          font-weight: 600;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .auth-art {
            display: none !important;
          }
        }
      `}</style>
    </main>
  )
}