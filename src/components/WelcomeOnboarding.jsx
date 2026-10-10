import { useState, useEffect, useRef, useCallback } from "react"
import { 
  Printer, Zap, Check, ArrowRight, ShieldCheck, 
  Smartphone, Monitor, WifiOff, Cloud, RefreshCw,
  QrCode, AlertTriangle, TrendingUp, UtensilsCrossed,
  ScanBarcode, Layers, BarChart3, Receipt
} from "lucide-react"
import "../styles/WelcomeOnboarding.css"

const SLIDE_DURATION_MS = 4500

export function WelcomeOnboarding({ onLogin, onSignUp }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const touchStartXRef = useRef(null)
  const touchStartYRef = useRef(null)

  const slides = [
    {
      id: "billing",
      eyebrow: "SMART BILLING DESK",
      eyebrowColor: "emerald",
      icon: Receipt,
      headline: "Create bills in seconds, print anywhere",
      description: "Generate GST & Non-GST invoices in a single tap. Print directly to any 58mm or 80mm thermal printer or share via WhatsApp.",
      renderVisual: () => (
        <div className="showcase-receipt-card">
          <div className="receipt-float-tag-left">
            <Printer size={13} />
            <span>58mm / 80mm Ready</span>
          </div>

          <div className="receipt-header-row">
            <div>
              <div className="receipt-brand-title">SLIPZEN POS</div>
              <span style={{ fontSize: "10px", color: "#64748b" }}>Bill #SZ-1082</span>
            </div>
            <span className="receipt-inv-badge">PAID</span>
          </div>

          <div className="receipt-items-list">
            <div className="receipt-item-row">
              <span><span className="receipt-item-qty">2x</span> Masala Chai</span>
              <span>₹40.00</span>
            </div>
            <div className="receipt-item-row">
              <span><span className="receipt-item-qty">3x</span> Fresh Samosa</span>
              <span>₹60.00</span>
            </div>
            <div className="receipt-item-row">
              <span><span className="receipt-item-qty">1x</span> Cold Coffee</span>
              <span>₹80.00</span>
            </div>
          </div>

          <div className="receipt-totals-box">
            <div className="receipt-total-row">
              <span className="receipt-total-label">Total Amount</span>
              <span className="receipt-total-value">₹180.00</span>
            </div>
          </div>

          <div className="receipt-float-tag-bottom">
            <Zap size={12} />
            <span>0.2s Lightning Print</span>
          </div>
        </div>
      )
    },
    {
      id: "inventory",
      eyebrow: "BARCODE & INVENTORY",
      eyebrowColor: "amber",
      icon: ScanBarcode,
      headline: "Scan barcodes & track stock in real time",
      description: "Look up products instantly with camera or USB scanner. Get automatic low-stock alerts before your top items run out.",
      renderVisual: () => (
        <div className="showcase-inventory-grid">
          {/* Barcode scanner card with red animated laser */}
          <div className="barcode-scanner-box">
            <div className="barcode-laser-line"></div>
            <div className="barcode-bars-svg">
              <svg width="220" height="22" viewBox="0 0 220 22">
                <rect x="0" y="0" width="3" height="22" fill="#0f172a" />
                <rect x="6" y="0" width="1.5" height="22" fill="#0f172a" />
                <rect x="12" y="0" width="4" height="22" fill="#0f172a" />
                <rect x="20" y="0" width="2" height="22" fill="#0f172a" />
                <rect x="26" y="0" width="5" height="22" fill="#0f172a" />
                <rect x="36" y="0" width="2" height="22" fill="#0f172a" />
                <rect x="42" y="0" width="6" height="22" fill="#0f172a" />
                <rect x="52" y="0" width="3" height="22" fill="#0f172a" />
                <rect x="60" y="0" width="1.5" height="22" fill="#0f172a" />
                <rect x="68" y="0" width="4" height="22" fill="#0f172a" />
                <rect x="76" y="0" width="2" height="22" fill="#0f172a" />
                <rect x="84" y="0" width="5" height="22" fill="#0f172a" />
                <rect x="94" y="0" width="3" height="22" fill="#0f172a" />
                <rect x="104" y="0" width="2" height="22" fill="#0f172a" />
                <rect x="112" y="0" width="6" height="22" fill="#0f172a" />
                <rect x="124" y="0" width="3" height="22" fill="#0f172a" />
                <rect x="132" y="0" width="4" height="22" fill="#0f172a" />
                <rect x="142" y="0" width="2" height="22" fill="#0f172a" />
                <rect x="150" y="0" width="5" height="22" fill="#0f172a" />
                <rect x="162" y="0" width="3" height="22" fill="#0f172a" />
                <rect x="172" y="0" width="4" height="22" fill="#0f172a" />
                <rect x="182" y="0" width="2" height="22" fill="#0f172a" />
                <rect x="190" y="0" width="5" height="22" fill="#0f172a" />
                <rect x="202" y="0" width="3" height="22" fill="#0f172a" />
              </svg>
            </div>
            <div className="barcode-detected-row">
              <span className="barcode-item-name">📦 Maggi Noodles 70g</span>
              <span className="barcode-item-price">₹14.00</span>
            </div>
          </div>

          {/* 2 Balanced product stock cards side by side */}
          <div className="inventory-items-row">
            <div className="stock-card">
              <div className="stock-card-title">Amul Butter 500g</div>
              <span className="stock-card-badge green">84 in stock</span>
            </div>
            <div className="stock-card">
              <div className="stock-card-title">Tata Tea Gold</div>
              <span className="stock-card-badge amber">⚠️ Only 3 left</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "restaurant",
      eyebrow: "DINE-IN & KOT TICKETS",
      eyebrowColor: "rose",
      icon: UtensilsCrossed,
      headline: "Manage tables & kitchen orders effortlessly",
      description: "Track occupied, vacant, and billing tables live. Send instant Kitchen Order Tickets (KOT) without running around.",
      renderVisual: () => (
        <div className="showcase-restaurant-grid">
          {/* Table layout matrix */}
          <div className="restaurant-tables-matrix">
            <div className="table-matrix-chip occupied">
              <div className="table-chip-label">T-01</div>
              <div className="table-chip-status">4 Guests</div>
            </div>
            <div className="table-matrix-chip billing">
              <div className="table-chip-label">T-02</div>
              <div className="table-chip-status">Billing</div>
            </div>
            <div className="table-matrix-chip available">
              <div className="table-chip-label">T-03</div>
              <div className="table-chip-status">Vacant</div>
            </div>
            <div className="table-matrix-chip occupied">
              <div className="table-chip-label">T-04</div>
              <div className="table-chip-status">2 Guests</div>
            </div>
          </div>

          {/* KOT Kitchen Ticket Card */}
          <div className="kot-ticket-card">
            <div className="kot-header-row">
              <span>KOT #18</span>
              <span>Table 01</span>
            </div>
            <div className="kot-items-list">
              <div>• 1x Paneer Butter Masala</div>
              <div>• 4x Butter Naan</div>
              <div>• 1x Dal Makhani</div>
            </div>
            <div className="kot-status-pill">
              <UtensilsCrossed size={11} />
              <span>Cooking in Kitchen</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "analytics",
      eyebrow: "BUSINESS ANALYTICS",
      eyebrowColor: "indigo",
      icon: BarChart3,
      headline: "Know your daily sales & profits at a glance",
      description: "Monitor UPI vs cash collections, hourly sales rush, and customer balances (Udhar) with zero manual bookkeeping.",
      renderVisual: () => (
        <div className="showcase-analytics-card">
          <div className="analytics-header-row">
            <div>
              <div className="analytics-title">Today's Revenue</div>
              <div className="analytics-big-number">₹38,420</div>
            </div>
            <div className="analytics-growth-badge">
              <TrendingUp size={12} />
              <span>+18.4%</span>
            </div>
          </div>

          <div className="analytics-split-grid">
            <div className="analytics-split-box upi">
              <div className="analytics-split-label">UPI / QR</div>
              <div className="analytics-split-value">₹26,800</div>
            </div>
            <div className="analytics-split-box cash">
              <div className="analytics-split-label">Cash Drawer</div>
              <div className="analytics-split-value">₹11,620</div>
            </div>
          </div>

          {/* Mini hourly sales graph */}
          <div className="analytics-chart-row">
            <div className="analytics-chart-bar" style={{ height: "40%" }} title="10 AM" />
            <div className="analytics-chart-bar" style={{ height: "65%" }} title="12 PM" />
            <div className="analytics-chart-bar highlight" style={{ height: "100%" }} title="2 PM" />
            <div className="analytics-chart-bar" style={{ height: "55%" }} title="4 PM" />
            <div className="analytics-chart-bar highlight" style={{ height: "85%" }} title="7 PM" />
            <div className="analytics-chart-bar highlight" style={{ height: "92%" }} title="9 PM" />
          </div>
        </div>
      )
    },
    {
      id: "devices",
      eyebrow: "CLOUD & OFFLINE READY",
      eyebrowColor: "emerald",
      icon: Cloud,
      headline: "Your shop in your pocket, works on any device",
      description: "Seamlessly bill on Android phones, counter PCs, and thermal printers. Offline billing resilience keeps your store running non-stop.",
      renderVisual: () => (
        <div className="showcase-devices-grid">
          {/* Top row with 2 devices */}
          <div className="devices-top-row">
            <div className="device-card-item">
              <Smartphone size={16} color="#3b82f6" />
              <span>Mobile POS</span>
            </div>
            <div className="device-card-item">
              <Monitor size={16} color="#8b5cf6" />
              <span>Counter Desktop</span>
            </div>
          </div>

          {/* Center bridge */}
          <div className="devices-center-bridge">
            <Cloud size={14} />
            <span>Slipzen Cloud Auto-Sync</span>
          </div>

          {/* Bottom row with 2 items cleanly spaced (NO OVERLAP!) */}
          <div className="devices-bottom-row">
            <div className="device-card-item">
              <Printer size={16} color="#059669" />
              <span>Thermal Printer</span>
            </div>
            <div className="device-card-item offline-badge">
              <WifiOff size={15} color="#059669" />
              <span>100% Offline Safe</span>
            </div>
          </div>
        </div>
      )
    }
  ]

  const activeSlide = slides[currentIndex]
  const CategoryIcon = activeSlide.icon

  const nextSlide = useCallback(() => {
    setProgress(0)
    setCurrentIndex((prev) => (prev + 1) % slides.length)
  }, [slides.length])

  const prevSlide = useCallback(() => {
    setProgress(0)
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length)
  }, [slides.length])

  const goToSlide = (idx) => {
    setProgress(0)
    setCurrentIndex(idx)
  }

  // Timer loop for active slide progression
  useEffect(() => {
    if (isPaused) return

    const intervalTime = 50
    const increment = (intervalTime / SLIDE_DURATION_MS) * 100

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextSlide()
          return 0
        }
        return prev + increment
      })
    }, intervalTime)

    return () => clearInterval(timer)
  }, [isPaused, nextSlide])

  // Touch gesture handlers for swipe
  const handleTouchStart = (e) => {
    setIsPaused(true)
    touchStartXRef.current = e.touches[0].clientX
    touchStartYRef.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e) => {
    setIsPaused(false)
    if (touchStartXRef.current === null) return
    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY
    const diffX = touchEndX - touchStartXRef.current
    const diffY = touchEndY - touchStartYRef.current

    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        nextSlide()
      } else {
        prevSlide()
      }
    }
    touchStartXRef.current = null
    touchStartYRef.current = null
  }

  return (
    <div 
      className="welcome-screen"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
    >
      <div className="welcome-container">
        {/* Top Story-style Progress Bars & Brand Logo */}
        <div className="welcome-top-bar">
          <div className="welcome-progress-bar-row">
            {slides.map((slide, idx) => {
              const isCompleted = idx < currentIndex
              const isActive = idx === currentIndex
              return (
                <div 
                  key={slide.id} 
                  className={`welcome-progress-segment ${isCompleted ? "completed" : ""} ${isActive ? "active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    goToSlide(idx)
                  }}
                >
                  <div 
                    className="welcome-progress-fill" 
                    style={{
                      width: isCompleted ? "100%" : isActive ? `${progress}%` : "0%"
                    }}
                  />
                </div>
              )
            })}
          </div>

          <div className="welcome-brand-row">
            <img src="/logo.png" alt="Slipzen" className="welcome-brand-logo" />
          </div>
        </div>

        {/* Middle Interactive Presentation Arena */}
        <div className="welcome-slider-stage">
          {/* Invisible tap areas on left & right to navigate */}
          <div 
            className="welcome-tap-prev" 
            onClick={(e) => {
              e.stopPropagation()
              prevSlide()
            }} 
            title="Previous"
          />
          <div 
            className="welcome-tap-next" 
            onClick={(e) => {
              e.stopPropagation()
              nextSlide()
            }} 
            title="Next"
          />

          <div key={activeSlide.id} className="welcome-slide">
            {/* Elevated Showcase Frame */}
            <div className="welcome-showcase-frame">
              {activeSlide.renderVisual()}
            </div>

            {/* Typography Content */}
            <div className="welcome-copy-block">
              <div className={`welcome-category-pill ${activeSlide.eyebrowColor}`}>
                <CategoryIcon size={12} />
                <span>{activeSlide.eyebrow}</span>
              </div>
              <h1 className="welcome-headline">{activeSlide.headline}</h1>
              <p className="welcome-description">{activeSlide.description}</p>
            </div>
          </div>
        </div>

        {/* Bottom Call to Action Buttons */}
        <div className="welcome-actions-row">
          <button 
            type="button" 
            className="welcome-btn welcome-btn-login"
            onClick={(e) => {
              e.stopPropagation()
              if (onLogin) onLogin()
            }}
          >
            LOG IN
          </button>
          <button 
            type="button" 
            className="welcome-btn welcome-btn-signup"
            onClick={(e) => {
              e.stopPropagation()
              if (onSignUp) onSignUp()
            }}
          >
            SIGN UP
          </button>
        </div>
      </div>
    </div>
  )
}
