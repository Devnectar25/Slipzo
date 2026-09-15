import { useState, useEffect } from "react"
import { Download, X, CheckCircle2, ShieldCheck, Zap } from "lucide-react"

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if already running in standalone PWA / TWA mode
    const standaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                           window.navigator.standalone === true || 
                           document.referrer.includes('android-app://')
    setIsStandalone(standaloneMode)
    if (standaloneMode) return

    // Device detection
    const ua = navigator.userAgent || ""
    const android = /android/i.test(ua)
    const ios = /iphone|ipad|ipod/i.test(ua)
    const isMobile = android || ios || window.innerWidth <= 768

    // Capture beforeinstallprompt event on Android Chrome/Edge
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      console.log('📱 PWA install prompt ready')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Check if user dismissed recently
    const dismissedTime = localStorage.getItem('slipzo_pwa_dismissed')
    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000

    // Auto-open modal on first mobile visit if not dismissed in the last 24h
    if (isMobile && (!dismissedTime || now - parseInt(dismissedTime) > oneDay)) {
      const timer = setTimeout(() => {
        setShowModal(true)
      }, 1200)
      return () => {
        clearTimeout(timer)
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  const handleDismiss = () => {
    setShowModal(false)
    localStorage.setItem('slipzo_pwa_dismissed', Date.now().toString())
  }

  const downloadApkDirect = () => {
    try {
      const link = document.createElement('a')
      link.href = '/slipzo.apk'
      link.download = 'Slipzo.apk'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      console.error("Direct APK download failed:", e)
    }
  }

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
          setShowModal(false)
        }
        setDeferredPrompt(null)
        return
      } catch (err) {
        console.warn('Install error, triggering direct APK:', err)
      }
    }
    // Direct APK download fallback
    downloadApkDirect()
  }

  if (isStandalone) return null

  return (
    <>
      {showModal && (
        <div className="pwa-overlay" onClick={handleDismiss}>
          <div className="pwa-card" onClick={(e) => e.stopPropagation()}>
            <button className="pwa-close" onClick={handleDismiss} aria-label="Close">
              <X size={18} />
            </button>

            {/* App Header */}
            <div className="pwa-header">
              <div className="pwa-icon-wrap">
                <img src="/logo.png" alt="Slipzo" className="pwa-app-logo" />
              </div>
              <div className="pwa-title-area">
                <h3>Slipzo Mobile App</h3>
                <div className="pwa-badge-row">
                  <span className="pwa-safe-badge">
                    <ShieldCheck size={13} /> Official Android APK
                  </span>
                  <span className="pwa-free-badge">Fast · Direct</span>
                </div>
              </div>
            </div>

            <p className="pwa-desc">
              Download the official Slipzo Android APK directly to your device. <b>Instant setup with offline thermal receipt printing!</b>
            </p>

            {/* Key Benefits */}
            <div className="pwa-benefits">
              <div className="pwa-benefit-item">
                <div className="pwa-benefit-icon green">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <b>Direct APK Download</b>
                  <p>Instant APK package download directly to your mobile storage.</p>
                </div>
              </div>

              <div className="pwa-benefit-item">
                <div className="pwa-benefit-icon blue">
                  <Zap size={16} />
                </div>
                <div>
                  <b>Offline Receipt Billing</b>
                  <p>Instant print receipts, Bluetooth thermal printer support, and local storage.</p>
                </div>
              </div>
            </div>

            {/* Direct Action Buttons */}
            <div className="pwa-actions">
              <button className="pwa-install-btn" onClick={downloadApkDirect}>
                <Download size={18} />
                <span>Download APK Direct (.apk)</span>
              </button>
              
              {deferredPrompt && (
                <button 
                  className="pwa-install-btn" 
                  onClick={handleInstall}
                  style={{ background: '#0284c7', marginTop: '0.4rem' }}
                >
                  <Download size={16} />
                  <span>Install WebAPK (1-Tap)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .pwa-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(6px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          animation: pwaFadeIn 0.25s ease-out;
        }

        .pwa-card {
          background: #ffffff;
          border-radius: 24px;
          padding: 1.5rem;
          width: 100%;
          max-width: 420px;
          position: relative;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(226, 232, 240, 0.8);
          animation: pwaSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .pwa-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: #f1f5f9;
          border: none;
          color: #64748b;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .pwa-close:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .pwa-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .pwa-icon-wrap {
          width: 54px;
          height: 54px;
          border-radius: 16px;
          background: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.2);
          overflow: hidden;
        }

        .pwa-app-logo {
          width: 38px;
          height: 38px;
          object-fit: contain;
        }

        .pwa-title-area h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1.2rem;
          font-weight: 700;
          color: #0f172a;
        }

        .pwa-badge-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .pwa-safe-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 9999px;
        }

        .pwa-free-badge {
          background: #f1f5f9;
          color: #475569;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 9999px;
        }

        .pwa-desc {
          font-size: 0.88rem;
          color: #475569;
          line-height: 1.5;
          margin: 0 0 1.25rem 0;
        }

        .pwa-benefits {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 16px;
          padding: 1rem;
          margin-bottom: 1.25rem;
        }

        .pwa-benefit-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .pwa-benefit-icon {
          width: 30px;
          height: 30px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .pwa-benefit-icon.green {
          background: #dcfce7;
          color: #15803d;
        }

        .pwa-benefit-icon.blue {
          background: #e0f2fe;
          color: #0369a1;
        }

        .pwa-benefit-item b {
          display: block;
          font-size: 0.85rem;
          color: #0f172a;
          margin-bottom: 0.15rem;
        }

        .pwa-benefit-item p {
          margin: 0;
          font-size: 0.78rem;
          color: #64748b;
          line-height: 1.4;
        }

        .pwa-actions {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .pwa-install-btn {
          width: 100%;
          background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
          color: #ffffff;
          border: none;
          border-radius: 14px;
          padding: 0.85rem 1.25rem;
          font-size: 0.95rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          cursor: pointer;
          box-shadow: 0 10px 20px -5px rgba(14, 165, 233, 0.4);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .pwa-install-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 24px -5px rgba(14, 165, 233, 0.5);
        }

        @keyframes pwaFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes pwaSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  )
}
