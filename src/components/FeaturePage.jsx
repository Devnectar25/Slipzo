import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { ArrowRight, ArrowLeft, Check, Ticket, Boxes, MonitorCheck, Sparkles, ShieldCheck, Zap, TrendingUp, ScanBarcode, Printer, AlertTriangle } from "lucide-react"
import { FEATURE_PAGES } from "../lib/featurePages"
import "../styles/FeaturePages.css"

export const FEATURE_ICONS = { token: Ticket, inventory: Boxes, pos: MonitorCheck }
const BENEFIT_ICONS = [ShieldCheck, Zap, TrendingUp]

// ---------- the small picture on the right of each hero ----------
function TokenVisual({ t }) {
  return (
    <div className="fp-visual fp-visual-token" aria-hidden="true">
      <div className="fp-ticket">
        <span className="fp-ticket-shop">CHAI CORNER</span>
        <span className="fp-ticket-label">{t("featurePages.token.visualLabel", "YOUR ORDER NUMBER")}</span>
        <strong className="fp-ticket-no">042</strong>
        <span className="fp-ticket-line" />
        <div className="fp-ticket-row"><span>2 × Masala Chai</span><b>₹40</b></div>
        <div className="fp-ticket-row"><span>1 × Vada Pav</span><b>₹25</b></div>
        <div className="fp-ticket-total"><span>{t("featurePages.token.visualTotal", "Paid · UPI")}</span><b>₹65</b></div>
      </div>
      <div className="fp-queue">
        <span className="fp-queue-title">{t("featurePages.token.visualNow", "Now serving")}</span>
        <div className="fp-queue-row now"><b>042</b><span>{t("featurePages.token.visualReady", "Ready")}</span></div>
        <div className="fp-queue-row"><b>043</b><span>{t("featurePages.token.visualPreparing", "Preparing")}</span></div>
        <div className="fp-queue-row"><b>044</b><span>{t("featurePages.token.visualPreparing", "Preparing")}</span></div>
      </div>
    </div>
  )
}

function InventoryVisual({ t }) {
  const rows = [
    ["Basmati Rice 1kg", 46, "ok"],
    ["Aashirvaad Atta 5kg", 5, "low"],
    ["Tata Salt 1kg", 0, "out"],
    ["Lux Soap", 28, "ok"]
  ]
  const label = (n, lvl) => lvl === "out"
    ? t("stock.outOfStock", "Out of stock")
    : lvl === "low" ? t("stock.lowCount", "Low: {{n}} left", { n }) : t("stock.countShort", "{{n}} in stock", { n })
  return (
    <div className="fp-visual fp-visual-inventory" aria-hidden="true">
      <div className="fp-panel">
        <div className="fp-panel-head">
          <span><Boxes size={14} /> {t("featurePages.inventory.visualTitle", "Stock")}</span>
          <span className="fp-panel-chip">{t("featurePages.inventory.visualValue", "₹48,250 in stock")}</span>
        </div>
        {rows.map(([name, n, lvl]) => (
          <div key={name} className="fp-stock-row">
            <span className="fp-stock-name">{name}</span>
            <span className={`fp-stock-pill ${lvl}`}>{label(n, lvl)}</span>
          </div>
        ))}
      </div>
      <div className="fp-float fp-float-alert">
        <AlertTriangle size={15} />
        <span>{t("featurePages.inventory.visualAlert", "Atta is running low. Reorder now.")}</span>
      </div>
    </div>
  )
}

