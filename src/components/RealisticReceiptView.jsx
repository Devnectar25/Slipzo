import React from "react"
import { MapPin, Phone } from "lucide-react"
import { money, formatNumberByLang } from "../lib/utils"
import { useDbTranslation } from "../lib/translator"

export function RealisticReceiptView({ template }) {
  if (!template) return null

  const { tDb, formatNum, lang } = useDbTranslation()
  const isMr = (lang || "").toLowerCase().startsWith("mr")
  const isHi = (lang || "").toLowerCase().startsWith("hi")

  const lbl = (en, mr, hi) => {
    if (isMr) return mr
    if (isHi) return hi
    return en
  }

  const rawId = String(template.id || "").toLowerCase()
  const rawName = String(template.name || "").toLowerCase()
  const rawPreview = String(template.preview || template.templateId || "").toLowerCase()

  let p = "classic"
  if (rawName.includes("minimal") || rawId.includes("minimal") || rawId === "bcaa2c28-0aeb-468e-8789-d5edfd2eee0c" || rawPreview === "minimal" || rawPreview === "2") {
    p = "minimal"
  } else if (rawName.includes("pro") || rawId.includes("pro") || rawId === "b55d6642-d218-43c3-b8a8-918e87d9712d" || rawPreview === "pro" || rawPreview === "3") {
    p = "pro"
  } else if (rawName.includes("eco") || rawId.includes("eco") || rawId === "cc510d5f-07bf-4ce4-8c50-6ec1995c85f4" || rawPreview === "eco" || rawPreview === "4") {
    p = "eco"
  } else if (rawName.includes("modern") || rawId.includes("modern") || rawId === "4638c377-7094-4325-bf15-eb7c6de54ff6" || rawPreview === "modern" || rawPreview === "5") {
    p = "modern"
  } else if (rawName.includes("elite") || rawId.includes("elite") || rawId === "ee17a09d-5b86-47bc-b862-2fc6bbcba2b9" || rawPreview === "elite" || rawPreview === "6") {
    p = "elite"
  } else if (rawName.includes("classic") || rawId.includes("classic") || rawId === "0442d846-0a89-4d90-800a-48278ec089d7" || rawPreview === "classic" || rawPreview === "1") {
    p = "classic"
  }
  const data = template.previewData || {
    shopName: template.name || "Slipzo Mart",
    address: "Shop 14, Main Market, Connaught Place, New Delhi",
    phone: "+91 98765 43210",
    gst: "07AAAA000A1Z5",
    invoiceNo: "SLP-2026-101",
    date: "09 Mar 2026, 02:45 PM",
    items: [
      { name: "Basmati Rice 1kg", qty: 2, rate: 120, total: 240 },
      { name: "Refined Sunflower Oil 1L", qty: 1, rate: 195, total: 195 }
    ],
    subtotal: 435,
    discount: 0,
    tax: 0,
    total: 435,
    payment: "Cash",
    footer: template.footer || "Thank you for shopping with us! Please come again."
  }

  const items = Array.isArray(data.items) ? data.items : []
  const totalUnits = items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0)

  // =========================================================================
  // 1. MINIMAL CLEAN BILL (58mm Minimalist)
  // =========================================================================
  if (p === "minimal" || p === "2") {
    return (
      <div className="realistic-thermal-receipt tpl-style-minimal">
        <div className="receipt-paper-top" />
        <div className="receipt-content" style={{ padding: "0.75rem 0.65rem" }}>
          {/* Shop Header */}
          <div className="receipt-shop" style={{ textAlign: "center", borderBottom: "1.5px solid #0f172a", paddingBottom: "0.6rem" }}>
            <div className="minimal-dot-logo">{(data.shopName || "S").trim().charAt(0).toUpperCase()}</div>
            <h2 className="receipt-shop-name" style={{ fontSize: "1.25rem", fontWeight: 900, letterSpacing: "-0.3px", margin: "0.2rem 0 0", color: "#0f172a", lineHeight: 1.2 }}>
              {data.shopName}
            </h2>
            <p style={{ color: "#1e293b", fontSize: "0.82rem", fontWeight: 600, margin: "0.2rem 0 0", lineHeight: 1.3 }}>
              {[formatNum(data.phone), tDb(data.address)].filter(Boolean).join(" · ")}
            </p>
            {data.gst && (
              <p style={{ color: "#0f172a", fontSize: "0.8rem", fontWeight: 700, margin: "0.15rem 0 0" }}>
                {lbl("GSTIN:", "जीएसटी क्र.:", "जीएसटी:")} {data.gst}
              </p>
            )}
          </div>

          {/* Bill Meta - Safe Wrap without text overlap */}
          <div className="minimal-meta-clean receipt-meta" style={{ margin: "0.4rem 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "2px 8px", fontSize: "0.82rem", fontWeight: 700, color: "#0f172a", borderBottom: "1px solid #0f172a", paddingBottom: "0.3rem" }}>
            <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>#{formatNum(data.invoiceNo)}</span>
            <span style={{ whiteSpace: "nowrap", flexShrink: 0, marginLeft: "auto" }}>{formatNum(data.date)}</span>
          </div>

          {/* Customer Line */}
          {data.customerName && (
            <div className="receipt-customer-line" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#0f172a", margin: "0.2rem 0", fontWeight: 700, flexWrap: "wrap", gap: "4px" }}>
              <span><b>{data.customerName}</b></span>
              {data.customerPhone && <span style={{ whiteSpace: "nowrap" }}>{formatNum(data.customerPhone)}</span>}
            </div>
          )}

          {/* Items Table */}
          <div style={{ margin: "0.5rem 0" }}>
            {items.map((item, idx) => (
              <div className="minimal-item-entry" key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.3rem 0", borderBottom: "1px solid #e2e8f0" }}>
                <div className="minimal-item-info" style={{ flex: 1, minWidth: 0, paddingRight: "0.4rem" }}>
                  <div className="minimal-item-title" style={{ fontSize: "0.88rem", fontWeight: 700, color: "#0f172a", wordBreak: "break-word" }}>{tDb(item.name)}</div>
                  <small className="minimal-item-sub" style={{ fontSize: "0.78rem", color: "#334155", fontWeight: 600 }}>{formatNum(item.qty)} × {money(item.rate)}</small>
                </div>
                <span className="minimal-item-price" style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>{money(item.total)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{ borderTop: "1.5px solid #0f172a", paddingTop: "0.4rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 600, padding: "0.12rem 0", color: "#0f172a" }}>
              <span>{lbl("Subtotal", "उप-एकूण", "उप-योग")} ({formatNum(totalUnits)} {lbl("items", "वस्तू", "आइटम")})</span>
              <span>{money(data.subtotal)}</span>
            </div>
            {data.discount > 0 && (
              <div className="receipt-total-row discount" style={{ display: "flex", justifyContent: "space-between", padding: "0.12rem 0", color: "#dc2626", fontSize: "0.82rem", fontWeight: 700 }}>
                <span>{lbl("Discount", "सवलत", "छूट")}</span>
                <span>-{money(data.discount)}</span>
              </div>
            )}
            <div className="minimal-total-hero" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "2px solid #0f172a", marginTop: "0.35rem", paddingTop: "0.35rem", fontWeight: 900, fontSize: "1.08rem", color: "#0f172a" }}>
              <span>{lbl("TOTAL AMOUNT", "एकूण रक्कम", "कुल राशि")}</span>
              <span>{money(data.total)}</span>
            </div>
          </div>

          {/* Payment Mode */}
          <div style={{ textAlign: "center", margin: "0.5rem 0 0.2rem" }}>
            <div className="minimal-paid-stamp" style={{ display: "inline-block", padding: "0.15rem 0.55rem", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.5px", color: "#0f172a" }}>
              {lbl("PAID VIA", "द्वारे भरले", "द्वारा भुगतान")} {String(tDb(data.payment) || "CASH").toUpperCase()}
            </div>
          </div>

          {/* Footer Note with safe bottom clearance */}
          <p className="receipt-thanks" style={{ textAlign: "center", fontSize: "0.78rem", color: "#334155", fontWeight: 600, marginTop: "0.45rem", marginBottom: "0.6rem", paddingBottom: "0.4rem", fontStyle: "italic", lineHeight: 1.35, wordBreak: "break-word" }}>
            {tDb(data.footer)}
          </p>
        </div>
        <div className="receipt-paper-bottom" />
      </div>
    )
  }

  // =========================================================================
  // 2. CLASSIC RECEIPT (58mm / 80mm Standard)
  // =========================================================================
  if (p === "classic" || p === "1") {
    return (
      <div className="realistic-thermal-receipt tpl-style-classic">
        <div className="receipt-paper-top" />
        <div className="receipt-content" style={{ padding: "0.75rem 0.65rem" }}>
          {/* Shop Header */}
          <div className="receipt-shop" style={{ textAlign: "center", borderBottom: "2px solid #0f172a", paddingBottom: "0.6rem" }}>
            <div className="classic-crest">
              {(data.shopName || "S").trim().charAt(0).toUpperCase()}
            </div>
            <h2 className="receipt-shop-name" style={{ fontSize: "1.25rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.5px", margin: "0.2rem 0 0.1rem", color: "#0f172a", lineHeight: 1.2 }}>
              {data.shopName}
            </h2>
            <p style={{ fontSize: "0.82rem", color: "#1e293b", fontWeight: 600, margin: "0.1rem 0" }}>{tDb(data.address)}</p>
            <p style={{ fontSize: "0.82rem", color: "#1e293b", fontWeight: 600, margin: "0.1rem 0" }}>{lbl("Tel:", "फोन:", "फोन:")} {formatNum(data.phone)}</p>
            {data.gst && (
              <p style={{ fontSize: "0.82rem", color: "#0f172a", fontWeight: 800, margin: "0.1rem 0" }}>
                {lbl("GSTIN:", "जीएसटी क्र.:", "जीएसटीआईएन:")} {data.gst}
              </p>
            )}
          </div>

          {/* Meta Grid */}
          <div className="classic-meta-grid" style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "0.78rem", padding: "0.35rem 0.5rem", color: "#0f172a" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: "#475569", fontWeight: 600 }}>{lbl("INVOICE:", "पावती क्र.:", "चालान क्र.:")}</span> <b style={{ whiteSpace: "nowrap", fontWeight: 700 }}>#{formatNum(data.invoiceNo)}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: "#475569", fontWeight: 600 }}>{lbl("DATE:", "दिनांक:", "दिनांक:")}</span> <b style={{ whiteSpace: "nowrap", fontWeight: 700 }}>{formatNum(data.date)}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: "#475569", fontWeight: 600 }}>{lbl("PAYMENT:", "पेमेंट:", "भुगतान:")}</span> <b style={{ whiteSpace: "nowrap", fontWeight: 700 }}>{tDb(data.payment)}</b></div>
            {items.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: "#475569", fontWeight: 600 }}>{lbl("ITEMS:", "वस्तू:", "आइटम:")}</span> <b style={{ whiteSpace: "nowrap", fontWeight: 700 }}>{formatNum(items.length)} ({formatNum(totalUnits)} {lbl("pcs", "नग", "पीस")})</b></div>
            )}
          </div>

          <div className="classic-divider-double" style={{ borderTop: "2px double #0f172a", margin: "0.3rem 0" }} />

          {/* Customer Line */}
          {data.customerName && (
            <div className="receipt-customer-line" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", padding: "0.15rem 0", color: "#0f172a", fontWeight: 700, flexWrap: "wrap", gap: "4px" }}>
              <span><b>{data.customerName}</b></span>
              {data.customerPhone && <span style={{ whiteSpace: "nowrap" }}>{formatNum(data.customerPhone)}</span>}
            </div>
          )}

          {/* Items Table */}
          <div className="classic-items-table" style={{ margin: "0.45rem 0" }}>
            <div className="receipt-items-header" style={{ display: "grid", gridTemplateColumns: "1.7fr 0.45fr 0.85fr 1fr", gap: "6px", fontSize: "0.76rem", fontWeight: 900, borderBottom: "1.5px solid #0f172a", paddingBottom: "0.25rem", color: "#0f172a" }}>
              <span>{lbl("ITEM", "वस्तू", "आइटम")}</span>
              <span style={{ textAlign: "center" }}>{lbl("QTY", "नग", "मात्रा")}</span>
              <span style={{ textAlign: "right" }}>{lbl("RATE", "दर", "दर")}</span>
              <span style={{ textAlign: "right" }}>{lbl("AMOUNT", "रक्कम", "राशि")}</span>
            </div>
            {items.map((item, idx) => (
              <div className="receipt-item-row" key={idx} style={{ display: "grid", gridTemplateColumns: "1.7fr 0.45fr 0.85fr 1fr", gap: "6px", fontSize: "0.8rem", fontWeight: 600, padding: "0.25rem 0", borderBottom: "1px dotted #cbd5e1", color: "#0f172a" }}>
                <span style={{ wordBreak: "break-word" }}>{tDb(item.name)}</span>
                <span style={{ textAlign: "center", whiteSpace: "nowrap" }}>{formatNum(item.qty)}</span>
                <span style={{ textAlign: "right", whiteSpace: "nowrap" }}>{money(item.rate)}</span>
                <span style={{ textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>{money(item.total)}</span>
              </div>
            ))}
          </div>

          {/* Totals Section */}
          <div className="receipt-totals" style={{ fontSize: "0.82rem", fontWeight: 600, margin: "0.4rem 0", color: "#0f172a" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.12rem 0" }}>
              <span>{lbl("Subtotal", "उप-एकूण", "उप-योग")}</span>
              <span>{money(data.subtotal)}</span>
            </div>
            {data.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.12rem 0", color: "#dc2626", fontWeight: 700 }}>
                <span>{lbl("Discount", "सवलत", "छूट")}</span>
                <span>-{money(data.discount)}</span>
              </div>
            )}
          </div>

          {/* Grand Total Banner */}
          <div className="classic-grand-banner" style={{ display: "flex", justifyContent: "space-between", background: "#0f172a", color: "#ffffff", padding: "0.4rem 0.6rem", borderRadius: "4px", fontWeight: 900, fontSize: "1.08rem", margin: "0.4rem 0" }}>
            <span>{lbl("GRAND TOTAL", "एकूण देय रक्कम", "कुल राशि")}</span>
            <span>{money(data.total)}</span>
          </div>

          {/* Barcode Mock */}
          <div className="receipt-barcode-wrap" style={{ textAlign: "center", margin: "0.5rem 0 0.2rem" }}>
            <div className="receipt-barcode-bars" style={{ letterSpacing: "3px", fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>|||| ||| ||||| || |||||| ||</div>
            <div className="receipt-barcode-num" style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1e293b", marginTop: "0.1rem" }}>*{formatNum(data.invoiceNo)}*</div>
          </div>

          {/* Policy / Footer Note */}
          <div className="classic-policy-footer" style={{ textAlign: "center", fontSize: "0.78rem", fontWeight: 600, color: "#334155", borderTop: "1px dashed #cbd5e1", paddingTop: "0.35rem", marginTop: "0.35rem", marginBottom: "0.6rem", paddingBottom: "0.4rem" }}>
            <p style={{ margin: 0, wordBreak: "break-word" }}>{tDb(data.footer)}</p>
          </div>
        </div>
        <div className="receipt-paper-bottom" />
      </div>
    )
  }

  // =========================================================================
  // 3. SHOP PRO (80mm Retail Counter POS)
  // =========================================================================
  if (p === "pro" || p === "shop-pro" || p === "3") {
    return (
      <div className="realistic-thermal-receipt tpl-style-pro">
        <div className="receipt-paper-top" />
        <div className="receipt-content" style={{ padding: "0.75rem 0.65rem" }}>
          {/* Header Banner */}
          <div className="pro-store-ribbon" style={{ background: "#2563eb", color: "#ffffff", padding: "0.45rem 0.6rem", borderRadius: "6px", textAlign: "center", marginBottom: "0.4rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 900, margin: 0, letterSpacing: "0.3px", lineHeight: 1.2 }}>{data.shopName}</h2>
            <p style={{ fontSize: "0.72rem", fontWeight: 700, margin: "0.1rem 0 0", opacity: 0.95 }}>{lbl("RETAIL POS RECEIPT", "किरकोळ विक्री पावती", "खुदरा बिक्री रसीद")}</p>
          </div>

          {/* Contact & GSTIN */}
          <div style={{ textAlign: "center", fontSize: "0.8rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.4rem", lineHeight: 1.3 }}>
            <div>{tDb(data.address)}</div>
            <div>{lbl("Tel:", "फोन:", "फोन:")} {formatNum(data.phone)}</div>
            {data.gst && <div style={{ fontWeight: 800, color: "#0f172a" }}>{lbl("GSTIN:", "जीएसटी क्र.:", "जीएसटीआईएन:")} {data.gst}</div>}
          </div>

          {/* Meta Bar */}
          <div className="pro-meta-bar receipt-meta" style={{ display: "flex", flexDirection: "column", gap: "2px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "0.35rem 0.55rem", fontSize: "0.78rem", margin: "0.4rem 0", color: "#0f172a" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: "#475569", fontWeight: 600 }}>{lbl("BILL NO:", "बिल क्र.:", "बिल नं.:")}</span> <b style={{ whiteSpace: "nowrap", fontWeight: 700 }}>#{formatNum(data.invoiceNo)}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: "#475569", fontWeight: 600 }}>{lbl("DATE:", "दिनांक:", "दिनांक:")}</span> <b style={{ whiteSpace: "nowrap", fontWeight: 700 }}>{formatNum(data.date)}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: "#475569", fontWeight: 600 }}>{lbl("PAY:", "पेमेंट:", "भुगतान:")}</span> <b style={{ whiteSpace: "nowrap", fontWeight: 700 }}>{tDb(data.payment)}</b></div>
          </div>

          {/* Customer Line */}
          {data.customerName && (
            <div className="receipt-customer-line" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", padding: "0.15rem 0", color: "#0f172a", fontWeight: 700, flexWrap: "wrap", gap: "4px" }}>
              <span><b>{data.customerName}</b></span>
              {data.customerPhone && <span style={{ whiteSpace: "nowrap" }}>{formatNum(data.customerPhone)}</span>}
            </div>
          )}

          {/* Items Table */}
          <div className="receipt-items" style={{ margin: "0.45rem 0" }}>
            <div className="receipt-items-header" style={{ display: "grid", gridTemplateColumns: "1.7fr 0.45fr 0.85fr 1fr", gap: "6px", borderBottom: "2px solid #2563eb", padding: "0.25rem 0", fontSize: "0.76rem", fontWeight: 900, color: "#0f172a" }}>
              <span>{lbl("Item Description", "वस्तू तपशील", "आइटम विवरण")}</span>
              <span style={{ textAlign: "center" }}>{lbl("Qty", "नग", "मात्रा")}</span>
              <span style={{ textAlign: "right" }}>{lbl("Rate", "दर", "दर")}</span>
              <span style={{ textAlign: "right" }}>{lbl("Amount", "रक्कम", "राशि")}</span>
            </div>
            {items.map((item, idx) => (
              <div className="receipt-item-row" key={idx} style={{ display: "grid", gridTemplateColumns: "1.7fr 0.45fr 0.85fr 1fr", gap: "6px", padding: "0.3rem 0", borderBottom: "1px solid #f1f5f9", fontSize: "0.8rem" }}>
                <span style={{ fontWeight: 700, color: "#0f172a", wordBreak: "break-word" }}>{tDb(item.name)}</span>
                <span style={{ textAlign: "center", fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap" }}>{formatNum(item.qty)}</span>
                <span style={{ textAlign: "right", fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap" }}>{money(item.rate)}</span>
                <span style={{ textAlign: "right", fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>{money(item.total)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="receipt-totals" style={{ fontSize: "0.82rem", fontWeight: 600, margin: "0.4rem 0", color: "#0f172a" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.12rem 0" }}>
              <span>{lbl("Gross Subtotal", "एकूण उप-रक्कम", "सकल उप-योग")} ({formatNum(totalUnits)} {lbl("items", "वस्तू", "आइटम")})</span>
              <span>{money(data.subtotal)}</span>
            </div>
            {data.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.12rem 0", color: "#059669", fontWeight: 800 }}>
                <span>{lbl("Discount", "सवलत", "छूट")}</span>
                <span>-{money(data.discount)}</span>
              </div>
            )}
            <div className="receipt-grand-total" style={{ display: "flex", justifyContent: "space-between", borderTop: "2.5px solid #2563eb", color: "#1d4ed8", padding: "0.4rem 0", fontWeight: 900, fontSize: "1.08rem", marginTop: "0.25rem" }}>
              <span>{lbl("NET PAYABLE", "निव्वळ देय", "शुद्ध देय राशि")}</span>
              <span>{money(data.total)}</span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="receipt-footer" style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "0.4rem", marginTop: "0.4rem", marginBottom: "0.6rem", paddingBottom: "0.4rem", textAlign: "center" }}>
            <p className="receipt-thanks" style={{ fontSize: "0.78rem", fontWeight: 600, color: "#334155", margin: 0, wordBreak: "break-word" }}>
              {tDb(data.footer)}
            </p>
          </div>
        </div>
        <div className="receipt-paper-bottom" />
      </div>
    )
  }

  // =========================================================================
  // 4. ECO PRINT (58mm Thermal Monospace)
  // =========================================================================
  if (p === "eco" || p === "eco-thermal" || p === "4") {
    return (
      <div className="realistic-thermal-receipt tpl-style-eco" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
        <div className="receipt-paper-top" />
        <div className="receipt-content" style={{ padding: "0.75rem 0.65rem" }}>
          <div className="eco-sawtooth-top" />

          {/* Monospace Header */}
          <div className="eco-header-box" style={{ textAlign: "center", borderBottom: "1.5px dashed #0d9488", paddingBottom: "0.4rem", marginBottom: "0.4rem" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 900, letterSpacing: "0.5px", margin: 0, color: "#0f172a" }}>
              *** {data.shopName.toUpperCase()} ***
            </h2>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1e293b", marginTop: "0.15rem" }}>
              <div>{tDb(data.address)}</div>
              <div>{lbl("TEL:", "फोन:", "फोन:")} {formatNum(data.phone)}</div>
              {data.gst && <div style={{ fontWeight: 800 }}>{lbl("GSTIN:", "जीएसटी क्र.:", "जीएसटीआईएन:")} {data.gst}</div>}
            </div>
          </div>

          {/* ASCII Divider */}
          <div style={{ borderTop: "1.5px dashed #64748b", margin: "0.3rem 0" }} />

          {/* Bill Meta */}
          <div className="receipt-meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "2px 8px", fontSize: "0.8rem", fontWeight: 700, margin: "0.3rem 0", color: "#0f172a" }}>
            <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{lbl("BILL:", "बिल:", "बिल:")} #{formatNum(data.invoiceNo)}</span>
            <span style={{ whiteSpace: "nowrap", flexShrink: 0, marginLeft: "auto" }}>{formatNum(data.date)}</span>
          </div>

          {/* Customer Line */}
          {data.customerName && (
            <div className="receipt-customer-line" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, padding: "0.12rem 0", color: "#0f172a", flexWrap: "wrap", gap: "4px" }}>
              <span>CUST: {data.customerName}</span>
              {data.customerPhone && <span style={{ whiteSpace: "nowrap" }}>{formatNum(data.customerPhone)}</span>}
            </div>
          )}

          <div style={{ borderTop: "1.5px dashed #64748b", margin: "0.3rem 0" }} />

          {/* High-density Monospace Items */}
          <div className="eco-items-mono" style={{ display: "flex", flexDirection: "column", gap: "0.25rem", margin: "0.4rem 0" }}>
            {items.map((item, idx) => (
              <div className="eco-item-row-mono" key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 700, color: "#0f172a" }}>
                <span style={{ wordBreak: "break-word" }}>{formatNum(item.qty)}x {tDb(item.name)} @ {money(item.rate)}</span>
                <span style={{ whiteSpace: "nowrap", marginLeft: "0.4rem" }}>{money(item.total)}</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1.5px dashed #64748b", margin: "0.3rem 0" }} />

          {/* Monospace Calculations */}
          <div style={{ fontSize: "0.8rem", fontWeight: 600, margin: "0.3rem 0", color: "#0f172a" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.08rem 0" }}>
              <span>{lbl("SUBTOTAL:", "उप-एकूण:", "उप-योग:")}</span>
              <span>{money(data.subtotal)}</span>
            </div>
            {data.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.08rem 0", color: "#dc2626", fontWeight: 800 }}>
                <span>{lbl("DISCOUNT:", "सवलत:", "छूट:")}</span>
                <span>-{money(data.discount)}</span>
              </div>
            )}
          </div>

          {/* Total Box */}
          <div className="eco-total-box" style={{ border: "2px solid #0f172a", padding: "0.35rem 0.55rem", display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: "1.05rem", margin: "0.4rem 0", color: "#0f172a" }}>
            <span>{lbl("TOTAL:", "एकूण:", "कुल:")}</span>
            <span>{money(data.total)}</span>
          </div>

          {/* Payment */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, padding: "0.12rem 0", color: "#0f172a" }}>
            <span>{lbl("PAID VIA:", "द्वारे भरले:", "द्वारा भुगतान:")}</span>
            <b>{String(tDb(data.payment) || "UPI").toUpperCase()}</b>
          </div>

          <div style={{ borderTop: "1.5px dashed #64748b", margin: "0.35rem 0" }} />

          {/* Footer Note */}
          <div className="receipt-thanks" style={{ textAlign: "center", fontSize: "0.78rem", fontWeight: 600, color: "#1e293b", margin: "0.3rem 0 0.6rem", paddingBottom: "0.4rem", wordBreak: "break-word" }}>
            {tDb(data.footer)}
          </div>

          <div className="eco-sawtooth-bottom" />
        </div>
        <div className="receipt-paper-bottom" />
      </div>
    )
  }

  // =========================================================================
  // 5. MODERN SHOP (58mm Contemporary Boutique)
  // =========================================================================
  if (p === "modern" || p === "modern-retail" || p === "5") {
    return (
      <div className="realistic-thermal-receipt tpl-style-modern">
        <div className="receipt-paper-top" />
        <div className="receipt-content" style={{ padding: "0.75rem 0.65rem" }}>
          {/* Clean Header */}
          <div className="receipt-shop" style={{ textAlign: "center", border: "none", paddingBottom: "0.4rem" }}>
            <h2 className="receipt-shop-name" style={{ fontSize: "1.2rem", fontWeight: 900, color: "#0f172a", margin: "0 0 0.1rem", lineHeight: 1.2 }}>
              {data.shopName}
            </h2>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1e293b", margin: "0.1rem 0" }}>
              {tDb(data.address)}
            </div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1e293b" }}>
              {lbl("Tel:", "फोन:", "फोन:")} {formatNum(data.phone)}
            </div>
            {data.gst && (
              <div style={{ fontSize: "0.78rem", color: "#0284c7", fontWeight: 700, marginTop: "0.1rem" }}>
                {lbl("GSTIN:", "जीएसटी क्र.:", "जीएसटीआईएन:")} {data.gst}
              </div>
            )}
          </div>

          {/* Meta Line */}
          <div className="receipt-meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "2px 8px", borderBottom: "1.5px solid #e2e8f0", padding: "0.35rem 0", fontSize: "0.8rem", fontWeight: 600, color: "#0f172a" }}>
            <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{lbl("Invoice:", "पावती:", "चालान:")} <b>#{formatNum(data.invoiceNo)}</b></span>
            <span style={{ whiteSpace: "nowrap", flexShrink: 0, marginLeft: "auto" }}>{formatNum(data.date)}</span>
          </div>

          {/* Customer Line */}
          {data.customerName && (
            <div className="receipt-customer-line" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#0f172a", margin: "0.15rem 0", fontWeight: 700, flexWrap: "wrap", gap: "4px" }}>
              <span><b>{data.customerName}</b></span>
              {data.customerPhone && <span style={{ whiteSpace: "nowrap" }}>{formatNum(data.customerPhone)}</span>}
            </div>
          )}

          {/* Items List */}
          <div style={{ margin: "0.45rem 0" }}>
            {items.map((item, idx) => (
              <div className="modern-item-card" key={idx} style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "0.4rem 0.55rem", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                <div className="item-meta" style={{ flex: 1, minWidth: 0, paddingRight: "0.4rem" }}>
                  <div className="item-name" style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a", wordBreak: "break-word" }}>{tDb(item.name)}</div>
                  <small className="item-details" style={{ fontSize: "0.75rem", fontWeight: 600, color: "#334155" }}>{formatNum(item.qty)} {lbl("qty", "नग", "मात्रा")} @ {money(item.rate)}</small>
                </div>
                <span className="item-amt-badge" style={{ background: "#e0f2fe", color: "#0369a1", fontWeight: 800, fontSize: "0.85rem", padding: "0.15rem 0.45rem", borderRadius: "6px", whiteSpace: "nowrap" }}>{money(item.total)}</span>
              </div>
            ))}
          </div>

          {/* Totals Box */}
          <div style={{ borderTop: "1.5px solid #0f172a", paddingTop: "0.4rem", fontSize: "0.82rem", fontWeight: 600, color: "#0f172a" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.1rem 0" }}>
              <span>{lbl("Subtotal", "उप-एकूण", "उप-योग")}</span>
              <span>{money(data.subtotal)}</span>
            </div>
            {data.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.1rem 0", color: "#ef4444", fontWeight: 800 }}>
                <span>{lbl("Discount", "सवलत", "छूट")}</span>
                <span>-{money(data.discount)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid #0f172a", marginTop: "0.35rem", paddingTop: "0.35rem", fontWeight: 900, fontSize: "1.08rem", color: "#0f172a" }}>
              <span>{lbl("TOTAL AMOUNT", "एकूण रक्कम", "कुल राशि")}</span>
              <span>{money(data.total)}</span>
            </div>
          </div>

          {/* Payment & Footer */}
          <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0f172a", background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
              {lbl("PAID VIA", "द्वारे भरले", "द्वारा भुगतान")} {String(tDb(data.payment) || "UPI").toUpperCase()}
            </span>
            <p className="receipt-thanks" style={{ fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginTop: "0.45rem", marginBottom: "0.6rem", paddingBottom: "0.4rem", lineHeight: 1.35, wordBreak: "break-word" }}>
              {tDb(data.footer)}
            </p>
          </div>
        </div>
        <div className="receipt-paper-bottom" />
      </div>
    )
  }

  // =========================================================================
  // 6. BUSINESS ELITE (80mm Corporate Tax Invoice)
  // =========================================================================
  if (p === "elite" || p === "corporate" || p === "6") {
    return (
      <div className="realistic-thermal-receipt tpl-style-elite">
        <div className="receipt-paper-top" />
        <div className="receipt-content" style={{ padding: "0.75rem 0.65rem" }}>
          {/* Formal Tax Banner */}
          <div className="elite-tax-banner" style={{ background: "#0284c7", color: "#ffffff", padding: "0.4rem 0.6rem", display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 900, fontSize: "0.82rem", letterSpacing: "0.5px", borderRadius: "4px", marginBottom: "0.45rem" }}>
            <span>{lbl("TAX INVOICE", "कर पावती", "कर चालान")}</span>
            <span>{lbl("ORIGINAL FOR RECIPIENT", "मूळ प्रत ग्राहकासाठी", "मूल प्रति ग्राहक के लिए")}</span>
          </div>

          {/* Seller Details Box */}
          <div className="elite-party-card" style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "0.4rem 0.55rem", background: "#f8fafc", fontSize: "0.78rem", marginBottom: "0.4rem" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 900, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.1rem" }}>
              {lbl("Supplier / Seller", "विक्रेता / पुरवठादार", "विक्रेता / आपूर्तिकर्ता")}
            </div>
            <h4 style={{ fontSize: "0.9rem", fontWeight: 900, color: "#0f172a", margin: "0 0 0.1rem" }}>{data.shopName}</h4>
            <p style={{ color: "#1e293b", margin: "0.05rem 0", fontSize: "0.78rem", fontWeight: 600 }}>{tDb(data.address)}</p>
            <p style={{ color: "#1e293b", margin: "0.05rem 0", fontSize: "0.78rem", fontWeight: 600 }}>{lbl("Tel:", "फोन:", "फोन:")} {formatNum(data.phone)}</p>
            {data.gst && <p style={{ color: "#0f172a", fontWeight: 800, margin: "0.05rem 0", fontSize: "0.78rem" }}>{lbl("GSTIN:", "जीएसटी क्र.:", "जीएसटीआईएन:")} {data.gst}</p>}
          </div>

          {/* Customer / Buyer Card */}
          {data.customerName && (
            <div className="elite-party-card receipt-customer-line" style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "0.4rem 0.55rem", background: "#f8fafc", fontSize: "0.78rem", marginBottom: "0.4rem" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 900, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.1rem" }}>
                {lbl("Customer / Recipient", "ग्राहक / प्राप्तकर्ता", "ग्राहक / प्राप्तकर्ता")}
              </div>
              <h4 style={{ fontSize: "0.9rem", fontWeight: 900, color: "#0f172a", margin: "0 0 0.1rem" }}>{data.customerName}</h4>
              {data.customerPhone && <p style={{ color: "#1e293b", margin: "0.05rem 0", fontSize: "0.78rem", fontWeight: 600 }}>{lbl("Tel:", "फोन:", "फोन:")} {formatNum(data.customerPhone)}</p>}
            </div>
          )}

          {/* Invoice Meta Grid */}
          <div className="classic-meta-grid" style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "0.78rem", background: "#f8fafc", padding: "0.35rem 0.55rem", borderRadius: "4px", margin: "0.3rem 0", color: "#0f172a" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: "#475569", fontWeight: 600 }}>{lbl("Invoice No:", "पावती क्र.:", "बिल क्र.:")}</span> <b style={{ whiteSpace: "nowrap", fontWeight: 700 }}>#{formatNum(data.invoiceNo)}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: "#475569", fontWeight: 600 }}>{lbl("Date:", "दिनांक:", "दिनांक:")}</span> <b style={{ whiteSpace: "nowrap", fontWeight: 700 }}>{formatNum(data.date)}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: "#475569", fontWeight: 600 }}>{lbl("Payment:", "पेमेंट:", "भुगतान:")}</span> <b style={{ whiteSpace: "nowrap", fontWeight: 700 }}>{tDb(data.payment)}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: "#475569", fontWeight: 600 }}>{lbl("Total Items:", "एकूण वस्तू:", "कुल आइटम:")}</span> <b style={{ whiteSpace: "nowrap", fontWeight: 700 }}>{formatNum(items.length)}</b></div>
          </div>

          {/* Table */}
          <div className="classic-items-table" style={{ margin: "0.4rem 0" }}>
            <div className="receipt-items-header" style={{ display: "grid", gridTemplateColumns: "0.25fr 1.6fr 0.45fr 0.85fr 1fr", gap: "5px", fontSize: "0.76rem", fontWeight: 900, borderBottom: "1.5px solid #0f172a", paddingBottom: "0.25rem", color: "#0f172a" }}>
              <span>#</span>
              <span>{lbl("Description", "तपशील", "विवरण")}</span>
              <span style={{ textAlign: "center" }}>{lbl("Qty", "नग", "मात्रा")}</span>
              <span style={{ textAlign: "right" }}>{lbl("Rate", "दर", "दर")}</span>
              <span style={{ textAlign: "right" }}>{lbl("Amount", "रक्कम", "राशि")}</span>
            </div>
            {items.map((item, idx) => (
              <div className="receipt-item-row" key={idx} style={{ display: "grid", gridTemplateColumns: "0.25fr 1.6fr 0.45fr 0.85fr 1fr", gap: "5px", fontSize: "0.8rem", fontWeight: 600, padding: "0.25rem 0", borderBottom: "1px solid #f1f5f9", color: "#0f172a" }}>
                <span>{formatNum(idx + 1)}</span>
                <span style={{ fontWeight: 700, wordBreak: "break-word" }}>{tDb(item.name)}</span>
                <span style={{ textAlign: "center", whiteSpace: "nowrap" }}>{formatNum(item.qty)}</span>
                <span style={{ textAlign: "right", whiteSpace: "nowrap" }}>{money(item.rate)}</span>
                <span style={{ textAlign: "right", fontWeight: 800, whiteSpace: "nowrap" }}>{money(item.total)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="receipt-totals" style={{ fontSize: "0.82rem", fontWeight: 600, margin: "0.4rem 0", color: "#0f172a" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.12rem 0" }}>
              <span>{lbl("Subtotal", "उप-एकूण", "उप-योग")}</span>
              <span>{money(data.subtotal)}</span>
            </div>
            {data.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.12rem 0", color: "#dc2626", fontWeight: 800 }}>
                <span>{lbl("Discount", "सवलत", "छूट")}</span>
                <span>-{money(data.discount)}</span>
              </div>
            )}
            <div className="receipt-grand-total" style={{ display: "flex", justifyContent: "space-between", borderTop: "2.5px solid #0284c7", color: "#0284c7", padding: "0.4rem 0", fontWeight: 900, fontSize: "1.08rem", marginTop: "0.25rem" }}>
              <span>{lbl("TOTAL INVOICE VALUE", "एकूण पावती मूल्य", "कुल चालान मूल्य")}</span>
              <span>{money(data.total)}</span>
            </div>
          </div>

          {/* Barcode Mock */}
          <div className="receipt-barcode-wrap" style={{ textAlign: "center", margin: "0.4rem 0 0.2rem" }}>
            <div className="receipt-barcode-bars" style={{ letterSpacing: "3px", fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>|||| ||| ||||| || |||||| ||</div>
            <div className="receipt-barcode-num" style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1e293b" }}>*{formatNum(data.invoiceNo)}*</div>
          </div>

          {/* Footer Note */}
          <p className="receipt-thanks" style={{ fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginTop: "0.35rem", marginBottom: "0.6rem", paddingBottom: "0.4rem", textAlign: "center", lineHeight: 1.35, borderTop: "1px dashed #cbd5e1", paddingTop: "0.35rem", wordBreak: "break-word" }}>
            {tDb(data.footer)}
          </p>
        </div>
        <div className="receipt-paper-bottom" />
      </div>
    )
  }

  // =========================================================================
  // Fallback Template
  // =========================================================================
  return (
    <div className="realistic-thermal-receipt">
      <div className="receipt-paper-top" />
      <div className="receipt-content" style={{ padding: "0.75rem 0.65rem" }}>
        <h2 style={{ textAlign: "center", fontSize: "1.15rem", fontWeight: 900, color: "#0f172a" }}>{data.shopName}</h2>
        <p style={{ textAlign: "center", fontSize: "0.8rem", fontWeight: 600, color: "#1e293b" }}>{tDb(data.address)}</p>
        <div style={{ borderTop: "1.5px solid #0f172a", margin: "0.4rem 0" }} />
        {items.map((item, idx) => (
          <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 600, padding: "0.15rem 0", color: "#0f172a" }}>
            <span style={{ wordBreak: "break-word" }}>{tDb(item.name)} × {formatNum(item.qty)}</span>
            <span style={{ whiteSpace: "nowrap" }}>{money(item.total)}</span>
          </div>
        ))}
        <div style={{ borderTop: "2px solid #0f172a", marginTop: "0.4rem", paddingTop: "0.35rem", display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: "1.08rem", color: "#0f172a" }}>
          <span>{lbl("Total", "एकूण", "कुल")}</span>
          <span>{money(data.total)}</span>
        </div>
        <p className="receipt-thanks" style={{ textAlign: "center", fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginTop: "0.4rem", marginBottom: "0.6rem", paddingBottom: "0.4rem", wordBreak: "break-word" }}>{tDb(data.footer)}</p>
      </div>
      <div className="receipt-paper-bottom" />
    </div>
  )
}
