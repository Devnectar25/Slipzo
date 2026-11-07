import { useState, useEffect } from "react"
import {
  LayoutDashboard,
  Receipt,
  FileText,
  Store,
  Settings,
  LogOut,
  Menu,
  X,
  PlusCircle,
  History,
  LayoutTemplate,
  User,
  Package,
  Mail,
  Tag,
  Printer,
  Utensils,
  ClipboardList,
  List,
  Globe,
  Home,
  ChevronDown,
  BookOpen
} from "lucide-react"
import { useTranslation } from "react-i18next"
import Swal from "sweetalert2"
import { useDbTranslation } from "../lib/translator"
import { SUPPORTED_LANGUAGES } from "../i18n/i18n"
import { getRemainingFreePrints, getActivePlanDetails, getCurrentUserKey, syncUserQuota, call, formatNumberByLang, isHotelRestaurant, getCachedData } from "../lib/utils"

export function Shell({ user, view, setView, onLogout, children, requireAuth }) {
  const { t, i18n } = useTranslation()
  const { tDb } = useDbTranslation()
  const currentLang = i18n.language || "en"
  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0]
  const [langOpen, setLangOpen] = useState(false)

  const [shop, setShop] = useState(() => getCachedData("/shop") || {})
  const isHotel = isHotelRestaurant(shop)

  useEffect(() => {
    const handleShopUpdate = (e) => {
      if (e?.detail) setShop(e.detail)
    }
    window.addEventListener("slipzo_shop_updated", handleShopUpdate)
    return () => window.removeEventListener("slipzo_shop_updated", handleShopUpdate)
  }, [])

  const navItems = [
    { id: "dashboard", label: t("nav.home", "Home"), icon: LayoutDashboard, protected: false },
    { 
      id: isHotel ? "tables" : "bills", 
      label: isHotel ? t("nav.tables", "Tables") : t("nav.newBill", "New bill"), 
      icon: isHotel ? Utensils : Receipt, 
      protected: true 
    },
    { id: "menu", label: t("nav.menu", "Menu"), icon: List, protected: true },
    { id: "templates", label: t("nav.templates", "Templates"), icon: FileText, protected: true },
    { id: "products", label: t("nav.products", "Products"), icon: Package, protected: true },
    { id: "history", label: t("nav.history", "History"), icon: History, protected: true },
    { id: "pricing", label: t("nav.pricing", "Pricing"), icon: Tag, protected: false, badge: t("nav.plans", "Plans"), badgeBg: "#e0f2fe", badgeColor: "#0284c7" },
    { id: "shop", label: t("nav.shopProfile", "Shop profile"), icon: Settings, protected: true },
    { id: "guide", label: t("nav.guide", "User Guide"), icon: BookOpen, protected: false, badge: t("sidebar.help", tDb("Help")), badgeBg: "#e0f2fe", badgeColor: "#0284c7" },
    { id: "contact", label: t("nav.contact", "Contact us"), icon: Mail, protected: false }
  ]

  // Mobile bottom navigation items matching Figma reference
  const mobileNavItems = [
    { id: "dashboard", label: t("nav.home", "Home"), icon: Home },
    { 
      id: isHotel ? "tables" : "bills", 
      label: isHotel ? t("nav.tables", "Tables") : t("nav.newBill", "New Bill"), 
      icon: isHotel ? Utensils : PlusCircle 
    },
    { id: "menu", label: t("nav.menu", "Menu"), icon: List },
    { id: "templates", label: t("nav.templates", "Templates"), icon: LayoutTemplate },
    { id: "history", label: t("nav.history", "History"), icon: History }
  ]
  const [isOpen, setIsOpen] = useState(false)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)
  const userKey = getCurrentUserKey(user)
  const [activePlan, setActivePlan] = useState(() => getActivePlanDetails(userKey))

  useEffect(() => {
    let isMounted = true
    const currentKey = getCurrentUserKey(user)

    const fetchFreshQuota = async () => {
      if (!user) return
      try {
        const subRes = await call("/subscriptions/my")
        if (subRes && subRes.quota && isMounted) {
          const synced = syncUserQuota(subRes.quota, currentKey)
          if (synced) setActivePlan(synced)
        }
      } catch (err) {
        console.warn("Could not fetch user quota in Shell:", err)
      }
    }

    fetchFreshQuota()

    const handleUpdate = () => {
      setActivePlan(getActivePlanDetails(getCurrentUserKey(user)))
    }
    window.addEventListener("slipzo-quota-update", handleUpdate)
    window.addEventListener("storage", handleUpdate)
    return () => {
      isMounted = false
      window.removeEventListener("slipzo-quota-update", handleUpdate)
      window.removeEventListener("storage", handleUpdate)
    }
  }, [user])

  // Lock background page scroll when mobile menu is open
  useEffect(() => {
    if (typeof window === "undefined") return

    if (isOpen) {
      const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0
      const scrollX = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || 0

      const originalBodyOverflow = document.body.style.overflow
      const originalBodyPosition = document.body.style.position
      const originalBodyTop = document.body.style.top
      const originalBodyLeft = document.body.style.left
      const originalBodyWidth = document.body.style.width
      const originalDocOverflow = document.documentElement.style.overflow

      document.body.style.overflow = "hidden"
      document.body.style.position = "fixed"
      document.body.style.top = `-${scrollY}px`
      document.body.style.left = `-${scrollX}px`
      document.body.style.width = "100%"
      document.documentElement.style.overflow = "hidden"

      return () => {
        document.body.style.overflow = originalBodyOverflow
        document.body.style.position = originalBodyPosition
        document.body.style.top = originalBodyTop
        document.body.style.left = originalBodyLeft
        document.body.style.width = originalBodyWidth
        document.documentElement.style.overflow = originalDocOverflow
        window.scrollTo(scrollX, scrollY)
      }
    }
  }, [isOpen])

  const handleNavClick = (itemId) => {
    console.log('🔗 Nav click:', itemId)
    const item = navItems.find((n) => n.id === itemId)
    if (item?.protected) {
      requireAuth?.(itemId)
    } else {
      setView(itemId)
    }
    setIsOpen(false)
  }

  const handleMobileNavClick = (itemId) => {
    console.log('📱 Mobile Nav click:', itemId)
    const item = navItems.find((n) => n.id === itemId)
    if (item?.protected) {
      requireAuth?.(itemId)
    } else {
      setView(itemId)
    }
  }

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setIsOpen((prev) => !prev)
    } else {
      setDesktopSidebarOpen((prev) => !prev)
    }
  }

  const closeSidebar = () => {
    setIsOpen(false)
  }

  const isMobileNavActive = (id) => view === id || (id === "tables" && view === "bills" && isHotel) || (id === "bills" && view === "tables" && isHotel)

  return (
    <div className={`app-shell ${!desktopSidebarOpen ? 'desktop-collapsed' : ''}`}>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={closeSidebar}
          onTouchMove={(e) => e.preventDefault()}
          onWheel={(e) => e.preventDefault()}
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 998,
          }}
        />
      )}

      {/* ✅ SIDEBAR - Left side navigation bar with Slipzen logo at top left */}
      <aside
        className={isOpen ? "open" : ""}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          height: '100vh',
          width: '280px',
          background: '#ffffff',
          borderRight: '1px solid #e2e8f0',
          padding: '0.85rem 1.15rem 0.65rem 1.15rem',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 999,
          transition: 'transform 0.3s ease',
          overflow: 'hidden',
          overscrollBehavior: 'contain',
          overscrollBehaviorY: 'contain',
        }}
      >
        <div
          className="side-brand"
          onClick={() => setView("dashboard")}
          style={{ cursor: 'pointer', paddingBottom: '0.65rem', marginBottom: '0.65rem', marginTop: 0, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center' }}
          title="Return to Home Dashboard"
        >
          <img src="/logo.png" alt="Slipzen" className="side-logo" style={{ height: '38px', width: 'auto', objectFit: 'contain', objectPosition: 'left center', marginLeft: '8px' }} />
          <button
            className="side-close-btn"
            onClick={closeSidebar}
            aria-label="Close menu"
            style={{
              display: 'none',
              background: 'transparent',
              border: 'none',
              color: '#0C1F41',
              cursor: 'pointer',
              padding: '4px',
              marginLeft: 'auto',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Logo and Sign out stay fixed; everything between them scrolls */}
        <div className="side-scroll">
        <div className="side-first-view">
        <nav
          style={{
            flex: '0 0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.125rem',
            marginBottom: '0.5rem',
            paddingRight: '0px',
          }}
        >
          {navItems.filter((item) => !(user?.staff_of && item.id === "pricing")).map((item) => {
            const isActive = isMobileNavActive(item.id)
            return (
            <button
              data-testid={`nav-${item.id}-button`}
              className={`side-nav-btn ${isActive ? "active" : ""}`}
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.38rem 0.8rem',
                border: isActive ? '1px solid #bae6fd' : '1px solid transparent',
                background: isActive ? 'linear-gradient(135deg, #dbeafe 0%, #e0f2fe 50%, #eff6ff 100%)' : 'transparent',
                borderRadius: '10px',
                fontSize: '0.86rem',
                fontWeight: isActive ? '700' : '500',
                color: isActive ? '#0284c7' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                textAlign: 'left',
                width: '100%',
                boxShadow: isActive ? '0 2px 8px rgba(14, 165, 233, 0.08)' : 'none',
              }}
            >
              <item.icon size={18} style={{ color: isActive ? '#0284c7' : '#64748b', flexShrink: 0, transition: 'color 0.15s ease' }} />
              <span style={{ flex: 1, letterSpacing: '-0.01em' }}>{item.label}</span>
              {item.badge && (
                <span style={{
                  background: isActive ? '#ffffff' : (item.badgeBg || '#e0f2fe'),
                  color: item.badgeColor || '#0284c7',
                  border: '1px solid #bae6fd',
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  padding: '0.12rem 0.5rem',
                  borderRadius: '9999px',
                  boxShadow: '0 1px 2px rgba(14, 165, 233, 0.06)',
                  letterSpacing: '0.2px'
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          )})}
        </nav>

        {/* ✅ SIDE BOTTOM - Spaced cleanly below navigation categories */}
        <div
          className="side-bottom"
          style={{
            padding: '0.65rem 0 0 0',
            borderTop: '1px solid #e2e8f0',
            marginTop: 'auto',
            marginBottom: 0,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Active Prints Quota Widget in Sidebar */}
          <div 
            className="sidebar-quota-widget"
            style={{
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              border: '1px solid #bae6fd',
              borderRadius: '12px',
              padding: '0.6rem 0.75rem',
              marginBottom: '0.55rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(14, 165, 233, 0.06)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={() => handleNavClick("pricing")}
            title="Click to view pricing plans"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '7px',
                  background: '#ffffff',
                  border: '1px solid #bae6fd',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: (activePlan.printsRemaining || 0) > 2 ? '#0284c7' : '#ef4444',
                  boxShadow: '0 1px 3px rgba(14, 165, 233, 0.08)',
                  flexShrink: 0
                }}>
                  <Printer size={13} />
                </div>
                <span>{activePlan.isFreeTier ? t("sidebar.freePrints", "Free prints") : t("sidebar.subscription", "Subscription")}</span>
              </span>
              <span style={{
                color: (activePlan.printsRemaining || 0) > 2 ? '#0284c7' : '#ef4444',
                fontWeight: 700,
                fontSize: '0.7rem',
                background: '#ffffff',
                border: '1px solid #bae6fd',
                padding: '2px 8px',
                borderRadius: '6px',
                fontVariantNumeric: 'tabular-nums'
              }}>
                {formatNumberByLang((activePlan.printsRemaining || 0).toLocaleString(), currentLang)} / {formatNumberByLang((activePlan.totalPrints || 10).toLocaleString(), currentLang)} {t("sidebar.printsLeft", "left")}
              </span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(2, 132, 199, 0.15)', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, Math.max(0, ((activePlan.printsRemaining || 0) / (activePlan.totalPrints || 10)) * 100))}%`,
                height: '100%',
                background: (activePlan.printsRemaining || 0) > 2 ? 'linear-gradient(90deg, #38bdf8, #0284c7)' : '#EF4444',
                borderRadius: '9999px',
                boxShadow: (activePlan.printsRemaining || 0) > 2 ? '0 1px 4px rgba(2, 132, 199, 0.25)' : 'none',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

        </div>
        </div>

        <div className="side-bottom side-more" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', marginBottom: '0.5rem' }}>
          <div className="user-chip side-user-chip" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.45rem 0.65rem',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            marginBottom: '0.45rem',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
            transition: 'all 0.15s ease'
          }}>
            <div className="avatar" style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '0.88rem',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.22)',
              flexShrink: 0,
            }}>
              {(user?.name || "S")[0].toUpperCase()}
            </div>
            <span style={{ flex: 1, minWidth: 0 }}>
              <b style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name || "User"}
              </b>
              <small style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>
                {user?.staff_of ? `${t("profile.staffOf", "Staff at")} ${user.staff_of.shop_name}` : (user?.email || "")}
              </small>
            </span>
          </div>

          {/* User Language Status Pill - links to Shop Profile App Settings */}
          <div
            data-testid="sidebar-language-status"
            className="sidebar-language-status"
            onClick={() => {
              sessionStorage.setItem("slipzo_scroll_to", "app-settings-section")
              handleNavClick("shop")
              window.dispatchEvent(new CustomEvent("slipzo-scroll-to-app-settings"))
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.4rem 0.65rem',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              marginBottom: '0.45rem',
              cursor: 'pointer',
              fontSize: '0.76rem',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
              transition: 'all 0.15s ease'
            }}
            title="Profile language settings"
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600, color: '#0f172a' }}>
              <Globe size={13} style={{ color: '#0284c7' }} />
              <span>{currentLangObj.flag} {currentLangObj.nativeName}</span>
            </span>
            <span style={{ fontSize: '0.68rem', color: '#0284c7', fontWeight: 700, background: '#f0f9ff', border: '1px solid #bae6fd', padding: '2px 7px', borderRadius: '5px' }}>
              {t("common.edit", "Edit")}
            </span>
          </div>

        </div>
        </div>

        <div className="side-logout-wrap">
          {/* ✅ LOGOUT BUTTON - Same for both desktop and mobile */}
          <button
            data-testid="logout-button"
            className="logout side-logout-btn"
            onClick={async (e) => {
              e.preventDefault()
              const answer = await Swal.fire({
                title: t("nav.signOutConfirmTitle", "Sign out of Slipzen?"),
                text: t("nav.signOutConfirmText", "You will need to log in again to continue."),
                icon: "question",
                showCancelButton: true,
                confirmButtonText: t("nav.signOut", "Sign out"),
                cancelButtonText: t("common.cancel", "Cancel"),
                confirmButtonColor: "#ef4444",
                reverseButtons: true,
                focusCancel: true
              })
              if (!answer.isConfirmed) return
              setIsOpen(false)
              if (onLogout) onLogout()
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.45rem 0.65rem',
              border: 'none',
              background: 'transparent',
              borderRadius: '8px',
              color: '#ef4444',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s',
              width: '100%',
              marginBottom: 0,
            }}
          >
            <LogOut size={15} /> {t("nav.signOut", "Sign out")}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`main ${!desktopSidebarOpen ? 'desktop-expanded' : ''}`} style={{ flex: 1, minWidth: 0, maxWidth: '100%', minHeight: '100vh', boxSizing: 'border-box' }}>
        {/* Static Header with Logo on Left and Menu / Prints Badge on Right */}
        <header className="shell-static-header">
          <div
            className="shell-header-brand"
            onClick={() => setView("dashboard")}
            title="Slipzen Dashboard"
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          >
            <img src="/logo.png" alt="Slipzen" className="shell-header-logo" style={{ height: '36px', width: 'auto', objectFit: 'contain', objectPosition: 'left center' }} />
          </div>

          <div className="shell-header-right" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginLeft: 'auto' }}>
            <div 
              className="header-prints-badge"
              onClick={() => setView("pricing")}
              title="Click to view pricing plans"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.65rem',
                borderRadius: '9999px',
                background: (activePlan.printsRemaining || 0) > 2 ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${(activePlan.printsRemaining || 0) > 2 ? '#bbf7d0' : '#fecaca'}`,
                color: (activePlan.printsRemaining || 0) > 2 ? '#166534' : '#991b1b',
                fontSize: '0.74rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <Printer size={13} />
              <span>{formatNumberByLang((activePlan.printsRemaining || 0).toLocaleString(), currentLang)} {activePlan.isFreeTier ? t("header.free", "free") + ' ' : ''}{(activePlan.printsRemaining || 0) === 1 ? t("header.print", "print") : t("header.printsLeft", "prints left")}</span>
            </div>

            <button
              data-testid="shell-menu-button"
              className="shell-menu-btn"
              onClick={toggleSidebar}
              aria-label="Toggle navigation menu"
              title="Menu"
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </header>

        <div className="main-content-scroll">
          {children}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="mobile-bottom-nav">
        {mobileNavItems.map((item) => {
          const active = isMobileNavActive(item.id)
          return (
            <button
              key={item.id}
              className={`mobile-nav-btn ${active ? 'active' : ''}`}
              onClick={() => handleMobileNavClick(item.id)}
              aria-label={item.label}
            >
              <div className="mobile-nav-icon-wrap">
                <item.icon size={20} />
              </div>
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>

      <style>{`
        /* ============================================
           STATIC HEADER STYLES
           ============================================ */
        .shell-static-header {
          position: fixed !important;
          top: 0 !important;
          right: 0 !important;
          height: calc(64px + env(safe-area-inset-top, 0px)) !important;
          min-height: 64px !important;
          background: #ffffff !important;
          border-bottom: 1px solid #e2e8f0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          padding-top: calc(10px + env(safe-area-inset-top, 0px)) !important;
          padding-bottom: 6px !important;
          padding-left: 1.25rem !important;
          padding-right: 1.25rem !important;
          z-index: 850 !important;
          box-sizing: border-box !important;
          transition: left 0.3s ease, width 0.3s ease !important;
        }

        .shell-header-brand {
          display: flex !important;
          align-items: center !important;
          gap: 0.65rem !important;
          cursor: pointer !important;
          user-select: none !important;
          margin-left: 0 !important;
          margin-right: auto !important;
        }

        .shell-header-logo {
          height: 36px !important;
          width: auto !important;
          object-fit: contain !important;
          object-position: left center !important;
        }

        .shell-header-right {
          display: flex !important;
          align-items: center !important;
          gap: 0.65rem !important;
          margin-left: auto !important;
        }

        .shell-menu-btn {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 38px !important;
          height: 38px !important;
          background: #F6F6F7 !important;
          border: 1px solid #bae6fd !important;
          border-radius: 10px !important;
          color: #0C1F41 !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
        }

        .shell-menu-btn:hover {
          background: #e0f2fe !important;
          border-color: #bae6fd !important;
          color: #0284c7 !important;
        }

        .shell-menu-btn:active {
          transform: scale(0.96) !important;
        }

        /* The small negative margin keeps the active tab's shadow from being clipped at the edges */
        .side-scroll {
          flex: 1 1 auto;
          min-height: 0;
          margin: 0 -6px;
          padding: 2px 6px;
          display: flex;
          flex-direction: column;
          overflow-x: hidden;
          overflow-y: auto;
          overscroll-behavior: contain;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .side-scroll::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }

        .side-first-view {
          flex: 1 0 auto;
          display: flex;
          flex-direction: column;
        }

        /* When everything cannot fit, the first view ends exactly at the subscription box
           instead of cutting the user card in half; the rest is reached by scrolling */
        @media (min-width: 769px) and (max-height: 710px), (max-width: 768px) and (max-height: 840px) {
          .side-first-view {
            flex: 0 0 auto;
            min-height: calc(100% + 2px);
          }
        }

        .app-shell aside .side-bottom.side-more {
          margin-top: 0 !important;
          padding: 0 !important;
          border-top: none !important;
        }

        .side-logout-wrap {
          flex-shrink: 0;
          padding-top: 0.4rem;
          border-top: 1px solid #e2e8f0;
        }

        .app-shell aside nav button,
        .app-shell aside nav button:focus,
        .app-shell aside nav button:focus-visible,
        .app-shell aside nav button:active {
          outline: none !important;
          box-shadow: none !important;
        }

        /* ============================================
           DESKTOP STYLES
           ============================================ */
        @media (min-width: 769px) {
          .app-shell:not(.desktop-collapsed) .shell-header-brand {
            display: none !important;
          }

          .app-shell.desktop-collapsed .shell-header-brand {
            display: flex !important;
          }

          .app-shell:not(.desktop-collapsed) .shell-static-header {
            left: 280px !important;
            width: calc(100% - 280px) !important;
          }

          .app-shell.desktop-collapsed .shell-static-header {
            left: 0 !important;
            width: 100% !important;
          }

          .app-shell .main {
            margin-left: 280px !important;
            padding: 0 !important;
            padding-top: calc(64px + env(safe-area-inset-top, 0px)) !important;
            transition: margin-left 0.3s ease !important;
          }

          .app-shell.desktop-collapsed .main {
            margin-left: 0 !important;
          }
          
          .sidebar-backdrop {
            display: none !important;
          }
          
          .app-shell aside {
            transform: translateX(0) !important;
            right: auto !important;
            left: 0 !important;
            border-left: none !important;
            border-right: 1px solid #bae6fd !important;
            background: #f8fafc !important;
            transition: transform 0.3s ease !important;
            overscroll-behavior: contain !important;
            overscroll-behavior-y: contain !important;
          }

          .app-shell.desktop-collapsed aside {
            transform: translateX(-100%) !important;
          }
          
          .side-close-btn {
            display: none !important;
          }

          .mobile-bottom-nav {
            display: none !important;
          }

          .main-content-scroll {
            padding: 0.5rem 2rem 1rem !important;
          }
          
          .side-bottom {
            padding: 0.75rem 0 0 !important;
          }

          .side-nav-btn:hover:not(.active) {
            background: #f1f5f9 !important;
            color: #0f172a !important;
            border-color: #e2e8f0 !important;
          }

          .side-nav-btn:hover:not(.active) svg {
            color: #0284c7 !important;
          }

          .app-shell aside nav button.active,
          .side-nav-btn.active {
            background: linear-gradient(135deg, #dbeafe 0%, #e0f2fe 50%, #eff6ff 100%) !important;
            border-color: #bae6fd !important;
            color: #0284c7 !important;
            font-weight: 700 !important;
            box-shadow: 0 2px 8px rgba(14, 165, 233, 0.08) !important;
          }

          .app-shell aside nav button.active svg,
          .side-nav-btn.active svg {
            color: #0284c7 !important;
          }

          .sidebar-quota-widget:hover {
            transform: translateY(-1px);
            border-color: #7dd3fc !important;
            box-shadow: 0 4px 14px rgba(14, 165, 233, 0.12) !important;
          }

          .side-user-chip:hover {
            border-color: #cbd5e1 !important;
            background: #f8fafc !important;
          }

          .sidebar-language-status:hover {
            border-color: #bae6fd !important;
            background: #f0f9ff !important;
          }

          .side-logout-btn:hover {
            background: #fef2f2 !important;
            color: #dc2626 !important;
          }
        }
        
        /* ============================================
           MOBILE STYLES
           ============================================ */
        @media (max-width: 768px) {
          .app-shell .main {
            margin-left: 0 !important;
            padding: 0 !important;
            padding-top: calc(64px + env(safe-area-inset-top, 0px)) !important;
            overflow-x: clip !important;
          }

          .shell-static-header {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            height: calc(64px + env(safe-area-inset-top, 0px)) !important;
            min-height: 64px !important;
            padding-top: calc(10px + env(safe-area-inset-top, 0px)) !important;
            padding-bottom: 6px !important;
            padding-left: 1rem !important;
            padding-right: 1rem !important;
            background: #ffffff !important;
            z-index: 850 !important;
          }

          .main-content-scroll {
            padding: 0.25rem 0.65rem calc(72px + env(safe-area-inset-bottom, 0px)) 0.65rem !important;
            margin-bottom: 0 !important;
          }
          
          .sidebar-backdrop {
            display: block !important;
            z-index: 998 !important;
          }
          
          .side-close-btn {
            display: flex !important;
          }

          .app-shell aside {
            left: auto !important;
            right: 0 !important;
            border-left: 1px solid #bae6fd !important;
            border-right: none !important;
            background: #f8fafc !important;
            transform: translateX(100%) !important;
            transition: transform 0.3s ease !important;
            z-index: 999 !important;
            height: 100vh !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
            overflow: hidden !important;
            padding: max(calc(env(safe-area-inset-top, 0px) + 28px), 32px) 1rem max(0.65rem, env(safe-area-inset-bottom, 0.65rem)) 1rem !important;
            box-shadow: -4px 0 24px rgba(12, 31, 65, 0.12) !important;
            width: 280px !important;
            max-width: 85vw !important;
          }

          .app-shell aside.open {
            transform: translateX(0) !important;
          }

          .app-shell aside,
          .app-shell aside nav {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }

          .app-shell aside::-webkit-scrollbar,
          .app-shell aside nav::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }

          .app-shell aside nav {
            gap: 0.2rem !important;
            margin-bottom: 0.25rem !important;
            padding-right: 0px !important;
          }

          .app-shell aside nav button {
            padding: 0.44rem 0.7rem !important;
            font-size: 0.84rem !important;
            gap: 0.7rem !important;
            border-radius: 10px !important;
          }

          .app-shell aside nav button.active {
            background: linear-gradient(135deg, #dbeafe 0%, #e0f2fe 50%, #eff6ff 100%) !important;
            border: 1px solid #bae6fd !important;
            color: #0284c7 !important;
            font-weight: 700 !important;
          }

          .app-shell aside nav button svg {
            width: 17px !important;
            height: 17px !important;
            flex-shrink: 0 !important;
          }

          /* Remove prints badge from mobile header */
          .header-prints-badge {
            display: none !important;
          }

          /* Clean, compact side-bottom without extra 80px scroll overflow */
          .side-bottom {
            padding-bottom: 0 !important;
            padding-top: 0.55rem !important;
            margin-top: auto !important;
            border-top: 1px solid #bae6fd !important;
          }

          /* Mobile Bottom Navigation - Matching Figma Reference */
          .mobile-bottom-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(248, 250, 252, 0.96);
            border-top: 1px solid #bae6fd;
            display: flex !important;
            justify-content: space-around;
            align-items: center;
            padding: 0.35rem 0.25rem env(safe-area-inset-bottom);
            z-index: 100;
            box-shadow: 0 -4px 16px rgba(12, 31, 65, 0.05);
            height: 64px;
            backdrop-filter: blur(12px);
          }

          .mobile-nav-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
            background: transparent;
            border: none;
            padding: 0.2rem 0.35rem;
            color: #575B6B;
            font-size: 0.65rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            min-width: 56px;
            border-radius: 16px;
            text-decoration: none;
          }

          .mobile-nav-btn .mobile-nav-icon-wrap {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 28px;
            border-radius: 14px;
            transition: all 0.2s ease;
          }

          .mobile-nav-btn svg {
            width: 20px;
            height: 20px;
            stroke-width: 2;
            color: #0C1F41;
          }

          .mobile-nav-btn span {
            font-size: 0.65rem;
            font-weight: 600;
            color: #575B6B;
            letter-spacing: 0.1px;
          }

          .mobile-nav-btn.active {
            color: #0284c7;
          }

          .mobile-nav-btn.active .mobile-nav-icon-wrap {
            background: #e0f2fe;
          }

          .mobile-nav-btn.active svg {
            color: #0284c7 !important;
            stroke-width: 2.3;
          }

          .mobile-nav-btn.active span {
            color: #0284c7 !important;
            font-weight: 700;
          }

          .mobile-nav-btn:hover:not(.active) {
            color: #0C1F41;
          }

          .mobile-nav-btn:active {
            transform: scale(0.92);
          }

          .mobile-sticky-action-bar {
            display: none !important;
          }

          .bill-page {
            padding-bottom: 0 !important;
          }

          .page {
            padding-bottom: 0 !important;
          }

          .dashboard-bottom-actions {
            display: none !important;
          }
        }

        /* ============================================
           SAFE AREA SUPPORT (Notched Phones)
           ============================================ */
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .mobile-bottom-nav {
            padding-bottom: calc(0.5rem + env(safe-area-inset-bottom)) !important;
          }
          
          @media (max-width: 768px) {
            .side-bottom {
              padding-bottom: 0 !important;
            }
          }
          
          /* Room for the 64px bottom nav, which only exists on mobile */
          @media (max-width: 768px) {
            .main-content-scroll {
              padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px)) !important;
            }
          }
        }
      `}</style>
    </div>
  )
}