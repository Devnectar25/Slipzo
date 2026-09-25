import { useState, useEffect } from "react"
import { 
  ArrowRight, Printer, Star, CheckCircle, FileText, Layout, Store, 
  Award, Type, Eye, Check, Sparkles, SlidersHorizontal, QrCode, Shield, Zap
} from "lucide-react"
import { MiniReceiptPreview } from "./MiniReceiptPreview"
import { RealisticReceiptView } from "./RealisticReceiptView"

export function PublicTemplates({ setView, setShowAuth, user, requireAuth }) {
  const [activeCategory, setActiveCategory] = useState("all")
  const [previewTemplate, setPreviewTemplate] = useState(null)

  // Lock background scroll when preview template modal is open
  useEffect(() => {
    if (previewTemplate) {
      const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0
      const scrollX = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || 0

      const originalBodyOverflow = document.body.style.overflow
      const originalBodyPosition = document.body.style.position
      const originalBodyTop = document.body.style.top
      const originalBodyLeft = document.body.style.left
      const originalBodyWidth = document.body.style.width
      const originalDocOverflow = document.documentElement.style.overflow

      document.body.style.overflow = "hidden"
      document.body.style.position = "fixed"
      document.body.style.top = `-${scrollY}px`
      document.body.style.left = `-${scrollX}px`
      document.body.style.width = "100%"
      document.documentElement.style.overflow = "hidden"

      const elementsToLock = document.querySelectorAll(".shell-content, .shell-main, .app, .public-layout, .main-content")
      elementsToLock.forEach(el => {
        el.dataset.origOverflow = el.style.overflow
        el.style.overflow = "hidden"
      })

      return () => {
        document.body.style.overflow = originalBodyOverflow
        document.body.style.position = originalBodyPosition
        document.body.style.top = originalBodyTop
        document.body.style.left = originalBodyLeft
        document.body.style.width = originalBodyWidth
        document.documentElement.style.overflow = originalDocOverflow
        elementsToLock.forEach(el => {
          el.style.overflow = el.dataset.origOverflow || ""
        })
        window.scrollTo(scrollX, scrollY)
      }
    }
  }, [previewTemplate])

  const templates = [
    {
      id: "minimal",
      templateId: "2",
      name: "Minimal Clean Bill",
      category: "Minimal",
      badge: "Most Popular",
      paperSize: "58mm Thermal",
      description: "Streamlined layout engineered to reduce paper roll consumption while maintaining crystal clear readability.",
      gradient: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
      accentColor: "#0ea5e9",
      features: ["Compact receipt layout", "Large legible totals", "Zero-waste spacing", "Thermal optimized"],
      previewData: {
        shopName: "MINIMAL CAFE & BAKERY",
        address: "MG Road, Indiranagar, Bengaluru",
        phone: "+91 98765 43210",
        gst: "",
        invoiceNo: "MC-INV-102",
        date: "09 Mar 2026, 02:45 PM",
        items: [
          { name: "Espresso Single Shot", qty: 1, rate: 120, total: 120 },
          { name: "Butter Croissant", qty: 1, rate: 100, total: 100 }
        ],
        subtotal: 220,
        tax: 0,
        discount: 0,
        total: 220,
        payment: "UPI / PhonePe",
        footer: "Thank you for visiting! Please come again."
      }
    },
    {
      id: "classic",
      templateId: "1",
      name: "Classic Receipt",
      category: "Standard",
      badge: "Standard",
      paperSize: "58mm Thermal",
      description: "Clean and professional receipt template with itemized table, discounts, and clear totals.",
      gradient: "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)",
      accentColor: "#0284c7",
      features: ["Shop header & contact", "Itemized table (Qty, Rate, Total)", "Payment mode & barcode", "Custom footer note"],
      previewData: {
        shopName: "CLASSIC MART & GROCERY",
        address: "Shop 14, Main Market, Connaught Place, New Delhi",
        phone: "+91 11 2341 5678",
        gst: "",
        invoiceNo: "CM-2026-8821",
        date: "09 Mar 2026, 01:15 PM",
        items: [
          { name: "Basmati Rice 1kg", qty: 2, rate: 120, total: 240 },
          { name: "Refined Sunflower Oil 1L", qty: 1, rate: 195, total: 195 }
        ],
        subtotal: 435,
        tax: 0,
        discount: 0,
        total: 435,
        payment: "Cash",
        footer: "Thank you for shopping with us! Please come again."
      }
    },
    {
      id: "pro",
      templateId: "3",
      name: "Shop Pro",
      category: "Business",
      badge: "Retail Choice",
      paperSize: "80mm POS",
      description: "Professional high-volume retail POS receipt with clean column headers, item discounts, and net totals.",
      gradient: "linear-gradient(135deg, #60a5fa 0%, #1d4ed8 100%)",
      accentColor: "#2563eb",
      features: ["Retail store header", "Itemized table with quantity", "Net total calculation", "Editable footer note"],
      previewData: {
        shopName: "URBAN FASHION PRO",
        address: "Level 2, Phoenix Marketcity, Mumbai",
        phone: "+91 22 6789 0011",
        gst: "27AAACU1234M1Z2",
        invoiceNo: "UFP-INV-4401",
        date: "09 Mar 2026, 04:30 PM",
        items: [
          { name: "Pure Linen Casual Shirt", qty: 1, rate: 1499, total: 1499 },
          { name: "Slim Fit Chino Trousers", qty: 1, rate: 1899, total: 1899 }
        ],
        subtotal: 3398,
        tax: 0,
        discount: 300,
        total: 3098,
        payment: "Credit / Debit Card",
        footer: "Thank you for shopping with us! Please come again."
      }
    },
    {
      id: "eco",
      templateId: "4",
      name: "Eco Print",
      category: "Thermal",
      badge: "Paper Saver",
      paperSize: "58mm Ultra Compact",
      description: "Ultra-compact monospace thermal bill layout engineered specifically to maximize speed and minimize roll paper consumption.",
      gradient: "linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)",
      accentColor: "#0d9488",
      features: ["58mm compact layout", "Monospace font alignment", "High-density item lines", "Paper saving spacing"],
      previewData: {
        shopName: "KRISHNA JUICE & SHAKES",
        address: "Near Metro Station Gate 2, Hyderabad",
        phone: "+91 40 5544 3322",
        gst: "",
        invoiceNo: "KJ-7734",
        date: "09 Mar 2026, 11:30 AM",
        items: [
          { name: "Fresh Pomegranate Juice", qty: 2, rate: 80, total: 160 },
          { name: "Special Fruit Salad Bowl", qty: 1, rate: 120, total: 120 }
        ],
        subtotal: 280,
        tax: 0,
        discount: 0,
        total: 280,
        payment: "UPI QR",
        footer: "Save paper, save trees! Thank you."
      }
    },
    {
      id: "modern",
      templateId: "5",
      name: "Modern Shop",
      category: "Modern",
      badge: "Trendy",
      paperSize: "58mm Thermal",
      description: "Contemporary aesthetic for boutiques, cafes, and modern shops with clean typography and spacing.",
      gradient: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)",
      accentColor: "#0ea5e9",
      features: ["Modern typography", "Clean item list with rates", "Clear amount due card", "Custom footer note"],
      previewData: {
        shopName: "LUMINA BEAUTY & SPA",
        address: "3rd Block, Koramangala, Bengaluru",
        phone: "+91 80 9988 7766",
        gst: "29AABCL5544R1Z8",
        invoiceNo: "LUM-2026-55",
        date: "09 Mar 2026, 05:15 PM",
        items: [
          { name: "Organic Rose Water Toner 100ml", qty: 1, rate: 450, total: 450 },
          { name: "Hydrating Facial Serum 50ml", qty: 1, rate: 890, total: 890 }
        ],
        subtotal: 1340,
        tax: 0,
        discount: 0,
        total: 1340,
        payment: "UPI / Card",
        footer: "Thank you for your visit! Please come again."
      }
    },
    {
      id: "elite",
      templateId: "6",
      name: "Business Elite",
      category: "Business",
      badge: "Premium",
      paperSize: "80mm Standard / A4",
      description: "Formal retail invoice template designed for businesses requiring clean itemized totals and formal terms.",
      gradient: "linear-gradient(135deg, #38bdf8 0%, #0369a1 100%)",
      accentColor: "#0284c7",
      features: ["Formal Invoice header", "Seller contact details", "Itemized table with rates", "Clear amount due & totals"],
      previewData: {
        shopName: "TECHNO COMPUTERS & PERIPHERALS",
        address: "Plot 88, Electronic City Phase 1, Bengaluru",
        phone: "+91 80 4123 9900",
        gst: "",
        invoiceNo: "TC-INV-2026-904",
        date: "09 Mar 2026, 03:00 PM",
        items: [
          { name: "Wireless Ergonomic Mouse", qty: 1, rate: 850, total: 850 },
          { name: "Mechanical RGB Keyboard", qty: 1, rate: 2400, total: 2400 }
        ],
        subtotal: 3250,
        tax: 0,
        discount: 0,
        total: 3250,
        payment: "Bank / Online",
        footer: "Thank you for your business. Terms & conditions apply."
      }
    }
  ]

  const categories = ["all", "Standard", "Minimal", "Business", "Thermal", "Modern"]

  const filteredTemplates = activeCategory === "all" 
    ? templates 
    : templates.filter(t => t.category.toLowerCase() === activeCategory.toLowerCase())

  const handleUseTemplate = (template) => {
    sessionStorage.setItem("slipzo-template", template.templateId || template.id)
    if (user) {
      setView("bills")
    } else {
      setShowAuth(true)
    }
  }

  return (
    <div className="templates-page">
      {/* Header */}
      <section className="templates-header">
        <div className="templates-header-content">
          <p className="eyebrow">SLIPZO TEMPLATES</p>
          <h1>Professional Receipt Templates<br />for Every Type of Shop</h1>
          <p className="header-description">
            Tailored for 58mm & 80mm thermal receipt printers, mobile Bluetooth devices, and standard bills.
            Pick a template, add your logo and shop details, and print in seconds.
          </p>
          <div className="templates-header-actions">
            <button className="cta-button primary large" onClick={() => (user ? setView("bills") : setShowAuth(true))}>
              Start billing free <ArrowRight size={18} />
            </button>
            <button className="cta-button secondary" onClick={() => setView("pricing")}>
              View pricing plans
            </button>
          </div>
        </div>
      </section>

      {/* Filter Tabs */}
      <section className="templates-filter-section">
        <div className="templates-filter-container">
          <div className="category-tabs">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`category-tab ${activeCategory === cat ? "active" : ""}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat === "all" ? "All Templates" : cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Templates Grid */}
      <section className="templates-grid-section">
        <div className="templates-gallery-grid">
          {filteredTemplates.map((template) => (
            <div 
              className="template-showcase-card" 
              key={template.id}
              style={{
                "--card-gradient": template.gradient,
                "--accent-color": template.accentColor
              }}
            >
              <div className="card-top-bar" />
              <div className="template-card-top">
                <div className="template-badge-row">
                  <span className="template-badge" style={{ background: template.gradient, color: "#ffffff" }}>
                    {template.badge}
                  </span>
                  <span className="template-paper-tag">
                    <Printer size={12} /> {template.paperSize}
                  </span>
                </div>
                <h3>{template.name}</h3>
                <p className="template-desc">{template.description}</p>
              </div>

              {/* Receipt Preview Box */}
              <div className="template-receipt-preview" onClick={() => setPreviewTemplate(template)}>
                <MiniReceiptPreview template={template} />
              </div>

              {/* Features List */}
              <div className="template-features-list">
                {template.features.map((feat, idx) => (
                  <div className="template-feat-item" key={idx}>
                    <Check size={16} style={{ color: template.accentColor, flexShrink: 0 }} />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              {/* Card Footer Actions */}
              <div className="template-card-actions">
                <button
                  className="template-preview-btn"
                  onClick={() => setPreviewTemplate(template)}
                >
                  <Eye size={16} /> Preview
                </button>
                <button
                  className="template-use-btn"
                  style={{ background: template.gradient }}
                  onClick={() => handleUseTemplate(template)}
                >
                  Use Template <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Highlights Section */}
      <section className="templates-specs-section">
        <div className="specs-container">
          <div className="specs-header">
            <p className="eyebrow">BUILT FOR REAL SHOPS</p>
            <h2>Why shop owners love Slipzo templates</h2>
            <p>Engineered to print fast, save paper, and impress customers on every checkout.</p>
          </div>

          <div className="specs-grid">
            <div className="spec-card">
              <div className="spec-icon" style={{ background: "#e0f2fe", color: "#0ea5e9" }}>
                <Printer size={28} />
              </div>
              <h3>Universal Thermal Compatibility</h3>
              <p>Auto-formats for 58mm portable handheld printers, 80mm POS counters, and desktop A4 printers without cutting off margins.</p>
            </div>

            <div className="spec-card">
              <div className="spec-icon" style={{ background: "#dcfce7", color: "#10b981" }}>
                <QrCode size={28} />
              </div>
              <h3>Dynamic Payment QR Codes</h3>
              <p>Print real-time UPI QR codes directly on the bill for fast customer scan-and-pay via PhonePe, Google Pay, or Paytm.</p>
            </div>

            <div className="spec-card">
              <div className="spec-icon" style={{ background: "#e0f2fe", color: "#0ea5e9" }}>
                <Sparkles size={28} />
              </div>
              <h3>Instant Brand Customization</h3>
              <p>Add your shop name, logo, GSTIN, custom terms, social handles, and promotional thank-you notes in seconds.</p>
            </div>

            <div className="spec-card">
              <div className="spec-icon" style={{ background: "#fef3c7", color: "#f59e0b" }}>
                <Zap size={28} />
              </div>
              <h3>Sub-Second Printing</h3>
              <p>Lightweight vector rendering ensures your thermal printer starts printing instantly with zero lag during rush hours.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="templates-cta-section">
        <div className="templates-cta-content">
          <h2>Ready to upgrade your billing experience?</h2>
          <p>Join thousands of shops printing clean, branded receipts with Slipzo today.</p>
          <div className="templates-cta-buttons">
            <button className="cta-button primary large" onClick={() => (user ? setView("bills") : setShowAuth(true))}>
              Create your first receipt free <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Live Preview Modal */}
      {previewTemplate && (
        <div
          className="template-modal-overlay"
          onClick={() => setPreviewTemplate(null)}
          onWheel={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault()
              e.stopPropagation()
            }
          }}
        >
          <div className="template-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="template-modal-header">
              <div>
                <h3>{previewTemplate.name}</h3>
                <span className="modal-paper-tag"><Printer size={12} /> {previewTemplate.paperSize}</span>
              </div>
              <button className="modal-close-btn" onClick={() => setPreviewTemplate(null)}>✕</button>
            </div>

            <div className="template-modal-receipt-wrapper">
              <RealisticReceiptView template={previewTemplate} />
            </div>

            <div className="template-modal-footer">
              <button className="cta-button secondary" onClick={() => setPreviewTemplate(null)}>
                Close Preview
              </button>
              <button className="cta-button primary" onClick={() => {
                setPreviewTemplate(null)
                handleUseTemplate(previewTemplate)
              }}>
                Use this template <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
