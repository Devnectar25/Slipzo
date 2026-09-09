import { useEffect, useState, useRef, useMemo } from "react"
import { ArrowRight, Store, Hash, Check, Save } from "lucide-react"
import { call } from "../lib/utils"
import { ButtonLoader, Skeleton } from "./common/Skeleton"
import { useToast } from "./common/Toast"

function previewInvoiceNumber(prefix = "SLP", sequence = 1001, format = "PREFIX-DATE-SEQ") {
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

export function Shop() {
  const [shop, setShop] = useState({
    name: "",
    address: "",
    phone: "",
    invoice_prefix: "SLP",
    invoice_sequence: 1001,
    invoice_format: "PREFIX-DATE-SEQ"
  })
  const [ready, setReady] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const edited = useRef(false)

  const { success, error: toastError } = useToast()

  useEffect(() => {
    const loadShop = async () => {
      try {
        const data = await call("/shop")
        if (!edited.current && data) {
          setShop({
            name: data.name || "",
            address: data.address || "",
            phone: data.phone || "",
            invoice_prefix: data.invoice_prefix || "SLP",
            invoice_sequence: data.invoice_sequence || 1001,
            invoice_format: data.invoice_format || "PREFIX-DATE-SEQ"
          })
        }
      } catch (err) {
        console.error("Failed to load shop:", err)
        toastError("Failed to load shop details")
      } finally {
        setReady(true)
      }
    }
    loadShop()
  }, [])

  const handleChange = (key, value) => {
    edited.current = true
    setShop((prev) => ({ ...prev, [key]: value }))
  }

  const saveShop = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await call("/shop", {
        method: "PUT",
        body: JSON.stringify(shop)
      })
      setSaved(true)
      success("Shop profile and invoice settings saved!")
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error("Failed to save shop:", err)
      toastError(err.message || "Failed to save shop profile")
    } finally {
      setLoading(false)
    }
  }

  const liveInvoicePreview = useMemo(() => {
    return previewInvoiceNumber(
      shop.invoice_prefix,
      shop.invoice_sequence,
      shop.invoice_format
    )
  }, [shop.invoice_prefix, shop.invoice_sequence, shop.invoice_format])

  if (!ready) {
    return (
      <div className="page shop-page fade-in">
        <div className="page-intro">
          <div>
            <p className="eyebrow accent">YOUR BUSINESS</p>
            <h2>Shop profile.</h2>
          </div>
        </div>
        <div className="profile-form">
          <Skeleton width="100%" height="48px" />
          <Skeleton width="100%" height="48px" />
          <Skeleton width="100%" height="96px" />
          <Skeleton width="180px" height="44px" borderRadius="8px" />
        </div>
      </div>
    )
  }

  return (
    <div className="page shop-page fade-in">
      <div className="page-intro">
        <div>
          <p className="eyebrow accent">YOUR BUSINESS</p>
          <h2>Shop profile & invoice settings.</h2>
          <p className="subtle">
            These details and numbering patterns appear on every receipt you print.
          </p>
        </div>
      </div>

      <form className="profile-form" onSubmit={saveShop}>
        {/* Basic Business Details */}
        <div className="form-section-card">
          <h3 className="section-title-sm"><Store size={16} /> Business Details</h3>
          
          <label>
            SHOP NAME *
            <input
              data-testid="shop-name-input"
              required
              placeholder="e.g. Mahajan General Store"
              value={shop.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </label>

          <label>
            PHONE NUMBER
            <input
              data-testid="shop-phone-input"
              placeholder="98765 43210"
              value={shop.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
            />
          </label>

          <label>
            ADDRESS
            <textarea
              data-testid="shop-address-input"
              rows="3"
              placeholder="Street, area, city, pincode"
              value={shop.address}
              onChange={(e) => handleChange("address", e.target.value)}
            />
          </label>
        </div>

        {/* Invoice Numbering Configuration */}
        <div className="form-section-card">
          <h3 className="section-title-sm"><Hash size={16} /> Invoice Numbering</h3>
          <p className="subtle" style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
            Customize your sequence pattern and starting counter for clean bookkeeping.
          </p>

          <div className="form-row">
            <label className="flex-1">
              INVOICE PREFIX
              <input
                type="text"
                maxLength="8"
                placeholder="e.g. SLP, INV, BILL"
                value={shop.invoice_prefix}
                onChange={(e) => handleChange("invoice_prefix", e.target.value.toUpperCase())}
              />
            </label>

            <label className="flex-1">
              NEXT SEQUENCE NUMBER
              <input
                type="number"
                min="1"
                placeholder="1001"
                value={shop.invoice_sequence}
                onChange={(e) => handleChange("invoice_sequence", Number(e.target.value) || 1)}
              />
            </label>
          </div>

          <label>
            NUMBER FORMAT
            <select
              value={shop.invoice_format}
              onChange={(e) => handleChange("invoice_format", e.target.value)}
              className="option-select"
            >
              <option value="PREFIX-DATE-SEQ">PREFIX-YYYYMMDD-SEQ (e.g. SLP-20260909-1001)</option>
              <option value="PREFIX-SHORTDATE-SEQ">PREFIX-YYMMDD-SEQ (e.g. SLP-260909-1001)</option>
              <option value="PREFIX-SEQ">PREFIX-SEQ (e.g. SLP-1001)</option>
              <option value="SEQ">SEQ ONLY (e.g. 1001)</option>
            </select>
          </label>

          {/* Live Preview Box */}
          <div className="invoice-format-preview-box">
            <span className="preview-label">Next Bill Format Preview:</span>
            <strong className="preview-code">{liveInvoicePreview}</strong>
          </div>
        </div>

        <button
          data-testid="save-shop-button"
          className="primary-button"
          type="submit"
          disabled={loading}
          style={{ width: "fit-content" }}
        >
          {loading ? <ButtonLoader text="Saving..." /> : <>Save Settings <ArrowRight size={16} /></>}
        </button>

        {saved && (
          <div data-testid="shop-saved-message" className="success-message slide-up">
            <Check size={16} /> Shop profile & invoice settings saved!
          </div>
        )}
      </form>
    </div>
  )
}