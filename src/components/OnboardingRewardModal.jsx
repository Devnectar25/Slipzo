import React, { useEffect } from "react"
import { Sparkles, Printer, ArrowRight, CheckCircle2 } from "lucide-react"

export function OnboardingRewardModal({ isOpen, onClose, onGetStarted }) {
  useEffect(() => {
    if (isOpen) {
      const originalBodyOverflow = document.body.style.overflow
      const originalDocOverflow = document.documentElement.style.overflow

      document.body.style.overflow = "hidden"
      document.documentElement.style.overflow = "hidden"

      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          handleAction()
        }
      }
      window.addEventListener("keydown", handleKeyDown)

      return () => {
        document.body.style.overflow = originalBodyOverflow
        document.documentElement.style.overflow = originalDocOverflow
        window.removeEventListener("keydown", handleKeyDown)
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleAction = () => {
    if (onGetStarted) {
      onGetStarted()
    } else if (onClose) {
      onClose()
    }
  }

  return (
    <div
      className="reward-modal-overlay"
      onClick={handleAction}
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
        animation: "rewardFadeIn 0.25s ease-out forwards"
      }}
    >
      <div
        className="reward-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "460px",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(226, 232, 240, 0.8)",
          overflow: "hidden",
          position: "relative",
          animation: "rewardPopIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          display: "flex",
          flexDirection: "column",
          textAlign: "center"
        }}
      >
        {/* Top Celebration Banner Accent */}
        <div
          style={{
            background: "linear-gradient(135deg, #2563eb 0%, #0284c7 50%, #38bdf8 100%)",
            height: "8px",
            width: "100%"
          }}
        />

        <div style={{ padding: "2rem 1.75rem 1.75rem" }}>
          {/* Animated Celebration Icon */}
          <div
            style={{
              width: "76px",
              height: "76px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
              border: "2px solid #bfdbfe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
              boxShadow: "0 8px 20px -4px rgba(37, 99, 235, 0.25)",
              fontSize: "2.4rem",
              userSelect: "none"
            }}
          >
            🎉
          </div>

          {/* Heading */}
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: "800",
              color: "#0f172a",
              margin: "0 0 0.5rem 0",
              letterSpacing: "-0.02em"
            }}
          >
            10 Free Prints Reward!
          </h2>

          {/* Description */}
          <p
            style={{
              fontSize: "0.92rem",
              lineHeight: "1.5",
              color: "#64748b",
              margin: "0 0 1.5rem 0"
            }}
          >
            Welcome to Slipzo! You've successfully completed your shop setup and menu items.
            We've credited <strong style={{ color: "#0284c7" }}>10 free prints</strong> to your account so you can start creating bills right away.
          </p>

          {/* Reward Feature Highlight Box */}
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
            {/* Balance Badge */}
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
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    background: "#0284c7",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Printer size={16} />
                </div>
                <span style={{ fontWeight: "700", color: "#1e293b", fontSize: "0.95rem" }}>
                  Available Balance
                </span>
              </div>
              <span
                style={{
                  background: "#dcfce7",
                  color: "#15803d",
                  padding: "0.25rem 0.65rem",
                  borderRadius: "999px",
                  fontWeight: "700",
                  fontSize: "0.82rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem"
                }}
              >
                <Sparkles size={13} /> 10 Prints Credited
              </span>
            </div>

            {/* Micro perks */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", color: "#475569" }}>
                <CheckCircle2 size={15} style={{ color: "#10b981", flexShrink: 0 }} />
                <span>Create bills with your customized shop branding</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", color: "#475569" }}>
                <CheckCircle2 size={15} style={{ color: "#10b981", flexShrink: 0 }} />
                <span>Instant thermal print, PDF download & WhatsApp sharing</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", color: "#475569" }}>
                <CheckCircle2 size={15} style={{ color: "#10b981", flexShrink: 0 }} />
                <span>Real-time sales & analytics on your Overview dashboard</span>
              </div>
            </div>
          </div>

          {/* Primary CTA Button */}
          <button
            type="button"
            className="primary-button reward-get-started-btn"
            onClick={handleAction}
            style={{
              width: "100%",
              padding: "0.85rem 1.25rem",
              fontSize: "1rem",
              fontWeight: "700",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.6rem",
              cursor: "pointer",
              boxShadow: "0 10px 20px -5px rgba(2, 132, 199, 0.35)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease"
            }}
          >
            <span>Get Started</span>
            <ArrowRight size={18} />
          </button>
        </div>

        <style>{`
          @keyframes rewardFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes rewardPopIn {
            from {
              opacity: 0;
              transform: scale(0.92) translateY(10px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          .reward-get-started-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 12px 24px -5px rgba(2, 132, 199, 0.45) !important;
          }
          .reward-get-started-btn:active {
            transform: translateY(1px);
          }
          @media (max-width: 480px) {
            .reward-modal-card {
              max-width: 95% !important;
            }
          }
        `}</style>
      </div>
    </div>
  )
}

export default OnboardingRewardModal
