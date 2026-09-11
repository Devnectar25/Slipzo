import { useState, useEffect } from "react"
import { Smartphone, Download, X, CheckCircle2, ShieldCheck, Zap, Info, ChevronRight, Share2, MoreVertical } from "lucide-react"

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)

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

    setIsAndroid(android)
    setIsIOS(ios)

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
      }, 1500)
      return () => {
        clearTimeout(timer)
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  const handleDismiss = () => {
    setShowModal(false)
    setShowGuide(false)
    localStorage.setItem('slipzo_pwa_dismissed', Date.now().toString())
  }

  const triggerApkDownload = () => {
    try {
      const link = document.createElement('a')
      link.href = '/slipzo.apk'
      link.download = 'Slipzo.apk'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      console.warn('APK download error:', e)
    }
  }

  const handleInstall = async () => {
    // 1. Directly trigger APK download
    triggerApkDownload()

    // 2. Trigger native PWA WebAPK install prompt if supported
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        console.log(`User response to install prompt: ${outcome}`)
        if (outcome === 'accepted') {
          setShowModal(false)
        }
        setDeferredPrompt(null)
      } catch (err) {
        console.warn('Install error, showing guide:', err)
        setShowGuide(true)
      }
    } else {
      setShowGuide(true)
    }
  }

  // Floating trigger button in bottom-left on mobile when modal is closed
  if (isStandalone) return null

  return (
    <>
      {/* Floating Install App Badge removed per requirement */}

      {/* Main Installation Modal */}
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
                    <ShieldCheck size={13} /> Official PWA & APK
                  </span>
                  <span className="pwa-free-badge">Fast · Safe</span>
                </div>
              </div>
            </div>

            {!showGuide ? (
              <>
                <p className="pwa-desc">
                  Install the official Slipzo App directly to your phone. <b>Fast 1-tap setup with offline thermal billing!</b>
                </p>

                {/* Key Benefits */}
                <div className="pwa-benefits">
                  <div className="pwa-benefit-item">
                    <div className="pwa-benefit-icon green">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <b>Direct APK & Google WebAPK Install</b>
                      <p>Instant download and 1-tap installation directly to your mobile home screen.</p>
                    </div>
                  </div>

                  <div className="pwa-benefit-item">
                    <div className="pwa-benefit-icon blue">
                      <Zap size={16} />
                    </div>
                    <div>
                      <b>Lightning Fast & Offline Receipt Billing</b>
                      <p>Instant print receipts, Bluetooth printer support, and stores your bills locally.</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pwa-actions">
                  <button className="pwa-install-btn" onClick={handleInstall}>
                    <Download size={18} />
                    <span>Install Slipzo App (1-Tap)</span>
                  </button>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.2rem' }}>
                    <button className="pwa-guide-link" onClick={triggerApkDownload} style={{ color: '#0f172a' }}>
                      <Download size={14} />
                      <span>Download APK File (.apk)</span>
                    </button>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <button className="pwa-guide-link" onClick={() => setShowGuide(true)}>
                      <span>Install guide</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Step-by-Step Manual Installation Guide */
              <div className="pwa-guide-section">
                <div className="pwa-guide-header">
                  <h4>How to Install on Your Device</h4>
                  <p>Follow these simple steps in your mobile browser:</p>
                </div>

                {isIOS ? (
                  /* iOS / Safari Guide */
                  <div className="pwa-steps">
                    <div className="pwa-step">
                      <span className="step-num">1</span>
                      <div>
                        <b>Tap the Share button</b>
                        <p>Look for the <Share2 size={13} className="inline-icon" /> icon at the bottom of Safari.</p>
                      </div>
                    </div>
                    <div className="pwa-step">
                      <span className="step-num">2</span>
                      <div>
                        <b>Select "Add to Home Screen"</b>
                        <p>Scroll down the menu and tap <b>Add to Home Screen ⊕</b>.</p>
                      </div>
                    </div>
                    <div className="pwa-step">
                      <span className="step-num">3</span>
                      <div>
                        <b>Tap "Add" in top right</b>
                        <p>Slipzo will install as a native full-screen app on your iPhone!</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Android / Chrome Guide */
                  <div className="pwa-steps">
                    <div className="pwa-step">
                      <span className="step-num">1</span>
                      <div>
                        <b>Tap the 3-dots Menu <MoreVertical size={13} className="inline-icon" /></b>
                        <p>Located at the top-right corner in Chrome browser.</p>
                      </div>
                    </div>
                    <div className="pwa-step">
                      <span className="step-num">2</span>
                      <div>
                        <b>Tap "Install app" or "Add to Home screen"</b>
                        <p>Select this option from the Chrome menu dropdown.</p>
                      </div>
                    </div>
                    <div className="pwa-step">
                      <span className="step-num">3</span>
                      <div>
                        <b>Tap "Install"</b>
                        <p>Android generates a verified WebAPK without any Play Protect warnings!</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* APK Play Protect Explainer Note */}
                <div className="pwa-apk-notice">
                  <Info size={16} className="notice-icon" />
                  <div>
                    <b>Why did Google Play Protect block the raw APK?</b>
                    <p>
                      Android 13/14+ blocks side-loaded APKs that are not signed through the Play Store. 
                      Installing via <b>PWA / WebAPK</b> is Google's recommended official method for instant, secure mobile installation!
                    </p>
                  </div>
                </div>

                <div className="pwa-actions">
                  {deferredPrompt && (
                    <button className="pwa-install-btn" onClick={handleInstall}>
                      <Download size={18} />
                      <span>Trigger 1-Tap Install Now</span>
                    </button>
                  )}
                  <button className="pwa-back-btn" onClick={() => setShowGuide(false)}>
                    ← Back to Overview
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        /* Floating Install App Button */
        .pwa-float-btn {
          position: fixed;
          bottom: 4.8rem;
          right: 1rem;
          z-index: 998;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #0f172a;
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.35);
          border-radius: 9999px;
          padding: 0.5rem 0.95rem;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          animation: bounceFloat 3s infinite;
        }

        .pwa-float-btn:hover {
          transform: translateY(-2px);
          background: #1e293b;
        }

        .pwa-float-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #38bdf8;
        }

        @keyframes bounceFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        /* Modal Overlay */
        .pwa-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(6px);
          z-index: 10000;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 0;
          animation: pwaFade 0.25s ease;
        }

        @media (min-width: 640px) {
          .pwa-overlay {
            align-items: center;
            padding: 1.25rem;
          }
        }

        /* Modal Card (Bottom Sheet on Mobile) */
        .pwa-card {
          background: #ffffff;
          width: 100%;
          max-width: 440px;
          border-radius: 24px 24px 0 0;
          padding: 1.5rem;
          position: relative;
          box-shadow: 0 -10px 40px rgba(15, 23, 42, 0.25);
          animation: pwaSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          max-height: 90vh;
          overflow-y: auto;
          scrollbar-width: none;
        }

        @media (min-width: 640px) {
          .pwa-card {
            border-radius: 20px;
            box-shadow: 0 20px 48px rgba(15, 23, 42, 0.25);
            animation: pwaScaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          }
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

        /* Header */
        .pwa-header {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          margin-bottom: 0.85rem;
          padding-right: 2rem;
        }

        .pwa-icon-wrap {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
          flex-shrink: 0;
        }

        .pwa-app-logo {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .pwa-title-area h3 {
          font-size: 1.15rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 0.25rem 0;
        }

        .pwa-badge-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex-wrap: wrap;
        }

        .pwa-safe-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          background: #ecfdf5;
          color: #059669;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.15rem 0.45rem;
          border-radius: 6px;
          border: 1px solid #a7f3d0;
        }

        .pwa-free-badge {
          background: #f1f5f9;
          color: #64748b;
          font-size: 0.7rem;
          font-weight: 500;
          padding: 0.15rem 0.45rem;
          border-radius: 6px;
        }

        .pwa-desc {
          font-size: 0.88rem;
          color: #475569;
          line-height: 1.45;
          margin: 0 0 1rem 0;
        }

        /* Benefits List */
        .pwa-benefits {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 0.85rem;
          margin-bottom: 1.25rem;
        }

        .pwa-benefit-item {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
        }

        .pwa-benefit-icon {
          width: 26px;
          height: 26px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 0.1rem;
        }

        .pwa-benefit-icon.green {
          background: #d1fae5;
          color: #059669;
        }

        .pwa-benefit-icon.blue {
          background: #e0f2fe;
          color: #0284c7;
        }

        .pwa-benefit-item b {
          display: block;
          font-size: 0.82rem;
          color: #0f172a;
          margin-bottom: 0.1rem;
        }

        .pwa-benefit-item p {
          font-size: 0.75rem;
          color: #64748b;
          margin: 0;
          line-height: 1.35;
        }

        /* Action Buttons */
        .pwa-actions {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .pwa-install-btn {
          width: 100%;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #ffffff;
          border: none;
          padding: 0.85rem 1rem;
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.2);
          transition: all 0.2s ease;
        }

        .pwa-install-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(15, 23, 42, 0.3);
        }

        .pwa-guide-link {
          background: transparent;
          border: none;
          color: #0284c7;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
          padding: 0.4rem;
        }

        .pwa-guide-link:hover {
          text-decoration: underline;
        }

        /* Step-by-Step Guide Section */
        .pwa-guide-section {
          animation: pwaFade 0.2s ease;
        }

        .pwa-guide-header {
          margin-bottom: 0.85rem;
        }

        .pwa-guide-header h4 {
          font-size: 1rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 0.25rem 0;
        }

        .pwa-guide-header p {
          font-size: 0.8rem;
          color: #64748b;
          margin: 0;
        }

        .pwa-steps {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          margin-bottom: 1rem;
        }

        .pwa-step {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0.75rem;
        }

        .step-num {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #0ea5e9;
          color: #ffffff;
          font-size: 0.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .pwa-step b {
          display: block;
          font-size: 0.82rem;
          color: #0f172a;
          margin-bottom: 0.15rem;
        }

        .pwa-step p {
          font-size: 0.75rem;
          color: #64748b;
          margin: 0;
          line-height: 1.35;
        }

        .inline-icon {
          display: inline;
          vertical-align: middle;
          margin: 0 0.15rem;
        }

        /* APK Play Protect Explainer */
        .pwa-apk-notice {
          display: flex;
          align-items: flex-start;
          gap: 0.55rem;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 12px;
          padding: 0.75rem;
          margin-bottom: 1.15rem;
        }

        .notice-icon {
          color: #d97706;
          flex-shrink: 0;
          margin-top: 0.1rem;
        }

        .pwa-apk-notice b {
          display: block;
          font-size: 0.78rem;
          color: #92400e;
          margin-bottom: 0.15rem;
        }

        .pwa-apk-notice p {
          font-size: 0.72rem;
          color: #b45309;
          margin: 0;
          line-height: 1.35;
        }

        .pwa-back-btn {
          background: #f1f5f9;
          color: #334155;
          border: 1px solid #cbd5e1;
          padding: 0.65rem 1rem;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
        }

        .pwa-back-btn:hover {
          background: #e2e8f0;
        }

        @keyframes pwaFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes pwaSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        @keyframes pwaScaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  )
}
