import { useEffect, useState, useRef } from "react"
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
import { OnboardingRewardModal } from "./components/OnboardingRewardModal"
import { FreeRewardExpiredModal } from "./components/FreeRewardExpiredModal"
import { PwaInstallPrompt } from "./components/PwaInstallPrompt"
import { ErrorBoundary } from "./components/common/ErrorBoundary"
import { ToastProvider, useToast } from "./components/common/Toast"
import { call, syncUserQuota, getActivePlanDetails, clearApiCache, isNativeApp } from "./lib/utils"
import { AdminLogin } from "./components/admin/AdminLogin"
import { AdminDashboard } from "./components/admin/AdminDashboard"
import { useTranslation } from "react-i18next"
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

const pathToView = (pathname) => {
  if (!pathname) return null
  const clean = pathname.toLowerCase().trim()
  if (clean === "/products") return "products"
  if (clean === "/new-bill" || clean === "/bills") return "bills"
  if (clean === "/menu") return "menu"
  if (clean === "/templates") return "templates"
  if (clean === "/pricing") return "pricing"
  if (clean === "/bill-history" || clean === "/history") return "history"
  if (clean === "/shop-profile" || clean === "/shop") return "shop"
  if (clean === "/contact") return "contact"
  if (clean === "/product") return "product"
  if (clean === "/reprint") return "reprint"
  if (clean === "/overview" || clean === "/dashboard") return "dashboard"
  return null
}

const viewToPath = (viewName) => {
  switch (viewName) {
    case "dashboard": return "/overview"
    case "products": return "/products"
    case "bills": return "/new-bill"
    case "menu": return "/menu"
    case "templates": return "/templates"
    case "pricing": return "/pricing"
    case "history": return "/bill-history"
    case "shop": return "/shop-profile"
    case "contact": return "/contact"
    case "product": return "/product"
    case "reprint": return "/reprint"
    case "landing": return "/"
    default: return null
  }
}

