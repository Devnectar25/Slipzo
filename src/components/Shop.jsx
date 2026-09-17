import { useEffect, useState, useRef, useMemo } from "react"
import { ArrowRight, Store, Hash, Check, Save, AlertCircle, Printer, Zap, ShieldCheck, FileText, Tag, Receipt, CheckCircle2 } from "lucide-react"
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
      default_template_id: data?.default_template_id || ""
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
        const dbNames = new Set(dbTemplates.map(t => (t.name || "").toLowerCase()))
        const extraBuiltins = BUILTIN_TEMPLATES.filter(b => !dbNames.has((b.name || "").toLowerCase()))
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
            default_template_id: resolvedDefaultTplId
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
        if (shop.name && shop.phone && shop.phone.trim() && shop.address && shop.address.trim()) {
          localStorage.setItem(`slipzo_shop_setup_${user.id}`, "true")
        } else {
          localStorage.removeItem(`slipzo_shop_setup_${user.id}`)
        }
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

  const selectedTemplate = useMemo(() => {
    return findTemplateMatch(templates, shop.default_template_id) || templates[0] || BUILTIN_TEMPLATES[0]
  }, [templates, shop.default_template_id])

  const renderThermalPreview = () => {
    const tId = String(selectedTemplate?.id || selectedTemplate?.templateId || "").toLowerCase()
    const shopName = shop.name.trim() || "YOUR SHOP NAME"
    const is80mm = selectedTemplate?.width === "80mm"
    const today = new Date().toLocaleDateString("en-GB")

    if (tId === "minimal" || tId === "2") {
      return (
        <div className="shop-thermal-preview-paper shop-paper-minimal" style={{ maxWidth: "245px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.35rem" }}>
            <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: selectedTemplate.gradient || "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)", color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 800 }}>
              {(shopName[0] || "S").toUpperCase()}
            </span>
          </div>
          <div className="shop-thermal-title" style={{ letterSpacing: "1px", fontSize: "0.88rem" }}>
            {shopName}
          </div>
          {shop.phone && <div className="shop-thermal-sub">Ph: {shop.phone}</div>}
          {shop.address && <div className="shop-thermal-sub" style={{ maxWidth: "210px", margin: "0 auto" }}>{shop.address}</div>}
          <div style={{ borderTop: "1px solid #e2e8f0", margin: "0.5rem 0" }} />
          <div className="shop-thermal-row" style={{ fontSize: "0.7rem", color: "#64748b" }}>
            <span>Bill: <b>{liveInvoicePreview}</b></span>
            <span>{today}</span>
          </div>
        </div>
      )
    }

    if (tId === "pro" || tId === "3" || (is80mm && tId.includes("pro"))) {
      return (
        <div className="shop-thermal-preview-paper shop-paper-pro" style={{ maxWidth: "320px", padding: "0" }}>
          <div style={{ background: selectedTemplate.gradient || "linear-gradient(135deg, #60a5fa 0%, #1d4ed8 100%)", padding: "0.65rem 0.85rem", color: "white", borderRadius: "5px 5px 0 0", textAlign: "center" }}>
            <div style={{ fontSize: "0.95rem", fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase" }}>
              {shopName}
            </div>
            <div style={{ fontSize: "0.68rem", opacity: 0.9, letterSpacing: "1px", marginTop: "2px" }}>
              RETAIL PRO · 80MM POS
            </div>
          </div>
          <div style={{ padding: "0.75rem 0.9rem" }}>
            {shop.phone && <div className="shop-thermal-sub" style={{ textAlign: "center" }}>Tel: {shop.phone}</div>}
            {shop.address && <div className="shop-thermal-sub" style={{ textAlign: "center", margin: "0 auto" }}>{shop.address}</div>}
            <div className="shop-thermal-divider" />
            <div className="shop-thermal-row">
              <span>Invoice #:</span>
              <strong>{liveInvoicePreview}</strong>
            </div>
            <div className="shop-thermal-row">
              <span>Date:</span>
              <span>{today}</span>
            </div>
            <div style={{ marginTop: "0.45rem", background: "#eff6ff", color: "#1d4ed8", padding: "0.2rem 0.4rem", borderRadius: "4px", fontSize: "0.68rem", fontWeight: 600, textAlign: "center" }}>
              ★ Loyalty Rewards & QR Code Enabled
            </div>
          </div>
        </div>
      )
    }

    if (tId === "eco" || tId === "4") {
      return (
        <div className="shop-thermal-preview-paper shop-paper-eco" style={{ maxWidth: "240px", fontFamily: "'Courier New', Courier, monospace" }}>
          <div style={{ borderBottom: "1px dashed #64748b", paddingBottom: "0.3rem", marginBottom: "0.4rem" }}>
            <div style={{ fontSize: "0.9rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {shopName}
            </div>
            <div style={{ fontSize: "0.68rem", color: "#0d9488", fontWeight: 700 }}>
              * ECO PAPER SAVER (58MM) *
            </div>
          </div>
          {shop.phone && <div className="shop-thermal-sub">TEL:{shop.phone}</div>}
          {shop.address && <div className="shop-thermal-sub" style={{ maxWidth: "210px", margin: "0 auto" }}>{shop.address}</div>}
          <div style={{ borderTop: "1px dotted #94a3b8", margin: "0.45rem 0" }} />
          <div className="shop-thermal-row" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
            <span>INV:</span>
            <strong>{liveInvoicePreview}</strong>
          </div>
          <div className="shop-thermal-row" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
            <span>DATE:</span>
            <span>{today}</span>
          </div>
        </div>
      )
    }

    if (tId === "modern" || tId === "5") {
      return (
        <div className="shop-thermal-preview-paper shop-paper-modern" style={{ maxWidth: "260px" }}>
          <div style={{ display: "inline-block", background: selectedTemplate.accentColor || "#0ea5e9", color: "white", padding: "0.15rem 0.55rem", borderRadius: "10px", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.5px", marginBottom: "0.35rem" }}>
            BOUTIQUE · STORE
          </div>
          <div className="shop-thermal-title" style={{ fontSize: "0.92rem", fontWeight: 800 }}>
            {shopName}
          </div>
          {shop.phone && <div className="shop-thermal-sub">Contact: {shop.phone}</div>}
          {shop.address && <div className="shop-thermal-sub" style={{ maxWidth: "220px", margin: "0 auto" }}>{shop.address}</div>}
          <div className="shop-thermal-divider" />
          <div className="shop-thermal-row">
            <span>Bill Ref:</span>
            <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "0.1rem 0.35rem", borderRadius: "4px", fontWeight: 700 }}>{liveInvoicePreview}</span>
          </div>
          <div className="shop-thermal-row">
            <span>Issue Date:</span>
            <span>{today}</span>
          </div>
        </div>
      )
    }

    if (tId === "elite" || tId === "6") {
      return (
        <div className="shop-thermal-preview-paper shop-paper-elite" style={{ maxWidth: "330px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #cbd5e1", paddingBottom: "0.3rem", marginBottom: "0.4rem" }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#0f172a", letterSpacing: "1px" }}>TAX INVOICE</span>
            <span style={{ fontSize: "0.65rem", color: "#64748b" }}>ORIGINAL FOR RECIPIENT</span>
          </div>
          <div className="shop-thermal-title" style={{ fontSize: "0.95rem" }}>
            {shopName}
          </div>
          {shop.phone && <div className="shop-thermal-sub">Phone: {shop.phone}</div>}
          {shop.address && <div className="shop-thermal-sub">{shop.address}</div>}
          <div style={{ borderTop: "3px double #0f172a", margin: "0.55rem 0" }} />
          <div className="shop-thermal-row">
            <span>Invoice No:</span>
            <strong>{liveInvoicePreview}</strong>
          </div>
          <div className="shop-thermal-row">
            <span>Date & Time:</span>
            <span>{today}</span>
          </div>
        </div>
      )
    }

    // Default / Classic style
    return (
      <div className="shop-thermal-preview-paper" style={{ maxWidth: is80mm ? "320px" : "255px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", marginBottom: "0.25rem" }}>
          <span style={{ width: "20px", height: "20px", borderRadius: "4px", background: selectedTemplate?.gradient || "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)", color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 800 }}>
            {(shopName[0] || "S").toUpperCase()}
          </span>
          <span className="shop-thermal-title" style={{ margin: 0 }}>
            {shopName}
          </span>
        </div>
        {shop.phone && <div className="shop-thermal-sub">Tel: {shop.phone}</div>}
        {shop.address && <div className="shop-thermal-sub" style={{ maxWidth: "230px", margin: "0 auto" }}>{shop.address}</div>}
        <div className="shop-thermal-divider" />
        <div className="shop-thermal-row">
          <span>Invoice #:</span>
          <strong>{liveInvoicePreview}</strong>
        </div>
        <div className="shop-thermal-row">
          <span>Date:</span>
          <span>{today}</span>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="page shop-page fade-in">
        <div className="page-intro">
          <div>
            <p className="eyebrow accent">YOUR BUSINESS</p>
            <h2>Shop Profile & Settings</h2>
            <p className="subtle">
              Manage your store details, invoice sequences, and receipt configuration.
            </p>
          </div>
        </div>
        <Skeleton width="100%" height="76px" borderRadius="16px" style={{ marginBottom: "1.5rem" }} />
        <div className="shop-profile-grid">
          <Skeleton width="100%" height="340px" borderRadius="12px" />
          <Skeleton width="100%" height="340px" borderRadius="12px" />
          <Skeleton width="100%" height="260px" borderRadius="12px" />
          <Skeleton width="100%" height="260px" borderRadius="12px" />
        </div>
        <Skeleton width="100%" height="70px" borderRadius="12px" style={{ marginTop: "1.5rem" }} />
      </div>
    )
  }

  return (
    <div className="page shop-page fade-in">
      <div className="page-intro">
        <div>
          <p className="eyebrow accent">YOUR BUSINESS</p>
          <h2>Shop Profile & Settings</h2>
          <p className="subtle">
            These store details and invoice settings appear on every receipt you print.
          </p>
        </div>
      </div>

      {/* Active Plan & Print Quota Summary Card */}
      <div className="shop-quota-card">
        <div className="shop-quota-info">
          <div
            className="shop-quota-icon"
            style={{
              background: activePlan.isFreeTier ? '#fef3c7' : '#e0f2fe',
              color: activePlan.isFreeTier ? '#d97706' : '#0284c7',
            }}
          >
            <Printer size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: activePlan.isFreeTier ? '#d97706' : '#15803d',
                  background: activePlan.isFreeTier ? '#fef3c7' : '#dcfce7',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  textTransform: 'uppercase'
                }}
              >
                {activePlan.name || "Free Starter Tier"}
              </span>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Active Plan</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {activePlan.printsRemaining?.toLocaleString()} / {(activePlan.totalPrints || 10).toLocaleString()} prints available
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setView?.("pricing")}
          className="shop-quota-btn"
        >
          <Zap size={14} style={{ color: '#38bdf8' }} /> Manage Plan & Top Up
        </button>
      </div>

      <form className="profile-form shop-profile-form" onSubmit={saveShop} noValidate>
        <div className="shop-profile-grid">
          {/* 1. Business Details Card (Row 1, Col 1) */}
          <div className="form-section-card shop-card-business">
            <h3 className="section-title-sm"><Store size={16} /> Business Details</h3>
            <p className="subtle" style={{ fontSize: "0.83rem", marginBottom: "1.15rem" }}>
              Your business name, contact number, and address displayed on customer bills.
            </p>
            
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

            <label className="form-group-label" style={{ marginBottom: 0 }}>
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

          {/* 2. Invoice Numbering Configuration Card (Row 1, Col 2) */}
          <div className="form-section-card shop-card-invoice">
            <div>
              <h3 className="section-title-sm"><Hash size={16} /> Invoice Numbering</h3>
              <p className="subtle" style={{ fontSize: "0.83rem", marginBottom: "1.15rem" }}>
                Customize sequence format and starting counter for clean bookkeeping.
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
            </div>

            {/* Live Preview Box */}
            <div className="invoice-format-preview-box" style={{ marginTop: "1rem" }}>
              <span className="preview-label">Next Bill Format Preview:</span>
              <strong className="preview-code">{liveInvoicePreview}</strong>
            </div>
          </div>

          {/* 3. Receipt Defaults Card (Row 2, Col 1) */}
          <div className="form-section-card shop-card-receipt">
            <h3 className="section-title-sm"><FileText size={16} /> Receipt Defaults</h3>
            <p className="subtle" style={{ fontSize: "0.83rem", marginBottom: "1rem" }}>
              Default print format and paper layout for new bills.
            </p>

            <div className="form-row">
              <label className="flex-1 form-group-label" style={{ marginBottom: 0 }}>
                RECEIPT TEMPLATE
                <select
                  value={shop.default_template_id}
                  onChange={(e) => handleChange("default_template_id", e.target.value)}
                  className="option-select"
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
              </label>
            </div>

            {/* Template Info & Features naturally filling the card */}
            <div className="shop-template-meta-box">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem", flexWrap: "wrap", gap: "0.3rem" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a" }}>
                  {selectedTemplate.name}
                </span>
                <span style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  padding: "0.15rem 0.5rem",
                  borderRadius: "10px",
                  background: selectedTemplate.width === "80mm" ? "#ede9fe" : "#e0f2fe",
                  color: selectedTemplate.width === "80mm" ? "#6d28d9" : "#0284c7"
                }}>
                  {selectedTemplate.paperSize || selectedTemplate.width || "58mm Thermal"}
                </span>
              </div>
              <p style={{ fontSize: "0.76rem", color: "#64748b", margin: "0 0 0.55rem 0", lineHeight: 1.4 }}>
                {selectedTemplate.description || "Clean and professional receipt template."}
              </p>
              {Array.isArray(selectedTemplate.features) && selectedTemplate.features.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                  {selectedTemplate.features.slice(0, 3).map((feat, idx) => (
                    <span key={idx} style={{ fontSize: "0.68rem", color: "#334155", background: "#ffffff", border: "1px solid #e2e8f0", padding: "0.15rem 0.4rem", borderRadius: "5px" }}>
                      ✓ {feat}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 4. Live Receipt Header Preview Card (Row 2, Col 2) */}
          <div className="form-section-card shop-card-preview">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <h3 className="section-title-sm" style={{ margin: 0 }}>
                <Receipt size={16} /> Live Receipt Header Preview
              </h3>
              <span className="shop-preview-badge" style={{
                background: selectedTemplate.width === "80mm" ? "#ede9fe" : "#e0f2fe",
                color: selectedTemplate.width === "80mm" ? "#6d28d9" : "#0284c7"
              }}>
                {selectedTemplate.name} · {selectedTemplate.width || "58mm"}
              </span>
            </div>
            <p className="subtle" style={{ fontSize: "0.82rem", marginBottom: "0.85rem" }}>
              Real-time preview of how your store identity and bill sequence appear using the selected template.
            </p>

            <div className="shop-thermal-preview-container">
              {renderThermalPreview()}
            </div>

            <div className="shop-tips-list">
              <div className="shop-tip-item">
                <CheckCircle2 size={14} className="shop-tip-icon" />
                <span>Synchronized with {selectedTemplate.paperSize || selectedTemplate.width || "58mm"} thermal printers.</span>
              </div>
              <div className="shop-tip-item">
                <CheckCircle2 size={14} className="shop-tip-icon" />
                <span>Invoice counter increments automatically after each printed receipt.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Card: Save Settings */}
        <div className="shop-action-bar">
          <div className="shop-action-left">
            <button
              data-testid="save-shop-button"
              className="primary-button"
              type="submit"
              disabled={loading}
              style={{ width: "fit-content" }}
            >
              {loading ? <ButtonLoader text="Saving Settings..." /> : <>Save Settings <ArrowRight size={16} /></>}
            </button>

            {saved && (
              <div data-testid="shop-saved-message" className="success-message slide-up" style={{ margin: 0 }}>
                <Check size={16} /> Shop profile & invoice settings saved!
              </div>
            )}
          </div>
          <span className="shop-action-hint">
            Changes apply immediately to newly generated bills and prints.
          </span>
        </div>
      </form>

      <style>{`
        .shop-page {
          max-width: 1140px;
          margin: 0 auto;
          width: 100%;
        }

        .shop-quota-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 1.25rem 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .shop-quota-info {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .shop-quota-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .shop-quota-btn {
          background: #0f172a;
          color: #ffffff;
          border: none;
          padding: 0.55rem 1rem;
          border-radius: 10px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          transition: all 0.15s ease;
        }

        .shop-quota-btn:hover {
          background: #1e293b;
          transform: translateY(-1px);
        }

        .shop-profile-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1.5rem;
          align-items: stretch;
          margin-bottom: 1.5rem;
        }

        .shop-card-business {
          grid-column: 1;
          grid-row: 1;
          margin-bottom: 0 !important;
          display: flex;
          flex-direction: column;
        }

        .shop-card-invoice {
          grid-column: 2;
          grid-row: 1;
          margin-bottom: 0 !important;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .shop-card-receipt {
          grid-column: 1;
          grid-row: 2;
          margin-bottom: 0 !important;
          display: flex;
          flex-direction: column;
        }

        .shop-card-preview {
          grid-column: 2;
          grid-row: 2;
          margin-bottom: 0 !important;
          display: flex;
          flex-direction: column;
          background: #fafbfc;
          border: 1px solid #e2e8f0;
        }

        .shop-template-meta-box {
          margin-top: 1rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 0.85rem 1rem;
        }

        .shop-preview-badge {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 0.2rem 0.55rem;
          border-radius: 10px;
          letter-spacing: 0.3px;
          transition: all 0.2s ease;
        }

        .shop-thermal-preview-container {
          background: #f1f5f9;
          border: 1px dashed #cbd5e1;
          border-radius: 10px;
          padding: 1.1rem;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 0.85rem;
          min-height: 180px;
          transition: all 0.2s ease;
        }

        .shop-thermal-preview-paper {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          border-radius: 6px;
          width: 100%;
          padding: 0.9rem 1.1rem;
          font-family: 'Courier New', Courier, monospace, monospace;
          text-align: center;
          color: #0f172a;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .shop-thermal-title {
          font-weight: 800;
          font-size: 0.95rem;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-bottom: 0.25rem;
          word-break: break-word;
        }

        .shop-thermal-sub {
          font-size: 0.72rem;
          color: #64748b;
          line-height: 1.35;
          margin-bottom: 0.2rem;
          word-break: break-word;
        }

        .shop-thermal-divider {
          border-top: 1px dashed #94a3b8;
          margin: 0.65rem 0;
        }

        .shop-thermal-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.72rem;
          color: #334155;
          margin-bottom: 0.2rem;
        }

        .shop-thermal-row strong {
          font-weight: 700;
          color: #0f172a;
        }

        .shop-tips-list {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }

        .shop-tip-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.78rem;
          color: #64748b;
          line-height: 1.3;
        }

        .shop-tip-icon {
          color: #0ea5e9;
          flex-shrink: 0;
        }

        .shop-action-bar {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.15rem 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .shop-action-left {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .shop-action-hint {
          font-size: 0.8rem;
          color: #64748b;
        }

        @media (max-width: 992px) {
          .shop-profile-grid {
            grid-template-columns: 1fr;
            gap: 1.25rem;
          }
          .shop-card-business {
            grid-column: 1;
            grid-row: auto;
            order: 1;
          }
          .shop-card-receipt {
            grid-column: 1;
            grid-row: auto;
            order: 2;
          }
          .shop-card-invoice {
            grid-column: 1;
            grid-row: auto;
            order: 3;
          }
          .shop-card-preview {
            grid-column: 1;
            grid-row: auto;
            order: 4;
          }
        }

        @media (max-width: 640px) {
          .shop-action-bar {
            flex-direction: column;
            align-items: stretch;
            padding: 1.1rem;
          }

          .shop-action-left {
            flex-direction: column;
            align-items: stretch;
            width: 100%;
          }

          .shop-action-bar .primary-button {
            width: 100% !important;
            justify-content: center !important;
          }

          .shop-action-hint {
            text-align: center;
          }

          .shop-quota-card {
            flex-direction: column;
            align-items: stretch;
          }

          .shop-quota-btn {
            justify-content: center;
            width: 100%;
          }

          .shop-page .form-section-card {
            padding: 1.25rem !important;
          }
        }
      `}</style>
    </div>
  )
}