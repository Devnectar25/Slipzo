import { useState, useEffect } from "react"
import { 
  ArrowRight, Mail, MessageCircle, Phone, MapPin, Send, 
  CheckCircle2, Clock, HelpCircle, Sparkles, MessageSquare
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
  const [submissions, setSubmissions] = useState([])
  const [fetchingSubmissions, setFetchingSubmissions] = useState(false)

  const fetchSubmissions = async () => {
    try {
      setFetchingSubmissions(true)
      const data = await call("/contact")
      setSubmissions(Array.isArray(data) ? data : [])
    } catch (err) {
      console.warn("Failed to fetch contact submissions:", err.message)
    } finally {
      setFetchingSubmissions(false)
    }
  }

  useEffect(() => {
    fetchSubmissions()
    if (user) {
      setForm(prev => ({
        ...prev,
        name: prev.name || user.name || "",
        email: prev.email || user.email || ""
      }))
    }
  }, [user])

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
        errors.phone = "Please enter a valid 10-digit mobile number (e.g. 9876543210 or +91 9876543210)"
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
      const successMsg = "🎉 Your message has been saved! Slipzo support will contact you shortly."
      if (toast?.success) {
        toast.success(successMsg)
      } else {
        toast?.show?.(successMsg, "success")
      }
      setForm({ name: user?.name || "", email: user?.email || "", phone: "", topic: "general", message: "" })
      setFieldErrors({ name: "", email: "", phone: "", message: "" })
      fetchSubmissions()
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
      icon: <MessageCircle size={26} />,
      title: t("contact.liveChatWhatsApp", "Live Chat & WhatsApp"),
      description: t("contact.chatDesc", "Chat directly with our product specialist for instant answers."),
      actionText: t("contact.chatAction", "Chat on WhatsApp"),
      actionLink: "https://wa.me/919876543210",
      accent: "#10b981",
      badge: t("contact.fastestResponse", "Fastest response")
    },
    {
      icon: <Mail size={26} />,
      title: t("contact.emailSupport", "Email Support"),
      description: t("contact.emailDesc", "Send us your queries and receive a comprehensive reply in < 24h."),
      actionText: "support@slipzo.com",
      actionLink: "mailto:support@slipzo.com",
      accent: "#0ea5e9",
      badge: t("contact.inbox247", "24/7 inbox")
    },
    {
      icon: <Phone size={26} />,
      title: t("contact.phoneAssistance", "Phone Assistance"),
      description: t("contact.phoneDesc", "Speak to our hardware and setup specialists over phone call."),
      actionText: "+91 98765 43210",
      actionLink: "tel:+919876543210",
      accent: "#0ea5e9",
      badge: t("contact.phoneHours", "9 AM - 8 PM IST")
    },
    {
      icon: <MapPin size={26} />,
      title: t("contact.officeLocation", "Office Location"),
      description: t("contact.officeDesc", "Slipzo Technologies, Indiranagar, Bengaluru, Karnataka, India."),
      actionText: t("contact.mapsAction", "Open in Maps"),
      actionLink: "#",
      accent: "#f59e0b",
      badge: t("contact.headquarters", "Headquarters")
    }
  ]

  const faqs = [
    {
      q: t("contact.faq1Q", "How fast will your team respond to my message?"),
      a: t("contact.faq1A", "Our customer support team typically responds to WhatsApp and live chat inquiries within 5 to 15 minutes during operating hours (9 AM - 8 PM IST). Emails are replied to within 4 to 12 hours.")
    },
    {
      q: t("contact.faq2Q", "Do you help with thermal printer setup and drivers?"),
      a: t("contact.faq2A", "Yes! If you have a thermal printer (USB, Bluetooth, or Network ESC/POS) and need assistance configuring it with Slipzo, our technical team can guide you step-by-step or connect via screen share.")
    },
    {
      q: t("contact.faq3Q", "Can I request a custom receipt template for my business?"),
      a: t("contact.faq3A", "Absolutely. If you require special fields, barcodes, specific HSN formatting, or unique branding layouts, reach out to us and we can configure a custom template for your store.")
    },
    {
      q: t("contact.faq4Q", "Does Slipzo work on mobile phones and tablets?"),
      a: t("contact.faq4A", "Yes. Slipzo is 100% web-based and responsive. You can open it on your Android or iPhone and connect to Bluetooth thermal printers directly.")
    }
  ]

  return (
    <div className="contact-page">
      {/* Contact Header */}
      <section className="contact-hero">
        <div className="contact-hero-content">
          <p className="eyebrow">{t("contact.eyebrow", "CONTACT US")}</p>
          <h1>{t("contact.title", "We're Here to Help Your Shop Run Smoothly")}</h1>
          <p className="header-description">
            {t("contact.subtitle", "Have a question about receipt templates, thermal printer compatibility, pricing plans, or custom requirements? Get in touch with our team.")}
          </p>
        </div>
      </section>

      {/* Contact Channels Grid */}
      <section className="contact-channels-section">
        <div className="channels-grid">
          {contactChannels.map((channel, index) => (
            <div className="channel-card" key={index}>
              <div className="channel-top">
                <div className="channel-icon" style={{ backgroundColor: `${channel.accent}15`, color: channel.accent }}>
                  {channel.icon}
                </div>
                <span className="channel-badge" style={{ color: channel.accent, backgroundColor: `${channel.accent}10` }}>
                  {channel.badge}
                </span>
              </div>
              <h3>{channel.title}</h3>
              <p>{channel.description}</p>
              <a href={channel.actionLink} className="channel-action" style={{ color: channel.accent }}>
                {channel.actionText} <ArrowRight size={14} />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Form & Information Split */}
      <section className="contact-form-section">
        <div className="contact-container">
          <div className="contact-info-panel">
            <span className="info-eyebrow">{t("contact.sendMessage", "SEND A MESSAGE")}</span>
            <h2>{t("contact.formTitle", "Let's talk about your shop's billing needs")}</h2>
            <p>
              {t("contact.formSubtitle", "Whether you are a solo retail counter or a multi-location chain, our team is excited to help you print faster and organize your shop.")}
            </p>

            <div className="info-perks">
              <div className="perk-item">
                <CheckCircle2 size={18} className="perk-icon" />
                <div>
                  <strong>{t("contact.perk1Title", "Free 1-on-1 Consultation")}</strong>
                  <p>{t("contact.perk1Desc", "Get personalized guidance for hardware & thermal printer choices.")}</p>
                </div>
              </div>
              <div className="perk-item">
                <CheckCircle2 size={18} className="perk-icon" />
                <div>
                  <strong>{t("contact.perk2Title", "Printer Compatibility Check")}</strong>
                  <p>{t("contact.perk2Desc", "We verify your ESC/POS Bluetooth, USB, or WiFi model before setup.")}</p>
                </div>
              </div>
              <div className="perk-item">
                <CheckCircle2 size={18} className="perk-icon" />
                <div>
                  <strong>{t("contact.perk3Title", "Dedicated Store Onboarding")}</strong>
                  <p>{t("contact.perk3Desc", "We help import your catalog, menu items, and GST sequence.")}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="contact-form-wrapper">
            {submitted ? (
              <div className="contact-success-card">
                <div className="success-icon-box">
                  <CheckCircle2 size={40} color="#10b981" />
                </div>
                <h3>{t("contact.sentSuccess", "Message Sent Successfully!")}</h3>
                <p>
                  {t("contact.sentSuccessBody", "Thank you for reaching out. We have received your query and a team member will get back to you shortly.")}
                </p>
                <button 
                  className="cta-button secondary"
                  onClick={() => setSubmitted(false)}
                >
                  {t("contact.sendAnother", "Send Another Message")}
                </button>
              </div>
            ) : (
              <form className="contact-form" onSubmit={handleSubmit} noValidate>
                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="name">{t("contact.yourName", "Your Name")} *</label>
                    <input
                      id="name"
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={form.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      style={fieldErrors.name ? { borderColor: "#ef4444" } : {}}
                      required
                    />
                    {fieldErrors.name && (
                      <span className="field-error-text" style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", display: "block" }}>
                        {fieldErrors.name}
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">{t("contact.yourEmail", "Email Address")} *</label>
                    <input
                      id="email"
                      type="email"
                      placeholder="rahul@example.com"
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      style={fieldErrors.email ? { borderColor: "#ef4444" } : {}}
                      required
                    />
                    {fieldErrors.email && (
                      <span className="field-error-text" style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", display: "block" }}>
                        {fieldErrors.email}
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="phone">{t("contact.phoneNumber", "Phone / WhatsApp (Optional)")}</label>
                    <input
                      id="phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      style={fieldErrors.phone ? { borderColor: "#ef4444" } : {}}
                    />
                    {fieldErrors.phone && (
                      <span className="field-error-text" style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", display: "block" }}>
                        {fieldErrors.phone}
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="topic">{t("contact.topic", "Topic of Inquiry")}</label>
                    <select
                      id="topic"
                      value={form.topic}
                      onChange={(e) => handleChange("topic", e.target.value)}
                    >
                      <option value="general">{t("contact.topicGeneral", "General Question")}</option>
                      <option value="printer">{t("contact.topicHardware", "Thermal Printer Setup")}</option>
                      <option value="template">{t("contact.topicCustom", "Custom Receipt Template")}</option>
                      <option value="pricing">{t("contact.topicPricing", "Pricing & Subscription")}</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="message">{t("contact.yourMessage", "Your Message")} *</label>
                  <textarea
                    id="message"
                    rows={4}
                    placeholder={t("contact.messagePlaceholder", "Tell us about your shop or what you need help with...")}
                    value={form.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                    style={fieldErrors.message ? { borderColor: "#ef4444" } : {}}
                    required
                  />
                  {fieldErrors.message && (
                    <span className="field-error-text" style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", display: "block" }}>
                      {fieldErrors.message}
                    </span>
                  )}
                </div>

                <button 
                  type="submit" 
                  className="cta-button primary full-width"
                  disabled={loading}
                >
                  {loading ? t("contact.sending", "Sending Message...") : (
                    <>
                      {t("contact.sendButton", "Send Message")} <Send size={16} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>



      {/* FAQ Accordion */}
      <section className="contact-faq-section">
        <div className="contact-faq-container">
          <div className="section-header">
            <p className="eyebrow">{t("contact.faqEyebrow", "COMMON QUESTIONS")}</p>
            <h2>{t("contact.faqTitle", "Frequently Asked Questions")}</h2>
            <p>{t("contact.faqSubtitle", "Quick answers to common questions about getting in touch and using Slipzo.")}</p>
          </div>
          <div className="faq-grid-two">
            {faqs.map((faq, i) => (
              <div className="faq-card" key={i}>
                <h4>{faq.q}</h4>
                <p>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section className="contact-cta-wrapper-section">
        <div className="contact-bottom-cta">
          <div className="bottom-cta-content">
            <h2>{t("contact.ctaTitle", "Ready to get started?")}</h2>
            <p>{t("contact.ctaSubtitle", "Create receipts in seconds. No credit card required.")}</p>
            <button className="cta-button primary large" onClick={() => setShowAuth(true)}>
              {t("contact.ctaButton", "Start Billing Free")} <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
