import { useEffect, useState } from "react"
import { Auth } from "./components/Auth"
import { Shell } from "./components/Shell"
import { Dashboard } from "./components/Dashboard"
import { Templates } from "./components/Templates"
import { Bill } from "./components/Bill"
import { Customers } from "./components/Customers"
import { History } from "./components/History"
import { Shop } from "./components/Shop"
import { Reprint } from "./components/Reprint"
import { Landing } from "./components/Landing"
import { PublicTemplates } from "./components/PublicTemplates"
import { Pricing } from "./components/Pricing"
import { Product } from "./components/Product"
import { Contact } from "./components/Contact"
import { ErrorBoundary } from "./components/common/ErrorBoundary"
import { ToastProvider } from "./components/common/Toast"
import { call } from "./lib/utils"
import "./styles/App.css"
import "./styles/print.css"

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  )
}

function AppContent() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [view, setView] = useState("landing")
  const [selectedBillId, setSelectedBillId] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [authRegister, setAuthRegister] = useState(false)

  const handleOpenAuth = (isRegister = false) => {
    setAuthRegister(isRegister)
    setShowAuth(true)
  }

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔐 Checking authentication...')
        const userData = await call("/auth/me")
        console.log('✅ User authenticated:', userData)
        setUser(userData)
        if (userData) {
          setView("dashboard")
        }
      } catch (err) {
        console.log('❌ Not authenticated:', err.message)
      } finally {
        setChecking(false)
      }
    }

    checkAuth()
  }, [])

  const handleLogout = async () => {
    try {
      await call("/auth/logout", { method: "POST" })
      setUser(null)
      setView("landing")
    } catch (err) {
      console.error("Logout failed:", err)
    }
  }

  const handleLogin = (userData) => {
    setUser(userData)
    setView("dashboard")
    setShowAuth(false)
  }

  const requireAuth = (viewName) => {
    if (!user) {
      handleOpenAuth(false)
      return
    }
    setView(viewName)
  }

  if (checking) {
    return (
      <div className="loading">
        <div className="brand-loader">
          <img src="/logo.png" alt="Slipzo" className="brand-loader-logo" />
          <div className="brand-loader-text">Loading Slipzo<span>•</span></div>
        </div>
      </div>
    )
  }

  // Public pages (accessible without login)
  const publicPages = ["landing", "templates", "product", "pricing", "contact", "bills"]

  if (!user && publicPages.includes(view) && !showAuth) {
    return (
      <ErrorBoundary onGoHome={() => setView("landing")}>
        <PublicLayout
          view={view}
          setView={setView}
          setShowAuth={setShowAuth}
          handleOpenAuth={handleOpenAuth}
          user={user}
          requireAuth={requireAuth}
        />
      </ErrorBoundary>
    )
  }

  // Show auth modal or page
  if (showAuth || (!user && !publicPages.includes(view))) {
    return (
      <ErrorBoundary onGoHome={() => setView("landing")}>
        <Auth 
          onLogin={handleLogin} 
          onCancel={() => {
            setShowAuth(false)
            setAuthRegister(false)
            setView("landing")
          }} 
          initialRegister={authRegister}
        />
      </ErrorBoundary>
    )
  }

  // Protected routes - only accessible when logged in
  return (
    <Shell
      user={user}
      view={view}
      setView={setView}
      onLogout={handleLogout}
      requireAuth={requireAuth}
    >
      <ErrorBoundary onGoHome={() => setView("dashboard")} onReset={() => setView("dashboard")}>
        {view === "dashboard" && <Dashboard setView={setView} requireAuth={requireAuth} />}
        {view === "templates" && <Templates setView={setView} requireAuth={requireAuth} user={user} />}
        {view === "bills" && <Bill setView={setView} requireAuth={requireAuth} user={user} />}
        {view === "customers" && <Customers setView={setView} requireAuth={requireAuth} />}
        {view === "history" && (
          <History
            setView={setView}
            setSelectedBillId={setSelectedBillId}
            requireAuth={requireAuth}
          />
        )}
        {view === "shop" && <Shop requireAuth={requireAuth} />}
        {view === "reprint" && (
          <Reprint
            billId={selectedBillId}
            setView={setView}
            requireAuth={requireAuth}
          />
        )}
      </ErrorBoundary>
    </Shell>
  )
}

