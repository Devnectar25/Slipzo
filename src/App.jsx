import { useEffect, useState, useRef, lazy, Suspense } from "react"
import { App as CapApp } from "@capacitor/app"
import { Shell } from "./components/Shell"
import { PwaInstallPrompt } from "./components/PwaInstallPrompt"
import { ErrorBoundary } from "./components/common/ErrorBoundary"
import { ToastProvider, useToast } from "./components/common/Toast"
import { TopProgressBar } from "./components/common/TopProgressBar"
import { call, syncUserQuota, getActivePlanDetails, clearApiCache, isNativeApp, isHotelRestaurant, getCachedData } from "./lib/utils"
import "./styles/App.css"
import "./styles/print.css"

// Pages and modals are code-split so the first load only downloads what the current screen needs.
// Each loader is kept so the remaining chunks can be prefetched once the app is idle.
const pageLoaders = []
const lazyNamed = (loader, name) => {
  pageLoaders.push(loader)
  return lazy(() => loader().then((m) => ({ default: m[name] })))
}

const Auth = lazyNamed(() => import("./components/Auth"), "Auth")
const WelcomeOnboarding = lazyNamed(() => import("./components/WelcomeOnboarding"), "WelcomeOnboarding")
const DesktopLanding = lazyNamed(() => import("./components/DesktopLanding"), "DesktopLanding")
const PublicPageShell = lazyNamed(() => import("./components/PublicPageShell"), "PublicPageShell")
const Dashboard = lazyNamed(() => import("./components/Dashboard"), "Dashboard")
const Templates = lazyNamed(() => import("./components/Templates"), "Templates")
const Bill = lazyNamed(() => import("./components/Bill"), "Bill")
const History = lazyNamed(() => import("./components/History"), "History")
const Shop = lazyNamed(() => import("./components/Shop"), "Shop")
const Products = lazyNamed(() => import("./components/Products"), "Products")
const Reprint = lazyNamed(() => import("./components/Reprint"), "Reprint")
const Pricing = lazyNamed(() => import("./components/Pricing"), "Pricing")
const Contact = lazyNamed(() => import("./components/Contact"), "Contact")
const UserGuide = lazyNamed(() => import("./components/UserGuide"), "UserGuide")
const ShopMenu = lazyNamed(() => import("./components/Menu"), "Menu")
const TableManagement = lazyNamed(() => import("./components/tables/TableManagement"), "TableManagement")
const ShopOnboardingModal = lazyNamed(() => import("./components/ShopOnboardingModal"), "ShopOnboardingModal")
const AddYourItemsModal = lazyNamed(() => import("./components/AddYourItemsModal"), "AddYourItemsModal")
const PlanGate = lazyNamed(() => import("./components/PlanGate"), "PlanGate")
const FreeRewardExpiredModal = lazyNamed(() => import("./components/FreeRewardExpiredModal"), "FreeRewardExpiredModal")
const AdminLogin = lazyNamed(() => import("./components/admin/AdminLogin"), "AdminLogin")
const AdminDashboard = lazyNamed(() => import("./components/admin/AdminDashboard"), "AdminDashboard")

// Opened from inside Bill and TableBilling, which load it on demand
pageLoaders.push(() => import("./components/common/CameraScannerModal"))

// The APK, an installed app and phones keep the story-style welcome screen; a desktop browser gets the
// advertisement page instead
const DESKTOP_QUERY = "(min-width: 900px)"
const isDesktopWeb = () => {
  if (typeof window === "undefined" || isNativeApp) return false
  const installed = window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true
  return !installed && Boolean(window.matchMedia?.(DESKTOP_QUERY).matches)
}

// Warm the cache with every page chunk in idle time so navigation stays instant and works offline.
const prefetchPages = () => {
  const run = () => pageLoaders.forEach((load) => load().catch(() => {}))
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(run, { timeout: 4000 })
  else setTimeout(run, 2000)
}

