import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  ArrowRight, Printer, ScanBarcode, UtensilsCrossed, BarChart3, Users, MonitorSmartphone,
  ShoppingBasket, Shirt, Coffee, Store, Zap, Receipt, Languages, LayoutTemplate, FileCheck2, AlertTriangle,
  Bluetooth, CheckCircle2, Ticket, Boxes, MonitorCheck, Crown, UserRound, PackageCheck, ChefHat, ConciergeBell, Check, UserCheck
} from "lucide-react"
import { PublicNavbar, PUBLIC_NAV_LINKS } from "./PublicNavbar"
import { RealisticReceiptView } from "./RealisticReceiptView"
import "../styles/DesktopLanding.css"
import "../styles/LandingPage.css"

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

const ROLES = {
  owner: { icon: Crown, key: "landing.roleOwner", label: "Owner" },
  cashier: { icon: UserRound, key: "landing.roleCashier", label: "Cashier" },
  stock: { icon: PackageCheck, key: "landing.roleStock", label: "Stock keeper" },
  sales: { icon: UserCheck, key: "landing.roleSales", label: "Sales staff" },
  manager: { icon: Crown, key: "landing.roleManager", label: "Manager" },
  waiter: { icon: ConciergeBell, key: "landing.roleWaiter", label: "Waiter" },
  cook: { icon: ChefHat, key: "landing.roleCook", label: "Cook" },
  counter: { icon: UserRound, key: "landing.roleCounter", label: "Counter staff" },
}

