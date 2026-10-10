import { useEffect, useState, useRef } from "react"
import { App as CapApp } from "@capacitor/app"
import { Auth } from "./components/Auth"
import { WelcomeOnboarding } from "./components/WelcomeOnboarding"
import { Shell } from "./components/Shell"
import { Dashboard } from "./components/Dashboard"
import { Templates } from "./components/Templates"
import { Bill } from "./components/Bill"
import { History } from "./components/History"
import { Shop } from "./components/Shop"
import { Products } from "./components/Products"
import { Reprint } from "./components/Reprint"
import { Pricing } from "./components/Pricing"
import { Contact } from "./components/Contact"
import { UserGuide } from "./components/UserGuide"
import { ShopOnboardingModal } from "./components/ShopOnboardingModal"
import { Menu as ShopMenu } from "./components/Menu"
import { AddYourItemsModal } from "./components/AddYourItemsModal"
import { OnboardingRewardModal } from "./components/OnboardingRewardModal"
import { FreeRewardExpiredModal } from "./components/FreeRewardExpiredModal"
import { TableManagement } from "./components/tables/TableManagement"
import { PwaInstallPrompt } from "./components/PwaInstallPrompt"
import { ErrorBoundary } from "./components/common/ErrorBoundary"
import { ToastProvider, useToast } from "./components/common/Toast"
import { call, syncUserQuota, getActivePlanDetails, clearApiCache, isNativeApp, isHotelRestaurant, getCachedData } from "./lib/utils"
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

const pathToView = (pathname) => {
  if (!pathname) return "dashboard"
  const clean = pathname.toLowerCase().trim()
  if (clean === "/admin/dashboard") return "admin_dashboard"
  if (clean === "/admin" || clean === "/admin/login" || clean === "/subadmin") return "admin_login"
  if (clean === "/products") return "products"
  if (clean === "/new-bill" || clean === "/bills") return "bills"
  if (clean === "/tables" || clean === "/table-management" || clean === "/restaurant-tables") return "tables"
  if (clean === "/menu") return "menu"
  if (clean === "/templates") return "templates"
  if (clean === "/pricing") return "pricing"
  if (clean === "/bill-history" || clean === "/history") return "history"
  if (clean === "/shop-profile" || clean === "/shop") return "shop"
  if (clean === "/contact") return "contact"
  if (clean === "/guide" || clean === "/user-guide" || clean === "/help") return "guide"
  if (clean === "/reprint") return "reprint"
  if (clean === "/overview" || clean === "/dashboard" || clean === "/") return "dashboard"
  return "dashboard"
}

const viewToPath = (viewName) => {
  switch (viewName) {
    case "dashboard": return "/overview"
    case "products": return "/products"
    case "bills": return "/new-bill"
    case "tables": return "/tables"
    case "menu": return "/menu"
    case "templates": return "/templates"
    case "pricing": return "/pricing"
    case "history": return "/bill-history"
    case "shop": return "/shop-profile"
    case "contact": return "/contact"
    case "guide": return "/user-guide"
    case "reprint": return "/reprint"
    case "admin_login":
    case "admin": return "/admin"
    case "admin_dashboard": return "/admin/dashboard"
    default: return "/"
  }
}

