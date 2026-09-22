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
  List,
  Globe,
  Home,
  ChevronDown
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { SUPPORTED_LANGUAGES } from "../i18n/i18n"
import { getRemainingFreePrints, getActivePlanDetails, getCurrentUserKey, syncUserQuota, call, formatNumberByLang } from "../lib/utils"

export function Shell({ user, view, setView, onLogout, children, requireAuth }) {
  const { t, i18n } = useTranslation()
  const currentLang = i18n.language || "en"
  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0]
  const [langOpen, setLangOpen] = useState(false)

  const navItems = [
    { id: "dashboard", label: t("nav.home", "Home"), icon: LayoutDashboard, protected: false },
    { id: "bills", label: t("nav.newBill", "New bill"), icon: Receipt, protected: true },
    { id: "menu", label: t("nav.menu", "Menu"), icon: List, protected: true },
    { id: "templates", label: t("nav.templates", "Templates"), icon: FileText, protected: true },
    { id: "products", label: t("nav.products", "Products"), icon: Package, protected: true },
    { id: "history", label: t("nav.history", "Bill history"), icon: Store, protected: true },
    { id: "pricing", label: t("nav.pricing", "Pricing"), icon: Tag, protected: false, badge: t("nav.plans", "Plans"), badgeBg: "#FFF0E5", badgeColor: "#F66016" },
    { id: "shop", label: t("nav.shopProfile", "Shop profile"), icon: Settings, protected: true },
    { id: "contact", label: t("nav.contact", "Contact us"), icon: Mail, protected: false }
  ]

  // Mobile bottom navigation items matching Figma reference
  const mobileNavItems = [
    { id: "dashboard", label: t("nav.home", "Home"), icon: Home },
    { id: "bills", label: t("nav.newBill", "New Bill"), icon: PlusCircle },
    { id: "templates", label: t("nav.templates", "Templates"), icon: FileText },
    { id: "history", label: t("nav.history", "Bill History"), icon: History },
    { id: "menu", label: t("nav.menu", "Menu"), icon: Menu }
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

  const isMobileNavActive = (id) => view === id

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

      {/* ✅ SIDEBAR - Compact, zero internal scrolling, all categories visible */}
      <aside
        className={isOpen ? "open" : ""}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          height: '100vh',
          width: '280px',
          background: '#FDFAF6',
          borderLeft: '1px solid #F7CDAB',
          padding: '0.85rem 1.15rem 0.65rem 1.15rem',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 999,
          transition: 'transform 0.3s ease',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          overflow: 'hidden',
        }}
      >
        <div
          className="side-brand"
          onClick={() => setView("dashboard")}
          style={{ cursor: 'pointer', paddingBottom: '0.35rem', marginBottom: '0.45rem', marginTop: 0 }}
          title="Return to Home Dashboard"
        >
          <img src="/logo.png" alt="Slipzo" className="side-logo" style={{ height: '30px', width: 'auto', objectFit: 'contain' }} />
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

        <nav
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem',
            marginBottom: '0.25rem',
            paddingRight: '0px',
          }}
        >
          {navItems.map((item) => (
            <button
              data-testid={`nav-${item.id}-button`}
              className={view === item.id ? "active" : ""}
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.7rem',
                padding: '0.4rem 0.75rem',
                border: 'none',
                outline: 'none',
                background: view === item.id ? '#FFF0E5' : 'transparent',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: view === item.id ? '700' : '500',
                color: view === item.id ? '#F66016' : '#5A6B82',
                cursor: 'pointer',
                transition: 'all 0.15s',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <item.icon size={17} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span style={{
                  background: item.badgeBg || '#FFF0E5',
                  color: item.badgeColor || '#F66016',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.45rem',
                  borderRadius: '9999px'
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* ✅ SIDE BOTTOM - Spaced cleanly below navigation categories */}
        <div
          className="side-bottom"
          style={{
            padding: '0.6rem 0 0 0',
            borderTop: '1px solid #F7CDAB',
            marginTop: '0.5rem',
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
              background: '#FDF4EB',
              border: '1px solid #F7CDAB',
              borderRadius: '10px',
              padding: '0.45rem 0.65rem',
              marginBottom: '0.55rem',
              cursor: 'pointer'
            }}
            onClick={() => handleNavClick("pricing")}
            title="Click to view pricing plans"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', fontWeight: 600, color: '#0C1F41', marginBottom: '0.3rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Printer size={13} style={{ color: (activePlan.printsRemaining || 0) > 2 ? '#F66016' : '#EF4444' }} /> {activePlan.isFreeTier ? t("sidebar.freePrints", "Free prints") : t("sidebar.subscription", "Subscription")}
              </span>
              <span style={{ color: (activePlan.printsRemaining || 0) > 2 ? '#0ea5e9' : '#ef4444', fontWeight: 700 }}>
                {formatNumberByLang((activePlan.printsRemaining || 0).toLocaleString(), currentLang)} / {formatNumberByLang((activePlan.totalPrints || 10).toLocaleString(), currentLang)} {t("sidebar.printsLeft", "left")}
              </span>
            </div>
            <div style={{ width: '100%', height: '5px', background: '#FADCC3', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, Math.max(0, ((activePlan.printsRemaining || 0) / (activePlan.totalPrints || 10)) * 100))}%`, height: '100%', background: (activePlan.printsRemaining || 0) > 2 ? 'linear-gradient(90deg, #FB821B, #F66016)' : '#EF4444', transition: 'width 0.3s ease' }} />
            </div>
          </div>

          <div className="user-chip" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.35rem 0.5rem',
            borderRadius: '10px',
            marginBottom: '0.35rem',
          }}>
            <div className="avatar" style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#F66016',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600',
              fontSize: '0.85rem',
              flexShrink: 0,
            }}>
              {(user?.name || "S")[0].toUpperCase()}
            </div>
            <span style={{ flex: 1, minWidth: 0 }}>
              <b style={{ display: 'block', fontSize: '0.82rem', color: '#0C1F41', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name || "User"}
              </b>
              <small style={{ fontSize: '0.68rem', color: '#8A94A6', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email || ""}
              </small>
            </span>
          </div>

          {/* User Language Status Pill - links to Shop Profile */}
          <div
            data-testid="sidebar-language-status"
            onClick={() => handleNavClick("shop")}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.35rem 0.6rem',
              background: '#FDFAF6',
              border: '1px solid #F7CDAB',
              borderRadius: '9px',
              marginBottom: '0.45rem',
              cursor: 'pointer',
              fontSize: '0.74rem',
              transition: 'all 0.15s ease'
            }}
            title="Profile language settings"
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600, color: '#0C1F41' }}>
              <Globe size={13} style={{ color: '#F66016' }} />
              <span>{currentLangObj.flag} {currentLangObj.nativeName}</span>
            </span>
            <span style={{ fontSize: '0.66rem', color: '#F66016', fontWeight: 700 }}>
              {t("common.edit", "Change")}
            </span>
          </div>

          {/* ✅ LOGOUT BUTTON - Same for both desktop and mobile */}
          <button
            data-testid="logout-button"
            className="logout"
            onClick={(e) => {
              e.preventDefault()
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
              borderRadius: '10px',
              color: '#ef4444',
              fontSize: '0.82rem',
              fontWeight: '500',
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
      <div className={`main ${!desktopSidebarOpen ? 'desktop-expanded' : ''}`} style={{ flex: 1, minHeight: '100vh', boxSizing: 'border-box' }}>
        {/* Static Header with Slipzo Logo and Menu Icon */}
        <header className="shell-static-header">
          <div
            className="shell-header-brand"
            onClick={() => setView("dashboard")}
            title="Slipzo Dashboard"
          >
            <img src="/logo.png" alt="Slipzo" className="shell-header-logo" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
          </div>

          <div className="shell-header-right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto' }}>
            <div 
              className="header-prints-badge"
              onClick={() => setView("pricing")}
              title="Click to view pricing plans"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '9999px',
                background: (activePlan.printsRemaining || 0) > 2 ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${(activePlan.printsRemaining || 0) > 2 ? '#bbf7d0' : '#fecaca'}`,
                color: (activePlan.printsRemaining || 0) > 2 ? '#166534' : '#991b1b',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Printer size={14} />
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
          position: sticky !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          min-height: calc(56px + env(safe-area-inset-top, 0px)) !important;
          height: auto !important;
          background: #FDFAF6 !important;
          border-bottom: 1px solid #F7CDAB !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          padding-top: max(calc(env(safe-area-inset-top, 0px) + 6px), 12px) !important;
          padding-bottom: 10px !important;
          padding-left: 1.25rem !important;
          padding-right: 1.25rem !important;
          z-index: 70 !important;
          box-sizing: border-box !important;
          width: 100% !important;
        }

        .shell-header-brand {
          display: flex !important;
          align-items: center !important;
          gap: 0.65rem !important;
          cursor: pointer !important;
          user-select: none !important;
        }

        .shell-header-logo {
          height: 30px !important;
          width: auto !important;
          object-fit: contain !important;
        }

        .shell-header-name {
          font-size: 1.25rem !important;
          font-weight: 800 !important;
          color: #0C1F41 !important;
          letter-spacing: -0.02em !important;
        }

        .shell-header-right {
          display: flex !important;
          align-items: center !important;
          gap: 0.75rem !important;
          margin-left: auto !important;
        }

        .shell-menu-btn {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 38px !important;
          height: 38px !important;
          background: #F6F6F7 !important;
          border: 1px solid #F7CDAB !important;
          border-radius: 10px !important;
          color: #0C1F41 !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
        }

        .shell-menu-btn:hover {
          background: #FFF0E5 !important;
          border-color: #F7CDAB !important;
          color: #F66016 !important;
        }

        .shell-menu-btn:active {
          transform: scale(0.96) !important;
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

          .app-shell .main {
            margin-left: 280px !important;
            padding: 0 !important;
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
            border-right: 1px solid #F7CDAB !important;
            background: #FDFAF6 !important;
            transition: transform 0.3s ease !important;
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
            padding: 1.25rem 2rem 2rem !important;
          }
          
          .side-bottom {
            padding: 1rem 0 !important;
          }
        }
        
        /* ============================================
           MOBILE STYLES
           ============================================ */
        @media (max-width: 768px) {
          .app-shell .main {
            margin-left: 0 !important;
            padding: 0 !important;
          }

          .shell-static-header {
            padding-top: max(calc(env(safe-area-inset-top, 0px) + 28px), 32px) !important;
            padding-bottom: 12px !important;
            padding-left: 1rem !important;
            padding-right: 1rem !important;
            min-height: calc(56px + max(env(safe-area-inset-top, 0px), 28px)) !important;
            height: auto !important;
          }

          .main-content-scroll {
            padding: 0.75rem 0.65rem calc(72px + env(safe-area-inset-bottom, 0px)) 0.65rem !important;
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
            border-left: 1px solid #F7CDAB !important;
            border-right: none !important;
            background: #FDFAF6 !important;
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
            flex: 1 !important;
            min-height: 0 !important;
            overflow-y: auto !important;
            gap: 0.2rem !important;
            margin-bottom: 0.25rem !important;
            padding-right: 0px !important;
          }

          .app-shell aside nav button {
            padding: 0.38rem 0.65rem !important;
            font-size: 0.83rem !important;
            gap: 0.65rem !important;
            border-radius: 8px !important;
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
            margin-top: 0.45rem !important;
            border-top: 1px solid #F7CDAB !important;
          }

          /* Mobile Bottom Navigation - Matching Figma Reference */
          .mobile-bottom-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(253, 250, 246, 0.96);
            border-top: 1px solid #F7CDAB;
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
            color: #F66016;
          }

          .mobile-nav-btn.active .mobile-nav-icon-wrap {
            background: #FFF0E5;
          }

          .mobile-nav-btn.active svg {
            color: #F66016 !important;
            stroke-width: 2.3;
          }

          .mobile-nav-btn.active span {
            color: #F66016 !important;
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
          
          .main-content-scroll {
            padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px)) !important;
          }
        }
      `}</style>
    </div>
  )
}