import React from "react"

export function MiniReceiptPreview({ template }) {
  const p = template.preview || template.id

  if (p === "minimal" || p === 2 || p === "2") {
    return (
      <div className="mini-receipt mini-receipt-minimal">
        <div className="mini-header-centered">
          <span className="mini-logo-dot" style={{ background: template.gradient || "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)" }}>S</span>
          <span className="mini-shop-title">MINIMAL CAFE</span>
        </div>
        <div className="mini-line-subtle" />
        <div className="mini-items-clean">
          <div className="mini-item-clean"><span>Espresso</span><span>₹120</span></div>
          <div className="mini-item-clean"><span>Croissant</span><span>₹100</span></div>
        </div>
        <div className="mini-line-subtle" />
        <div className="mini-total-bold">
          <span>TOTAL</span>
          <span style={{ color: template.color || "#0ea5e9" }}>₹220</span>
        </div>
      </div>
    )
  }

  if (p === "classic" || p === 1 || p === "1") {
    return (
      <div className="mini-receipt mini-receipt-classic">
        <div className="mini-header">
          <span className="mini-logo" style={{ background: template.gradient || "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)" }}>S</span>
          <div className="mini-shop-details">
            <span className="mini-shop">Classic Mart</span>
            <span className="mini-subtext">GSTIN: 07AAAA000A</span>
          </div>
        </div>
        <div className="mini-dashed-divider" />
        <div className="mini-items-table">
          <div className="mini-table-head"><span>ITEM</span><span>QTY</span><span>AMT</span></div>
          <div className="mini-item"><span>Rice 1kg</span><span>2</span><span>₹240</span></div>
          <div className="mini-item"><span>Oil 1L</span><span>1</span><span>₹195</span></div>
        </div>
        <div className="mini-dashed-divider" />
        <div className="mini-tax-breakdown">
          <div><span>Subtotal</span><span>₹435</span></div>
          <div><span>GST (18%)</span><span>₹78.30</span></div>
        </div>
        <div className="mini-total-row">
          <span>Total Paid</span>
          <span style={{ color: template.color || "#0284c7" }}>₹513.30</span>
        </div>
      </div>
    )
  }

  if (p === "pro" || p === "shop-pro" || p === 3 || p === "3") {
    return (
      <div className="mini-receipt mini-receipt-pro">
        <div className="mini-pro-banner" style={{ background: template.gradient || "linear-gradient(135deg, #60a5fa 0%, #1d4ed8 100%)" }}>
          <span>URBAN STORE</span>
          <small>RETAIL PRO</small>
        </div>
        <div className="mini-items">
          <div className="mini-item"><span>Linen Shirt</span><span>₹1,499</span></div>
          <div className="mini-item"><span>Chino Pants</span><span>₹1,899</span></div>
        </div>
        <div className="mini-discount-tag"><span>Discount</span><span>-₹300</span></div>
        <div className="mini-total">
          <span>Net Total</span>
          <span style={{ color: template.color || "#2563eb" }}>₹3,098</span>
        </div>
        <div className="mini-pro-footer">
          <div className="mini-qr-code" style={{ borderColor: template.color || "#2563eb" }}>
            <span>QR</span>
          </div>
          <span className="mini-loyalty">★ 60 Pts Earned</span>
        </div>
      </div>
    )
  }

  if (p === "eco" || p === "eco-thermal" || p === 4 || p === "4") {
    return (
      <div className="mini-receipt mini-receipt-eco">
        <div className="mini-zigzag-top" />
        <div className="mini-header-compact">
          <span className="mini-shop-mono">KRISHNA JUICE (58mm)</span>
          <span className="mini-time-mono">11:30 AM · #7734</span>
        </div>
        <div className="mini-divider-dots" />
        <div className="mini-items-mono">
          <div className="mini-item-mono"><span>2x Pomegranate</span><span>₹160</span></div>
          <div className="mini-item-mono"><span>1x Fruit Bowl</span><span>₹120</span></div>
        </div>
        <div className="mini-divider-dots" />
        <div className="mini-total-box" style={{ borderColor: template.color || "#0d9488" }}>
          <span>TOTAL</span>
          <span>₹280</span>
        </div>
        <div className="mini-zigzag-bottom" />
      </div>
    )
  }

  if (p === "modern" || p === "modern-retail" || p === 5 || p === "5") {
    return (
      <div className="mini-receipt mini-receipt-modern">
        <div className="mini-modern-badge" style={{ background: template.color || "#0ea5e9" }}>
          BOUTIQUE
        </div>
        <span className="mini-shop-modern">Lumina Beauty</span>
        <div className="mini-pill-tag">Skin & Haircare</div>
        <div className="mini-items-modern">
          <div className="mini-item-pill">
            <span>Rose Water Toner</span>
            <span className="mini-price-pill" style={{ background: '#e0f2fe', color: template.color || "#0ea5e9" }}>₹450</span>
          </div>
          <div className="mini-item-pill">
            <span>Serum 50ml</span>
            <span className="mini-price-pill" style={{ background: '#e0f2fe', color: template.color || "#0ea5e9" }}>₹890</span>
          </div>
        </div>
        <div className="mini-total-modern">
          <span>Amount Due</span>
          <span style={{ color: template.color || "#0ea5e9" }}>₹1,340</span>
        </div>
        <div className="mini-social-footer">@luminabeauty · slipzo</div>
      </div>
    )
  }

  if (p === "elite" || p === "business-elite" || p === 6 || p === "6") {
    return (
      <div className="mini-receipt mini-receipt-elite">
        <div className="mini-tax-invoice-badge">TAX INVOICE</div>
        <div className="mini-header-elite">
          <span className="mini-shop-bold">TECHNO CORP</span>
          <span className="mini-hsn">HSN: 8471</span>
        </div>
        <div className="mini-divider-double" />
        <div className="mini-items-elite">
          <div className="mini-item"><span>Wireless Mouse</span><span>₹850</span></div>
          <div className="mini-item"><span>Mech Keyboard</span><span>₹2,400</span></div>
        </div>
        <div className="mini-cgst-sgst">
          <div><span>CGST 9%</span><span>₹292.50</span></div>
          <div><span>SGST 9%</span><span>₹292.50</span></div>
        </div>
        <div className="mini-total-elite" style={{ background: template.gradient || "linear-gradient(135deg, #38bdf8 0%, #0369a1 100%)" }}>
          <span>GRAND TOTAL</span>
          <span>₹3,835</span>
        </div>
        <div className="mini-signatory">Authorized Signatory</div>
      </div>
    )
  }

  return (
    <div className="mini-receipt">
      <div className="mini-header">
        <span className="mini-logo" style={{ background: template.gradient }}>S</span>
        <span className="mini-shop">Shop Name</span>
      </div>
      <div className="mini-divider" />
      <div className="mini-items">
        <div className="mini-item"><span>Item 1</span><span>₹100</span></div>
        <div className="mini-item"><span>Item 2</span><span>₹50</span></div>
      </div>
      <div className="mini-divider" />
      <div className="mini-total">
        <span>Total</span>
        <span style={{ color: template.color }}>₹150</span>
      </div>
    </div>
  )
}