function AppContent() {
  const [user, setUser] = useState(null)
  const [view, setViewState] = useState(() => {
    if (typeof window !== "undefined") {
      const initialView = pathToView(window.location.pathname)
      if (initialView) return initialView
    }
    return "landing"
  })
  const [checking, setChecking] = useState(true)
  const [showAuth, setShowAuth] = useState(false)
  const [isRegister, setIsRegister] = useState(false)
  const [showShopOnboarding, setShowShopOnboarding] = useState(false)
  const [adminUser, setAdminUser] = useState(null)
  const [adminToken, setAdminToken] = useState(null)
  const [isAdminChecking, setIsAdminChecking] = useState(true)
  const [selectedBillId, setSelectedBillId] = useState(null)
  const [showAddItemsModal, setShowAddItemsModal] = useState(false)
  const [showRewardModal, setShowRewardModal] = useState(false)
  const [showFreeRewardExpiredModal, setShowFreeRewardExpiredModal] = useState(false)
  const { error: toastError } = useToast()
  const isClaimingRewardRef = useRef(false)

  const handleClaimOnboardingReward = async () => {
    if (isClaimingRewardRef.current) return
    isClaimingRewardRef.current = true
    try {
      const userKey = user?.email || user?.id
      if (user?.id) {
        localStorage.setItem(`slipzo_items_setup_${user.id}`, "true")
      }
      if (userKey) {
        localStorage.setItem(`slipzo_first_time_onboarding_${userKey}`, "true")
        localStorage.removeItem(`slipzo_onboarding_in_progress_${userKey}`)
      }

      // Claim 10 free prints onboarding reward from backend API
      const res = await call("/subscriptions/claim-onboarding-reward", {
        method: "POST"
      })

      if (res && res.quota) {
        syncUserQuota(res.quota, userKey)
      }

      setShowAddItemsModal(false)
      setShowRewardModal(true)
    } catch (err) {
      console.error("Failed to claim onboarding reward:", err)
      toastError(err.message || "Failed to claim 10 free prints reward. Please try again.")
      throw err
    } finally {
      isClaimingRewardRef.current = false
    }
  }

  const handleRewardGetStarted = () => {
    setShowRewardModal(false)
    setView("dashboard") // Redirect to /overview
  }

  const handleViewPlansFromExpiry = () => {
    setShowFreeRewardExpiredModal(false)
    setView("pricing")
  }

  const handleCloseExpiryModal = () => {
    setShowFreeRewardExpiredModal(false)
    const userKey = user?.email || user?.id
    if (userKey) {
      sessionStorage.setItem(`slipzo_free_expiry_dismissed_${userKey}`, "true")
    }
  }

  const setView = (newView) => {
    setViewState(newView)
    if (typeof window !== "undefined") {
      const targetPath = viewToPath(newView)
      if (targetPath && window.location.pathname !== targetPath) {
        window.history.pushState({}, "", targetPath + window.location.search)
      }
    }
  }

  const handleOpenAuth = (register = false) => {
    setIsRegister(register)
    setShowAuth(true)
  }

  const checkShopSetupNeeded = async (userData) => {
    const userKey = userData?.email || userData?.id
    if (!userKey) return

    const firstTimeDone = localStorage.getItem(`slipzo_first_time_onboarding_${userKey}`) === "true"
    const isRewardClaimed = Number(userData?.onboarding_reward_claimed || 0) === 1

    // If user has already claimed reward or completed onboarding, keep all onboarding modals closed
    if (firstTimeDone || isRewardClaimed) {
      setShowShopOnboarding(false)
      setShowAddItemsModal(false)
      setShowRewardModal(false)
      localStorage.setItem(`slipzo_first_time_onboarding_${userKey}`, "true")
      localStorage.removeItem(`slipzo_onboarding_in_progress_${userKey}`)
      return
    }

    const isOnboardingInProgress = localStorage.getItem(`slipzo_onboarding_in_progress_${userKey}`) === "true"

    try {
      const shopData = await call("/shop")
      const isComplete = Boolean(
        shopData &&
        shopData.name &&
        shopData.name.trim() &&
        shopData.phone &&
        shopData.phone.trim() &&
        shopData.address &&
        shopData.address.trim()
      )

      if (!isComplete) {
        // STATE 2: Shop profile is incomplete: show shop profile popup
        setShowShopOnboarding(true)
        setShowAddItemsModal(false)
        setShowRewardModal(false)
      } else if (isOnboardingInProgress) {
        // STATE 3: Shop profile is complete, but onboarding is in progress: show Add Items modal
        setShowShopOnboarding(false)
        setShowAddItemsModal(true)
        setShowRewardModal(false)
      } else {
        // Existing user with complete profile: finish onboarding
        setShowShopOnboarding(false)
        setShowAddItemsModal(false)
        setShowRewardModal(false)
        localStorage.setItem(`slipzo_first_time_onboarding_${userKey}`, "true")
      }
    } catch (err) {
      console.warn('⚠️ Shop info check:', err.message)
      if (isOnboardingInProgress) {
        setShowShopOnboarding(true)
      } else {
        setShowShopOnboarding(false)
      }
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
        const currentUrlView = pathToView(window.location.pathname)
        if (currentUrlView) {
          setView(currentUrlView)
        } else {
          setView("dashboard")
        }
        checkShopSetupNeeded(userData)
      } else {
        console.log('❌ Invalid user data returned:', userData)
        localStorage.removeItem("slipzo_user_info")
        setUser(null)
        const currentUrlView = pathToView(window.location.pathname)
        const publicPages = ["landing", "templates", "product", "pricing", "contact", "bills"]
        if (currentUrlView && publicPages.includes(currentUrlView)) {
          setView(currentUrlView)
        } else {
          setView("landing")
        }
      }
    } catch (err) {
      console.log('❌ Not authenticated:', err.message)
      localStorage.removeItem("slipzo_user_info")
      setUser(null)
      const currentUrlView = pathToView(window.location.pathname)
      const publicPages = ["landing", "templates", "product", "pricing", "contact", "bills"]
      if (currentUrlView && publicPages.includes(currentUrlView)) {
        setView(currentUrlView)
      } else {
        setView("landing")
      }
    } finally {
      setChecking(false)
    }
  }

  const userRef = useRef(user)
  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    const path = window.location.pathname
    if (path === "/admin/login" || path === "/admin" || path.startsWith("/admin/")) {
      checkAdminAuth()
    } else {
      checkUserAuth()
    }

    const handleUnauthorized = () => {
      setUser(null)
      localStorage.removeItem("slipzo_user_info")
      localStorage.removeItem("slipzo_token")
    }

    const handlePopState = () => {
      const p = window.location.pathname
      if (!p.startsWith("/admin")) {
        const matched = pathToView(p)
        if (matched) {
          setViewState(matched)
        }
      }
    }

    const handleShowExpiry = (e) => {
      const currentUser = userRef.current
      const userKey = currentUser?.email || currentUser?.id
      const isForced = !!e?.detail?.force

      if (e?.detail?.quota) {
        syncUserQuota(e.detail.quota, userKey)
      }

      if (!isForced && userKey && sessionStorage.getItem(`slipzo_free_expiry_dismissed_${userKey}`)) {
        return
      }

      if (isForced) {
        setShowFreeRewardExpiredModal(true)
        return
      }

      const plan = getActivePlanDetails(userKey)
      if (plan && plan.isFreeTier && Number(plan.printsRemaining) <= 0) {
        setShowFreeRewardExpiredModal(true)
      }
    }

    window.addEventListener("slipzo_auth_unauthorized", handleUnauthorized)
    window.addEventListener("popstate", handlePopState)
    window.addEventListener("slipzo-show-free-reward-expired", handleShowExpiry)
    return () => {
      window.removeEventListener("slipzo_auth_unauthorized", handleUnauthorized)
      window.removeEventListener("popstate", handlePopState)
      window.removeEventListener("slipzo-show-free-reward-expired", handleShowExpiry)
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
    } catch (err) {
      console.warn("Backend logout endpoint warning:", err)
    } finally {
      try {
        localStorage.removeItem("slipzo_user_info")
        localStorage.removeItem("slipzo_token")
        localStorage.removeItem("slipzo_admin_token")
        sessionStorage.clear()
        clearApiCache()
      } catch (e) {}

      setUser(null)
      setShowShopOnboarding(false)
      setShowAddItemsModal(false)
      setShowRewardModal(false)
      setView("landing")
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("slipzo-quota-update"))
      }
    }
  }

  const handleLogin = async (userData, isNewUser = false) => {
    setUser(userData)
    setView("dashboard")
    setShowAuth(false)
    const userKey = userData?.email || userData?.id

    try {
      const subRes = await call("/subscriptions/my")
      if (subRes && subRes.quota) {
        syncUserQuota(subRes.quota, userKey)
      }
    } catch (subErr) {
      console.warn("Could not sync DB subscriptions on login:", subErr)
    }

    if (isNewUser) {
      if (userKey) {
        localStorage.setItem(`slipzo_onboarding_in_progress_${userKey}`, "true")
        localStorage.removeItem(`slipzo_first_time_onboarding_${userKey}`)
      }
      setShowShopOnboarding(true)
      setShowAddItemsModal(false)
      setShowRewardModal(false)
    } else {
      setShowShopOnboarding(false)
      setShowAddItemsModal(false)
      setShowRewardModal(false)
      if (Number(userData?.onboarding_reward_claimed || 0) === 1 && userKey) {
        localStorage.setItem(`slipzo_first_time_onboarding_${userKey}`, "true")
      }
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
        <div className="brand-loader-card">
          <div className="brand-loader-logo-wrapper">
            <div className="brand-loader-ring-glow"></div>
            <div className="brand-loader-ring-spinner"></div>
            <img src="/logo.png" alt="Slipzo" className="brand-loader-logo" />
          </div>
          <div className="brand-loader-text-group">
            <div className="brand-loader-brand">
              <span className="brand-title">Slipzo</span>
              <span className="brand-dot">•</span>
            </div>
            <p className="brand-loader-subtext">Quick & Smart Billing System</p>
          </div>
          <div className="brand-loader-progress-track">
            <div className="brand-loader-progress-fill"></div>
          </div>
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
        {view === "dashboard" && <Dashboard setView={setView} setSelectedBillId={setSelectedBillId} requireAuth={requireAuth} user={user} />}
        {view === "templates" && <Templates setView={setView} requireAuth={requireAuth} user={user} />}
        {view === "bills" && <Bill setView={setView} setSelectedBillId={setSelectedBillId} requireAuth={requireAuth} user={user} />}
        {view === "menu" && <ShopMenu setView={setView} requireAuth={requireAuth} user={user} />}
        {view === "products" && <Products setView={setView} requireAuth={requireAuth} user={user} />}
        {view === "history" && (
          <History
            setView={setView}
            setSelectedBillId={setSelectedBillId}
            requireAuth={requireAuth}
            user={user}
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
            user={user}
          />
        )}
      </ErrorBoundary>
    </Shell>
    <ShopOnboardingModal
      isOpen={showShopOnboarding}
      user={user}
      onClose={() => {
        setShowShopOnboarding(false)
      }}
      onComplete={() => {
        setShowShopOnboarding(false)
        if (user?.id) {
          localStorage.setItem(`slipzo_shop_setup_${user.id}`, "true")
        }
        setShowAddItemsModal(true)
      }}
    />
    <AddYourItemsModal
      isOpen={showAddItemsModal}
      user={user}
      onClose={() => setShowAddItemsModal(false)}
      onContinue={handleClaimOnboardingReward}
    />
    <OnboardingRewardModal
      isOpen={showRewardModal}
      onClose={() => {
        setShowRewardModal(false)
        setView("dashboard")
      }}
      onGetStarted={handleRewardGetStarted}
    />
    <FreeRewardExpiredModal
      isOpen={showFreeRewardExpiredModal}
      onClose={handleCloseExpiryModal}
      onViewPlans={handleViewPlansFromExpiry}
    />
    <PwaInstallPrompt />
  </>
  )
}

