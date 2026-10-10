import { useState, useEffect } from "react"
import { 
  ArrowRight, Mail, MessageCircle, Phone, MapPin, Send, 
  CheckCircle2, Zap, ShieldCheck, Heart, User, Printer, Store,
  FileText, Smartphone, ChevronDown, ChevronRight
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { call } from "../lib/utils"
import { useToast } from "./common/Toast"

export function Contact({ setView, setShowAuth, user }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [form, setForm] = useState({ 
    name: user?.name || "", 
    email: user?.email || "", 
    phone: "", 
    topic: "general", 
    message: "" 
  })
  const [fieldErrors, setFieldErrors] = useState({ name: "", email: "", phone: "", message: "" })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [openFaqs, setOpenFaqs] = useState({ 0: true, 1: true, 2: true, 3: true })

  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        name: prev.name || user.name || "",
        email: prev.email || user.email || ""
      }))
    }
  }, [user])

  const toggleFaq = (index) => {
    setOpenFaqs(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = () => {
    const errors = { name: "", email: "", phone: "", message: "" }
    let isValid = true

    if (!form.name.trim()) {
      errors.name = "Your name is required"
      isValid = false
    }

    if (!form.email.trim()) {
      errors.email = "Email address is required"
      isValid = false
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(form.email.trim())) {
        errors.email = "Please enter a valid email address (e.g. rahul@example.com)"
        isValid = false
      }
    }

    if (form.phone.trim()) {
      const trimmedPhone = form.phone.trim()
      const phoneDigits = trimmedPhone.replace(/\D/g, '')
      const isValid10Digit = phoneDigits.length === 10 || (phoneDigits.length === 12 && phoneDigits.startsWith('91'))
      if (!isValid10Digit) {
        errors.phone = "Please enter a valid 10-digit mobile number"
        isValid = false
      }
    }

    if (!form.message.trim()) {
      errors.message = "Message is required"
      isValid = false
    }

    setFieldErrors(errors)
    return { isValid, errors }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const { isValid, errors } = validateForm()
    if (!isValid) {
      const firstError = errors.email || errors.phone || errors.name || errors.message
      if (toast?.error) {
        toast.error(firstError)
      } else {
        toast?.show?.(firstError, "error")
      }
      return
    }

    setLoading(true)
    try {
      await call("/contact", {
        method: "POST",
        body: JSON.stringify(form)
      })
      setSubmitted(true)
      const successMsg = "🎉 Your message has been saved! Slipzen support will contact you shortly."
      if (toast?.success) {
        toast.success(successMsg)
      } else {
        toast?.show?.(successMsg, "success")
      }
      setForm({ name: user?.name || "", email: user?.email || "", phone: "", topic: "general", message: "" })
      setFieldErrors({ name: "", email: "", phone: "", message: "" })
    } catch (err) {
      console.error("Failed to submit contact form:", err)
      const errMsg = err.message || "Failed to submit message. Please try again."
      if (toast?.error) {
        toast.error(errMsg)
      } else {
        toast?.show?.(errMsg, "error")
      }
    } finally {
      setLoading(false)
    }
  }

  const contactChannels = [
    {
      id: "whatsapp",
      icon: <MessageCircle size={22} color="#ffffff" />,
      iconBg: "#10b981",
      badge: t("contact.fastestResponse", "Fastest response"),
      badgeClass: "badge-whatsapp",
      title: t("contact.chatTitle", "Chat on WhatsApp"),
      description: t("contact.chatDesc", "Chat directly with our product specialist for instant answers."),
      actionText: t("contact.chatAction", "Open WhatsApp"),
      actionLink: "https://wa.me/919876543210",
      btnClass: "channel-btn-whatsapp",
      chevronColor: "#10b981"
    },
    {
      id: "email",
      icon: <Mail size={22} color="#ffffff" />,
      iconBg: "#0284c7",
      badge: t("contact.inbox247", "24/7 inbox"),
      badgeClass: "badge-email",
      title: t("contact.emailTitle", "Email Support"),
      description: t("contact.emailDesc", "Send us your queries and receive a comprehensive reply within 24 hours."),
      actionText: "support@slipzen.com",
      actionLink: "mailto:support@slipzen.com",
      btnClass: "channel-btn-email",
      chevronColor: "#0284c7"
    },
    {
      id: "phone",
      icon: <Phone size={22} color="#ffffff" />,
      iconBg: "#8b5cf6",
      badge: t("contact.phoneHours", "9 AM - 8 PM IST"),
      badgeClass: "badge-phone",
      title: t("contact.phoneTitle", "Phone Assistance"),
      description: t("contact.phoneDesc", "Speak to our hardware and setup specialists over phone call."),
      actionText: "+91 98765 43210",
      actionLink: "tel:+919876543210",
      btnClass: "channel-btn-phone",
      chevronColor: "#8b5cf6"
    },
    {
      id: "office",
      icon: <MapPin size={22} color="#ffffff" />,
      iconBg: "#0284c7",
      badge: t("contact.headquarters", "Headquarters"),
      badgeClass: "badge-office",
      title: t("contact.officeTitle", "Our Office Location"),
      description: t("contact.officeDesc", "Slipzen Technologies, Indiranagar, Bengaluru, Karnataka, India."),
      actionText: t("contact.mapsAction", "Open in Maps"),
      actionLink: "https://maps.google.com/?q=Indiranagar+Bengaluru",
      btnClass: "channel-btn-office",
      chevronColor: "#0284c7"
    }
  ]

  const faqs = [
    {
      id: 0,
      icon: <MessageCircle size={18} color="#0284c7" />,
      iconBg: "#e0f2fe",
      q: t("contact.faq1Q", "How fast will your team respond to my message?"),
      a: t("contact.faq1A", "Our customer support team typically responds to WhatsApp and live chat inquiries within 5 to 15 minutes during operating hours (9 AM - 8 PM IST). Emails are replied to within 4 to 12 hours.")
    },
    {
      id: 1,
      icon: <Printer size={18} color="#0284c7" />,
      iconBg: "#e0f2fe",
      q: t("contact.faq2Q", "Do you help with thermal printer setup and drivers?"),
      a: t("contact.faq2A", "Yes! If you have a thermal printer (USB, Bluetooth, or Network ESC/POS) and need assistance configuring it with Slipzen, our technical team can guide you step-by-step or connect via screen share.")
    },
    {
      id: 2,
      icon: <FileText size={18} color="#8b5cf6" />,
      iconBg: "#f3e8ff",
      q: t("contact.faq3Q", "Can I request a custom receipt template for my business?"),
      a: t("contact.faq3A", "Absolutely. If you require special fields, barcodes, specific HSN formatting, or unique branding layouts, reach out to us and we can configure a custom template for your store.")
    },
    {
      id: 3,
      icon: <Smartphone size={18} color="#0284c7" />,
      iconBg: "#e0f2fe",
      q: t("contact.faq4Q", "Does Slipzen work on mobile phones and tablets?"),
      a: t("contact.faq4A", "Yes. Slipzen is 100% web-based and responsive. You can open it on your Android or iPhone and connect to Bluetooth thermal printers directly.")
    }
  ]

  return (
    <div className="contact-page">
      {/* Hero Section */}
      <section className="contact-hero-banner">
        <div className="contact-hero-grid">
          <div className="contact-hero-left">
            <span className="contact-eyebrow">{t("contact.eyebrow", "CONTACT US")}</span>
            <h1 className="contact-hero-heading">
              We're Here to Help<br />
              Your Shop Run<br />
              <span className="contact-hero-accent">Smoothly</span>
            </h1>
            <p className="contact-hero-subtext">
              {t("contact.subtitle", "Have a question about receipt templates, thermal printer compatibility, pricing plans, or custom requirements? Get in touch with our team. We're always happy to help!")}
            </p>

            <div className="contact-hero-badges-row">
              <div className="contact-hero-badge-card">
                <div className="badge-icon-circle badge-yellow">
                  <Zap size={16} />
                </div>
                <div className="badge-text-group">
                  <strong>{t("contact.fastResponse", "Fast Response")}</strong>
                  <span>{t("contact.fastResponseSub", "Within 4–12 hours")}</span>
                </div>
              </div>

              <div className="contact-hero-badge-card">
                <div className="badge-icon-circle badge-blue">
                  <ShieldCheck size={16} />
                </div>
                <div className="badge-text-group">
                  <strong>{t("contact.expertSupport", "Expert Support")}</strong>
                  <span>{t("contact.expertSupportSub", "Trained Specialists")}</span>
                </div>
              </div>

              <div className="contact-hero-badge-card">
                <div className="badge-icon-circle badge-coral">
                  <Heart size={16} />
                </div>
                <div className="badge-text-group">
                  <strong>{t("contact.dedicatedHelp", "Dedicated Help")}</strong>
                  <span>{t("contact.dedicatedHelpSub", "For your business")}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="contact-hero-right">
            <div className="contact-hero-art-wrapper">
              <img 
                src="https://apzabspkfpuszlduyoqv.supabase.co/storage/v1/object/public/UI_Images/contact_support_agent.jpg" 
                alt="Slipzen Support Specialist" 
                className="contact-hero-agent-img"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4 Contact Method Cards */}
      <section className="contact-methods-section">
        <div className="contact-methods-grid">
          {contactChannels.map((channel) => (
            <a 
              key={channel.id} 
              href={channel.actionLink}
              target={channel.id === "whatsapp" || channel.id === "office" ? "_blank" : undefined}
              rel={channel.id === "whatsapp" || channel.id === "office" ? "noopener noreferrer" : undefined}
              className="contact-method-card"
            >
              <div className="method-card-top">
                <div className="method-icon-box" style={{ backgroundColor: channel.iconBg }}>
                  {channel.icon}
                </div>
                <span className={`method-pill-badge ${channel.badgeClass}`}>
                  {channel.badge}
                </span>
              </div>

              <div className="method-card-content">
                <h3 className="method-card-title">{channel.title}</h3>
                <p className="method-card-desc">{channel.description}</p>
              </div>

              <div className="method-card-bottom">
                <div className={`method-action-btn ${channel.btnClass}`}>
                  <span>{channel.actionText}</span>
                  <ArrowRight size={14} className="desktop-arrow" />
                </div>
                <div className="mobile-chevron-box" style={{ color: channel.chevronColor }}>
                  <ChevronRight size={18} />
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Contact Form & Perks Split Section */}
      <section className="contact-interactive-section">
        <div className="contact-split-container">
          
          {/* Perks Column (Desktop Left, Mobile Bottom) */}
          <div className="contact-perks-card">
            <span className="contact-perks-eyebrow">
              <span className="desktop-eyebrow">{t("contact.sendAMessage", "SEND A MESSAGE")}</span>
              <span className="mobile-eyebrow">{t("contact.whyContactUs", "WHY CONTACT US")}</span>
            </span>
            <h2 className="contact-perks-title">
              {t("contact.perksHeading", "Let's talk about your shop's billing needs")}
            </h2>
            <p className="contact-perks-desc">
              {t("contact.perksSub", "Whether you are a solo retail counter or a multi-location chain, our team is here to help you print faster and organize your shop.")}
            </p>

            <div className="contact-perks-list">
              <div className="contact-perk-row">
                <div className="perk-icon-circle perk-circle-blue">
                  <User size={20} />
                </div>
                <div className="perk-row-text">
                  <h4>{t("contact.perk1Title", "Free 1-on-1 Consultation")}</h4>
                  <p>{t("contact.perk1Desc", "Get personalized guidance for hardware & thermal printer choices.")}</p>
                </div>
                <div className="perk-mobile-chevron">
                  <ChevronRight size={18} />
                </div>
              </div>

              <div className="contact-perk-row">
                <div className="perk-icon-circle perk-circle-purple">
                  <Printer size={20} />
                </div>
                <div className="perk-row-text">
                  <h4>{t("contact.perk2Title", "Printer Compatibility Check")}</h4>
                  <p>{t("contact.perk2Desc", "We verify your ESC/POS Bluetooth, USB, or WiFi model before setup.")}</p>
                </div>
                <div className="perk-mobile-chevron">
                  <ChevronRight size={18} />
                </div>
              </div>

              <div className="contact-perk-row">
                <div className="perk-icon-circle perk-circle-green">
                  <Store size={20} />
                </div>
                <div className="perk-row-text">
                  <h4>{t("contact.perk3Title", "Dedicated Store Onboarding")}</h4>
                  <p>{t("contact.perk3Desc", "We help import your catalog, menu items, and GST sequence.")}</p>
                </div>
                <div className="perk-mobile-chevron">
                  <ChevronRight size={18} />
                </div>
              </div>
            </div>
          </div>

          {/* Form Column (Desktop Right, Mobile Top) */}
          <div className="contact-form-card">
            <div className="contact-form-header">
              <h2 className="contact-form-title">{t("contact.formHeading", "Send Us a Message")}</h2>
              <p className="contact-form-subtitle">
                {t("contact.formSub", "Fill out the form below and our team will get back to you soon.")}
              </p>
            </div>

            {submitted ? (
              <div className="contact-submitted-box">
                <div className="submitted-icon-wrapper">
                  <CheckCircle2 size={44} color="#10b981" />
                </div>
                <h3>{t("contact.sentSuccess", "Message Sent Successfully!")}</h3>
                <p>
                  {t("contact.sentSuccessBody", "Thank you for reaching out. We have received your query and a team member will get back to you shortly.")}
                </p>
                <button 
                  type="button"
                  className="contact-send-another-btn"
                  onClick={() => setSubmitted(false)}
                >
                  {t("contact.sendAnother", "Send Another Message")}
                </button>
              </div>
            ) : (
              <form className="contact-form-body" onSubmit={handleSubmit} noValidate>
                <div className="form-two-col-row">
                  <div className="form-input-field">
                    <label htmlFor="contact-name">{t("contact.yourName", "Your Name *")}</label>
                    <input
                      id="contact-name"
                      type="text"
                      placeholder="Kuldeep"
                      value={form.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      className={fieldErrors.name ? "input-has-error" : ""}
                      required
                    />
                    {fieldErrors.name && (
                      <span className="form-field-error-msg">{fieldErrors.name}</span>
                    )}
                  </div>

                  <div className="form-input-field">
                    <label htmlFor="contact-email">{t("contact.yourEmail", "Email Address *")}</label>
                    <input
                      id="contact-email"
                      type="email"
                      placeholder="admin@gmail.com"
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className={fieldErrors.email ? "input-has-error" : ""}
                      required
                    />
                    {fieldErrors.email && (
                      <span className="form-field-error-msg">{fieldErrors.email}</span>
                    )}
                  </div>
                </div>

                <div className="form-two-col-row">
                  <div className="form-input-field">
                    <label htmlFor="contact-phone">{t("contact.phoneNumber", "Phone Number (Optional)")}</label>
                    <input
                      id="contact-phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      className={fieldErrors.phone ? "input-has-error" : ""}
                    />
                    {fieldErrors.phone && (
                      <span className="form-field-error-msg">{fieldErrors.phone}</span>
                    )}
                  </div>

                  <div className="form-input-field">
                    <label htmlFor="contact-topic">{t("contact.topic", "Topic")}</label>
                    <div className="select-wrapper">
                      <select
                        id="contact-topic"
                        value={form.topic}
                        onChange={(e) => handleChange("topic", e.target.value)}
                      >
                        <option value="general">{t("contact.topicGeneral", "General Inquiry")}</option>
                        <option value="printer">{t("contact.topicHardware", "Thermal Printer Setup")}</option>
                        <option value="template">{t("contact.topicCustom", "Custom Receipt Template")}</option>
                        <option value="pricing">{t("contact.topicPricing", "Pricing & Subscription")}</option>
                        <option value="other">{t("contact.topicOther", "Other Support")}</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-input-field form-full-width">
                  <label htmlFor="contact-message">{t("contact.yourMessage", "How can we help? *")}</label>
                  <textarea
                    id="contact-message"
                    rows={4}
                    placeholder={t("contact.messagePlaceholder", "Tell us about your store, printer model, or your question...")}
                    value={form.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                    className={fieldErrors.message ? "input-has-error" : ""}
                    required
                  />
                  {fieldErrors.message && (
                    <span className="form-field-error-msg">{fieldErrors.message}</span>
                  )}
                </div>

                <button 
                  type="submit" 
                  className="contact-submit-action-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <span>{t("contact.sending", "Sending Message...")}</span>
                  ) : (
                    <>
                      <Send size={16} className="btn-send-icon" />
                      <span>{t("contact.sendButton", "Send Message")}</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="contact-faq-section-wrapper">
        <div className="faq-header-center">
          <span className="faq-eyebrow-text">{t("contact.faqEyebrow", "COMMON QUESTIONS")}</span>
          <h2 className="faq-main-title">{t("contact.faqTitle", "Frequently Asked Questions")}</h2>
          <p className="faq-main-subtext">
            {t("contact.faqSubtitle", "Quick answers to common questions about getting in touch and using Slipzen.")}
          </p>
        </div>

        <div className="contact-faqs-grid">
          {faqs.map((faq) => {
            const isOpen = !!openFaqs[faq.id]
            return (
              <div 
                key={faq.id} 
                className={`contact-faq-item-card ${isOpen ? "faq-is-open" : ""}`}
                onClick={() => toggleFaq(faq.id)}
              >
                <div className="faq-item-question-row">
                  <div className="faq-item-icon-box" style={{ backgroundColor: faq.iconBg }}>
                    {faq.icon}
                  </div>
                  <h4 className="faq-question-heading">{faq.q}</h4>
                  <div className={`faq-chevron-icon ${isOpen ? "chevron-rotated" : ""}`}>
                    <ChevronDown size={18} color="#64748b" />
                  </div>
                </div>
                {isOpen && (
                  <div className="faq-item-answer-body">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Bottom CTA Card */}
      <section className="contact-bottom-cta-container">
        <div className="contact-cta-banner-card">
          <div className="cta-banner-left">
            <span className="cta-pill-eyebrow">{t("contact.ctaBadge", "GET STARTED TODAY")}</span>
            <h2 className="cta-banner-title">{t("contact.ctaTitle", "Ready to get started?")}</h2>
            <p className="cta-banner-subtext">
              {t("contact.ctaSubtitle", "Create receipts in seconds. No credit card required.")}
            </p>
          </div>

          <div className="cta-banner-center">
            <img 
              src="https://apzabspkfpuszlduyoqv.supabase.co/storage/v1/object/public/UI_Images/contact_cta_printer.jpg" 
              alt="Thermal Receipt Printer" 
              className="cta-printer-img"
            />
          </div>

          <div className="cta-banner-right">
            <button 
              type="button"
              className="cta-start-billing-btn" 
              onClick={() => {
                if (typeof setShowAuth === "function") {
                  setShowAuth(true)
                } else if (typeof setView === "function") {
                  setView("bills")
                }
              }}
            >
              <span>{t("contact.ctaButton", "Start Billing Free")}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
