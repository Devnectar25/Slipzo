import { useEffect, useState, useRef, useMemo } from "react"
import {
  Store,
  Hash,
  Check,
  Save,
  AlertCircle,
  Phone,
  MapPin,
  Percent,
  Receipt,
  Globe,
  Camera,
  Upload,
  Edit2,
  ChevronDown,
  Settings,
  SlidersHorizontal
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { SUPPORTED_LANGUAGES, changeAppLanguage } from "../i18n/i18n"
import { call, getCachedData, setCachedData, getActivePlanDetails, findTemplateMatch } from "../lib/utils"
import { ButtonLoader, Skeleton } from "./common/Skeleton"
import { useToast } from "./common/Toast"
import { BUILTIN_TEMPLATES } from "./Templates"
import { RealisticReceiptView } from "./RealisticReceiptView"
import { VoiceInputButton } from "./common/VoiceInputButton"

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
  if (format === "PREFIX-YEAR-SEQ" || format === "PREFIX-SHORTDATE-SEQ") return `${cleanPrefix}-${shortDateStr}-${seqStr}`
  if (format === "SEQ") return seqStr
  return `${cleanPrefix}-${dateStr}-${seqStr}`
}

export function Shop({ user, setView } = {}) {
  const { t, i18n } = useTranslation()
  const currentLang = i18n.language || "en"

  const userKey = user?.email || user?.id
  const [activePlan, setActivePlan] = useState(getActivePlanDetails(userKey))
  const [hasUnsaved, setHasUnsaved] = useState(false)
  const [previewPaperWidth, setPreviewPaperWidth] = useState("58mm")

  const logoInputRef = useRef(null)
  const shopNameInputRef = useRef(null)

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
      invoice_prefix: data?.invoice_prefix || "HB",
      invoice_sequence: data?.invoice_sequence || 7,
      invoice_format: data?.invoice_format || "PREFIX-DATE-SEQ",
      default_template_id: data?.default_template_id || "",
      default_discount: data?.default_discount !== undefined ? data.default_discount : 0,
      show_tax: data?.show_tax !== undefined ? data.show_tax : 0,
      tax_rate: data?.tax_rate !== undefined ? data.tax_rate : 0,
      logo_url: data?.logo_url || ""
    }
  })

  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [ready, setReady] = useState(() => Boolean(getCachedData("/shop")))
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const edited = useRef(false)

  const { success, error: toastError, warning: toastWarning } = useToast()

  const handleLanguageSelect = async (langCode) => {
    await changeAppLanguage(langCode)
    const selectedLang = SUPPORTED_LANGUAGES.find((l) => l.code === langCode)
    success(
      t("profile.languageChanged", {
        lang: selectedLang?.nativeName || langCode,
        defaultValue: `Language switched to ${selectedLang?.nativeName || langCode}!`
      })
    )
  }

  const validateField = (key, value, currentShop = shop) => {
    let errorMsg = ""
    const val = String(value || "").trim()

    if (key === "name") {
      if (!val) {
        errorMsg = t("validation.nameRequired", "Shop name is required.")
      } else if (val.length < 2) {
        errorMsg = t("validation.nameMin", "Shop name must be at least 2 characters.")
      } else if (val.length > 100) {
        errorMsg = t("validation.nameMax", "Shop name cannot exceed 100 characters.")
      }
    }

    if (key === "phone" && val) {
      const digitsOnly = val.replace(/[^0-9]/g, "")
      if (digitsOnly.length !== 10) {
        errorMsg = t("validation.phoneInvalid", "Please enter a valid 10-digit contact number.")
      }
    }

    if (key === "address" && val) {
      if (val.length > 300) {
        errorMsg = t("validation.addressMax", "Address cannot exceed 300 characters.")
      }
    }

    if (key === "invoice_prefix") {
      if (currentShop.invoice_format !== "SEQ") {
        if (!val) {
          errorMsg = t("validation.prefixRequired", "Invoice prefix is required.")
        } else if (!/^[A-Za-z0-9]{1,8}$/.test(val)) {
          errorMsg = t("validation.prefixInvalid", "Prefix must be 1–8 letters or numbers (e.g. HB, SLP).")
        }
      }
    }

    if (key === "invoice_sequence") {
      const num = Number(value)
      if (value === "" || isNaN(num)) {
        errorMsg = t("validation.seqRequired", "Sequence number is required.")
      } else if (!Number.isInteger(num) || num < 1) {
        errorMsg = t("validation.seqMin", "Sequence number must be at least 1.")
      } else if (num > 999999999) {
        errorMsg = t("validation.seqMax", "Sequence number is too large.")
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
            invoice_prefix: data.invoice_prefix || "HB",
            invoice_sequence: data.invoice_sequence || 7,
            invoice_format: data.invoice_format || "PREFIX-DATE-SEQ",
            default_template_id: resolvedDefaultTplId,
            default_discount: data.default_discount !== undefined ? data.default_discount : 0,
            show_tax: data.show_tax !== undefined ? data.show_tax : 0,
            tax_rate: data.tax_rate !== undefined ? data.tax_rate : 0,
            logo_url: data.logo_url || ""
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

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toastError(t("profile.selectValidImage", "Please select a valid image file."))
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toastError(t("profile.logoSizeLimit", "Logo image must be smaller than 2MB."))
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result
      if (dataUrl) {
        handleChange("logo_url", dataUrl)
      }
    }
    reader.readAsDataURL(file)
  }

  const saveShop = async (e) => {
    e?.preventDefault?.()

    setTouched({
      name: true,
      phone: true,
      address: true,
      invoice_prefix: true,
      invoice_sequence: true
    })

    const validationErrors = validateAll(shop)
    if (Object.keys(validationErrors).length > 0) {
      const errMsg = t("validation.fixErrors", "Please fix the validation errors before saving.")
      if (toastWarning) {
        toastWarning(errMsg)
      } else {
        toastError(errMsg)
      }
      return
    }

    setLoading(true)
    try {
      const updatedShop = await call("/shop", {
        method: "PUT",
        body: JSON.stringify(shop)
      })
      if (updatedShop?.logo_url) {
        setShop((prev) => ({ ...prev, logo_url: updatedShop.logo_url }))
      }
      if (user?.id) {
        if (shop.name && shop.phone && shop.phone.trim() && shop.address && shop.address.trim()) {
          localStorage.setItem(`slipzo_shop_setup_${user.id}`, "true")
        } else {
          localStorage.removeItem(`slipzo_shop_setup_${user.id}`)
        }
      }

      setSaved(true)
      setHasUnsaved(false)
      const fullShop = { ...shop, ...(updatedShop || {}) }
      setCachedData("/shop", fullShop)
      if (fullShop.default_template_id) {
        localStorage.setItem("slipzo_default_template_id", fullShop.default_template_id)
      }
      window.dispatchEvent(new CustomEvent("slipzo_shop_updated", { detail: fullShop }))
      success(t("profile.settingsSaved", "Shop profile and invoice settings saved!"))
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

  // Mock receipt calculations
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

  const selectedTemplate = useMemo(() => {
    const tplList = Array.isArray(templates) && templates.length > 0 ? templates : BUILTIN_TEMPLATES
    const matched = findTemplateMatch(tplList, shop.default_template_id) || tplList.find((t) => t.id === shop.default_template_id) || tplList[0] || BUILTIN_TEMPLATES[0]
    if (!matched) return null

    return {
      ...matched,
      width: previewPaperWidth || matched.width || "58mm",
      previewData: {
        shopName: (shop.name || "HYDRABADI BIRYANI , CHOPDA").trim(),
        address: (shop.address || "Shop no:12 , Hated Road Parisar , Lasur").trim(),
        phone: (shop.phone || "8329300932").trim(),
        gst: (shop.gstin || "").trim(),
        invoiceNo: liveInvoicePreview,
        date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        items: [
          { name: "Basmati Rice 1kg", qty: 2, rate: 120, total: 240 },
          { name: "Assam Tea 250g", qty: 1, rate: 160, total: 160 },
          { name: "Sunflower Oil 1L", qty: 1, rate: 195, total: 195 }
        ],
        subtotal: receiptMath.subtotal,
        discount: receiptMath.disc,
        tax: receiptMath.tax,
        total: receiptMath.total,
        payment: "CASH",
        footer: matched.footer || "Thank you for shopping with us!"
      }
    }
  }, [templates, shop.default_template_id, shop.name, shop.address, shop.phone, shop.gstin, liveInvoicePreview, receiptMath, previewPaperWidth])

  if (!ready) {
    return (
      <div className="page shop-page fade-in">
        <div className="sp-header">
          <Skeleton width="200px" height="32px" borderRadius="8px" />
          <Skeleton width="340px" height="18px" borderRadius="6px" style={{ marginTop: "0.4rem" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Skeleton width="100%" height="90px" borderRadius="16px" />
          <Skeleton width="100%" height="280px" borderRadius="16px" />
        </div>
      </div>
    )
  }

  return (
    <div className="page shop-page fade-in">
      {/* Top Page Header with Top-Right Save Settings */}
      <div className="sp-header">
        <div className="sp-header-left">
          <h1 className="sp-title">{t("profile.heading", "Shop Profile")}</h1>
          <p className="sp-subtitle">{t("profile.headingSub", "Manage your shop details, receipt settings and preferences")}</p>
        </div>

        <div className="sp-header-right">
          <button
            data-testid="save-shop-button"
            className="sp-top-save-btn"
            type="button"
            onClick={saveShop}
            disabled={loading}
            title={t("profile.saveSettings", "Save Settings")}
          >
            {loading ? (
              <ButtonLoader text={t("profile.savingSettings", "Saving...")} />
            ) : (
              <>
                <Save size={15} />
                <span>{t("profile.saveSettings", "Save Settings")}</span>
              </>
            )}
          </button>

          {hasUnsaved && !saved && (
            <span className="sp-unsaved-hint top">
              <span className="sp-unsaved-dot" /> {t("profile.unsavedChanges", "You have unsaved changes")}
            </span>
          )}

          {saved && (
            <div data-testid="shop-saved-message" className="sp-saved-badge top">
              <Check size={13} strokeWidth={3} /> {t("profile.settingsSaved", "Settings Saved!")}
            </div>
          )}
        </div>
      </div>

      {/* Top Card: Store Details */}
      <div className="sp-store-details-card">
        {/* Mobile Header Row (Visible only on mobile) */}
        <div className="sp-store-mobile-header mobile-only">
          <div className="sp-icon-box blue">
            <Store size={18} />
          </div>
          <div className="sp-store-header-text">
            <span className="sp-store-eyebrow">{t("profile.storeIdentity", "STORE DETAILS")}</span>
            <h2 className="sp-store-name">{shop.name || "Hydrabadi Biryani , Chopda"}</h2>
            <span className="sp-verified-badge">
              <Check size={12} strokeWidth={3} /> {t("profile.verifiedStore", "Verified Store")}
            </span>
          </div>
          <button
            type="button"
            className="sp-edit-icon-btn"
            onClick={() => shopNameInputRef.current?.focus()}
            title={t("profile.editShopName", "Edit Shop Name")}
            aria-label={t("profile.editShopName", "Edit Shop Name")}
          >
            <Edit2 size={16} />
          </button>
        </div>

        <div className="sp-store-left">
          <div className={`sp-avatar-wrap ${shop.logo_url ? "has-image" : ""}`} onClick={() => logoInputRef.current?.click()} title={t("profile.clickChangeLogo", "Click to change logo")}>
            {shop.logo_url ? (
              <img src={shop.logo_url} alt="Shop Logo" className="sp-avatar-img" />
            ) : (
              <span className="sp-avatar-letter">{shop.name ? shop.name.trim().charAt(0).toUpperCase() : "H"}</span>
            )}
            <button type="button" className="sp-camera-btn" title={t("profile.changeLogo", "Change logo")} aria-label={t("profile.changeLogo", "Change logo")}>
              <Camera size={13} />
            </button>
          </div>

          <div className="sp-store-info">
            <span className="sp-store-eyebrow desktop-only">{t("profile.storeIdentity", "STORE DETAILS")}</span>
            <div className="sp-store-name-row desktop-only">
              <h2 className="sp-store-name">{shop.name || "Hydrabadi Biryani , Chopda"}</h2>
              <button
                type="button"
                className="sp-edit-icon-btn"
                onClick={() => shopNameInputRef.current?.focus()}
                title={t("profile.editShopName", "Edit Shop Name")}
                aria-label={t("profile.editShopName", "Edit Shop Name")}
              >
                <Edit2 size={15} />
              </button>
              <span className="sp-verified-badge">
                <Check size={12} strokeWidth={3} /> {t("profile.verifiedStore", "Verified Store")}
              </span>
            </div>
            <p className="sp-store-subtext">{t("profile.storeSubtext", "These details will appear on your thermal receipt and invoice.")}</p>
            <div className="sp-store-pills-row">
              {shop.phone && (
                <span className="sp-info-pill">
                  <Phone size={13} /> {shop.phone}
                </span>
              )}
              {shop.address && (
                <span className="sp-info-pill" title={shop.address}>
                  <MapPin size={13} /> {shop.address}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="sp-store-right">
          <input
            type="file"
            ref={logoInputRef}
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleLogoUpload}
          />
          <button
            type="button"
            className="sp-change-logo-btn"
            onClick={() => logoInputRef.current?.click()}
          >
            <Upload size={14} /> {t("profile.changeLogo", "Change Logo")}
          </button>
          <span className="sp-logo-hint">{t("profile.recommendedSize", "Recommended size: 512 × 512")}</span>
        </div>
      </div>

      {/* Main Two-Column Desktop Grid Layout */}
      <form className="sp-desktop-layout" onSubmit={saveShop} noValidate>
        {/* LEFT COLUMN: Business Info, Receipt Settings, Invoice Sequencing */}
        <div className="sp-left-col">
          {/* Card 1: Business Information */}
          <div className="sp-card">
            <div className="sp-card-header">
              <div className="sp-icon-box blue">
                <Store size={18} />
              </div>
              <div className="sp-card-titles">
                <h3 className="sp-card-title">{t("profile.businessDetails", "Business Information")}</h3>
                <p className="sp-card-subtitle">{t("profile.businessDetailsSub", "Basic information about your shop")}</p>
              </div>
            </div>

            <div className="sp-form-row two-col">
              <div className="sp-field-group">
                <label className="sp-label">
                  {t("profile.shopName", "Shop Name")} <span className="sp-req">*</span>
                </label>
                <div className={`sp-input-wrap ${touched.name && errors.name ? "error" : ""}`}>
                  <Store size={16} className="sp-input-icon" />
                  <input
                    ref={shopNameInputRef}
                    data-testid="shop-name-input"
                    type="text"
                    required
                    placeholder={t("profile.shopNamePlaceholder", "e.g. Mahajan General Store & Cafe")}
                    value={shop.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    onBlur={() => handleBlur("name")}
                    className="sp-input"
                  />
                  <div className="sp-voice-wrap">
                    <VoiceInputButton
                      size="sm"
                      placeholder={t("profile.speakShopName", "Speak shop name")}
                      onSpeechResult={(text) => handleChange("name", text)}
                    />
                  </div>
                </div>
                {touched.name && errors.name && (
                  <span className="sp-field-error">
                    <AlertCircle size={12} /> {errors.name}
                  </span>
                )}
              </div>

              <div className="sp-field-group">
                <label className="sp-label">{t("profile.phone", "Contact Phone Number")}</label>
                <div className={`sp-input-wrap ${touched.phone && errors.phone ? "error" : ""}`}>
                  <Phone size={16} className="sp-input-icon" />
                  <input
                    data-testid="shop-phone-input"
                    type="tel"
                    maxLength={10}
                    placeholder={t("profile.phonePlaceholder", "e.g. 9876543210")}
                    value={shop.phone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 10)
                      handleChange("phone", digits)
                    }}
                    onBlur={() => handleBlur("phone")}
                    className="sp-input"
                  />
                  <div className="sp-voice-wrap">
                    <VoiceInputButton
                      size="sm"
                      placeholder={t("profile.speakContactNumber", "Speak contact number")}
                      onSpeechResult={(text) => {
                        const digits = text.replace(/[^0-9]/g, "").slice(0, 10)
                        handleChange("phone", digits)
                      }}
                    />
                  </div>
                </div>
                {touched.phone && errors.phone ? (
                  <span className="sp-field-error">
                    <AlertCircle size={12} /> {errors.phone}
                  </span>
                ) : (
                  <span className="sp-helper-text">{t("profile.phoneHelper", "7-15 digits for contact header on receipt")}</span>
                )}
              </div>
            </div>

            <div className="sp-field-group full-width">
              <div className="sp-label-split">
                <label className="sp-label">{t("profile.address", "Store Address")}</label>
                <span className={`sp-char-count ${shop.address?.length > 300 ? "exceeded" : ""}`}>
                  {shop.address?.length || 0} / 300
                </span>
              </div>
              <div className={`sp-textarea-wrap ${touched.address && errors.address ? "error" : ""}`}>
                <MapPin size={16} className="sp-textarea-icon" />
                <textarea
                  data-testid="shop-address-input"
                  rows={3}
                  placeholder={t("profile.addressPlaceholder", "Street, area, landmark, city, pincode")}
                  value={shop.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  onBlur={() => handleBlur("address")}
                  className="sp-textarea"
                />
                <div className="sp-voice-wrap textarea-voice">
                  <VoiceInputButton
                    size="sm"
                    placeholder={t("profile.speakStoreAddress", "Speak store address")}
                    onSpeechResult={(text) => handleChange("address", text)}
                  />
                </div>
              </div>
              {touched.address && errors.address ? (
                <span className="sp-field-error">
                  <AlertCircle size={12} /> {errors.address}
                </span>
              ) : (
                <span className="sp-helper-text">{t("profile.addressHelper", "Keep address to 2 lines for better receipt layout.")}</span>
              )}
            </div>
          </div>

          {/* Card 2: Receipt Settings */}
          <div className="sp-card">
            <div className="sp-card-header">
              <div className="sp-icon-box green">
                <Receipt size={18} />
              </div>
              <div className="sp-card-titles">
                <h3 className="sp-card-title">{t("profile.receiptDefaults", "Receipt Settings")}</h3>
                <p className="sp-card-subtitle">{t("profile.receiptDefaultsSub", "Customize how your bills look")}</p>
              </div>
            </div>

            <div className="sp-field-group full-width">
              <label className="sp-label">{t("profile.receiptTemplate", "Receipt Template")}</label>
              <div className="sp-select-wrap">
                <Receipt size={16} className="sp-input-icon" />
                <select
                  value={shop.default_template_id}
                  onChange={(e) => handleChange("default_template_id", e.target.value)}
                  className="sp-select"
                >
                  {templates.map((tItem) => (
                    <option key={tItem.id} value={tItem.id}>
                      {tItem.name} ({tItem.width || "58mm"})
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="sp-select-arrow" />
              </div>
              <span className="sp-helper-text">{t("profile.templateHelper", "Layout loaded by default when creating bills")}</span>
            </div>
          </div>

          {/* Card 3: Invoice Sequencing */}
          <div className="sp-card">
            <div className="sp-card-header">
              <div className="sp-icon-box purple">
                <Hash size={18} />
              </div>
              <div className="sp-card-titles">
                <h3 className="sp-card-title">{t("profile.invoiceSequenceTitle", "Invoice Sequencing")}</h3>
                <p className="sp-card-subtitle">{t("profile.invoiceSequenceSub", "Set your invoice numbering format")}</p>
              </div>
            </div>

            <div className="sp-form-row two-col">
              <div className="sp-field-group">
                <label className="sp-label">{t("profile.invoicePrefix", "Invoice Prefix")}</label>
                <div className={`sp-input-wrap ${touched.invoice_prefix && errors.invoice_prefix ? "error" : ""}`}>
                  <Hash size={16} className="sp-input-icon" />
                  <input
                    type="text"
                    maxLength={8}
                    placeholder={t("profile.invoicePrefixPlaceholder", "HB")}
                    value={shop.invoice_prefix}
                    onChange={(e) => handleChange("invoice_prefix", e.target.value.toUpperCase())}
                    onBlur={() => handleBlur("invoice_prefix")}
                    className="sp-input"
                  />
                  <div className="sp-voice-wrap">
                    <VoiceInputButton
                      size="sm"
                      placeholder={t("profile.speakInvoicePrefix", "Speak invoice prefix")}
                      onSpeechResult={(text) => {
                        const clean = text.replace(/[^a-zA-Z0-9_-]/g, "").toUpperCase()
                        if (clean) handleChange("invoice_prefix", clean.slice(0, 8))
                      }}
                    />
                  </div>
                </div>
                {touched.invoice_prefix && errors.invoice_prefix ? (
                  <span className="sp-field-error">
                    <AlertCircle size={12} /> {errors.invoice_prefix}
                  </span>
                ) : (
                  <span className="sp-helper-text">{t("profile.invoicePrefixHelper", "Short letters identifying your store")}</span>
                )}
              </div>

              <div className="sp-field-group">
                <label className="sp-label">
                  {t("profile.startingSequence", "Next Invoice Number")} <span className="sp-req">*</span>
                </label>
                <div className={`sp-input-wrap ${touched.invoice_sequence && errors.invoice_sequence ? "error" : ""}`}>
                  <span className="sp-hash-adornment">#</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="7"
                    value={shop.invoice_sequence}
                    onChange={(e) => handleChange("invoice_sequence", e.target.value)}
                    onBlur={() => handleBlur("invoice_sequence")}
                    className="sp-input"
                  />
                  <div className="sp-voice-wrap">
                    <VoiceInputButton
                      size="sm"
                      placeholder={t("profile.speakSequenceNumber", "Speak sequence number")}
                      onSpeechResult={(text) => {
                        const digits = text.replace(/[^0-9]/g, "")
                        if (digits) handleChange("invoice_sequence", digits)
                      }}
                    />
                  </div>
                </div>
                {touched.invoice_sequence && errors.invoice_sequence ? (
                  <span className="sp-field-error">
                    <AlertCircle size={12} /> {errors.invoice_sequence}
                  </span>
                ) : (
                  <span className="sp-helper-text">{t("profile.startingSequenceHelper", "Auto-increments by 1 after each bill")}</span>
                )}
              </div>
            </div>

            <div className="sp-field-group full-width" style={{ marginTop: "0.5rem" }}>
              <label className="sp-label">{t("profile.numberFormat", "Numbering Format Pattern")}</label>
              <div className="sp-select-wrap">
                <SlidersHorizontal size={16} className="sp-input-icon" />
                <select
                  value={shop.invoice_format}
                  onChange={(e) => handleChange("invoice_format", e.target.value)}
                  className="sp-select"
                >
                  <option value="PREFIX-DATE-SEQ">
                    {t("profile.formatPrefixDateSeq", "Prefix + Date + Number")} (e.g. {shop.invoice_prefix || "HB"}-{new Date().toISOString().slice(0, 10).replace(/-/g, "")}-{String(shop.invoice_sequence || 1).padStart(4, "0")})
                  </option>
                  <option value="PREFIX-SHORTDATE-SEQ">
                    {t("profile.formatPrefixYearSeq", "Prefix + Short Date + Number")} (e.g. {shop.invoice_prefix || "HB"}-{new Date().toISOString().slice(2, 10).replace(/-/g, "")}-{String(shop.invoice_sequence || 1).padStart(4, "0")})
                  </option>
                  <option value="PREFIX-SEQ">
                    {t("profile.formatPrefixSeq", "Prefix + Number")} (e.g. {shop.invoice_prefix || "HB"}-{String(shop.invoice_sequence || 1).padStart(4, "0")})
                  </option>
                  <option value="SEQ">
                    {t("profile.formatSeqOnly", "Number Only")} (e.g. {String(shop.invoice_sequence || 1).padStart(4, "0")})
                  </option>
                </select>
                <ChevronDown size={15} className="sp-select-arrow" />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Receipt Preview, App Settings, Save Button */}
        <div className="sp-right-col">
          {/* Card 1: Live Receipt Preview */}
          <div className="sp-preview-card">
            <div className="sp-preview-header">
              <div className="sp-live-badge">
                <span className="sp-pulse-dot" /> {t("profile.livePreview", "Live Preview")}
              </div>
              <select
                value={previewPaperWidth}
                onChange={(e) => setPreviewPaperWidth(e.target.value)}
                className="sp-paper-dropdown"
              >
                <option value="58mm">{t("profile.thermal58", "58mm Thermal")}</option>
                <option value="80mm">{t("profile.thermal80", "80mm Thermal")}</option>
              </select>
            </div>

            <div className="sp-receipt-wrapper">
              <RealisticReceiptView template={selectedTemplate} />
            </div>
          </div>

          {/* Card 2: App Settings */}
          <div className="sp-card">
            <div className="sp-card-header">
              <div className="sp-icon-box blue">
                <Settings size={18} />
              </div>
              <div className="sp-card-titles">
                <h3 className="sp-card-title">{t("profile.appSettings", "App Settings")}</h3>
                <p className="sp-card-subtitle">{t("profile.appPreferences", "Language & App Preferences")}</p>
              </div>
            </div>

            <div className="sp-field-group">
              <label className="sp-label">{t("profile.languageTitle", "App Language")}</label>
              <div className="sp-select-wrap">
                <Globe size={16} className="sp-input-icon" />
                <select
                  value={currentLang}
                  onChange={(e) => handleLanguageSelect(e.target.value)}
                  className="sp-select"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.nativeName} ({l.label})
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="sp-select-arrow" />
              </div>
              <span className="sp-helper-text">{t("profile.chooseLang", "Choose your preferred application language")}</span>
            </div>
          </div>

          {/* Mobile-Only Bottom Save Settings Button */}
          <div className="sp-mobile-save-section mobile-only">
            <button
              data-testid="save-shop-button-mobile"
              className="sp-mobile-save-btn"
              type="button"
              onClick={saveShop}
              disabled={loading}
              title={t("profile.saveSettings", "Save Settings")}
            >
              {loading ? (
                <ButtonLoader text={t("profile.savingSettings", "Saving...")} />
              ) : (
                <>
                  <Save size={16} />
                  <span>{t("profile.saveSettings", "Save Settings")}</span>
                </>
              )}
            </button>

            {hasUnsaved && !saved && (
              <span className="sp-unsaved-hint bottom">
                <span className="sp-unsaved-dot" /> {t("profile.unsavedChanges", "You have unsaved changes")}
              </span>
            )}

            {saved && (
              <div data-testid="shop-saved-message-mobile" className="sp-saved-badge bottom">
                <Check size={13} strokeWidth={3} /> {t("profile.settingsSaved", "Settings Saved!")}
              </div>
            )}
          </div>
        </div>
      </form>

      <style>{`
        /* ============================================================
           SLIPZO SHOP PROFILE — EXACT REFERENCE UI DESIGN
           ============================================================ */
        .shop-page {
          max-width: 1280px;
          margin: 0 auto;
          padding: 1.25rem 1.5rem 2rem;
          color: #0C1F41;
          box-sizing: border-box;
        }

        /* Page Header */
        .sp-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.15rem;
          flex-wrap: wrap;
        }

        .sp-header-left {
          display: flex;
          flex-direction: column;
        }

        .sp-header-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.3rem;
        }

        .sp-title {
          font-size: 1.55rem;
          font-weight: 800;
          color: #0C1F41;
          margin: 0 0 0.2rem 0;
          line-height: 1.2;
        }

        .sp-subtitle {
          font-size: 0.85rem;
          color: #74788A;
          margin: 0;
        }

        /* Store Details Top Card */
        .sp-store-details-card {
          background: #ffffff;
          border: 1.5px solid #F7CDAB;
          border-radius: 16px;
          padding: 1.15rem 1.5rem;
          box-shadow: 0 1px 3px rgba(12, 31, 65, 0.04);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          flex-wrap: wrap;
          margin-bottom: 1.25rem;
        }

        .sp-store-left {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          min-width: 0;
          flex: 1;
        }

        .sp-avatar-wrap {
          width: 66px;
          height: 66px;
          border-radius: 18px;
          background: linear-gradient(135deg, #FB821B 0%, #F66016 100%);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          flex-shrink: 0;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(246, 96, 22, 0.28);
        }

        .sp-avatar-wrap.has-image {
          background: transparent !important;
          box-shadow: none !important;
          border: none !important;
        }

        .sp-avatar-letter {
          font-size: 1.75rem;
          font-weight: 800;
          line-height: 1;
        }

        .sp-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 18px;
          background: transparent !important;
          display: block;
        }

        .sp-camera-btn {
          position: absolute;
          bottom: -4px;
          right: -4px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #F66016;
          border: 2px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
          transition: background-color 0.15s ease, transform 0.15s ease;
        }

        .sp-camera-btn:hover {
          background: #FA4406;
          transform: scale(1.05);
        }

        .sp-store-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }

        .sp-store-eyebrow {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: #74788A;
          text-transform: uppercase;
          margin-bottom: 0.2rem;
        }

        .sp-store-name-row {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          flex-wrap: wrap;
          margin-bottom: 0.25rem;
        }

        .sp-store-name {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0C1F41;
          margin: 0;
          line-height: 1.2;
        }

        .sp-edit-icon-btn {
          background: none;
          border: none;
          color: #F66016;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          padding: 2px;
          border-radius: 4px;
          transition: background-color 0.15s;
        }

        .sp-edit-icon-btn:hover {
          background: #FFF0E5;
          color: #FA4406;
        }

        .sp-verified-badge {
          background: #ecfdf5;
          color: #059669;
          border: 1px solid #a7f3d0;
          border-radius: 9999px;
          padding: 0.18rem 0.55rem;
          font-size: 0.75rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }

        .sp-store-subtext {
          font-size: 0.82rem;
          color: #74788A;
          margin: 0 0 0.5rem 0;
        }

        .sp-store-pills-row {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
        }

        .sp-info-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: #FFF0E5;
          border: 1px solid #FADCC3;
          border-radius: 8px;
          padding: 0.28rem 0.7rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: #F66016;
          max-width: 420px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sp-store-right {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
        }

        .sp-change-logo-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: #ffffff;
          color: #F66016;
          border: 1.5px solid #F7CDAB;
          border-radius: 10px;
          padding: 0.55rem 1.15rem;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .sp-change-logo-btn:hover {
          background: #FFF0E5;
          border-color: #F66016;
          color: #FA4406;
        }

        .sp-logo-hint {
          font-size: 0.72rem;
          color: #8F93A5;
          margin-top: 0.35rem;
        }

        /* Two-Column Desktop Grid Layout */
        .sp-desktop-layout {
          display: grid;
          grid-template-columns: 1.55fr 1fr;
          gap: 1.25rem;
          align-items: start;
        }

        .sp-left-col {
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
          min-width: 0;
        }

        .sp-right-col {
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
          min-width: 0;
        }

        /* Reusable Card Style */
        .sp-card {
          background: #ffffff;
          border: 1.5px solid #F7CDAB;
          border-radius: 16px;
          padding: 1.25rem 1.35rem;
          box-shadow: 0 1px 3px rgba(12, 31, 65, 0.04);
        }

        .sp-card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.15rem;
        }

        .sp-icon-box {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sp-icon-box.blue {
          background: #FFF0E5;
          border: 1.5px solid #FADCC3;
          color: #F66016;
        }

        .sp-icon-box.green {
          background: #ecfdf5;
          border: 1.5px solid #a7f3d0;
          color: #059669;
        }

        .sp-icon-box.purple {
          background: #FFF2DE;
          border: 1.5px solid #FADCC3;
          color: #FB821B;
        }

        .sp-card-titles {
          display: flex;
          flex-direction: column;
        }

        .sp-card-title {
          font-size: 1.05rem;
          font-weight: 800;
          color: #0C1F41;
          margin: 0;
          line-height: 1.25;
        }

        .sp-card-subtitle {
          font-size: 0.8rem;
          color: #74788A;
          margin: 0.15rem 0 0 0;
        }

        /* Form Layout Elements */
        .sp-form-row {
          display: flex;
          gap: 1rem;
        }

        .sp-form-row.two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 0.85rem;
        }

        .sp-field-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          min-width: 0;
        }

        .sp-field-group.full-width {
          margin-bottom: 0;
        }

        .sp-label {
          font-size: 0.82rem;
          font-weight: 700;
          color: #575B6B;
          margin: 0;
        }

        .sp-label-split {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .sp-req {
          color: #ef4444;
          margin-left: 2px;
        }

        .sp-char-count {
          font-size: 0.75rem;
          color: #8F93A5;
          font-weight: 600;
        }

        .sp-char-count.exceeded {
          color: #ef4444;
        }

        /* Input & Select Wrappers */
        .sp-input-wrap,
        .sp-select-wrap,
        .sp-textarea-wrap {
          position: relative;
          display: flex;
          align-items: center;
          background: #ffffff;
          border: 1.5px solid #D9DDE4;
          border-radius: 10px;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .sp-input-wrap:focus-within,
        .sp-select-wrap:focus-within,
        .sp-textarea-wrap:focus-within {
          border-color: #F66016;
          box-shadow: 0 0 0 3px rgba(246, 96, 22, 0.12);
        }

        .sp-input-wrap.error,
        .sp-textarea-wrap.error {
          border-color: #ef4444;
        }

        .sp-input-icon {
          position: absolute;
          left: 0.85rem;
          color: #8F93A5;
          pointer-events: none;
          flex-shrink: 0;
        }

        .sp-hash-adornment {
          position: absolute;
          left: 0.85rem;
          color: #8F93A5;
          font-weight: 700;
          font-size: 0.95rem;
          pointer-events: none;
        }

        .sp-input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          padding: 0.55rem 2.5rem 0.55rem 2.4rem;
          font-size: 0.9rem;
          color: #0C1F41;
          box-sizing: border-box;
        }

        .sp-select {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          padding: 0.55rem 2.2rem 0.55rem 2.4rem;
          font-size: 0.88rem;
          color: #0C1F41;
          cursor: pointer;
          appearance: none;
          box-sizing: border-box;
        }

        .sp-select-arrow {
          position: absolute;
          right: 0.85rem;
          color: #8F93A5;
          pointer-events: none;
        }

        .sp-textarea-wrap {
          align-items: flex-start;
          padding-top: 0.4rem;
        }

        .sp-textarea-icon {
          position: absolute;
          left: 0.85rem;
          top: 0.75rem;
          color: #8F93A5;
          pointer-events: none;
        }

        .sp-textarea {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          padding: 0.35rem 2.5rem 0.55rem 2.4rem;
          font-size: 0.88rem;
          color: #0C1F41;
          resize: vertical;
          min-height: 56px;
          font-family: inherit;
          box-sizing: border-box;
          line-height: 1.4;
        }

        .sp-voice-wrap {
          position: absolute;
          right: 0.55rem;
          display: flex;
          align-items: center;
        }

        .sp-voice-wrap.textarea-voice {
          top: 0.55rem;
        }

        .sp-helper-text {
          font-size: 0.75rem;
          color: #8F93A5;
          margin-top: 0.15rem;
        }

        .sp-field-error {
          font-size: 0.75rem;
          color: #ef4444;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          margin-top: 0.15rem;
        }

        /* Preset Buttons Row */
        .sp-presets-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          margin-top: 0.45rem;
          flex-wrap: wrap;
        }

        .sp-presets-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #74788A;
          margin-right: 0.15rem;
        }

        .sp-preset-btn {
          padding: 0.22rem 0.65rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid #D9DDE4;
          background: #ffffff;
          color: #575B6B;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .sp-preset-btn:hover {
          background: #FFF0E5;
          border-color: #F7CDAB;
          color: #F66016;
        }

        .sp-preset-btn.active {
          background: #F66016;
          border-color: #F66016;
          color: #ffffff;
        }

        /* Live Receipt Preview Card */
        .sp-preview-card {
          background: #ffffff;
          border: 1.5px solid #F7CDAB;
          border-radius: 16px;
          padding: 1.15rem 1.25rem;
          box-shadow: 0 1px 3px rgba(12, 31, 65, 0.04);
        }

        .sp-preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.85rem;
        }

        .sp-live-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.82rem;
          font-weight: 700;
          color: #16a34a;
        }

        .sp-pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #16a34a;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.2);
        }

        .sp-paper-dropdown {
          border: 1px solid #D9DDE4;
          border-radius: 8px;
          padding: 0.28rem 0.65rem;
          font-size: 0.78rem;
          font-weight: 600;
          color: #0C1F41;
          background: #ffffff;
          outline: none;
          cursor: pointer;
          transition: border-color 0.15s ease;
        }

        .sp-paper-dropdown:focus {
          border-color: #F66016;
        }

        .sp-receipt-wrapper {
          background: #FDF4EB;
          border: 1px solid #FADCC3;
          border-radius: 12px;
          padding: 0.5rem;
          display: flex;
          justify-content: center;
          overflow: hidden;
        }

        /* Desktop / Mobile Visibility Helpers */
        .mobile-only {
          display: none !important;
        }

        .desktop-only {
          display: flex;
        }

        /* Compact Attractive Top-Right Save Settings Button & Alerts */
        .sp-top-save-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: #F66016;
          color: #ffffff;
          border: none;
          border-radius: 9px;
          padding: 0.52rem 1.25rem;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(246, 96, 22, 0.28);
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .sp-top-save-btn:hover:not(:disabled) {
          background: #FA4406;
          box-shadow: 0 4px 10px rgba(246, 96, 22, 0.38);
          transform: translateY(-1px);
        }

        .sp-top-save-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .sp-top-save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .sp-unsaved-hint.top {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          color: #f59e0b;
          font-weight: 600;
          white-space: nowrap;
        }

        .sp-unsaved-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #f59e0b;
        }

        .sp-saved-badge.top {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          background: #ecfdf5;
          color: #059669;
          border: 1px solid #a7f3d0;
          border-radius: 6px;
          padding: 0.15rem 0.55rem;
          font-size: 0.75rem;
          font-weight: 700;
          white-space: nowrap;
        }

        /* ============================================================
           RESPONSIVENESS (TABLET & MOBILE)
           ============================================================ */
        @media (max-width: 960px) {
          .sp-desktop-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .desktop-only {
            display: none !important;
          }

          .mobile-only {
            display: flex !important;
          }

          .shop-page {
            padding: 0.6rem 0.5rem calc(80px + env(safe-area-inset-bottom, 0px)) !important;
            max-width: 100% !important;
            overflow-x: hidden !important;
          }

          /* Header: Compact, left title only, top Save Settings hidden */
          .sp-header {
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0.2rem !important;
            margin-bottom: 0.85rem !important;
            width: 100% !important;
          }

          .sp-header-right {
            display: none !important;
          }

          .sp-header-left {
            width: 100% !important;
          }

          .sp-title {
            font-size: 1.45rem !important;
            font-weight: 800 !important;
            color: #0C1F41 !important;
            margin: 0 0 0.25rem 0 !important;
            line-height: 1.2 !important;
          }

          .sp-subtitle {
            font-size: 0.82rem !important;
            color: #74788A !important;
            margin: 0 !important;
            line-height: 1.35 !important;
          }

          /* All Mobile Cards: Consistent border radius, padding, border and shadow */
          .sp-card,
          .sp-store-details-card,
          .sp-preview-card {
            background: #ffffff !important;
            border: 1.5px solid #F7CDAB !important;
            border-radius: 14px !important;
            padding: 1rem 0.95rem !important;
            box-shadow: 0 1px 3px rgba(12, 31, 65, 0.04) !important;
            width: 100% !important;
            box-sizing: border-box !important;
            margin-bottom: 0.85rem !important;
          }

          /* Store Details Mobile Presentation */
          .sp-store-details-card {
            display: flex !important;
            flex-direction: column !important;
            gap: 0.85rem !important;
          }

          .sp-store-mobile-header {
            display: flex !important;
            align-items: flex-start !important;
            justify-content: space-between !important;
            gap: 0.75rem !important;
            width: 100% !important;
            margin-bottom: 0.15rem !important;
          }

          .sp-store-mobile-header .sp-icon-box {
            width: 38px !important;
            height: 38px !important;
            border-radius: 10px !important;
            flex-shrink: 0 !important;
          }

          .sp-store-header-text {
            display: flex !important;
            flex-direction: column !important;
            flex: 1 !important;
            min-width: 0 !important;
          }

          .sp-store-eyebrow {
            font-size: 0.7rem !important;
            font-weight: 700 !important;
            letter-spacing: 0.05em !important;
            color: #74788A !important;
            text-transform: uppercase !important;
            margin-bottom: 0.15rem !important;
          }

          .sp-store-name {
            font-size: 1.15rem !important;
            font-weight: 800 !important;
            color: #0C1F41 !important;
            margin: 0 0 0.35rem 0 !important;
            line-height: 1.25 !important;
            word-break: break-word !important;
          }

          .sp-verified-badge {
            display: inline-flex !important;
            align-items: center !important;
            gap: 0.25rem !important;
            background: #ecfdf5 !important;
            color: #059669 !important;
            border: 1px solid #a7f3d0 !important;
            border-radius: 9999px !important;
            padding: 0.15rem 0.5rem !important;
            font-size: 0.72rem !important;
            font-weight: 700 !important;
            width: fit-content !important;
          }

          .sp-edit-icon-btn {
            color: #F66016 !important;
            padding: 4px !important;
            background: transparent !important;
            border: none !important;
            cursor: pointer !important;
            flex-shrink: 0 !important;
          }

          .sp-store-left {
            display: flex !important;
            align-items: flex-start !important;
            gap: 0.85rem !important;
            width: 100% !important;
          }

          .sp-avatar-wrap {
            width: 54px !important;
            height: 54px !important;
            border-radius: 14px !important;
            flex-shrink: 0 !important;
          }

          .sp-avatar-wrap.has-image {
            background: transparent !important;
            box-shadow: none !important;
            border: none !important;
          }

          .sp-avatar-wrap.has-image .sp-avatar-img {
            border-radius: 14px !important;
          }

          .sp-avatar-letter {
            font-size: 1.55rem !important;
          }

          .sp-camera-btn {
            width: 20px !important;
            height: 20px !important;
            bottom: -3px !important;
            right: -3px !important;
          }

          .sp-camera-btn svg {
            width: 11px !important;
            height: 11px !important;
          }

          .sp-store-info {
            display: flex !important;
            flex-direction: column !important;
            flex: 1 !important;
            min-width: 0 !important;
          }

          .sp-store-subtext {
            font-size: 0.78rem !important;
            color: #74788A !important;
            margin: 0 0 0.5rem 0 !important;
            line-height: 1.35 !important;
          }

          .sp-store-pills-row {
            display: flex !important;
            flex-direction: column !important;
            gap: 0.4rem !important;
            width: 100% !important;
          }

          .sp-info-pill {
            display: flex !important;
            align-items: center !important;
            gap: 0.45rem !important;
            background: #FFF0E5 !important;
            border: 1px solid #FADCC3 !important;
            border-radius: 8px !important;
            padding: 0.35rem 0.65rem !important;
            font-size: 0.78rem !important;
            font-weight: 600 !important;
            color: #F66016 !important;
            width: 100% !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            max-width: 100% !important;
          }

          .sp-store-right {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            width: 100% !important;
            border-top: none !important;
            padding-top: 0 !important;
            margin-top: 0.25rem !important;
          }

          .sp-change-logo-btn {
            width: 100% !important;
            height: 38px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 0.45rem !important;
            background: #ffffff !important;
            color: #F66016 !important;
            border: 1.5px solid #F7CDAB !important;
            border-radius: 10px !important;
            font-size: 0.84rem !important;
            font-weight: 700 !important;
          }

          .sp-logo-hint {
            font-size: 0.7rem !important;
            color: #8F93A5 !important;
            text-align: center !important;
            margin-top: 0.35rem !important;
          }

          /* Form & Card Flow */
          .sp-desktop-layout {
            display: flex !important;
            flex-direction: column !important;
            gap: 0.85rem !important;
            width: 100% !important;
          }

          .sp-left-col,
          .sp-right-col {
            display: flex !important;
            flex-direction: column !important;
            gap: 0.85rem !important;
            width: 100% !important;
          }

          .sp-card-header {
            margin-bottom: 0.95rem !important;
          }

          .sp-card-title {
            font-size: 1rem !important;
          }

          .sp-card-subtitle {
            font-size: 0.78rem !important;
          }

          /* Input Fields: 1 field per row, full width */
          .sp-form-row.two-col {
            display: flex !important;
            flex-direction: column !important;
            gap: 0.75rem !important;
            margin-bottom: 0.75rem !important;
          }

          .sp-field-group {
            width: 100% !important;
          }

          .sp-input-wrap,
          .sp-select-wrap {
            height: 42px !important;
            box-sizing: border-box !important;
          }

          .sp-input {
            font-size: 0.88rem !important;
            padding: 0 2.2rem 0 2.3rem !important;
            height: 100% !important;
          }

          .sp-select {
            font-size: 0.88rem !important;
            padding: 0 2.1rem 0 2.3rem !important;
            height: 100% !important;
          }

          .sp-textarea {
            font-size: 0.88rem !important;
            padding: 0.45rem 2.2rem 0.45rem 2.3rem !important;
            min-height: 64px !important;
          }

          /* Live Receipt Preview Card */
          .sp-preview-card {
            padding: 1rem 0.95rem !important;
          }

          .sp-preview-header {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            margin-bottom: 0.75rem !important;
          }

          .sp-receipt-wrapper {
            background: #FDF4EB !important;
            border: 1px solid #FADCC3 !important;
            border-radius: 12px !important;
            padding: 0.5rem 0.25rem !important;
            display: flex !important;
            justify-content: center !important;
            overflow: hidden !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }

          .sp-preview-card .realistic-thermal-receipt {
            max-width: 100% !important;
            width: 100% !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05) !important;
          }

          /* Mobile Bottom Save Settings Button */
          .sp-mobile-save-section {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 0.5rem !important;
            width: 100% !important;
            margin-top: 0.5rem !important;
            margin-bottom: 2rem !important;
            box-sizing: border-box !important;
          }

          .sp-mobile-save-btn {
            width: 100% !important;
            height: 44px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 0.5rem !important;
            background: #F66016 !important;
            color: #ffffff !important;
            border: none !important;
            border-radius: 10px !important;
            font-size: 0.92rem !important;
            font-weight: 700 !important;
            cursor: pointer !important;
            box-shadow: 0 2px 6px rgba(246, 96, 22, 0.28) !important;
            transition: background-color 0.15s ease, transform 0.1s ease !important;
          }

          .sp-mobile-save-btn:active {
            transform: scale(0.99) !important;
            background: #FA4406 !important;
          }

          .sp-mobile-save-btn:disabled {
            opacity: 0.65 !important;
            cursor: not-allowed !important;
          }

          .sp-unsaved-hint.bottom {
            display: inline-flex !important;
            align-items: center !important;
            gap: 0.35rem !important;
            font-size: 0.78rem !important;
            color: #d97706 !important;
            font-weight: 600 !important;
            text-align: center !important;
          }

          .sp-saved-badge.bottom {
            display: inline-flex !important;
            align-items: center !important;
            gap: 0.35rem !important;
            background: #ecfdf5 !important;
            color: #059669 !important;
            border: 1px solid #a7f3d0 !important;
            border-radius: 6px !important;
            padding: 0.25rem 0.65rem !important;
            font-size: 0.78rem !important;
            font-weight: 700 !important;
            text-align: center !important;
          }
        }
      `}</style>
    </div>
  )
}