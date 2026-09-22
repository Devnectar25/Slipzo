import React from "react"
import { money, formatNumberByLang } from "../lib/utils"
import { useDbTranslation } from "../lib/translator"

export function MiniReceiptPreview({ template }) {
  const { tDb, formatNum, lang } = useDbTranslation()
  const isMr = (lang || "").toLowerCase().startsWith("mr")
  const isHi = (lang || "").toLowerCase().startsWith("hi")

  const lbl = (en, mr, hi) => {
    if (isMr) return mr
    if (isHi) return hi
    return en
  }

  const p = String(template.preview || template.id || "").toLowerCase()

  // 1. MINIMAL CLEAN BILL
  if (p === "minimal" || p === "2" || name.includes("minimal")) {
    return (
      <div className="mini-receipt mini-receipt-minimal">
        <div className="mini-header-centered">
          <span className="mini-logo-dot" style={{ background: template.gradient || "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)" }}>S</span>
          <span className="mini-shop-title">MINIMAL CAFE</span>
          <span className="mini-subtext-muted">{tDb("MG Road, Bengaluru")}</span>
        </div>
        <div className="mini-line-subtle" />
        <div className="mini-meta-minimal">
          <span>#INV-{formatNum(102)}</span>
          <span>{formatNum("02:45 PM")}</span>
        </div>
        <div className="mini-items-clean">
          <div className="mini-item-clean">
            <div>
              <span className="mini-item-title">{tDb("Espresso Shot")}</span>
              <small className="mini-item-sub">{formatNum(1)} × {money(120)}</small>
            </div>
            <span className="mini-item-amt">{money(120)}</span>
          </div>
          <div className="mini-item-clean">
            <div>
              <span className="mini-item-title">{tDb("Butter Croissant")}</span>
              <small className="mini-item-sub">{formatNum(1)} × {money(100)}</small>
            </div>
            <span className="mini-item-amt">{money(100)}</span>
          </div>
        </div>
        <div className="mini-line-subtle" />
        <div className="mini-total-bold">
          <span>{lbl("TOTAL", "एकूण", "कुल")}</span>
          <span style={{ color: template.color || "#0ea5e9" }}>{money(220)}</span>
        </div>
        <div className="mini-paid-badge-minimal">{lbl("PAID VIA UPI", "यूपीआय द्वारे भरले", "यूपीआई द्वारा भुगतान")}</div>
        <div className="mini-thank-subtle">{tDb("thank you for visiting")}</div>
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
          <span className="mini-shop">CLASSIC MART</span>
          <span className="mini-subtext">{tDb("Connaught Place, New Delhi")}</span>
          <span className="mini-gst-tag">GSTIN: 07AAAA000A1Z5</span>
        </div>
        <div className="mini-double-divider" />
        <div className="mini-meta-grid">
          <div><span>{lbl("INV:", "पावती:", "चालान:")}</span> <b>#{formatNum(8821)}</b></div>
          <div><span>{lbl("DATE:", "दिनांक:", "दिनांक:")}</span> <b>{formatNum("09-MAR")}</b></div>
        </div>
        <div className="mini-dashed-divider" />
        <div className="mini-items-table">
          <div className="mini-table-head">
            <span>{lbl("ITEM", "वस्तू", "आइटम")}</span>
            <span>{lbl("QTY", "नग", "मात्रा")}</span>
            <span>{lbl("AMT", "रक्कम", "राशि")}</span>
          </div>
          <div className="mini-item"><span>{tDb("Basmati Rice 1kg")}</span><span>{formatNum(2)}</span><span>{money(240)}</span></div>
          <div className="mini-item"><span>{tDb("Sunflower Oil 1L")}</span><span>{formatNum(1)}</span><span>{money(195)}</span></div>
        </div>
        <div className="mini-dashed-divider" />
        <div className="mini-tax-breakdown">
          <div><span>{lbl("Subtotal", "उप-एकूण", "उप-योग")}</span><span>{money(435)}</span></div>
          <div><span>{lbl("GST (18%)", `जीएसटी (${formatNum(18)}%)`, `जीएसटी (${formatNum(18)}%)`)}</span><span>{money(78.3)}</span></div>
        </div>
        <div className="mini-total-row-classic">
          <span>{lbl("GRAND TOTAL", "एकूण देय रक्कम", "कुल राशि")}</span>
          <span style={{ color: template.color || "#0284c7" }}>{money(513.3)}</span>
        </div>
        <div className="mini-barcode-line">||| | |||| | |||||| || |</div>
        <div className="mini-policy-note">{tDb("Thank you! Please visit again.")}</div>
      </div>
    )
  }

  // 3. SHOP PRO (RETAIL POS)
  if (p === "pro" || p === "shop-pro" || p === "3" || name.includes("pro") || name.includes("retail")) {
    return (
      <div className="mini-receipt mini-receipt-pro">
        <div className="mini-pro-banner" style={{ background: template.gradient || "linear-gradient(135deg, #60a5fa 0%, #1d4ed8 100%)" }}>
          <span>URBAN FASHION PRO</span>
          <small>{lbl("RETAIL POS RECEIPT", "किरकोळ विक्री पावती", "खुदरा बिक्री रसीद")}</small>
        </div>
        <div className="mini-meta-grid" style={{ fontSize: "0.6rem", padding: "0.2rem 0" }}>
          <div><span>{lbl("BILL:", "बिल:", "बिल:")}</span> <b>#{formatNum(4401)}</b></div>
          <div><span>{lbl("DATE:", "दिनांक:", "दिनांक:")}</span> <b>{formatNum("09-MAR")}</b></div>
        </div>
        <div className="mini-items">
          <div className="mini-item">
            <span>{tDb("Pure Linen Shirt (x1)")}</span>
            <span>{money(1499)}</span>
          </div>
          <div className="mini-item">
            <span>{tDb("Classic Denim Jeans")}</span>
            <span>{money(1899)}</span>
          </div>
        </div>
        <div className="mini-line-subtle" />
        <div className="mini-tax-breakdown">
          <div><span>{lbl("Subtotal", "उप-एकूण", "उप-योग")}</span><span>{money(3398)}</span></div>
          <div><span>{lbl("Discount", "सवलत", "छूट")}</span><span>-{money(300)}</span></div>
        </div>
        <div className="mini-total">
          <span>{lbl("Net Payable", "निव्वळ देय", "शुद्ध देय")}</span>
          <span style={{ color: template.color || "#2563eb" }}>{money(3098)}</span>
        </div>
        <div className="mini-thank-subtle">{tDb("Thank you for shopping with us!")}</div>
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
          <span className="mini-time-mono">BILL# {formatNum(7734)} | {formatNum("09-MAR")} | {formatNum("11:30AM")}</span>
        </div>
        <div className="mini-divider-dots" />
        <div className="mini-items-mono">
          <div className="mini-item-mono"><span>{formatNum(2)}x Pomegranate</span><span>{money(160)}</span></div>
          <div className="mini-item-mono"><span>{formatNum(1)}x Fruit Bowl</span><span>{money(120)}</span></div>
        </div>
        <div className="mini-divider-dots" />
        <div className="mini-total-box" style={{ borderColor: template.color || "#0d9488" }}>
          <span>{lbl("TOTAL:", "एकूण:", "कुल:")}</span>
          <span>{money(280)}</span>
        </div>
        <div className="mini-thank-subtle" style={{ fontFamily: "monospace", fontSize: "0.62rem" }}>
          {lbl("PAID VIA UPI · THANK YOU", "यूपीआय द्वारे भरले · धन्यवाद", "यूपीआई द्वारा भुगतान · धन्यवाद")}
        </div>
        <div className="mini-sawtooth-cut bottom" />
      </div>
    )
  }

  // 5. MODERN SHOP (BOUTIQUE & CAFE)
  if (p === "modern" || p === "modern-retail" || p === "5") {
    return (
      <div className="mini-receipt mini-receipt-modern">
        <span className="mini-shop-modern">Lumina Boutique & Spa</span>
        <div className="mini-subtext-muted">{tDb("Koramangala, Bengaluru")}</div>
        <div className="mini-meta-minimal">
          <span>#LUM-{formatNum(55)}</span>
          <span>{formatNum("05:15 PM")}</span>
        </div>
        <div className="mini-items-modern">
          <div className="mini-item-pill">
            <span>Rose Water Toner</span>
            <span className="mini-price-pill" style={{ background: '#e0f2fe', color: template.color || "#0ea5e9" }}>{money(450)}</span>
          </div>
          <div className="mini-item-pill">
            <span>Facial Serum 50ml</span>
            <span className="mini-price-pill" style={{ background: '#e0f2fe', color: template.color || "#0ea5e9" }}>{money(890)}</span>
          </div>
        </div>
        <div className="mini-total-modern">
          <span>{lbl("Amount Due", "देय रक्कम", "देय राशि")}</span>
          <span style={{ color: template.color || "#0ea5e9" }}>{money(1340)}</span>
        </div>
        <div className="mini-thank-subtle">{tDb("Thank you for your visit!")}</div>
      </div>
    )
  }

  // 6. BUSINESS ELITE (FORMAL TAX INVOICE)
  if (p === "elite" || p === "business-elite" || p === "6") {
    return (
      <div className="mini-receipt mini-receipt-elite">
        <div className="mini-tax-invoice-badge">{lbl("TAX INVOICE", "कर पावती", "कर चालान")}</div>
        <div className="mini-party-col" style={{ textAlign: "center", margin: "0.2rem 0" }}>
          <b>Techno Corp</b>
          <span>GSTIN: 29AABCT9981K1ZT</span>
        </div>
        <div className="mini-meta-grid" style={{ fontSize: "0.6rem" }}>
          <div><span>{lbl("INV:", "पावती:", "चालान:")}</span> <b>#TC-{formatNum(904)}</b></div>
          <div><span>{lbl("DATE:", "दिनांक:", "दिनांक:")}</span> <b>{formatNum("09-MAR")}</b></div>
        </div>
        <div className="mini-divider-double" />
        <div className="mini-items-elite">
          <div className="mini-item-elite-row">
            <span>Wireless Mouse (x{formatNum(1)})</span>
            <span>{money(850)}</span>
          </div>
          <div className="mini-item-elite-row">
            <span>Mech Keyboard (x{formatNum(1)})</span>
            <span>{money(2400)}</span>
          </div>
        </div>
        <div className="mini-cgst-sgst">
          <div><span>{lbl("Subtotal", "उप-एकूण", "उप-योग")}</span><span>{money(3250)}</span></div>
          <div><span>{lbl("GST (18%)", `जीएसटी (${formatNum(18)}%)`, `जीएसटी (${formatNum(18)}%)`)}</span><span>{money(585)}</span></div>
        </div>
        <div className="mini-total-elite" style={{ background: template.gradient || "linear-gradient(135deg, #38bdf8 0%, #0369a1 100%)" }}>
          <span>{lbl("TOTAL INVOICE", "एकूण पावती", "कुल चालान")}</span>
          <span>{money(3835)}</span>
        </div>
        <div className="mini-thank-subtle">{lbl("Terms & conditions apply. Thank you!", "अटी व शर्ती लागू. धन्यवाद!", "नियम व शर्तें लागू। धन्यवाद!")}</div>
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
        <div className="mini-item"><span>{tDb("Standard Item")}</span><span>{money(100)}</span></div>
      </div>
      <div className="mini-divider" />
      <div className="mini-total">
        <span>{lbl("Total", "एकूण", "कुल")}</span>
        <span style={{ color: template.color || "#0ea5e9" }}>{money(100)}</span>
      </div>
    </div>
  )
}