// Public Layout Component
function PublicLayout({ view, setView, setShowAuth, handleOpenAuth, user, requireAuth }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { id: "landing", label: "Home" },
    { id: "templates", label: "Templates" },
    { id: "product", label: "Product" },
    { id: "pricing", label: "Pricing" },
    { id: "contact", label: "Contact" }
  ]

  const renderPage = () => {
    switch (view) {
      case "landing":
        return <Landing setView={setView} setShowAuth={setShowAuth} user={user} />
      case "templates":
        return <PublicTemplates setView={setView} setShowAuth={setShowAuth} user={user} requireAuth={requireAuth} />
      case "product":
        return <Product setView={setView} setShowAuth={setShowAuth} />
      case "pricing":
        return <Pricing setView={setView} setShowAuth={setShowAuth} />
      case "contact":
        return <Contact setView={setView} setShowAuth={setShowAuth} />
      case "bills":
        return <Bill setView={setView} user={user} requireAuth={requireAuth} />
      default:
        return <Landing setView={setView} setShowAuth={setShowAuth} user={user} />
    }
  }

  return (
    <div className="public-layout">
      <nav className="public-nav">
        <div className="nav-container">
          <div className="nav-brand" onClick={() => setView("landing")}>
            <img
              src="/logo.png"
              alt="Slipzo"
              className="nav-logo"
            />
            <span>slipzo</span>
          </div>

          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className={`nav-links ${mobileMenuOpen ? 'open' : ''}`}>
            {navItems.map(item => (
              <button
                key={item.id}
                className={`nav-link ${view === item.id ? 'active' : ''}`}
                onClick={() => {
                  setView(item.id)
                  setMobileMenuOpen(false)
                }}
              >
                {item.label}
              </button>
            ))}

            {!user && (
              <button
                className="mobile-get-started-btn"
                onClick={() => {
                  if (handleOpenAuth) {
                    handleOpenAuth(true)
                  } else {
                    setShowAuth(true)
                  }
                  setMobileMenuOpen(false)
                }}
              >
                Get Started
              </button>
            )}
          </div>

          <div className="nav-actions">
            {user ? (
              <button
                className="nav-button primary"
                onClick={() => setView("dashboard")}
              >
                Dashboard
              </button>
            ) : (
              <>
                <button
                  className="nav-button secondary"
                  onClick={() => handleOpenAuth ? handleOpenAuth(false) : setShowAuth(true)}
                >
                  Log in
                </button>
                <button
                  className="nav-button primary"
                  onClick={() => handleOpenAuth ? handleOpenAuth(true) : setShowAuth(true)}
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="public-main">
        {renderPage()}
      </main>

      <footer className="public-footer">
        <div className="footer-container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="footer-logo-box">
                <img
                  src="/logo.png"
                  alt="Slipzo"
                  className="footer-logo"
                />
              </div>
              <p className="footer-tagline">Effortless digital billing & receipts for small businesses.</p>
            </div>

            <div className="footer-links-group">
              <div className="footer-links">
                <h4>Product</h4>
                <button onClick={() => setView("product")}>Features</button>
                <button onClick={() => setView("templates")}>Templates</button>
                <button onClick={() => setView("pricing")}>Pricing</button>
              </div>
              <div className="footer-links">
                <h4>Company</h4>
                <button onClick={() => setView("contact")}>Contact Us</button>
                <button onClick={() => setView("landing")}>About</button>
              </div>
              <div className="footer-links">
                <h4>Legal</h4>
                <button onClick={() => setView("contact")}>Privacy Policy</button>
                <button onClick={() => setView("contact")}>Terms of Service</button>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>© 2026 Slipzo. All rights reserved.</p>
            <div className="devnectar-block">
              <span className="devnectar-label">Crafted by</span>
              <span className="devnectar-text">devNectar</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Menu({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function X({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}