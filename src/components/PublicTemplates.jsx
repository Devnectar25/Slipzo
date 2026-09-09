import { useState } from "react"
import { 
  ArrowRight, Printer, Star, CheckCircle, FileText, Layout, Store, 
  Award, Type, Eye, Check, Sparkles, SlidersHorizontal, QrCode, Shield, Zap
} from "lucide-react"

export function PublicTemplates({ setView, setShowAuth, user, requireAuth }) {
  const [activeCategory, setActiveCategory] = useState("all")
  const [previewTemplate, setPreviewTemplate] = useState(null)

  const templates = [
    {
      id: "minimal",
      name: "Minimal Clean Bill",
      category: "Minimal",
      badge: "Most Popular",
      paperSize: "58mm Thermal",
      description: "Streamlined layout engineered to reduce paper roll consumption while maintaining crystal clear readability.",
      accentColor: "#0f172a",
      gradient: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      icon: <Layout size={20} />,
      features: ["Ultra-compact height", "Bold total highlight", "Minimalist typography", "Fast thermal printing"],
      previewData: {
        shopName: "THE DAILY CAFE & BAKE",
        address: "Shop #4, Koramangala 5th Block, Bengaluru",
        phone: "+91 91234 56789",
        invoiceNo: "SLIP-8921",
        date: "09 Mar 2026, 01:15 PM",
        items: [
          { name: "Iced Caramel Macchiato", qty: 2, rate: 180, total: 360 },
          { name: "Almond Croissant", qty: 1, rate: 140, total: 140 },
          { name: "Sourdough Toast w/ Butter", qty: 1, rate: 110, total: 110 }
        ],
        subtotal: 610,
        tax: 30.50,
        discount: 0,
        total: 640.50,
        payment: "Cash",
        footer: "Have a wonderful day! Wifi: DailyCafe_Guest"
      }
    },
    {
      id: "classic",
      name: "Classic Receipt",
      category: "Standard",
      badge: "Standard",
      paperSize: "58mm / 80mm",
      description: "Timeless and structured receipt template with essential shop details, itemized billing, and tax breakdown.",
      accentColor: "#0f172a",
      gradient: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      icon: <FileText size={20} />,
      features: ["Shop header & logo", "Itemized table", "GST & tax breakdown", "Payment mode indicator"],
      previewData: {
        shopName: "METRO GENERAL STORE",
        address: "124 Market Road, Connaught Place, New Delhi",
        phone: "+91 98765 43210",
        gst: "07AAAAA0000A1Z5",
        invoiceNo: "INV-2026-0412",
        date: "09 Mar 2026, 02:45 PM",
        items: [
          { name: "Organic Basmati Rice 1kg", qty: 2, rate: 120, total: 240 },
          { name: "Cold Pressed Mustard Oil 1L", qty: 1, rate: 195, total: 195 },
          { name: "Aashirvaad Atta 5kg", qty: 1, rate: 260, total: 260 },
          { name: "Tata Salt Crystal 1kg", qty: 2, rate: 25, total: 50 }
        ],
        subtotal: 745,
        tax: 37.25,
        discount: 35,
        total: 747.25,
        payment: "UPI (Google Pay)",
        footer: "Thank you for shopping with us! Visit again."
      }
    },
    {
      id: "shop-pro",
      name: "Retail Pro Branded",
      category: "Business",
      badge: "High Conversion",
      paperSize: "80mm Thermal / A4",
      description: "Designed for premium retail outlets with loyalty points display, shop social handles, and QR codes.",
      accentColor: "#0f172a",
      gradient: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      icon: <Store size={20} />,
      features: ["Dynamic UPI QR code", "Loyalty points earned", "Return policy notes", "Custom brand banner"],
      previewData: {
        shopName: "URBAN STYLE APPAREL",
        address: "Phoenix Palladium, Lower Parel, Mumbai",
        phone: "+91 99887 76655",
        gst: "27AABCS1429B1ZB",
        invoiceNo: "USA-2026-10293",
        date: "09 Mar 2026, 05:20 PM",
        items: [
          { name: "Slim Fit Linen Shirt (Navy - L)", qty: 1, rate: 1499, total: 1499 },
          { name: "Chino Trousers (Olive - 32)", qty: 1, rate: 1899, total: 1899 },
          { name: "Cotton Crew Socks (3-Pack)", qty: 2, rate: 299, total: 598 }
        ],
        subtotal: 3996,
        tax: 199.80,
        discount: 300,
        total: 3895.80,
        payment: "Card Ending 4821",
        footer: "Earned 78 Slipzo Rewards points! Exchange within 14 days."
      }
    },
    {
      id: "eco-thermal",
      name: "Eco Rapid 58",
      category: "Thermal",
      badge: "Super Fast",
      paperSize: "58mm Thermal",
      description: "High-contrast monochrome blueprint tailored specifically for 58mm thermal portable Bluetooth printers.",
      accentColor: "#0f172a",
      gradient: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      icon: <Printer size={20} />,
      features: ["Optimized for ESC/POS", "Zero ink thermal friendly", "Instant cut support", "Tear-line alignment"],
      previewData: {
        shopName: "KRISHNA FRUITS & JUICE",
        address: "Opp. City Metro Station, Gate 2",
        phone: "+91 98112 23344",
        invoiceNo: "TXN-7734",
        date: "09 Mar 2026, 11:30 AM",
        items: [
          { name: "Fresh Pomegranate Juice", qty: 2, rate: 80, total: 160 },
          { name: "Mixed Fruit Bowl (Large)", qty: 1, rate: 120, total: 120 },
          { name: "Sugarcane Juice with Mint", qty: 2, rate: 40, total: 80 }
        ],
        subtotal: 360,
        tax: 0,
        discount: 0,
        total: 360,
        payment: "PhonePe UPI",
        footer: "100% Pure & Fresh. Thank you!"
      }
    },
    {
      id: "modern-retail",
      name: "Modern Boutique",
      category: "Modern",
      badge: "Trending",
      paperSize: "80mm / A4 / POS",
      description: "Contemporary typography with geometric spacing, category grouping, and elegant customer details.",
      accentColor: "#0f172a",
      gradient: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      icon: <Type size={20} />,
      features: ["Customer name & contact", "Category subtotals", "Clean barcode section", "Digital copy link"],
      previewData: {
        shopName: "LUMINA ORGANIC BEAUTY",
        address: "Shop 12, Indiranagar 100ft Road, Bengaluru",
        phone: "+91 97711 22334",
        gst: "29AADCL9871F1ZS",
        invoiceNo: "LUM-5094",
        date: "09 Mar 2026, 04:10 PM",
        items: [
          { name: "Rose Water Gentle Toner 200ml", qty: 1, rate: 450, total: 450 },
          { name: "Hydrating Hyaluronic Serum", qty: 1, rate: 890, total: 890 },
          { name: "Botanical Sunscreen SPF 50", qty: 1, rate: 620, total: 620 }
        ],
        subtotal: 1960,
        tax: 98,
        discount: 100,
        total: 1958,
        payment: "HDFC Credit Card",
        footer: "Tag us @luminabeauty on Instagram for 10% off next visit!"
      }
    },
    {
      id: "business-elite",
      name: "Enterprise Tax Invoice",
      category: "Business",
      badge: "GST Ready",
      paperSize: "80mm / A4 Standard",
      description: "Comprehensive corporate bill template with detailed HSN/SAC codes, CGST/SGST separation, and signature lines.",
      accentColor: "#0f172a",
      gradient: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      icon: <Award size={20} />,
      features: ["HSN / SAC Code column", "Split CGST / SGST", "Authorized signatory box", "Terms & conditions"],
      previewData: {
        shopName: "TECHNO COMPUTERS & PERIPHERALS",
        address: "Plot 88, Electronic City Phase 1, Bengaluru",
        phone: "+91 80 4123 9900",
        gst: "29AABCT9981K1ZT",
        invoiceNo: "TC-INV-2026-904",
        date: "09 Mar 2026, 03:00 PM",
        items: [
          { name: "Wireless Ergonomic Mouse [HSN 8471]", qty: 2, rate: 850, total: 1700 },
          { name: "USB-C 7-in-1 Aluminum Hub [HSN 8471]", qty: 1, rate: 2200, total: 2200 },
          { name: "Thermal Paper Roll 80mm (Pack of 10)", qty: 3, rate: 350, total: 1050 }
        ],
        subtotal: 4950,
        tax: 445.50,
        discount: 150,
        total: 5245.50,
        payment: "NEFT / Net Banking",
        footer: "Warranty valid with original invoice. Goods once sold are covered under manufacturer warranty."
      }
    }
  ]

  const categories = ["all", "Standard", "Minimal", "Business", "Thermal", "Modern"]

  const filteredTemplates = activeCategory === "all" 
    ? templates 
    : templates.filter(t => t.category.toLowerCase() === activeCategory.toLowerCase())

  const handleUseTemplate = (template) => {
    if (user) {
      // Direct logged-in user to bill creation
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
            <button className="cta-button primary" onClick={() => (user ? setView("bills") : setShowAuth(true))}>
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

              {/* Receipt Preview Preview Box */}
              <div className="template-receipt-preview" onClick={() => setPreviewTemplate(template)}>
                <div className="mock-receipt">
                  <div className="mock-receipt-header">
                    <div className="mock-receipt-logo" style={{ background: template.gradient }}>
                      <FileText size={12} color="#fff" />
                    </div>
                    <div className="mock-receipt-title">{template.previewData.shopName}</div>
                    <div className="mock-receipt-sub">{template.previewData.address.slice(0, 32)}...</div>
                  </div>
                  <div className="mock-receipt-divider" />
                  <div className="mock-receipt-items">
                    {template.previewData.items.slice(0, 3).map((item, i) => (
                      <div className="mock-receipt-row" key={i}>
                        <span className="mock-item-name">{item.name.slice(0, 18)}...</span>
                        <span className="mock-item-price">₹{item.total}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mock-receipt-divider" />
                  <div className="mock-receipt-row bold">
                    <span>TOTAL</span>
                    <span style={{ color: template.accentColor }}>₹{template.previewData.total}</span>
                  </div>
                  <div className="mock-receipt-view-overlay">
                    <span><Eye size={16} /> Click for full preview</span>
                  </div>
                </div>
              </div>

              {/* Features List */}
              <div className="template-features-list">
                {template.features.map((feat, idx) => (
                  <div className="template-feat-item" key={idx}>
                    <Check size={14} style={{ color: template.accentColor, flexShrink: 0 }} />
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
                  <Eye size={15} /> Preview
                </button>
                <button
                  className="template-use-btn"
                  style={{ background: template.gradient }}
                  onClick={() => handleUseTemplate(template)}
                >
                  Use Template <ArrowRight size={15} />
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
              <div className="spec-icon" style={{ color: "#0ea5e9" }}>
                <Printer size={24} />
              </div>
              <h3>Universal Thermal Compatibility</h3>
              <p>Auto-formats for 58mm portable handheld printers, 80mm POS counters, and desktop A4 printers without cutting off margins.</p>
            </div>

            <div className="spec-card">
              <div className="spec-icon" style={{ color: "#10b981" }}>
                <QrCode size={24} />
              </div>
              <h3>Dynamic Payment QR Codes</h3>
              <p>Print real-time UPI QR codes directly on the bill for fast customer scan-and-pay via PhonePe, Google Pay, or Paytm.</p>
            </div>

            <div className="spec-card">
              <div className="spec-icon" style={{ color: "#8b5cf6" }}>
                <Sparkles size={24} />
              </div>
              <h3>Instant Brand Customization</h3>
              <p>Add your shop name, logo, GSTIN, custom terms, social handles, and promotional thank-you notes in seconds.</p>
            </div>

            <div className="spec-card">
              <div className="spec-icon" style={{ color: "#f59e0b" }}>
                <Zap size={24} />
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
        <div className="template-modal-overlay" onClick={() => setPreviewTemplate(null)}>
          <div className="template-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="template-modal-header">
              <div>
                <h3>{previewTemplate.name}</h3>
                <span className="modal-paper-tag"><Printer size={12} /> {previewTemplate.paperSize}</span>
              </div>
              <button className="modal-close-btn" onClick={() => setPreviewTemplate(null)}>✕</button>
            </div>

            <div className="template-modal-receipt-wrapper">
              <div className="realistic-thermal-receipt">
                <div className="receipt-paper-top" />
                <div className="receipt-content">
                  <div className="thermal-header">
                    <h2 className="thermal-shop-name">{previewTemplate.previewData.shopName}</h2>
                    <p className="thermal-shop-address">{previewTemplate.previewData.address}</p>
                    <p className="thermal-shop-meta">Tel: {previewTemplate.previewData.phone}</p>
                    {previewTemplate.previewData.gst && (
                      <p className="thermal-shop-meta">GSTIN: {previewTemplate.previewData.gst}</p>
                    )}
                  </div>

                  <div className="thermal-dots-divider" />

                  <div className="thermal-meta-row">
                    <span>Invoice: {previewTemplate.previewData.invoiceNo}</span>
                    <span>{previewTemplate.previewData.date}</span>
                  </div>

                  <div className="thermal-dots-divider" />

                  <div className="thermal-table-header">
                    <span className="col-item">ITEM</span>
                    <span className="col-qty">QTY</span>
                    <span className="col-rate">RATE</span>
                    <span className="col-amt">AMT</span>
                  </div>

                  <div className="thermal-line-divider" />

                  <div className="thermal-items-list">
                    {previewTemplate.previewData.items.map((item, idx) => (
                      <div className="thermal-item-row" key={idx}>
                        <span className="col-item">{item.name}</span>
                        <span className="col-qty">{item.qty}</span>
                        <span className="col-rate">₹{item.rate}</span>
                        <span className="col-amt">₹{item.total}</span>
                      </div>
                    ))}
                  </div>

                  <div className="thermal-line-divider" />

                  <div className="thermal-summary">
                    <div className="thermal-sum-row">
                      <span>Subtotal</span>
                      <span>₹{previewTemplate.previewData.subtotal.toFixed(2)}</span>
                    </div>
                    {previewTemplate.previewData.discount > 0 && (
                      <div className="thermal-sum-row discount">
                        <span>Discount</span>
                        <span>-₹{previewTemplate.previewData.discount.toFixed(2)}</span>
                      </div>
                    )}
                    {previewTemplate.previewData.tax > 0 && (
                      <div className="thermal-sum-row">
                        <span>Tax / GST</span>
                        <span>₹{previewTemplate.previewData.tax.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="thermal-sum-row grand-total">
                      <span>NET AMOUNT</span>
                      <span>₹{previewTemplate.previewData.total.toFixed(2)}</span>
                    </div>
                    <div className="thermal-sum-row payment-info">
                      <span>Payment Mode:</span>
                      <span>{previewTemplate.previewData.payment}</span>
                    </div>
                  </div>

                  <div className="thermal-dots-divider" />

                  <div className="thermal-footer">
                    <p>{previewTemplate.previewData.footer}</p>
                    <div className="thermal-barcode-mock">
                      ||||| | |||| ||| |||||| ||||| ||||
                    </div>
                    <span className="thermal-powered">Powered by Slipzo.com</span>
                  </div>
                </div>
                <div className="receipt-paper-bottom" />
              </div>
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
