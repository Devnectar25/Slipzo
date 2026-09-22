import { useState, useEffect, useMemo } from "react"
import { Store, Phone, MapPin, Hash, ArrowRight, Check, Sparkles, X, AlertCircle } from "lucide-react"
import { call, findTemplateMatch } from "../lib/utils"
import { ButtonLoader } from "./common/Skeleton"
import { useToast } from "./common/Toast"
import { BUILTIN_TEMPLATES } from "./Templates"
import { VoiceInputButton } from "./common/VoiceInputButton"
import { RealisticReceiptView } from "./RealisticReceiptView"

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

export function ShopOnboardingModal({ isOpen, onClose, user, onComplete }) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [prefix, setPrefix] = useState("SLP")
  const [sequence, setSequence] = useState(1001)
  const [format, setFormat] = useState("PREFIX-DATE-SEQ")
  const [templates, setTemplates] = useState(() => BUILTIN_TEMPLATES)
  const [defaultTemplateId, setDefaultTemplateId] = useState("")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [shake, setShake] = useState(false)

  const { success, error: toastError, warning: toastWarning } = useToast()

  // Preload any existing shop data or default name
  useEffect(() => {
    if (isOpen && user) {
      setName(user.name ? `${user.name}'s Shop` : "My Shop")
      Promise.all([
        call("/shop").catch(() => null),
        call("/templates").catch(() => [])
      ]).then(([data, templatesData]) => {
        const dbTemplates = Array.isArray(templatesData) ? templatesData : []
        const dbNames = new Set(dbTemplates.map(t => (t.name || "").toLowerCase()))
        const extraBuiltins = BUILTIN_TEMPLATES.filter(b => !dbNames.has((b.name || "").toLowerCase()))
        const tplList = dbTemplates.length > 0 || extraBuiltins.length > 0 ? [...dbTemplates, ...extraBuiltins] : BUILTIN_TEMPLATES

        setTemplates(tplList)

        if (data) {
          if (data.name && !data.name.endsWith("'s Shop")) setName(data.name)
          if (data.phone) setPhone(data.phone)
          if (data.address) setAddress(data.address)
          if (data.invoice_prefix) setPrefix(data.invoice_prefix)
          if (data.invoice_sequence) setSequence(data.invoice_sequence)
          if (data.invoice_format) setFormat(data.invoice_format)
          if (data.default_template_id) {
            const matchedDefault = findTemplateMatch(tplList, data.default_template_id)
            setDefaultTemplateId(matchedDefault ? matchedDefault.id : data.default_template_id)
          } else if (tplList[0]?.id) setDefaultTemplateId(tplList[0].id)
        } else if (tplList[0]?.id) {
          setDefaultTemplateId(tplList[0].id)
        }
      })
    }
  }, [isOpen, user])

  // Lock background scrolling when onboarding modal is open
  useEffect(() => {
    if (isOpen) {
      const originalBodyOverflow = document.body.style.overflow
      const originalDocOverflow = document.documentElement.style.overflow

      document.body.style.overflow = "hidden"
      document.documentElement.style.overflow = "hidden"

      const elementsToLock = document.querySelectorAll(".shell-content, .shell-main, .app, .public-layout, .main-content")
      elementsToLock.forEach(el => {
        el.dataset.origOverflow = el.style.overflow
        el.style.overflow = "hidden"
      })

      return () => {
        document.body.style.overflow = originalBodyOverflow
        document.documentElement.style.overflow = originalDocOverflow
        elementsToLock.forEach(el => {
          el.style.overflow = el.dataset.origOverflow || ""
        })
      }
    }
  }, [isOpen])

  const validateField = (key, value) => {
    const val = String(value || "").trim()

    if (key === "name") {
      if (!val) return "Shop name is required."
      if (val.length < 2) return "Shop name must be at least 2 characters."
      if (val.length > 100) return "Shop name cannot exceed 100 characters."
    }

    if (key === "phone") {
      if (!val) return "Phone number is required for your shop profile."
      const phoneRegex = /^(\+91[\s-]?)?[0-9]{10}$/
      const digitsOnly = val.replace(/[^0-9]/g, "")
      if (!phoneRegex.test(val) || (digitsOnly.length !== 10 && !(digitsOnly.length === 12 && digitsOnly.startsWith("91")))) {
        return "Please enter a valid 10-digit mobile number."
      }
    }

    if (key === "address") {
      if (!val) return "Shop address is required for your shop profile."
      if (val.length > 300) return "Address cannot exceed 300 characters."
    }

    if (key === "prefix" && format !== "SEQ") {
      if (!val) return "Prefix is required."
      if (!/^[A-Za-z0-9]{1,8}$/.test(val)) return "Prefix must be 1–8 letters or numbers (e.g. SLP)."
    }

    if (key === "sequence") {
      const num = Number(value)
      if (value === "" || isNaN(num)) return "Starting invoice sequence is required."
      if (!Number.isInteger(num) || num < 1) return "Sequence number must be at least 1."
    }

    return ""
  }

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    let val = name
    if (field === "phone") val = phone
    if (field === "address") val = address
    if (field === "prefix") val = prefix
    if (field === "sequence") val = sequence
    const err = validateField(field, val)
    setErrors((prev) => ({ ...prev, [field]: err }))
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()

    const nameErr = validateField("name", name)
    const phoneErr = validateField("phone", phone)
    const addressErr = validateField("address", address)
    const prefixErr = validateField("prefix", prefix)
    const seqErr = validateField("sequence", sequence)

    const newErrors = {
      name: nameErr,
      phone: phoneErr,
      address: addressErr,
      prefix: prefixErr,
      sequence: seqErr
    }

    setErrors(newErrors)
    setTouched({ name: true, phone: true, address: true, prefix: true, sequence: true })

    if (Object.values(newErrors).some(Boolean)) {
      toastError("Please complete your shop profile (Name, Phone & Address).")
      return
    }

    setLoading(true)
    try {
      await call("/shop", {
        method: "PUT",
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          invoice_prefix: prefix.trim().toUpperCase(),
          invoice_sequence: Number(sequence),
          invoice_format: format,
          default_template_id: defaultTemplateId
        })
      })

      if (user?.id) {
        localStorage.setItem(`slipzo_shop_setup_${user.id}`, "true")
      }

      success("🎉 Shop profile saved! Welcome to Slipzo.")
      if (onComplete) {
        onComplete()
      } else {
        onClose?.()
      }
    } catch (err) {
      console.error("Failed to save shop details:", err)
      toastError(err.message || "Failed to save shop details.")
    } finally {
      setLoading(false)
    }
  }

  const handleBackdropClick = (e) => {
    e.stopPropagation()
    setShake(true)
    setTimeout(() => setShake(false), 500)
    if (toastWarning) {
      toastWarning("Please complete your shop profile (Name, Phone & Address) to continue.")
    }
  }

  const liveInvoiceNo = previewInvoiceNumber(prefix, sequence, format)

  // Live calculation for preview
  const sampleItemsTotal = 350.00
  const previewTotalPaid = sampleItemsTotal

  const selectedTemplate = useMemo(() => {
    const tplList = Array.isArray(templates) && templates.length > 0 ? templates : BUILTIN_TEMPLATES
    const matched = findTemplateMatch(tplList, defaultTemplateId) || tplList.find(t => t.id === defaultTemplateId) || tplList[0] || BUILTIN_TEMPLATES[0]
    if (!matched) return null

    return {
      ...matched,
      previewData: {
        shopName: (name || "Your Shop Name").trim(),
        address: (address || "Shop address will appear here").trim(),
        phone: (phone || "+91 00000 00000").trim(),
        gst: "",
        invoiceNo: liveInvoiceNo,
        date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        items: [
          { name: "Sample Item 1", qty: 1, rate: 150, total: 150 },
          { name: "Sample Item 2", qty: 2, rate: 100, total: 200 }
        ],
        subtotal: 350,
        discount: 0,
        tax: Number(matched.show_tax) ? (350 * (Number(matched.tax_rate) || 18)) / 100 : 0,
        total: previewTotalPaid,
        payment: "CASH / UPI",
        footer: matched.footer || "Thank you for shopping with us! Please come again."
      }
    }
  }, [templates, defaultTemplateId, name, address, phone, liveInvoiceNo, previewTotalPaid])

  if (!isOpen) return null

  return (
    <div 
      className="modal-backdrop shop-onboarding-backdrop fade-in" 
      onClick={handleBackdropClick}
      onWheel={(e) => {
        if (e.target.classList.contains("shop-onboarding-backdrop")) {
          e.preventDefault()
        }
      }}
      onTouchMove={(e) => {
        if (e.target.classList.contains("shop-onboarding-backdrop")) {
          e.preventDefault()
        }
      }}
    >
      <div className={`modal-card shop-onboarding-card ${shake ? "shake-card" : ""}`} onClick={(e) => e.stopPropagation()}>
        {/* Header Banner */}
        <div className="onboarding-header">
          <div className="onboarding-header-content">
            <div className="onboarding-sparkle-pill">
              <Sparkles size={16} /> Quick Setup
            </div>
            <h2>Welcome to Slipzo! Let's set up your Shop</h2>
            <p>
              Your shop name, address, and contact number will appear at the top of every receipt you print.
            </p>
          </div>
        </div>

        {/* Modal Body: Form on Left, Live Thermal Preview on Right */}
        <div className="onboarding-body">
          {/* Form Column */}
          <form className="onboarding-form" onSubmit={handleSubmit}>
            {/* Quick Voice Fill Pill */}
            <div style={{ marginBottom: "0.85rem", display: "flex", justifyContent: "flex-end" }}>
              <VoiceInputButton
                mode="shop"
                variant="pill"
                size="sm"
                label="Voice Fill All Details"
                placeholder="Speak shop name, phone and address"
                onParsedResult={(parsed) => {
                  if (parsed.name) {
                    setName(parsed.name)
                    setErrors((prev) => ({ ...prev, name: validateField("name", parsed.name) }))
                  }
                  if (parsed.phone) {
                    setPhone(parsed.phone)
                    setErrors((prev) => ({ ...prev, phone: validateField("phone", parsed.phone) }))
                  }
                  if (parsed.address) {
                    setAddress(parsed.address)
                    setErrors((prev) => ({ ...prev, address: validateField("address", parsed.address) }))
                  }
                }}
              />
            </div>

            {/* Shop Name */}
            <div className="onboarding-field">
              <label className="onboarding-label" style={{ marginBottom: "0.25rem" }}>
                <Store size={14} className="field-icon" />
                <span>Shop / Business Name <b className="req-star">*</b></span>
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Krishna Supermarket & Cafe"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (touched.name) {
                      setErrors((prev) => ({ ...prev, name: validateField("name", e.target.value) }))
                    }
                  }}
                  onBlur={() => handleBlur("name")}
                  className={`onboarding-input ${touched.name && errors.name ? "input-error" : ""}`}
                  style={{ paddingRight: "2.5rem" }}
                />
                <div style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", zIndex: 2 }}>
                  <VoiceInputButton
                    size="sm"
                    placeholder="Speak shop name"
                    onSpeechResult={(text) => {
                      setName(text)
                      setErrors((prev) => ({ ...prev, name: validateField("name", text) }))
                    }}
                  />
                </div>
              </div>
              {touched.name && errors.name && (
                <span className="error-text"><AlertCircle size={12} /> {errors.name}</span>
              )}
            </div>

            {/* Phone Number */}
            <div className="onboarding-field">
              <label className="onboarding-label" style={{ marginBottom: "0.25rem" }}>
                <Phone size={14} className="field-icon" />
                <span>Phone / WhatsApp Number <b className="req-star">*</b></span>
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value)
                    if (touched.phone) {
                      setErrors((prev) => ({ ...prev, phone: validateField("phone", e.target.value) }))
                    }
                  }}
                  onBlur={() => handleBlur("phone")}
                  className={`onboarding-input ${touched.phone && errors.phone ? "input-error" : ""}`}
                  style={{ paddingRight: "2.5rem" }}
                />
                <div style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", zIndex: 2 }}>
                  <VoiceInputButton
                    size="sm"
                    placeholder="Speak phone number"
                    onSpeechResult={(text) => {
                      const digits = text.replace(/[^0-9+]/g, "")
                      const val = digits || text
                      setPhone(val)
                      setErrors((prev) => ({ ...prev, phone: validateField("phone", val) }))
                    }}
                  />
                </div>
              </div>
              {touched.phone && errors.phone && (
                <span className="error-text"><AlertCircle size={12} /> {errors.phone}</span>
              )}
            </div>

            {/* Address */}
            <div className="onboarding-field">
              <label className="onboarding-label" style={{ marginBottom: "0.25rem" }}>
                <MapPin size={14} className="field-icon" />
                <span>Shop Address / City <b className="req-star">*</b></span>
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <textarea
                  rows={2}
                  placeholder="e.g. Shop #14, Main Commercial Street, Indiranagar, Bengaluru"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value)
                    if (touched.address) {
                      setErrors((prev) => ({ ...prev, address: validateField("address", e.target.value) }))
                    }
                  }}
                  onBlur={() => handleBlur("address")}
                  className={`onboarding-textarea ${touched.address && errors.address ? "input-error" : ""}`}
                  style={{ paddingRight: "2.5rem" }}
                />
                <div style={{ position: "absolute", right: "0.5rem", top: "0.6rem", display: "flex", alignItems: "center", zIndex: 2 }}>
                  <VoiceInputButton
                    size="sm"
                    placeholder="Speak store address"
                    onSpeechResult={(text) => {
                      setAddress(text)
                      setErrors((prev) => ({ ...prev, address: validateField("address", text) }))
                    }}
                  />
                </div>
              </div>

              {touched.address && errors.address && (
                <span className="error-text"><AlertCircle size={12} /> {errors.address}</span>
              )}
            </div>

            {/* Invoice Prefix & Starting Sequence */}
            <div className="onboarding-grid-two">
              <div className="onboarding-field">
                <label className="onboarding-label">
                  <Hash size={14} className="field-icon" />
                  <span>Invoice Prefix</span>
                </label>
                <input
                  type="text"
                  maxLength={8}
                  placeholder="SLP"
                  value={prefix}
                  onChange={(e) => {
                    const clean = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
                    setPrefix(clean)
                    if (touched.prefix) {
                      setErrors((prev) => ({ ...prev, prefix: validateField("prefix", clean) }))
                    }
                  }}
                  onBlur={() => handleBlur("prefix")}
                  className={`onboarding-input ${touched.prefix && errors.prefix ? "input-error" : ""}`}
                />
                {touched.prefix && errors.prefix && (
                  <span className="error-text"><AlertCircle size={12} /> {errors.prefix}</span>
                )}
              </div>

              <div className="onboarding-field">
                <label className="onboarding-label">
                  <span>Starting Bill #</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="99999999"
                  placeholder="1001"
                  value={sequence}
                  onChange={(e) => {
                    setSequence(e.target.value)
                    if (touched.sequence) {
                      setErrors((prev) => ({ ...prev, sequence: validateField("sequence", e.target.value) }))
                    }
                  }}
                  onBlur={() => handleBlur("sequence")}
                  className={`onboarding-input ${touched.sequence && errors.sequence ? "input-error" : ""}`}
                />
                {touched.sequence && errors.sequence && (
                  <span className="error-text"><AlertCircle size={12} /> {errors.sequence}</span>
                )}
              </div>
            </div>

            <div className="onboarding-field">
              <label className="onboarding-label">
                <span>Receipt Template</span>
              </label>
              <select
                value={defaultTemplateId}
                onChange={(e) => setDefaultTemplateId(e.target.value)}
                className="onboarding-input"
                style={{ background: "#ffffff" }}
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
          </form>

          {/* Live Thermal Receipt Preview Column */}
          <div className="onboarding-preview-col">
            <div className="preview-pill-header">
              <span className="pill-title">LIVE RECEIPT PREVIEW</span>
              <span className="paper-pill">{selectedTemplate?.width ? `${selectedTemplate.width} Thermal` : "58mm Thermal"}</span>
            </div>

            <div className="onboarding-receipt-box" style={{ background: "transparent", boxShadow: "none", overflow: "visible", maxWidth: selectedTemplate?.width === "80mm" ? "340px" : "280px" }}>
              <RealisticReceiptView template={selectedTemplate} />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="onboarding-footer">
          <div className="required-info-badge" style={{ fontSize: "0.8rem", color: "#74788A", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <AlertCircle size={14} style={{ color: "#FC9B3E" }} />
            <span>Complete shop profile is required to print receipts</span>
          </div>
          <button
            type="button"
            className="primary-button onboarding-save-btn"
            onClick={handleSubmit}
            disabled={loading}
            style={{ width: "fit-content", minWidth: "220px" }}
          >
            {loading ? <ButtonLoader text="Saving details..." /> : <>Save & Start Billing <ArrowRight size={16} /></>}
          </button>
        </div>
      </div>

      <style>{`
        .shop-onboarding-backdrop {
          overscroll-behavior: contain !important;
          touch-action: none !important;
        }

        .shop-onboarding-card {
          overscroll-behavior: contain !important;
          display: flex !important;
          flex-direction: column !important;
          max-height: 88vh !important;
          height: auto !important;
          overflow: hidden !important;
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
          box-sizing: border-box !important;
        }

        .shop-onboarding-card::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }

        .onboarding-header {
          flex-shrink: 0 !important;
        }

        .onboarding-body {
          flex: 1 1 auto !important;
          min-height: 0 !important;
          overflow: hidden !important;
          display: grid !important;
          grid-template-columns: 1.2fr 1fr !important;
        }

        .onboarding-row {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 0.75rem !important;
        }

        .onboarding-form {
          overflow-y: auto !important;
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
          padding-bottom: 2rem !important;
        }

        .onboarding-form::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }

        .onboarding-preview-col {
          overflow-y: auto !important;
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }

        .onboarding-preview-col::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }

        .onboarding-footer {
          flex-shrink: 0 !important;
          position: sticky !important;
          bottom: 0 !important;
          z-index: 30 !important;
          background: #ffffff !important;
          border-top: 1px solid #F7CDAB !important;
          box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.05) !important;
        }

        .tax-toggle-group {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.35rem;
          background: #FDF4EB;
          padding: 0.3rem;
          border-radius: 10px;
          border: 1px solid #D9DDE4;
        }

        .tax-btn {
          background: transparent;
          border: none;
          padding: 0.45rem 0.3rem;
          font-size: 0.78rem;
          font-weight: 600;
          color: #575B6B;
          border-radius: 7px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }

        .tax-btn:hover {
          color: #0C1F41;
          background: rgba(255, 255, 255, 0.5);
        }

        .tax-btn.active {
          background: #ffffff;
          color: #F66016;
          box-shadow: 0 1.5px 4px rgba(0, 0, 0, 0.1);
          font-weight: 700;
        }

        @media (max-width: 820px) {
          .shop-onboarding-backdrop {
            padding: 0.5rem !important;
          }

          .shop-onboarding-card {
            width: calc(100vw - 1rem) !important;
            max-width: 100% !important;
            max-height: 90vh !important;
            max-height: 90dvh !important;
            border-radius: 16px !important;
            margin: 0 auto !important;
          }

          .onboarding-header {
            padding: 1rem 1.15rem 0.85rem !important;
          }

          .onboarding-header-content h2 {
            font-size: 1.15rem !important;
            line-height: 1.3 !important;
            word-break: break-word !important;
          }

          .onboarding-header-content p {
            font-size: 0.8rem !important;
            line-height: 1.35 !important;
          }

          .onboarding-body {
            grid-template-columns: 1fr !important;
            overflow-y: auto !important;
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }

          .onboarding-body::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }

          .onboarding-form {
            padding: 1rem 1.15rem 1.25rem !important;
            border-right: none !important;
            gap: 0.85rem !important;
            overflow-y: visible !important;
          }

          .onboarding-row {
            grid-template-columns: 1fr !important;
            gap: 0.85rem !important;
          }

          .onboarding-preview-col {
            padding: 1.15rem 1rem !important;
          }

          .onboarding-footer {
            padding: 0.75rem 1rem !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.6rem !important;
          }

          .required-info-badge {
            justify-content: center !important;
            text-align: center !important;
            font-size: 0.75rem !important;
          }

          .onboarding-save-btn {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            justify-content: center !important;
            box-sizing: border-box !important;
            padding: 0.75rem 1rem !important;
          }
        }

        @media (max-width: 480px) {
          .onboarding-grid-two {
            grid-template-columns: 1fr 1fr !important;
            gap: 0.5rem !important;
          }
        }

        @keyframes modalShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          50% { transform: translateX(8px); }
          75% { transform: translateX(-4px); }
        }
        .shake-card {
          animation: modalShake 0.4s ease-in-out !important;
        }
      `}</style>
    </div>
  )
}



