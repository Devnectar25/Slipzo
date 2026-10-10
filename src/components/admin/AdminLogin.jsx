import { useState } from "react"
import { ShieldCheck, Lock, Mail, KeyRound, Eye, EyeOff, ArrowRight, AlertTriangle } from "lucide-react"
import { call } from "../../lib/utils"
import "../../styles/Admin.css"

export function AdminLogin({ onLoginSuccess, onCancel }) {
  const [email, setEmail] = useState("admin@slipzo.com")
  const [password, setPassword] = useState("")
  const [securityCode, setSecurityCode] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await call("/admin/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          securityCode
        })
      })

      if (res && res.token) {
        localStorage.setItem("slipzo_token", res.token)
        localStorage.setItem("slipzo_admin_token", res.token)
        if (onLoginSuccess) {
          onLoginSuccess(res.admin, res.token)
        } else {
          window.location.href = "/admin"
        }
      } else {
        setError(res?.detail || "Admin authentication failed. Please verify credentials.")
      }
    } catch (err) {
      console.error("Admin login error:", err)
      setError(err.message || "Invalid Admin credentials or security code.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-wrapper">
      <div className="admin-bg-glow" />
      <div className="admin-bg-glow-2" />

      <div className="admin-login-card">
        <div className="admin-login-header">
          <div className="admin-badge">
            <ShieldCheck size={14} /> Admin Gateway
          </div>
          <div>
            <img src="/logo.png" alt="Slipzen" className="admin-login-logo" />
          </div>
          <h1 className="admin-login-title">Slipzen Admin Panel</h1>
          <p className="admin-login-subtitle">Sign in to manage system & user operations</p>
        </div>

        {error && (
          <div className="admin-alert-error">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="admin-form-group">
            <label className="admin-label">
              <Mail size={14} /> Admin Email / Username
            </label>
            <div className="admin-input-wrapper">
              <Mail size={16} className="admin-input-icon" />
              <input
                type="text"
                className="admin-input"
                placeholder="admin@slipzo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="admin-form-group">
            <label className="admin-label">
              <Lock size={14} /> Password
            </label>
            <div className="admin-input-wrapper">
              <Lock size={16} className="admin-input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                className="admin-input"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="admin-input-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="admin-form-group">
            <label className="admin-label">
              <KeyRound size={14} /> Admin Security Code
            </label>
            <div className="admin-input-wrapper">
              <KeyRound size={16} className="admin-input-icon" />
              <input
                type="password"
                className="admin-input"
                placeholder="Enter security code"
                value={securityCode}
                onChange={(e) => setSecurityCode(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="admin-btn-primary"
            disabled={loading}
          >
            {loading ? "Authenticating..." : (
              <>
                Sign In to Admin Panel <ArrowRight size={16} />
              </>
            )}
          </button>

          {onCancel && (
            <button
              type="button"
              className="admin-btn-back"
              onClick={onCancel}
              style={{
                width: "100%",
                marginTop: "10px",
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#94a3b8",
                padding: "10px 14px",
                borderRadius: "10px",
                fontSize: "0.88rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#ffffff"
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.4)"
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#94a3b8"
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)"
                e.currentTarget.style.background = "transparent"
              }}
            >
              ← Back to Dashboard
            </button>
          )}
        </form>

        <div className="admin-hint-box">
          Default Dev Admin: <code>admin@slipzo.com</code> | <code>Admin@12345</code> | Code: <code>SLIPZO_ADMIN_2026</code>
        </div>
      </div>
    </div>
  )
}
