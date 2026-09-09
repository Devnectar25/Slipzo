// Shell.jsx - Complete file with mobile-only fix

import { useState } from "react"
import {
  LayoutDashboard,
  Receipt,
  FileText,
  Store,
  Settings,
  Users,
  LogOut,
  Menu,
  X,
  PlusCircle,
  History,
  LayoutTemplate,
  User
} from "lucide-react"

const navItems = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard, protected: false },
  { id: "bills", label: "New bill", icon: Receipt, protected: true },
  { id: "templates", label: "Templates", icon: FileText, protected: true },
  { id: "customers", label: "Customers", icon: Users, protected: true },
  { id: "history", label: "Bill history", icon: Store, protected: true },
  { id: "shop", label: "Shop profile", icon: Settings, protected: true }
]

// Mobile bottom navigation items
const mobileNavItems = [
  { id: "bills", label: "New Bill", icon: PlusCircle },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "history", label: "History", icon: History },
  { id: "dashboard", label: "Home", icon: LayoutDashboard }
]

export function Shell({ user, view, setView, onLogout, children, requireAuth }) {
  const [isOpen, setIsOpen] = useState(false)

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
    setIsOpen(!isOpen)
  }

  const closeSidebar = () => {
    setIsOpen(false)
  }

  const isMobileNavActive = (id) => view === id

  return (
    <div className="app-shell">
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={closeSidebar}
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 80,
          }}
        />
      )}

      {/* ✅ SIDEBAR - Desktop unchanged, Mobile gets padding fix */}
      <aside
        className={isOpen ? "open" : ""}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '280px',
          background: 'white',
          borderLeft: '1px solid #e2e8f0',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 90,
          transition: 'transform 0.3s ease',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          overflowY: 'auto',
        }}
      >
        <div className="side-brand">
          <img src="/logo.png" alt="Slipzo" className="side-logo" />
          <b>slipzo</b>
          <button
            className="side-close-btn"
            onClick={closeSidebar}
            aria-label="Close menu"
            style={{
              display: 'none',
              background: 'transparent',
              border: 'none',
              color: '#0f172a',
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
            overflowY: 'auto',
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
                gap: '0.75rem',
                padding: '0.65rem 1rem',
                border: 'none',
                background: view === item.id ? '#f1f5f9' : 'transparent',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: view === item.id ? '600' : '500',
                color: view === item.id ? '#0f172a' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* ✅ SIDE BOTTOM - Desktop: normal padding, Mobile: extra bottom padding */}
        <div
          className="side-bottom"
          style={{
            padding: '1rem 0',
            borderTop: '1px solid #f1f5f9',
            marginTop: 'auto',
            flexShrink: 0,
          }}
        >
          <div className="user-chip" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.5rem',
            borderRadius: '10px',
            marginBottom: '0.5rem',
          }}>
            <div className="avatar" style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#0ea5e9',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600',
              fontSize: '0.9rem',
              flexShrink: 0,
            }}>
              {(user?.name || "S")[0].toUpperCase()}
            </div>
            <span style={{ flex: 1, minWidth: 0 }}>
              <b style={{ display: 'block', fontSize: '0.85rem', color: '#0f172a' }}>
                {user?.name || "User"}
              </b>
              <small style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>
                {user?.email || ""}
              </small>
            </span>
          </div>

          {/* ✅ LOGOUT BUTTON - Same for both desktop and mobile */}
          <button
            data-testid="logout-button"
            className="logout"
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1rem',
              border: 'none',
              background: 'transparent',
              borderRadius: '10px',
              color: '#ef4444',
              fontSize: '0.85rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.15s',
              width: '100%',
            }}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main" style={{ flex: 1, marginLeft: 0, padding: '1.5rem 2rem 2rem', minHeight: '100vh' }}>
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: '2rem',
        }}>
          <div className="header-left" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <span className="live-dot" style={{
              fontSize: '0.8rem',
              color: '#22c55e',
              fontWeight: '500',
            }}>● Live</span>
          </div>

          <div className="header-right" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <button
              data-testid="mobile-menu-button"
              className="mobile-menu"
              onClick={toggleSidebar}
              aria-label="Toggle menu"
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                padding: '0.5rem',
                cursor: 'pointer',
                color: '#0f172a',
                borderRadius: '8px',
                transition: 'background 0.2s',
              }}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <div className="header-actions" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}>
              <div className="avatar" style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#0f172a',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '600',
                fontSize: '0.9rem',
              }}>
                {(user?.name || "S")[0].toUpperCase()}
              </div>
            </div>
          </div>
        </header>
        <div className="main-content-scroll" style={{ paddingBottom: '80px' }}>
          {children}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="mobile-bottom-nav">
        {mobileNavItems.map((item) => (
          <button
            key={item.id}
            className={`mobile-nav-btn ${isMobileNavActive(item.id) ? 'active' : ''}`}
            onClick={() => handleMobileNavClick(item.id)}
            aria-label={item.label}
          >
            <item.icon size={22} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <style>{`
        /* ============================================
           DESKTOP STYLES - UNCHANGED
           ============================================ */
        @media (min-width: 769px) {
          .app-shell .main {
            margin-left: 280px !important;
          }
          
          .sidebar-backdrop {
            display: none !important;
          }
          
          .app-shell aside {
            transform: translateX(0) !important;
            right: auto !important;
            left: 0 !important;
            border-left: none !important;
            border-right: 1px solid #e2e8f0 !important;
          }
          
          .side-close-btn {
            display: none !important;
          }

          .mobile-bottom-nav {
            display: none !important;
          }

          .header-left .live-dot {
            display: none !important;
          }

          .header-actions {
            display: flex !important;
          }

          .mobile-menu {
            display: none !important;
          }
          
          /* ✅ Desktop: Normal sidebar bottom padding (NO change) */
          .side-bottom {
            padding: 1rem 0 !important;
          }
        }
        
        /* ============================================
           MOBILE STYLES - ONLY HERE THE FIX APPLIES
           ============================================ */
        @media (max-width: 768px) {
          .app-shell .main header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 0.5rem 0 !important;
          }
          
          .app-shell .main header .mobile-menu {
            display: flex !important;
          }
          
          .app-shell .main {
            padding: 0.5rem 1rem 80px !important;
          }
          
          .app-shell .main header {
            margin-bottom: 1rem !important;
            padding-bottom: 0.75rem !important;
          }
          
          .sidebar-backdrop {
            display: block !important;
          }
          
          .side-close-btn {
            display: flex !important;
          }

          .app-shell aside {
            left: auto !important;
            right: 0 !important;
            border-left: 1px solid #e2e8f0 !important;
            border-right: none !important;
            transform: translateX(100%) !important;
          }

          .app-shell aside.open {
            transform: translateX(0) !important;
          }

          .header-actions {
            display: none !important;
          }

          .header-left {
            display: flex !important;
          }

          .header-left .live-dot {
            display: flex !important;
            font-size: 0.7rem !important;
          }

          .header-right {
            display: flex !important;
            align-items: center !important;
          }

          .header-right .mobile-menu {
            display: flex !important;
            padding: 0.4rem !important;
          }

          .header-right .mobile-menu svg {
            width: 24px !important;
            height: 24px !important;
          }

          .header-right .eyebrow,
          .header-right h1,
          .header-right > div:not(.mobile-menu):not(.header-actions) {
            display: none !important;
          }

          /* ============================================
             ✅ MOBILE ONLY: Extra bottom padding for sidebar
             ============================================ */
          .side-bottom {
            padding-bottom: calc(1rem + 80px) !important;
          }

          /* Mobile Bottom Navigation */
          .mobile-bottom-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #ffffff;
            border-top: 1px solid #e2e8f0;
            display: flex !important;
            justify-content: space-around;
            align-items: center;
            padding: 0.5rem 0.5rem env(safe-area-inset-bottom);
            z-index: 100;
            box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.08);
            height: 68px;
            backdrop-filter: blur(12px);
            background: rgba(255, 255, 255, 0.95);
          }

          .mobile-nav-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
            background: transparent;
            border: none;
            padding: 0.25rem 0.75rem;
            color: #94a3b8;
            font-size: 0.6rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            min-width: 60px;
            border-radius: 8px;
            position: relative;
            text-decoration: none;
          }

          .mobile-nav-btn svg {
            transition: all 0.2s ease;
            width: 22px;
            height: 22px;
            stroke-width: 1.8;
          }

          .mobile-nav-btn span {
            font-size: 0.6rem;
            letter-spacing: 0.2px;
            font-weight: 500;
          }

          .mobile-nav-btn.active {
            color: #0f172a;
          }

          .mobile-nav-btn.active svg {
            color: #0f172a;
            stroke-width: 2.2;
          }

          .mobile-nav-btn.active::after {
            content: '';
            position: absolute;
            top: -1px;
            left: 50%;
            transform: translateX(-50%);
            width: 24px;
            height: 3px;
            background: #0f172a;
            border-radius: 0 0 4px 4px;
          }

          .mobile-nav-btn:hover:not(.active) {
            color: #475569;
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
              padding-bottom: calc(1rem + 80px + env(safe-area-inset-bottom)) !important;
            }
          }
          
          .main-content-scroll {
            padding-bottom: calc(80px + env(safe-area-inset-bottom)) !important;
          }
        }
      `}</style>
    </div>
  )
}