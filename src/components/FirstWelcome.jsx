import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { ArrowRight, Check } from "lucide-react"
import { PoweredBy } from "./PolicyLinks"
import "../styles/FirstWelcome.css"

// The first page of a new account in the Android app: shown once, right after signing up and before choosing a plan.
export default function FirstWelcome({ name = "", onContinue }) {
  const { t } = useTranslation()
  const screenRef = useRef(null)
  const shopName = String(name || "").trim() || "SLIPZEN" // sign up asks for the shop name; it is printed on the slip

  useEffect(() => { screenRef.current?.focus({ preventScroll: true }) }, [])

  const lines = [
    t("firstWelcome.line1", "Bills in seconds"),
    t("firstWelcome.line2", "58mm & 80mm printing"),
    t("firstWelcome.line3", "Daily sales and GST")
  ]

  return (
    <div ref={screenRef} tabIndex={-1} className="fw-screen" role="dialog" aria-modal="true" aria-labelledby="fw-title" data-testid="first-welcome">
      <span className="fw-glow fw-glow-a" aria-hidden="true" />
      <span className="fw-glow fw-glow-b" aria-hidden="true" />

      <div className="fw-body">
        <img src="/logo.png" alt="Slipzen" className="fw-logo" />

        {/* a little printer that prints the welcome slip */}
        <div className="fw-printer" aria-hidden="true">
          <div className="fw-slot"><span className="fw-light" /></div>
          <div className="fw-window">
            <div className="fw-slip">
              <p className="fw-slip-brand">{shopName}</p>
              <p className="fw-slip-sub">{t("firstWelcome.slip", "Welcome slip")}</p>
              <ul>
                {lines.map((line) => (
                  <li key={line}><span>{line}</span><Check size={15} strokeWidth={3} /></li>
                ))}
              </ul>
              <div className="fw-bars" />
            </div>
          </div>
        </div>

        <div className="fw-copy">
          <h1 id="fw-title">{t("firstWelcome.title", "Welcome to Slipzen!")}</h1>
          <p>{t("firstWelcome.text", "Your account is ready. Let's set up your shop and print your first bill.")}</p>
        </div>
      </div>

      <div className="fw-foot">
        <button type="button" className="fw-btn" onClick={onContinue} data-testid="first-welcome-start">
          <span>{t("firstWelcome.start", "Get started")}</span>
          <ArrowRight size={20} />
        </button>
        <PoweredBy className="fw-powered" />
      </div>
    </div>
  )
}