// Public Layout Component
function PublicLayout({ view, setView, setShowAuth, handleOpenAuth, user, requireAuth }) {
  const { t } = useTranslation()
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
    { id: "landing", label: t("nav.home", "Home"), icon: Home },
    { id: "templates", label: t("nav.templates", "Templates"), icon: LayoutTemplate },
    { id: "product", label: t("footer.product", "Product"), icon: Sparkles },
    { id: "pricing", label: t("nav.pricing", "Pricing"), icon: Tag },
    { id: "contact", label: t("nav.contact", "Contact"), icon: Mail }
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
              <span className="mobile-menu-title">{t("nav.menu", "Menu")}</span>
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
                  <LogIn size={16} /> {t("common.logIn", "Log In")}
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
                  <Zap size={16} /> {t("common.signUp", "Sign Up")}
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
                {t("nav.overview", "Dashboard")} <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <button
                  className="nav-button secondary"
                  onClick={() => handleOpenAuth ? handleOpenAuth(false) : setShowAuth(true)}
                >
                  <LogIn size={16} /> {t("common.logIn", "Log in")}
                </button>
                <button
                  className="nav-button primary"
                  onClick={() => handleOpenAuth ? handleOpenAuth(true) : setShowAuth(true)}
                >
                  <Zap size={16} /> {t("common.getStarted", "Get Started")}
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="public-main">
        {renderPage()}
      </main>

      {!isNativeApp && (
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
                <p className="footer-tagline">{t("footer.tagline", "Effortless digital billing & receipts for small businesses.")}</p>
                
                <div className="footer-social-icons">
                  <a href="https://devnectar.in" target="_blank" rel="noreferrer" title="Website"><Globe size={16} /></a>
                  <a href="mailto:support@slipzo.in" title="Email Us"><Mail size={16} /></a>
                  <button onClick={() => setView("product")} title="Features"><Sparkles size={16} /></button>
                  <button onClick={() => setView("templates")} title="Templates"><LayoutTemplate size={16} /></button>
                </div>
              </div>

              <div className="footer-links-group">
                <div className="footer-links">
                  <h4>{t("footer.product", "Product")}</h4>
                  <button onClick={() => setView("product")}>
                    <Sparkles size={13} /> {t("footer.features", "Features")}
                  </button>
                  <button onClick={() => setView("templates")}>
                    <LayoutTemplate size={13} /> {t("footer.templates", "Templates")}
                  </button>
                  <button onClick={() => setView("pricing")}>
                    <Tag size={13} /> {t("footer.pricing", "Pricing")}
                  </button>
                </div>
                <div className="footer-links">
                  <h4>{t("footer.company", "Company")}</h4>
                  <button onClick={() => setView("contact")}>
                    <Mail size={13} /> {t("footer.contactUs", "Contact Us")}
                  </button>
                  <button onClick={() => setView("landing")}>
                    <Home size={13} /> {t("footer.about", "About")}
                  </button>
                  <button onClick={() => { setView("admin_login"); window.history.pushState({}, "", "/admin/login"); }}>
                    <ShieldCheck size={13} /> {t("footer.adminPortal", "Admin Portal")}
                  </button>
                </div>
                <div className="footer-links">
                  <h4>{t("footer.legal", "Legal")}</h4>
                  <button onClick={() => setView("contact")}>
                    <ShieldCheck size={13} /> {t("footer.privacyPolicy", "Privacy Policy")}
                  </button>
                  <button onClick={() => setView("contact")}>
                    <FileText size={13} /> {t("footer.termsOfService", "Terms of Service")}
                  </button>
                </div>
              </div>
            </div>

            <div className="footer-bottom">
              <p>{t("footer.rights", "© 2026 slipzo.com. All rights reserved.")}</p>
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
      )}
    </div>
  )
}