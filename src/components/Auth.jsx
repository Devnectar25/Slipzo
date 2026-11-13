import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { ButtonLoader } from "./common/Skeleton"
import { ArrowRight, ArrowLeft, Receipt, X, Check, Eye, EyeOff, AlertCircle, CheckCircle2, Phone, Lock, Printer, Store, Mail, ExternalLink } from "lucide-react"
import { call } from "../lib/utils"
import "../styles/Auth.css"
import { PASSWORD_RULES, normalizeMobile, sanitizeMobileInput, mobileProblem } from "../lib/authFields"
import { OtpVerify, otpErrorText } from "./auth/OtpVerify"
import { ForgotPassword } from "./auth/ForgotPassword"

export { PASSWORD_RULES }

// name@domain.tld: no spaces, a dot in the domain, a 2+ letter ending, no ".." anywhere
const EMAIL_RE = /^(?!.*\.\.)[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/

// Each returns null when the value is fine, otherwise [translation key, English text, values]
const shopProblem = (value) => {
  const v = String(value || "").trim()
  if (!v) return ["auth.err_shop", "Please enter your shop name"]
  if (v.length < 2) return ["auth.err_shop_short", "Shop name must be at least 2 characters"]
  if (!/[\p{L}\p{N}]/u.test(v)) return ["auth.err_shop_letters", "Shop name must contain letters or numbers"]
  return null
}
const categoryProblem = (value) => (value ? null : ["auth.err_category", "Please choose your shop category"])
const emailProblem = (value) => {
  const v = String(value || "").trim()
  if (!v) return null // optional
  return EMAIL_RE.test(v) ? null : ["auth.err_email", "Please enter a valid email address or leave it blank"]
}

// Same four categories as the shop profile (components/common/ChangeCategoryModal.jsx)
const SHOP_CATEGORIES = [
  { id: "small_business", icon: "☕", label: "Cafe, Tea & Snacks" },
  { id: "kirana_grocery", icon: "🛒", label: "Kirana / Grocery" },
  { id: "clothing_garments", icon: "👗", label: "Cloth & Garments" },
  { id: "hotel_food", icon: "🍽️", label: "Hotel / Restaurant" }
]

// The product's buy page (the Flipkart link saved on the product, same one the Products page opens)
const buyLink = (raw) => {
  const value = String(raw || "").trim()
  if (!value) return ""
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    return /^https?:$/.test(url.protocol) && url.hostname.includes(".") ? url.href : ""
  } catch (_) {
    return ""
  }
}

// Used until the Products catalogue answers (or if it cannot be reached). Same pictures as the Products page.
const PRINTER_FALLBACK = [
  { id: "niyama", name: "NIYAMA Portable Bluetooth POS Printer (58mm)", image: "/products/niyama_printer.jpg" },
  { id: "pos-bt200", name: "Bluetooth POS Receipt Printer (80mm)", image: "/products/pos_printer.jpg" }
]

