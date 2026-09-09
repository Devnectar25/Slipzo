import { Printer, ArrowRight } from "lucide-react"
import { money } from "../lib/utils"

export function ReceiptPreview({
  items = [],
  subtotal = 0,
  discount = 0,
  tax = 0,
  total = 0,
  payment = "Cash",
  template = null,
  shop = {},
  saved = null,
  setView = () => {}
}) {
  const handlePrint = () => {
    console.log('🖨️ Printing receipt...')
    window.print()
  }

  // Calculate tax amount
  const taxAmount = ((subtotal - (Number(discount) || 0)) * (Number(tax) || 0)) / 100

  // Filter out empty items
  const validItems = items.filter((item) => item && item.name && item.name.trim())

  console.log('📋 ReceiptPreview:', {
    itemCount: validItems.length,
    items: validItems,
    subtotal,
    total,
    tax,
    discount
  })

  return (
    <aside className="preview-panel">
      <div className="preview-head">
        <div>
          <p className="eyebrow">LIVE PREVIEW</p>
          <h3>{template?.width || "58mm"} receipt</h3>
        </div>
        <button
          data-testid="print-receipt-button"
          className="icon-button"
          title="Print receipt"
          onClick={handlePrint}
        >
          <Printer size={18} />
        </button>
      </div>

      <div data-testid="receipt-preview" className="receipt" id="receipt-to-print">
        {/* Shop Info */}
        <div className="receipt-top">
          <div className="receipt-logo">S</div>
          <h3>{shop?.name || "Slipzo Shop"}</h3>
          <p>
            {shop?.address || "Digital Receipt"}
            {shop?.phone && ` · ${shop.phone}`}
          </p>
        </div>

        {/* Receipt Metadata */}
        <div className="receipt-meta">
          <span>{saved?.number || "SLP-DRAFT"}</span>
          <span>{new Date().toLocaleDateString()}</span>
        </div>

        {/* Items List */}
        <div className="receipt-lines">
          {validItems.length > 0 ? (
            validItems.map((item, index) => {
              const quantity = Number(item.quantity) || 0
              const rate = Number(item.rate) || 0
              const itemTotal = quantity * rate
              
              return (
                <div key={index} className="receipt-item">
                  <span className="item-name">
                    <span className="item-title">{item.name}</span>
                    <small>{quantity} × {money(rate)}</small>
                  </span>
                  <b>{money(itemTotal)}</b>
                </div>
              )
            })
          ) : (
            <div className="empty-items-message">
              <p>✨ No items added yet</p>
              <small>Add items to see them here</small>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="receipt-total">
          <div className="total-row">
            <span>Subtotal</span>
            <b>{money(subtotal)}</b>
          </div>

          {Number(discount) > 0 && (
            <div className="total-row">
              <span>Discount</span>
              <b>-{money(discount)}</b>
            </div>
          )}

          {Number(tax) > 0 && (
            <div className="total-row">
              <span>Tax ({tax}%)</span>
              <b>{money(taxAmount)}</b>
            </div>
          )}

          <div className="grand-total">
            <strong>Grand total</strong>
            <strong>{money(total)}</strong>
          </div>
        </div>

        {/* Footer */}
        <div className="receipt-foot">
          <span>{payment || "Cash"}</span>
          <p>{template?.footer || "Thank you for shopping with us!"}</p>
        </div>
      </div>

      {saved && (
        <div data-testid="bill-saved-message" className="success">
          ✓ Receipt saved · {saved.number}
        </div>
      )}

      <button
        data-testid="view-history-button"
        className="text-button"
        onClick={() => setView("history")}
      >
        View bill history <ArrowRight size={15} />
      </button>
    </aside>
  )
}