function PosVisual({ t }) {
  return (
    <div className="fp-visual fp-visual-pos" aria-hidden="true">
      <div className="fp-panel fp-pos">
        <div className="fp-panel-head">
          <span><MonitorCheck size={14} /> {t("featurePages.pos.visualTitle", "New bill")}</span>
          <span className="fp-panel-chip"><ScanBarcode size={12} /> {t("featurePages.pos.visualScan", "Scan")}</span>
        </div>
        <div className="fp-pos-items">
          {[["Cold Coffee", 2, 90], ["Veg Sandwich", 1, 70], ["Brownie", 1, 80]].map(([n, q, r]) => (
            <div key={n} className="fp-pos-item">
              <span>{n}</span>
              <span className="fp-pos-qty">× {q}</span>
              <b>₹{q * r}</b>
            </div>
          ))}
        </div>
        <div className="fp-pos-pay">
          <span className="active">UPI</span><span>Cash</span><span>Card</span>
        </div>
        <div className="fp-pos-total"><span>{t("featurePages.pos.visualTotal", "Total")}</span><b>₹330</b></div>
        <div className="fp-pos-print"><Printer size={15} /> {t("featurePages.pos.visualPrint", "Print receipt")}</div>
      </div>
    </div>
  )
}

const VISUALS = { token: TokenVisual, inventory: InventoryVisual, pos: PosVisual }

/**
 * A product page (Token system / Inventory management / Point of Sale).
 * onSignUp: the main button; onOpenPage(view): another feature page; onBack: back to the home page.
 */
