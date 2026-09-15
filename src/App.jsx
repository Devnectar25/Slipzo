import { useEffect, useState } from "react"
import { Home, LayoutTemplate, Sparkles, Tag, Mail, LogIn, Zap, ArrowRight, Menu, X, ShieldCheck, FileText, Globe } from "lucide-react"
import { Auth } from "./components/Auth"
import { Shell } from "./components/Shell"
import { Dashboard } from "./components/Dashboard"
import { Templates } from "./components/Templates"
import { Bill } from "./components/Bill"
import { History } from "./components/History"
import { Shop } from "./components/Shop"
import { Products } from "./components/Products"
import { Reprint } from "./components/Reprint"
import { Landing } from "./components/Landing"
import { PublicTemplates } from "./components/PublicTemplates"
import { Pricing } from "./components/Pricing"
import { Product } from "./components/Product"
import { Contact } from "./components/Contact"
import { ShopOnboardingModal } from "./components/ShopOnboardingModal"
import { Menu as ShopMenu } from "./components/Menu"
import { AddYourItemsModal } from "./components/AddYourItemsModal"
import { PwaInstallPrompt } from "./components/PwaInstallPrompt"
import { ErrorBoundary } from "./components/common/ErrorBoundary"
import { ToastProvider } from "./components/common/Toast"
import { call, syncUserQuota } from "./lib/utils"
import { AdminLogin } from "./components/admin/AdminLogin"
import { AdminDashboard } from "./components/admin/AdminDashboard"
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
  const [view, setView] = useState("landing")
  const [checking, setChecking] = useState(true)
  const [showAuth, setShowAuth] = useState(false)
  const [isRegister, setIsRegister] = useState(false)
  const [showShopOnboarding, setShowShopOnboarding] = useState(false)
  const [adminUser, setAdminUser] = useState(null)
  const [adminToken, setAdminToken] = useState(null)
  const [isAdminChecking, setIsAdminChecking] = useState(true)
  const [selectedBillId, setSelectedBillId] = useState(null)
  const [showAddItemsModal, setShowAddItemsModal] = useState(false)

  const handleOpenAuth = (register = false) => {
    setIsRegister(register)
    setShowAuth(true)
  }

  const checkShopSetupNeeded = async (userData) => {
    try {
      const shopData = await call("/shop/me")
      if (!shopData || !shopData.name) {
        setShowShopOnboarding(true)
      }
    } catch (err) {
      console.warn('⚠️ Shop info not found, showing onboarding:', err.message)
      setShowShopOnboarding(true)
    }
  }

  const checkAdminAuth = async () => {
    const savedToken = localStorage.getItem("slipzo_admin_token")
    if (!savedToken) {
      setIsAdminChecking(false)
      setView("admin_login")
      setChecking(false)
      return
    }

    try {
      const res = await call("/admin/me", {
        headers: { Authorization: `Bearer ${savedToken}` }
      })
      if (res && (res.admin || (res.user && res.user.is_admin))) {
        setAdminUser(res.admin || res.user)
        setAdminToken(savedToken)
        setView("admin_dashboard")
      } else {
        localStorage.removeItem("slipzo_admin_token")
        setView("admin_login")
      }
    } catch (err) {
      console.error("Admin verification failed:", err)
      localStorage.removeItem("slipzo_admin_token")
      setView("admin_login")
    } finally {
      setIsAdminChecking(false)
      setChecking(false)
    }
  }

  const checkUserAuth = async () => {
    try {
      console.log('🔐 Checking user authentication...')
      const userData = await call("/auth/me")
      console.log('✅ User authenticated:', userData)
      if (userData && (userData.id || userData.email)) {
        localStorage.setItem("slipzo_user_info", JSON.stringify(userData))
        // Remove legacy un-scoped keys if present from previous builds
        localStorage.removeItem("slipzo_active_plan")
        localStorage.removeItem("slipzo_free_print_count")

        const userKey = userData.email || userData.id
        
        // Sync subscription quota from DB backend
        try {
          const subRes = await call("/subscriptions/my")
          if (subRes && subRes.quota) {
            syncUserQuota(subRes.quota, userKey)
          }
        } catch (subErr) {
          console.warn("Could not sync DB subscriptions:", subErr)
        }

        setUser(userData)
        setView("dashboard")
        checkShopSetupNeeded(userData)
      } else {
        console.log('❌ Invalid user data returned:', userData)
        localStorage.removeItem("slipzo_user_info")
        setUser(null)
        setView("landing")
      }
    } catch (err) {
      console.log('❌ Not authenticated:', err.message)
      localStorage.removeItem("slipzo_user_info")
      setUser(null)
      setView("landing")
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    const path = window.location.pathname
    if (path === "/admin/login" || path === "/admin" || path.startsWith("/admin/")) {
      checkAdminAuth()
    } else {
      checkUserAuth()
    }
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (view === "customers") {
      setView("dashboard")
    }
  }, [view])

  const handleLogout = async () => {
    try {
      await call("/auth/logout", { method: "POST" })
      localStorage.removeItem("slipzo_user_info")
      setUser(null)
      setShowShopOnboarding(false)
      setView("landing")
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("slipzo-quota-update"))
      }
    } catch (err) {
      console.error("Logout failed:", err)
    }
  }

  const handleLogin = (userData, isNewUser = false) => {
    setUser(userData)
    setView("dashboard")
    setShowAuth(false)
    if (isNewUser) {
      setShowShopOnboarding(true)
    } else {
      checkShopSetupNeeded(userData)
    }
  }

  const requireAuth = (viewName) => {
    if (!user) {
      handleOpenAuth(false)
      return
    }
    setView(viewName)
  }

  const handleAdminLoginSuccess = (adminData, token) => {
    if (token) {
      localStorage.setItem("slipzo_token", token)
      localStorage.setItem("slipzo_admin_token", token)
    }
    setAdminUser(adminData)
    setView("admin_dashboard")
    window.history.pushState({}, "", "/admin")
  }

  const handleAdminLogout = async () => {
    try {
      await call("/admin/logout", { method: "POST" })
    } catch (err) {}
    localStorage.removeItem("slipzo_admin_token")
    setAdminUser(null)
    setView("admin_login")
    window.history.pushState({}, "", "/admin/login")
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

  if (view === "admin_login" || view === "admin") {
    return <AdminLogin onLoginSuccess={handleAdminLoginSuccess} />
  }

  if (view === "admin_dashboard") {
    return <AdminDashboard admin={adminUser} onLogout={handleAdminLogout} />
  }

  // Public pages (accessible without login)
  const publicPages = ["landing", "templates", "product", "pricing", "contact", "bills"]

  if (!user) {
    const activePublicView = publicPages.includes(view) ? view : "landing"
    return (
      <ErrorBoundary onGoHome={() => setView("landing")}>
        <PublicLayout
          view={activePublicView}
          setView={setView}
          setShowAuth={setShowAuth}
          handleOpenAuth={handleOpenAuth}
          user={user}
          requireAuth={requireAuth}
        />
        {showAuth && (
          <Auth 
            onLogin={handleLogin} 
            onCancel={() => {
              setShowAuth(false)
              setIsRegister(false)
            }} 
            initialRegister={isRegister}
          />
        )}
        <PwaInstallPrompt />
      </ErrorBoundary>
    )
  }

  // Protected routes - only accessible when logged in
  return (
    <>
      <Shell
      user={user}
      view={view}
      setView={setView}
      onLogout={handleLogout}
      requireAuth={requireAuth}
    >
      <ErrorBoundary onGoHome={() => setView("dashboard")} onReset={() => setView("dashboard")}>
        {view === "dashboard" && <Dashboard setView={setView} requireAuth={requireAuth} user={user} />}
        {view === "templates" && <Templates setView={setView} requireAuth={requireAuth} user={user} />}
        {view === "bills" && <Bill setView={setView} requireAuth={requireAuth} user={user} />}
        {view === "menu" && <ShopMenu setView={setView} requireAuth={requireAuth} user={user} />}
        {view === "products" && <Products setView={setView} requireAuth={requireAuth} user={user} />}
        {view === "history" && (
          <History
            setView={setView}
            setSelectedBillId={setSelectedBillId}
            requireAuth={requireAuth}
          />
        )}
        {view === "shop" && <Shop requireAuth={requireAuth} user={user} setView={setView} />}
        {view === "pricing" && <Pricing setView={setView} setShowAuth={setShowAuth} user={user} />}
        {view === "contact" && <Contact setView={setView} setShowAuth={setShowAuth} user={user} />}
        {view === "reprint" && (
          <Reprint
            billId={selectedBillId}
            setView={setView}
            requireAuth={requireAuth}
          />
        )}
      </ErrorBoundary>
    </Shell>
    <ShopOnboardingModal
      isOpen={showShopOnboarding}
      user={user}
      onClose={() => setShowShopOnboarding(false)}
      onComplete={() => {
        setShowShopOnboarding(false)
        if (user?.id && localStorage.getItem(`slipzo_items_setup_${user.id}`) !== "true") {
          setShowAddItemsModal(true)
        }
      }}
    />
    <AddYourItemsModal
      isOpen={showAddItemsModal}
      user={user}
      onClose={() => setShowAddItemsModal(false)}
      onContinue={() => setView("bills")}
    />
    <PwaInstallPrompt />
  </>
  )
}