// Each shop shows one of the hero's sample bills (by slide id), who works with it, and what it gets
const SHOPS = [
  {
    icon: ShoppingBasket,
    tone: "amber",
    title: "Kirana & Grocery",
    text: "Atta, rice, dal, oils and masalas, ready to add.",
    bill: "kirana",
    template: "classic",
    roles: ["owner", "cashier", "stock"],
    blurb: ["landing.blurbKirana", "Bill a full basket in seconds: scan the packet, the item and price appear, and the receipt prints at once."],
    feats: [
      ["landing.sfBarcode", "Barcode scanning at the counter"],
      ["landing.sfLabels", "Print barcode labels"],
      ["landing.sfCatalogGrocery", "Ready-made grocery catalog"],
      ["landing.sfInventory", "Inventory with low-stock alerts"],
      ["landing.sfPayModes", "Cash, UPI or card on every bill"],
      ["landing.sfHistory", "Bill history and one-tap reprint"],
    ],
  },
  {
    icon: Shirt,
    tone: "rose",
    title: "Clothing & Garments",
    text: "Shirts, kurtis, jeans and more, grouped the way you sell.",
    bill: "cloth",
    template: "elite",
    roles: ["owner", "sales", "cashier"],
    blurb: ["landing.blurbCloth", "Every piece gets its own barcode tag, so the counter never types a price and every invoice looks professional."],
    feats: [
      ["landing.sfTags", "Barcode tag on every piece"],
      ["landing.sfCategory", "Stock by Men's, Women's & Kids"],
      ["landing.sfA4", "GST tax invoice on A4"],
      ["landing.sfDiscount", "Discounts right on the bill"],
      ["landing.sfStaffCode", "Staff bill with a private access code"],
      ["landing.sfHistory", "Bill history and one-tap reprint"],
    ],
  },
  {
    icon: UtensilsCrossed,
    tone: "orange",
    title: "Hotel & Restaurant",
    text: "Full menus with table billing and kitchen tickets built in.",
    bill: "hotel",
    template: "modern",
    table: "T-02",
    roles: ["manager", "waiter", "cook"],
    blurb: ["landing.blurbHotel", "From the order at the table to the bill at the counter, everyone works on the same live screen."],
    feats: [
      ["landing.sfTables", "Live table status"],
      ["landing.sfTableOrders", "Running order for each table"],
      ["landing.sfKot", "Kitchen order tickets (KOT)"],
      ["landing.sfViews", "Separate view for waiter, manager and cook"],
      ["landing.sfMenuHotel", "Ready-made menu from starters to desserts"],
      ["landing.sfTablePrint", "Print the bill from any table"],
    ],
  },
  {
    icon: Coffee,
    tone: "teal",
    title: "Tea, Cafe & Small Business",
    text: "Chai, coffee, tiffin and street food, one tap each.",
    bill: "tea",
    template: "minimal",
    roles: ["owner", "counter"],
    blurb: ["landing.blurbTea", "Made for the rush hour: tap, print and hand over the bill while the next customer is already ordering."],
    feats: [
      ["landing.sfOneTap", "One-tap billing for every item"],
      ["landing.sfVoice", "Add items by voice"],
      ["landing.sfMenuTea", "Ready-made chai, snacks and tiffin menu"],
      ["landing.sfPocket", "Pocket 58mm Bluetooth printing"],
      ["landing.sfDaily", "Daily sales summary"],
      ["landing.sfWhatsapp", "Share the bill on WhatsApp"],
    ],
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

// What the app covers, shown under the hero text
const MODULES = [
  { icon: Ticket, key: "landing.modToken", label: "Token system" },
  { icon: Boxes, key: "landing.modInventory", label: "Inventory management" },
  { icon: MonitorCheck, key: "landing.modPos", label: "Point of Sale" },
]

// The hero advertisement: a different printer prints a sample bill for each kind of shop, one after another.
// [quantity, translation key, English name, line amount in rupees]
const SLIDES = [
  {
    id: "tea",
    printer: "mini",
    paper: "58mm",
    labelKey: "landing.slideTeaPrinter",
    label: "58mm Bluetooth printer",
    shopKey: "landing.shop3.title",
    shopLabel: "Tea, Cafe & Small Business",
    shopName: "Sharma Tea Point",
    billNo: "SZ-1082",
    pay: "UPI",
    items: [
      [2, "landing.mockChai", "Masala Chai", 40],
      [3, "landing.mockSamosa", "Fresh Samosa", 60],
      [1, "landing.mockCoffee", "Cold Coffee", 80],
    ],
    float: "lightning",
  },
  {
    id: "kirana",
    printer: "counter",
    paper: "80mm",
    labelKey: "landing.slideCounterPrinter",
    label: "80mm counter printer",
    shopKey: "landing.shop0.title",
    shopLabel: "Kirana & Grocery",
    shopName: "Gupta Kirana Store",
    billNo: "SZ-2417",
    pay: "Cash",
    gst: true,
    items: [
      [1, "landing.itemAtta", "Atta 5kg", 245],
      [1, "landing.itemDal", "Toor Dal 1kg", 140],
      [4, "landing.mockMaggi", "Maggi Noodles 70g", 56],
      [1, "landing.itemOil", "Sunflower Oil 1L", 165],
    ],
    float: "scan",
  },
  {
    id: "hotel",
    printer: "counter",
    paper: "80mm",
    labelKey: "landing.slideKitchenPrinter",
    label: "80mm kitchen printer",
    shopKey: "landing.shop2.title",
    shopLabel: "Hotel & Restaurant",
    shopName: "Hotel Annapurna",
    billNo: "T-02 · SZ-3305",
    pay: "UPI",
    items: [
      [1, "landing.itemPaneer", "Paneer Tikka", 220],
      [4, "landing.itemNaan", "Butter Naan", 160],
      [1, "landing.itemBiryani", "Veg Biryani", 240],
    ],
    float: "tables",
  },
  {
    id: "cloth",
    printer: "a4",
    paper: "A4",
    labelKey: "landing.slideA4Printer",
    label: "A4 invoice printer",
    shopKey: "landing.shop1.title",
    shopLabel: "Clothing & Garments",
    shopName: "Style Point Garments",
    billNo: "INV-0519",
    pay: "Card",
    gst: true,
    items: [
      [1, "landing.itemKurti", "Cotton Kurti", 799],
      [1, "landing.itemJeans", "Denim Jeans", 1299],
    ],
    float: "ready",
  },
]

const SLIDE_MS = 5200
const rupees = (n) => `₹${Number(n).toFixed(2)}`

const prefersReducedMotion = () =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)

function SampleReceipt({ slide }) {
  const { t } = useTranslation()
  const subtotal = slide.items.reduce((sum, item) => sum + item[3], 0)
  const tax = slide.gst ? Math.round(subtotal * 0.05 * 100) / 100 : 0
  const total = subtotal + tax

  return (
    <div className={`lp-receipt lp-receipt-${slide.paper === "A4" ? "a4" : slide.paper}`}>
      <div className="lp-receipt-top">
        <b>{slide.shopName}</b>
        <span>{slide.gst ? t("landing.taxInvoice", "Tax Invoice") : t("landing.cashMemo", "Cash Memo")}</span>
      </div>
      <div className="lp-receipt-meta">
        <span>{t("landing.billLabel", "Bill")} #{slide.billNo}</span>
        <span>12:45</span>
      </div>
      <div className="lp-receipt-rows">
        {slide.items.map(([qty, key, name, amount]) => (
          <div key={key}>
            <span><i>{qty}x</i> {t(key, name)}</span>
            <span>{rupees(amount)}</span>
          </div>
        ))}
      </div>
      {slide.gst && (
        <div className="lp-receipt-tax">
          <div><span>{t("landing.subtotal", "Subtotal")}</span><span>{rupees(subtotal)}</span></div>
          <div><span>CGST 2.5% + SGST 2.5%</span><span>{rupees(tax)}</span></div>
        </div>
      )}
      <div className="lp-receipt-total">
        <span>{t("landing.mockTotal", "Total Amount")}</span>
        <strong>{rupees(total)}</strong>
      </div>
      <div className="lp-receipt-foot">
        <span className="lp-receipt-paid"><CheckCircle2 size={11} /> {t("landing.mockPaid", "PAID")} · {slide.pay}</span>
        <span className="lp-receipt-bars" />
        <span className="lp-receipt-thanks">{t("landing.thankYou", "Thank you, visit again!")}</span>
      </div>
    </div>
  )
}

const RECEIPT_ADDRESS = {
  kirana: "Shop 4, Main Bazaar, Pune",
  cloth: "FC Road, Shivajinagar, Pune",
  hotel: "Station Road, Nashik",
  tea: "Near Bus Stand, Satara",
}

// The real receipt the app prints (same component as the bill preview), filled with the shop's sample bill
function ShopReceipt({ slide, template, table }) {
  const { t } = useTranslation()
  const items = slide.items.map(([qty, key, name, amount]) => ({ name: t(key, name), qty, rate: amount / qty, total: amount }))
  const subtotal = items.reduce((sum, it) => sum + it.total, 0)
  // the printed receipt has no separate tax line, so the sample shows exactly what is printed
  const tax = 0
  const receipt = {
    id: template,
    name: template,
    templateId: template,
    previewData: {
      shopName: slide.shopName,
      address: RECEIPT_ADDRESS[slide.id] || "",
      phone: "+91 98765 43210",
      gst: slide.gst ? "27ABCDE1234F1Z5" : "",
      invoiceNo: slide.billNo.replace(/^T-\d+ · /, ""),
      date: "10 Nov 2026, 12:45 PM",
      tableNumber: table || "",
      items,
      subtotal,
      discount: 0,
      taxRate: 0,
      tax,
      total: subtotal + tax,
      payment: slide.pay,
      footer: t("landing.thankYou", "Thank you, visit again!"),
    },
  }
  return (
    <div className="lp-real-receipt" aria-hidden="true">
      <div className="lp-real-receipt-paper">
        <RealisticReceiptView template={receipt} />
      </div>
    </div>
  )
}

function FloatCard({ type }) {
  const { t } = useTranslation()
  if (type === "lightning") {
    return (
      <div className="lp-float lp-float-left lp-float-chip lp-float-green">
        <Zap size={14} /> {t("landing.mockLightning", "0.2s Lightning Print")}
      </div>
    )
  }
  if (type === "scan") {
    return (
      <div className="lp-float lp-float-left lp-float-scan">
        <div className="lp-scan-bars"><i /></div>
        <div className="lp-scan-row">
          <span>{t("landing.mockMaggi", "Maggi Noodles 70g")}</span>
          <b>₹14.00</b>
        </div>
        <span className="lp-scan-stock"><AlertTriangle size={11} /> {t("landing.mockLow", "Only 3 left")}</span>
      </div>
    )
  }
  if (type === "tables") {
    return (
      <div className="lp-float lp-float-left lp-float-tables">
        <div className="lp-table lp-table-busy"><b>T-01</b><span>{t("landing.mockGuests", "4 Guests")}</span></div>
        <div className="lp-table lp-table-bill"><b>T-02</b><span>{t("landing.mockBilling", "Billing")}</span></div>
      </div>
    )
  }
  return (
    <div className="lp-float lp-float-left lp-float-chip lp-float-sky">
      <FileCheck2 size={14} /> {t("landing.gstNonGst", "GST & Non-GST")}
    </div>
  )
}

function PrinterBody({ type }) {
  return (
    <div className={`lp-printer lp-printer-${type}`}>
      <div className="lp-printer-lid">
        <span className="lp-printer-slot" />
      </div>
      <div className="lp-printer-front">
        <span className="lp-printer-brand">THERMAL PRINTER</span>
        <span className="lp-printer-leds">
          {type === "mini" && <Bluetooth size={11} />}
          <i className="lp-led lp-led-busy" />
          <i className="lp-led" />
        </span>
      </div>
      <span className="lp-printer-shadow" />
    </div>
  )
}

function PrinterShowcase() {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduced = useRef(prefersReducedMotion())
  const slide = SLIDES[index]

  useEffect(() => {
    if (paused || reduced.current) return undefined
    const timer = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), SLIDE_MS)
    return () => clearTimeout(timer)
  }, [index, paused])

  return (
    <div
      className="lp-showcase"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="lp-stage" aria-hidden="true">
        <span className="lp-stage-ring" />
        <span className="lp-stage-glow" />

        <div className="lp-chip-ready">
          <Printer size={13} /> {t("landing.mockReady", "58mm / 80mm Ready")}
        </div>

        <div key={slide.id} className={`lp-scene lp-scene-${slide.printer}`}>
          <div className="lp-paper-window">
            <div className="lp-paper-feed">
              <SampleReceipt slide={slide} />
            </div>
          </div>
          <PrinterBody type={slide.printer} />
          <FloatCard type={slide.float} />
          <span className="lp-paper-badge">{slide.paper}</span>
        </div>
      </div>

      <div className="lp-slide-tabs" role="tablist" aria-label={t("landing.printerSamples", "Sample bills")}>
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            className={`lp-slide-tab ${i === index ? "active" : ""} ${paused ? "paused" : ""}`}
            onClick={() => setIndex(i)}
            title={`${t(s.labelKey, s.label)} · ${t(s.shopKey, s.shopLabel)}`}
            style={{ "--lp-slide-ms": `${SLIDE_MS}ms` }}
          >
            <b>{t(s.shopKey, s.shopLabel)}</b>
            <span>{t(s.labelKey, s.label)}</span>
            <i className="lp-slide-progress" />
          </button>
        ))}
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

  // Sections fade up as they scroll into view (everything is visible straight away when motion is reduced)
  useEffect(() => {
    const root = pageRef.current
    if (!root) return undefined
    const targets = root.querySelectorAll("[data-reveal]")
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      targets.forEach((el) => el.classList.add("lp-in"))
      return undefined
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("lp-in")
          io.unobserve(entry.target)
        }
      })
    }, { root, threshold: 0.12 })
    targets.forEach((el) => io.observe(el))
    return () => io.disconnect()
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
    { icon: Languages, text: t("landing.languages", "English, Hindi & Marathi") },
  ]

  return (
    <div className="dl-page lp-page" ref={pageRef}>
      <PublicNavbar
        onLogin={onLogin}
        onSignUp={onSignUp}
        onNavigate={goTo}
        scrolled={scrolled}
      />

      <main>
        {/* ---------- Hero ---------- */}
        <section className="lp-hero">
          <span className="lp-hero-grid-bg" aria-hidden="true" />
          <span className="lp-hero-orb lp-hero-orb-a" aria-hidden="true" />
          <span className="lp-hero-orb lp-hero-orb-b" aria-hidden="true" />
          <div className="dl-container lp-hero-inner">
            <div className="lp-hero-copy">
              <span className="lp-eyebrow">
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
              <div className="lp-hero-actions">
                <button type="button" className="dl-btn dl-btn-primary dl-btn-lg lp-btn-glow" onClick={onSignUp}>
                  {t("landing.createAccount", "Create your account")} <ArrowRight size={18} />
                </button>
                <button type="button" className="dl-btn dl-btn-ghost-light dl-btn-lg" onClick={onLogin}>
                  {t("landing.logIn", "Log in")}
                </button>
              </div>
              <ul className="lp-highlights">
                {highlights.map(({ icon: Icon, text }) => (
                  <li key={text}>
                    <span><Icon size={14} /></span>
                    {text}
                  </li>
                ))}
              </ul>
              <ul className="lp-mini-steps lp-modules">
                {MODULES.map(({ icon: Icon, key, label }) => (
                  <li key={key}>
                    <span><Icon size={14} /></span>
                    <b>{t(key, label)}</b>
                  </li>
                ))}
              </ul>
            </div>
            <PrinterShowcase />
          </div>
        </section>

        {/* ---------- Features ---------- */}
        <section className="lp-section" id="dl-features">
          <div className="dl-container">
            <div className="lp-head" data-reveal>
              <span className="lp-kicker">{t("landing.featuresKicker", "FEATURES")}</span>
              <h2>{t("landing.featuresHeading", "Everything a busy counter needs")}</h2>
              <p>{t("landing.featuresSub", "From the first bill to the end-of-day sales, in one simple app.")}</p>
            </div>
            <div className="lp-feature-grid">
              {FEATURE_DEFS.map(({ icon: Icon, titleKey, defaultTitle, textKey, defaultText }, i) => (
                <article key={titleKey} className="lp-feature" data-reveal style={{ "--lp-delay": `${(i % 3) * 80}ms` }}>
                  <div className="lp-feature-top">
                    <span className="lp-feature-icon"><Icon size={22} /></span>
                    <span className="lp-feature-num">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h3>{t(titleKey, defaultTitle)}</h3>
                  <p>{t(textKey, defaultText)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Who it's for ---------- */}
        <section className="lp-section lp-section-tint" id="dl-shops">
          <div className="dl-container">
            <div className="lp-head" data-reveal>
              <span className="lp-kicker">{t("landing.whoKicker", "WHO IT'S FOR")}</span>
              <h2>{t("landing.whoHeading", "Made for the shops you walk past every day")}</h2>
              <p>{t("landing.whoSub", "Start from a ready-made menu for your kind of business, then change anything you like.")}</p>
            </div>
            <div className="lp-shop-grid">
              {SHOPS.map(({ icon: Icon, tone, title, text, bill, template, table, roles, blurb, feats }, shopIndex) => (
                <article key={title} className={`lp-shop lp-tone-${tone}`} data-reveal style={{ "--lp-delay": `${(shopIndex % 2) * 90}ms` }}>
                  <div className="lp-shop-head">
                    <span className="lp-shop-icon"><Icon size={24} /></span>
                    <div>
                      <h3>{t(`landing.shop${shopIndex}.title`, title)}</h3>
                      <p>{t(`landing.shop${shopIndex}.text`, text)}</p>
                    </div>
                  </div>
                  <div className="lp-shop-main">
                    <ShopReceipt slide={SLIDES.find((sl) => sl.id === bill)} template={template} table={table} />
                    <div className="lp-shop-info">
                      <span className="lp-shop-label">{t("landing.whoUses", "Who uses it")}</span>
                      <div className="lp-roles">
                        {roles.map((r) => {
                          const { icon: RoleIcon, key, label } = ROLES[r]
                          return <span key={r} className="lp-role"><RoleIcon size={13} /> {t(key, label)}</span>
                        })}
                      </div>
                      <p className="lp-shop-blurb">{t(blurb[0], blurb[1])}</p>
                      <span className="lp-shop-label">{t("landing.builtIn", "Built in")}</span>
                      <ul className="lp-shop-feats">
                        {feats.map(([key, label]) => (
                          <li key={key}><span><Check size={11} strokeWidth={3} /></span>{t(key, label)}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <p className="lp-templates-note" data-reveal>
              <span><LayoutTemplate size={16} /></span>
              {t("landing.templatesNote", "Six receipt templates to choose from: Classic, Minimal, Shop Pro, Eco, Modern and Business Elite.")}
            </p>
          </div>
        </section>

        {/* ---------- How it works ---------- */}
        <section className="lp-section" id="dl-how">
          <div className="dl-container">
            <div className="lp-head" data-reveal>
              <span className="lp-kicker">{t("landing.howKicker", "HOW IT WORKS")}</span>
              <h2>{t("landing.howHeading", "Up and billing in three steps")}</h2>
            </div>
            <ol className="lp-steps">
              {STEP_DEFS.map((step, index) => (
                <li key={step.titleKey} className="lp-step" data-reveal style={{ "--lp-delay": `${index * 110}ms` }}>
                  <span className="lp-step-num">{index + 1}</span>
                  <h3>{t(step.titleKey, step.defaultTitle)}</h3>
                  <p>{t(step.textKey, step.defaultText)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- Call to action ---------- */}
        <section className="lp-cta">
          <div className="dl-container">
            <div className="lp-cta-card" data-reveal>
              <span className="lp-cta-glow" aria-hidden="true" />
              <div className="lp-cta-copy">
                <h2>
                  {t("landing.ctaHeading", "Make every sale")}{" "}
                  <em>{t("landing.ctaHeadingAccent", "feel effortless.")}</em>
                </h2>
                <p>{t("landing.ctaSubtitle", "Prints never expire, so you only pay for what you use.")}</p>
              </div>
              <div className="lp-hero-actions lp-cta-actions">
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

      <footer className="lp-footer">
        <div className="dl-container lp-footer-inner">
          <div className="lp-footer-brand">
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
        <div className="dl-container lp-footer-legal">
          <span><Store size={13} /> © {new Date().getFullYear()} {t("landing.rights", "Slipzen. All rights reserved.")}</span>
        </div>
      </footer>
    </div>
  )
}
export default DesktopLanding
