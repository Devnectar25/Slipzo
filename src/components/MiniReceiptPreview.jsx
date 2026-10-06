import React from "react"
import { money, formatNumberByLang } from "../lib/utils"
import { useDbTranslation } from "../lib/translator"
import { Store, QrCode } from "lucide-react"

export function MiniReceiptPreview({ template }) {
  const { tDb, formatNum, lang } = useDbTranslation()
  const isMr = (lang || "").toLowerCase().startsWith("mr")
  const isHi = (lang || "").toLowerCase().startsWith("hi")

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
      <div className="mini-receipt mini-receipt-classic-exact">
        <div className="mini-shop-header-exact">
          <div className="mini-s-logo-dot">S</div>
          <span className="mini-shop-name-exact">NEHA'S SHOP</span>
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
            <span>Badam Milk</span>
            <span>1</span>
            <span>₹55.00</span>
          </div>
          <div className="mini-item-row-exact">
            <span>Samosa</span>
            <span>1</span>
            <span>₹30.00</span>
          </div>
        </div>
        <div className="mini-divider-hairline" />
        <div className="mini-total-row-exact">
          <span>Total</span>
          <span className="mini-total-val-exact">₹85.00</span>
        </div>
        <div className="mini-divider-hairline" />
        <div className="mini-footer-note-exact">Thank you!</div>
        <div className="mini-barcode-graphic">
          <div className="barcode-bars">||||| | |||| | |||||| |||| | |||</div>
        </div>
      </div>
    )
  }

  // 2. MINIMAL CLEAN BILL (Card 2)
  if (isMinimal) {
    return (
      <div className="mini-receipt mini-receipt-minimal-exact">
        <div className="mini-shop-header-exact">
          <Store size={14} className="mini-store-icon" />
          <span className="mini-shop-name-exact">test4's Shop</span>
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
            <span>Butter Naan</span>
            <span>1</span>
            <span>₹55.00</span>
          </div>
        </div>
        <div className="mini-divider-hairline" />
        <div className="mini-subtotal-meta-exact">
          <div className="mini-sub-row">
            <span>Subtotal</span>
            <span>₹55.00</span>
          </div>
        </div>
        <div className="mini-divider-hairline" />
        <div className="mini-total-row-exact">
          <span>Total :</span>
          <span className="mini-total-val-exact">₹55.00</span>
        </div>
        <div className="mini-paymode-row">
          <span>Payment Mode :</span>
          <span>Cash</span>
        </div>
        <div className="mini-barcode-graphic">
          <div className="barcode-bars">|||||| | |||| | |||||| |||| | ||</div>
        </div>
      </div>
    )
  }

  // 3. SHOP PRO (Card 3)
  if (isPro) {
    return (
      <div className="mini-receipt mini-receipt-pro-exact">
        <div className="mini-shop-header-exact">
          <div className="mini-s-logo-dot">S</div>
          <span className="mini-shop-name-exact">NEHA'S SHOP</span>
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
            <span>Badam Milk</span>
            <span>1</span>
            <span>₹55.00</span>
          </div>
          <div className="mini-item-row-exact">
            <span>Samosa</span>
            <span>1</span>
            <span>₹30.00</span>
          </div>
        </div>
        <div className="mini-divider-hairline" />
        <div className="mini-total-row-exact">
          <span>Total</span>
          <span className="mini-total-val-exact">₹135.00</span>
        </div>
        <div className="mini-upi-section-exact">
          <span className="mini-upi-badge">PAY VIA UPI</span>
          <div className="mini-qr-code-box">
            <svg viewBox="0 0 40 40" width="36" height="36" fill="#0f172a">
              <rect x="0" y="0" width="12" height="12" fill="#0f172a" rx="2" />
              <rect x="2" y="2" width="8" height="8" fill="#ffffff" rx="1" />
              <rect x="4" y="4" width="4" height="4" fill="#0f172a" />
              
              <rect x="28" y="0" width="12" height="12" fill="#0f172a" rx="2" />
              <rect x="30" y="2" width="8" height="8" fill="#ffffff" rx="1" />
              <rect x="32" y="4" width="4" height="4" fill="#0f172a" />
              
              <rect x="0" y="28" width="12" height="12" fill="#0f172a" rx="2" />
              <rect x="2" y="30" width="8" height="8" fill="#ffffff" rx="1" />
              <rect x="4" y="32" width="4" height="4" fill="#0f172a" />

              <rect x="16" y="2" width="4" height="6" fill="#0f172a" />
              <rect x="22" y="4" width="4" height="4" fill="#0f172a" />
              <rect x="14" y="14" width="12" height="12" fill="#0f172a" />
              <rect x="18" y="18" width="4" height="4" fill="#ffffff" />
              <rect x="2" y="16" width="6" height="4" fill="#0f172a" />
              <rect x="30" y="16" width="6" height="4" fill="#0f172a" />
              <rect x="16" y="30" width="6" height="6" fill="#0f172a" />
              <rect x="24" y="28" width="6" height="4" fill="#0f172a" />
              <rect x="32" y="32" width="6" height="6" fill="#0f172a" />
            </svg>
          </div>
          <span className="mini-thank-qr">Thank you!</span>
        </div>
      </div>
    )
  }

  // 4. ECO PRINT (Card 4)
  if (isEco) {
    return (
      <div className="mini-receipt mini-receipt-eco-exact">
        <div className="mini-shop-name-mono">NEHA'S SHOP</div>
        <div className="mini-divider-dots" />
        <div className="mini-mono-rows">
          <div className="mini-mono-row">
            <span>Butter Naan</span>
            <span>₹55.00</span>
          </div>
        </div>
        <div className="mini-divider-dots" />
        <div className="mini-mono-total-row">
          <span>Total :</span>
          <span className="mini-mono-bold">₹55.00</span>
        </div>
        <div className="mini-divider-dots" />
        <div className="mini-mono-footer-row">
          <span>Cash</span>
          <span>Cash</span>
        </div>
        <div className="mini-mono-thank">Thank you!</div>
      </div>
    )
  }

  // 5. MODERN SHOP (Card 5)
  if (isModern) {
    return (
      <div className="mini-receipt mini-receipt-modern-exact">
        <div className="mini-shop-header-exact">
          <div className="mini-s-logo-dot">S</div>
          <span className="mini-shop-name-exact">NEHA'S SHOP</span>
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
            <span>Badam Milk</span>
            <span>1</span>
            <span>₹55.00</span>
          </div>
          <div className="mini-item-row-exact">
            <span>Samosa</span>
            <span>1</span>
            <span>₹30.00</span>
          </div>
        </div>
        <div className="mini-divider-hairline" />
        <div className="mini-total-row-exact">
          <span>Total</span>
          <span className="mini-total-val-exact">₹135.00</span>
        </div>
        <div className="mini-modern-badge-pill">PAID VIA CASH</div>
        <div className="mini-social-dots-row">
          <span className="social-dot dot-ig">IG</span>
          <span className="social-dot dot-fb">FB</span>
          <span className="social-dot dot-tw">TW</span>
        </div>
        <div className="mini-footer-note-exact">Thank you!</div>
      </div>
    )
  }

  // 6. BUSINESS ELITE (Card 6)
  if (isElite) {
    return (
      <div className="mini-receipt mini-receipt-elite-exact">
        <div className="mini-tax-header-exact">
          <span className="mini-shop-name-exact">NEHA'S SHOP</span>
          <span className="mini-tax-invoice-label">RECEIPT</span>
        </div>
        <div className="mini-divider-hairline" />
        <div className="mini-elite-grid-table">
          <div className="mini-elite-th">
            <span>Item</span>
            <span>Qty</span>
            <span>Amount</span>
          </div>
          <div className="mini-elite-tr">
            <span>Badam Milk</span>
            <span>1</span>
            <span>₹55.00</span>
          </div>
          <div className="mini-elite-tr">
            <span>Samosa</span>
            <span>1</span>
            <span>₹30.00</span>
          </div>
        </div>
        <div className="mini-divider-hairline" />
        <div className="mini-total-row-exact">
          <span>Grand Total</span>
          <span className="mini-total-val-exact">₹85.00</span>
        </div>
        <div className="mini-sign-line">
          <div className="sign-stroke" />
          <span>Auth. Signatory</span>
        </div>
        <div className="mini-footer-note-exact">Thank you!</div>
      </div>
    )
  }

  // Default fallback
  return (
    <div className="mini-receipt mini-receipt-classic-exact">
      <div className="mini-shop-header-exact">
        <div className="mini-s-logo-dot">S</div>
        <span className="mini-shop-name-exact">{template.name || "NEHA'S SHOP"}</span>
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
