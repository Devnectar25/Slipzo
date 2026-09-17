import { useEffect, useState, useRef, useMemo } from "react"
import {
  ArrowRight,
  Store,
  Hash,
  Check,
  Save,
  AlertCircle,
  Printer,
  Zap,
  FileText,
  Phone,
  MapPin,
  Sparkles,
  Percent,
  Copy,
  CheckCircle2,
  SlidersHorizontal,
  Eye,
  BadgeCheck,
  Receipt
} from "lucide-react"
import { call, getCachedData, getActivePlanDetails, findTemplateMatch } from "../lib/utils"
import { ButtonLoader, Skeleton } from "./common/Skeleton"
import { useToast } from "./common/Toast"
import { BUILTIN_TEMPLATES } from "./Templates"

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
  if (format === "PREFIX-YEAR-SEQ") return `${cleanPrefix}-${shortYear}-${seqStr}`
  if (format === "SEQ") return seqStr
  return `${cleanPrefix}-${dateStr}-${seqStr}`
}

export function Shop({ user, setView } = {}) {
  const userKey = user?.email || user?.id
  const [activePlan, setActivePlan] = useState(getActivePlanDetails(userKey))
  const [copiedInvoice, setCopiedInvoice] = useState(false)
  const [hasUnsaved, setHasUnsaved] = useState(false)

  useEffect(() => {
    const handleUpdate = () => {
      setActivePlan(getActivePlanDetails(user?.email || user?.id))
    }
    window.addEventListener("slipzo-quota-update", handleUpdate)
    window.addEventListener("storage", handleUpdate)
    return () => {
      window.removeEventListener("slipzo-quota-update", handleUpdate)
      window.removeEventListener("storage", handleUpdate)
    }
  }, [user])

  const [templates, setTemplates] = useState(() => BUILTIN_TEMPLATES)
  const [shop, setShop] = useState(() => {
    const data = getCachedData("/shop")
    return {
      name: data?.name || "",
      address: data?.address || "",
      phone: data?.phone || "",
      invoice_prefix: data?.invoice_prefix || "SLP",
      invoice_sequence: data?.invoice_sequence || 1001,
      invoice_format: data?.invoice_format || "PREFIX-DATE-SEQ",
      default_template_id: data?.default_template_id || "",
      default_discount: data?.default_discount !== undefined && data?.default_discount !== null ? String(data.default_discount) : "0",
      show_tax: data?.show_tax !== undefined && data?.show_tax !== null ? Number(data.show_tax) : 2,
      tax_rate: data?.tax_rate !== undefined && data?.tax_rate !== null ? String(data.tax_rate) : "18"
    }
  })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [ready, setReady] = useState(() => Boolean(getCachedData("/shop")))
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
        const [data, templatesData] = await Promise.all([
          call("/shop").catch(() => null),
          call("/templates").catch(() => [])
        ])

        const dbTemplates = Array.isArray(templatesData) ? templatesData : []
        const dbNames = new Set(dbTemplates.map((t) => (t.name || "").toLowerCase()))
        const extraBuiltins = BUILTIN_TEMPLATES.filter((b) => !dbNames.has((b.name || "").toLowerCase()))
        const tplList = dbTemplates.length > 0 || extraBuiltins.length > 0 ? [...dbTemplates, ...extraBuiltins] : BUILTIN_TEMPLATES

        setTemplates(tplList)

        if (!edited.current && data) {
          const matchedDefault = findTemplateMatch(tplList, data.default_template_id)
          const resolvedDefaultTplId = matchedDefault ? matchedDefault.id : (data.default_template_id || tplList[0]?.id || "")

          const loadedShop = {
            name: data.name || "",
            address: data.address || "",
            phone: data.phone || "",
            invoice_prefix: data.invoice_prefix || "SLP",
            invoice_sequence: data.invoice_sequence || 1001,
            invoice_format: data.invoice_format || "PREFIX-DATE-SEQ",
            default_template_id: resolvedDefaultTplId,
            default_discount: data.default_discount !== undefined && data.default_discount !== null ? String(data.default_discount) : "0",
            show_tax: data.show_tax !== undefined && data.show_tax !== null ? Number(data.show_tax) : 1,
            tax_rate: data.tax_rate !== undefined && data.tax_rate !== null ? String(data.tax_rate) : "18"
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
    setHasUnsaved(true)
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
        if (shop.name && shop.phone && shop.phone.trim() && shop.address && shop.address.trim()) {
          localStorage.setItem(`slipzo_shop_setup_${user.id}`, "true")
        } else {
          localStorage.removeItem(`slipzo_shop_setup_${user.id}`)
        }
      }

      setSaved(true)
      setHasUnsaved(false)
      success("Shop profile and invoice settings saved!")
      setTimeout(() => setSaved(false), 3500)
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

  const copyInvoiceFormat = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(liveInvoicePreview)
      setCopiedInvoice(true)
      setTimeout(() => setCopiedInvoice(false), 2000)
    }
  }

  // Quota percentage calculation
  const quotaPct = useMemo(() => {
    const total = activePlan.totalPrints || 10
    const remaining = activePlan.printsRemaining !== undefined ? activePlan.printsRemaining : 10
    return Math.max(0, Math.min(100, Math.round((remaining / total) * 100)))
  }, [activePlan])

  // Mock receipt calculation
  const receiptMath = useMemo(() => {
    const subtotal = 595.0
    const disc = Math.max(0, parseFloat(shop.default_discount) || 0)
    const base = Math.max(0, subtotal - disc)
    const rate = Math.max(0, parseFloat(shop.tax_rate) || 0)
    let tax = 0
    let total = base

    if (Number(shop.show_tax) === 1 && rate > 0) {
      tax = (base * rate) / (100 + rate)
      total = base
    } else if (Number(shop.show_tax) === 2 && rate > 0) {
      tax = (base * rate) / 100
      total = base + tax
    }

    return { subtotal, disc, tax, total }
  }, [shop.default_discount, shop.tax_rate, shop.show_tax])

  if (!ready) {
    return (
      <div className="page shop-page fade-in">
        <div className="page-intro">
          <div>
            <p className="eyebrow accent">YOUR BUSINESS</p>
            <h2>Shop profile & invoice settings.</h2>
          </div>
        </div>
        <div className="profile-form">
          <Skeleton width="100%" height="90px" borderRadius="16px" />
          <Skeleton width="100%" height="260px" borderRadius="16px" />
          <Skeleton width="100%" height="240px" borderRadius="16px" />
        </div>
      </div>
    )
  }

  return (
    <div className="page shop-page fade-in">
      {/* Store Brand Showcase Hero Header */}
      <div className="shop-hero-banner">
        <div className="shop-hero-brand">
          <div className="shop-brand-avatar">
            {shop.name ? shop.name.trim().charAt(0).toUpperCase() : <Store size={26} />}
            <span className="shop-avatar-ring" />
          </div>
          <div className="shop-brand-info">
            <div className="shop-pill-tag">
              <Sparkles size={12} />
              <span>STORE IDENTITY & POS SETTINGS</span>
            </div>
            <h1 className="shop-display-name">
              {shop.name || "Your Store"}
              <span className="verified-badge" title="Thermal Receipt Ready">
                <BadgeCheck size={18} /> Verified Store
              </span>
            </h1>
            <p className="shop-display-sub">
              These details and sequence patterns appear on every thermal receipt and invoice you generate.
            </p>
          </div>
        </div>

        <div className="shop-quick-pills">
          <span className="feature-pill">🖨️ 58mm / 80mm Ready</span>
          <span className="feature-pill">🔢 Auto Sequencing</span>
          <span className="feature-pill">⚡ Instant HMR Sync</span>
        </div>
      </div>

      {/* Active Plan & Print Quota Summary Card */}
      <div className="shop-plan-summary-card">
        <div className="plan-summary-left">
          <div className={`plan-avatar-icon ${activePlan.isFreeTier ? "free" : "pro"}`}>
            <Printer size={24} />
          </div>
          <div className="plan-meta-wrap">
            <div className="plan-badge-row">
              <span className={`plan-name-badge ${activePlan.isFreeTier ? "free" : "pro"}`}>
                {activePlan.name || "Free Starter Tier"}
              </span>
              <span className="plan-status-indicator">
                <span className="status-live-dot" /> Active Plan
              </span>
            </div>
            <h3 className="plan-prints-count">
              {activePlan.printsRemaining?.toLocaleString()}{" "}
              <span className="prints-denom">/ {(activePlan.totalPrints || 10).toLocaleString()} prints available</span>
            </h3>
            {/* Visual Quota Progress Bar */}
            <div className="quota-bar-track">
              <div className="quota-bar-fill" style={{ width: `${quotaPct}%` }} />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setView?.("pricing")}
          className="plan-action-btn"
        >
          <Zap size={15} className="zap-accent" /> Manage Plan & Top Up
        </button>
      </div>

      <form className="profile-form" onSubmit={saveShop} noValidate>
        {/* Section 1: Business Details */}
        <div className="form-section-card">
          <div className="section-title-wrap">
            <div className="section-icon-pill blue">
              <Store size={18} />
            </div>
            <div>
              <h3 className="section-title-sm">Business Details</h3>
              <p className="section-desc-sm">Store branding and contact information printed on receipt headers</p>
            </div>
          </div>

          <div className="form-row">
            <label className="flex-1 form-group-label">
              <span className="label-text">
                SHOP NAME <span className="req">*</span>
              </span>
              <div className="input-with-icon">
                <Store size={16} className="field-adornment-icon" />
                <input
                  data-testid="shop-name-input"
                  required
                  placeholder="e.g. Mahajan General Store & Cafe"
                  value={shop.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  onBlur={() => handleBlur("name")}
                  style={{
                    borderColor: touched.name && errors.name ? "#ef4444" : undefined
                  }}
                />
              </div>
              {touched.name && errors.name && (
                <span className="field-error-text">
                  <AlertCircle size={13} /> {errors.name}
                </span>
              )}
            </label>

            <label className="flex-1 form-group-label">
              <span className="label-text">CONTACT PHONE NUMBER</span>
              <div className="input-with-icon">
                <Phone size={16} className="field-adornment-icon" />
                <input
                  data-testid="shop-phone-input"
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={shop.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  onBlur={() => handleBlur("phone")}
                  style={{
                    borderColor: touched.phone && errors.phone ? "#ef4444" : undefined
                  }}
                />
              </div>
              {touched.phone && errors.phone ? (
                <span className="field-error-text">
                  <AlertCircle size={13} /> {errors.phone}
                </span>
              ) : (
                <small className="field-helper-note">7–15 digits for contact header on receipt</small>
              )}
            </label>
          </div>

          <label className="form-group-label">
            <div className="label-row-split">
              <span className="label-text">STORE ADDRESS</span>
              <span className={`char-counter-tag ${shop.address.length > 300 ? "exceeded" : ""}`}>
                {shop.address.length} / 300
              </span>
            </div>
            <div className="textarea-with-icon">
              <MapPin size={16} className="textarea-adornment-icon" />
              <textarea
                data-testid="shop-address-input"
                rows="3"
                placeholder="Street, area, landmark, city, pincode"
                value={shop.address}
                onChange={(e) => handleChange("address", e.target.value)}
                onBlur={() => handleBlur("address")}
                style={{
                  borderColor: touched.address && errors.address ? "#ef4444" : undefined
                }}
              />
            </div>
            {touched.address && errors.address && (
              <span className="field-error-text">
                <AlertCircle size={13} /> {errors.address}
              </span>
            )}
            <small className="field-helper-note">Keeping address to 2 lines prevents long paper roll feeds</small>
          </label>
        </div>

        {/* Section 2: Receipt Defaults & Billing Configuration */}
        <div className="form-section-card">
          <div className="section-title-wrap">
            <div className="section-icon-pill emerald">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="section-title-sm">Receipt Defaults & Billing</h3>
              <p className="section-desc-sm">Default layout, automatic discount, and tax calculations applied to new bills</p>
            </div>
          </div>

          <div className="form-row">
            <label className="flex-1 form-group-label">
              <span className="label-text">RECEIPT TEMPLATE</span>
              <div className="select-with-icon">
                <Receipt size={16} className="field-adornment-icon" />
                <select
                  value={shop.default_template_id}
                  onChange={(e) => handleChange("default_template_id", e.target.value)}
                  className="option-select styled-select"
                >
                  {Array.isArray(templates) && templates.length > 0 ? (
                    templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.width || "58mm"})
                      </option>
                    ))
                  ) : (
                    BUILTIN_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.width || "58mm"})
                      </option>
                    ))
                  )}
                </select>
              </div>
              <small className="field-helper-note">Layout loaded by default when creating bills</small>
            </label>

            <label className="flex-1 form-group-label">
              <span className="label-text">DEFAULT DISCOUNT (₹)</span>
              <div className="input-with-icon">
                <span className="currency-symbol-adornment">₹</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0"
                  value={shop.default_discount === 0 || shop.default_discount === "0" ? "" : shop.default_discount}
                  onChange={(e) => handleChange("default_discount", e.target.value)}
                  className="item-input"
                />
              </div>
              <small className="field-helper-note">Auto-deducted when creating new bills</small>
            </label>
          </div>

          <div className="form-row" style={{ marginTop: "1rem" }}>
            <label className="flex-1 form-group-label">
              <span className="label-text">TAX INCLUSION MODE</span>
              <div className="select-with-icon">
                <Percent size={16} className="field-adornment-icon" />
                <select
                  value={shop.show_tax}
                  onChange={(e) => handleChange("show_tax", Number(e.target.value))}
                  className="option-select styled-select"
                >
                  <option value={0}>No Tax (0% / Tax Disabled)</option>
                  <option value={1}>Tax Included (Prices contain tax)</option>
                  <option value={2}>Tax Extra (Added on top of bill)</option>
                </select>
              </div>

              {/* Quick interactive mode pill buttons for fast toggling */}
              <div className="quick-tax-mode-row">
                <button
                  type="button"
                  className={`tax-chip ${Number(shop.show_tax) === 0 ? "active" : ""}`}
                  onClick={() => handleChange("show_tax", 0)}
                >
                  No Tax
                </button>
                <button
                  type="button"
                  className={`tax-chip ${Number(shop.show_tax) === 1 ? "active" : ""}`}
                  onClick={() => handleChange("show_tax", 1)}
                >
                  Tax Included
                </button>
                <button
                  type="button"
                  className={`tax-chip ${Number(shop.show_tax) === 2 ? "active" : ""}`}
                  onClick={() => handleChange("show_tax", 2)}
                >
                  Tax Extra
                </button>
              </div>
            </label>

            <label className="flex-1 form-group-label">
              <span className="label-text">DEFAULT TAX RATE (%)</span>
              <div className="input-with-icon">
                <Percent size={16} className="field-adornment-icon" />
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  placeholder="0"
                  disabled={Number(shop.show_tax) === 0}
                  value={Number(shop.show_tax) === 0 ? "0" : (shop.tax_rate === undefined || shop.tax_rate === null ? "0" : String(shop.tax_rate))}
                  onChange={(e) => handleChange("tax_rate", e.target.value)}
                  className="item-input"
                  style={{ opacity: Number(shop.show_tax) === 0 ? 0.6 : 1 }}
                />
              </div>

              {/* GST Rate Quick Tap Presets */}
              {Number(shop.show_tax) !== 0 && (
                <div className="quick-presets-row">
                  <span className="presets-caption">GST Presets:</span>
                  {["5", "12", "18", "28"].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      className={`preset-pill ${String(shop.tax_rate) === rate ? "selected" : ""}`}
                      onClick={() => handleChange("tax_rate", rate)}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Section 3: Invoice Numbering Configuration & Realistic Thermal Preview */}
        <div className="form-section-card">
          <div className="section-title-wrap">
            <div className="section-icon-pill purple">
              <Hash size={18} />
            </div>
            <div>
              <h3 className="section-title-sm">Invoice Numbering</h3>
              <p className="section-desc-sm">Customize sequential receipt counters and format patterns for clean accounting</p>
            </div>
          </div>

          <div className="form-row">
            <label className="flex-1 form-group-label">
              <span className="label-text">INVOICE PREFIX</span>
              <div className="input-with-icon">
                <Hash size={16} className="field-adornment-icon" />
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
              </div>
              {touched.invoice_prefix && errors.invoice_prefix && (
                <span className="field-error-text">
                  <AlertCircle size={13} /> {errors.invoice_prefix}
                </span>
              )}
              <small className="field-helper-note">1–8 uppercase letters or numbers</small>
            </label>

            <label className="flex-1 form-group-label">
              <span className="label-text">
                NEXT SEQUENCE NUMBER <span className="req">*</span>
              </span>
              <div className="input-with-icon">
                <span className="hash-adornment">#</span>
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
              </div>
              {touched.invoice_sequence && errors.invoice_sequence && (
                <span className="field-error-text">
                  <AlertCircle size={13} /> {errors.invoice_sequence}
                </span>
              )}
              <small className="field-helper-note">Auto-increments with each printed receipt</small>
            </label>
          </div>

          <label className="form-group-label">
            <span className="label-text">NUMBER FORMAT PATTERN</span>
            <div className="select-with-icon">
              <SlidersHorizontal size={16} className="field-adornment-icon" />
              <select
                value={shop.invoice_format}
                onChange={(e) => handleChange("invoice_format", e.target.value)}
                className="option-select styled-select"
              >
                <option value="PREFIX-DATE-SEQ">PREFIX-YYYYMMDD-SEQ (e.g. SLP-20260909-1001)</option>
                <option value="PREFIX-SHORTDATE-SEQ">PREFIX-YYMMDD-SEQ (e.g. SLP-260909-1001)</option>
                <option value="PREFIX-SEQ">PREFIX-SEQ (e.g. SLP-1001)</option>
                <option value="SEQ">SEQ ONLY (e.g. 1001)</option>
              </select>
            </div>
          </label>

          {/* Live Preview Box with Copy Button */}
          <div className="invoice-format-preview-box">
            <div className="preview-box-left">
              <span className="preview-label">Next Bill Format Preview:</span>
              <strong className="preview-code">{liveInvoicePreview}</strong>
            </div>
            <button
              type="button"
              onClick={copyInvoiceFormat}
              className="copy-format-btn"
              title="Copy next invoice pattern"
            >
              {copiedInvoice ? (
                <>
                  <Check size={14} className="text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Authentic Embedded Thermal Paper Roll Preview */}
          <div className="embedded-receipt-card">
            <div className="embedded-receipt-header">
              <div className="receipt-status-pill">
                <span className="live-dot" /> LIVE THERMAL PREVIEW
              </div>
              <span className="receipt-paper-pill">58mm Thermal</span>
            </div>

            <div className="thermal-roll-paper font-mono">
              <div className="tear-edge top" />

              <div className="roll-content">
                <h4 className="thermal-shop-name">{(shop.name || "YOUR SHOP NAME").toUpperCase()}</h4>
                <p className="thermal-address">{shop.address || "123 Market Street, City"}</p>
                {shop.phone && <p className="thermal-phone">Tel: {shop.phone}</p>}

                <div className="thermal-dash" />

                <div className="thermal-meta-line">
                  <span>BILL: {liveInvoicePreview}</span>
                  <span>{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                </div>

                <div className="thermal-dash" />

                <div className="thermal-items-header">
                  <span>ITEM</span>
                  <span className="text-center">QTY</span>
                  <span className="text-right">AMT</span>
                </div>

                <div className="thermal-items-list">
                  <div className="thermal-row">
                    <span>Basmati Rice 1kg</span>
                    <span className="text-center">2</span>
                    <span className="text-right">₹240.00</span>
                  </div>
                  <div className="thermal-row">
                    <span>Assam Tea 250g</span>
                    <span className="text-center">1</span>
                    <span className="text-right">₹160.00</span>
                  </div>
                  <div className="thermal-row">
                    <span>Sunflower Oil 1L</span>
                    <span className="text-center">1</span>
                    <span className="text-right">₹195.00</span>
                  </div>
                </div>

                <div className="thermal-dash" />

                <div className="thermal-math">
                  <div className="math-row">
                    <span>Subtotal:</span>
                    <span>₹{receiptMath.subtotal.toFixed(2)}</span>
                  </div>
                  {receiptMath.disc > 0 && (
                    <div className="math-row discount">
                      <span>Discount (Offer):</span>
                      <span>-₹{receiptMath.disc.toFixed(2)}</span>
                    </div>
                  )}
                  {Number(shop.show_tax) === 1 && receiptMath.tax > 0 && (
                    <div className="math-row tax">
                      <span>Incl. GST ({shop.tax_rate}%):</span>
                      <span>₹{receiptMath.tax.toFixed(2)}</span>
                    </div>
                  )}
                  {Number(shop.show_tax) === 2 && receiptMath.tax > 0 && (
                    <div className="math-row tax">
                      <span>GST Extra ({shop.tax_rate}%):</span>
                      <span>+₹{receiptMath.tax.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="thermal-net-box">
                    <span>NET TOTAL</span>
                    <span>₹{receiptMath.total.toFixed(2)}</span>
                  </div>
                  <div className="math-row payment">
                    <span>PAID VIA:</span>
                    <span className="pay-badge">CASH / UPI</span>
                  </div>
                </div>

                <div className="thermal-dash" />

                <div className="thermal-footer">
                  <p className="footer-ty">Thank you for shopping with us!</p>
                  <div className="barcode-box">
                    <div className="barcode-stripes" />
                    <span className="barcode-text">*{liveInvoicePreview}*</span>
                  </div>
                  <small className="slipzo-brand">Slipzo Thermal POS</small>
                </div>
              </div>

              <div className="tear-edge bottom" />
            </div>
          </div>
        </div>

        {/* Save CTA & Success Feedback */}
        <div className="shop-form-actions">
          <button
            data-testid="save-shop-button"
            className="primary-button shop-save-btn"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <ButtonLoader text="Saving Settings..." />
            ) : (
              <>
                <Save size={16} />
                <span>Save Settings</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>

          {hasUnsaved && !saved && (
            <span className="unsaved-hint-tag">
              <span className="unsaved-pulse-dot" /> You have unsaved changes
            </span>
          )}

          {saved && (
            <div data-testid="shop-saved-message" className="success-message slide-up shop-success-alert">
              <Check size={16} /> Shop profile & invoice settings saved!
            </div>
          )}
        </div>
      </form>

      <style>{`
        /* ============================================================
           SLIPZO ULTRA-PREMIUM SHOP PROFILE REDESIGN STYLES
           ============================================================ */
        .shop-page {
          max-width: 920px;
          margin: 0 auto;
          padding-bottom: 4rem;
        }

        /* Remove double card styling from outer profile-form */
        .shop-page .profile-form {
          max-width: 100% !important;
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          box-shadow: none !important;
        }

        /* Hero Store Brand Showcase Banner */
        .shop-hero-banner {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 1.6rem 2rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.03);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1.25rem;
          position: relative;
          overflow: hidden;
        }

        .shop-hero-banner::before {
          content: "";
          position: absolute;
          top: 0;
          right: 0;
          width: 320px;
          height: 100%;
          background: radial-gradient(circle at top right, rgba(14, 165, 233, 0.08), transparent 70%);
          pointer-events: none;
        }

        .shop-hero-brand {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .shop-brand-avatar {
          width: 58px;
          height: 58px;
          border-radius: 16px;
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
          color: #ffffff;
          font-size: 1.6rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 18px rgba(2, 132, 199, 0.28);
          position: relative;
          flex-shrink: 0;
        }

        .shop-avatar-ring {
          position: absolute;
          inset: -3px;
          border-radius: 19px;
          border: 2px solid rgba(2, 132, 199, 0.25);
          pointer-events: none;
        }

        .shop-brand-info {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .shop-pill-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          color: #0284c7;
          background: #e0f2fe;
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
          width: fit-content;
        }

        .shop-display-name {
          font-size: 1.6rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          letter-spacing: -0.02em;
        }

        .verified-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.72rem;
          font-weight: 700;
          color: #059669;
          background: #dcfce7;
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
          letter-spacing: normal;
        }

        .shop-display-sub {
          font-size: 0.85rem;
          color: #64748b;
          margin: 0;
          max-width: 580px;
          line-height: 1.45;
        }

        .shop-quick-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .feature-pill {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #475569;
          padding: 0.35rem 0.75rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }

        /* Active Plan Card */
        .shop-plan-summary-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 1.35rem 1.75rem;
          margin-bottom: 1.75rem;
          box-shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.03);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1.25rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .shop-plan-summary-card:hover {
          box-shadow: 0 6px 20px -2px rgba(0, 0, 0, 0.05);
        }

        .plan-summary-left {
          display: flex;
          align-items: center;
          gap: 1.15rem;
          flex: 1;
          min-width: 280px;
        }

        .plan-avatar-icon {
          width: 50px;
          height: 50px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .plan-avatar-icon.free {
          background: #fef3c7;
          color: #d97706;
          box-shadow: 0 4px 12px rgba(217, 119, 6, 0.15);
        }

        .plan-avatar-icon.pro {
          background: #e0f2fe;
          color: #0284c7;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.15);
        }

        .plan-meta-wrap {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .plan-badge-row {
          display: flex;
          align-items: center;
          gap: 0.55rem;
        }

        .plan-name-badge {
          font-size: 0.72rem;
          font-weight: 800;
          padding: 0.18rem 0.6rem;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .plan-name-badge.free {
          background: #fef3c7;
          color: #b45309;
        }

        .plan-name-badge.pro {
          background: #dcfce7;
          color: #15803d;
        }

        .plan-status-indicator {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.78rem;
          color: #64748b;
          font-weight: 600;
        }

        .status-live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10b981;
          display: inline-block;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
        }

        .plan-prints-count {
          font-size: 1.18rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .prints-denom {
          font-size: 0.88rem;
          font-weight: 600;
          color: #64748b;
        }

        .quota-bar-track {
          width: 100%;
          max-width: 320px;
          height: 6px;
          background: #f1f5f9;
          border-radius: 999px;
          overflow: hidden;
          margin-top: 0.2rem;
        }

        .quota-bar-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #0284c7, #38bdf8);
          transition: width 0.4s ease;
        }

        .plan-action-btn {
          background: #0f172a;
          color: #ffffff;
          border: none;
          padding: 0.65rem 1.25rem;
          border-radius: 11px;
          font-size: 0.84rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 3px 10px rgba(15, 23, 42, 0.12);
        }

        .plan-action-btn:hover {
          background: #1e293b;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.2);
        }

        .zap-accent {
          color: #38bdf8;
        }

        /* Section Cards */
        .shop-page .form-section-card {
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 20px !important;
          padding: 1.85rem 2.25rem !important;
          margin-bottom: 1.75rem !important;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.02), 0 8px 24px -4px rgba(0, 0, 0, 0.03) !important;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .shop-page .form-section-card:hover {
          border-color: #cbd5e1 !important;
        }

        .section-title-wrap {
          display: flex;
          align-items: center;
          gap: 0.95rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .section-icon-pill {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .section-icon-pill.blue {
          background: #e0f2fe;
          color: #0284c7;
        }

        .section-icon-pill.emerald {
          background: #dcfce7;
          color: #059669;
        }

        .section-icon-pill.purple {
          background: #f3e8ff;
          color: #9333ea;
        }

        .section-title-sm {
          font-size: 1.12rem !important;
          font-weight: 800 !important;
          color: #0f172a !important;
          margin: 0 !important;
          letter-spacing: -0.01em;
        }

        .section-desc-sm {
          font-size: 0.82rem;
          color: #64748b;
          margin: 0.15rem 0 0 0;
          font-weight: 400;
        }

        /* 2-Column Row */
        .shop-page .form-row {
          display: grid !important;
          grid-template-columns: 1fr 1fr;
          gap: 1.35rem;
          margin-bottom: 0.35rem;
        }

        /* Labels & Inputs with Leading Icons */
        .shop-page .form-group-label {
          display: flex !important;
          flex-direction: column !important;
          margin-bottom: 1.25rem !important;
        }

        .label-text {
          font-size: 0.72rem !important;
          font-weight: 700 !important;
          color: #475569 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          margin-bottom: 0.35rem;
        }

        .label-row-split {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.35rem;
        }

        .label-text .req {
          color: #ef4444;
          font-weight: 800;
          margin-left: 2px;
        }

        .char-counter-tag {
          font-size: 0.72rem;
          font-weight: 600;
          color: #94a3b8;
        }

        .char-counter-tag.exceeded {
          color: #ef4444;
        }

        .input-with-icon,
        .select-with-icon {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .textarea-with-icon {
          position: relative;
          display: flex;
          width: 100%;
        }

        .field-adornment-icon {
          position: absolute;
          left: 1rem;
          color: #94a3b8;
          pointer-events: none;
          z-index: 1;
        }

        .textarea-adornment-icon {
          position: absolute;
          left: 1rem;
          top: 0.95rem;
          color: #94a3b8;
          pointer-events: none;
          z-index: 1;
        }

        .currency-symbol-adornment,
        .hash-adornment {
          position: absolute;
          left: 1rem;
          color: #64748b;
          font-weight: 800;
          font-size: 0.95rem;
          pointer-events: none;
          z-index: 1;
        }

        .shop-page input,
        .shop-page select,
        .shop-page textarea {
          width: 100% !important;
          font-size: 0.92rem !important;
          font-weight: 500 !important;
          color: #0f172a !important;
          background: #f8fafc !important;
          border: 1.5px solid #e2e8f0 !important;
          border-radius: 11px !important;
          padding: 0 1rem 0 2.65rem !important;
          outline: none !important;
          font-family: inherit !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
          box-sizing: border-box !important;
        }

        .shop-page input {
          height: 46px !important;
        }

        .shop-page select {
          height: 46px !important;
          cursor: pointer !important;
        }

        .shop-page textarea {
          padding: 0.75rem 1rem 0.75rem 2.65rem !important;
          resize: vertical !important;
          min-height: 85px !important;
          line-height: 1.5 !important;
        }

        .shop-page input:focus,
        .shop-page select:focus,
        .shop-page textarea:focus {
          border-color: #0284c7 !important;
          background: #ffffff !important;
          box-shadow: 0 0 0 3.5px rgba(2, 132, 199, 0.12) !important;
        }

        .field-helper-note {
          font-size: 0.73rem !important;
          color: #94a3b8 !important;
          margin-top: 0.35rem !important;
          display: block !important;
          text-transform: none !important;
          letter-spacing: normal !important;
          font-weight: 500 !important;
        }

        .field-error-text {
          color: #ef4444 !important;
          font-size: 0.76rem !important;
          margin-top: 0.35rem !important;
          display: flex !important;
          align-items: center !important;
          gap: 0.35rem !important;
          font-weight: 600 !important;
          text-transform: none !important;
          letter-spacing: normal !important;
        }

        /* Interactive Tax Chips */
        .quick-tax-mode-row {
          display: flex;
          gap: 0.45rem;
          margin-top: 0.5rem;
        }

        .tax-chip {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #475569;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.3rem 0.65rem;
          border-radius: 7px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .tax-chip:hover {
          background: #e2e8f0;
        }

        .tax-chip.active {
          background: #0284c7;
          border-color: #0284c7;
          color: #ffffff;
        }

        /* Preset Tax Rate Pills */
        .quick-presets-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          margin-top: 0.5rem;
        }

        .presets-caption {
          font-size: 0.7rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
        }

        .preset-pill {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #334155;
          padding: 0.25rem 0.6rem;
          border-radius: 7px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }

        .preset-pill:hover {
          border-color: #0284c7;
          color: #0284c7;
        }

        .preset-pill.selected {
          background: #0284c7;
          border-color: #0284c7;
          color: #ffffff;
        }

        /* Live Preview Box Callout */
        .shop-page .invoice-format-preview-box {
          background: #0f172a !important;
          border: 1px solid #1e293b !important;
          border-radius: 14px !important;
          padding: 1rem 1.4rem !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          flex-wrap: wrap !important;
          gap: 0.85rem !important;
          margin-top: 0.95rem !important;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.1) !important;
        }

        .preview-box-left {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          flex-wrap: wrap;
        }

        .shop-page .preview-label {
          font-size: 0.84rem !important;
          color: #94a3b8 !important;
          font-weight: 600 !important;
        }

        .shop-page .preview-code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
          color: #38bdf8 !important;
          background: rgba(56, 189, 248, 0.12) !important;
          padding: 0.35rem 0.85rem !important;
          border-radius: 7px !important;
          border: 1px solid rgba(56, 189, 248, 0.3) !important;
          font-size: 0.98rem !important;
          font-weight: 800 !important;
          letter-spacing: 0.05em !important;
        }

        .copy-format-btn {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          padding: 0.4rem 0.85rem;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          transition: all 0.15s;
        }

        .copy-format-btn:hover {
          background: rgba(255, 255, 255, 0.16);
        }

        /* Embedded Realistic Thermal Receipt Roll */
        .embedded-receipt-card {
          margin-top: 1.5rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 1.35rem;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .embedded-receipt-header {
          width: 100%;
          max-width: 380px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.85rem;
        }

        .receipt-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.68rem;
          font-weight: 800;
          color: #059669;
          background: #dcfce7;
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
          letter-spacing: 0.04em;
        }

        .live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
        }

        .receipt-paper-pill {
          font-size: 0.72rem;
          font-weight: 700;
          color: #64748b;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          padding: 0.18rem 0.55rem;
          border-radius: 6px;
        }

        .thermal-roll-paper {
          width: 100%;
          max-width: 380px;
          background: #ffffff;
          border-left: 1px solid #e2e8f0;
          border-right: 1px solid #e2e8f0;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.06);
          position: relative;
        }

        .tear-edge {
          height: 10px;
          background: radial-gradient(circle, transparent, transparent 50%, #ffffff 50%, #ffffff 100%);
          background-size: 12px 12px;
        }

        .tear-edge.top {
          background-position: 0 -6px;
        }

        .tear-edge.bottom {
          background-position: 0 6px;
        }

        .roll-content {
          padding: 1.25rem 1.4rem;
          font-size: 0.78rem;
          color: #1e293b;
          line-height: 1.35;
        }

        .thermal-shop-name {
          text-align: center;
          font-size: 1.15rem;
          font-weight: 900;
          margin: 0 0 0.25rem 0;
          letter-spacing: 0.04em;
          color: #0f172a;
        }

        .thermal-address,
        .thermal-phone {
          text-align: center;
          font-size: 0.74rem;
          color: #475569;
          margin: 0 0 0.15rem 0;
        }

        .thermal-dash {
          border-top: 1.5px dashed #64748b;
          margin: 0.65rem 0;
          opacity: 0.7;
        }

        .thermal-meta-line {
          display: flex;
          justify-content: space-between;
          font-size: 0.72rem;
          font-weight: 700;
          color: #1e293b;
        }

        .thermal-items-header {
          display: grid;
          grid-template-columns: 2fr 1fr 1.2fr;
          font-weight: 800;
          font-size: 0.73rem;
          color: #0f172a;
          margin-bottom: 0.25rem;
        }

        .thermal-items-list {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .thermal-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1.2fr;
          font-size: 0.73rem;
        }

        .thermal-math {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .math-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.74rem;
          font-weight: 600;
        }

        .math-row.discount {
          color: #dc2626;
        }

        .math-row.tax {
          color: #0284c7;
        }

        .thermal-net-box {
          border-top: 1.5px solid #0f172a;
          border-bottom: 1.5px solid #0f172a;
          padding: 0.4rem 0;
          margin: 0.3rem 0;
          display: flex;
          justify-content: space-between;
          font-size: 0.95rem;
          font-weight: 900;
          color: #0f172a;
        }

        .math-row.payment {
          font-size: 0.7rem;
          font-weight: 700;
          color: #475569;
          align-items: center;
        }

        .pay-badge {
          background: #f1f5f9;
          padding: 1px 6px;
          border-radius: 4px;
        }

        .thermal-footer {
          text-align: center;
          margin-top: 0.5rem;
        }

        .footer-ty {
          font-size: 0.76rem;
          font-weight: 700;
          margin: 0;
        }

        .barcode-box {
          margin: 0.6rem auto 0.3rem auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.2rem;
        }

        .barcode-stripes {
          width: 140px;
          height: 24px;
          background: repeating-linear-gradient(
            90deg,
            #0f172a,
            #0f172a 2px,
            transparent 2px,
            transparent 4px,
            #0f172a 4px,
            #0f172a 7px,
            transparent 7px,
            transparent 9px,
            #0f172a 9px,
            #0f172a 12px
          );
        }

        .barcode-text {
          font-size: 0.65rem;
          letter-spacing: 0.08em;
          color: #64748b;
        }

        .slipzo-brand {
          font-size: 0.65rem;
          color: #94a3b8;
        }

        /* Save Button & Actions */
        .shop-form-actions {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          flex-wrap: wrap;
          margin-top: 0.85rem;
        }

        .shop-save-btn {
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%) !important;
          color: #ffffff !important;
          border: none !important;
          padding: 0.85rem 1.95rem !important;
          border-radius: 13px !important;
          font-size: 0.95rem !important;
          font-weight: 700 !important;
          cursor: pointer !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 0.6rem !important;
          box-shadow: 0 4px 16px rgba(2, 132, 199, 0.32) !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
          width: fit-content !important;
        }

        .shop-save-btn:hover:not(:disabled) {
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 24px rgba(2, 132, 199, 0.42) !important;
          filter: brightness(1.05) !important;
        }

        .shop-save-btn:disabled {
          opacity: 0.7 !important;
          cursor: not-allowed !important;
        }

        .unsaved-hint-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.82rem;
          font-weight: 700;
          color: #d97706;
          background: #fef3c7;
          padding: 0.35rem 0.85rem;
          border-radius: 999px;
        }

        .unsaved-pulse-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #d97706;
        }

        .shop-success-alert {
          background: #dcfce7 !important;
          border: 1px solid #86efac !important;
          color: #15803d !important;
          border-radius: 12px !important;
          padding: 0.75rem 1.25rem !important;
          font-size: 0.88rem !important;
          font-weight: 700 !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 0.5rem !important;
          box-shadow: 0 2px 8px rgba(21, 128, 61, 0.12) !important;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .shop-hero-banner {
            padding: 1.25rem;
          }

          .shop-display-name {
            font-size: 1.35rem;
            flex-wrap: wrap;
          }

          .shop-page .form-row {
            grid-template-columns: 1fr !important;
            gap: 0 !important;
          }

          .shop-page .form-section-card {
            padding: 1.35rem 1.25rem !important;
          }

          .shop-save-btn {
            width: 100% !important;
            justify-content: center !important;
          }

          .shop-plan-summary-card {
            padding: 1rem 1.25rem;
          }

          .plan-action-btn {
            width: 100%;
            justify-content: center;
          }

          .quick-tax-mode-row {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  )
}