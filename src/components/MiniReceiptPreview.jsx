import React from "react"

export function MiniReceiptPreview({ template }) {
  const p = String(template.preview || template.templateId || template.id || "").toLowerCase()
  const name = String(template.name || "").toLowerCase()

  // 1. MINIMAL CLEAN BILL
  if (p === "minimal" || p === "2" || name.includes("minimal")) {
    return (
      <div className="mini-receipt mini-receipt-minimal">
        <div className="mini-header-centered" style={{ textAlign: "center", marginBottom: "0.12rem" }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, background: "#0284C7", color: "#ffffff", fontWeight: 800, fontSize: "0.68rem", display: "inline-flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.1rem" }}>
            <span>S</span>
          </div>
          <div style={{ fontWeight: 800, fontSize: "0.64rem", color: "#0C1F41", textAlign: "center" }}>MINIMAL CAFE</div>
          <div style={{ fontSize: "0.48rem", color: "#74788A", textAlign: "center" }}>MG Road, Bengaluru</div>
        </div>
        <div className="mini-dashed-divider" />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.5rem", color: "#575B6B", margin: "0.1rem 0" }}>
          <span>#INV-102</span>
          <span>02:45 PM</span>
        </div>
        <div className="mini-items-clean">
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.52rem", margin: "0.08rem 0", color: "#0C1F41" }}>
            <span>Espresso Shot × 1</span>
            <span style={{ fontWeight: 700 }}>₹120.00</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.52rem", margin: "0.08rem 0", color: "#0C1F41" }}>
            <span>Butter Croissant × 1</span>
            <span style={{ fontWeight: 700 }}>₹100.00</span>
          </div>
        </div>
        <div className="mini-dashed-divider" />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.62rem", fontWeight: 800, color: "#0C1F41", margin: "0.12rem 0 0.1rem" }}>
          <span>TOTAL</span>
          <span style={{ color: "#0284C7" }}>₹220.00</span>
        </div>
        <div style={{ textAlign: "left", margin: "0.1rem 0 0.15rem" }}>
          <span style={{ background: "#E0E7FF", color: "#3730A3", fontSize: "0.48rem", fontWeight: 800, padding: "0.08rem 0.35rem", borderRadius: 3, display: "inline-block", letterSpacing: "0.5px" }}>PAID VIA UPI</span>
        </div>
        <div style={{ textAlign: "center", fontStyle: "italic", fontSize: "0.48rem", color: "#74788A" }}>
          Thank you for visiting
        </div>
      </div>
    )
  }

  // 2. CLASSIC RECEIPT
  if (p === "classic" || p === "1" || name.includes("classic")) {
    return (
      <div className="mini-receipt mini-receipt-classic">
        <div className="mini-header-classic" style={{ textAlign: "center", marginBottom: "0.12rem" }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#3B82F6", color: "#ffffff", fontWeight: 800, fontSize: "0.68rem", display: "inline-flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.1rem" }}>
            <span>S</span>
          </div>
          <div style={{ fontWeight: 800, fontSize: "0.64rem", color: "#0C1F41", textAlign: "center" }}>CLASSIC MART</div>
          <div style={{ fontSize: "0.48rem", color: "#74788A", textAlign: "center" }}>Connaught Place, New Delhi</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.5rem", color: "#0C1F41", margin: "0.1rem 0" }}>
          <span>INV: <b>#8821</b></span>
          <span>DATE: <b>09-MAR-2026</b></span>
        </div>
        <div className="mini-dashed-divider" />
        <div className="mini-items-table">
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.48rem", fontWeight: 700, color: "#74788A", padding: "0.06rem 0" }}>
            <span>ITEM</span>
            <span>QTY</span>
            <span>AMT</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.52rem", color: "#0C1F41", margin: "0.08rem 0" }}>
            <span>Basmati Rice 1kg</span>
            <span>2</span>
            <span>₹240</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.52rem", color: "#0C1F41", margin: "0.08rem 0" }}>
            <span>Sunflower Oil 1L</span>
            <span>1</span>
            <span>₹195</span>
          </div>
        </div>
        <div className="mini-dashed-divider" />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.5rem", color: "#575B6B", margin: "0.08rem 0" }}>
          <span>Subtotal</span>
          <span>₹435.00</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.62rem", fontWeight: 800, color: "#0C1F41", margin: "0.1rem 0" }}>
          <span>GRAND TOTAL</span>
          <span style={{ color: "#0284C7" }}>₹435.00</span>
        </div>
        <div style={{ textAlign: "center", fontSize: "0.46rem", color: "#1E3A8A", letterSpacing: "1.5px", margin: "0.12rem 0 0.08rem", fontWeight: 700 }}>
          | | | | | | | | | | | | | | | | | | | | | |
        </div>
        <div className="mini-dashed-divider" />
        <div style={{ textAlign: "center", fontSize: "0.48rem", color: "#74788A" }}>
          Thank you! Please visit again.
        </div>
      </div>
    )
  }

  // 3. SHOP PRO (RETAIL POS)
  if (p === "pro" || p === "shop-pro" || p === "3" || name.includes("pro") || name.includes("retail")) {
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
          <div><span>Discount</span><span>-₹300</span></div>
        </div>
        <div className="mini-total">
          <span>Net Payable</span>
          <span style={{ color: template.color || "#2563eb" }}>₹3,098</span>
        </div>
        <div className="mini-thank-subtle">Thank you for shopping with us!</div>
      </div>
    )
  }

  // 4. ECO PRINT (THERMAL MONOSPACE)
  if (p === "eco" || p === "eco-thermal" || p === "4") {
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
  if (p === "modern" || p === "modern-retail" || p === "5") {
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
            <span className="mini-price-pill" style={{ background: '#FFF0E5', color: template.color || "#F66016" }}>₹450</span>
          </div>
          <div className="mini-item-pill">
            <span>Facial Serum 50ml</span>
            <span className="mini-price-pill" style={{ background: '#FFF0E5', color: template.color || "#F66016" }}>₹890</span>
          </div>
        </div>
        <div className="mini-total-modern">
          <span>Amount Due</span>
          <span style={{ color: template.color || "#F66016" }}>₹1,340</span>
        </div>
        <div className="mini-thank-subtle">Thank you for your visit!</div>
      </div>
    )
  }

  // 6. BUSINESS ELITE (FORMAL TAX INVOICE)
  if (p === "elite" || p === "business-elite" || p === "6") {
    return (
      <div className="mini-receipt mini-receipt-elite">
        <div className="mini-tax-invoice-badge">TAX INVOICE</div>
        <div className="mini-party-col" style={{ textAlign: "center", margin: "0.2rem 0" }}>
          <b>Techno Corp</b>
          <span>GSTIN: 29AABCT9981K1ZT</span>
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
          <div><span>GST (18%)</span><span>₹585.00</span></div>
        </div>
        <div className="mini-total-elite" style={{ background: template.gradient || "linear-gradient(135deg, #FB821B 0%, #F66016 100%)" }}>
          <span>TOTAL INVOICE</span>
          <span>₹3,835.00</span>
        </div>
        <div className="mini-thank-subtle">Terms & conditions apply. Thank you!</div>
      </div>
    )
  }

  // Default fallback
  return (
    <div className="mini-receipt">
      <div className="mini-header">
        <span className="mini-logo" style={{ background: template.gradient || "linear-gradient(135deg, #FB821B 0%, #F66016 100%)" }}>S</span>
        <span className="mini-shop">{template.name || "Shop Name"}</span>
      </div>
      <div className="mini-divider" />
      <div className="mini-items">
        <div className="mini-item"><span>Standard Item</span><span>₹100</span></div>
      </div>
      <div className="mini-divider" />
      <div className="mini-total">
        <span>Total</span>
        <span style={{ color: template.color || "#F66016" }}>₹100</span>
      </div>
    </div>
  )
}
