// Bill.jsx - Updated (removed mobile-sticky-action-bar)

import { useEffect, useMemo, useState, useRef } from "react"
import { printReceiptElement } from "../lib/printReceipt"
import { PrintModal } from "./PrintModal"
import { BUILTIN_TEMPLATES } from "./Templates"
import {
  Plus,
  Receipt,
  Printer,
  Trash2,
  Save,
  X,
  CreditCard,
  Building,
  Phone,
  MapPin,
  User,
  UserPlus,
  Hash,
  Eye,
  FileEdit,
  SlidersHorizontal,
  CheckCircle2
} from "lucide-react"
import {
  call,
  money,
  incrementTemplatePrint,
  canPrintTemplate,
  getRemainingPrints
} from "../lib/utils"
import { ReceiptSkeleton, ButtonLoader, Spinner } from "./common/Skeleton"
import { useToast } from "./common/Toast"

// Demo templates for non-logged-in visitors trying the tool from the home page.
const GUEST_TEMPLATES = [
  { id: "2", name: "Minimal Bill", width: "58mm", show_tax: false, tax_rate: 0, footer: "Thanks for your purchase!", is_default: true },
  { id: "1", name: "Classic Receipt", width: "58mm", show_tax: true, tax_rate: 18, footer: "Thank you for shopping with us!", is_default: false },
  { id: "3", name: "Shop Pro", width: "80mm", show_tax: true, tax_rate: 18, footer: "We appreciate your business!", is_default: false },
  { id: "4", name: "Eco Print", width: "58mm", show_tax: false, tax_rate: 0, footer: "Thank you!", is_default: false },
  { id: "5", name: "Modern Shop", width: "58mm", show_tax: true, tax_rate: 12, footer: "Visit us again!", is_default: false },
  { id: "6", name: "Business Elite", width: "80mm", show_tax: true, tax_rate: 18, footer: "Thank you for your business.", is_default: false }
]

function generateClientBillNumber(prefix = "SLP", sequence = 1001, format = "PREFIX-DATE-SEQ") {
  const cleanPrefix = (prefix || "SLP").trim().toUpperCase()
  const date = new Date()
  const fullYear = date.getFullYear().toString()
  const shortYear = fullYear.slice(-2)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const dateStr = `${fullYear}${month}${day}`
  const shortDateStr = `${shortYear}${month}${day}`
  const seqStr = String(sequence || 1001).padStart(4, "0")

  if (format === "PREFIX-SEQ") return `${cleanPrefix}-${seqStr}`
  if (format === "PREFIX-SHORTDATE-SEQ") return `${cleanPrefix}-${shortDateStr}-${seqStr}`
  if (format === "SEQ") return seqStr
  return `${cleanPrefix}-${dateStr}-${seqStr}`
}