// Public Layout Component
function PublicLayout({ view, setView, setShowAuth, handleOpenAuth, user, requireAuth }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Prevent body scrolling when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden"
      document.documentElement.style.overflow = "hidden"
      document.body.style.touchAction = "none"
      document.documentElement.style.touchAction = "none"
    } else {
      document.body.style.overflow = ""
      document.documentElement.style.overflow = ""
      document.body.style.touchAction = ""
      document.documentElement.style.touchAction = ""
    }
    return () => {
      document.body.style.overflow = ""
      document.documentElement.style.overflow = ""
      document.body.style.touchAction = ""
      document.documentElement.style.touchAction = ""
    }
  }, [mobileMenuOpen])

  const navItems = [
    { id: "landing", label: "Home", icon: Home },
    { id: "templates", label: "Templates", icon: LayoutTemplate },
    { id: "product", label: "Product", icon: Sparkles },
    { id: "pricing", label: "Pricing", icon: Tag },
    { id: "contact", label: "Contact", icon: Mail }
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
      {mobileMenuOpen && (
        <div 
          className="mobile-menu-backdrop" 
          onClick={() => setMobileMenuOpen(false)}
          onTouchMove={(e) => e.preventDefault()}
        />
      )}
      <nav className="public-nav">
        <div className="nav-container">
          <div className="nav-brand" onClick={() => setView(user ? "dashboard" : "landing")}>
            <img
              src="/logo.png"
              alt="Slipzo"
              className="public-nav-logo"
            />
          </div>

          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>

          <div 
            className={`nav-links ${mobileMenuOpen ? 'open' : ''}`}
            onTouchMove={(e) => e.preventDefault()}
          >
            <div className="mobile-menu-header">
              <span className="mobile-menu-title">Menu</span>
              <button 
                className="mobile-menu-close" 
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            {navItems.map(item => {
              const IconComp = item.icon
              return (
                <button
                  key={item.id}
                  className={`nav-link ${view === item.id ? 'active' : ''}`}
                  onClick={() => {
                    setView(item.id)
                    setMobileMenuOpen(false)
                  }}
                >
                  <IconComp size={18} className="nav-item-icon" />
                  <span>{item.label}</span>
                </button>
              )
            })}

            {!user && (
              <div className="mobile-menu-actions">
                <button
                  className="mobile-login-btn"
                  onClick={() => {
                    if (handleOpenAuth) {
                      handleOpenAuth(false)
                    } else {
                      setShowAuth(true)
                    }
                    setMobileMenuOpen(false)
                  }}
                >
                  <LogIn size={16} /> Login
                </button>
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
                  <Zap size={16} /> Get Started
                </button>
              </div>
            )}
          </div>

          <div className="nav-actions">
            {user ? (
              <button
                className="nav-button primary"
                onClick={() => setView("dashboard")}
              >
                Dashboard <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <button
                  className="nav-button secondary"
                  onClick={() => handleOpenAuth ? handleOpenAuth(false) : setShowAuth(true)}
                >
                  <LogIn size={16} /> Log in
                </button>
                <button
                  className="nav-button primary"
                  onClick={() => handleOpenAuth ? handleOpenAuth(true) : setShowAuth(true)}
                >
                  <Zap size={16} /> Get Started
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
            <div
              className="footer-brand"
              onClick={() => setView(user ? "dashboard" : "landing")}
              style={{ cursor: 'pointer' }}
              title="Return to Home"
            >
              <div className="footer-logo-box">
                <img
                  src="/Footer_Logo.png"
                  alt="Slipzo"
                  className="footer-logo"
                />
              </div>
              <p className="footer-tagline">Effortless digital billing & receipts for small businesses.</p>
              
              <div className="footer-social-icons">
                <a href="https://devnectar.in" target="_blank" rel="noreferrer" title="Website"><Globe size={16} /></a>
                <a href="mailto:support@slipzo.in" title="Email Us"><Mail size={16} /></a>
                <button onClick={() => setView("product")} title="Features"><Sparkles size={16} /></button>
                <button onClick={() => setView("templates")} title="Templates"><LayoutTemplate size={16} /></button>
              </div>
            </div>

            <div className="footer-links-group">
              <div className="footer-links">
                <h4>Product</h4>
                <button onClick={() => setView("product")}>
                  <Sparkles size={13} /> Features
                </button>
                <button onClick={() => setView("templates")}>
                  <LayoutTemplate size={13} /> Templates
                </button>
                <button onClick={() => setView("pricing")}>
                  <Tag size={13} /> Pricing
                </button>
              </div>
              <div className="footer-links">
                <h4>Company</h4>
                <button onClick={() => setView("contact")}>
                  <Mail size={13} /> Contact Us
                </button>
                <button onClick={() => setView("landing")}>
                  <Home size={13} /> About
                </button>
                <button onClick={() => { setView("admin_login"); window.history.pushState({}, "", "/admin/login"); }}>
                  <ShieldCheck size={13} /> Admin Portal
                </button>
              </div>
              <div className="footer-links">
                <h4>Legal</h4>
                <button onClick={() => setView("contact")}>
                  <ShieldCheck size={13} /> Privacy Policy
                </button>
                <button onClick={() => setView("contact")}>
                  <FileText size={13} /> Terms of Service
                </button>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>© 2026 slipzo.com. All rights reserved.</p>
            <a
              href="https://devnectar.in"
              target="_blank"
              rel="noopener noreferrer"
              className="devnectar-block"
              title="Visit devNectar.in"
            >
              <span className="devnectar-label">Crafted by</span>
              <span className="devnectar-text">devNectar</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}