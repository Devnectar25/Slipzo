import { useState, useEffect, useRef } from "react"
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
import "../styles/ConfirmDialog.css"
import { useDbTranslation } from "../lib/translator"
import { SUPPORTED_LANGUAGES } from "../i18n/i18n"
import { getRemainingFreePrints, getActivePlanDetails, getCurrentUserKey, syncUserQuota, call, formatNumberByLang, isHotelRestaurant, isMenuCategory, getCachedData } from "../lib/utils"

// Sign-out confirmation in the app's own look instead of the stock dialog (styles: ConfirmDialog.css)
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]))
const signOutIcon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`

const confirmSignOut = (t, user) => {
  const who = user?.name || (user?.phone ? `+91 ${user.phone}` : user?.email) || ""
  const chip = who
    ? `<div class="slipzen-confirm-user"><span class="slipzen-confirm-user-avatar">${escapeHtml(String(who).trim().charAt(0))}</span><span class="slipzen-confirm-user-name">${escapeHtml(who)}</span></div>`
    : ""
  return Swal.fire({
    iconHtml: signOutIcon(34),
    title: t("nav.signOutConfirmTitle", "Sign out of Slipzen?"),
    html: `<div>${escapeHtml(t("nav.signOutConfirmText", "You will need to log in again to continue."))}</div>${chip}`,
    showCancelButton: true,
    confirmButtonText: `${signOutIcon(18)}<span>${escapeHtml(t("nav.signOut", "Sign out"))}</span>`,
    cancelButtonText: t("common.cancel", "Cancel"),
    reverseButtons: true,
    focusCancel: true,
    buttonsStyling: false,
    customClass: {
      container: "slipzen-confirm-container",
      popup: "slipzen-confirm-popup",
      icon: "slipzen-confirm-icon",
      title: "slipzen-confirm-title",
      htmlContainer: "slipzen-confirm-text",
      actions: "slipzen-confirm-actions",
      confirmButton: "slipzen-confirm-btn slipzen-confirm-ok",
      cancelButton: "slipzen-confirm-btn slipzen-confirm-cancel"
    }
  })
}

export function Shell({ user, shop: parentShop, view, setView, onLogout, children, requireAuth }) {
  const { t, i18n } = useTranslation()
  const { tDb } = useDbTranslation()
  const currentLang = i18n.language || "en"
  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0]
  const [langOpen, setLangOpen] = useState(false)

  const [shop, setShop] = useState(() => (parentShop && Object.keys(parentShop).length > 0 ? parentShop : getCachedData("/shop")) || {})
  const isHotel = isHotelRestaurant(shop)
  const isMenu = isMenuCategory(shop)

  useEffect(() => {
    if (parentShop && Object.keys(parentShop).length > 0) {
      setShop(parentShop)
    } else {
      setShop(getCachedData("/shop") || {})
    }
  }, [parentShop, user?.id, user?.staff_of?.shop_name])

  useEffect(() => {
    const handleShopUpdate = (e) => {
      if (e?.detail) setShop(e.detail)
    }
    window.addEventListener("slipzo_shop_updated", handleShopUpdate)
    return () => window.removeEventListener("slipzo_shop_updated", handleShopUpdate)
  }, [])

  // Ensure shop business_type is hydrated right after login/reload even before opening Shop
  useEffect(() => {
    if (!user || shop?.business_type) return
    let alive = true
    call("/shop")
      .then((s) => {
        if (!alive || !s || typeof s !== "object") return
        setShop(s)
        window.dispatchEvent(new CustomEvent("slipzo_shop_updated", { detail: s }))
      })
      .catch(() => {})
    return () => { alive = false }
  }, [user, shop?.business_type])

  const navItems = [
    { id: "dashboard", label: t("nav.home", "Home"), icon: LayoutDashboard, protected: false },
    {
      id: isHotel ? "tables" : "bills",
      label: isHotel ? t("nav.tables", "Tables") : t("nav.newBill", "New bill"),
      icon: isHotel ? Utensils : Receipt,
      protected: true
    },
    { id: "menu", label: isMenu ? t("nav.menu", "Menu") : t("nav.items", "Item"), icon: List, protected: true },
    { id: "templates", label: t("nav.templates", "Templates"), icon: FileText, protected: true },
    { id: "products", label: t("nav.products", "Supplies"), icon: Package, protected: true },
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
    { id: "menu", label: isMenu ? t("nav.menu", "Menu") : t("nav.items", "Item"), icon: List },
    { id: "templates", label: t("nav.templates", "Templates"), icon: LayoutTemplate },
    { id: "history", label: t("nav.history", "History"), icon: History }
  ]
  // desktop header: the main pages (Templates lives in the profile menu here; the phone bar keeps it)
  const headerNavItems = [
    ...mobileNavItems.filter((item) => item.id !== "templates"),
    { id: "products", label: t("nav.products", "Supplies"), extra: true },
    { id: "pricing", label: t("nav.pricing", "Pricing"), extra: true },
    { id: "contact", label: t("nav.contact", "Contact us"), extra: true },
  ].filter((item) => !(user?.staff_of && item.id === "pricing"))

  // profile menu: "narrow" items are the header's extra links, shown here only when the header has no room for them
  const profileMenuItems = [
    { id: "shop", label: t("nav.shopProfile", "Shop profile"), icon: Settings },
    { id: "templates", label: t("nav.templates", "Templates"), icon: LayoutTemplate },
    { id: "products", label: t("nav.products", "Supplies"), icon: Package, narrow: true },
    { id: "pricing", label: t("nav.pricing", "Pricing"), icon: Tag, badge: t("nav.plans", "Plans"), narrow: true },
    { id: "guide", label: t("nav.guide", "User Guide"), icon: BookOpen, badge: t("sidebar.help", tDb("Help")) },
    { id: "contact", label: t("nav.contact", "Contact us"), icon: Mail, narrow: true },
  ].filter((item) => !(user?.staff_of && item.id === "pricing"))
  const [isOpen, setIsOpen] = useState(false)
  // Desktop has no sidebar any more: the main pages sit in the header, the rest in the profile menu.
  // (The phone keeps its drawer, opened with the menu button, and the bottom bar.)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)

  useEffect(() => {
    if (!profileOpen) return undefined
    const onPointer = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false) }
    const onKey = (e) => { if (e.key === "Escape") setProfileOpen(false) }
    const onScroll = (e) => {
      if (profileRef.current && e.target instanceof Node && profileRef.current.contains(e.target)) return
      setProfileOpen(false)
    }
    const onResize = () => setProfileOpen(false)
    document.addEventListener("pointerdown", onPointer)
    document.addEventListener("keydown", onKey)
    window.addEventListener("scroll", onScroll, { passive: true, capture: true })
    window.addEventListener("resize", onResize, { passive: true })
    return () => {
      document.removeEventListener("pointerdown", onPointer)
      document.removeEventListener("keydown", onKey)
      window.removeEventListener("scroll", onScroll, true)
      window.removeEventListener("resize", onResize)
    }
  }, [profileOpen])

  useEffect(() => {
    setProfileOpen(false)
  }, [view])
  const userKey = getCurrentUserKey(user)
  const [activePlan, setActivePlan] = useState(() => getActivePlanDetails(userKey))

  useEffect(() => {
    let isMounted = true
    const currentKey = getCurrentUserKey(user)

    const fetchFreshQuota = async (force = false) => {
      if (!user) return
      try {
        const subRes = await call("/subscriptions/my", { noCache: true })
        if (subRes && subRes.quota && isMounted) {
          const synced = syncUserQuota(subRes.quota, currentKey)
          if (synced) setActivePlan(synced)
        }
      } catch (err) {
        console.warn("Could not fetch user quota in Shell:", err)
      }
    }

    fetchFreshQuota()

    const handleUpdate = (e) => {
      const direct = e?.detail?.quota || e?.detail?.plan
      if (direct && typeof direct === 'object') {
        setActivePlan(direct)
      } else {
        setActivePlan(getActivePlanDetails(getCurrentUserKey(user)))
      }
      fetchFreshQuota(true)
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
          title={t("shell.ariaHomeDash", "Return to Home Dashboard")}
        >
          <img src="/logo.png" alt="Slipzen" className="side-logo" style={{ height: '38px', width: 'auto', objectFit: 'contain', objectPosition: 'left center', marginLeft: '8px' }} />
          <button
            className="side-close-btn"
            onClick={closeSidebar}
            aria-label={t("shell.ariaCloseMenu", "Close menu")}
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
                )
              })}
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
                title={t("shell.ariaPlans", "Click to view pricing plans")}
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
                    {formatNumberByLang((activePlan.printsRemaining || 0).toLocaleString(), currentLang)} / {formatNumberByLang((activePlan.totalPrints || 0).toLocaleString(), currentLang)} {t("sidebar.printsLeft", "left")}
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(2, 132, 199, 0.15)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, Math.max(0, activePlan.totalPrints > 0 ? ((activePlan.printsRemaining || 0) / activePlan.totalPrints) * 100 : 0))}%`,
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
                  {user?.staff_of ? `${t("profile.staffOf", "Staff at")} ${user.staff_of.shop_name}` : (user?.email || (user?.phone ? `+91 ${user.phone}` : ""))}
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
              title={t("shell.ariaLang", "Profile language settings")}
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
              const answer = await confirmSignOut(t, user)
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
            title={t("shell.ariaDashboard", "Slipzen Dashboard")}
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          >
            <img src="/logo.png" alt="Slipzen" className="shell-header-logo" style={{ height: '36px', width: 'auto', objectFit: 'contain', objectPosition: 'left center' }} />
          </div>

          <nav className="shell-desktop-nav" aria-label={t("shell.mainNav", "Main pages")}>
            {headerNavItems.map((item) => {
              const active = isMobileNavActive(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`header-nav-${item.id}`}
                  className={`shell-desktop-nav-btn ${active ? "active" : ""} ${item.extra ? "extra" : ""}`}
                  onClick={() => handleNavClick(item.id)}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>

          <div className="shell-header-right" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginLeft: 'auto' }}>
            {/* print balance lives in the profile menu (no badge in the header) */}
            <div className="shell-profile-wrap" ref={profileRef}>
              <button
                type="button"
                data-testid="header-profile-button"
                className={`shell-profile-btn ${profileOpen ? "open" : ""}`}
                onClick={() => setProfileOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                title={t("shell.profileMenu", "Profile and settings")}
              >
                <span className="shell-profile-avatar">{(user?.name || "S").trim().charAt(0).toUpperCase()}</span>
                <span className="shell-profile-name">{user?.name || t("shell.account", "Account")}</span>
                <ChevronDown size={15} className="shell-profile-chevron" />
              </button>

              {profileOpen && (
                <div className="shell-profile-menu" role="menu">
                  <div className="shell-profile-head">
                    <span className="shell-profile-avatar lg">{(user?.name || "S").trim().charAt(0).toUpperCase()}</span>
                    <div className="shell-profile-who">
                      <b>{user?.name || "User"}</b>
                      <small>{user?.staff_of ? `${t("profile.staffOf", "Staff at")} ${user.staff_of.shop_name}` : (user?.email || (user?.phone ? `+91 ${user.phone}` : ""))}</small>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="shell-profile-quota"
                    onClick={() => { setProfileOpen(false); handleNavClick("pricing") }}
                    title={t("shell.ariaPlans", "Click to view pricing plans")}
                  >
                    <span className="shell-profile-quota-row">
                      <span><Printer size={13} /> {activePlan.isFreeTier ? t("sidebar.freePrints", "Free prints") : t("sidebar.subscription", "Subscription")}</span>
                      <b className={(activePlan.printsRemaining || 0) > 2 ? "" : "low"}>
                        {formatNumberByLang((activePlan.printsRemaining || 0).toLocaleString(), currentLang)} / {formatNumberByLang((activePlan.totalPrints || 0).toLocaleString(), currentLang)} {t("sidebar.printsLeft", "left")}
                      </b>
                    </span>
                    <span className="shell-profile-quota-bar">
                      <i style={{ width: `${Math.min(100, Math.max(0, activePlan.totalPrints > 0 ? ((activePlan.printsRemaining || 0) / activePlan.totalPrints) * 100 : 0))}%` }} className={(activePlan.printsRemaining || 0) > 2 ? "" : "low"} />
                    </span>
                  </button>

                  <div className="shell-profile-items">
                    {profileMenuItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        role="menuitem"
                        data-testid={`profile-nav-${item.id}`}
                        className={`shell-profile-item ${view === item.id ? "active" : ""} ${item.narrow ? "narrow-only" : ""}`}
                        onClick={() => { setProfileOpen(false); handleNavClick(item.id) }}
                      >
                        <item.icon size={16} />
                        <span>{item.label}</span>
                        {item.badge && <em>{item.badge}</em>}
                      </button>
                    ))}
                    <button
                      type="button"
                      role="menuitem"
                      className="shell-profile-item"
                      onClick={() => {
                        setProfileOpen(false)
                        sessionStorage.setItem("slipzo_scroll_to", "app-settings-section")
                        handleNavClick("shop")
                        window.dispatchEvent(new CustomEvent("slipzo-scroll-to-app-settings"))
                      }}
                    >
                      <Globe size={16} />
                      <span>{t("shell.language", "Language")}</span>
                      <em className="plain">{currentLangObj.nativeName}</em>
                    </button>
                  </div>

                  <button
                    type="button"
                    role="menuitem"
                    data-testid="header-logout-button"
                    className="shell-profile-logout"
                    onClick={async () => {
                      setProfileOpen(false)
                      const answer = await confirmSignOut(t, user)
                      if (!answer.isConfirmed) return
                      if (onLogout) onLogout()
                    }}
                  >
                    <LogOut size={16} /> {t("nav.signOut", "Sign out")}
                  </button>
                </div>
              )}
            </div>

            <button
              data-testid="shell-menu-button"
              className="shell-menu-btn"
              onClick={toggleSidebar}
              aria-label={t("shell.ariaToggleNav", "Toggle navigation menu")}
              title={t("shell.menu", "Menu")}
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
          height: calc(64px + var(--app-safe-top)) !important;
          min-height: 64px !important;
          background: #ffffff !important;
          border-bottom: 1px solid #e2e8f0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          padding-top: calc(10px + var(--app-safe-top)) !important;
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

        /* ---- desktop header navigation (hidden on phones) ---- */
        .shell-desktop-nav { display: none; }
        .shell-profile-wrap { display: none; position: relative; }

        @media (min-width: 769px) {
          /* no sidebar, no menu button on desktop: everything is in the header */
          .app-shell aside,
          .app-shell .sidebar-backdrop,
          .shell-menu-btn { display: none !important; }
          .app-shell .shell-header-brand { display: flex !important; margin-right: 0 !important; justify-self: start; }
          /* logo | links (centred on the page) | prints + profile */
          .app-shell .shell-static-header {
            display: grid !important;
            grid-template-columns: 1fr auto 1fr;
            align-items: center !important;
            /* logo and profile line up with the page content (max 1280px wide, centred) */
            /* 20px further in than the page content edge, so the logo and profile sit clear of the border */
            padding-left: max(40px, calc((100% - 1280px) / 2 + clamp(24px, 4vw, 56px) + 20px)) !important;
            padding-right: max(40px, calc((100% - 1280px) / 2 + clamp(24px, 4vw, 56px) + 20px)) !important;
            column-gap: 1.25rem !important;
          }
          .app-shell .shell-header-right { justify-self: end; margin-left: 0 !important; }

          .shell-desktop-nav {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.35rem;
          }
          .shell-desktop-nav-btn {
            position: relative;
            display: inline-flex;
            align-items: center;
            height: 36px;
            padding: 0 0.75rem;
            border: none;
            border-radius: 9px;
            background: transparent;
            color: #475569;
            font-size: 0.88rem;
            font-weight: 600;
            white-space: nowrap;
            cursor: pointer;
            transition: background 0.15s ease, color 0.15s ease;
          }
          .shell-desktop-nav-btn::after {
            content: "";
            position: absolute;
            left: 50%;
            bottom: 2px;
            width: 0;
            height: 2.5px;
            border-radius: 2px;
            background: #0284c7;
            transform: translateX(-50%);
            transition: width 0.2s ease;
          }
          .shell-desktop-nav-btn:hover { color: #0f172a; background: #f1f5f9; }
          /* no black browser outline after a click; a soft ring only for keyboard users */
          .shell-desktop-nav-btn:focus { outline: none !important; }
          .shell-desktop-nav-btn:focus-visible { outline: none !important; box-shadow: 0 0 0 2px #7dd3fc !important; }
          .shell-desktop-nav-btn.active {
            background: transparent;
            color: #0284c7;
            font-weight: 700;
          }
          .shell-desktop-nav-btn.active::after { width: 22px; }

          /* the header's extra links are already visible, so the profile menu does not repeat them */
          .shell-profile-item.narrow-only { display: none; }

          .shell-profile-wrap { display: block; }
          .shell-profile-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            height: 42px;
            padding: 0 0.6rem 0 0.35rem;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            background: #ffffff;
            color: #0f172a;
            font-size: 0.86rem;
            font-weight: 700;
            cursor: pointer;
            transition: border-color 0.15s ease, background 0.15s ease;
          }
          .shell-profile-btn:hover,
          .shell-profile-btn.open { border-color: #bae6fd; background: #f0f9ff; }
          .shell-profile-avatar {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 9px;
            background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
            color: #ffffff;
            font-size: 0.85rem;
            font-weight: 800;
            flex-shrink: 0;
          }
          .shell-profile-avatar.lg { width: 40px; height: 40px; border-radius: 11px; font-size: 1rem; }
          .shell-profile-name { max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .shell-profile-chevron { color: #64748b; transition: transform 0.15s ease; }
          .shell-profile-btn.open .shell-profile-chevron { transform: rotate(180deg); }

          .shell-profile-menu {
            position: absolute;
            top: calc(100% + 8px);
            right: 0;
            width: 300px;
            max-height: calc(100vh - 80px);
            overflow-y: auto;
            overscroll-behavior: contain;
            padding: 8px;
            border-radius: 16px;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            box-shadow: 0 24px 48px -16px rgba(12, 31, 65, 0.28);
            z-index: 900;
            animation: shellMenuIn 0.14s ease-out;
          }
          @keyframes shellMenuIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
          .shell-profile-head {
            display: flex;
            align-items: center;
            gap: 0.7rem;
            padding: 8px 8px 12px;
            border-bottom: 1px solid #f1f5f9;
          }
          .shell-profile-who { min-width: 0; display: flex; flex-direction: column; }
          .shell-profile-who b { font-size: 0.92rem; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .shell-profile-who small { font-size: 0.75rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

          .shell-profile-quota {
            display: flex;
            flex-direction: column;
            gap: 6px;
            width: 100%;
            margin: 8px 0 4px;
            padding: 10px 12px;
            border-radius: 12px;
            border: 1px solid #bae6fd;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            cursor: pointer;
            text-align: left;
          }
          .shell-profile-quota-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 0.78rem; font-weight: 700; color: #0f172a; }
          .shell-profile-quota-row > span { display: inline-flex; align-items: center; gap: 6px; }
          .shell-profile-quota-row svg { color: #0284c7; }
          .shell-profile-quota-row b { font-size: 0.72rem; color: #0284c7; white-space: nowrap; }
          .shell-profile-quota-row b.low { color: #ef4444; }
          .shell-profile-quota-bar { display: block; height: 6px; border-radius: 999px; background: rgba(2, 132, 199, 0.15); overflow: hidden; }
          .shell-profile-quota-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #38bdf8, #0284c7); }
          .shell-profile-quota-bar i.low { background: #ef4444; }

          .shell-profile-items { display: flex; flex-direction: column; padding: 4px 0; }
          .shell-profile-item {
            display: flex;
            align-items: center;
            gap: 0.65rem;
            width: 100%;
            padding: 0.55rem 0.65rem;
            border: none;
            border-radius: 10px;
            background: transparent;
            color: #334155;
            font-size: 0.88rem;
            font-weight: 600;
            text-align: left;
            cursor: pointer;
          }
          .shell-profile-item svg { color: #64748b; flex-shrink: 0; }
          .shell-profile-item span { flex: 1; }
          .shell-profile-item:hover { background: #f1f5f9; color: #0f172a; }
          .shell-profile-item.active { background: #f0f9ff; color: #0284c7; }
          .shell-profile-item.active svg { color: #0284c7; }
          .shell-profile-item em {
            font-style: normal;
            font-size: 0.66rem;
            font-weight: 700;
            padding: 0.1rem 0.5rem;
            border-radius: 999px;
            background: #e0f2fe;
            border: 1px solid #bae6fd;
            color: #0284c7;
          }
          .shell-profile-item em.plain { background: transparent; border: none; color: #64748b; font-size: 0.78rem; font-weight: 600; }

          .shell-profile-logout {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            width: 100%;
            margin-top: 4px;
            padding: 0.6rem 0.65rem;
            border: none;
            border-top: 1px solid #f1f5f9;
            border-radius: 0 0 10px 10px;
            background: transparent;
            color: #ef4444;
            font-size: 0.88rem;
            font-weight: 700;
            cursor: pointer;
          }
          .shell-profile-logout:hover { background: #fef2f2; }
        }

        /* narrower desktop windows: Products, Pricing and Contact move into the profile menu */
        @media (min-width: 769px) and (max-width: 1180px) {
          .shell-desktop-nav-btn.extra { display: none; }
          .shell-profile-item.narrow-only { display: flex; }
          .shell-profile-name { max-width: 90px; }
        }
        @media (min-width: 769px) and (max-width: 940px) {
          .shell-desktop-nav-btn { padding: 0 0.6rem; font-size: 0.82rem; }
          .shell-profile-name { display: none; }
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
            padding-top: calc(64px + var(--app-safe-top)) !important;
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

          /* page content: centred with a maximum width and roomy side margins, instead of edge to edge */
          .main-content-scroll {
            width: 100% !important;
            max-width: 1280px !important;
            margin: 0 auto !important;
            padding: 1.25rem clamp(24px, 4vw, 56px) 1.5rem !important;
            box-sizing: border-box !important;
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
            padding-top: calc(64px + var(--app-safe-top)) !important;
            overflow-x: clip !important;
          }

          .shell-static-header {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            height: calc(64px + var(--app-safe-top)) !important;
            min-height: 64px !important;
            padding-top: calc(10px + var(--app-safe-top)) !important;
            padding-bottom: 6px !important;
            padding-left: 1rem !important;
            padding-right: 1rem !important;
            background: #ffffff !important;
            z-index: 850 !important;
          }

          .main-content-scroll {
            padding: 0.25rem 0.65rem calc(78px + var(--app-safe-bottom)) 0.65rem !important;
            margin-bottom: 0 !important;
          }
          
          .sidebar-backdrop {
            display: block !important;
            z-index: 998 !important;
          }
          
          .side-close-btn {
            display: flex !important;
          }

          /* The Android bar at the bottom of the screen must not sit on top of the Sign out button */
          .side-logout-btn {
            min-height: 46px !important;
            padding: 0.6rem 0.8rem !important;
            font-size: 0.92rem !important;
            border-radius: 10px !important;
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
            padding: max(calc(var(--app-safe-top) + 28px), 32px) 1rem calc(max(0.65rem, var(--app-safe-bottom)) + 0.5rem) 1rem !important;
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
            padding: 0.4rem 0.25rem calc(0.5rem + var(--app-safe-bottom)) !important;
            z-index: 100;
            box-shadow: 0 -4px 16px rgba(12, 31, 65, 0.05);
            min-height: calc(64px + var(--app-safe-bottom)) !important;
            height: auto !important;
            box-sizing: border-box !important;
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
            min-width: 0;
            flex: 1 1 0;
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
            line-height: 1.2;
            white-space: nowrap;
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
          @media (max-width: 768px) {
            .mobile-bottom-nav {
              min-height: calc(64px + var(--app-safe-bottom)) !important;
              height: auto !important;
              padding-bottom: calc(0.5rem + var(--app-safe-bottom)) !important;
            }

            .side-bottom {
              padding-bottom: 0 !important;
            }

            /* Room for the 64px bottom nav plus bottom inset, which only exists on mobile */
            .main-content-scroll {
              padding-bottom: calc(78px + var(--app-safe-bottom)) !important;
            }
          }
        }
      `}</style>
    </div>
  )
}