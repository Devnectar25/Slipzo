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
  Settings,
  SlidersHorizontal,
  Utensils,
  ArrowRight,
  Trash2,
  AlertTriangle,
  Users,
  UserPlus,
  Mail,
  Printer,
  ShieldCheck,
  Loader2,
  Wallet,
  Banknote,
  QrCode,
  CreditCard,
  NotebookPen
} from "lucide-react"
import { PAYMENT_MODES, parsePaymentModes, shopDefaultPaymentMode } from "../lib/paymentModes"
import { isValidUpiId, normalizeUpiId } from "../lib/upi"
import { UpiQrImage } from "./common/UpiQr"

const PAYMENT_MODE_ICONS = { Cash: Banknote, UPI: QrCode, Card: CreditCard, Credit: NotebookPen }
import { useTranslation } from "react-i18next"
import { useDbTranslation } from "../lib/translator"
import { SUPPORTED_LANGUAGES, changeAppLanguage } from "../i18n/i18n"
import { call, getCachedData, setCachedData, getActivePlanDetails, getCurrentUserKey, findTemplateMatch, isHotelRestaurant, getDateLocale, isNativeApp } from "../lib/utils"
import { useToast } from "./common/Toast"
import { BUILTIN_TEMPLATES } from "./Templates"
import { RealisticReceiptView } from "./RealisticReceiptView"
import { VoiceInputButton } from "./common/VoiceInputButton"
import { BUSINESS_CATEGORIES, getBusinessCategories } from "./common/ChangeCategoryModal"
import { ManageTablesModal } from "./tables/ManageTablesModal"
import { SelectMenu } from "./common/SelectMenu"
import { Skeleton, ButtonLoader } from "./common/Skeleton"
import { StaffAccessCard, StaffMemberView } from "./StaffAccessCard"
import { PoweredBy } from "./PolicyLinks"
import "../styles/ShopProfile.css"

