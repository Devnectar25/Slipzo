import { useTranslation } from "react-i18next"
import { Store } from "lucide-react"
import { PublicNavbar, PUBLIC_NAV_LINKS } from "./PublicNavbar"
import "../styles/DesktopLanding.css"

export function PublicPageShell({
  setView,
  onLogin,
  onSignUp,
  children
}) {
  const { t } = useTranslation()

  const handleNavClick = (id) => {
    if (id === "pricing" || id === "contact") {
      if (setView) setView(id)
      return
    }
    if (setView) {
      setView("dashboard")
      setTimeout(() => {
        const target = document.getElementById(`dl-${id}`)
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 100)
    }
  }

  return (
    <div className="dl-page dl-public-shell">
      <PublicNavbar
        onLogin={onLogin}
        onSignUp={onSignUp}
        onNavigate={setView}
        scrolled={true}
      />

      <main className="dl-public-content">
        {children}
      </main>

      <footer className="dl-footer">
        <div className="dl-container dl-footer-inner">
          <div className="dl-footer-brand">
            <img src="/logo-white.png" alt="Slipzen" />
            <span>{t("landing.tagline", "The digital receipt book")}</span>
          </div>
          <nav aria-label={t("shell.ariaFooterNav", "Footer navigation")}>
            {PUBLIC_NAV_LINKS.map((link) => (
              <button key={link.id} type="button" onClick={() => handleNavClick(link.id)}>
                {t(link.key, link.defaultLabel)}
              </button>
            ))}
            <button type="button" onClick={onLogin}>{t("landing.logIn", "Log in")}</button>
            <button type="button" onClick={onSignUp}>{t("landing.getStarted", "Sign up")}</button>
          </nav>
        </div>
        <div className="dl-container dl-footer-legal">
          <span><Store size={13} /> © {new Date().getFullYear()} {t("landing.rights", "Slipzen. All rights reserved.")}</span>
        </div>
      </footer>
    </div>
  )
}
export default PublicPageShell