export function FeaturePage({ page, onSignUp, onLogin, onOpenPage, onBack, signedIn = false }) {
  const { t } = useTranslation()
  const rootRef = useRef(null)
  const k = (key, en, opts) => t(`featurePages.${page.id}.${key}`, en, opts)
  const Visual = VISUALS[page.id]
  const Icon = FEATURE_ICONS[page.id]

  // start at the top, and fade sections in as they scroll into view
  useEffect(() => {
    window.scrollTo(0, 0)
    document.querySelectorAll(".dl-public-shell, .dl-public-content, .fp-page").forEach((el) => { el.scrollTop = 0 })
    const root = rootRef.current
    if (!root) return undefined
    const targets = root.querySelectorAll("[data-fp-reveal]")
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (reduce || typeof IntersectionObserver === "undefined") {
      targets.forEach((el) => el.classList.add("fp-in"))
      return undefined
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("fp-in"); io.unobserve(e.target) } })
    }, { threshold: 0.12 })
    targets.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [page.id])

  const others = FEATURE_PAGES.filter((p) => p.id !== page.id)

  return (
    <div className={`fp-page fp-tone-${page.tone}`} ref={rootRef} data-testid={`feature-page-${page.id}`}>
      {/* ---------- hero ---------- */}
      <section className="fp-hero">
        <span className="fp-hero-glow" aria-hidden="true" />
        <div className="fp-container fp-hero-inner">
          <div className="fp-hero-copy">
            {onBack && (
              <button type="button" className="fp-back" onClick={onBack} data-testid="feature-back">
                <ArrowLeft size={15} /> {t("featurePages.back", "Back to home")}
              </button>
            )}
            <span className="fp-eyebrow"><Icon size={14} /> {k("eyebrow", page.hero.eyebrow)}</span>
            <h1>
              {k("heroTitle", page.hero.title)}<br />
              <em>{k("heroAccent", page.hero.accent)}</em>
            </h1>
            <p>{k("heroSub", page.hero.sub)}</p>
            <div className="fp-hero-actions">
              <button type="button" className="fp-btn fp-btn-primary" onClick={onSignUp} data-testid="feature-cta">
                {signedIn ? t("featurePages.openApp", "Open Slipzen") : t("featurePages.startFree", "Create your account")} <ArrowRight size={17} />
              </button>
              {!signedIn && onLogin && (
                <button type="button" className="fp-btn fp-btn-ghost" onClick={onLogin}>
                  {t("landing.logIn", "Log in")}
                </button>
              )}
            </div>
          </div>
          {Visual && <Visual t={t} />}
        </div>
      </section>

      {/* ---------- what it is ---------- */}
      <section className="fp-section">
        <div className="fp-container fp-what" data-fp-reveal>
          <div className="fp-what-text">
            <span className="fp-kicker">{t("featurePages.kickerWhat", "THE BASICS")}</span>
            <h2>{k("whatTitle", page.what.title)}</h2>
            <p>{k("whatText", page.what.text)}</p>
          </div>
          <ul className="fp-points">
            {page.what.points.map((en, i) => (
              <li key={i}>
                <span className="fp-point-tick"><Check size={14} strokeWidth={3} /></span>
                {k(`point${i}`, en)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section className="fp-section fp-section-tint">
        <div className="fp-container">
          <div className="fp-head" data-fp-reveal>
            <span className="fp-kicker">{t("featurePages.kickerHow", "HOW IT WORKS")}</span>
            <h2>{t("featurePages.howTitle", "Three simple steps")}</h2>
          </div>
          <ol className="fp-steps">
            {page.steps.map(([title, text], i) => (
              <li key={i} className="fp-step" data-fp-reveal style={{ "--fp-delay": `${i * 90}ms` }}>
                <span className="fp-step-num">{i + 1}</span>
                <h3>{k(`step${i}Title`, title)}</h3>
                <p>{k(`step${i}Text`, text)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- who it is for ---------- */}
      <section className="fp-section">
        <div className="fp-container">
          <div className="fp-head" data-fp-reveal>
            <span className="fp-kicker">{t("featurePages.kickerWho", "WHO IT IS FOR")}</span>
            <h2>{k("whoTitle", "Businesses it is made for")}</h2>
            <p>{t("featurePages.whoSub", "From a single counter to a busy shop floor.")}</p>
          </div>
          <div className="fp-biz-grid">
            {page.businesses.map(([emoji, name, text], i) => (
              <article key={i} className="fp-biz" data-fp-reveal style={{ "--fp-delay": `${(i % 3) * 80}ms` }}>
                <span className="fp-biz-emoji" aria-hidden="true">{emoji}</span>
                <h3>{k(`biz${i}Name`, name)}</h3>
                <p>{k(`biz${i}Text`, text)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- why it helps ---------- */}
      <section className="fp-section fp-section-tint">
        <div className="fp-container">
          <div className="fp-head" data-fp-reveal>
            <span className="fp-kicker">{t("featurePages.kickerWhy", "WHY SHOPS LOVE IT")}</span>
            <h2>{t("featurePages.whyTitle", "Built for the everyday rush")}</h2>
          </div>
          <div className="fp-benefits">
            {page.benefits.map(([title, text], i) => {
              const BIcon = BENEFIT_ICONS[i] || Sparkles
              return (
                <article key={i} className="fp-benefit" data-fp-reveal style={{ "--fp-delay": `${i * 90}ms` }}>
                  <span className="fp-benefit-icon"><BIcon size={20} /></span>
                  <h3>{k(`benefit${i}Title`, title)}</h3>
                  <p>{k(`benefit${i}Text`, text)}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* ---------- the other two pages + call to action ---------- */}
      <section className="fp-section">
        <div className="fp-container">
          <div className="fp-cta" data-fp-reveal>
            <div>
              <h2>{t("featurePages.ctaTitle", "Ready to make billing effortless?")}</h2>
              <p>{t("featurePages.ctaSub", "Set up your shop in a few minutes. Works on phone, tablet and computer.")}</p>
            </div>
            <button type="button" className="fp-btn fp-btn-primary" onClick={onSignUp}>
              {signedIn ? t("featurePages.openApp", "Open Slipzen") : t("featurePages.startFree", "Create your account")} <ArrowRight size={17} />
            </button>
          </div>

          <div className="fp-more">
            <span className="fp-more-title">{t("featurePages.alsoIn", "Also in Slipzen")}</span>
            <div className="fp-more-grid">
              {others.map((p) => {
                const OIcon = FEATURE_ICONS[p.id]
                return (
                  <button key={p.id} type="button" className={`fp-more-card fp-tone-${p.tone}`} onClick={() => onOpenPage?.(p.view)} data-testid={`feature-more-${p.id}`}>
                    <span className="fp-more-icon"><OIcon size={18} /></span>
                    <span className="fp-more-text">
                      <b>{t(`featurePages.${p.id}.cardTitle`, p.card.title)}</b>
                      <span>{t(`featurePages.${p.id}.cardText`, p.card.text)}</span>
                    </span>
                    <ArrowRight size={16} className="fp-more-arrow" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default FeaturePage
