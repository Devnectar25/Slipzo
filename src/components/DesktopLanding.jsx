import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  ArrowRight, Printer, ScanBarcode, UtensilsCrossed, BarChart3, Users, MonitorSmartphone,
  ShoppingBasket, Shirt, Coffee, Store, Zap, Receipt, Languages, LayoutTemplate, FileCheck2, AlertTriangle
} from "lucide-react"
import { PublicNavbar, PUBLIC_NAV_LINKS } from "./PublicNavbar"
import "../styles/DesktopLanding.css"

const FEATURE_DEFS = [
  {
    icon: Printer,
    titleKey: "landing.featPrintTitle",
    defaultTitle: "Print anywhere",
    textKey: "landing.featPrintDesc",
    defaultText: "Print directly to any 58mm or 80mm thermal printer, or A4 paper. Or share the bill on WhatsApp.",
  },
  {
    icon: ScanBarcode,
    titleKey: "landing.featBarcodeTitle",
    defaultTitle: "Barcode & inventory",
    textKey: "landing.featBarcodeDesc",
    defaultText: "Look up products instantly with a camera or USB scanner, and get low-stock alerts before your top items run out.",
  },
  {
    icon: UtensilsCrossed,
    titleKey: "landing.featTablesTitle",
    defaultTitle: "Tables & kitchen orders",
    textKey: "landing.featTablesDesc",
    defaultText: "Track occupied, vacant and billing tables live, and send Kitchen Order Tickets (KOT) without running around.",
  },
  {
    icon: BarChart3,
    titleKey: "landing.featSalesTitle",
    defaultTitle: "Know your sales",
    textKey: "landing.featSalesDesc",
    defaultText: "Watch UPI vs cash collections, the hourly sales rush and customer balances (Udhar) with no manual bookkeeping.",
  },
  {
    icon: Users,
    titleKey: "landing.featStaffTitle",
    defaultTitle: "Share with your staff",
    textKey: "landing.featStaffDesc",
    defaultText: "Invite workers with a private code. They can bill and print for your shop, while settings and plans stay with you.",
  },
  {
    icon: MonitorSmartphone,
    titleKey: "landing.featDeviceTitle",
    defaultTitle: "Works on any device",
    textKey: "landing.featDeviceDesc",
    defaultText: "Bill on Android phones, counter PCs and thermal printers. Offline billing keeps your store running non-stop.",
  },
]

const SHOPS = [
  {
    icon: ShoppingBasket,
    title: "Kirana & Grocery",
    text: "Atta, rice, dal, oils and masalas, ready to add.",
    tags: ["Atta & Flour", "Rice", "Dal & Pulses", "Oil & Ghee", "Spices & Masala", "Snacks"],
  },
  {
    icon: Shirt,
    title: "Clothing & Garments",
    text: "Shirts, kurtis, jeans and more, grouped the way you sell.",
    tags: ["Men's Wear", "Women's Wear", "Kids Wear", "Jackets & Winterwear"],
  },
  {
    icon: UtensilsCrossed,
    title: "Hotel & Restaurant",
    text: "Full menus with table billing and kitchen tickets built in.",
    tags: ["Starters", "Main Course", "Breads & Tandoor", "Biryani & Rice", "Thalis & Meals", "Desserts & Drinks"],
  },
  {
    icon: Coffee,
    title: "Tea, Cafe & Small Business",
    text: "Chai, coffee, tiffin and street food, one tap each.",
    tags: ["Tea & Chai Tapri", "Coffee & Cafe Drinks", "South Indian Tiffin", "Street Food & Chaat"],
  },
]

const STEP_DEFS = [
  {
    titleKey: "landing.step1Title",
    defaultTitle: "Create your account",
    textKey: "landing.step1Desc",
    defaultText: "Sign up and enter your shop details once. They appear on every receipt.",
  },
  {
    titleKey: "landing.step2Title",
    defaultTitle: "Add your items",
    textKey: "landing.step2Desc",
    defaultText: "Pick from a ready-made menu for your kind of shop, or add your own products.",
  },
  {
    titleKey: "landing.step3Title",
    defaultTitle: "Bill and print",
    textKey: "landing.step3Desc",
    defaultText: "Tap items, choose how the customer pays, then print the receipt or share it.",
  },
]

