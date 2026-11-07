import { useEffect, useRef, useState } from "react"
import {
  ArrowRight, Check, Printer, ScanBarcode, UtensilsCrossed, BarChart3, Users, MonitorSmartphone,
  ShoppingBasket, Shirt, Coffee, Store, Zap, Receipt, Languages, LayoutTemplate, FileCheck2, AlertTriangle
} from "lucide-react"
import "../styles/DesktopLanding.css"

const NAV_LINKS = [
  { id: "features", label: "Features" },
  { id: "shops", label: "Who it's for" },
  { id: "how", label: "How it works" },
]

const HIGHLIGHTS = [
  { icon: Printer, text: "58mm, 80mm & A4" },
  { icon: FileCheck2, text: "GST & Non-GST" },
  { icon: Languages, text: "English, Hindi & Marathi" },
]

const FEATURES = [
  {
    icon: Printer,
    title: "Print anywhere",
    text: "Print directly to any 58mm or 80mm thermal printer, or A4 paper. Or share the bill on WhatsApp.",
  },
  {
    icon: ScanBarcode,
    title: "Barcode & inventory",
    text: "Look up products instantly with a camera or USB scanner, and get low-stock alerts before your top items run out.",
  },
  {
    icon: UtensilsCrossed,
    title: "Tables & kitchen orders",
    text: "Track occupied, vacant and billing tables live, and send Kitchen Order Tickets (KOT) without running around.",
  },
  {
    icon: BarChart3,
    title: "Know your sales",
    text: "Watch UPI vs cash collections, the hourly sales rush and customer balances (Udhar) with no manual bookkeeping.",
  },
  {
    icon: Users,
    title: "Share with your staff",
    text: "Invite workers with a private code. They can bill and print for your shop, while settings and plans stay with you.",
  },
  {
    icon: MonitorSmartphone,
    title: "Works on any device",
    text: "Bill on Android phones, counter PCs and thermal printers. Offline billing keeps your store running non-stop.",
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

const STEPS = [
  { title: "Create your account", text: "Sign up and enter your shop details once. They appear on every receipt." },
  { title: "Add your items", text: "Pick from a ready-made menu for your kind of shop, or add your own products." },
  { title: "Bill and print", text: "Tap items, choose how the customer pays, then print the receipt or share it." },
]

const FACTS = [
  { value: "4", label: "ready-made shop menus" },
  { value: "6", label: "receipt templates" },
  { value: "3", label: "languages" },
  { value: "3", label: "paper sizes: 58mm, 80mm, A4" },
]

function HeroStage() {
  return (
    <div className="dl-stage" aria-hidden="true">
      <div className="dl-stage-glow" />

      <div className="dl-receipt">
        <div className="dl-receipt-head">
          <div>
            <div className="dl-receipt-brand">SLIPZEN POS</div>
            <div className="dl-receipt-bill">Bill #SZ-1082</div>
          </div>
          <span className="dl-paid">PAID</span>
        </div>
        <div className="dl-receipt-rows">
          <div><span><b>2x</b> Masala Chai</span><span>₹40.00</span></div>
          <div><span><b>3x</b> Fresh Samosa</span><span>₹60.00</span></div>
          <div><span><b>1x</b> Cold Coffee</span><span>₹80.00</span></div>
        </div>
        <div className="dl-receipt-total">
          <span>Total Amount</span>
          <strong>₹180.00</strong>
        </div>
      </div>

      <div className="dl-chip dl-chip-dark">
        <Printer size={13} /> 58mm / 80mm Ready
      </div>
      <div className="dl-chip dl-chip-green">
        <Zap size={13} /> 0.2s Lightning Print
      </div>

      <div className="dl-scan">
        <div className="dl-scan-bars">
          <i className="dl-laser" />
        </div>
        <div className="dl-scan-row">
          <span>Maggi Noodles 70g</span>
          <b>₹14.00</b>
        </div>
        <span className="dl-stock"><AlertTriangle size={11} /> Only 3 left</span>
      </div>

      <div className="dl-tables">
        <div className="dl-table dl-table-busy"><b>T-01</b><span>4 Guests</span></div>
        <div className="dl-table dl-table-bill"><b>T-02</b><span>Billing</span></div>
      </div>
    </div>
  )
}

export function DesktopLanding({ onLogin, onSignUp }) {
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
    document.getElementById(`dl-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className="dl-page" ref={pageRef}>
      <header className={`dl-nav ${scrolled ? "dl-nav-scrolled" : ""}`}>
        <div className="dl-container dl-nav-inner">
          <img src="/logo.png" alt="Slipzen" className="dl-logo" />
          <nav className="dl-nav-links" aria-label="Page sections">
            {NAV_LINKS.map((link) => (
              <button key={link.id} type="button" onClick={() => goTo(link.id)}>{link.label}</button>
            ))}
          </nav>
          <div className="dl-nav-actions">
            <button type="button" className="dl-btn dl-btn-ghost" onClick={onLogin}>Log in</button>
            <button type="button" className="dl-btn dl-btn-primary" onClick={onSignUp}>Get started</button>
          </div>
        </div>
      </header>

      <main>
        <section className="dl-hero">
          <div className="dl-container dl-hero-grid">
            <div className="dl-hero-copy">
              <span className="dl-eyebrow"><Receipt size={14} /> SMART BILLING DESK</span>
              <h1>
                Create bills in seconds,<br />
                <em>print anywhere.</em>
              </h1>
              <p>
                Generate GST and Non-GST invoices in a single tap. Print straight to any 58mm or 80mm thermal
                printer, or share the bill on WhatsApp. A calm, quick billing desk for the shops that keep
                communities moving.
              </p>
              <div className="dl-hero-actions">
                <button type="button" className="dl-btn dl-btn-primary dl-btn-lg" onClick={onSignUp}>
                  Create your account <ArrowRight size={18} />
                </button>
                <button type="button" className="dl-btn dl-btn-outline dl-btn-lg" onClick={onLogin}>Log in</button>
              </div>
              <ul className="dl-highlights">
                {HIGHLIGHTS.map(({ icon: Icon, text }) => (
                  <li key={text}><span><Icon size={14} /></span>{text}</li>
                ))}
              </ul>
            </div>
            <HeroStage />
          </div>
        </section>

        <section className="dl-facts" aria-label="At a glance">
          <div className="dl-container dl-facts-grid">
            {FACTS.map((fact) => (
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
              <span className="dl-kicker">FEATURES</span>
              <h2>Everything a busy counter needs</h2>
              <p>From the first bill to the end-of-day sales, in one simple app.</p>
            </div>
            <div className="dl-feature-grid">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <article key={title} className="dl-feature">
                  <span className="dl-feature-icon"><Icon size={22} /></span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="dl-section dl-section-tint" id="dl-shops">
          <div className="dl-container">
            <div className="dl-section-head">
              <span className="dl-kicker">WHO IT'S FOR</span>
              <h2>Made for the shops you walk past every day</h2>
              <p>Start from a ready-made menu for your kind of business, then change anything you like.</p>
            </div>
            <div className="dl-shop-grid">
              {SHOPS.map(({ icon: Icon, title, text, tags }) => (
                <article key={title} className="dl-shop">
                  <span className="dl-shop-icon"><Icon size={22} /></span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <div className="dl-tags">
                    {tags.map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                </article>
              ))}
            </div>
            <p className="dl-templates-note">
              <LayoutTemplate size={16} /> Six receipt templates to choose from: Classic, Minimal, Shop Pro, Eco, Modern and Business Elite.
            </p>
          </div>
        </section>

        <section className="dl-section" id="dl-how">
          <div className="dl-container">
            <div className="dl-section-head">
              <span className="dl-kicker">HOW IT WORKS</span>
              <h2>Up and billing in three steps</h2>
            </div>
            <ol className="dl-steps">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <span className="dl-step-num">{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="dl-cta">
          <div className="dl-container">
            <div className="dl-cta-card">
              <h2>Make every sale <em>feel effortless.</em></h2>
              <p>Prints never expire, so you only pay for what you use.</p>
              <div className="dl-hero-actions dl-cta-actions">
                <button type="button" className="dl-btn dl-btn-light dl-btn-lg" onClick={onSignUp}>
                  Create your account <ArrowRight size={18} />
                </button>
                <button type="button" className="dl-btn dl-btn-ghost-light dl-btn-lg" onClick={onLogin}>Log in</button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="dl-footer">
        <div className="dl-container dl-footer-inner">
          <div className="dl-footer-brand">
            <img src="/logo-white.png" alt="Slipzen" />
            <span>The digital receipt book</span>
          </div>
          <nav aria-label="Footer">
            {NAV_LINKS.map((link) => (
              <button key={link.id} type="button" onClick={() => goTo(link.id)}>{link.label}</button>
            ))}
            <button type="button" onClick={onLogin}>Log in</button>
            <button type="button" onClick={onSignUp}>Sign up</button>
          </nav>
        </div>
        <div className="dl-container dl-footer-legal">
          <span><Store size={13} /> © {new Date().getFullYear()} Slipzen. All rights reserved.</span>
        </div>
      </footer>
    </div>
  )
}