export function Bill({ setView, user, requireAuth }) {
  const [templates, setTemplates] = useState([])
  const [selectedId, setSelectedId] = useState(() => sessionStorage.getItem("slipzo-template") || "")
  const [shop, setShop] = useState({})
  const [customers, setCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [items, setItems] = useState([{ id: 1, name: "", quantity: 1, rate: 0 }])
  const [discount, setDiscount] = useState(0)
  const [tax, setTax] = useState(0)
  const [payment, setPayment] = useState("Cash")
  const [saved, setSaved] = useState(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState(null)
  const [customBillNumber, setCustomBillNumber] = useState("")
  const [editingBillNumber, setEditingBillNumber] = useState(false)
  const [activeMobileTab, setActiveMobileTab] = useState("edit") // "edit" | "preview"
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false)
  const [quickCustomerForm, setQuickCustomerForm] = useState({ name: "", phone: "" })
  const [quickCustomerLoading, setQuickCustomerLoading] = useState(false)

  const receiptRef = useRef(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)

  const { success: toastSuccess, error: toastError } = useToast()

  useEffect(() => {
    const loadData = async () => {
      try {
        setInitialLoading(true)
        setError(null)

        if (!user) {
          setTemplates(GUEST_TEMPLATES)
          setShop({ name: "Your Shop Name", address: "", phone: "", invoice_prefix: "SLP", invoice_sequence: 1001 })
          if (!selectedId) {
            setSelectedId(GUEST_TEMPLATES[0].id)
          }
          setCustomBillNumber(generateClientBillNumber("SLP", 1001, "PREFIX-DATE-SEQ"))
          return
        }

        const [templatesData, shopData, customersData] = await Promise.all([
          call("/templates"),
          call("/shop"),
          call("/customers").catch(() => [])
        ])

        const dbTemplates = Array.isArray(templatesData) ? templatesData : []
        const dbNames = new Set(dbTemplates.map(t => (t.name || "").toLowerCase()))
        const extraBuiltins = BUILTIN_TEMPLATES.filter(b => !dbNames.has((b.name || "").toLowerCase()))
        const templatesArray = [...dbTemplates, ...extraBuiltins]

        setTemplates(templatesArray)
        setShop(shopData || {})
        setCustomers(Array.isArray(customersData) ? customersData : [])

        if (!selectedId && templatesArray.length > 0) {
          const defaultTpl = templatesArray.find((t) => t.is_default) || templatesArray[0]
          setSelectedId(defaultTpl.id)
        }

        // Generate live invoice number
        const nextNum = generateClientBillNumber(
          shopData?.invoice_prefix || "SLP",
          shopData?.invoice_sequence || 1001,
          shopData?.invoice_format || "PREFIX-DATE-SEQ"
        )
        setCustomBillNumber(nextNum)

        // Check if a customer was pre-selected from session
        const storedCustomer = sessionStorage.getItem("slipzo-selected-customer")
        if (storedCustomer) {
          try {
            const cust = JSON.parse(storedCustomer)
            setSelectedCustomer(cust)
            sessionStorage.removeItem("slipzo-selected-customer")
          } catch (e) {
            sessionStorage.removeItem("slipzo-selected-customer")
          }
        }

        // Check if a product was pre-selected from session
        const storedItem = sessionStorage.getItem("slipzo-quick-item")
        if (storedItem) {
          try {
            const item = JSON.parse(storedItem)
            if (item && item.name) {
              setItems([{ id: Date.now(), name: item.name, rate: item.rate || 0, quantity: item.quantity || 1 }])
              if (item.tax_rate !== undefined) setTax(item.tax_rate)
            }
            sessionStorage.removeItem("slipzo-quick-item")
          } catch (e) {
            sessionStorage.removeItem("slipzo-quick-item")
          }
        }
      } catch (err) {
        console.error("Failed to load bill setup data:", err)
        setError(err.message)
        setTemplates([])
      } finally {
        setInitialLoading(false)
      }
    }
    loadData()
  }, [user])

  const selected = useMemo(() => {
    if (!Array.isArray(templates) || templates.length === 0) return null
    return templates.find((t) => t.id === selectedId) || templates[0] || null
  }, [templates, selectedId])

  // Auto-set tax from template
  useEffect(() => {
    if (!selected) return
    setTax(selected.show_tax ? Number(selected.tax_rate) || 0 : 0)
  }, [selected])

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0),
        0
      ),
    [items]
  )

  const discountAmount = useMemo(() => Number(discount) || 0, [discount])
  const taxRate = useMemo(() => Number(tax) || 0, [tax])
  const taxable = useMemo(() => Math.max(0, subtotal - discountAmount), [subtotal, discountAmount])
  const taxAmount = useMemo(() => taxable * (taxRate / 100), [taxable, taxRate])
  const total = useMemo(() => taxable + taxAmount, [taxable, taxAmount])

  const updateItem = (index, key, value) => {
    setItems(items.map((item, i) => (i === index ? { ...item, [key]: value } : item)))
  }

  const addItem = () => {
    const newId = Math.max(...items.map((i) => i.id), 0) + 1
    setItems([...items, { id: newId, name: "", quantity: 1, rate: 0 }])
  }

  const removeItem = (index) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const clearAllItems = () => {
    setItems([{ id: 1, name: "", quantity: 1, rate: 0 }])
  }

  const handleQuickAddCustomer = async (e) => {
    e.preventDefault()
    if (!quickCustomerForm.name.trim()) return
    try {
      setQuickCustomerLoading(true)
      const newCust = await call("/customers", {
        method: "POST",
        body: JSON.stringify(quickCustomerForm)
      })
      setCustomers((prev) => [newCust, ...prev])
      setSelectedCustomer(newCust)
      setShowQuickCustomerModal(false)
      setQuickCustomerForm({ name: "", phone: "" })
      toastSuccess(`Added customer ${newCust.name}`)
    } catch (err) {
      toastError(err.message || "Failed to add customer")
    } finally {
      setQuickCustomerLoading(false)
    }
  }

  const saveBill = async () => {
    if (!user) {
      requireAuth?.("dashboard")
      return
    }

    setLoading(true)
    setError(null)

    const validItems = items.filter((item) => item.name && item.name.trim())

    if (validItems.length === 0) {
      setError("Please add at least one item")
      toastError("Please add at least one item")
      setLoading(false)
      return
    }

    try {
      const billData = {
        template_id: selected?.id || "",
        items: validItems.map((item) => ({
          name: item.name.trim(),
          quantity: Number(item.quantity) || 0,
          rate: Number(item.rate) || 0
        })),
        discount: Number(discount) || 0,
        tax_rate: Number(tax) || 0,
        payment_mode: payment,
        customer_id: selectedCustomer?.id || null,
        customer_name: selectedCustomer?.name || "",
        customer_phone: selectedCustomer?.phone || "",
        number: customBillNumber || ""
      }

      const bill = await call("/bills", {
        method: "POST",
        body: JSON.stringify(billData)
      })

      setSaved(bill)
      setCustomBillNumber(bill.number)
      toastSuccess(`Bill #${bill.number} saved successfully!`)

      // Increment local shop sequence preview
      if (shop.invoice_sequence) {
        setShop((s) => ({ ...s, invoice_sequence: Number(s.invoice_sequence) + 1 }))
      }
    } catch (err) {
      console.error("Failed to save bill:", err)
      const msg = err.message || "Failed to save bill. Please try again."
      setError(msg)
      toastError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    if (!user && selected) {
      if (!canPrintTemplate(selected.id)) {
        alert(
          "You've used all 10 free prints for this template. Please sign up to get unlimited access."
        )
        return
      }
      incrementTemplatePrint(selected.id)
    }

    setShowPrintModal(true)
  }

  const resetForm = () => {
    setItems([{ id: 1, name: "", quantity: 1, rate: 0 }])
    setDiscount(0)
    setPayment("Cash")
    setSelectedCustomer(null)
    setSaved(null)
    setError(null)

    const nextNum = generateClientBillNumber(
      shop?.invoice_prefix || "SLP",
      shop?.invoice_sequence || 1001,
      shop?.invoice_format || "PREFIX-DATE-SEQ"
    )
    setCustomBillNumber(nextNum)
  }

  // Render usage info for non-logged-in users
  const renderUsageInfo = () => {
    if (user || !selected) return null

    const remaining = getRemainingPrints(selected.id)
    const hasRemaining = remaining > 0

    return (
      <div
        className="usage-info-bar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 1rem",
          borderRadius: "8px",
          fontSize: "0.75rem",
          background: hasRemaining ? "#f8fafc" : "#fef2f2",
          border: `1px solid ${hasRemaining ? "#e2e8f0" : "#fecaca"}`,
          color: hasRemaining ? "#64748b" : "#dc2626",
          marginTop: "0.5rem"
        }}
      >
        <span>
          🖨️ {remaining} free {remaining === 1 ? "print" : "prints"} remaining
        </span>
        {!hasRemaining && (
          <button
            className="usage-cta"
            onClick={() => requireAuth?.("dashboard")}
            style={{
              marginLeft: "auto",
              padding: "0.15rem 0.75rem",
              background: "#0f172a",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.7rem",
              fontWeight: 500,
              cursor: "pointer"
            }}
          >
            Sign up
          </button>
        )}
      </div>
    )
  }

  const today = new Date()
  const formattedDate = today.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  })
  const formattedTime = today.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  })

  if (initialLoading) {
    return (
      <div className="page bill-page fade-in">
        <div className="page-intro">
          <div>
            <p className="eyebrow accent">NEW RECEIPT</p>
            <h2>Create Bill</h2>
          </div>
        </div>
        <div className="bill-grid">
          <div className="bill-editor-panel">
            <ReceiptSkeleton />
          </div>
          <div className="receipt-preview-panel">
            <ReceiptSkeleton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page bill-page fade-in">
      {/* Header */}
      <div className="bill-header">
        <div className="bill-header-left">
          <p className="eyebrow accent">NEW RECEIPT</p>
          <h2>Create Bill</h2>
          <p className="subtle">Add items and generate a professional receipt</p>
        </div>
        <div className="bill-header-actions">
          <button
            data-testid="reset-bill-button"
            className="secondary-button"
            onClick={resetForm}
          >
            <X size={16} /> Reset
          </button>
          <button
            data-testid="save-bill-button"
            className="primary-button"
            onClick={saveBill}
            disabled={loading}
          >
            {loading ? (
              <ButtonLoader text="Saving..." />
            ) : (
              <>
                <Save size={16} /> {!user ? "Sign up to save" : "Save Bill"}
              </>
            )}
          </button>
          <button
            data-testid="print-receipt-button"
            className="print-button"
            onClick={handlePrint}
            disabled={isPrinting}
          >
            {isPrinting ? (
              <ButtonLoader text="Printing..." />
            ) : (
              <>
                <Printer size={16} /> Print
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="mobile-view-tabs">
        <button
          className={`mobile-tab-btn ${activeMobileTab === "edit" ? "active" : ""}`}
          onClick={() => setActiveMobileTab("edit")}
        >
          <FileEdit size={16} /> Edit Bill ({items.length} items)
        </button>
        <button
          className={`mobile-tab-btn ${activeMobileTab === "preview" ? "active" : ""}`}
          onClick={() => setActiveMobileTab("preview")}
        >
          <Eye size={16} /> Live Preview ({money(total)})
        </button>
      </div>

      <div className={`bill-grid ${activeMobileTab === "preview" ? "show-mobile-preview" : "show-mobile-edit"}`}>
        {/* LEFT - Bill Editor */}
        <div className="bill-editor-panel">
          {/* Top Row: Template & Customer & Bill # */}
          <div className="editor-section-row">
            {/* Template Selector */}
            <div className="editor-section flex-1">
              <label className="field-label">
                <span>Receipt Template</span>
                <select
                  data-testid="bill-template-select"
                  value={selected?.id || ""}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="template-select"
                >
                  {Array.isArray(templates) &&
                    templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.is_default ? "(Default)" : ""} ({t.width})
                      </option>
                    ))}
                </select>
              </label>
            </div>

            {/* Customer Selector */}
            {user && (
              <div className="editor-section flex-1">
                <div className="customer-field-header">
                  <span className="field-label-text">Customer (Optional)</span>
                  <button
                    type="button"
                    className="ghost-text-btn"
                    onClick={() => setShowQuickCustomerModal(true)}
                  >
                    <Plus size={13} /> Quick Add
                  </button>
                </div>
                <div className="customer-select-row">
                  <select
                    className="template-select"
                    value={selectedCustomer?.id || ""}
                    onChange={(e) => {
                      const cust = customers.find((c) => c.id === e.target.value) || null
                      setSelectedCustomer(cust)
                    }}
                  >
                    <option value="">-- Walk-in / Unassigned --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ""}
                      </option>
                    ))}
                  </select>
                  {selectedCustomer && (
                    <button
                      className="icon-button small"
                      title="Clear customer"
                      onClick={() => setSelectedCustomer(null)}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Invoice Numbering Strip */}
          <div className="invoice-number-strip">
            <div className="invoice-strip-left">
              <Hash size={14} className="text-accent" />
              <span>Invoice #:</span>
              {editingBillNumber ? (
                <input
                  type="text"
                  className="inline-bill-num-input"
                  value={customBillNumber}
                  onChange={(e) => setCustomBillNumber(e.target.value)}
                  onBlur={() => setEditingBillNumber(false)}
                  autoFocus
                />
              ) : (
                <strong
                  className="editable-bill-number"
                  onClick={() => setEditingBillNumber(true)}
                  title="Click to customize invoice number"
                >
                  {customBillNumber || "SLP-DRAFT"}
                </strong>
              )}
            </div>
            <button
              className="ghost-text-btn small"
              onClick={() => setEditingBillNumber(!editingBillNumber)}
            >
              {editingBillNumber ? "Done" : "Customize"}
            </button>
          </div>

          {/* Items Section */}
          <div className="editor-section items-section">
            <div className="items-header">
              <span className="items-header-label">Items & Services</span>
              <button className="ghost-button small" onClick={clearAllItems}>
                Clear all
              </button>
            </div>

            <div className="items-list">
              {items.map((item, index) => (
                <div className="item-card" key={item.id}>
                  <div className="item-row">
                    <div className="item-field item-name-field">
                      <input
                        data-testid={`bill-item-${index}-name-input`}
                        placeholder="Item name / description"
                        value={item.name}
                        onChange={(e) => updateItem(index, "name", e.target.value)}
                        className="item-input"
                        autoComplete="off"
                      />
                    </div>
                    <div className="item-field item-qty-field">
                      <label className="mobile-only-field-label">Qty</label>
                      <input
                        data-testid={`bill-item-${index}-quantity-input`}
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, "quantity", Number(e.target.value) || 0)
                        }
                        className="item-input number-input"
                      />
                    </div>
                    <div className="item-field item-rate-field">
                      <label className="mobile-only-field-label">Rate (₹)</label>
                      <input
                        data-testid={`bill-item-${index}-rate-input`}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Rate"
                        value={item.rate}
                        onChange={(e) =>
                          updateItem(index, "rate", Number(e.target.value) || 0)
                        }
                        className="item-input number-input"
                      />
                    </div>
                    <div className="item-field item-amount-field">
                      <span className="item-amount">
                        {money((item.quantity || 0) * (item.rate || 0))}
                      </span>
                    </div>
                    <button
                      className="remove-item-button"
                      onClick={() => removeItem(index)}
                      disabled={items.length <= 1}
                      title="Remove item"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              data-testid="add-bill-item-button"
              className="add-item-button"
              onClick={addItem}
            >
              <Plus size={16} /> Add Item
            </button>
          </div>

          {/* Bill Options: Discount, Tax, Payment */}
          <div className="editor-section options-grid">
            <div className="option-group">
              <label className="field-label">
                <span>Discount (₹)</span>
                <input
                  data-testid="bill-discount-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="option-input"
                />
              </label>
            </div>
            <div className="option-group">
              <label className="field-label">
                <span>Tax Rate (%)</span>
                <input
                  data-testid="bill-tax-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={tax}
                  onChange={(e) => setTax(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="option-input"
                />
              </label>
            </div>
            <div className="option-group">
              <label className="field-label">
                <span>Payment Mode</span>
                <select
                  data-testid="bill-payment-select"
                  value={payment}
                  onChange={(e) => setPayment(e.target.value)}
                  className="option-select"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / QR</option>
                  <option value="Card">Card / POS</option>
                  <option value="Credit">Credit / Khata</option>
                  <option value="Online">Online Transfer</option>
                </select>
              </label>
            </div>
          </div>

          {renderUsageInfo()}

          {error && <div className="error-message slide-up">{error}</div>}

          {saved && (
            <div className="success-message slide-up">
              <div className="success-icon">✓</div>
              <div>
                <strong>Receipt saved successfully!</strong>
                <span className="success-details">
                  Bill #{saved.number} · {saved.items?.length || 0} items · {saved.payment_mode}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT - Receipt Preview */}
        <div className="receipt-preview-panel">
          <div className="preview-header">
            <h3>Receipt Preview</h3>
            <span className="preview-badge">{selected?.width || "58mm"}</span>
          </div>

          <div
            ref={receiptRef}
            id="receipt-to-print"
            className={`receipt-preview-content tpl-style-${selected?.id || "2"}`}
            style={{ maxWidth: selected?.width === "80mm" ? "420px" : "320px" }}
          >
            {/* Template Specific Header Badge */}
            {(selected?.id === "6" || selected?.id === "elite") && (
              <div className="receipt-tax-badge">TAX INVOICE</div>
            )}
            {(selected?.id === "5" || selected?.id === "modern") && (
              <div className="receipt-boutique-badge">BOUTIQUE RECEIPT</div>
            )}

            {/* Shop Header */}
            <div className="receipt-shop">
              <div className="receipt-logo">S</div>
              <h2 className="receipt-shop-name">{shop?.name || "Slipzo Shop"}</h2>
              {shop?.address && (
                <p className="receipt-shop-address">
                  <MapPin size={12} /> {shop.address}
                </p>
              )}
              {shop?.phone && (
                <p className="receipt-shop-phone">
                  <Phone size={12} /> {shop.phone}
                </p>
              )}
            </div>

            {/* Receipt Meta */}
            <div className="receipt-meta">
              <span className="receipt-number">#{customBillNumber || "SLP-DRAFT"}</span>
              <span className="receipt-date">
                {formattedDate} {formattedTime}
              </span>
            </div>

            {/* Customer Line in Preview */}
            {selectedCustomer && (
              <div className="receipt-customer-line">
                <span>Customer: <b>{selectedCustomer.name}</b></span>
                {selectedCustomer.phone && <small>Ph: {selectedCustomer.phone}</small>}
              </div>
            )}

            {/* Divider */}
            <div className="receipt-divider"></div>

            {/* Items */}
            <div className="receipt-items">
              <div className="receipt-items-header">
                <span>Item</span>
                <span>Qty</span>
                <span>Rate</span>
                <span>Amount</span>
              </div>
              {items.filter((item) => item.name && item.name.trim()).length > 0 ? (
                items
                  .filter((item) => item.name && item.name.trim())
                  .map((item, index) => {
                    const qty = Number(item.quantity) || 0
                    const rate = Number(item.rate) || 0
                    const amount = qty * rate
                    return (
                      <div className="receipt-item-row" key={item.id || index}>
                        <span className="receipt-item-name">{item.name}</span>
                        <span className="receipt-item-qty">{qty}</span>
                        <span className="receipt-item-rate">{money(rate)}</span>
                        <span className="receipt-item-amount">{money(amount)}</span>
                      </div>
                    )
                  })
              ) : (
                <div className="receipt-empty-items">
                  <p>No items added</p>
                  <small>Add items to see preview</small>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="receipt-totals">
              <div className="receipt-total-row">
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="receipt-total-row discount">
                  <span>Discount</span>
                  <span>-{money(discountAmount)}</span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="receipt-total-row">
                  <span>Tax ({taxRate}%)</span>
                  <span>{money(taxAmount)}</span>
                </div>
              )}
              <div className="receipt-grand-total">
                <span>Grand Total</span>
                <span>{money(total)}</span>
              </div>
            </div>

            {/* Divider */}
            <div className="receipt-divider"></div>

            {/* Special Features per Template */}
            {(selected?.id === "3" || selected?.id === "pro") && (
              <div className="receipt-pro-extras">
                <div className="receipt-qr-wrapper">
                  <div className="receipt-qr-box">UPI QR</div>
                  <span>Scan to pay with any UPI App</span>
                </div>
                <div className="receipt-loyalty-tag">★ Earned {Math.floor(total / 50)} Loyalty Points</div>
              </div>
            )}

            {(selected?.id === "6" || selected?.id === "elite") && (
              <div className="receipt-signatory-wrapper">
                <div className="signatory-line" />
                <span>Authorized Signatory</span>
              </div>
            )}

            {/* Footer */}
            <div className="receipt-footer">
              <div className="receipt-payment">
                <span>Payment Mode</span>
                <span>{payment}</span>
              </div>
              <p className="receipt-thanks">
                {selected?.footer || "Thank you for shopping with us!"}
              </p>
            </div>
          </div>

          {/* Quick Actions in Preview */}
          <div className="preview-actions">
            <button className="preview-action-button" onClick={handlePrint} disabled={isPrinting}>
              <Printer size={16} /> {isPrinting ? "Printing..." : "Print Receipt"}
            </button>
            <button
              className="preview-action-button secondary"
              onClick={() => (user ? setView("history") : requireAuth?.("history"))}
            >
              View History
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Bill Actions */}
      <div className="bill-bottom-actions">
        <div className="bill-header-actions">
          <button
            data-testid="bottom-reset-bill-button"
            className="secondary-button"
            onClick={resetForm}
          >
            <X size={16} /> Reset
          </button>
          <button
            data-testid="bottom-save-bill-button"
            className="primary-button"
            onClick={saveBill}
            disabled={loading}
          >
            {loading ? (
              <ButtonLoader text="Saving..." />
            ) : (
              <>
                <Save size={16} /> {!user ? "Sign up to save" : "Save Bill"}
              </>
            )}
          </button>
          <button
            data-testid="bottom-print-receipt-button"
            className="print-button"
            onClick={handlePrint}
            disabled={isPrinting}
          >
            {isPrinting ? (
              <ButtonLoader text="Printing..." />
            ) : (
              <>
                <Printer size={16} /> Print
              </>
            )}
          </button>
        </div>

        {/* Mobile Tab Switcher (Bottom) */}
        <div className="mobile-view-tabs">
          <button
            data-testid="bottom-edit-tab-button"
            className={`mobile-tab-btn ${activeMobileTab === "edit" ? "active" : ""}`}
            onClick={() => {
              setActiveMobileTab("edit")
              window.scrollTo({ top: 0, behavior: "smooth" })
            }}
          >
            <FileEdit size={16} /> Edit Bill ({items.length} items)
          </button>
          <button
            data-testid="bottom-preview-tab-button"
            className={`mobile-tab-btn ${activeMobileTab === "preview" ? "active" : ""}`}
            onClick={() => {
              setActiveMobileTab("preview")
              window.scrollTo({ top: 0, behavior: "smooth" })
            }}
          >
            <Eye size={16} /> Live Preview ({money(total)})
          </button>
        </div>
      </div>

      {/* Quick Add Customer Modal */}
      {showQuickCustomerModal && (
        <div className="modal-backdrop fade-in" onClick={() => setShowQuickCustomerModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Quick Add Customer</h3>
              <button className="modal-close-btn" onClick={() => setShowQuickCustomerModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleQuickAddCustomer} className="modal-form">
              <div className="form-group">
                <label>
                  Customer Name *
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Suman Gupta"
                    value={quickCustomerForm.name}
                    onChange={(e) =>
                      setQuickCustomerForm({ ...quickCustomerForm, name: e.target.value })
                    }
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  Phone Number
                  <input
                    type="tel"
                    placeholder="98765 43210"
                    value={quickCustomerForm.phone}
                    onChange={(e) =>
                      setQuickCustomerForm({ ...quickCustomerForm, phone: e.target.value })
                    }
                  />
                </label>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowQuickCustomerModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={quickCustomerLoading}>
                  {quickCustomerLoading ? <ButtonLoader text="Saving..." /> : "Add & Select"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Thermal Print Setup & Adjustment Modal */}
      <PrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        defaultWidth={selected?.width || "58mm"}
        elementId="receipt-to-print"
      />
    </div>
  )
}