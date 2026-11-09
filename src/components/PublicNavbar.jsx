import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Globe, ChevronDown, Check } from "lucide-react"
import { SUPPORTED_LANGUAGES, changeAppLanguage } from "../i18n/i18n"
import "../styles/DesktopLanding.css"

export const PUBLIC_NAV_LINKS = [
  { id: "features", key: "landing.features", defaultLabel: "Features" },
  { id: "shops", key: "landing.whoItsFor", defaultLabel: "Who it's for" },
  { id: "how", key: "landing.howItWorks", defaultLabel: "How it works" },
  { id: "pricing", key: "landing.pricing", defaultLabel: "Pricing" },
  { id: "contact", key: "landing.contactUs", defaultLabel: "Contact us" },
]

export function PublicNavbar({ onLogin, onSignUp, onNavigate, scrolled = false }) {
  const { t, i18n } = useTranslation()
  const langMenuRef = useRef(null)
  const [isLangOpen, setIsLangOpen] = useState(false)

  const currentLang = (i18n.language || "en").substring(0, 2)
  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0]

  useEffect(() => {
    const handlePointerDown = (e) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setIsLangOpen(false)
      }
    }
    if (isLangOpen) {
      document.addEventListener("pointerdown", handlePointerDown)
    }
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [isLangOpen])

  const handleSelectLanguage = async (code) => {
    setIsLangOpen(false)
    await changeAppLanguage(code)
  }

  const handleNavClick = (id) => {
    if (id === "pricing" || id === "contact") {
      if (onNavigate) {
        onNavigate(id)
      }
      return
    }
    const el = document.getElementById(`dl-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    } else if (onNavigate) {
      onNavigate("dashboard")
      setTimeout(() => {
        const target = document.getElementById(`dl-${id}`)
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      }, 100)
    }
  }

  const handleLogoClick = () => {
    const el = document.querySelector(".dl-page")
    if (el) {
      el.scrollTo({ top: 0, behavior: "smooth" })
    }
    if (onNavigate) {
      onNavigate("dashboard")
    }
  }

  return (
    <header className={`dl-nav ${scrolled ? "dl-nav-scrolled" : ""}`}>
      <div className="dl-container dl-nav-inner">
        <button
          type="button"
          className="dl-logo-btn"
          onClick={handleLogoClick}
          aria-label={t("landing.ariaHome", "Slipzen Home")}
        >
          <img src="/logo.png" alt="Slipzen" className="dl-logo" />
        </button>

        <nav className="dl-nav-links" aria-label={t("landing.ariaSections", "Page sections")}>
          {PUBLIC_NAV_LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => handleNavClick(link.id)}
            >
              {t(link.key, link.defaultLabel)}
            </button>
          ))}
        </nav>

        <div className="dl-nav-actions">
          <div className="dl-lang-wrap" ref={langMenuRef}>
            <button
              type="button"
              className="dl-lang-btn"
              onClick={() => setIsLangOpen((prev) => !prev)}
              aria-expanded={isLangOpen}
              aria-label={t("landing.ariaChangeLang", "Change language")}
              title={t("landing.ariaSelectLang", "Select language")}
            >
              <Globe size={16} />
              <span>{currentLangObj.nativeName}</span>
              <ChevronDown size={14} className={`dl-lang-chevron ${isLangOpen ? "open" : ""}`} />
            </button>

            {isLangOpen && (
              <div className="dl-lang-menu" role="menu">
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isSelected = lang.code === currentLang
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      className={`dl-lang-item ${isSelected ? "active" : ""}`}
                      onClick={() => handleSelectLanguage(lang.code)}
                      role="menuitem"
                    >
                      <div className="dl-lang-item-left">
                        <span className="dl-lang-native">{lang.nativeName}</span>
                        <span className="dl-lang-label">{lang.label}</span>
                      </div>
                      {isSelected && <Check size={16} className="dl-lang-check" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <button type="button" className="dl-btn dl-btn-ghost" onClick={onLogin}>
            {t("landing.logIn", "Log in")}
          </button>
          <button type="button" className="dl-btn dl-btn-primary" onClick={onSignUp}>
            {t("landing.getStarted", "Get started")}
          </button>
        </div>
      </div>
    </header>
  )
}
export default PublicNavbar