function compressImage(file, maxWidth = 512, maxHeight = 512, quality = 0.88) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Failed to read image file"))
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => reject(new Error("Failed to parse image file"))
      img.onload = () => {
        let { width, height } = img
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(e.target.result)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        const isPng = file.type === "image/png"
        const outputType = isPng ? "image/png" : "image/jpeg"
        const dataUrl = canvas.toDataURL(outputType, quality)
        resolve(dataUrl)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

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

// Set by "Use Template" on the Templates page (see Templates.jsx)
export const PROFILE_TEMPLATE_KEY = "slipzo-profile-template"

export function Shop({ user, setView } = {}) {
  const { t, i18n } = useTranslation()
  const { tDb } = useDbTranslation()
  const currentLang = i18n.language || "en"

  const userKey = getCurrentUserKey(user)
  const [activePlan, setActivePlan] = useState(getActivePlanDetails(userKey))
  const [hasUnsaved, setHasUnsaved] = useState(false)

  const logoInputRef = useRef(null)
  const shopNameInputRef = useRef(null)

  useEffect(() => {
    const handleUpdate = (e) => {
      const direct = e?.detail?.quota || e?.detail?.plan
      if (direct && typeof direct === 'object') {
        setActivePlan(direct)
      } else {
        setActivePlan(getActivePlanDetails(getCurrentUserKey(user)))
      }
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
      gstin: data?.gstin || "",
      gst_enabled: data?.gst_enabled !== undefined ? Boolean(Number(data.gst_enabled)) : false,
      gst_on_bill: data?.gst_on_bill !== undefined ? Boolean(Number(data.gst_on_bill)) : false,
      invoice_prefix: data?.invoice_prefix || "HB",
      invoice_sequence: data?.invoice_sequence || 7,
      invoice_format: data?.invoice_format || "PREFIX-DATE-SEQ",
      default_template_id: data?.default_template_id || "",
      default_discount: data?.default_discount !== undefined ? data.default_discount : 0,
      show_tax: data?.show_tax !== undefined ? data.show_tax : 0,
      tax_rate: data?.tax_rate !== undefined ? data.tax_rate : 0,
      logo_url: data?.logo_url || "",
      business_type: data?.business_type || "small_business",
      payment_modes: parsePaymentModes(data?.payment_modes),
      default_payment_mode: data ? shopDefaultPaymentMode(data) : "Cash",
      upi_id: data?.upi_id || "",
    }
  })


  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [ready, setReady] = useState(() => Boolean(getCachedData("/shop")))
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [isManageTablesModalOpen, setIsManageTablesModalOpen] = useState(false)
  const [isRemoveLogoModalOpen, setIsRemoveLogoModalOpen] = useState(false)
  const edited = useRef(false)

  const { success, error: toastError, warning: toastWarning } = useToast()

  const handleConfirmRemoveLogo = async () => {
    setIsRemoveLogoModalOpen(false)
    if (logoInputRef.current) {
      logoInputRef.current.value = ""
    }
    setLogoUploading(true)
    try {
      await call("/shop", {
        method: "PUT",
        body: JSON.stringify({
          ...shop,
          logo_url: ""
        })
      })
      setShop((prev) => ({ ...prev, logo_url: "" }))
      const updatedShop = { ...shop, logo_url: "" }
      setCachedData("/shop", updatedShop)
      window.dispatchEvent(new CustomEvent("slipzo_shop_updated", { detail: updatedShop }))
      success(t("profile.logoRemoved", "Shop logo removed successfully!"))
    } catch (err) {
      console.error("Failed to remove shop logo:", err)
      handleChange("logo_url", "")
    } finally {
      setLogoUploading(false)
    }
  }

  const currentCategoryObj = useMemo(() => {
    const list = getBusinessCategories(t)
    return list.find(c => c.id === (shop.business_type || "small_business")) || list[0]
  }, [shop.business_type, t, i18n?.language])

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

    if (key === "upi_id") {
      if (val && !isValidUpiId(val)) {
        errorMsg = t("upi.errInvalid", "Please enter a valid UPI ID, for example yourname@okaxis")
      }
    }

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
      const cleanDigits = val.replace(/[^0-9]/g, "")
      const mobileDigits = (cleanDigits.length === 12 && cleanDigits.startsWith("91")) ? cleanDigits.slice(2) : cleanDigits
      if (mobileDigits.length !== 10) {
        errorMsg = t("validation.phoneInvalid", `Please enter a valid 10-digit contact number (${mobileDigits.length}/10).`)
      } else if (!/^[6-9]\d{9}$/.test(mobileDigits)) {
        errorMsg = t("validation.phoneInvalidStart", "Mobile number should start with 6, 7, 8, or 9.")
      } else if (/^(\d)\1{9}$/.test(mobileDigits)) {
        errorMsg = t("validation.phoneInvalidGeneric", "Please enter a valid active mobile number.")
      }
    }

    if (key === "address" && val) {
      if (val.length > 300) {
        errorMsg = t("validation.addressMax", "Address cannot exceed 300 characters.")
      }
    }

    if (key === "invoice_prefix") {
      if (val && !/^[A-Za-z0-9]{1,8}$/.test(val)) {
        errorMsg = t("validation.prefixInvalid", "Prefix must be 1–8 letters or numbers (e.g. HB, SLP).")
      }
    }

    if (key === "invoice_sequence") {
      if (value !== "" && value !== undefined && value !== null) {
        const num = Number(value)
        if (isNaN(num) || !Number.isInteger(num) || num < 1) {
          errorMsg = t("validation.seqMin", "Sequence number must be at least 1.")
        } else if (num > 999999999) {
          errorMsg = t("validation.seqMax", "Sequence number is too large.")
        }
      }
    }

    return errorMsg
  }

  const validateAll = (dataToValidate = shop) => {
    const newErrors = {}
    const keys = ["name", "phone", "address", "invoice_prefix", "invoice_sequence", "upi_id"]

    keys.forEach((k) => {
      const err = validateField(k, dataToValidate[k], dataToValidate)
      if (err) newErrors[k] = err
    })

    setErrors(newErrors)
    return newErrors
  }

  // "Use Template" on the Templates page opens this page with that template already chosen as the
  // Receipt Template. It is an unsaved change, so the owner sees it in the live preview and presses Save.
  const applyPickedTemplate = (tplList) => {
    let picked = null
    try {
      picked = sessionStorage.getItem(PROFILE_TEMPLATE_KEY)
      sessionStorage.removeItem(PROFILE_TEMPLATE_KEY)
    } catch (_) { }
    if (!picked) return
    const match = findTemplateMatch(tplList, picked) || findTemplateMatch(BUILTIN_TEMPLATES, picked)
    if (!match) return

    setShop((prev) => {
      if (String(prev.default_template_id) === String(match.id)) return prev
      edited.current = true
      setHasUnsaved(true)
      return { ...prev, default_template_id: match.id }
    })
    success(t("profile.templatePicked", "\"{{name}}\" selected as your receipt template. Press Save to keep it.", { name: tDb(match.name || "") }))

    setTimeout(() => {
      const field = document.getElementById("receipt-template-field")
      if (!field) return
      field.scrollIntoView({ behavior: "smooth", block: "center" })
      field.classList.add("sp-field-flash")
      setTimeout(() => field.classList.remove("sp-field-flash"), 2200)
    }, 250)
  }

  useEffect(() => {
    const loadShop = async () => {
      try {
        const [data, templatesData] = await Promise.all([
          call("/shop", { noCache: true }).catch(() => null),
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
            gstin: data.gstin || "",
            gst_enabled: data.gst_enabled !== undefined ? Boolean(Number(data.gst_enabled)) : false,
            gst_on_bill: data.gst_on_bill !== undefined ? Boolean(Number(data.gst_on_bill)) : false,
            invoice_prefix: data.invoice_prefix || "HB",
            invoice_sequence: data.invoice_sequence || 7,
            invoice_format: data.invoice_format || "PREFIX-DATE-SEQ",
            default_template_id: resolvedDefaultTplId,
            default_discount: data.default_discount !== undefined ? data.default_discount : 0,
            show_tax: data.show_tax !== undefined ? data.show_tax : 0,
            tax_rate: data.tax_rate !== undefined ? data.tax_rate : 0,
            logo_url: data.logo_url || "",
            business_type: data.business_type || "small_business",
            table_count: data.table_count !== undefined ? data.table_count : 10,
            payment_modes: parsePaymentModes(data.payment_modes),
            default_payment_mode: shopDefaultPaymentMode(data),
            upi_id: data.upi_id || "",
          }
          setShop(loadedShop)
          setCachedData("/shop", loadedShop)
          window.dispatchEvent(new CustomEvent("slipzo_shop_updated", { detail: loadedShop }))
        }

        applyPickedTemplate(tplList)
      } catch (err) {
        console.error("Failed to load shop:", err)
        toastError(t("profile.err_loadShop", "Failed to load shop details"))
      } finally {
        setReady(true)
      }
    }
    loadShop()
  }, [])

  // Auto-scroll to section/field if redirected (e.g. from UPI ID / App Settings)
  useEffect(() => {
    const handleScrollTarget = (e) => {
      const targetId = e?.detail || sessionStorage.getItem("slipzo_scroll_to") || sessionStorage.getItem("slipzo_focus_target")
      if (!targetId) return

      // If target is UPI ID or payment modes, make sure UPI mode is active so the input is visible!
      if (targetId === "payment-modes-section" || targetId === "shop-upi-id") {
        setShop((prev) => {
          const currentModes = parsePaymentModes(prev.payment_modes)
          if (!currentModes.includes("UPI")) {
            return { ...prev, payment_modes: [...currentModes, "UPI"] }
          }
          return prev
        })
      }

      sessionStorage.removeItem("slipzo_scroll_to")
      sessionStorage.removeItem("slipzo_focus_target")

      const tryScroll = (attempts = 0) => {
        const inputEl = document.getElementById("shop-upi-id")
        const sectionEl = document.getElementById(targetId) || document.getElementById("payment-modes-section")
        const targetEl = (targetId === "shop-upi-id" && inputEl) ? inputEl : (inputEl || sectionEl)

        if (targetEl) {
          targetEl.scrollIntoView({ behavior: "smooth", block: "center" })
          if (targetEl.tagName === "INPUT" || targetEl.tagName === "SELECT") {
            targetEl.focus()
            targetEl.select?.()
          } else {
            const innerInput = targetEl.querySelector("input, select")
            if (innerInput) {
              innerInput.focus()
              innerInput.select?.()
            }
          }
          targetEl.classList.add("sp-field-flash")
          setTimeout(() => targetEl.classList.remove("sp-field-flash"), 2200)
        } else if (attempts < 5) {
          setTimeout(() => tryScroll(attempts + 1), 120)
        }
      }

      setTimeout(() => tryScroll(0), 150)
    }

    if (sessionStorage.getItem("slipzo_scroll_to") || sessionStorage.getItem("slipzo_focus_target")) {
      handleScrollTarget()
    }

    window.addEventListener("slipzo-scroll-to-target", handleScrollTarget)
    window.addEventListener("slipzo-scroll-to-app-settings", () => handleScrollTarget({ detail: "app-settings-section" }))
    return () => {
      window.removeEventListener("slipzo-scroll-to-target", handleScrollTarget)
      window.removeEventListener("slipzo-scroll-to-app-settings", () => handleScrollTarget({ detail: "app-settings-section" }))
    }
  }, [])

  // payment modes the shop takes; at least one stays on, and the default is always one of them
  const payModes = parsePaymentModes(shop.payment_modes)
  const payDefault = shopDefaultPaymentMode(shop)
  const updatePayment = (modes, def) => {
    edited.current = true
    setHasUnsaved(true)
    setShop((prev) => ({ ...prev, payment_modes: modes, default_payment_mode: modes.includes(def) ? def : modes[0] }))
  }
  const togglePayMode = (id) => {
    const next = payModes.includes(id) ? payModes.filter((m) => m !== id) : PAYMENT_MODES.map((m) => m.id).filter((m) => m === id || payModes.includes(m))
    if (!next.length) return
    updatePayment(next, payDefault)
  }
  const setPayDefault = (id) => updatePayment(payModes, id)

  const handleChange = (key, value) => {
    edited.current = true
    setHasUnsaved(true)
    // built on the latest values, so two changes in one click (GST off also turns off "show on bills") both count
    setShop((prev) => ({ ...prev, [key]: value }))

    const updatedShop = { ...shop, [key]: value }
    if (touched[key] || errors[key]) {
      const fieldError = validateField(key, value, updatedShop)
      setErrors((prev) => ({ ...prev, [key]: fieldError }))
    }
  }

  const handleBlur = (key) => {
    setTouched((prev) => ({ ...prev, [key]: true }))
    let val = shop[key]
    if (key === "invoice_sequence" && (val === "" || val === undefined || val === null)) {
      val = 1
      setShop((prev) => ({ ...prev, invoice_sequence: 1 }))
    }
    if (key === "invoice_prefix" && !val) {
      val = "SLP"
      setShop((prev) => ({ ...prev, invoice_prefix: "SLP" }))
    }
    const fieldError = validateField(key, val, shop)
    setErrors((prev) => ({ ...prev, [key]: fieldError }))
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    // Clear input value immediately so re-selecting same or modified file always fires onChange
    if (logoInputRef.current) {
      logoInputRef.current.value = ""
    }
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toastError(t("profile.selectValidImage", "Please select a valid image file."))
      return
    }

    setLogoUploading(true)
    try {
      // Automatically compress client-side to ensure fast, reliable uploads even for large smartphone camera photos
      const compressedDataUrl = await compressImage(file, 512, 512, 0.88)

      // Upload directly to server storage and update shop profile immediately
      const uploadRes = await call("/shop/upload-logo", {
        method: "POST",
        body: JSON.stringify({
          image: compressedDataUrl,
          name: shop.name || "shop"
        })
      })

      const newLogoUrl = uploadRes?.logo_url || compressedDataUrl
      setShop((prev) => ({ ...prev, logo_url: newLogoUrl }))

      const updatedShop = { ...getCachedData("/shop"), ...shop, logo_url: newLogoUrl }
      setCachedData("/shop", updatedShop)
      window.dispatchEvent(new CustomEvent("slipzo_shop_updated", { detail: updatedShop }))

      success(t("profile.logoUpdated", "Shop logo updated successfully!"))
    } catch (err) {
      console.error("Failed to upload shop logo:", err)
      toastError(err?.message || t("profile.logoUploadFailed", "Failed to upload shop logo. Please try again."))
    } finally {
      setLogoUploading(false)
    }
  }

  const saveShop = async (e) => {
    e?.preventDefault?.()

    const sanitizedShop = {
      ...shop,
      invoice_prefix: (shop.invoice_prefix || "SLP").trim().toUpperCase(),
      invoice_sequence: shop.invoice_sequence && !isNaN(Number(shop.invoice_sequence)) && Number(shop.invoice_sequence) >= 1 ? Number(shop.invoice_sequence) : 1,
      gstin: (shop.gstin || "").trim().toUpperCase(),
      gst_enabled: shop.gst_enabled ? 1 : 0,
      gst_on_bill: shop.gst_enabled && shop.gst_on_bill ? 1 : 0
    }

    setTouched({
      name: true,
      phone: true,
      address: true,
      invoice_prefix: true,
      invoice_sequence: true,
      upi_id: true
    })

    const validationErrors = validateAll(sanitizedShop)
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
        body: JSON.stringify(sanitizedShop)
      })
      if (updatedShop?.logo_url !== undefined) {
        setShop((prev) => ({ ...prev, logo_url: updatedShop.logo_url }))
      } else if (sanitizedShop.logo_url) {
        // Server didn't return logo_url — keep the local base64 version
        setShop((prev) => ({ ...prev, logo_url: sanitizedShop.logo_url }))
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
      width: matched.width || "58mm",
      previewData: {
        shopName: (shop.name || "HYDRABADI BIRYANI , CHOPDA").trim(),
        address: (shop.address || "Shop no:12 , Hated Road Parisar , Lasur").trim(),
        phone: (shop.phone || "8329300932").trim(),
        gst: shop.gst_on_bill ? (shop.gstin || "").trim() : "",
        showGstOnBill: Boolean(shop.gst_on_bill),
        gstSummary: shop.gst_on_bill ? { taxable: 504.24, gst: 90.76, totalRate: 18, cgst: 45.38, sgst: 45.38, groups: [{ rate: 18, cgstRate: 9, sgstRate: 9, cgst: 45.38, sgst: 45.38, taxable: 504.24, gst: 90.76 }] } : null,
        invoiceNo: liveInvoicePreview,
        date: new Date().toLocaleDateString(getDateLocale(), { day: "2-digit", month: "short", year: "numeric" }),
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
  }, [templates, shop.default_template_id, shop.name, shop.address, shop.phone, shop.gstin, shop.gst_on_bill, liveInvoicePreview, receiptMath])

  // Workers do not manage the owner's settings
  if (user?.staff_of) {
    return <StaffMemberView user={user} />
  }

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
        {/* Mobile Header Row (Visible only on mobile <= 640px) */}
        <div className="sp-store-mobile-header mobile-only">
          <div className="sp-icon-box blue">
            <Store size={18} />
          </div>
          <div className="sp-store-header-text">
            <span className="sp-store-eyebrow">{t("profile.storeIdentity", "STORE DETAILS")}</span>
            <h2 className="sp-store-name">{tDb(shop.name || "Hydrabadi Biryani , Chopda")}</h2>
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

        {/* Mobile Logo & Actions (Visible only on mobile <= 640px) */}
        <div className="sp-store-mobile-actions mobile-only">
          <div
            className={`sp-avatar-wrap ${shop.logo_url && !logoUploading ? "has-image" : ""} ${logoUploading ? "is-uploading" : ""}`}
            onClick={() => !logoUploading && logoInputRef.current?.click()}
            title={logoUploading ? t("common.uploading", "Uploading...") : t("profile.clickChangeLogo", "Click to change logo")}
          >
            {logoUploading ? (
              <Loader2 size={24} className="animate-spin" style={{ color: "#0284c7" }} />
            ) : shop.logo_url ? (
              <img src={shop.logo_url} alt="Shop Logo" className="sp-avatar-img" />
            ) : (
              <span className="sp-avatar-letter">{shop.name ? shop.name.trim().charAt(0).toUpperCase() : "H"}</span>
            )}
          </div>
          <div className="sp-mobile-logo-btns-col">
            <div className="sp-logo-buttons-group">
              <button
                type="button"
                className="sp-change-logo-btn"
                disabled={logoUploading}
                onClick={() => logoInputRef.current?.click()}
              >
                {logoUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />} {logoUploading ? t("common.uploading", "Uploading...") : t("profile.changeLogo", "Change Logo")}
              </button>
              <button
                type="button"
                className="sp-remove-logo-btn"
                disabled={logoUploading || !shop.logo_url}
                onClick={() => setIsRemoveLogoModalOpen(true)}
              >
                <Trash2 size={14} /> {t("profile.removeLogo", "Remove Logo")}
              </button>
            </div>
            <span className="sp-logo-hint">{t("profile.logoHint", "Recommended size: 512 × 512")}</span>
          </div>
        </div>

        {/* Mobile Details: Subtext & Pills */}
        <div className="sp-store-mobile-details mobile-only">
          <p className="sp-store-subtext">{t("profile.storeSubtext", "These details will appear on your thermal receipt and invoice.")}</p>
          {(shop.phone || shop.address) && (
            <div className="sp-store-pills-row">
              {shop.phone && (
                <span className="sp-info-pill">
                  <Phone size={13} /> <span className="sp-pill-text">{shop.phone}</span>
                </span>
              )}
              {shop.address && (
                <span className="sp-info-pill" title={shop.address}>
                  <MapPin size={13} /> <span className="sp-pill-text">{shop.address}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Desktop Content (Visible only on desktop > 640px) */}
        <div className="sp-store-desktop-content desktop-only">
          <div className="sp-store-left">
            <div
              className={`sp-avatar-wrap ${shop.logo_url && !logoUploading ? "has-image" : ""} ${logoUploading ? "is-uploading" : ""}`}
              onClick={() => !logoUploading && logoInputRef.current?.click()}
              title={logoUploading ? t("common.uploading", "Uploading...") : t("profile.clickChangeLogo", "Click to change logo")}
            >
              {logoUploading ? (
                <Loader2 size={28} className="animate-spin" style={{ color: "#0284c7" }} />
              ) : shop.logo_url ? (
                <img src={shop.logo_url} alt="Shop Logo" className="sp-avatar-img" />
              ) : (
                <span className="sp-avatar-letter">{shop.name ? shop.name.trim().charAt(0).toUpperCase() : "H"}</span>
              )}
            </div>

            <div className="sp-store-info">
              <span className="sp-store-eyebrow">{t("profile.storeIdentity", "STORE DETAILS")}</span>
              <div className="sp-store-name-row">
                <h2 className="sp-store-name">{tDb(shop.name || "Hydrabadi Biryani , Chopda")}</h2>
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
                    <Phone size={13} /> <span className="sp-pill-text">{shop.phone}</span>
                  </span>
                )}
                {shop.address && (
                  <span className="sp-info-pill" title={shop.address}>
                    <MapPin size={13} /> <span className="sp-pill-text">{shop.address}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="sp-store-right">
            <div className="sp-logo-buttons-group">
              <button
                type="button"
                className="sp-change-logo-btn"
                disabled={logoUploading}
                onClick={() => logoInputRef.current?.click()}
              >
                {logoUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />} {logoUploading ? t("common.uploading", "Uploading...") : t("profile.changeLogo", "Change Logo")}
              </button>
              <button
                type="button"
                className="sp-remove-logo-btn"
                disabled={logoUploading || !shop.logo_url}
                onClick={() => setIsRemoveLogoModalOpen(true)}
              >
                <Trash2 size={14} /> {t("profile.removeLogo", "Remove Logo")}
              </button>
            </div>
            <span className="sp-logo-hint">{t("profile.logoHint", "Recommended size: 512 × 512")}</span>
          </div>
        </div>

        <input
          type="file"
          ref={logoInputRef}
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleLogoUpload}
        />
      </div>

      {/* Remove Shop Logo Confirmation Modal */}
      {isRemoveLogoModalOpen && (
        <div
          onClick={() => setIsRemoveLogoModalOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            paddingBottom: "calc(1rem + var(--app-safe-bottom))",
            overscrollBehavior: "contain",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "420px",
              boxShadow: "0 20px 25px -5px rgba(15, 23, 42, 0.18), 0 8px 10px -6px rgba(15, 23, 42, 0.08)",
              border: "1px solid #fecdd3",
              overflow: "hidden",
              animation: "scaleUp 0.18s ease",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "1.2rem 1.25rem 1rem" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#ffe4e6", color: "#e11d48", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <AlertTriangle size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.3rem" }}>
                  {t("profile.removeLogoTitle", "Remove shop logo?")}
                </h3>
                <p style={{ fontSize: "0.82rem", color: "#64748b", margin: 0, lineHeight: 1.45 }}>
                  {t("profile.removeLogoDesc", "Are you sure you want to remove your shop logo? It will no longer appear on your receipts.")}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", padding: "0.85rem 1.25rem", background: "#f8fafc", borderTop: "1px solid #f1f5f9" }}>
              <button
                type="button"
                onClick={() => setIsRemoveLogoModalOpen(false)}
                style={{
                  padding: "0.6rem 1.1rem",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  borderRadius: "9px",
                  border: "1.5px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#334155",
                  cursor: "pointer",
                  minWidth: "80px",
                }}
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveLogo}
                style={{
                  padding: "0.6rem 1.1rem",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  borderRadius: "9px",
                  border: "none",
                  background: "#e11d48",
                  color: "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  minWidth: "80px",
                }}
              >
                <Trash2 size={14} />
                {t("profile.removeLogo", "Remove Logo")}
              </button>
            </div>
          </div>
        </div>
      )}

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
                <p className="sp-card-subtitle">{t("profile.businessDetailsSub", "Basic information & category of your shop")}</p>
              </div>
            </div>

            {/* Shop Category / Business Type Section */}
            <div className="sp-field-group full-width" style={{ marginBottom: "1.25rem" }}>
              <label className="sp-label" style={{ marginBottom: "0.5rem" }}>
                {t("profile.shopCategory", "Shop Category / Business Type")} <span className="sp-req">*</span>
              </label>

              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.95rem 1.15rem",
                borderRadius: "12px",
                border: "1.5px solid #bae6fd",
                background: "linear-gradient(145deg, #f0f9ff 0%, #e0f2fe 100%)",
                boxShadow: "0 2px 8px rgba(2, 132, 199, 0.08)",
                flexWrap: "wrap",
                gap: "0.75rem"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                  <span style={{ fontSize: "2rem", lineHeight: 1 }}>{currentCategoryObj.icon}</span>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "1rem", fontWeight: "700", color: "#0369a1" }}>
                        {currentCategoryObj.label}
                      </span>
                      <span style={{ fontSize: "0.7rem", background: "#0284c7", color: "#ffffff", padding: "2px 8px", borderRadius: "10px", fontWeight: "700" }}>
                        {t("profile.activeCategory", "Active Category")}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "3px" }}>
                      {currentCategoryObj.desc}
                    </div>
                  </div>
                </div>
              </div>

              {isHotelRestaurant(shop) && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1rem",
                  borderRadius: "10px",
                  background: "#ffffff",
                  border: "1.5px solid #e0f2fe",
                  marginTop: "0.6rem",
                  flexWrap: "wrap",
                  gap: "0.5rem"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Utensils size={16} color="#0284c7" />
                    <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#0f172a" }}>
                      {shop.table_count || 10} {t("tables.tablesConfigured", "Tables Configured")}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={() => setIsManageTablesModalOpen(true)}
                      style={{
                        background: "#f0f9ff",
                        color: "#0284c7",
                        border: "1px solid #bae6fd",
                        borderRadius: "8px",
                        padding: "0.35rem 0.75rem",
                        fontSize: "0.78rem",
                        fontWeight: "700",
                        cursor: "pointer"
                      }}
                    >
                      {t("tables.manageTables", "Manage Tables")}
                    </button>
                    {setView && (
                      <button
                        type="button"
                        onClick={() => setView("tables")}
                        style={{
                          background: "#0284c7",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "8px",
                          padding: "0.35rem 0.75rem",
                          fontSize: "0.78rem",
                          fontWeight: "700",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem"
                        }}
                      >
                        <span>{t("tables.openTables", "Open Table Billing")}</span>
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              <span className="sp-helper-text" style={{ marginTop: "0.4rem" }}>
                {t("profile.categoryHelper", "Slipzen automatically tailors your product catalog recommendations to your selected category.")}
              </span>
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
                  <span className="sp-helper-text">{shop.phone ? t("shopSetup.digitsCount", "{{n}}/10 digits", { n: shop.phone.length }) : t("profile.phoneHelper", "10-digit mobile number for receipt header")}</span>
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

          {/* Card 2: GST & Tax Settings */}
          <div className="sp-card" id="gst-settings-section">
            <div className="sp-card-header">
              <div className="sp-icon-box emerald" style={{ background: "#ecfdf5", color: "#059669" }}>
                <Percent size={18} />
              </div>
              <div className="sp-card-titles">
                <h3 className="sp-card-title">{t("profile.gstSettingsTitle", "GST & Tax Settings")}</h3>
                <p className="sp-card-subtitle">{t("profile.gstSettingsSub", "Product GST rates, bill tax breakdown & GSTIN")}</p>
              </div>
            </div>

            {/* Toggle 1: Enable GST for Products */}
            <div className="sp-toggle-card" style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.9rem 1rem",
              borderRadius: "10px",
              background: shop.gst_enabled ? "#f0fdf4" : "#f8fafc",
              border: `1.5px solid ${shop.gst_enabled ? "#86efac" : "#e2e8f0"}`,
              marginBottom: shop.gst_enabled ? "1rem" : "0",
              transition: "all 0.2s ease"
            }}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: "0.75rem" }}>
                <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.2rem" }}>
                  {t("profile.enableGst", "Enable GST for Products")}
                </div>
                <div style={{ fontSize: "0.78rem", color: "#64748b", lineHeight: 1.35 }}>
                  {t("profile.enableGstSub", "Assign GST percentages (0%, 5%, 12%, 18%, 28%) to products in your inventory.")}
                </div>
              </div>
              <label className="sp-switch" style={{ position: "relative", display: "inline-block", width: "44px", height: "24px", flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={Boolean(shop.gst_enabled)}
                  onChange={(e) => {
                    const checked = e.target.checked
                    handleChange("gst_enabled", checked)
                    if (!checked) handleChange("gst_on_bill", false)
                  }}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span className={`sp-slider ${shop.gst_enabled ? "active" : ""}`} style={{
                  position: "absolute",
                  cursor: "pointer",
                  inset: 0,
                  backgroundColor: shop.gst_enabled ? "#10b981" : "#cbd5e1",
                  borderRadius: "24px",
                  transition: "0.25s"
                }}>
                  <span style={{
                    position: "absolute",
                    content: '""',
                    height: "18px",
                    width: "18px",
                    left: shop.gst_enabled ? "23px" : "3px",
                    bottom: "3px",
                    backgroundColor: "white",
                    borderRadius: "50%",
                    transition: "0.25s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                  }} />
                </span>
              </label>
            </div>

            {shop.gst_enabled && (
              <div className="sp-gst-extended-options" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Toggle 2: Show GST breakdown on Bill */}
                <div className="sp-toggle-card" style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.85rem 1rem",
                  borderRadius: "10px",
                  background: shop.gst_on_bill ? "#eff6ff" : "#f8fafc",
                  border: `1.5px solid ${shop.gst_on_bill ? "#93c5fd" : "#e2e8f0"}`,
                  transition: "all 0.2s ease"
                }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
                      <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "#0f172a" }}>
                        {t("profile.showGstOnBill", "Mention / Show GST on Bills")}
                      </span>
                      <span style={{
                        fontSize: "0.68rem",
                        padding: "1px 6px",
                        borderRadius: "6px",
                        fontWeight: 700,
                        background: shop.gst_on_bill ? "#dbeafe" : "#f1f5f9",
                        color: shop.gst_on_bill ? "#1d4ed8" : "#64748b"
                      }}>
                        {shop.gst_on_bill ? t("common.active", "Active") : t("common.off", "OFF")}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#64748b", lineHeight: 1.35 }}>
                      {shop.gst_on_bill
                        ? t("profile.showGstOnBillActive", "Printed bills will display itemized GST breakdown & tax analysis.")
                        : t("profile.showGstOnBillInactive", "Bills charge total price directly without mentioning GST breakdown.")}
                    </div>
                  </div>
                  <label className="sp-switch" style={{ position: "relative", display: "inline-block", width: "44px", height: "24px", flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      checked={Boolean(shop.gst_on_bill)}
                      onChange={(e) => handleChange("gst_on_bill", e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span className={`sp-slider ${shop.gst_on_bill ? "active" : ""}`} style={{
                      position: "absolute",
                      cursor: "pointer",
                      inset: 0,
                      backgroundColor: shop.gst_on_bill ? "#0284c7" : "#cbd5e1",
                      borderRadius: "24px",
                      transition: "0.25s"
                    }}>
                      <span style={{
                        position: "absolute",
                        content: '""',
                        height: "18px",
                        width: "18px",
                        left: shop.gst_on_bill ? "23px" : "3px",
                        bottom: "3px",
                        backgroundColor: "white",
                        borderRadius: "50%",
                        transition: "0.25s",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                      }} />
                    </span>
                  </label>
                </div>

                {/* GSTIN Input */}
                <div className="sp-field-group">
                  <label className="sp-label">{t("profile.gstin", "Shop GSTIN Number")}</label>
                  <div className="sp-input-wrap">
                    <input
                      data-testid="shop-gstin-input"
                      type="text"
                      maxLength={15}
                      placeholder={t("profile.gstinPlaceholder", "e.g. 27AAAAA0000A1Z5")}
                      value={shop.gstin || ""}
                      onChange={(e) => handleChange("gstin", e.target.value.toUpperCase())}
                      className="sp-input"
                      style={{ textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}
                    />
                  </div>
                  <span className="sp-helper-text">
                    {t("profile.gstinHelper", "Optional 15-character GST identification number for receipt headers.")}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Invoice Sequencing */}
          <div className="sp-card sp-sequencing-card">
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
                  {t("profile.startingSequence", "Next Invoice Number")}
                </label>
                <div className={`sp-input-wrap ${touched.invoice_sequence && errors.invoice_sequence ? "error" : ""}`}>
                  <span className="sp-hash-adornment">#</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={shop.invoice_sequence || ""}
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
              {(() => {
                const pfx = shop.invoice_prefix || "HB"
                const seq = String(shop.invoice_sequence || 1).padStart(4, "0")
                const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "")
                return (
                  <SelectMenu
                    icon={SlidersHorizontal}
                    ariaLabel={t("profile.numberFormat", "Numbering Format Pattern")}
                    value={shop.invoice_format}
                    onChange={(v) => handleChange("invoice_format", v)}
                    options={[
                      { value: "PREFIX-DATE-SEQ", label: `${t("profile.formatPrefixDateSeq", "Prefix + Date + Number")} (e.g. ${pfx}-${ymd}-${seq})` },
                      { value: "PREFIX-SHORTDATE-SEQ", label: `${t("profile.formatPrefixYearSeq", "Prefix + Short Date + Number")} (e.g. ${pfx}-${ymd.slice(2)}-${seq})` },
                      { value: "PREFIX-SEQ", label: `${t("profile.formatPrefixSeq", "Prefix + Number")} (e.g. ${pfx}-${seq})` },
                      { value: "SEQ", label: `${t("profile.formatSeqOnly", "Number Only")} (e.g. ${seq})` }
                    ]}
                  />
                )
              })()}
            </div>

            <div style={{
              marginTop: "0.85rem",
              padding: "0.65rem 0.95rem",
              borderRadius: "10px",
              background: "#f0f9ff",
              border: "1px solid #bae6fd",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.5rem"
            }}>
              <span style={{ fontSize: "0.78rem", color: "#0369a1", fontWeight: 600 }}>
                {t("profile.sampleInvoiceNumber", "Preview Next Bill No.")}:
              </span>
              <span style={{ fontSize: "0.88rem", fontWeight: 800, color: "#0284c7", fontFamily: "monospace", letterSpacing: "0.5px" }}>
                {liveInvoicePreview}
              </span>
            </div>
          </div>

          {/* Card: Payment modes the shop takes (shown in the bill's Payment Mode list) */}
          <div className="sp-card" id="payment-modes-section">
            <div className="sp-card-header">
              <div className="sp-icon-box green">
                <Wallet size={18} />
              </div>
              <div className="sp-card-titles">
                <h3 className="sp-card-title">{t("profile.paymentModesTitle", "Payment Modes")}</h3>
                <p className="sp-card-subtitle">{t("profile.paymentModesSub", "Choose how customers can pay you. Only these show on your bills.")}</p>
              </div>
            </div>

            <div className="sp-pay-grid" role="group" aria-label={t("profile.paymentModesTitle", "Payment Modes")}>
              {PAYMENT_MODES.map((m) => {
                const Icon = PAYMENT_MODE_ICONS[m.id]
                const on = payModes.includes(m.id)
                const isDefault = payDefault === m.id
                const onlyOne = on && payModes.length === 1
                return (
                  <div key={m.id} className={`sp-pay-option ${on ? "on" : ""}`}>
                    <button
                      type="button"
                      className="sp-pay-toggle"
                      role="checkbox"
                      aria-checked={on}
                      disabled={onlyOne}
                      title={onlyOne ? t("profile.paymentModesKeepOne", "Keep at least one payment mode") : undefined}
                      data-testid={`pay-mode-${m.id}`}
                      onClick={() => togglePayMode(m.id)}
                    >
                      <span className="sp-pay-icon"><Icon size={18} /></span>
                      <span className="sp-pay-name">{t(m.labelKey, m.label)}</span>
                      <span className="sp-pay-check">{on && <Check size={13} strokeWidth={3} />}</span>
                    </button>
                    {on && (
                      <button
                        type="button"
                        className={`sp-pay-default ${isDefault ? "is-default" : ""}`}
                        onClick={() => setPayDefault(m.id)}
                        aria-pressed={isDefault}
                        data-testid={`pay-default-${m.id}`}
                      >
                        {isDefault ? t("profile.paymentDefault", "Default") : t("profile.paymentMakeDefault", "Make default")}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            <span className="sp-helper-text" style={{ display: "block", marginTop: "0.6rem" }}>
              {t("profile.paymentModesHelper", "New bills start with the default mode. Remember to save.")}
            </span>

            {/* UPI ID: bills show a QR code made from it, with the exact amount, when UPI is chosen */}
            {payModes.includes("UPI") && (
              <div className="sp-field-group full-width" style={{ marginTop: "0.9rem" }}>
                <label className="sp-label" htmlFor="shop-upi-id">{t("upi.idLabel", "UPI ID for payment QR")}</label>
                <div className={`sp-input-wrap ${touched.upi_id && errors.upi_id ? "error" : ""}`}>
                  <QrCode size={16} className="sp-input-icon" />
                  <input
                    id="shop-upi-id"
                    type="text"
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={100}
                    placeholder="yourname@okaxis"
                    value={shop.upi_id || ""}
                    onChange={(e) => handleChange("upi_id", e.target.value.replace(/\s/g, ""))}
                    onBlur={() => handleBlur("upi_id")}
                    className="sp-input"
                    data-testid="shop-upi-id"
                  />
                </div>
                {touched.upi_id && errors.upi_id ? (
                  <span className="sp-field-error"><AlertCircle size={12} /> {errors.upi_id}</span>
                ) : !shop.upi_id ? (
                  <span className="sp-field-error" style={{ color: "#b45309" }}>
                    <AlertCircle size={12} /> {t("upi.idMissing", "Add your UPI ID so bills can show a payment QR.")}
                  </span>
                ) : (
                  <span className="sp-helper-text">{t("upi.idHelper", "Find it in your UPI app (GPay, PhonePe, Paytm) under your profile.")}</span>
                )}
                {isValidUpiId(shop.upi_id) && (
                  <div className="upi-id-preview">
                    <UpiQrImage upiId={shop.upi_id} payeeName={shop.name} size={84} />
                    <div className="upi-id-preview-text">
                      <strong>{t("upi.previewTitle", "Your payment QR is ready")}</strong>
                      <span>{normalizeUpiId(shop.upi_id)}</span>
                      <span>{t("upi.previewText", "On each bill it carries the exact amount to pay.")}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 3: App Settings */}
          <div className="sp-card" id="app-settings-section">
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
              <SelectMenu
                icon={Globe}
                ariaLabel={t("profile.languageTitle", "App Language")}
                value={currentLang}
                onChange={handleLanguageSelect}
                options={SUPPORTED_LANGUAGES.map((l) => ({
                  value: l.code,
                  label: `${l.flag ? `${l.flag} ` : ""}${l.nativeName} (${l.label})`
                }))}
              />
              <span className="sp-helper-text">{t("profile.chooseLang", "Choose your preferred application language")}</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Receipt Preview & Receipt Settings, Staff & Sub-Users */}
        <div className="sp-right-col">
          {/* Card 1: Live Receipt Preview with Receipt Settings */}
          <div className="sp-preview-card">
            <div className="sp-card-header" style={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.95rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div className="sp-icon-box blue">
                  <Receipt size={18} />
                </div>
                <div className="sp-card-titles">
                  <h3 className="sp-card-title">{t("profile.receiptDefaults", "Receipt Settings")}</h3>
                  <p className="sp-card-subtitle">{t("profile.receiptDefaultsSub", "Customize how your bills look")}</p>
                </div>
              </div>

              <div className="sp-live-badge" style={{ background: "#f0f9ff", border: "1px solid #bae6fd", padding: "0.25rem 0.65rem", borderRadius: "999px" }}>
                <span className="sp-pulse-dot" /> {t("profile.livePreview", "Live Preview")}
              </div>
            </div>

            <div id="receipt-template-field" className="sp-field-group full-width" style={{ marginBottom: "1rem" }}>
              <label className="sp-label">{t("profile.receiptTemplate", "Receipt Template")}</label>
              <SelectMenu
                icon={Receipt}
                ariaLabel={t("profile.receiptTemplate", "Receipt Template")}
                value={shop.default_template_id}
                onChange={(v) => handleChange("default_template_id", String(v))}
                options={templates.map((tItem) => ({
                  value: tItem.id,
                  label: `${tDb(tItem.name)} (${tItem.width || "58mm"})`
                }))}
              />
              <span className="sp-helper-text">{t("profile.templateHelper", "Layout loaded by default when creating bills")}</span>
            </div>

            <div className="sp-receipt-wrapper">
              <RealisticReceiptView template={selectedTemplate} />
            </div>
          </div>

          {/* Card 2: Staff & Sub-Users (Printer Access Sharing) */}
          <StaffAccessCard user={user} />
        </div>

        {/* Mobile-Only Bottom Save Settings Button */}
        <div className="sp-mobile-save-section mobile-only" style={{ gridColumn: "1 / -1", width: "100%" }}>
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
      </form>      <style>{`
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
          border: 1.5px solid #bae6fd;
          border-radius: 16px;
          padding: 1.15rem 1.5rem;
          box-shadow: 0 1px 3px rgba(12, 31, 65, 0.04);
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }

        .sp-store-desktop-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          width: 100%;
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
          background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          flex-shrink: 0;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(2, 132, 199, 0.28);
          overflow: hidden;
        }

        .sp-avatar-wrap.has-image {
          background: #f8fafc !important;
          box-shadow: 0 0 0 2px #e2e8f0 !important;
          border: none !important;
          overflow: hidden;
        }

        .sp-avatar-wrap.is-uploading {
          background: #f0f9ff !important;
          box-shadow: 0 0 0 2px #38bdf8 !important;
          cursor: wait !important;
        }

        .sp-avatar-letter {
          font-size: 1.75rem;
          font-weight: 800;
          line-height: 1;
        }

        .sp-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 18px;
          background: #f8fafc !important;
          display: block;
        }

        .sp-camera-btn {
          position: absolute;
          bottom: -4px;
          right: -4px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #0284c7;
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
          background: #0369a1;
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
          color: #0284c7;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          padding: 2px;
          border-radius: 4px;
          transition: background-color 0.15s;
        }

        .sp-edit-icon-btn:hover {
          background: #e0f2fe;
          color: #0369a1;
        }

        .sp-verified-badge {
          background: #f0f9ff;
          color: #0284c7;
          border: 1px solid #bae6fd;
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
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 8px;
          padding: 0.28rem 0.7rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: #0284c7;
          max-width: 420px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sp-pill-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-width: 0;
        }

        .sp-store-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          flex-shrink: 0;
          gap: 0.35rem;
        }

        .sp-logo-buttons-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .sp-change-logo-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: #ffffff;
          color: #0284c7;
          border: 1.5px solid #bae6fd;
          border-radius: 10px;
          padding: 0.55rem 1.15rem;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .sp-change-logo-btn:hover {
          background: #e0f2fe;
          border-color: #0284c7;
          color: #0369a1;
        }

        .sp-remove-logo-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: #ffffff;
          color: #e11d48;
          border: 1.5px solid #fecdd3;
          border-radius: 10px;
          padding: 0.55rem 1.15rem;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .sp-remove-logo-btn:hover {
          background: #fff1f2;
          border-color: #fda4af;
        }

        .sp-change-logo-btn:disabled,
        .sp-remove-logo-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          pointer-events: none;
        }

        .sp-logo-hint {
          font-size: 0.72rem;
          color: #8F93A5;
          margin-top: 0.15rem;
        }

        /* Two-Column Desktop Grid Layout */
        .sp-desktop-layout {
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: 1.25rem;
          align-items: start;
        }

        .sp-left-col {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          min-width: 0;
        }

        .sp-right-col {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          min-width: 0;
        }

        .sp-sequencing-card,
        .sp-subusers-card {
          display: flex;
          flex-direction: column;
          height: auto;
          box-sizing: border-box;
        }

        /* Reusable Card Style */
        .sp-card {
          background: #ffffff;
          border: 1.5px solid #bae6fd;
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
          background: #f0f9ff;
          border: 1.5px solid #bae6fd;
          color: #0284c7;
        }

        .sp-pay-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.6rem;
        }
        .sp-pay-option {
          display: flex;
          flex-direction: column;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          background: #f8fafc;
          overflow: hidden;
          transition: border-color 0.15s ease, background-color 0.15s ease;
        }
        .sp-pay-option.on {
          border-color: #7dd3fc;
          background: #f0f9ff;
        }
        .sp-pay-toggle {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          width: 100%;
          padding: 0.7rem 0.75rem;
          border: none;
          background: transparent;
          text-align: left;
          cursor: pointer;
        }
        .sp-pay-toggle:disabled { cursor: not-allowed; }
        .sp-pay-icon {
          flex: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: #e2e8f0;
          color: #64748b;
        }
        .sp-pay-option.on .sp-pay-icon { background: #e0f2fe; color: #0284c7; }
        .sp-pay-name {
          flex: 1;
          min-width: 0;
          font-size: 0.88rem;
          font-weight: 700;
          color: #475569;
        }
        .sp-pay-option.on .sp-pay-name { color: #0c1f41; }
        .sp-pay-check {
          flex: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border: 1.5px solid #cbd5e1;
          border-radius: 6px;
          background: #ffffff;
          color: #ffffff;
        }
        .sp-pay-option.on .sp-pay-check { border-color: #0284c7; background: #0284c7; }
        .sp-pay-default {
          margin: 0 0.75rem 0.65rem;
          padding: 0.25rem 0.6rem;
          align-self: flex-start;
          border: 1px dashed #93c5fd;
          border-radius: 999px;
          background: #ffffff;
          font-size: 0.72rem;
          font-weight: 700;
          color: #0369a1;
          cursor: pointer;
        }
        .sp-pay-default.is-default {
          border-style: solid;
          border-color: #0284c7;
          background: #0284c7;
          color: #ffffff;
          cursor: default;
        }
        .sp-icon-box.green {
          background: #f0f9ff;
          border: 1.5px solid #bae6fd;
          color: #0284c7;
        }

        .sp-icon-box.purple {
          background: #f0f9ff;
          border: 1.5px solid #bae6fd;
          color: #0284c7;
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
          border-color: #0284c7;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
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
          padding: 0;
        }

        .sp-textarea-icon {
          position: absolute;
          left: 0.85rem;
          top: 0.65rem;
          color: #8F93A5;
          pointer-events: none;
        }

        .sp-textarea {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          padding: 0.6rem 2.6rem 0.6rem 2.85rem;
          font-size: 0.88rem;
          color: #0C1F41;
          resize: vertical;
          min-height: 68px;
          font-family: inherit;
          box-sizing: border-box;
          line-height: 1.45;
        }

        .sp-voice-wrap {
          position: absolute;
          right: 0.55rem;
          display: flex;
          align-items: center;
        }

        .sp-voice-wrap.textarea-voice {
          top: 0.55rem;
          right: 0.65rem;
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
          background: #e0f2fe;
          border-color: #bae6fd;
          color: #0284c7;
        }

        .sp-preset-btn.active {
          background: #0284c7;
          border-color: #0284c7;
          color: #ffffff;
        }

        /* Live Receipt Preview Card */
        .sp-preview-card {
          background: #ffffff;
          border: 1.5px solid #bae6fd;
          border-radius: 16px;
          padding: 1.25rem 1.35rem;
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
          color: #0284c7;
        }

        .sp-pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #0ea5e9;
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.25);
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
          border-color: #0284c7;
        }

        .sp-receipt-wrapper {
          background: #f0f9ff;
          border: 1px solid #bae6fd;
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
          display: flex !important;
        }

        /* Compact Attractive Top-Right Save Settings Button & Alerts */
        .sp-top-save-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: #0284c7;
          color: #ffffff;
          border: none;
          border-radius: 9px;
          padding: 0.52rem 1.25rem;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(2, 132, 199, 0.28);
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .sp-top-save-btn:hover:not(:disabled) {
          background: #0369a1;
          box-shadow: 0 4px 10px rgba(2, 132, 199, 0.38);
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
          background: #f0f9ff;
          color: #0284c7;
          border: 1px solid #bae6fd;
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
            display: flex !important;
            flex-direction: column !important;
            gap: 1.15rem !important;
            width: 100% !important;
          }

          .sp-left-col,
          .sp-right-col {
            width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 1.15rem !important;
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
            padding: 0.65rem 0.55rem calc(85px + var(--app-safe-bottom)) !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
          }

          /* Header: Compact, left title only, top Save Settings hidden */
          .sp-header {
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0.2rem !important;
            margin-bottom: 0 !important;
            width: 100% !important;
          }

          .sp-header-right {
            display: none !important;
          }

          .sp-header-left {
            width: 100% !important;
          }

          .sp-title {
            font-size: 1.35rem !important;
            font-weight: 800 !important;
            color: #0C1F41 !important;
            margin: 0 0 0.15rem 0 !important;
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
            border: 1.5px solid #bae6fd !important;
            border-radius: 14px !important;
            padding: 0.95rem 0.85rem !important;
            box-shadow: 0 1px 3px rgba(12, 31, 65, 0.04) !important;
            width: 100% !important;
            box-sizing: border-box !important;
            margin-bottom: 0 !important;
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
            gap: 0.65rem !important;
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
            font-size: 0.68rem !important;
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
            margin: 0 0 0.25rem 0 !important;
            line-height: 1.25 !important;
            word-break: break-word !important;
          }

          .sp-verified-badge {
            display: inline-flex !important;
            align-items: center !important;
            gap: 0.25rem !important;
            background: #f0f9ff !important;
            color: #0284c7 !important;
            border: 1px solid #bae6fd !important;
            border-radius: 9999px !important;
            padding: 0.15rem 0.5rem !important;
            font-size: 0.72rem !important;
            font-weight: 700 !important;
            width: fit-content !important;
          }

          .sp-edit-icon-btn {
            color: #0284c7 !important;
            padding: 4px !important;
            background: transparent !important;
            border: none !important;
            cursor: pointer !important;
            flex-shrink: 0 !important;
          }

          /* Mobile Logo & Buttons Row */
          .sp-store-mobile-actions {
            display: flex !important;
            align-items: center !important;
            gap: 0.85rem !important;
            width: 100% !important;
          }

          .sp-avatar-wrap {
            width: 54px !important;
            height: 54px !important;
            border-radius: 14px !important;
            flex-shrink: 0 !important;
            overflow: hidden !important;
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

          .sp-mobile-logo-btns-col {
            display: flex !important;
            flex-direction: column !important;
            gap: 0.25rem !important;
            flex: 1 !important;
            min-width: 0 !important;
          }

          .sp-logo-buttons-group {
            display: flex !important;
            flex-direction: row !important;
            gap: 0.45rem !important;
            width: 100% !important;
          }

          .sp-change-logo-btn,
          .sp-remove-logo-btn {
            flex: 1 !important;
            min-width: 0 !important;
            height: 38px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 0.35rem !important;
            border-radius: 10px !important;
            font-size: 0.82rem !important;
            font-weight: 700 !important;
            padding: 0 0.5rem !important;
            white-space: nowrap !important;
          }

          .sp-change-logo-btn {
            background: #ffffff !important;
            color: #0284c7 !important;
            border: 1.5px solid #bae6fd !important;
          }

          .sp-remove-logo-btn {
            background: #ffffff !important;
            color: #e11d48 !important;
            border: 1.5px solid #fecdd3 !important;
          }

          .sp-change-logo-btn:disabled,
        .sp-remove-logo-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          pointer-events: none;
        }

        .sp-logo-hint {
            font-size: 0.7rem !important;
            color: #8F93A5 !important;
            text-align: left !important;
            margin: 0 !important;
          }

          /* Mobile Store Subtext & Contact Pills */
          .sp-store-mobile-details {
            display: flex !important;
            flex-direction: column !important;
            gap: 0.5rem !important;
            width: 100% !important;
          }

          .sp-store-subtext {
            font-size: 0.8rem !important;
            color: #74788A !important;
            margin: 0 !important;
            line-height: 1.4 !important;
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
            background: #f0f9ff !important;
            border: 1px solid #bae6fd !important;
            border-radius: 8px !important;
            padding: 0.4rem 0.65rem !important;
            font-size: 0.78rem !important;
            font-weight: 600 !important;
            color: #0284c7 !important;
            width: 100% !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            max-width: 100% !important;
          }

          .sp-pill-text {
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            min-width: 0 !important;
            flex: 1 !important;
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
            height: 44px !important;
            box-sizing: border-box !important;
            width: 100% !important;
          }

          .sp-input {
            font-size: 0.88rem !important;
            padding: 0 2.2rem 0 2.3rem !important;
            height: 100% !important;
            width: 100% !important;
          }

          .sp-select {
            font-size: 0.86rem !important;
            padding: 0 2.1rem 0 2.3rem !important;
            height: 100% !important;
            width: 100% !important;
          }

          .sp-textarea {
            font-size: 0.88rem !important;
            padding: 0.6rem 2.6rem 0.6rem 2.85rem !important;
            min-height: 68px !important;
            width: 100% !important;
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
            background: #f0f9ff !important;
            border: 1px solid #bae6fd !important;
            border-radius: 12px !important;
            padding: 0.5rem 0.25rem !important;
            display: flex !important;
            justify-content: center !important;
            overflow-x: auto !important;
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
            margin-bottom: 0 !important;
            box-sizing: border-box !important;
          }

          .sp-mobile-save-btn {
            width: 100% !important;
            height: 46px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 0.5rem !important;
            background: #0284c7 !important;
            color: #ffffff !important;
            border: none !important;
            border-radius: 10px !important;
            font-size: 0.94rem !important;
            font-weight: 700 !important;
            cursor: pointer !important;
            box-shadow: 0 2px 6px rgba(2, 132, 199, 0.28) !important;
            transition: background-color 0.15s ease, transform 0.15s ease !important;
          }

          .sp-mobile-save-btn:active {
            transform: scale(0.99) !important;
            background: #0369a1 !important;
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
            background: #f0f9ff !important;
            color: #0284c7 !important;
            border: 1px solid #bae6fd !important;
            border-radius: 6px !important;
            padding: 0.25rem 0.65rem !important;
            font-size: 0.78rem !important;
            font-weight: 700 !important;
            text-align: center !important;
          }
        }

        @media (max-width: 360px) {
          .shop-page {
            padding: 0.5rem 0.35rem calc(80px + var(--app-safe-bottom)) !important;
          }

          .sp-card,
          .sp-store-details-card,
          .sp-preview-card {
            padding: 0.75rem 0.65rem !important;
          }

          .sp-store-mobile-actions {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
          }

          .sp-mobile-logo-btns-col {
            width: 100% !important;
            align-items: center !important;
          }

          .sp-change-logo-btn:disabled,
        .sp-remove-logo-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          pointer-events: none;
        }

        .sp-logo-hint {
            text-align: center !important;
          }
        }
      `}</style>


      {/* Manage Tables Modal */}
      <ManageTablesModal
        isOpen={isManageTablesModalOpen}
        onClose={() => setIsManageTablesModalOpen(false)}
        currentCount={shop.table_count || 10}
        onCountUpdated={(newCount) => {
          setShop((prev) => ({ ...prev, table_count: newCount }))
        }}
      />

      {/* Powered by DevNectar footer: website only, the Android app has no page footers */}
      {!isNativeApp && (
        <footer style={{ marginTop: '2.5rem', padding: '1.5rem 1rem 2rem', textAlign: 'center', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <PoweredBy />
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Slipzen POS & Billing System</span>
        </footer>
      )}
    </div>
  )
}