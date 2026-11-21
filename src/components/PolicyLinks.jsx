import { useTranslation, Trans } from "react-i18next"
import { POLICY_DOCS } from "../lib/policyPages"
import "../styles/PolicyPage.css"

// Terms · Privacy · Cookies links for footers. They are real links (open in a new tab works),
// but a normal click switches page inside the app without a reload.
export function PolicyLinks({ onOpen, className = "" }) {
  const { t } = useTranslation()
  return (
    <nav className={`pp-links ${className}`} aria-label={t("legalPages.policies", "Policies")}>
      {POLICY_DOCS.map((d) => (
        <a
          key={d.id}
          href={d.path}
          data-testid={`footer-policy-${d.id}`}
          onClick={(e) => {
            if (!onOpen || e.metaKey || e.ctrlKey || e.shiftKey) return
            e.preventDefault()
            onOpen(d.view)
          }}
        >
          {t(`legalPages.${d.id}`, d.navLabel)}
        </a>
      ))}
    </nav>
  )
}

// "Powered by DevNectar" credit for the website footers
export function PoweredBy({ className = "" }) {
  const { i18n } = useTranslation()
  const lang = i18n.language || "en"
  const isDevNectarFirst = lang === "hi" || lang === "mr"

  return (
    <span className={`pp-powered ${className}`}>
      <Trans
        i18nKey="legalPages.poweredBy"
        defaults="Powered by <b>DevNectar</b>"
        components={{
          b: (
            <strong
              style={{
                marginLeft: isDevNectarFirst ? "0" : "0.38rem",
                marginRight: isDevNectarFirst ? "0.38rem" : "0",
                display: "inline-block"
              }}
            />
          )
        }}
      />
    </span>
  )
}

export default PolicyLinks
