import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ShieldCheck, FileText, Lock, ChevronRight, ArrowLeft, Check } from "lucide-react"
import { changeAppLanguage, SUPPORTED_LANGUAGES } from "../i18n/i18n"
import { legalFor, saveAcceptedPolicy } from "../lib/legalContent"
import "../styles/PolicyGate.css"

// Shown the first time the Android app is opened (and again if the policy text changes).
// Nothing else in the app is reachable until the person accepts.
export default function PolicyGate({ onAccept }) {
  const { t, i18n } = useTranslation()
  const [agreed, setAgreed] = useState(false)
  const [reading, setReading] = useState(null) // "terms" | "privacy" | null
  const legal = legalFor(i18n.language)

  const accept = () => {
    if (!agreed) return
    saveAcceptedPolicy()
    onAccept()
  }

  const decline = async () => {
    try {
      const { App } = await import("@capacitor/app")
      await App.exitApp()
    } catch {
      // not inside the app: nothing to close
    }
  }

  if (reading) {
    const doc = legal[reading]
    return (
      <div className="pg-screen" role="dialog" aria-modal="true" aria-label={doc.title}>
        <header className="pg-read-head">
          <button type="button" className="pg-back" onClick={() => setReading(null)} aria-label={t("common.back", "Back")}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="pg-read-title">{doc.title}</h1>
            <p className="pg-read-updated">{doc.updated}</p>
          </div>
        </header>
        <div className="pg-scroll pg-read-body">
          {doc.sections.map((section) => (
            <section key={section.h} className="pg-read-section">
              <h2>{section.h}</h2>
              <p>{section.p}</p>
            </section>
          ))}
        </div>
        <footer className="pg-footer">
          <button type="button" className="pg-btn pg-btn-primary" onClick={() => setReading(null)}>
            {t("policy.gotIt", "Back to agreement")}
          </button>
        </footer>
      </div>
    )
  }

  return (
    <div className="pg-screen" role="dialog" aria-modal="true" aria-label={t("policy.title", "Before you start")}>
      <div className="pg-scroll">
        <div className="pg-lang" role="group" aria-label={t("policy.language", "Language")}>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              className={`pg-lang-btn ${i18n.language?.slice(0, 2) === lang.code ? "active" : ""}`}
              onClick={() => changeAppLanguage(lang.code)}
            >
              {lang.nativeName}
            </button>
          ))}
        </div>

        <div className="pg-hero">
          <img src="/logo.png" alt="Slipzen" className="pg-logo" />
          <h1 className="pg-title">{t("policy.title", "Before you start")}</h1>
          <p className="pg-sub">
            {t("policy.subtitle", "Please read and accept our Terms of Service and Privacy Policy to use Slipzen.")}
          </p>
        </div>

        <ul className="pg-points">
          <li>
            <span className="pg-point-icon"><ShieldCheck size={18} /></span>
            <span>{t("policy.pointData", "We keep only what billing needs: your shop, items and bills. We never sell your data.")}</span>
          </li>
          <li>
            <span className="pg-point-icon"><Lock size={18} /></span>
            <span>{t("policy.pointPay", "Payments are made on Razorpay's secure screen. We never see your card, UPI PIN or bank password.")}</span>
          </li>
          <li>
            <span className="pg-point-icon"><Check size={18} /></span>
            <span>{t("policy.pointPerm", "The microphone and camera are used only when you use voice search or the barcode scanner, and only after you allow them.")}</span>
          </li>
        </ul>

        <div className="pg-docs">
          <button type="button" className="pg-doc" onClick={() => setReading("terms")}>
            <span className="pg-doc-icon"><FileText size={20} /></span>
            <span className="pg-doc-text">
              <strong>{legal.terms.title}</strong>
              <small>{t("policy.tapRead", "Tap to read")}</small>
            </span>
            <ChevronRight size={18} className="pg-doc-go" />
          </button>
          <button type="button" className="pg-doc" onClick={() => setReading("privacy")}>
            <span className="pg-doc-icon"><ShieldCheck size={20} /></span>
            <span className="pg-doc-text">
              <strong>{legal.privacy.title}</strong>
              <small>{t("policy.tapRead", "Tap to read")}</small>
            </span>
            <ChevronRight size={18} className="pg-doc-go" />
          </button>
        </div>
      </div>

      <footer className="pg-footer">
        <label className="pg-agree">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span className="pg-box" aria-hidden="true"><Check size={14} strokeWidth={3} /></span>
          <span className="pg-agree-text">
            {t("policy.agree", "I have read and agree to the Terms of Service and the Privacy Policy.")}
          </span>
        </label>
        <button type="button" className="pg-btn pg-btn-primary" disabled={!agreed} onClick={accept}>
          {t("policy.accept", "Accept & Continue")}
        </button>
        <button type="button" className="pg-btn pg-btn-ghost" onClick={decline}>
          {t("policy.decline", "Decline and exit")}
        </button>
      </footer>
    </div>
  )
}