export function Auth({ onLogin, onCancel, initialRegister = false }) {
  const { t } = useTranslation()
  const [isRegister, setIsRegister] = useState(initialRegister)
  const [step, setStep] = useState(1) // sign up only: 1 shop details, 2 printer, 3 password
  const EMPTY_FORM = { shopName: "", category: "", phone: "", email: "", password: "", confirmPassword: "" }
  const [form, setForm] = useState(EMPTY_FORM)
  const [hasPrinter, setHasPrinter] = useState(null) // null = not answered yet
  const [printers, setPrinters] = useState(PRINTER_FALLBACK)
  const [myPrinterId, setMyPrinterId] = useState("") // printer picked from the list ("Yes, I have one")
  const [myPrinterName, setMyPrinterName] = useState("") // or its name typed in
  const [brokenImages, setBrokenImages] = useState({})
  const [error, setError] = useState("")
  const [errorKey, setErrorKey] = useState("")
  const fail = (key, fallback, values) => { setErrorKey(key); setError(t(key, fallback, values)) }
  // a message under each field (shown when the person leaves the field, or presses Continue)
  const [fieldErrors, setFieldErrors] = useState({})
  const problemFor = (name, f) => {
    switch (name) {
      case "shopName": return shopProblem(f.shopName)
      case "category": return categoryProblem(f.category)
      case "phone": return mobileProblem(f.phone)
      case "email": return emailProblem(f.email)
      case "password":
        if (!f.password) return ["auth.err_password_required", "Please enter your password"]
        if (isRegister && !PASSWORD_RULES.every((rule) => rule.test(f.password))) return ["auth.err_password_rules", "Password does not meet the security requirements"]
        if (!isRegister && f.password.length < 4) return ["auth.err_password_short", "Password must be at least 4 characters"]
        return null
      case "confirmPassword":
        if (!f.confirmPassword) return ["auth.err_confirm_required", "Please re-enter your password"]
        return f.password === f.confirmPassword ? null : ["auth.err_mismatch", "Passwords do not match"]
      default: return null
    }
  }
  const messageFor = (problem) => (problem ? t(problem[0], problem[1], problem[2]) : "")
  const checkField = (name, f = form) => setFieldErrors((prev) => ({ ...prev, [name]: messageFor(problemFor(name, f)) }))
  // checks a group of fields at once; true when all are fine
  const checkFields = (names) => {
    const next = {}
    names.forEach((n) => { next[n] = messageFor(problemFor(n, form)) })
    setFieldErrors((prev) => ({ ...prev, ...next }))
    const firstBad = names.find((n) => next[n])
    if (firstBad && typeof document !== "undefined") {
      setTimeout(() => document.querySelector(`[data-field="${firstBad}"]`)?.focus?.(), 0)
    }
    return !firstBad
  }
  const fieldError = (name) => (fieldErrors[name]
    ? <span className="auth-field-error" role="alert" data-testid={`auth-error-${name}`}>{fieldErrors[name]}</span>
    : null)
  const required = <span className="auth-required" aria-hidden="true">*</span>
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showValidationPopup, setShowValidationPopup] = useState(false)

  // Set when this number already has an unfinished sign up: the banner then offers a shortcut to the sign-in form
  const [offerSignIn, setOfferSignIn] = useState(false)

  // Two-step check of the mobile number at sign up (code sent to the phone)
  const [verifyingPhone, setVerifyingPhone] = useState(false)
  const [otpSend, setOtpSend] = useState(null)
  const [otpSendErr, setOtpSendErr] = useState(null)
  const [otpToken, setOtpToken] = useState("")
  const [otpPhone, setOtpPhone] = useState("") // the number the token belongs to
  // "forgot" shows the forgot-password steps in place of the sign-in form
  const [mode, setMode] = useState("main")
  const [notice, setNotice] = useState("") // green message, e.g. after a password change

  const resetForm = () => {
    setOfferSignIn(false)
    setVerifyingPhone(false)
    setOtpSend(null)
    setOtpSendErr(null)
    setOtpToken("")
    setOtpPhone("")
    setMode("main")
    setNotice("")
    setForm(EMPTY_FORM)
    setHasPrinter(null)
    setStep(1)
    setError("")
    setFieldErrors({})
    setShowValidationPopup(false)
  }

  useEffect(() => {
    setIsRegister(initialRegister)
    resetForm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRegister])

  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow

    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = originalBodyOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
    }
  }, [])

  // Printer pictures come from the Products catalogue (public), with built-in ones as a fallback
  useEffect(() => {
    if (!isRegister || hasPrinter === null) return
    let alive = true
    call("/products")
      .then((list) => {
        if (!alive || !Array.isArray(list)) return
        const found = list
          .filter((p) => p && /printer/i.test(p.name || "") && !/roll|paper/i.test(p.name || "") && (p.image || p.images))
          .map((p) => ({ id: String(p.id), name: p.name, image: p.image || (Array.isArray(p.images) ? p.images[0] : ""), link: buyLink(p.product_link) }))
          .filter((p) => p.image)
        if (found.length) setPrinters(found)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [isRegister, hasPrinter])

  const set = (patch) => {
    setForm((f) => {
      const next = { ...f, ...patch }
      Object.keys(patch).forEach((name) => {
        if (fieldErrors[name]) checkField(name, next)
        if (name === "password" && fieldErrors.confirmPassword) checkField("confirmPassword", next)
      })
      return next
    })
    if (error) setError("")
    if (offerSignIn) setOfferSignIn(false)
  }

  const goStep1Next = async () => {
    if (loading) return
    setError("")
    setOfferSignIn(false)
    if (!checkFields(["shopName", "category", "phone", "email"])) return
    setLoading(true)
    try {
      const email = form.email.trim()
      await call("/auth/check-availability", {
        method: "POST",
        body: JSON.stringify({
          phone: normalizeMobile(form.phone),
          ...(email ? { email } : {}),
        }),
      })
      const phone = normalizeMobile(form.phone)
      // already verified this number (came back from step 2): no new code needed
      if (otpToken && otpPhone === phone) {
        setStep(2)
        return
      }
      try {
        const sent = await call("/auth/otp/send", { method: "POST", body: JSON.stringify({ phone, purpose: "register" }) })
        setOtpSend(sent)
        setOtpSendErr(null)
      } catch (sendErr) {
        // a code went out a moment ago: enter that one (a new one can be asked for after the wait)
        if (sendErr.code !== "OTP_COOLDOWN") throw sendErr
        setOtpSend(null)
        setOtpSendErr(sendErr)
      }
      setVerifyingPhone(true)
    } catch (err) {
      // Allow progression only if an older backend does not expose /check-availability yet; register on step 3 still validates
      if (err.status === 404) {
        setStep(2)
        return
      }
      const original = err.rawMessage || err.message || ""
      const isSignupConflict = err.code === "SIGNUP_IN_PROGRESS"
      const isEmailErr = err.code === "EMAIL_TAKEN" || /email/i.test(original)
      const isPhoneErr = isSignupConflict || err.code === "MOBILE_TAKEN" || /mobile/i.test(original)
      const message = err.message || t("auth.err_failed", "Authentication failed. Please check your credentials.")
      setError(message)
      if (isEmailErr || isPhoneErr) {
        const targetField = isEmailErr ? "email" : "phone"
        setErrorKey(
          isSignupConflict ? "auth.err_in_progress" : isEmailErr ? "auth.err_email" : "auth.err_mobile_server"
        )
        setFieldErrors((prev) => ({ ...prev, [targetField]: message }))
        if (isPhoneErr) setOfferSignIn(true)
        setTimeout(() => document.querySelector(`[data-field="${targetField}"]`)?.focus(), 0)
      }
    } finally {
      setLoading(false)
    }
  }

  const goStep2Next = () => {
    if (hasPrinter === null) return fail("auth.err_printer", "Please choose Yes or No")
    if (hasPrinter === false) return fail("auth.err_printer_buy", "Buy a printer first, then choose \"Yes, I have one\" to continue")
    if (hasPrinter === true) {
      const picked = printers.find((pr) => pr.id === myPrinterId)
      const name = (picked?.name || myPrinterName).trim()
      if (!name) return fail("auth.err_printer_pick", "Please choose your printer or type its name")
      if (!picked && name.length < 2) return fail("auth.err_printer_name", "Please enter the full printer name")
      try { localStorage.setItem("slipzo_my_printer", name) } catch (_) {}
    }
    setError("")
    setStep(3)
  }

  const submit = async (e) => {
    e.preventDefault()
    setError("")

    if (isRegister && step === 1) return goStep1Next()
    if (isRegister && step === 2) return goStep2Next()

    const toCheck = isRegister ? ["password", "confirmPassword"] : ["phone", "password"]
    if (!checkFields(toCheck)) {
      if (isRegister && form.password && !PASSWORD_RULES.every((rule) => rule.test(form.password))) setShowValidationPopup(true)
      return
    }

    setLoading(true)
    try {
      let body
      if (isRegister) {
        const shopName = form.shopName.trim()
        body = {
          phone: normalizeMobile(form.phone),
          password: form.password,
          name: shopName,
          shop_name: shopName,
          business_type: form.category,
          otp_token: otpToken,
          ...(hasPrinter === true ? { printer_name: (printers.find((pr) => pr.id === myPrinterId)?.name || myPrinterName).trim() } : {}),
          ...(form.email.trim() ? { email: form.email.trim() } : {})
        }
      } else {
        body = {
          phone: normalizeMobile(form.phone),
          password: form.password
        }
      }
      const user = await call(isRegister ? "/auth/register" : "/auth/login", {
        method: "POST",
        body: JSON.stringify(body)
      })
      onLogin(user, isRegister)
    } catch (err) {
      // The verification ran out (15 minutes) or is missing: verify the number again on step 1
      if (isRegister && err.code === "OTP_REQUIRED") {
        setOtpToken("")
        setOtpPhone("")
        setVerifyingPhone(false)
        setStep(1)
        setErrorKey("")
        setError(otpErrorText(err, t))
        return
      }
      // This number already started signing up (account made, plan not chosen) and the password typed now is not the same one:
      // the way back in is to sign in, so offer that with the number filled in
      if (err.code === "SIGNUP_IN_PROGRESS") {
        setErrorKey("auth.err_in_progress")
        setError(err.message)
        setOfferSignIn(true)
        return
      }
      // The server's wording (before translation) decides which field is wrong
      const original = err.rawMessage || err.message || ""
      setErrorKey(/mobile/i.test(original) ? "auth.err_mobile_server" : /email/i.test(original) ? "auth.err_email" : "")
      setError(err.message || t("auth.err_failed", "Authentication failed. Please check your credentials."))
      // A number that already has a finished account: signing in is the way forward
      if (isRegister && /mobile number is already registered/i.test(original)) setOfferSignIn(true)
      // A number or email that is already taken is fixed on the first step
      if (isRegister && /mobile number|email/i.test(original) && !/password/i.test(original)) setStep(1)
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setIsRegister(!isRegister)
    resetForm()
  }

  // From the "you already started signing up" message: straight to sign in, number already filled in
  const goToSignIn = () => {
    const phone = normalizeMobile(form.phone) || form.phone
    setIsRegister(false)
    resetForm()
    setForm({ ...EMPTY_FORM, phone })
  }

  const titles = {
    1: [t("auth.step1Eyebrow", "STEP 1 OF 3 · YOUR SHOP"), t("auth.step1Title", "Tell us about your shop"), t("auth.step1Sub", "Just the basics. You can add the rest later.")],
    2: [t("auth.step2Eyebrow", "STEP 2 OF 3 · PRINTER"), t("auth.step2Title", "Do you have a receipt printer?"), t("auth.step2Sub", "Slipzen works with 58mm and 80mm thermal printers.")],
    3: [t("auth.step3Eyebrow", "STEP 3 OF 3 · PASSWORD"), t("auth.step3Title", "Set your password"), t("auth.step3Sub", "Last step. Then you will pick a plan and set up your items.")]
  }
  const [eyebrowText, headingText, subText] = isRegister
    ? (step === 1 && verifyingPhone
      ? [t("auth.verifyEyebrow", "STEP 1 OF 3 · VERIFY MOBILE"), t("auth.verifyTitle", "Verify your mobile number"), t("auth.verifySub", "Enter the code to confirm this number is yours.")]
      : titles[step])
    : [t("auth.signinEyebrow", "WELCOME BACK"), t("auth.signinTitle", "Sign in to Slipzen"), t("auth.signinSub", "Your shop, your templates, ready when you are.")]


  return (
    <div className="auth-overlay">
      <div className="auth-modal-box">
        {onCancel && (
          <button className="auth-close" onClick={onCancel} aria-label={t("auth.close", "Close authentication")}>
            <X size={18} />
          </button>
        )}

        <section className="auth-art">
          <div className="auth-logo-wrapper">
            <img
              src="/logo.png"
              alt="Slipzen"
              className="auth-logo"
            />
          </div>
          <div className="art-body">
            <p className="eyebrow">{t("auth.artEyebrow", "THE DIGITAL RECEIPT BOOK")}</p>
            <h1>
              {t("auth.artTitle1", "Make every sale")}<br />
              <em>{t("auth.artTitle2", "feel effortless.")}</em>
            </h1>
            <p className="art-note">
              {t("auth.artNote", "A calm, quick billing desk for the shops that keep communities moving.")}
            </p>
            <ul className="auth-benefits">
              <li><span><Check size={12} strokeWidth={3} /></span>{t("auth.benefit1", "Print on 58mm, 80mm and A4 paper")}</li>
              <li><span><Check size={12} strokeWidth={3} /></span>{t("auth.benefit2", "Scan barcodes to bill faster")}</li>
              <li><span><Check size={12} strokeWidth={3} /></span>{t("auth.benefit3", "Works in English, Hindi and Marathi")}</li>
            </ul>
          </div>
          <div className="art-footer">
            <span className="art-footer-label">
              <Receipt size={16} />
              {t("auth.readyToPrint", "Ready to print")}
            </span>
            <span className="art-sizes">
              <i>58mm</i>
              <i>80mm</i>
              <i>A4</i>
            </span>
          </div>
        </section>

        <section className="auth-form">
          {mode === "forgot" ? (
            <ForgotPassword
              initialPhone={form.phone}
              onCancel={(target) => {
                if (target === "register") { setIsRegister(true); resetForm() } else setMode("main")
              }}
              onDone={(phone) => {
                setIsRegister(false)
                resetForm()
                setForm({ ...EMPTY_FORM, phone })
                setNotice(t("forgot.done", "Password changed. Sign in with your new password."))
              }}
            />
          ) : (
          <>
          <div className="auth-header-block">
            <div className="mobile-brand">
              <img
                src="/logo.png"
                alt="Slipzen"
                className="mobile-auth-logo"
              />
            </div>
            {isRegister && (
              <div className="auth-steps" data-testid="auth-steps" aria-hidden="true">
                {[1, 2, 3].map((n) => (
                  <span key={n} className={`auth-step-dot ${n < step ? "done" : ""} ${n === step ? "now" : ""}`} />
                ))}
              </div>
            )}
            <p className="eyebrow" data-testid="auth-step-eyebrow">{eyebrowText}</p>
            <h2 data-testid="auth-step-title">{headingText}</h2>
            <p className="subtle">{subText}</p>
          </div>

          <form onSubmit={submit} noValidate>
            {notice && !isRegister && (
              <div className="auth-notice" data-testid="auth-notice" role="status">
                <CheckCircle2 size={16} />
                <span>{notice}</span>
              </div>
            )}
            {/* ---------- sign up, step 1: the shop ---------- */}
            {isRegister && step === 1 && verifyingPhone && (
              <OtpVerify
                key={otpSend?.demo_code || "otp"}
                phone={normalizeMobile(form.phone)}
                purpose="register"
                initial={otpSend}
                initialError={otpSendErr}
                onVerified={(token) => {
                  setOtpToken(token)
                  setOtpPhone(normalizeMobile(form.phone))
                  setVerifyingPhone(false)
                  setError("")
                  setStep(2)
                }}
                onBack={() => { setVerifyingPhone(false); setError("") }}
              />
            )}

            {isRegister && step === 1 && !verifyingPhone && (
              <>
                <label>
                  <span className="auth-label-text">{t("auth.shopName", "Shop name")} {required}</span>
                  <div className="auth-field">
                    <Store size={17} className="auth-field-icon" />
                    <input
                      data-testid="auth-shop-input"
                      data-field="shopName"
                      onBlur={() => checkField("shopName")}
                      required
                      autoComplete="organization"
                      maxLength={100}
                      placeholder={t("auth.shopPlaceholder", "e.g. Krishna Supermarket")}
                      value={form.shopName}
                      onChange={(e) => set({ shopName: e.target.value })}
                      className={fieldErrors.shopName ? "input-error" : ""}
                    />
                  </div>
                  {fieldError("shopName")}
                </label>

                <div className="auth-cats" data-testid="auth-categories">
                  <span className="auth-label-text">{t("auth.shopCategory", "Shop category")} {required}</span>
                  <div className="auth-cat-grid" role="radiogroup" aria-label={t("auth.shopCategory", "Shop category")}>
                    {SHOP_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        role="radio"
                        aria-checked={form.category === cat.id}
                        data-testid={`auth-cat-${cat.id}`}
                        className={`auth-cat ${form.category === cat.id ? "active" : ""}`}
                        data-field={cat.id === SHOP_CATEGORIES[0].id ? "category" : undefined}
                        onClick={() => { set({ category: cat.id }); setFieldErrors((prev) => ({ ...prev, category: "" })) }}
                      >
                        <span className="auth-cat-icon">{cat.icon}</span>
                        <span className="auth-cat-label">{t(`auth.cat_${cat.id}`, cat.label)}</span>
                      </button>
                    ))}
                  </div>
                  {fieldError("category")}
                </div>

                <label>
                  <span className="auth-label-text">{t("auth.mobile", "Mobile number")} {required}</span>
                  <div className="auth-field">
                    <Phone size={17} className="auth-field-icon" />
                    <input
                      data-testid="auth-phone-input"
                      data-field="phone"
                      onBlur={() => checkField("phone")}
                      type="tel"
                      inputMode="numeric"
                      required
                      autoComplete="tel"
                      maxLength={16}
                      placeholder={t("auth.mobilePlaceholder", "10-digit mobile number")}
                      value={form.phone}
                      onChange={(e) => set({ phone: sanitizeMobileInput(e.target.value) })}
                      className={fieldErrors.phone ? "input-error" : ""}
                    />
                  </div>
                  {fieldError("phone")}
                </label>

                <label>
                  <span className="auth-label-text">{t("auth.email", "Email")} <span className="auth-optional">{t("auth.optional", "(optional)")}</span></span>
                  <div className="auth-field">
                    <Mail size={17} className="auth-field-icon" />
                    <input
                      data-testid="auth-email-input"
                      data-field="email"
                      onBlur={() => checkField("email")}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      maxLength={254}
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={(e) => set({ email: e.target.value })}
                      className={fieldErrors.email ? "input-error" : ""}
                    />
                  </div>
                  {fieldError("email")}
                </label>
              </>
            )}

            {/* ---------- sign up, step 2: the printer ---------- */}
            {isRegister && step === 2 && (
              <div className="auth-printer" data-testid="auth-printer-question">
                <div className="auth-printer-choices" role="group" aria-label={t("auth.step2Title", "Do you have a receipt printer?")}>
                  <button
                    type="button"
                    data-testid="auth-printer-yes"
                    className={`auth-printer-choice ${hasPrinter === true ? "active" : ""}`}
                    aria-pressed={hasPrinter === true}
                    onClick={() => { setHasPrinter(true); if (error) setError("") }}
                  >
                    <Check size={15} /> {t("auth.printerYes", "Yes, I have one")}
                  </button>
                  <button
                    type="button"
                    data-testid="auth-printer-no"
                    className={`auth-printer-choice ${hasPrinter === false ? "active" : ""}`}
                    aria-pressed={hasPrinter === false}
                    onClick={() => { setHasPrinter(false); if (error) setError("") }}
                  >
                    <X size={15} /> {t("auth.printerNo", "No, not yet")}
                  </button>
                </div>

                {hasPrinter === true && (
                  <div className="auth-printer-suggest auth-printer-own" data-testid="auth-printer-own">
                    <p className="auth-printer-suggest-title">{t("auth.printerPickTitle", "Which printer do you have? Tap it, or type its name below.")} <span className="auth-required">*</span></p>
                    <div className="auth-printer-gallery auth-printer-pick">
                      {printers.map((pr) => {
                        const active = myPrinterId === pr.id
                        return (
                          <button
                            type="button"
                            key={pr.id}
                            data-testid="auth-printer-pick"
                            className={`auth-printer-shot auth-printer-option ${active ? "active" : ""}`}
                            aria-pressed={active}
                            aria-label={pr.name}
                            onClick={() => { setMyPrinterId(active ? "" : pr.id); setMyPrinterName(""); if (error) setError("") }}
                            title={pr.name}
                          >
                            {brokenImages[pr.id]
                              ? <span className="auth-printer-shot-fallback" aria-hidden="true"><Printer size={34} /></span>
                              : <img src={pr.image} alt="" loading="lazy" onError={() => setBrokenImages((b) => ({ ...b, [pr.id]: true }))} />}
                            {active && <span className="auth-printer-option-check" aria-hidden="true"><Check size={13} strokeWidth={3} /></span>}
                          </button>
                        )
                      })}
                    </div>
                    <label className="auth-printer-name-field">
                      <span className="auth-label-text">{t("auth.printerNameLabel", "Printer name (if not in the list)")}</span>
                      <div className="auth-field">
                        <Printer size={17} className="auth-field-icon" />
                        <input
                          data-testid="auth-printer-name-input"
                          maxLength={80}
                          placeholder={t("auth.printerNamePlaceholder", "e.g. Epson TM-T82, TVS RP 3160")}
                          value={myPrinterName}
                          onChange={(e) => { setMyPrinterName(e.target.value); if (e.target.value) setMyPrinterId(""); if (error) setError("") }}
                          className={error && errorKey.startsWith("auth.err_printer_") ? "input-error" : ""}
                        />
                      </div>
                    </label>
                  </div>
                )}

                {hasPrinter === false && (
                  <div className="auth-printer-suggest" data-testid="auth-printer-suggest">
                    <p className="auth-printer-suggest-title">{t("auth.printerSuggestBuy", "These printers work with Slipzen. Tap one to buy it.")}</p>
                    <div className="auth-printer-gallery">
                      {printers.slice(0, 4).map((p) => {
                        const picture = brokenImages[p.id] ? (
                          <span className="auth-printer-shot-fallback" aria-label={p.name}><Printer size={34} /></span>
                        ) : (
                          <img
                            src={p.image}
                            alt={p.name}
                            loading="lazy"
                            onError={() => setBrokenImages((b) => ({ ...b, [p.id]: true }))}
                          />
                        )
                        // Tapping the picture opens the product's buy page in a new tab; sign-up stays where it is
                        return p.link ? (
                          <a
                            className="auth-printer-shot is-link"
                            key={p.id}
                            data-testid="auth-printer-shot"
                            href={p.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Buy ${p.name}`}
                            title={`Buy ${p.name}`}
                          >
                            {picture}
                            <span className="auth-printer-shot-go" aria-hidden="true"><ExternalLink size={13} /></span>
                          </a>
                        ) : (
                          <div className="auth-printer-shot" key={p.id} data-testid="auth-printer-shot">{picture}</div>
                        )
                      })}
                    </div>
                    <p className="auth-printer-next" data-testid="auth-printer-next">
                      {t("auth.printerBuyNext", "Once you have a printer, choose \"Yes, I have one\" above to continue.")}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ---------- sign up step 3 and sign in: the password ---------- */}
            {!isRegister && (
              <label>
                <span className="auth-label-text">{t("auth.mobile", "Mobile number")} {required}</span>
                <div className="auth-field">
                  <Phone size={17} className="auth-field-icon" />
                  <input
                    data-testid="auth-phone-input"
                    data-field="phone"
                    onBlur={() => checkField("phone")}
                    type="tel"
                    inputMode="numeric"
                    required
                    autoComplete="tel"
                    maxLength={16}
                    placeholder={t("auth.mobilePlaceholder", "10-digit mobile number")}
                    value={form.phone}
                    onChange={(e) => set({ phone: sanitizeMobileInput(e.target.value) })}
                    className={fieldErrors.phone ? "input-error" : ""}
                  />
                </div>
                {fieldError("phone")}
              </label>
            )}

            {(!isRegister || step === 3) && (
              <>
                {isRegister && (
                  <>
                    <input
                      type="text"
                      name="username"
                      autoComplete="username"
                      value={normalizeMobile(form.phone) || form.phone || ""}
                      readOnly
                      tabIndex={-1}
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        width: "1px",
                        height: "1px",
                        padding: 0,
                        margin: "-1px",
                        overflow: "hidden",
                        clip: "rect(0, 0, 0, 0)",
                        whiteSpace: "nowrap",
                        border: 0,
                        opacity: 0,
                        pointerEvents: "none"
                      }}
                    />
                    <p className="auth-summary" data-testid="auth-summary">
                      <b>{form.shopName.trim()}</b> · +91 {normalizeMobile(form.phone)}
                    </p>
                  </>
                )}

                <label>
                  <span className="auth-label-text">{t("auth.password", "Password")} {required}</span>
                  <div className="auth-field password-input-wrap">
                    <input
                      data-testid="auth-password-input"
                      data-field="password"
                      name={isRegister ? "signup_password" : "password"}
                      id={isRegister ? "signup_password" : "login_password"}
                      onBlur={() => { if (form.password || fieldErrors.password) checkField("password") }}
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete={isRegister ? "one-time-code" : "current-password"}
                      data-lpignore="true"
                      data-1p-ignore="true"
                      placeholder={isRegister ? t("auth.createPassword", "Create a password") : t("auth.enterPassword", "Enter your password")}
                      value={form.password}
                      onChange={(e) => set({ password: e.target.value })}
                      className={fieldErrors.password ? "input-error" : ""}
                    />
                    <Lock size={17} className="auth-field-icon" />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? t("auth.hidePassword", "Hide password") : t("auth.showPassword", "Show password")}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {fieldError("password")}
                </label>

                {!isRegister && (
                  <div className="auth-forgot-row">
                    <button
                      type="button"
                      className="auth-forgot-link"
                      data-testid="auth-forgot"
                      onClick={() => { setError(""); setNotice(""); setFieldErrors({}); setMode("forgot") }}
                    >
                      {t("auth.forgotPassword", "Forgot password?")}
                    </button>
                  </div>
                )}

                {isRegister && (
                  <label>
                    <span className="auth-label-text">{t("auth.confirmPassword", "Re-enter password")} {required}</span>
                    <div className="auth-field password-input-wrap">
                      <input
                        data-testid="auth-confirm-password-input"
                        data-field="confirmPassword"
                        name="signup_confirm_password"
                        id="signup_confirm_password"
                        onBlur={() => { if (form.confirmPassword || fieldErrors.confirmPassword) checkField("confirmPassword") }}
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        autoComplete="one-time-code"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        placeholder={t("auth.confirmPlaceholder", "Re-enter your password")}
                        value={form.confirmPassword}
                        onChange={(e) => set({ confirmPassword: e.target.value })}
                        className={fieldErrors.confirmPassword ? "input-error" : ""}
                      />
                      <Lock size={17} className="auth-field-icon" />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? t("auth.hideConfirm", "Hide confirm password") : t("auth.showConfirm", "Show confirm password")}
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {fieldError("confirmPassword")}
                  </label>
                )}
              </>
            )}

            {error && (
              <div data-testid="auth-error" className="auth-error-banner">
                <AlertCircle size={16} />
                <span>{error}</span>
                {offerSignIn && (
                  <button type="button" className="auth-error-action" data-testid="auth-signin-instead" onClick={goToSignIn}>
                    {t("auth.signInInstead", "Sign in instead")} <ArrowRight size={14} />
                  </button>
                )}
              </div>
            )}

            {!(isRegister && step === 1 && verifyingPhone) && (
            <div className="auth-actions">
              {isRegister && step > 1 && (
                <button
                  type="button"
                  className="auth-step-back"
                  data-testid="auth-step-back"
                  disabled={loading}
                  onClick={() => { setError(""); setOfferSignIn(false); setStep(step - 1) }}
                >
                  <ArrowLeft size={16} /> {t("auth.back", "Back")}
                </button>
              )}
              {!(isRegister && step === 2 && hasPrinter === false) && (
              <button
                data-testid="auth-submit-button"
                className="primary full"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? <ButtonLoader text={t("auth.pleaseWait", "Please wait...")} />
                  : !isRegister
                    ? t("auth.enter", "Enter Slipzen")
                    : step === 1
                      ? t("auth.continue", "Continue")
                      : step === 2
                        ? t("auth.continue", "Continue")
                        : t("auth.createAccount", "Create account")}
                {!loading && <ArrowRight size={17} />}
              </button>
              )}
            </div>
            )}
          </form>

          <p className="switch">
            {isRegister ? t("auth.haveAccount", "Already have an account?") : t("auth.newTo", "New to Slipzen?")}
            <button
              data-testid="auth-toggle-button"
              onClick={switchMode}
            >
              {isRegister ? t("auth.signIn", "Sign in") : t("auth.createAnAccount", "Create an account")}
            </button>
          </p>
          </>
          )}

        </section>
      </div>

      {/* Validation Failure Popup Modal */}
      {showValidationPopup && (
        <div 
          className="validation-popup-overlay" 
          onClick={() => setShowValidationPopup(false)}
        >
          <div 
            className="validation-popup-card" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="validation-popup-header">
              <div className="popup-icon-title">
                <div className="popup-alert-icon">
                  <AlertCircle size={20} />
                </div>
                <h3>{t("auth.rulesTitle", "Password Requirements")}</h3>
              </div>
              <button 
                type="button"
                className="popup-close-btn" 
                onClick={() => setShowValidationPopup(false)}
                aria-label={t("auth.closePopup", "Close popup")}
              >
                <X size={18} />
              </button>
            </div>

            <p className="popup-desc">
              {t("auth.rulesDesc", "Your password must meet all 5 security rules to create an account:")}
            </p>

            <div className="popup-rules-list">
              {PASSWORD_RULES.map((rule) => {
                const isPassed = rule.test(form.password)
                return (
                  <div 
                    key={rule.id} 
                    className={`popup-rule-row ${isPassed ? "passed" : "missing"}`}
                  >
                    <span className="popup-rule-status">
                      {isPassed ? (
                        <Check size={13} strokeWidth={3} />
                      ) : (
                        <X size={13} strokeWidth={3} />
                      )}
                    </span>
                    <span className="popup-rule-text">{t(`auth.rule_${rule.id}`, rule.label)}</span>
                  </div>
                )
              })}
            </div>

            <button 
              type="button" 
              className="popup-ok-btn"
              onClick={() => {
                setShowValidationPopup(false)
                const pwdInput = document.querySelector('input[data-testid="auth-password-input"]')
                if (pwdInput) pwdInput.focus()
              }}
            >
              {t("auth.rulesOk", "Got it, update password")}
            </button>
          </div>
        </div>
      )}

      <style>{`
        /* Password input container with show/hide toggle */
        .password-input-wrap {
          position: relative !important;
          display: flex !important;
          align-items: center !important;
          width: 100% !important;
        }

        .password-input-wrap .auth-field-icon {
          position: absolute !important;
          left: 0.95rem !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          color: #94a3b8 !important;
          pointer-events: none !important;
          z-index: 3 !important;
        }

        .password-input-wrap:focus-within .auth-field-icon {
          color: #0284c7 !important;
        }

        .password-input-wrap input {
          width: 100% !important;
          padding-left: 2.75rem !important;
          padding-right: 2.9rem !important;
        }

        .password-toggle-btn {
          position: absolute !important;
          right: 0.5rem !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          background: none !important;
          border: none !important;
          color: #64748b !important;
          cursor: pointer !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0.35rem !important;
          border-radius: 6px !important;
          transition: color 0.2s !important;
          z-index: 4 !important;
        }

        .password-toggle-btn:hover {
          color: #0f172a !important;
        }

        .auth-error-banner {
          display: flex !important;
          align-items: center !important;
          gap: 0.45rem !important;
          background: #FFE1E5 !important;
          border: 1px solid #FFB8BD !important;
          color: #b91c1c !important;
          font-size: clamp(0.75rem, 2.2vw, 0.82rem) !important;
          font-weight: 500 !important;
          padding: 0.45rem 0.75rem !important;
          border-radius: 8px !important;
          margin-top: 0.15rem !important;
          line-height: 1.3 !important;
        }

        /* Validation Failure Popup Overlay */
        .validation-popup-overlay {
          position: fixed !important;
          inset: 0 !important;
          background: rgba(15, 23, 42, 0.65) !important;
          backdrop-filter: blur(4px) !important;
          -webkit-backdrop-filter: blur(4px) !important;
          z-index: 10000 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: clamp(8px, 3vw, 16px) !important;
          animation: fadeIn 0.2s ease !important;
          overflow-y: auto !important;
        }

        .validation-popup-card {
          background: #ffffff !important;
          border-radius: 16px !important;
          width: 100% !important;
          max-width: 420px !important;
          max-height: min(92vh, 92dvh) !important;
          overflow-y: auto !important;
          padding: clamp(1rem, 3.5vw, 1.4rem) !important;
          box-shadow: 0 20px 48px rgba(15, 23, 42, 0.25) !important;
          border: 1px solid #bae6fd !important;
          animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
          box-sizing: border-box !important;
        }

        .validation-popup-header {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-bottom: 0.65rem !important;
        }

        .popup-icon-title {
          display: flex !important;
          align-items: center !important;
          gap: 0.55rem !important;
        }

        .popup-alert-icon {
          width: 32px !important;
          height: 32px !important;
          border-radius: 8px !important;
          background: #fee2e2 !important;
          color: #ef4444 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-shrink: 0 !important;
        }

        .popup-icon-title h3 {
          font-size: clamp(1rem, 3.5vw, 1.12rem) !important;
          font-weight: 700 !important;
          color: #0C1F41 !important;
          margin: 0 !important;
        }

        .popup-close-btn {
          background: #f0f9ff !important;
          border: 1px solid #bae6fd !important;
          width: 28px !important;
          height: 28px !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: #0284c7 !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
          flex-shrink: 0 !important;
        }

        .popup-close-btn:hover {
          background: #e0f2fe !important;
          color: #0369a1 !important;
        }

        .popup-desc {
          font-size: clamp(0.78rem, 2.5vw, 0.85rem) !important;
          color: #64748b !important;
          line-height: 1.4 !important;
          margin: 0 0 0.75rem 0 !important;
        }

        .popup-rules-list {
          background: #f0f9ff !important;
          border: 1px solid #bae6fd !important;
          border-radius: 10px !important;
          padding: 0.65rem 0.85rem !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 0.45rem !important;
          margin-bottom: 1rem !important;
        }

        .popup-rule-row {
          display: flex !important;
          align-items: center !important;
          gap: 0.55rem !important;
          font-size: clamp(0.76rem, 2.4vw, 0.82rem) !important;
          font-weight: 500 !important;
        }

        .popup-rule-row.passed {
          color: #059669 !important;
        }

        .popup-rule-row.missing {
          color: #dc2626 !important;
        }

        .popup-rule-status {
          width: 18px !important;
          height: 18px !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-shrink: 0 !important;
        }

        .popup-rule-row.passed .popup-rule-status {
          background: #d1fae5 !important;
          color: #059669 !important;
        }

        .popup-rule-row.missing .popup-rule-status {
          background: #fee2e2 !important;
          color: #dc2626 !important;
        }

        .popup-rule-text {
          line-height: 1.25 !important;
        }

        .popup-ok-btn {
          width: 100% !important;
          padding: 0.65rem 1rem !important;
          background: #0284c7 !important;
          color: #ffffff !important;
          border: none !important;
          border-radius: 9px !important;
          font-weight: 600 !important;
          font-size: clamp(0.84rem, 2.5vw, 0.9rem) !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
          min-height: 38px !important;
        }

        .popup-ok-btn:hover {
          background: #0369a1 !important;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleUp {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}