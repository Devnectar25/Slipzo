import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { FileText, ShieldCheck, Cookie, Mail, MapPin, Clock, ArrowUp, ArrowLeft } from "lucide-react"
import { POLICY_DOCS } from "../lib/policyPages"
import { POLICY_CONTACT, POLICY_EFFECTIVE_DATE, policyContentById } from "../lib/policyContent"
import "../styles/PolicyPage.css"

const ICONS = { terms: FileText, privacy: ShieldCheck, cookies: Cookie }

// One page for all three policies: tabs at the top switch between them (each has its own address)
export function PolicyPage({ doc = "terms", onOpen, onContact, onBack }) {
  const { t, i18n } = useTranslation()
  const current = policyContentById(doc)
  const notEnglish = !String(i18n.language || "en").startsWith("en")

  useEffect(() => {
    document.title = `${current.title} | Slipzen`
    return () => { document.title = "Slipzen" }
  }, [current.title])

  const jumpTo = (id) => {
    const el = document.getElementById(`pp-${current.id}-${id}`)
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const handleBack = () => {
    if (typeof onBack === "function") {
      onBack()
    } else if (typeof onOpen === "function") {
      onOpen("dashboard")
    } else if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back()
    }
  }

  return (
    <div className="pp-page" data-testid="policy-page">
      <header className="pp-hero">
        <div className="pp-wrap">
          <div className="pp-top-actions">
            <button
              type="button"
              className="pp-back-btn"
              onClick={handleBack}
              aria-label={t("common.back", "Back")}
            >
              <ArrowLeft size={16} />
              <span>{t("common.back", "Back")}</span>
            </button>
          </div>

          <p className="pp-eyebrow">{t("legalPages.eyebrow", "SLIPZEN POLICIES")}</p>
          <h1>{current.title}</h1>
          <p className="pp-summary">{current.summary}</p>
          <p className="pp-updated">{t("legalPages.effective", "Effective from")} {POLICY_EFFECTIVE_DATE}</p>

          <nav className="pp-tabs" aria-label={t("legalPages.policies", "Policies")}>
            {POLICY_DOCS.map((d) => {
              const Icon = ICONS[d.id]
              return (
                <button
                  key={d.id}
                  type="button"
                  className={`pp-tab ${d.id === current.id ? "active" : ""}`}
                  aria-current={d.id === current.id ? "page" : undefined}
                  data-testid={`policy-tab-${d.id}`}
                  onClick={() => onOpen?.(d.view)}
                >
                  <Icon size={16} />
                  <span>{t(`legalPages.${d.id}`, d.navLabel)}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Mobile quick-jump horizontal chip bar */}
      <div className="pp-mobile-toc-bar" aria-label={t("legalPages.onThisPage", "Sections")}>
        <div className="pp-wrap">
          <div className="pp-mobile-toc-inner">
            <span className="pp-mobile-toc-title">{t("legalPages.onThisPage", "Sections")}:</span>
            <div className="pp-mobile-toc-chips">
              {current.sections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="pp-mobile-toc-chip"
                  onClick={() => jumpTo(s.id)}
                >
                  {s.h.replace(/^\d+\.\s*/, "")}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="pp-wrap pp-body">
        <nav className="pp-toc" aria-label={t("legalPages.onThisPage", "On this page")}>
          <p>{t("legalPages.onThisPage", "On this page")}</p>
          <ol>
            {current.sections.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => jumpTo(s.id)}>{s.h.replace(/^\d+\.\s*/, "")}</button>
              </li>
            ))}
          </ol>
        </nav>

        <article className="pp-article">
          {notEnglish && (
            <p className="pp-lang-note">
              {t("legalPages.englishOnly", "This policy is available in English. If anything is unclear, contact us and we will explain it in your language.")}
            </p>
          )}
          <p className="pp-intro">{current.intro}</p>

          {current.sections.map((s) => (
            <section key={s.id} id={`pp-${current.id}-${s.id}`} className="pp-section">
              <h2>{s.h}</h2>
              {s.p?.map((text, i) => <p key={i}>{text}</p>)}
              {s.list && (
                <ul>
                  {s.list.map((text, i) => <li key={i}>{text}</li>)}
                </ul>
              )}
              {s.table && (
                <div className="pp-table-wrap">
                  <table className="pp-table">
                    <thead>
                      <tr>{s.table.head.map((h) => <th key={h} scope="col">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {s.table.rows.map((row) => (
                        <tr key={row[0]}>{row.map((cell, i) => <td key={i} data-label={s.table.head[i]}>{cell}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {s.after?.map((text, i) => <p key={i}>{text}</p>)}
            </section>
          ))}

          <div className="pp-contact" data-testid="policy-contact">
            <h2>{t("legalPages.questions", "Questions about this policy?")}</h2>
            <ul>
              <li><Mail size={16} /> <a href={`mailto:${POLICY_CONTACT.email}`}>{POLICY_CONTACT.email}</a></li>
              <li><MapPin size={16} /> {POLICY_CONTACT.address}</li>
              <li><Clock size={16} /> {POLICY_CONTACT.hours}</li>
            </ul>
            {onContact && (
              <button type="button" className="pp-contact-btn" onClick={onContact}>
                {t("legalPages.contactUs", "Contact us")}
              </button>
            )}
          </div>

          <button
            type="button"
            className="pp-top"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <ArrowUp size={14} /> {t("legalPages.backToTop", "Back to top")}
          </button>
        </article>
      </div>
    </div>
  )
}

export default PolicyPage
