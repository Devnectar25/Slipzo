// Shell.jsx - Complete file with mobile-only fix

import { useState } from "react"
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
  Printer
} from "lucide-react"
import { getRemainingFreePrints } from "../lib/utils"

const navItems = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard, protected: false },
  { id: "bills", label: "New bill", icon: Receipt, protected: true },
  { id: "templates", label: "Templates", icon: FileText, protected: true },
  { id: "products", label: "Products", icon: Package, protected: true },
  { id: "history", label: "Bill history", icon: Store, protected: true },
  { id: "pricing", label: "Pricing", icon: Tag, protected: false, badge: "Plans", badgeBg: "#e0f2fe", badgeColor: "#0284c7" },
  { id: "shop", label: "Shop profile", icon: Settings, protected: true },
  { id: "contact", label: "Contact us", icon: Mail, protected: false }
]

// Mobile bottom navigation items
const mobileNavItems = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard },
  { id: "bills", label: "New Bill", icon: PlusCircle },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "pricing", label: "Pricing", icon: Tag },
  { id: "history", label: "History", icon: History }
]

export function Shell({ user, view, setView, onLogout, children, requireAuth }) {
  const [isOpen, setIsOpen] = useState(false)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)

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
          height: '100vh',
          width: '280px',
          background: 'white',
          borderLeft: '1px solid #e2e8f0',
          padding: '1rem 1.25rem 0.5rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 90,
          transition: 'transform 0.3s ease',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          overflow: 'hidden',
        }}
      >
        <div
          className="side-brand"
          onClick={() => setView("dashboard")}
          style={{ cursor: 'pointer', paddingBottom: '0.5rem', marginBottom: '0.65rem', marginTop: 0 }}
          title="Return to Home Dashboard"
        >
          <img src="/logo.png" alt="Slipzo" className="side-logo" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
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
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem',
            marginBottom: '0.35rem',
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
                padding: '0.55rem 0.85rem',
                border: 'none',
                background: view === item.id ? '#f1f5f9' : 'transparent',
                borderRadius: '10px',
                fontSize: '0.88rem',
                fontWeight: view === item.id ? '600' : '500',
                color: view === item.id ? '#0f172a' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <item.icon size={19} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span style={{
                  background: item.badgeBg || '#e0f2fe',
                  color: item.badgeColor || '#0284c7',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px'
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* ✅ SIDE BOTTOM - Desktop: normal padding, Mobile: extra bottom padding */}
        <div
          className="side-bottom"
          style={{
            padding: '0.75rem 0 0 0',
            borderTop: '1px solid #f1f5f9',
            marginTop: 'auto',
            marginBottom: 0,
            flexShrink: 0,
          }}
        >
          {/* Free Prints Quota Widget in Sidebar */}
          <div 
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '0.65rem 0.75rem',
              marginBottom: '0.65rem',
              cursor: 'pointer'
            }}
            onClick={() => handleNavClick("pricing")}
            title="Click to view pricing plans"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Printer size={13} style={{ color: getRemainingFreePrints() > 2 ? '#0ea5e9' : '#ef4444' }} /> Free prints
              </span>
              <span style={{ color: getRemainingFreePrints() > 2 ? '#0ea5e9' : '#ef4444', fontWeight: 700 }}>
                {getRemainingFreePrints()} / 10 left
              </span>
            </div>
            <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ width: `${(getRemainingFreePrints() / 10) * 100}%`, height: '100%', background: getRemainingFreePrints() > 2 ? 'linear-gradient(90deg, #38bdf8, #0ea5e9)' : '#ef4444', transition: 'width 0.3s ease' }} />
            </div>
          </div>

          <div className="user-chip" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.5rem',
            borderRadius: '10px',
            marginBottom: '0.25rem',
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
              padding: '0.55rem 0.75rem',
              border: 'none',
              background: 'transparent',
              borderRadius: '10px',
              color: '#ef4444',
              fontSize: '0.85rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.15s',
              width: '100%',
              marginBottom: 0,
            }}
          >
            <LogOut size={16} /> Sign out
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

          <div className="shell-header-right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                background: getRemainingFreePrints() > 2 ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${getRemainingFreePrints() > 2 ? '#bbf7d0' : '#fecaca'}`,
                color: getRemainingFreePrints() > 2 ? '#166534' : '#991b1b',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Printer size={14} />
              <span>{getRemainingFreePrints()} free {getRemainingFreePrints() === 1 ? 'print' : 'prints'} left</span>
            </div>

            <button
              data-testid="shell-menu-button"
              className="shell-menu-btn"
              onClick={toggleSidebar}
              aria-label="Toggle navigation menu"
              title="Menu"
            >
              {isOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </header>

        <div className="main-content-scroll">
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
           STATIC HEADER STYLES
           ============================================ */
        .shell-static-header {
          position: sticky !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          height: 56px !important;
          background: #ffffff !important;
          border-bottom: 1px solid #e2e8f0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          padding: 0 1.25rem !important;
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
          color: #0f172a !important;
          letter-spacing: -0.02em !important;
        }

        .shell-header-right {
          display: flex !important;
          align-items: center !important;
          gap: 0.75rem !important;
        }

        .shell-menu-btn {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 38px !important;
          height: 38px !important;
          background: #f8fafc !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 10px !important;
          color: #0f172a !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
        }

        .shell-menu-btn:hover {
          background: #f1f5f9 !important;
          border-color: #cbd5e1 !important;
          color: #0ea5e9 !important;
        }

        .shell-menu-btn:active {
          transform: scale(0.96) !important;
        }

        /* ============================================
           DESKTOP STYLES
           ============================================ */
        @media (min-width: 769px) {
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
            border-right: 1px solid #e2e8f0 !important;
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
            padding: 0 0 80px 0 !important;
          }

          .main-content-scroll {
            padding: 1rem 1rem 0 1rem !important;
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
            transition: transform 0.3s ease !important;
          }

          .app-shell aside.open {
            transform: translateX(0) !important;
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