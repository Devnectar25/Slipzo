import React from "react"
import { useDbTranslation } from "../lib/translator"

export function MiniReceiptPreview({ template }) {
  const { tDb } = useDbTranslation()

  const p = String(template.preview || template.builtin_id || template.templateId || template.id || "").toLowerCase()
  const n = String(template.name || "").toLowerCase()

  const isClassic = p === "classic" || p === "1" || n.includes("classic")
  const isMinimal = p === "minimal" || p === "2" || n.includes("minimal")
  const isPro = p === "pro" || p === "shop-pro" || p === "3" || n.includes("pro")
  const isEco = p === "eco" || p === "eco-thermal" || p === "4" || n.includes("eco")
  const isModern = p === "modern" || p === "modern-retail" || p === "5" || n.includes("modern")
  const isElite = p === "elite" || p === "business-elite" || p === "6" || n.includes("elite") || n.includes("business")

  // 1. CLASSIC RECEIPT (Card 1)
  if (isClassic) {
    return (
      <div className="mini-receipt mini-receipt-classic-exact" style={{ background: "#ffffff", padding: "10px 14px", borderRadius: "10px", width: "210px", margin: "0 auto", boxSizing: "border-box", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div className="mini-shop-header-exact" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1px", marginBottom: "4px" }}>
          <div style={{ border: "1.5px solid #0284c7", color: "#0284c7", width: "18px", height: "18px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "10px" }}>S</div>
          <span style={{ fontWeight: 800, fontSize: "11px", color: "#0f172a", marginTop: "1px" }}>CLASSIC MART</span>
          <span style={{ fontSize: "9px", color: "#64748b" }}>Connaught Place, New Delhi</span>
          <span style={{ fontSize: "8px", color: "#94a3b8" }}>GSTIN: 07AAAAA0000A1Z5</span>
        </div>
        <div style={{ borderTop: "1px dashed #cbd5e1", margin: "4px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#64748b", fontWeight: 600 }}>
          <span>INV: #8821</span>
          <span>DATE: 09-MAR</span>
        </div>
        <div style={{ borderTop: "1px solid #0f172a", margin: "4px 0 3px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", fontWeight: 800, color: "#0f172a", borderBottom: "1px solid #0f172a", paddingBottom: "2px" }}>
          <span style={{ flex: 1.5, textAlign: "left" }}>ITEM</span>
          <span style={{ width: "26px", textAlign: "center" }}>QTY</span>
          <span style={{ flex: 1, textAlign: "right" }}>AMT</span>
        </div>
        <div style={{ margin: "3px 0", display: "flex", flexDirection: "column", gap: "2px", fontSize: "9px", textAlign: "left" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ flex: 1.5, color: "#334155" }}>Basmati Rice 1kg</span>
            <span style={{ width: "26px", textAlign: "center", color: "#64748b" }}>2</span>
            <span style={{ flex: 1, textAlign: "right", fontWeight: 600, color: "#0f172a" }}>₹240.00</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ flex: 1.5, color: "#334155" }}>Sunflower Oil 1L</span>
            <span style={{ width: "26px", textAlign: "center", color: "#64748b" }}>1</span>
            <span style={{ flex: 1, textAlign: "right", fontWeight: 600, color: "#0f172a" }}>₹195.00</span>
          </div>
        </div>
        <div style={{ borderTop: "1px dashed #cbd5e1", margin: "4px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#64748b", fontWeight: 600 }}>
          <span>Subtotal</span>
          <span>₹435.00</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "3px 0 4px 0" }}>
          <span style={{ fontWeight: 800, fontSize: "10px", color: "#0f172a" }}>GRAND TOTAL</span>
          <span style={{ fontWeight: 800, fontSize: "11px", color: "#0284c7" }}>₹435.00</span>
        </div>
        <div style={{ fontSize: "9px", letterSpacing: "1.5px", color: "#94a3b8", margin: "4px 0 2px 0" }}>||||| | ||||| | |||||</div>
        <div style={{ fontSize: "8px", color: "#94a3b8", fontStyle: "italic", textAlign: "center" }}>Thank you! Please come again.</div>
      </div>
    )
  }

  // 2. MINIMAL CLEAN BILL (Card 2)
  if (isMinimal) {
    return (
      <div className="mini-receipt mini-receipt-minimal-exact" style={{ background: "#ffffff", padding: "10px 14px", borderRadius: "10px", width: "210px", margin: "0 auto", boxSizing: "border-box", textAlign: "left", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div className="mini-shop-header-exact" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1px", marginBottom: "6px" }}>
          <div style={{ background: "#0ea5e9", color: "#ffffff", width: "18px", height: "18px", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "10px" }}>S</div>
          <span style={{ fontWeight: 800, fontSize: "11px", color: "#0f172a", marginTop: "1px" }}>MINIMAL CAFE</span>
          <span style={{ fontSize: "9px", color: "#94a3b8" }}>MG Road, Bengaluru</span>
        </div>
        <div style={{ borderTop: "1px dashed #e2e8f0", margin: "4px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#94a3b8", fontWeight: 500 }}>
          <span>#INV-102</span>
          <span>02:45 PM</span>
        </div>
        <div style={{ margin: "4px 0", display: "flex", flexDirection: "column", gap: "3px", fontSize: "9.5px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#334155" }}>Espresso Shot <small style={{ color: "#94a3b8" }}>× ₹120.00</small></span>
            <span style={{ fontWeight: 600, color: "#0f172a" }}>₹120.00</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#334155" }}>Butter Croissant <small style={{ color: "#94a3b8" }}>× ₹100.00</small></span>
            <span style={{ fontWeight: 600, color: "#0f172a" }}>₹100.00</span>
          </div>
        </div>
        <div style={{ borderTop: "1px dashed #e2e8f0", margin: "4px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "4px 0" }}>
          <span style={{ fontWeight: 800, fontSize: "10px", color: "#0f172a" }}>TOTAL</span>
          <span style={{ fontWeight: 800, fontSize: "11px", color: "#0ea5e9" }}>₹220.00</span>
        </div>
        <div style={{ marginTop: "4px" }}>
          <span style={{ background: "#f1f5f9", padding: "1px 6px", borderRadius: "3px", fontSize: "8px", fontWeight: 700, color: "#475569", letterSpacing: "0.5px" }}>PAID VIA UPI</span>
        </div>
        <div style={{ marginTop: "4px", fontSize: "8px", color: "#94a3b8", fontStyle: "italic", textAlign: "center" }}>thank you for visiting</div>
      </div>
    )
  }

  // 3. SHOP PRO (Card 3)
  if (isPro) {
    return (
      <div className="mini-receipt mini-receipt-pro-exact" style={{ background: "#ffffff", padding: "10px 14px", borderRadius: "10px", width: "210px", margin: "0 auto", boxSizing: "border-box", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ background: "#2563eb", color: "#ffffff", padding: "4px 6px", borderRadius: "4px", display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "6px" }}>
          <span style={{ fontWeight: 800, fontSize: "10px", letterSpacing: "0.5px" }}>URBAN FASHION PRO</span>
          <span style={{ fontSize: "7.5px", opacity: 0.85, letterSpacing: "0.5px" }}>RETAIL POS RECEIPT</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>
          <span>BILL: #4401</span>
          <span>DATE: 09-MAR</span>
        </div>
        <div style={{ margin: "3px 0", display: "flex", flexDirection: "column", gap: "2px", fontSize: "9px", textAlign: "left" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#334155" }}>Pure Linen Shirt (x1)</span>
            <span style={{ fontWeight: 600, color: "#0f172a" }}>₹1499.00</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#334155" }}>Classic Denim Jeans</span>
            <span style={{ fontWeight: 600, color: "#0f172a" }}>₹1899.00</span>
          </div>
        </div>
        <div style={{ borderTop: "1px dashed #cbd5e1", margin: "4px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#64748b" }}>
          <span>Subtotal</span>
          <span>₹3398.00</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#dc2626" }}>
          <span>Discount</span>
          <span>-₹300.00</span>
        </div>
        <div style={{ borderTop: "1px solid #e2e8f0", margin: "3px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 800, fontSize: "10px", color: "#0f172a" }}>Net Payable</span>
          <span style={{ fontWeight: 800, fontSize: "11px", color: "#2563eb" }}>₹3098.00</span>
        </div>
        <div style={{ marginTop: "6px", fontSize: "8px", color: "#94a3b8", fontStyle: "italic" }}>Thank you for shopping with us!</div>
      </div>
    )
  }

  // 4. ECO PRINT (Card 4)
  if (isEco) {
    return (
      <div className="mini-receipt mini-receipt-eco-exact" style={{ background: "#f0fdf4", padding: "10px 14px", borderRadius: "10px", width: "210px", margin: "0 auto", boxSizing: "border-box", textAlign: "left", fontFamily: "monospace", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ textAlign: "center", fontWeight: 800, fontSize: "10px", color: "#166534", marginBottom: "3px" }}>*** KRISHNA JUICE ***</div>
        <div style={{ textAlign: "center", fontSize: "8px", color: "#15803d" }}>OTLB 7734 | 09-MAR | 11:30AM</div>
        <div style={{ borderTop: "1px dashed #bbf7d0", margin: "4px 0" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "9px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#166534" }}>2x Pomegranate</span>
            <span style={{ fontWeight: 700, color: "#14532d" }}>₹160.00</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#166534" }}>1x Fruit Bowl</span>
            <span style={{ fontWeight: 700, color: "#14532d" }}>₹120.00</span>
          </div>
        </div>
        <div style={{ borderTop: "1px dashed #bbf7d0", margin: "4px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "10px", color: "#14532d" }}>
          <span>TOTAL:</span>
          <span>₹280.00</span>
        </div>
        <div style={{ borderTop: "1px dashed #bbf7d0", margin: "4px 0" }} />
        <div style={{ fontSize: "8px", color: "#15803d", fontWeight: 700, textAlign: "center" }}>PAID VIA UPI - THANK YOU</div>
      </div>
    )
  }

  // 5. MODERN SHOP (Card 5)
  if (isModern) {
    return (
      <div className="mini-receipt mini-receipt-modern-exact" style={{ background: "#ffffff", padding: "10px 14px", borderRadius: "10px", width: "210px", margin: "0 auto", boxSizing: "border-box", textAlign: "left", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ textAlign: "center", marginBottom: "4px" }}>
          <div style={{ fontWeight: 800, fontSize: "11px", color: "#0f172a" }}>Lumina Boutique & Spa</div>
          <div style={{ fontSize: "8px", color: "#94a3b8" }}>Koramangala, Bengaluru</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8.5px", color: "#94a3b8", marginBottom: "4px" }}>
          <span>#LUM-55</span>
          <span>05:15 PM</span>
        </div>
        <div style={{ borderTop: "1px solid #f1f5f9", margin: "3px 0" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "9px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#475569" }}>Rose Water Toner</span>
            <span style={{ fontWeight: 600, color: "#2563eb" }}>₹450.00</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#475569" }}>Facial Serum 50ml</span>
            <span style={{ fontWeight: 600, color: "#2563eb" }}>₹890.00</span>
          </div>
        </div>
        <div style={{ borderTop: "1px solid #f1f5f9", margin: "4px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: "10px", color: "#0f172a" }}>Amount Due</span>
          <span style={{ fontWeight: 800, fontSize: "11px", color: "#2563eb" }}>₹1340.00</span>
        </div>
        <div style={{ marginTop: "4px", fontSize: "8px", color: "#94a3b8", fontStyle: "italic", textAlign: "center" }}>Thank you for your visit!</div>
      </div>
    )
  }

  // 6. BUSINESS ELITE (Card 6)
  if (isElite) {
    return (
      <div className="mini-receipt mini-receipt-elite-exact" style={{ background: "#ffffff", padding: "10px 14px", borderRadius: "10px", width: "210px", margin: "0 auto", boxSizing: "border-box", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: "8px", fontWeight: 800, color: "#2563eb", letterSpacing: "1px", marginBottom: "1px" }}>TAX INVOICE</div>
        <div style={{ fontWeight: 800, fontSize: "10px", color: "#0f172a" }}>Techno Corp</div>
        <div style={{ fontSize: "8px", color: "#94a3b8", marginBottom: "4px" }}>Electronic City, Bengaluru</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8.5px", color: "#64748b", fontWeight: 600, borderTop: "1px solid #f1f5f9", paddingTop: "3px" }}>
          <span>INV: #TC-904</span>
          <span>DATE: 09-MAR</span>
        </div>
        <div style={{ margin: "3px 0", display: "flex", flexDirection: "column", gap: "2px", fontSize: "9px", textAlign: "left" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#334155" }}>Wireless Mouse (x1)</span>
            <span style={{ fontWeight: 600, color: "#0f172a" }}>₹850.00</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#334155" }}>Mech Keyboard (x1)</span>
            <span style={{ fontWeight: 600, color: "#0f172a" }}>₹2600.00</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: "8px", marginTop: "1px" }}>
            <span>Subtotal</span>
            <span>₹3450.00</span>
          </div>
        </div>
        <div style={{ background: "#0284c7", color: "#ffffff", padding: "3px 6px", borderRadius: "4px", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
          <span style={{ fontSize: "8px", fontWeight: 700 }}>TOTAL AMOUNT</span>
          <span style={{ fontSize: "10px", fontWeight: 800 }}>₹3250.00</span>
        </div>
        <div style={{ marginTop: "4px", fontSize: "7.5px", color: "#94a3b8", fontStyle: "italic" }}>Terms & conditions apply. Thank you!</div>
      </div>
    )
  }

  // Default fallback
  return (
    <div className="mini-receipt mini-receipt-classic-exact" style={{ background: "#ffffff", padding: "10px 14px", borderRadius: "10px", width: "210px", margin: "0 auto", boxSizing: "border-box", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <div className="mini-shop-header-exact">
        <div className="mini-s-logo-dot">S</div>
        <span className="mini-shop-name-exact">{tDb(template.name || "NEHA'S SHOP")}</span>
        <span className="mini-receipt-type-sub">Cash Receipt</span>
      </div>
      <div className="mini-divider-hairline" />
      <div className="mini-table-header-row">
        <span>Item</span>
        <span>Qty</span>
        <span>Amount</span>
      </div>
      <div className="mini-divider-hairline" />
      <div className="mini-items-rows-exact">
        <div className="mini-item-row-exact">
          <span>Sample Item</span>
          <span>1</span>
          <span>₹100.00</span>
        </div>
      </div>
      <div className="mini-divider-hairline" />
      <div className="mini-total-row-exact">
        <span>Total</span>
        <span className="mini-total-val-exact">₹100.00</span>
      </div>
      <div className="mini-footer-note-exact">Thank you!</div>
    </div>
  )
}
