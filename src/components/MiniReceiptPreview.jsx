import React from "react"

export function MiniReceiptPreview({ template }) {
  if (!template) return null
  const p = String(template.preview || template.id || "").toLowerCase()
  const tplId = String(template.templateId || "").toLowerCase()
  const name = String(template.name || "").toLowerCase()
  const cat = String(template.category || "").toLowerCase()

  const isMinimal = p === "minimal" || p === "2" || tplId === "2" || tplId === "minimal" || name.includes("minimal") || cat.includes("minimal")
  const isClassic = p === "classic" || p === "1" || tplId === "1" || tplId === "classic" || name.includes("classic") || cat.includes("classic")
  const isPro = p === "pro" || p === "shop-pro" || p === "3" || tplId === "3" || tplId === "pro" || name.includes("pro") || cat.includes("pro")
  const isEco = p === "eco" || p === "eco-thermal" || p === "4" || tplId === "4" || tplId === "eco" || name.includes("eco") || cat.includes("eco")
  const isModern = p === "modern" || p === "modern-retail" || p === "5" || tplId === "5" || tplId === "modern" || name.includes("modern") || cat.includes("modern")
  const isElite = p === "elite" || p === "business-elite" || p === "6" || tplId === "6" || tplId === "elite" || name.includes("elite") || cat.includes("elite")

  // 1. MINIMAL CLEAN BILL
  if (isMinimal) {
    return (
      <div className="mini-receipt mini-receipt-minimal">
        <div className="mini-header-centered">
          <span className="mini-logo-dot" style={{ background: template.gradient || "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)" }}>S</span>
          <span className="mini-shop-title">MINIMAL CAFE</span>
          <span className="mini-subtext-muted">MG Road, Bengaluru</span>
        </div>
        <div className="mini-line-subtle" />
        <div className="mini-meta-minimal">
          <span>#INV-102</span>
          <span>02:45 PM</span>
        </div>
        <div className="mini-items-clean">
          <div className="mini-item-clean">
            <div>
              <span className="mini-item-title">Espresso Shot</span>
              <small className="mini-item-sub">1 × ₹120.00</small>
            </div>
            <span className="mini-item-amt">₹120</span>
          </div>
          <div className="mini-item-clean">
            <div>
              <span className="mini-item-title">Butter Croissant</span>
              <small className="mini-item-sub">1 × ₹100.00</small>
            </div>
            <span className="mini-item-amt">₹100</span>
          </div>
        </div>
        <div className="mini-line-subtle" />
        <div className="mini-total-bold">
          <span>TOTAL</span>
          <span style={{ color: template.color || "#0ea5e9" }}>₹220.00</span>
        </div>
        <div className="mini-paid-badge-minimal">PAID VIA UPI</div>
        <div className="mini-thank-subtle">thank you for visiting</div>
      </div>
    )
  }

  // 2. CLASSIC RECEIPT
  if (isClassic) {
    return (
      <div className="mini-receipt mini-receipt-classic">
        <div className="mini-header-classic">
          <div className="mini-crest-badge" style={{ borderColor: template.color || "#0284c7" }}>
            <span>S</span>
          </div>
          <span className="mini-shop">CLASSIC MART</span>
          <span className="mini-subtext">Connaught Place, New Delhi</span>
        </div>
        <div className="mini-double-divider" />
        <div className="mini-meta-grid">
          <div><span>INV:</span> <b>#8821</b></div>
          <div><span>DATE:</span> <b>09-MAR</b></div>
        </div>
        <div className="mini-dashed-divider" />
        <div className="mini-items-table">
          <div className="mini-table-head"><span>ITEM</span><span>QTY</span><span>AMT</span></div>
          <div className="mini-item"><span>Basmati Rice 1kg</span><span>2</span><span>₹240</span></div>
          <div className="mini-item"><span>Sunflower Oil 1L</span><span>1</span><span>₹195</span></div>
        </div>
        <div className="mini-dashed-divider" />
        <div className="mini-tax-breakdown">
          <div><span>Subtotal</span><span>₹435.00</span></div>
        </div>
        <div className="mini-total-row-classic">
          <span>GRAND TOTAL</span>
          <span style={{ color: template.color || "#0284c7" }}>₹435.00</span>
        </div>
        <div className="mini-barcode-line">||| | |||| | |||||| || |</div>
        <div className="mini-policy-note">Thank you! Please visit again.</div>
      </div>
    )
  }

  // 3. SHOP PRO (RETAIL POS)
  if (isPro) {
    return (
      <div className="mini-receipt mini-receipt-pro">
        <div className="mini-pro-banner" style={{ background: template.gradient || "linear-gradient(135deg, #60a5fa 0%, #1d4ed8 100%)" }}>
          <span>URBAN FASHION PRO</span>
          <small>RETAIL POS RECEIPT</small>
        </div>
        <div className="mini-meta-grid" style={{ fontSize: "0.6rem", padding: "0.2rem 0" }}>
          <div><span>BILL:</span> <b>#4401</b></div>
          <div><span>DATE:</span> <b>09-MAR</b></div>
        </div>
        <div className="mini-items">
          <div className="mini-item">
            <span>Pure Linen Shirt (x1)</span>
            <span>₹1,499</span>
          </div>
          <div className="mini-item">
            <span>Chino Trousers (x1)</span>
            <span>₹1,899</span>
          </div>
        </div>
        <div className="mini-line-subtle" />
        <div className="mini-tax-breakdown">
          <div><span>Subtotal</span><span>₹3,398</span></div>
        </div>
        <div className="mini-total">
          <span>Net Payable</span>
          <span style={{ color: template.color || "#2563eb" }}>₹3,398</span>
        </div>
        <div className="mini-thank-subtle">Thank you for shopping with us!</div>
      </div>
    )
  }

  // 4. ECO PRINT (THERMAL MONOSPACE)
  if (isEco) {
    return (
      <div className="mini-receipt mini-receipt-eco">
        <div className="mini-sawtooth-cut top" />
        <div className="mini-header-compact">
          <span className="mini-shop-mono">*** KRISHNA JUICE ***</span>
          <span className="mini-time-mono">BILL# 7734 | 09-MAR | 11:30AM</span>
        </div>
        <div className="mini-divider-dots" />
        <div className="mini-items-mono">
          <div className="mini-item-mono"><span>2x Pomegranate</span><span>₹160</span></div>
          <div className="mini-item-mono"><span>1x Fruit Bowl</span><span>₹120</span></div>
        </div>
        <div className="mini-divider-dots" />
        <div className="mini-total-box" style={{ borderColor: template.color || "#0d9488" }}>
          <span>TOTAL:</span>
          <span>₹280.00</span>
        </div>
        <div className="mini-thank-subtle" style={{ fontFamily: "monospace", fontSize: "0.62rem" }}>PAID VIA UPI · THANK YOU</div>
        <div className="mini-sawtooth-cut bottom" />
      </div>
    )
  }

  // 5. MODERN SHOP (BOUTIQUE & CAFE)
  if (isModern) {
    return (
      <div className="mini-receipt mini-receipt-modern">
        <span className="mini-shop-modern">Lumina Boutique & Spa</span>
        <div className="mini-subtext-muted">Koramangala, Bengaluru</div>
        <div className="mini-meta-minimal">
          <span>#LUM-55</span>
          <span>05:15 PM</span>
        </div>
        <div className="mini-items-modern">
          <div className="mini-item-pill">
            <span>Rose Water Toner</span>
            <span className="mini-price-pill" style={{ background: '#e0f2fe', color: template.color || "#0ea5e9" }}>₹450</span>
          </div>
          <div className="mini-item-pill">
            <span>Facial Serum 50ml</span>
            <span className="mini-price-pill" style={{ background: '#e0f2fe', color: template.color || "#0ea5e9" }}>₹890</span>
          </div>
        </div>
        <div className="mini-total-modern">
          <span>Amount Due</span>
          <span style={{ color: template.color || "#0ea5e9" }}>₹1,340</span>
        </div>
        <div className="mini-thank-subtle">Thank you for your visit!</div>
      </div>
    )
  }

  // 6. BUSINESS ELITE (FORMAL TAX INVOICE)
  if (isElite) {
    return (
      <div className="mini-receipt mini-receipt-elite">
        <div className="mini-tax-invoice-badge">RECEIPT / INVOICE</div>
        <div className="mini-party-col" style={{ textAlign: "center", margin: "0.2rem 0" }}>
          <b>Techno Corp</b>
        </div>
        <div className="mini-meta-grid" style={{ fontSize: "0.6rem" }}>
          <div><span>INV:</span> <b>#TC-904</b></div>
          <div><span>DATE:</span> <b>09-MAR</b></div>
        </div>
        <div className="mini-divider-double" />
        <div className="mini-items-elite">
          <div className="mini-item-elite-row">
            <span>Wireless Mouse (x1)</span>
            <span>₹850</span>
          </div>
          <div className="mini-item-elite-row">
            <span>Mech Keyboard (x1)</span>
            <span>₹2,400</span>
          </div>
        </div>
        <div className="mini-cgst-sgst">
          <div><span>Subtotal</span><span>₹3,250.00</span></div>
        </div>
        <div className="mini-total-elite" style={{ background: template.gradient || "linear-gradient(135deg, #38bdf8 0%, #0369a1 100%)" }}>
          <span>TOTAL INVOICE</span>
          <span>₹3,250.00</span>
        </div>
        <div className="mini-thank-subtle">Terms & conditions apply. Thank you!</div>
      </div>
    )
  }

  // Default fallback
  return (
    <div className="mini-receipt">
      <div className="mini-header">
        <span className="mini-logo" style={{ background: template.gradient || "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)" }}>S</span>
        <span className="mini-shop">{template.name || "Shop Name"}</span>
      </div>
      <div className="mini-divider" />
      <div className="mini-items">
        <div className="mini-item"><span>Standard Item</span><span>₹100</span></div>
      </div>
      <div className="mini-divider" />
      <div className="mini-total">
        <span>Total</span>
        <span style={{ color: template.color || "#0ea5e9" }}>₹100</span>
      </div>
    </div>
  )
}