function HeroStage() {
  const { t } = useTranslation()
  return (
    <div className="dl-stage" aria-hidden="true">
      <div className="dl-stage-glow" />

      <div className="dl-receipt">
        <div className="dl-receipt-head">
          <div>
            <div className="dl-receipt-brand">SLIPZEN POS</div>
            <div className="dl-receipt-bill">{t("landing.mockBill", "Bill #SZ-1082")}</div>
          </div>
          <span className="dl-paid">{t("landing.mockPaid", "PAID")}</span>
        </div>
        <div className="dl-receipt-rows">
          <div><span><b>2x</b> {t("landing.mockChai", "Masala Chai")}</span><span>₹40.00</span></div>
          <div><span><b>3x</b> {t("landing.mockSamosa", "Fresh Samosa")}</span><span>₹60.00</span></div>
          <div><span><b>1x</b> {t("landing.mockCoffee", "Cold Coffee")}</span><span>₹80.00</span></div>
        </div>
        <div className="dl-receipt-total">
          <span>{t("landing.mockTotal", "Total Amount")}</span>
          <strong>₹180.00</strong>
        </div>
      </div>

      <div className="dl-chip dl-chip-dark">
        <Printer size={13} /> {t("landing.mockReady", "58mm / 80mm Ready")}
      </div>
      <div className="dl-chip dl-chip-green">
        <Zap size={13} /> {t("landing.mockLightning", "0.2s Lightning Print")}
      </div>

      <div className="dl-scan">
        <div className="dl-scan-bars">
          <i className="dl-laser" />
        </div>
        <div className="dl-scan-row">
          <span>{t("landing.mockMaggi", "Maggi Noodles 70g")}</span>
          <b>₹14.00</b>
        </div>
        <span className="dl-stock"><AlertTriangle size={11} /> {t("landing.mockLow", "Only 3 left")}</span>
      </div>

      <div className="dl-tables">
        <div className="dl-table dl-table-busy"><b>T-01</b><span>{t("landing.mockGuests", "4 Guests")}</span></div>
        <div className="dl-table dl-table-bill"><b>T-02</b><span>{t("landing.mockBilling", "Billing")}</span></div>
      </div>
    </div>
  )
}

