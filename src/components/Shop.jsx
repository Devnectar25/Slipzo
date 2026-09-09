import { useEffect, useState, useRef, useMemo } from "react"
import { ArrowRight, Store, Hash, Check, Save, AlertCircle } from "lucide-react"
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

export function Shop({ user } = {}) {
  const [shop, setShop] = useState({
    name: "",
    address: "",
    phone: "",
    invoice_prefix: "SLP",
    invoice_sequence: 1001,
    invoice_format: "PREFIX-DATE-SEQ"
  })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [ready, setReady] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const edited = useRef(false)

  const { success, error: toastError, warning: toastWarning } = useToast()

  const validateField = (key, value, currentShop = shop) => {
    let errorMsg = ""
    const val = String(value || "").trim()

    if (key === "name") {
      if (!val) {
        errorMsg = "Shop name is required."
      } else if (val.length < 2) {
        errorMsg = "Shop name must be at least 2 characters."
      } else if (val.length > 100) {
        errorMsg = "Shop name cannot exceed 100 characters."
      }
    }

    if (key === "phone" && val) {
      const phoneRegex = /^(\+?[0-9]{1,4}[ -]?)?[0-9]{7,15}$/
      const digitsOnly = val.replace(/[^0-9]/g, "")
      if (!phoneRegex.test(val) || digitsOnly.length < 7 || digitsOnly.length > 15) {
        errorMsg = "Please enter a valid phone number (7–15 digits)."
      }
    }

    if (key === "address" && val) {
      if (val.length > 300) {
        errorMsg = "Address cannot exceed 300 characters."
      }
    }

    if (key === "invoice_prefix") {
      if (currentShop.invoice_format !== "SEQ") {
        if (!val) {
          errorMsg = "Invoice prefix is required."
        } else if (!/^[A-Za-z0-9]{1,8}$/.test(val)) {
          errorMsg = "Prefix must be 1–8 letters or numbers (e.g. SLP, INV)."
        }
      }
    }

    if (key === "invoice_sequence") {
      const num = Number(value)
      if (value === "" || isNaN(num)) {
        errorMsg = "Sequence number is required."
      } else if (!Number.isInteger(num) || num < 1) {
        errorMsg = "Sequence number must be at least 1."
      } else if (num > 999999999) {
        errorMsg = "Sequence number is too large."
      }
    }

    return errorMsg
  }

  const validateAll = (dataToValidate = shop) => {
    const newErrors = {}
    const keys = ["name", "phone", "address", "invoice_prefix", "invoice_sequence"]
    
    keys.forEach((k) => {
      const err = validateField(k, dataToValidate[k], dataToValidate)
      if (err) newErrors[k] = err
    })

    setErrors(newErrors)
    return newErrors
  }

  useEffect(() => {
    const loadShop = async () => {
      try {
        const data = await call("/shop")
        if (!edited.current && data) {
          const loadedShop = {
            name: data.name || "",
            address: data.address || "",
            phone: data.phone || "",
            invoice_prefix: data.invoice_prefix || "SLP",
            invoice_sequence: data.invoice_sequence || 1001,
            invoice_format: data.invoice_format || "PREFIX-DATE-SEQ"
          }
          setShop(loadedShop)
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
    const updatedShop = { ...shop, [key]: value }
    setShop(updatedShop)

    if (touched[key] || errors[key]) {
      const fieldError = validateField(key, value, updatedShop)
      setErrors((prev) => ({ ...prev, [key]: fieldError }))
    }
  }

  const handleBlur = (key) => {
    setTouched((prev) => ({ ...prev, [key]: true }))
    const fieldError = validateField(key, shop[key], shop)
    setErrors((prev) => ({ ...prev, [key]: fieldError }))
  }

  const saveShop = async (e) => {
    e.preventDefault()

    setTouched({
      name: true,
      phone: true,
      address: true,
      invoice_prefix: true,
      invoice_sequence: true
    })

    const validationErrors = validateAll(shop)
    if (Object.keys(validationErrors).length > 0) {
      if (toastWarning) {
        toastWarning("Please fix the validation errors before saving.")
      } else {
        toastError("Please fix the validation errors before saving.")
      }
      return
    }

    setLoading(true)
    try {
      await call("/shop", {
        method: "PUT",
        body: JSON.stringify(shop)
      })
      if (user?.id) {
        localStorage.setItem(`slipzo_shop_setup_${user.id}`, "true")
      }
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

      <form className="profile-form" onSubmit={saveShop} noValidate>
        {/* Basic Business Details */}
        <div className="form-section-card">
          <h3 className="section-title-sm"><Store size={16} /> Business Details</h3>
          
          <label className="form-group-label">
            SHOP NAME *
            <input
              data-testid="shop-name-input"
              required
              placeholder="e.g. Mahajan General Store"
              value={shop.name}
              onChange={(e) => handleChange("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              style={{
                borderColor: touched.name && errors.name ? "#ef4444" : undefined
              }}
            />
            {touched.name && errors.name && (
              <span className="field-error-text" style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "0.3rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <AlertCircle size={13} /> {errors.name}
              </span>
            )}
          </label>

          <label className="form-group-label">
            PHONE NUMBER
            <input
              data-testid="shop-phone-input"
              placeholder="e.g. 9876543210"
              value={shop.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              onBlur={() => handleBlur("phone")}
              style={{
                borderColor: touched.phone && errors.phone ? "#ef4444" : undefined
              }}
            />
            {touched.phone && errors.phone ? (
              <span className="field-error-text" style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "0.3rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <AlertCircle size={13} /> {errors.phone}
              </span>
            ) : (
              <small style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.2rem", display: "block" }}>
                7–15 digits for contact header on receipt
              </small>
            )}
          </label>

          <label className="form-group-label">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>ADDRESS</span>
              <span style={{ fontSize: "0.72rem", color: shop.address.length > 300 ? "#ef4444" : "#94a3b8" }}>
                {shop.address.length} / 300
              </span>
            </div>
            <textarea
              data-testid="shop-address-input"
              rows="3"
              placeholder="Street, area, city, pincode"
              value={shop.address}
              onChange={(e) => handleChange("address", e.target.value)}
              onBlur={() => handleBlur("address")}
              style={{
                borderColor: touched.address && errors.address ? "#ef4444" : undefined
              }}
            />
            {touched.address && errors.address && (
              <span className="field-error-text" style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "0.3rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <AlertCircle size={13} /> {errors.address}
              </span>
            )}
          </label>
        </div>

        {/* Invoice Numbering Configuration */}
        <div className="form-section-card">
          <h3 className="section-title-sm"><Hash size={16} /> Invoice Numbering</h3>
          <p className="subtle" style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
            Customize your sequence pattern and starting counter for clean bookkeeping.
          </p>

          <div className="form-row">
            <label className="flex-1 form-group-label">
              INVOICE PREFIX
              <input
                type="text"
                maxLength="8"
                placeholder="e.g. SLP, INV, BILL"
                value={shop.invoice_prefix}
                onChange={(e) => handleChange("invoice_prefix", e.target.value.toUpperCase())}
                onBlur={() => handleBlur("invoice_prefix")}
                style={{
                  borderColor: touched.invoice_prefix && errors.invoice_prefix ? "#ef4444" : undefined
                }}
              />
              {touched.invoice_prefix && errors.invoice_prefix && (
                <span className="field-error-text" style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "0.3rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <AlertCircle size={13} /> {errors.invoice_prefix}
                </span>
              )}
            </label>

            <label className="flex-1 form-group-label">
              NEXT SEQUENCE NUMBER *
              <input
                type="number"
                min="1"
                placeholder="1001"
                value={shop.invoice_sequence}
                onChange={(e) => handleChange("invoice_sequence", e.target.value)}
                onBlur={() => handleBlur("invoice_sequence")}
                style={{
                  borderColor: touched.invoice_sequence && errors.invoice_sequence ? "#ef4444" : undefined
                }}
              />
              {touched.invoice_sequence && errors.invoice_sequence && (
                <span className="field-error-text" style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "0.3rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <AlertCircle size={13} /> {errors.invoice_sequence}
                </span>
              )}
            </label>
          </div>

          <label className="form-group-label">
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

      <style>{`
        @media (max-width: 640px) {
          .shop-page .primary-button {
            width: 100% !important;
            justify-content: center !important;
          }

          .shop-page .form-section-card {
            padding: 1.25rem !important;
          }
        }
      `}</style>
    </div>
  )
}