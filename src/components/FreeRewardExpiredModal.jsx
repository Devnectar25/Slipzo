import React, { useEffect } from "react"
import { AlertCircle, ArrowRight, Zap, CheckCircle2 } from "lucide-react"

export function FreeRewardExpiredModal({ isOpen, onClose, onViewPlans }) {
  useEffect(() => {
    if (isOpen) {
      const originalBodyOverflow = document.body.style.overflow
      const originalDocOverflow = document.documentElement.style.overflow

      document.body.style.overflow = "hidden"
      document.documentElement.style.overflow = "hidden"

      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          onClose?.()
        }
      }
      window.addEventListener("keydown", handleKeyDown)

      return () => {
        document.body.style.overflow = originalBodyOverflow
        document.documentElement.style.overflow = originalDocOverflow
        window.removeEventListener("keydown", handleKeyDown)
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleBackdropClick = (e) => {
    e.stopPropagation()
    onClose?.()
  }

  const handleCardClick = (e) => {
    e.stopPropagation()
  }

  return (
    <div
      className="expiry-modal-overlay"
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "1rem",
        animation: "expiryFadeIn 0.25s ease-out forwards"
      }}
    >
      <div
        className="expiry-modal-card"
        onClick={handleCardClick}
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "460px",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(226, 232, 240, 0.8)",
          overflow: "hidden",
          position: "relative",
          animation: "expiryPopIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          display: "flex",
          flexDirection: "column",
          textAlign: "center"
        }}
      >
        {/* Top Accent Bar */}
        <div
          style={{
            background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #e11d48 100%)",
            height: "8px",
            width: "100%"
          }}
        />

        <div style={{ padding: "2rem 1.75rem 1.75rem" }}>
          {/* Badge Icon */}
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
              border: "2px solid #fde68a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
              boxShadow: "0 8px 20px -4px rgba(245, 158, 11, 0.25)",
              color: "#d97706"
            }}
          >
            <AlertCircle size={36} />
          </div>

          {/* Title */}
          <h2
            style={{
              fontSize: "1.45rem",
              fontWeight: "800",
              color: "#0f172a",
              margin: "0 0 0.5rem 0",
              letterSpacing: "-0.02em"
            }}
          >
            Your Free Reward Has Expired
          </h2>

          {/* Description */}
          <p
            style={{
              fontSize: "0.92rem",
              lineHeight: "1.55",
              color: "#64748b",
              margin: "0 0 1.25rem 0"
            }}
          >
            Your 10 free prints have been used. Continue creating bills by choosing a plan that works for you.
          </p>

          {/* Balance & Feature Highlight Box */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              padding: "1rem 1.1rem",
              marginBottom: "1.5rem",
              textAlign: "left"
            }}
          >
            {/* Status Pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "0.75rem",
                marginBottom: "0.75rem",
                borderBottom: "1px dashed #cbd5e1"
              }}
            >
              <span style={{ fontWeight: "700", color: "#1e293b", fontSize: "0.9rem" }}>
                Free Prints Balance
              </span>
              <span
                style={{
                  background: "#fee2e2",
                  color: "#dc2626",
                  padding: "0.25rem 0.65rem",
                  borderRadius: "999px",
                  fontWeight: "700",
                  fontSize: "0.8rem"
                }}
              >
                0 Prints Remaining
              </span>
            </div>

            {/* Perks list for paid plan */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", color: "#475569" }}>
                <CheckCircle2 size={15} style={{ color: "#0284c7", flexShrink: 0 }} />
                <span>Unlimited invoices & instant thermal printing</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", color: "#475569" }}>
                <CheckCircle2 size={15} style={{ color: "#0284c7", flexShrink: 0 }} />
                <span>GST compliance & custom template branding</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", color: "#475569" }}>
                <CheckCircle2 size={15} style={{ color: "#0284c7", flexShrink: 0 }} />
                <span>Low cost starting at just ₹99 with instant activation</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            <button
              type="button"
              className="primary-button expiry-view-plans-btn"
              onClick={onViewPlans}
              style={{
                width: "100%",
                padding: "0.85rem 1.25rem",
                fontSize: "0.98rem",
                fontWeight: "700",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                cursor: "pointer",
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                boxShadow: "0 10px 20px -5px rgba(2, 132, 199, 0.4)",
                transition: "transform 0.15s ease, box-shadow 0.15s ease"
              }}
            >
              <Zap size={17} />
              <span>View Plans</span>
              <ArrowRight size={17} />
            </button>

            <button
              type="button"
              className="secondary-button expiry-later-btn"
              onClick={onClose}
              style={{
                width: "100%",
                padding: "0.7rem 1.25rem",
                fontSize: "0.9rem",
                fontWeight: "600",
                borderRadius: "12px",
                cursor: "pointer",
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                color: "#64748b",
                transition: "background 0.15s ease, color 0.15s ease"
              }}
            >
              Maybe Later
            </button>
          </div>
        </div>

        <style>{`
          @keyframes expiryFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes expiryPopIn {
            from {
              opacity: 0;
              transform: scale(0.92) translateY(10px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          .expiry-view-plans-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 12px 24px -5px rgba(2, 132, 199, 0.5) !important;
          }
          .expiry-view-plans-btn:active {
            transform: translateY(1px);
          }
          .expiry-later-btn:hover {
            background: #f1f5f9 !important;
            color: #334155 !important;
          }
          @media (max-width: 480px) {
            .expiry-modal-card {
              max-width: 95% !important;
            }
          }
        `}</style>
      </div>
    </div>
  )
}

export default FreeRewardExpiredModal
