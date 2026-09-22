import React from "react"
import { MapPin, Phone } from "lucide-react"
import { money } from "../lib/utils"

export function RealisticReceiptView({ template }) {
  if (!template) return null

  const rawId = String(template.id || "").toLowerCase()
  const rawName = String(template.name || "").toLowerCase()
  const rawPreview = String(template.preview || template.templateId || "").toLowerCase()

  let p = rawPreview || rawId
  if (rawName.includes("minimal") || rawId.includes("minimal") || rawId === "bcaa2c28-0aeb-468e-8789-d5edfd2eee0c" || rawPreview === "minimal" || rawPreview === "2") {
    p = "minimal"
  } else if (rawName.includes("classic") || rawId.includes("classic") || rawId === "0442d846-0a89-4d90-800a-48278ec089d7" || rawPreview === "classic" || rawPreview === "1") {
    p = "classic"
  } else if (rawName.includes("pro") || rawId.includes("pro") || rawId === "b55d6642-d218-43c3-b8a8-918e87d9712d" || rawPreview === "pro" || rawPreview === "3") {
    p = "pro"
  } else if (rawName.includes("eco") || rawId.includes("eco") || rawId === "cc510d5f-07bf-4ce4-8c50-6ec1995c85f4" || rawPreview === "eco" || rawPreview === "4") {
    p = "eco"
  } else if (rawName.includes("modern") || rawId.includes("modern") || rawId === "4638c377-7094-4325-bf15-eb7c6de54ff6" || rawPreview === "modern" || rawPreview === "5") {
    p = "modern"
  } else if (rawName.includes("elite") || rawId.includes("elite") || rawId === "ee17a09d-5b86-47bc-b862-2fc6bbcba2b9" || rawPreview === "elite" || rawPreview === "6") {
    p = "elite"
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
    tax: 78.3,
    total: 513.3,
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
        <div className="receipt-content" style={{ padding: "1.25rem" }}>
          {/* Shop Header */}
          <div className="receipt-shop" style={{ textAlign: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.75rem" }}>
            <div className="minimal-dot-logo">S</div>
            <h2 className="receipt-shop-name" style={{ fontSize: "1.15rem", letterSpacing: "-0.3px", margin: "0.25rem 0 0", color: "#0f172a" }}>
              {data.shopName}
            </h2>
            <p style={{ color: "#64748b", fontSize: "0.72rem", margin: "0.2rem 0 0" }}>
              {[data.phone, data.address].filter(Boolean).join(" · ")}
            </p>
            {data.gst && (
              <p style={{ color: "#94a3b8", fontSize: "0.68rem", margin: "0.15rem 0 0" }}>
                GSTIN: {data.gst}
              </p>
            )}
          </div>

          {/* Bill Meta */}
          <div className="minimal-meta-clean" style={{ margin: "0.6rem 0", display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#64748b" }}>
            <span>#{data.invoiceNo}</span>
            <span>{data.date}</span>
          </div>

          {/* Items Table */}
          <div style={{ margin: "0.75rem 0" }}>
            {items.map((item, idx) => (
              <div className="minimal-item-entry" key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.35rem 0", borderBottom: "1px solid #f8fafc" }}>
                <div className="minimal-item-info">
                  <div className="minimal-item-title" style={{ fontSize: "0.78rem", fontWeight: 600, color: "#0f172a" }}>{item.name}</div>
                  <small className="minimal-item-sub" style={{ fontSize: "0.68rem", color: "#64748b" }}>{item.qty} × ₹{item.rate}</small>
                </div>
                <span className="minimal-item-price" style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a" }}>₹{item.total}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.74rem", padding: "0.15rem 0", color: "#475569" }}>
              <span>Subtotal ({totalUnits} items)</span>
              <span>₹{Number(data.subtotal).toFixed(2)}</span>
            </div>
            {data.discount > 0 && (
              <div className="receipt-total-row discount" style={{ display: "flex", justifyContent: "space-between", padding: "0.15rem 0", color: "#ef4444", fontSize: "0.74rem" }}>
                <span>Discount</span>
                <span>-₹{Number(data.discount).toFixed(2)}</span>
              </div>
            )}
            {data.tax > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.74rem", padding: "0.15rem 0", color: "#475569" }}>
                <span>Tax / GST</span>
                <span>₹{Number(data.tax).toFixed(2)}</span>
              </div>
            )}
            <div className="minimal-total-hero" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #0f172a", marginTop: "0.4rem", paddingTop: "0.4rem", fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>
              <span>TOTAL AMOUNT</span>
              <span>₹{Number(data.total).toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Mode */}
          <div style={{ textAlign: "center", margin: "0.75rem 0 0.35rem" }}>
            <div className="minimal-paid-stamp" style={{ display: "inline-block", padding: "0.2rem 0.6rem", background: "#f1f5f9", borderRadius: "4px", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.5px", color: "#475569" }}>
              PAID VIA {String(data.payment || "CASH").toUpperCase()}
            </div>
          </div>

          {/* Footer Note */}
          <p style={{ textAlign: "center", fontSize: "0.68rem", color: "#94a3b8", marginTop: "0.75rem", fontStyle: "italic", lineHeight: 1.4 }}>
            {data.footer}
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
        <div className="receipt-content" style={{ padding: "1.25rem" }}>
          {/* Shop Header */}
          <div className="receipt-shop" style={{ textAlign: "center", borderBottom: "2px solid #0f172a", paddingBottom: "0.75rem" }}>
            <div className="classic-crest">
              {(data.shopName || "S").trim().charAt(0).toUpperCase()}
            </div>
            <h2 className="receipt-shop-name" style={{ fontSize: "1.15rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.5px", margin: "0.25rem 0 0.15rem" }}>
              {data.shopName}
            </h2>
            <p style={{ fontSize: "0.72rem", color: "#475569", margin: "0.15rem 0" }}>{data.address}</p>
            <p style={{ fontSize: "0.72rem", color: "#475569", margin: "0.15rem 0" }}>Tel: {data.phone}</p>
            {data.gst && (
              <p style={{ fontSize: "0.72rem", color: "#0f172a", fontWeight: 700, margin: "0.15rem 0" }}>
                GSTIN: {data.gst}
              </p>
            )}
          </div>

          {/* Meta Grid */}
          <div className="classic-meta-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", fontSize: "0.7rem", padding: "0.5rem 0" }}>
            <div><span style={{ color: "#64748b" }}>INVOICE:</span> <b>#{data.invoiceNo}</b></div>
            <div><span style={{ color: "#64748b" }}>DATE:</span> <b>{data.date}</b></div>
            <div><span style={{ color: "#64748b" }}>PAYMENT:</span> <b>{data.payment}</b></div>
            <div><span style={{ color: "#64748b" }}>ITEMS:</span> <b>{items.length} ({totalUnits} pcs)</b></div>
          </div>

          <div className="classic-divider-double" style={{ borderTop: "2px double #0f172a", margin: "0.3rem 0" }} />

          {/* Items Table */}
          <div className="classic-items-table" style={{ margin: "0.5rem 0" }}>
            <div className="receipt-items-header" style={{ display: "grid", gridTemplateColumns: "2.2fr 0.6fr 1fr 1fr", gap: "4px", fontSize: "0.7rem", fontWeight: 800, borderBottom: "1px solid #0f172a", paddingBottom: "0.3rem" }}>
              <span>ITEM</span>
              <span style={{ textAlign: "center" }}>QTY</span>
              <span style={{ textAlign: "right" }}>RATE</span>
              <span style={{ textAlign: "right" }}>AMOUNT</span>
            </div>
            {items.map((item, idx) => (
              <div className="receipt-item-row" key={idx} style={{ display: "grid", gridTemplateColumns: "2.2fr 0.6fr 1fr 1fr", gap: "4px", fontSize: "0.72rem", padding: "0.3rem 0", borderBottom: "1px dotted #e2e8f0" }}>
                <span>{item.name}</span>
                <span style={{ textAlign: "center" }}>{item.qty}</span>
                <span style={{ textAlign: "right" }}>₹{item.rate}</span>
                <span style={{ textAlign: "right" }}>₹{item.total}</span>
              </div>
            ))}
          </div>

          {/* Totals Section */}
          <div className="receipt-totals" style={{ fontSize: "0.74rem", margin: "0.5rem 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.15rem 0" }}>
              <span>Subtotal</span>
              <span>₹{Number(data.subtotal).toFixed(2)}</span>
            </div>
            {data.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.15rem 0", color: "#dc2626" }}>
                <span>Discount</span>
                <span>-₹{Number(data.discount).toFixed(2)}</span>
              </div>
            )}
            {data.tax > 0 && (
              <div className="classic-gst-box" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "0.35rem 0.5rem", margin: "0.3rem 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.1rem 0" }}>
                  <span>Taxable Subtotal</span>
                  <span>₹{Number(data.subtotal).toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.1rem 0", color: "#64748b" }}>
                  <span>CGST (9%)</span>
                  <span>₹{(data.tax / 2).toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.1rem 0", color: "#64748b" }}>
                  <span>SGST (9%)</span>
                  <span>₹{(data.tax / 2).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Grand Total Banner */}
          <div className="classic-grand-banner" style={{ display: "flex", justifyContent: "space-between", background: "#0f172a", color: "#ffffff", padding: "0.45rem 0.75rem", borderRadius: "4px", fontWeight: 900, fontSize: "0.95rem", margin: "0.5rem 0" }}>
            <span>GRAND TOTAL</span>
            <span>₹{Number(data.total).toFixed(2)}</span>
          </div>

          {/* Barcode Mock */}
          <div className="receipt-barcode-wrap" style={{ textAlign: "center", margin: "0.75rem 0 0.35rem" }}>
            <div className="receipt-barcode-bars" style={{ letterSpacing: "3px", fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>|||| ||| ||||| || |||||| ||</div>
            <div className="receipt-barcode-num" style={{ fontSize: "0.65rem", color: "#64748b", marginTop: "0.15rem" }}>*{data.invoiceNo}*</div>
          </div>

          {/* Policy / Footer Note */}
          <div className="classic-policy-footer" style={{ textAlign: "center", fontSize: "0.68rem", color: "#64748b", borderTop: "1px dashed #cbd5e1", paddingTop: "0.45rem", marginTop: "0.45rem" }}>
            <p style={{ margin: 0 }}>{data.footer}</p>
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
        <div className="receipt-content" style={{ padding: "1.25rem" }}>
          {/* Header Banner */}
          <div className="pro-store-ribbon" style={{ background: "#2563eb", color: "#ffffff", padding: "0.55rem 0.75rem", borderRadius: "6px", textAlign: "center", marginBottom: "0.5rem" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, letterSpacing: "0.3px" }}>{data.shopName}</h2>
            <p style={{ fontSize: "0.65rem", margin: "0.15rem 0 0", opacity: 0.9 }}>RETAIL POS RECEIPT</p>
          </div>

          {/* Contact & GSTIN */}
          <div style={{ textAlign: "center", fontSize: "0.7rem", color: "#475569", marginBottom: "0.5rem", lineHeight: 1.3 }}>
            <div>{data.address}</div>
            <div>Tel: {data.phone}</div>
            {data.gst && <div style={{ fontWeight: 700, color: "#0f172a" }}>GSTIN: {data.gst}</div>}
          </div>

          {/* Meta Bar */}
          <div className="pro-meta-bar" style={{ display: "flex", justifyContent: "space-between", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "0.35rem 0.6rem", fontSize: "0.68rem", margin: "0.5rem 0" }}>
            <div><span>BILL NO:</span> <b>#{data.invoiceNo}</b></div>
            <div><span>DATE:</span> <b>{data.date}</b></div>
            <div><span>PAY:</span> <b>{data.payment}</b></div>
          </div>

          {/* Items Table */}
          <div className="receipt-items" style={{ margin: "0.6rem 0" }}>
            <div className="receipt-items-header" style={{ display: "grid", gridTemplateColumns: "2.2fr 0.5fr 1fr 1fr", borderBottom: "2px solid #2563eb", padding: "0.3rem 0", fontSize: "0.7rem", fontWeight: 800, color: "#1e293b" }}>
              <span>Item Description</span>
              <span style={{ textAlign: "center" }}>Qty</span>
              <span style={{ textAlign: "right" }}>Rate</span>
              <span style={{ textAlign: "right" }}>Amount</span>
            </div>
            {items.map((item, idx) => (
              <div className="receipt-item-row" key={idx} style={{ display: "grid", gridTemplateColumns: "2.2fr 0.5fr 1fr 1fr", padding: "0.35rem 0", borderBottom: "1px solid #f1f5f9", fontSize: "0.72rem" }}>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>{item.name}</span>
                <span style={{ textAlign: "center", color: "#475569" }}>{item.qty}</span>
                <span style={{ textAlign: "right", color: "#475569" }}>₹{item.rate}</span>
                <span style={{ textAlign: "right", fontWeight: 700, color: "#0f172a" }}>₹{item.total}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="receipt-totals" style={{ fontSize: "0.74rem", margin: "0.5rem 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.15rem 0", color: "#475569" }}>
              <span>Gross Subtotal ({totalUnits} items)</span>
              <span>₹{Number(data.subtotal).toFixed(2)}</span>
            </div>
            {data.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.15rem 0", color: "#059669", fontWeight: 700 }}>
                <span>Discount</span>
                <span>-₹{Number(data.discount).toFixed(2)}</span>
              </div>
            )}
            {data.tax > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.15rem 0", color: "#475569" }}>
                <span>GST ({template.tax_rate || 18}%)</span>
                <span>₹{Number(data.tax).toFixed(2)}</span>
              </div>
            )}
            <div className="receipt-grand-total" style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid #2563eb", color: "#1d4ed8", padding: "0.45rem 0", fontWeight: 900, fontSize: "0.95rem", marginTop: "0.3rem" }}>
              <span>NET PAYABLE</span>
              <span>₹{Number(data.total).toFixed(2)}</span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="receipt-footer" style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "0.5rem", marginTop: "0.5rem", textAlign: "center" }}>
            <p className="receipt-thanks" style={{ fontSize: "0.68rem", color: "#64748b", margin: 0 }}>
              {data.footer}
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
        <div className="receipt-content" style={{ padding: "1rem" }}>
          <div className="eco-sawtooth-top" />

          {/* Monospace Header */}
          <div className="eco-header-box" style={{ textAlign: "center", borderBottom: "1px dashed #0d9488", paddingBottom: "0.4rem", marginBottom: "0.4rem" }}>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 900, letterSpacing: "0.5px", margin: 0 }}>
              *** {data.shopName.toUpperCase()} ***
            </h2>
            <div style={{ fontSize: "0.68rem", color: "#475569", marginTop: "0.15rem" }}>
              <div>{data.address}</div>
              <div>TEL: {data.phone}</div>
              {data.gst && <div>GSTIN: {data.gst}</div>}
            </div>
          </div>

          {/* ASCII Divider */}
          <div style={{ borderTop: "1px dashed #94a3b8", margin: "0.35rem 0" }} />

          {/* Bill Meta */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", fontWeight: 700, margin: "0.3rem 0" }}>
            <span>BILL: #{data.invoiceNo}</span>
            <span>{data.date}</span>
          </div>

          <div style={{ borderTop: "1px dashed #94a3b8", margin: "0.35rem 0" }} />

          {/* High-density Monospace Items */}
          <div className="eco-items-mono" style={{ display: "flex", flexDirection: "column", gap: "0.25rem", margin: "0.4rem 0" }}>
            {items.map((item, idx) => (
              <div className="eco-item-row-mono" key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", fontWeight: 700 }}>
                <span>{item.qty}x {item.name} @ ₹{item.rate}</span>
                <span>₹{item.total}</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px dashed #94a3b8", margin: "0.35rem 0" }} />

          {/* Monospace Calculations */}
          <div style={{ fontSize: "0.7rem", margin: "0.35rem 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.1rem 0" }}>
              <span>SUBTOTAL:</span>
              <span>₹{Number(data.subtotal).toFixed(2)}</span>
            </div>
            {data.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.1rem 0", color: "#dc2626" }}>
                <span>DISCOUNT:</span>
                <span>-₹{Number(data.discount).toFixed(2)}</span>
              </div>
            )}
            {data.tax > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.1rem 0" }}>
                <span>TAX:</span>
                <span>₹{Number(data.tax).toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Total Box */}
          <div className="eco-total-box" style={{ border: "2px solid #0f172a", padding: "0.4rem 0.6rem", display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: "0.92rem", margin: "0.45rem 0" }}>
            <span>TOTAL:</span>
            <span>₹{Number(data.total).toFixed(2)}</span>
          </div>

          {/* Payment */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", padding: "0.15rem 0" }}>
            <span>PAID VIA:</span>
            <b>{String(data.payment || "UPI").toUpperCase()}</b>
          </div>

          <div style={{ borderTop: "1px dashed #94a3b8", margin: "0.45rem 0" }} />

          {/* Footer Note */}
          <div style={{ textAlign: "center", fontSize: "0.65rem", color: "#475569", margin: "0.3rem 0" }}>
            {data.footer}
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
        <div className="receipt-content" style={{ padding: "1.25rem" }}>
          {/* Clean Header */}
          <div className="receipt-shop" style={{ textAlign: "center", border: "none", paddingBottom: "0.4rem" }}>
            <h2 className="receipt-shop-name" style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.15rem" }}>
              {data.shopName}
            </h2>
            <div style={{ fontSize: "0.7rem", color: "#64748b", margin: "0.15rem 0" }}>
              {data.address}
            </div>
            <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
              Tel: {data.phone}
            </div>
            {data.gst && (
              <div style={{ fontSize: "0.68rem", color: "#F66016", fontWeight: 600, marginTop: "0.1rem" }}>
                GSTIN: {data.gst}
              </div>
            )}
          </div>

          {/* Meta Line */}
          <div className="receipt-meta" style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", padding: "0.4rem 0", fontSize: "0.7rem", color: "#64748b" }}>
            <span>Invoice: <b>#{data.invoiceNo}</b></span>
            <span>{data.date}</span>
          </div>

          {/* Items List */}
          <div style={{ margin: "0.6rem 0" }}>
            {items.map((item, idx) => (
              <div className="modern-item-card" key={idx} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.45rem 0.65rem", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                <div className="item-meta">
                  <div className="item-name" style={{ fontWeight: 700, fontSize: "0.78rem", color: "#0f172a" }}>{item.name}</div>
                  <small className="item-details" style={{ fontSize: "0.68rem", color: "#64748b" }}>{item.qty} qty @ ₹{item.rate}</small>
                </div>
                <span className="item-amt-badge" style={{ background: "#FFF0E5", color: "#F66016", fontWeight: 800, fontSize: "0.78rem", padding: "0.2rem 0.5rem", borderRadius: "6px" }}>₹{item.total}</span>
              </div>
            ))}
          </div>

          {/* Summary Card */}
          <div className="receipt-totals" style={{ background: "#f8fafc", padding: "0.65rem", borderRadius: "8px", fontSize: "0.74rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.15rem 0", color: "#475569" }}>
              <span>Subtotal</span>
              <span>₹{Number(data.subtotal).toFixed(2)}</span>
            </div>
            {data.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.15rem 0", color: "#059669", fontWeight: 700 }}>
                <span>Discount</span>
                <span>-₹{Number(data.discount).toFixed(2)}</span>
              </div>
            )}
            {data.tax > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.15rem 0", color: "#475569" }}>
                <span>Tax</span>
                <span>₹{Number(data.tax).toFixed(2)}</span>
              </div>
            )}
            <div className="receipt-grand-total" style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #cbd5e1", paddingTop: "0.4rem", color: "#F66016", fontWeight: 800, fontSize: "0.95rem", marginTop: "0.25rem" }}>
              <span>Amount Due</span>
              <span>₹{Number(data.total).toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Mode */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.7rem", padding: "0.4rem 0.2rem", color: "#64748b" }}>
            <span>Payment Method</span>
            <b style={{ color: "#0f172a" }}>{data.payment}</b>
          </div>

          {/* Footer Note */}
          <p style={{ textAlign: "center", fontSize: "0.68rem", color: "#94a3b8", marginTop: "0.65rem", lineHeight: 1.4 }}>
            {data.footer}
          </p>
        </div>
        <div className="receipt-paper-bottom" />
      </div>
    )
  }

  // =========================================================================
  // 6. BUSINESS ELITE (80mm GST Tax Invoice)
  // =========================================================================
  if (p === "elite" || p === "business-elite" || p === "6") {
    return (
      <div className="realistic-thermal-receipt tpl-style-elite">
        <div className="receipt-paper-top" />
        <div className="receipt-content" style={{ padding: "1.25rem" }}>
          {/* Formal Tax Banner */}
          <div className="elite-tax-banner" style={{ background: "#F66016", color: "#ffffff", padding: "0.45rem 0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 800, fontSize: "0.78rem", letterSpacing: "0.5px", borderRadius: "4px", marginBottom: "0.65rem" }}>
            <span>TAX INVOICE</span>
            <span>ORIGINAL FOR RECIPIENT</span>
          </div>

          {/* Seller Details Box */}
          <div className="elite-party-card" style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "0.45rem 0.6rem", background: "#f8fafc", fontSize: "0.7rem", marginBottom: "0.5rem" }}>
            <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "#F66016", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.2rem" }}>Supplier / Seller</div>
            <h4 style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.15rem" }}>{data.shopName}</h4>
            <p style={{ color: "#475569", margin: "0.05rem 0", fontSize: "0.68rem" }}>{data.address}</p>
            <p style={{ color: "#475569", margin: "0.05rem 0", fontSize: "0.68rem" }}>Tel: {data.phone}</p>
            {data.gst && <p style={{ color: "#0f172a", fontWeight: 700, margin: "0.05rem 0", fontSize: "0.68rem" }}>GSTIN: {data.gst}</p>}
          </div>

          {/* Invoice Meta Grid */}
          <div className="classic-meta-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", fontSize: "0.68rem", background: "#f8fafc", padding: "0.35rem 0.5rem", borderRadius: "4px", margin: "0.4rem 0" }}>
            <div><span style={{ color: "#64748b" }}>Invoice No:</span> <b>#{data.invoiceNo}</b></div>
            <div><span style={{ color: "#64748b" }}>Date:</span> <b>{data.date}</b></div>
            <div><span style={{ color: "#64748b" }}>Payment:</span> <b>{data.payment}</b></div>
            <div><span style={{ color: "#64748b" }}>Total Items:</span> <b>{items.length}</b></div>
          </div>

          {/* Table */}
          <div className="classic-items-table" style={{ margin: "0.5rem 0" }}>
            <div className="receipt-items-header" style={{ display: "grid", gridTemplateColumns: "0.4fr 2.2fr 0.6fr 1fr 1fr", gap: "4px", fontSize: "0.68rem", fontWeight: 800, borderBottom: "1px solid #cbd5e1", paddingBottom: "0.3rem" }}>
              <span>#</span>
              <span>Description</span>
              <span style={{ textAlign: "center" }}>Qty</span>
              <span style={{ textAlign: "right" }}>Rate</span>
              <span style={{ textAlign: "right" }}>Amount</span>
            </div>
            {items.map((item, idx) => (
              <div className="receipt-item-row" key={idx} style={{ display: "grid", gridTemplateColumns: "0.4fr 2.2fr 0.6fr 1fr 1fr", gap: "4px", fontSize: "0.7rem", padding: "0.3rem 0", borderBottom: "1px solid #f1f5f9" }}>
                <span>{idx + 1}</span>
                <span style={{ fontWeight: 600 }}>{item.name}</span>
                <span style={{ textAlign: "center" }}>{item.qty}</span>
                <span style={{ textAlign: "right" }}>₹{item.rate}</span>
                <span style={{ textAlign: "right", fontWeight: 700 }}>₹{item.total}</span>
              </div>
            ))}
          </div>

          {/* Tax Analysis Table (Only if tax > 0) */}
          {data.tax > 0 && (
            <table className="elite-tax-analysis-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.68rem", margin: "0.5rem 0", border: "1px solid #cbd5e1" }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  <th style={{ padding: "0.3rem", border: "1px solid #cbd5e1", textAlign: "left" }}>Taxable Amt</th>
                  <th style={{ padding: "0.3rem", border: "1px solid #cbd5e1", textAlign: "right" }}>CGST (9%)</th>
                  <th style={{ padding: "0.3rem", border: "1px solid #cbd5e1", textAlign: "right" }}>SGST (9%)</th>
                  <th style={{ padding: "0.3rem", border: "1px solid #cbd5e1", textAlign: "right" }}>Total Tax</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "0.3rem", border: "1px solid #e2e8f0" }}>₹{Number(data.subtotal).toFixed(2)}</td>
                  <td style={{ padding: "0.3rem", border: "1px solid #e2e8f0", textAlign: "right" }}>₹{(Number(data.tax) / 2).toFixed(2)}</td>
                  <td style={{ padding: "0.3rem", border: "1px solid #e2e8f0", textAlign: "right" }}>₹{(Number(data.tax) / 2).toFixed(2)}</td>
                  <td style={{ padding: "0.3rem", border: "1px solid #e2e8f0", textAlign: "right", fontWeight: 700 }}>₹{Number(data.tax).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          )}

          {/* Totals */}
          <div className="receipt-totals" style={{ fontSize: "0.74rem", margin: "0.5rem 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.15rem 0" }}>
              <span>Subtotal</span>
              <span>₹{Number(data.subtotal).toFixed(2)}</span>
            </div>
            {data.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.15rem 0", color: "#dc2626" }}>
                <span>Discount</span>
                <span>-₹{Number(data.discount).toFixed(2)}</span>
              </div>
            )}
            {data.tax > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.15rem 0", color: "#475569" }}>
                <span>GST Output</span>
                <span>₹{Number(data.tax).toFixed(2)}</span>
              </div>
            )}
            <div className="receipt-grand-total" style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid #F66016", color: "#F66016", padding: "0.45rem 0", fontWeight: 900, fontSize: "0.95rem", marginTop: "0.25rem" }}>
              <span>TOTAL INVOICE VALUE</span>
              <span>₹{Number(data.total).toFixed(2)}</span>
            </div>
          </div>

          {/* Barcode Mock */}
          <div className="receipt-barcode-wrap" style={{ textAlign: "center", margin: "0.5rem 0 0.35rem" }}>
            <div className="receipt-barcode-bars" style={{ letterSpacing: "3px", fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>|||| ||| ||||| || |||||| ||</div>
            <div className="receipt-barcode-num" style={{ fontSize: "0.65rem", color: "#64748b" }}>*{data.invoiceNo}*</div>
          </div>

          {/* Footer Note */}
          <p style={{ fontSize: "0.65rem", color: "#64748b", marginTop: "0.45rem", textAlign: "center", lineHeight: 1.3, borderTop: "1px dashed #cbd5e1", paddingTop: "0.45rem" }}>
            {data.footer}
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
      <div className="receipt-content" style={{ padding: "1.25rem" }}>
        <h2 style={{ textAlign: "center", fontSize: "1.1rem" }}>{data.shopName}</h2>
        <p style={{ textAlign: "center", fontSize: "0.75rem", color: "#64748b" }}>{data.address}</p>
        <div style={{ borderTop: "1px solid #e2e8f0", margin: "0.5rem 0" }} />
        {items.map((item, idx) => (
          <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", padding: "0.2rem 0" }}>
            <span>{item.name} × {item.qty}</span>
            <span>₹{item.total}</span>
          </div>
        ))}
        <div style={{ borderTop: "1px solid #0f172a", marginTop: "0.5rem", paddingTop: "0.4rem", display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
          <span>Total</span>
          <span>₹{Number(data.total).toFixed(2)}</span>
        </div>
        <p style={{ textAlign: "center", fontSize: "0.68rem", color: "#94a3b8", marginTop: "0.5rem" }}>{data.footer}</p>
      </div>
      <div className="receipt-paper-bottom" />
    </div>
  )
}