export function DesktopLanding({ onLogin, onSignUp, onNavigate }) {
  const { t } = useTranslation()
  const pageRef = useRef(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const el = pageRef.current
    if (!el) return undefined
    const onScroll = () => setScrolled(el.scrollTop > 12)
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [])

  const goTo = (id) => {
    if (id === "pricing" || id === "contact") {
      if (onNavigate) onNavigate(id)
      return
    }
    const target = document.getElementById(`dl-${id}`)
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" })
    } else if (onNavigate) {
      onNavigate(id)
    }
  }

  const highlights = [
    { icon: Printer, text: t("landing.paperSizes", "58mm, 80mm & A4") },
    { icon: FileCheck2, text: t("landing.gstNonGst", "GST & Non-GST") },
    {
      icon: Languages,
      text: t("landing.languages", "English, Hindi & Marathi"),
    },
  ]

  const facts = [
    { value: "4", label: t("landing.menusFact", "ready-made shop menus") },
    { value: "6", label: t("landing.templatesFact", "receipt templates") },
    { value: "3", label: t("landing.languagesFact", "languages") },
    { value: "3", label: t("landing.paperSizesFact", "paper sizes: 58mm, 80mm, A4") },
  ]

  return (
    <div className="dl-page" ref={pageRef}>
      <PublicNavbar
        onLogin={onLogin}
        onSignUp={onSignUp}
        onNavigate={goTo}
        scrolled={scrolled}
      />

      <main>
        <section className="dl-hero">
          <div className="dl-container dl-hero-grid">
            <div className="dl-hero-copy">
              <span className="dl-eyebrow">
                <Receipt size={14} /> {t("landing.smartBillingDesk", "SMART BILLING DESK")}
              </span>
              <h1>
                {t("landing.heroTitle", "Create bills in seconds,")}<br />
                <em>{t("landing.heroTitleAccent", "print anywhere.")}</em>
              </h1>
              <p>
                {t(
                  "landing.heroSubtitle",
                  "Generate GST and Non-GST invoices in a single tap. Print straight to any 58mm or 80mm thermal printer, or share the bill on WhatsApp. A calm, quick billing desk for the shops that keep communities moving."
                )}
              </p>
              <div className="dl-hero-actions">
                <button type="button" className="dl-btn dl-btn-primary dl-btn-lg" onClick={onSignUp}>
                  {t("landing.createAccount", "Create your account")} <ArrowRight size={18} />
                </button>
                <button type="button" className="dl-btn dl-btn-outline dl-btn-lg" onClick={onLogin}>
                  {t("landing.logIn", "Log in")}
                </button>
              </div>
              <ul className="dl-highlights">
                {highlights.map(({ icon: Icon, text }) => (
                  <li key={text}>
                    <span><Icon size={14} /></span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
            <HeroStage />
          </div>
        </section>

        <section className="dl-facts" aria-label={t("landing.glance", "At a glance")}>
          <div className="dl-container dl-facts-grid">
            {facts.map((fact) => (
              <div key={fact.label}>
                <strong>{fact.value}</strong>
                <span>{fact.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="dl-section" id="dl-features">
          <div className="dl-container">
            <div className="dl-section-head">
              <span className="dl-kicker">{t("landing.featuresKicker", "FEATURES")}</span>
              <h2>{t("landing.featuresHeading", "Everything a busy counter needs")}</h2>
              <p>{t("landing.featuresSub", "From the first bill to the end-of-day sales, in one simple app.")}</p>
            </div>
            <div className="dl-feature-grid">
              {FEATURE_DEFS.map(({ icon: Icon, titleKey, defaultTitle, textKey, defaultText }) => (
                <article key={titleKey} className="dl-feature">
                  <span className="dl-feature-icon"><Icon size={22} /></span>
                  <h3>{t(titleKey, defaultTitle)}</h3>
                  <p>{t(textKey, defaultText)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="dl-section dl-section-tint" id="dl-shops">
          <div className="dl-container">
            <div className="dl-section-head">
              <span className="dl-kicker">{t("landing.whoKicker", "WHO IT'S FOR")}</span>
              <h2>{t("landing.whoHeading", "Made for the shops you walk past every day")}</h2>
              <p>{t("landing.whoSub", "Start from a ready-made menu for your kind of business, then change anything you like.")}</p>
            </div>
            <div className="dl-shop-grid">
              {SHOPS.map(({ icon: Icon, title, text, tags }, shopIndex) => (
                <article key={title} className="dl-shop">
                  <span className="dl-shop-icon"><Icon size={22} /></span>
                  <h3>{t(`landing.shop${shopIndex}.title`, title)}</h3>
                  <p>{t(`landing.shop${shopIndex}.text`, text)}</p>
                  <div className="dl-tags">
                    {tags.map((tag, tagIndex) => <span key={tag}>{t(`landing.shop${shopIndex}.tag${tagIndex}`, tag)}</span>)}
                  </div>
                </article>
              ))}
            </div>
            <p className="dl-templates-note">
              <LayoutTemplate size={16} /> {t("landing.templatesNote", "Six receipt templates to choose from: Classic, Minimal, Shop Pro, Eco, Modern and Business Elite.")}
            </p>
          </div>
        </section>

        <section className="dl-section" id="dl-how">
          <div className="dl-container">
            <div className="dl-section-head">
              <span className="dl-kicker">{t("landing.howKicker", "HOW IT WORKS")}</span>
              <h2>{t("landing.howHeading", "Up and billing in three steps")}</h2>
            </div>
            <ol className="dl-steps">
              {STEP_DEFS.map((step, index) => (
                <li key={step.titleKey}>
                  <span className="dl-step-num">{index + 1}</span>
                  <h3>{t(step.titleKey, step.defaultTitle)}</h3>
                  <p>{t(step.textKey, step.defaultText)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="dl-cta">
          <div className="dl-container">
            <div className="dl-cta-card">
              <h2>
                {t("landing.ctaHeading", "Make every sale")}{" "}
                <em>{t("landing.ctaHeadingAccent", "feel effortless.")}</em>
              </h2>
              <p>{t("landing.ctaSubtitle", "Prints never expire, so you only pay for what you use.")}</p>
              <div className="dl-hero-actions dl-cta-actions">
                <button type="button" className="dl-btn dl-btn-light dl-btn-lg" onClick={onSignUp}>
                  {t("landing.createAccount", "Create your account")} <ArrowRight size={18} />
                </button>
                <button type="button" className="dl-btn dl-btn-ghost-light dl-btn-lg" onClick={onLogin}>
                  {t("landing.logIn", "Log in")}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="dl-footer">
        <div className="dl-container dl-footer-inner">
          <div className="dl-footer-brand">
            <img src="/logo-white.png" alt="Slipzen" />
            <span>{t("landing.tagline", "The digital receipt book")}</span>
          </div>
          <nav aria-label={t("landing.ariaFooter", "Footer")}>
            {PUBLIC_NAV_LINKS.map((link) => (
              <button key={link.id} type="button" onClick={() => goTo(link.id)}>
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
export default DesktopLanding