function BrandLoader() {
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

function PageLoader() {
  return (
    <div className="page-lazy-loader" role="status" aria-label="Loading">
      <div className="page-lazy-spinner"></div>
    </div>
  )
}

export default function App() {
  useEffect(() => {
    if (document.readyState === "complete") prefetchPages()
    else window.addEventListener("load", prefetchPages, { once: true })
  }, [])

  return (
    <ErrorBoundary>
      <TopProgressBar />
      <ToastProvider>
        <Suspense fallback={<BrandLoader />}>
          <AppContent />
        </Suspense>
      </ToastProvider>
    </ErrorBoundary>
  )
}

// Waits for a promise, but never longer than ms: a slow server must not keep the loader on screen forever
const withTimeout = (promise, ms) => Promise.race([promise, new Promise((resolve) => setTimeout(resolve, ms))])

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

// The pages a visitor who is not signed in can open on their own URL (a reload keeps them there)
const publicViewFromPath = () => {
  if (typeof window === "undefined") return "dashboard"
  const v = pathToView(window.location.pathname)
  return v === "pricing" || v === "contact" ? v : "dashboard"
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
  const [desktopWeb, setDesktopWeb] = useState(isDesktopWeb)
  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY)
    const update = () => setDesktopWeb(isDesktopWeb())
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])
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
  // New accounts must buy a print pack before the shop and item setup
  const [showPlanGate, setShowPlanGate] = useState(false)
  const [resolvingSetup, setResolvingSetup] = useState(false)
  const [adminUser, setAdminUser] = useState(null)
  const [adminToken, setAdminToken] = useState(null)
  const [isAdminChecking, setIsAdminChecking] = useState(true)
  const [selectedBillId, setSelectedBillId] = useState(null)
  const [showAddItemsModal, setShowAddItemsModal] = useState(false)
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

  const handleCompleteOnboarding = async () => {
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

      // Setup is finished: tell the server (no prints are given for this; the pack was bought on the plan step) and open the dashboard
      const res = await call("/subscriptions/complete-onboarding", {
        method: "POST"
      })

      if (res && res.quota) {
        syncUserQuota(res.quota, userKey)
      }

      setShowAddItemsModal(false)
      setView("dashboard")
    } catch (err) {
      console.error("Failed to finish setup:", err)
      toastError(err.message || "Failed to finish setup. Please try again.")
      throw err
    } finally {
      isClaimingRewardRef.current = false
    }
  }

  // The pack is paid for and confirmed: on to the shop profile, then the items
  const handlePlanPurchased = () => {
    setShowPlanGate(false)
    setShowShopOnboarding(true)
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
    // Warm up the plan step while the sign-up form is open so it appears instantly afterwards
    if (register) import("./components/PlanGate").catch(() => {})
    setIsRegister(register)
    setShowAuth(true)
  }

  const checkShopSetupNeeded = async (userData) => {
    const userKey = userData?.email || userData?.id
    if (!userKey) return
    // Workers use the owner's shop, which is the owner's to set up
    if (userData?.staff_of) return

    const firstTimeDone = localStorage.getItem(`slipzo_first_time_onboarding_${userKey}`) === "true"
    const isRewardClaimed = Number(userData?.onboarding_reward_claimed || 0) >= 1

    // If user has already claimed reward or completed onboarding, keep all onboarding modals closed
    if (firstTimeDone || isRewardClaimed) {
      setShowShopOnboarding(false)
      setShowAddItemsModal(false)
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

      // A brand new account (nothing bought, reward not claimed) has to pick a plan before anything else
      let needsPlan = false
      if (isOnboardingInProgress || !isComplete) {
        try {
          const subRes = await call("/subscriptions/my")
          const q = subRes?.quota
          needsPlan = Boolean(q && q.isFreeTier && !q.onboardingRewardClaimed)
        } catch (_) {}
      }

      if (needsPlan) {
        setShowPlanGate(true)
        setShowShopOnboarding(false)
        setShowAddItemsModal(false)
      } else if (!isComplete) {
        // STATE 2: Shop profile is incomplete: show shop profile popup
        setShowPlanGate(false)
        setShowShopOnboarding(true)
        setShowAddItemsModal(false)
      } else if (isOnboardingInProgress) {
        // STATE 3: Shop profile is complete, but onboarding is in progress: show Add Items modal
        setShowShopOnboarding(false)
        setShowAddItemsModal(true)
      } else {
        // Existing user with complete profile: finish onboarding
        setShowShopOnboarding(false)
        setShowAddItemsModal(false)
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
        // Wait for the answer (the loader stays up) so the dashboard never flashes before the plan or setup screen
        await withTimeout(checkShopSetupNeeded(userData), 8000)
      } else {
        console.log('❌ Invalid user data returned:', userData)
        localStorage.removeItem("slipzo_user_info")
        setUser(null)
        setView(publicViewFromPath())
      }
    } catch (err) {
      console.log('❌ Not authenticated:', err.message)
      localStorage.removeItem("slipzo_user_info")
      setUser(null)
      setView(publicViewFromPath())
    } finally {
      setChecking(false)
    }
  }

  // Safety nets: if the server is slow or cannot be reached, the big loader gives way after a while instead of staying forever
  useEffect(() => {
    if (!checking) return undefined
    const timer = setTimeout(() => setChecking(false), 25000)
    return () => clearTimeout(timer)
  }, [checking])
  useEffect(() => {
    if (!resolvingSetup) return undefined
    const timer = setTimeout(() => setResolvingSetup(false), 12000)
    return () => clearTimeout(timer)
  }, [resolvingSetup])

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
    showPlanGate,
    showShopOnboarding,
    showAddItemsModal,
    showFreeRewardExpiredModal
  })

  useEffect(() => {
    modalStatesRef.current = {
      showAuth,
      showPlanGate,
      showShopOnboarding,
      showAddItemsModal,
      showFreeRewardExpiredModal
    }
  }, [showAuth, showPlanGate, showShopOnboarding, showAddItemsModal, showFreeRewardExpiredModal])

  useEffect(() => {
    let removeListenerFunc = null

    const setupCapacitorBackButton = async () => {
      try {
        const listener = await CapApp.addListener('backButton', () => {
          const {
            showAuth: authOpen,
            showPlanGate: planGateOpen,
            showShopOnboarding: shopOnboardingOpen,
            showAddItemsModal: addItemsOpen,
            showFreeRewardExpiredModal: expiryOpen
          } = modalStatesRef.current

          // 1. Close top-level App modals if open
          if (authOpen) {
            setShowAuth(false)
            return
          }
          // The plan step cannot be backed out of
          if (planGateOpen) return
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
      setShowPlanGate(false)
      setShowShopOnboarding(false)
      setShowAddItemsModal(false)
      setView("dashboard")
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("slipzo-quota-update"))
      }
    }
  }

  const handleLogin = async (userData, isNewUser = false) => {
    // A new account goes straight to the plan step, before anything else is awaited, so the dashboard never shows first.
    // A returning account sees the loader while we check whether it still has the plan or setup to finish.
    if (isNewUser) {
      setShowPlanGate(true)
      setShowShopOnboarding(false)
      setShowAddItemsModal(false)
    } else {
      setResolvingSetup(true)
    }
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
      // Plan first, then the shop profile and the items
      call("/shop").then((shop) => { if (shop) setCachedShop(shop) }).catch(() => {})
    } else {
      setShowPlanGate(false)
      setShowShopOnboarding(false)
      setShowAddItemsModal(false)
      if (Number(userData?.onboarding_reward_claimed || 0) >= 1 && userKey) {
        localStorage.setItem(`slipzo_first_time_onboarding_${userKey}`, "true")
      }
      // Someone who signed up but never paid or finished setup picks up where they stopped (same check as a page reload)
      try {
        await withTimeout(checkShopSetupNeeded(userData), 8000)
      } finally {
        setResolvingSetup(false)
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

  if (checking || (user && resolvingSetup)) {
    return <BrandLoader />
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

    // On the public Pricing and Contact pages, anything that needs an account opens sign up instead
    const publicSetView = (target) => {
      if (target === "pricing" || target === "contact" || target === "dashboard") setView(target)
      else handleOpenAuth(true)
    }
    const publicSetShowAuth = (open) => (open ? handleOpenAuth(true) : setShowAuth(false))

    if (view === "pricing") {
      return (
        <ErrorBoundary onGoHome={() => setView("dashboard")}>
          <Suspense fallback={<PageLoader />}>
            <PublicPageShell
              activeView="pricing"
              setView={setView}
              onLogin={() => handleOpenAuth(false)}
              onSignUp={() => handleOpenAuth(true)}
            >
              <Pricing setView={publicSetView} setShowAuth={publicSetShowAuth} user={user} />
            </PublicPageShell>
          </Suspense>
          <PwaInstallPrompt />
        </ErrorBoundary>
      )
    }

    if (view === "contact") {
      return (
        <ErrorBoundary onGoHome={() => setView("dashboard")}>
          <Suspense fallback={<PageLoader />}>
            <PublicPageShell
              activeView="contact"
              setView={setView}
              onLogin={() => handleOpenAuth(false)}
              onSignUp={() => handleOpenAuth(true)}
            >
              <Contact setView={publicSetView} setShowAuth={publicSetShowAuth} user={user} />
            </PublicPageShell>
          </Suspense>
          <PwaInstallPrompt />
        </ErrorBoundary>
      )
    }

    return (
      <ErrorBoundary onGoHome={() => setView("dashboard")}>
        {desktopWeb ? (
          <DesktopLanding
            onLogin={() => handleOpenAuth(false)}
            onSignUp={() => handleOpenAuth(true)}
            onNavigate={setView}
          />
        ) : (
          <WelcomeOnboarding
            onLogin={() => handleOpenAuth(false)}
            onSignUp={() => handleOpenAuth(true)}
            onNavigate={setView}
          />
        )}
        <PwaInstallPrompt />
      </ErrorBoundary>
    )
  }

  // Protected routes - only accessible when logged in.
  // Pricing and Contact us stay inside the app (with the sidebar) for a signed-in user; only visitors get them as separate public pages.
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
       <Suspense fallback={<PageLoader />}>
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
       </Suspense>
      </ErrorBoundary>
    </Shell>
    <Suspense fallback={null}>
    {showPlanGate && <Suspense fallback={<div style={{ position: "fixed", inset: 0, zIndex: 1055, background: "#eaf6ff" }} />}><PlanGate
      user={user}
      shopName={cachedShop?.name && !String(cachedShop.name).endsWith("'s Shop") ? cachedShop.name : ""}
      onPurchased={handlePlanPurchased}
      onBack={handleLogout}
    /></Suspense>}
    {showShopOnboarding && <ShopOnboardingModal
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
    />}
    {showAddItemsModal && <AddYourItemsModal
      isOpen={showAddItemsModal}
      user={user}
      shop={cachedShop}
      onClose={() => setShowAddItemsModal(false)}
      onContinue={handleCompleteOnboarding}
    />}
    {showFreeRewardExpiredModal && <FreeRewardExpiredModal
      isOpen={showFreeRewardExpiredModal}
      onClose={handleCloseExpiryModal}
      onViewPlans={handleViewPlansFromExpiry}
    />}
    </Suspense>
    <PwaInstallPrompt />
  </>
  )
}