function AppContent() {
  const [user, setUser] = useState(null)
  const [view, setViewState] = useState(() => {
    if (typeof window !== "undefined") {
      const initialView = pathToView(window.location.pathname)
      if (initialView) return initialView
    }
    return "dashboard"
  })
  const [checking, setChecking] = useState(true)
  const [showAuth, setShowAuth] = useState(() => {
    if (typeof window !== "undefined") {
      const p = window.location.pathname.toLowerCase()
      if (p === "/login" || p === "/signin" || p === "/signup" || p === "/register") {
        return true
      }
    }
    return false
  })
  const [isRegister, setIsRegister] = useState(() => {
    if (typeof window !== "undefined") {
      const p = window.location.pathname.toLowerCase()
      if (p === "/signup" || p === "/register") {
        return true
      }
    }
    return false
  })
  const [showShopOnboarding, setShowShopOnboarding] = useState(false)
  const [adminUser, setAdminUser] = useState(null)
  const [adminToken, setAdminToken] = useState(null)
  const [isAdminChecking, setIsAdminChecking] = useState(true)
  const [selectedBillId, setSelectedBillId] = useState(null)
  const [showAddItemsModal, setShowAddItemsModal] = useState(false)
  const [showRewardModal, setShowRewardModal] = useState(false)
  const [showFreeRewardExpiredModal, setShowFreeRewardExpiredModal] = useState(false)
  const [cachedShop, setCachedShop] = useState(() => getCachedData("/shop") || {})
  const isHotel = isHotelRestaurant(cachedShop)

  useEffect(() => {
    const handleShopUpdate = (e) => {
      if (e?.detail) setCachedShop(e.detail)
    }
    window.addEventListener("slipzo_shop_updated", handleShopUpdate)
    return () => window.removeEventListener("slipzo_shop_updated", handleShopUpdate)
  }, [])

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

  const navigationHistoryRef = useRef([])
  const currentViewRef = useRef(view)

  useEffect(() => {
    currentViewRef.current = view
  }, [view])

  const setView = (newView) => {
    setViewState((prevView) => {
      if (prevView && prevView !== newView) {
        navigationHistoryRef.current.push(prevView)
      }
      return newView
    })
    if (typeof window !== "undefined") {
      const targetPath = viewToPath(newView)
      if (targetPath && window.location.pathname !== targetPath) {
        window.history.pushState({ view: newView }, "", targetPath + window.location.search)
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
        setView("dashboard")
      }
    } catch (err) {
      console.log('❌ Not authenticated:', err.message)
      localStorage.removeItem("slipzo_user_info")
      setUser(null)
      setView("dashboard")
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
          if (navigationHistoryRef.current.length > 0) {
            navigationHistoryRef.current.pop()
          }
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

  const modalStatesRef = useRef({
    showAuth,
    showShopOnboarding,
    showAddItemsModal,
    showRewardModal,
    showFreeRewardExpiredModal
  })

  useEffect(() => {
    modalStatesRef.current = {
      showAuth,
      showShopOnboarding,
      showAddItemsModal,
      showRewardModal,
      showFreeRewardExpiredModal
    }
  }, [showAuth, showShopOnboarding, showAddItemsModal, showRewardModal, showFreeRewardExpiredModal])

  useEffect(() => {
    let removeListenerFunc = null

    const setupCapacitorBackButton = async () => {
      try {
        const listener = await CapApp.addListener('backButton', () => {
          const {
            showAuth: authOpen,
            showShopOnboarding: shopOnboardingOpen,
            showAddItemsModal: addItemsOpen,
            showRewardModal: rewardOpen,
            showFreeRewardExpiredModal: expiryOpen
          } = modalStatesRef.current

          // 1. Close top-level App modals if open
          if (authOpen) {
            setShowAuth(false)
            return
          }
          if (rewardOpen) {
            setShowRewardModal(false)
            return
          }
          if (expiryOpen) {
            setShowFreeRewardExpiredModal(false)
            return
          }
          if (addItemsOpen) {
            setShowAddItemsModal(false)
            return
          }
          if (shopOnboardingOpen) {
            setShowShopOnboarding(false)
            return
          }

          // 2. Dispatch custom event so active child views/modals can handle the back press first
          const customBackEvent = new CustomEvent("slipzo_handle_back_button", { cancelable: true })
          const defaultPrevented = !window.dispatchEvent(customBackEvent)
          if (defaultPrevented) return

          // 3. Redirect to last visited page from history stack if available
          if (navigationHistoryRef.current.length > 0) {
            const previousView = navigationHistoryRef.current.pop()
            const targetPath = viewToPath(previousView)
            if (targetPath) {
              window.history.replaceState({ view: previousView }, "", targetPath)
            }
            setViewState(previousView)
            return
          }

          // 4. If current view is not dashboard/overview, redirect back to dashboard
          if (currentViewRef.current !== "dashboard") {
            const targetPath = viewToPath("dashboard")
            if (targetPath) {
              window.history.replaceState({ view: "dashboard" }, "", targetPath)
            }
            setViewState("dashboard")
            return
          }

          // 5. If already on dashboard with no history left, minimize/exit the app
          CapApp.minimizeApp().catch(() => CapApp.exitApp())
        })
        removeListenerFunc = () => listener.remove()
      } catch (err) {
        // Ignored on web browser where native Capacitor App plugin is not active
      }
    }

    setupCapacitorBackButton()

    return () => {
      if (removeListenerFunc) removeListenerFunc()
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
      setShowAuth(false)
      setShowShopOnboarding(false)
      setShowAddItemsModal(false)
      setShowRewardModal(false)
      setView("dashboard")
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
            <img src="/logo-white.png" alt="Slipzen" className="brand-loader-logo" />
          </div>
          <div className="brand-loader-text-group">
            <div className="brand-loader-brand">
              <span className="brand-title">Slipzen</span>
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
    if (adminUser && adminToken) {
      return <AdminDashboard admin={adminUser} onLogout={handleAdminLogout} />
    }
    return <AdminLogin onLoginSuccess={handleAdminLoginSuccess} onCancel={() => setView("dashboard")} />
  }

  if (view === "admin_dashboard") {
    return <AdminDashboard admin={adminUser} onLogout={handleAdminLogout} />
  }

  if (!user) {
    if (showAuth) {
      return (
        <ErrorBoundary onGoHome={() => setView("dashboard")}>
          <Auth 
            onLogin={handleLogin} 
            onCancel={() => setShowAuth(false)}
            initialRegister={isRegister}
          />
          <PwaInstallPrompt />
        </ErrorBoundary>
      )
    }

    return (
      <ErrorBoundary onGoHome={() => setView("dashboard")}>
        <WelcomeOnboarding
          onLogin={() => {
            setIsRegister(false)
            setShowAuth(true)
          }}
          onSignUp={() => {
            setIsRegister(true)
            setShowAuth(true)
          }}
        />
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
        {(view === "tables" || (view === "bills" && isHotel)) && (
          <TableManagement
            user={user}
            setView={setView}
            setSelectedBillId={setSelectedBillId}
            requireAuth={requireAuth}
            shop={cachedShop}
          />
        )}
        {(view === "bills" && !isHotel) && (
          <Bill setView={setView} setSelectedBillId={setSelectedBillId} requireAuth={requireAuth} user={user} />
        )}
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
        {view === "guide" && <UserGuide setView={setView} user={user} />}
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
      shop={cachedShop}
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
