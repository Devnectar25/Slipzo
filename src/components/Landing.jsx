import { useState, useEffect } from "react"
import Swal from "sweetalert2"
import {
  ArrowRight, Zap, Printer, Store, Shield, Sparkles, Users,
  Clock, Receipt, Eye, Edit, Copy, Printer as PrinterIcon,
  Plus, Star, CheckCircle, TrendingUp, Award, Gift,
  Smartphone, Cloud, Palette, BarChart, CreditCard, RefreshCw,
  FileText, Layout, Type, Briefcase, ChevronLeft, ChevronRight
} from "lucide-react"
import {
  getTemplateUsageStatus,
  incrementTemplateEdit,
  incrementTemplatePrint,
  canEditTemplate,
  canPrintTemplate,
  getRemainingEdits,
  getRemainingPrints
} from "../lib/utils"
import { MiniReceiptPreview } from "./MiniReceiptPreview"

export function Landing({ setView, setShowAuth, user }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [activeTemplateIndex, setActiveTemplateIndex] = useState(0)
  const [activeTestimonialIndex, setActiveTestimonialIndex] = useState(0)

  const testimonials = [
    {
      id: 1,
      rating: "4.9",
      quote: "Slipzo changed how I bill. No more messy notebooks or complex POS systems. Just clean, professional receipts every time. My customers love the digital look!",
      author: "Ramesh Kumar",
      role: "Shop Owner, Delhi",
      stats: "500+ receipts generated",
      initials: "RK",
      color: "#0ea5e9"
    },
    {
      id: 2,
      rating: "5.0",
      quote: "As a small cafe owner, I needed something fast and reliable. Slipzo allows me to print WhatsApp and thermal receipts in under 10 seconds!",
      author: "Priya Sharma",
      role: "Cafe Owner, Mumbai",
      stats: "1,200+ receipts generated",
      initials: "PS",
      color: "#10b981"
    },
    {
      id: 3,
      rating: "4.9",
      quote: "Extremely easy to customize template headers and taxes. Saved us hours during rush sales. Best billing tool for small retailers!",
      author: "Anish Patel",
      role: "Boutique Owner, Ahmedabad",
      stats: "850+ receipts generated",
      initials: "AP",
      color: "#0ea5e9"
    },
    {
      id: 4,
      rating: "5.0",
      quote: "The thermal print layout is crisp and looks super professional. Our customers appreciate receiving digital PDF receipts directly on WhatsApp.",
      author: "Vikram Singh",
      role: "Electronics Store, Bengaluru",
      stats: "2,000+ receipts generated",
      initials: "VS",
      color: "#f59e0b"
    }
  ]

  // Auto-rotate testimonials every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonialIndex((prev) => (prev + 1) % testimonials.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [testimonials.length])

  const templates = [
    {
      id: 2,
      name: "Minimal Bill",
      description: "Simple and clean design focused on clarity and readability",
      category: "Modern",
      color: "#0ea5e9",
      gradient: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
      icon: <Layout size={24} />,
      features: ["Clean layout", "Large text", "QR ready", "Mobile friendly"],
      isDefault: true,
      popularity: 98,
      preview: "minimal"
    },
    {
      id: 1,
      name: "Classic Receipt",
      description: "Clean and professional receipt template with all essential details",
      category: "Standard",
      color: "#0284c7",
      gradient: "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)",
      icon: <FileText size={24} />,
      features: ["Shop logo", "Itemized list", "Tax calculation", "Payment details"],
      isDefault: false,
      popularity: 92,
      preview: "classic"
    },
    {
      id: 3,
      name: "Shop Pro",
      description: "Professional template with enhanced branding options",
      category: "Business",
      color: "#2563eb",
      gradient: "linear-gradient(135deg, #60a5fa 0%, #1d4ed8 100%)",
      icon: <Store size={24} />,
      features: ["Brand colors", "Item images", "Discount display", "Loyalty points"],
      isDefault: false,
      popularity: 87,
      preview: "pro"
    },
    {
      id: 4,
      name: "Eco Print",
      description: "Space-efficient template ideal for thermal printers",
      category: "Efficient",
      color: "#0d9488",
      gradient: "linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)",
      icon: <Printer size={24} />,
      features: ["Compact design", "Fast printing", "Less paper", "Minimal ink"],
      isDefault: false,
      popularity: 85,
      preview: "eco"
    },
    {
      id: 5,
      name: "Modern Shop",
      description: "Contemporary design with modern typography and spacing",
      category: "Trendy",
      color: "#0ea5e9",
      gradient: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)",
      icon: <Type size={24} />,
      features: ["Modern fonts", "Clean spacing", "Color accent", "Social links"],
      isDefault: false,
      popularity: 90,
      preview: "modern"
    },
    {
      id: 6,
      name: "Business Elite",
      description: "Premium template for high-end retail and professional services",
      category: "Premium",
      color: "#0284c7",
      gradient: "linear-gradient(135deg, #38bdf8 0%, #0369a1 100%)",
      icon: <Award size={24} />,
      features: ["Premium look", "Watermark", "Signature line", "Terms & conditions"],
      isDefault: false,
      popularity: 95,
      preview: "elite"
    }
  ]

  // Get visible templates (3 at a time in circular order)
  const getVisibleTemplates = () => {
    const visible = []
    for (let i = 0; i < 3; i++) {
      const idx = (activeTemplateIndex + i) % templates.length
      visible.push(templates[idx])
    }
    return visible
  }

  // Auto-rotate carousel every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTemplateIndex((prev) => (prev + 1) % templates.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [templates.length])

  const nextTemplates = () => {
    setActiveTemplateIndex((prev) => (prev + 1) % templates.length)
  }

  const prevTemplates = () => {
    setActiveTemplateIndex((prev) => (prev - 1 + templates.length) % templates.length)
  }

  const handleGetStarted = () => {
    if (user) {
      setView("dashboard")
    } else {
      setShowAuth(true)
    }
  }

  const handleTemplateAction = (template, action) => {
    if (!user) {
      if (action === 'edit') {
        if (!canEditTemplate(template.id)) {
          Swal.fire({
            title: "Template Edit Limit",
            text: "You've used all 2 free edits for this template. Please sign up to get unlimited access.",
            icon: "warning",
            confirmButtonText: "Sign Up Free",
            confirmButtonColor: "#0ea5e9"
          }).then(() => setShowAuth(true))
          return
        }
        incrementTemplateEdit(template.id)
      }

      if (action === 'use' || action === 'print') {
        if (!canPrintTemplate(template.id)) {
          Swal.fire({
            title: "Free Prints Limit",
            text: "You've used all 10 free prints. Please sign up to get unlimited access.",
            icon: "warning",
            confirmButtonText: "Sign Up Free",
            confirmButtonColor: "#0ea5e9"
          }).then(() => setShowAuth(true))
          return
        }
      }
    }

    if (action === 'use') {
      sessionStorage.setItem("slipzo-template", template.id)
      if (!user) {
        setShowAuth(true)
        return
      }
      setView("bills")
    } else if (action === 'edit') {
      setSelectedTemplate(template)
      setShowTemplateModal(true)
    } else if (action === 'preview') {
      setSelectedTemplate(template)
      setShowTemplateModal(true)
    }
  }

  const renderUsageBadge = (templateId) => {
    if (user) return null

    const status = getTemplateUsageStatus(templateId)
    const hasRemaining = status.remainingEdits > 0 || status.remainingPrints > 0

    return (
      <div className="template-usage-badge" style={{
        fontSize: '0.6rem',
        color: hasRemaining ? '#64748b' : '#ef4444',
        marginTop: '0.25rem',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        padding: '0.15rem 0.5rem',
        background: hasRemaining ? '#f8fafc' : '#fef2f2',
        borderRadius: '4px'
      }}>
        <span>✏️ {status.remainingEdits} edits left</span>
        <span>🖨️ {status.remainingPrints} prints left</span>
        {!hasRemaining && (
          <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.55rem' }}>
            ⚡ Sign up
          </span>
        )}
      </div>
    )
  }

  const visibleTemplates = getVisibleTemplates()

  return (
    <div className="landing-page">
      {/* Hero Section with Templates Carousel */}
      <section className="hero-section hero-with-templates">
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <Sparkles size={14} />
              <span>Simple billing for small shops</span>
            </div>
            <h1>
              Digital receipts that<br />
              <span className="gradient-text">feel effortless</span>
            </h1>
            <p className="hero-description">
              Slipzo helps you create professional receipts in seconds.
              No complex setup. Just add items and print.
            </p>
            <div className="hero-actions">
              <button className="cta-button primary" onClick={handleGetStarted}>
                Start billing free <ArrowRight size={18} />
              </button>
              <button 
                className="cta-button secondary" 
                onClick={() => {
                  sessionStorage.setItem("slipzo-product-tab", "workflow")
                  setView("product")
                }}
              >
                <Play size={18} />
                See how it works
              </button>
            </div>
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-number">10k+</span>
                <span className="stat-label">Shops using Slipzo</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-number">50k+</span>
                <span className="stat-label">Receipts generated</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-number">4.9★</span>
                <span className="stat-label">User rating</span>
              </div>
            </div>
          </div>

          {/* Templates Carousel in Hero */}
          <div className="hero-templates-carousel">
            <div className="carousel-header">
              <span className="carousel-badge">
                <Star size={12} fill="#10b981" /> Popular Templates
              </span>
            </div>

            <div className="carousel-templates">
              {visibleTemplates.map((template, idx) => {
                const isCenter = idx === 1
                return (
                  <div
                    key={`${template.id}-${activeTemplateIndex}`}
                    className={`carousel-template-card pos-${idx} ${isCenter ? 'featured-center' : 'side-card'}`}
                    style={{
                      '--card-gradient': template.gradient,
                      '--accent-color': template.color,
                      '--card-index': idx
                    }}
                  >
                    <div className="carousel-template-preview">
                      <MiniReceiptPreview template={template} />
                    </div>
                    <div className="carousel-template-info">
                      <div className="carousel-template-name">
                        <span className="template-icon-small" style={{ color: template.color }}>
                          {template.icon}
                        </span>
                        {template.name}
                      </div>
                      <span className="carousel-template-category">{template.category}</span>
                    </div>
                    {renderUsageBadge(template.id)}
                    <div className="carousel-template-actions">
                      <button
                        className="carousel-template-btn preview"
                        onClick={() => handleTemplateAction(template, 'preview')}
                      >
                        <Eye size={12} /> Preview
                      </button>
                      <button
                        className="carousel-template-btn use"
                        style={{ background: template.gradient }}
                        onClick={() => handleTemplateAction(template, 'use')}
                      >
                        <PrinterIcon size={12} /> Use
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="carousel-dots">
              {templates.map((_, index) => (
                <button
                  key={index}
                  className={`carousel-dot ${index === activeTemplateIndex ? 'active' : ''}`}
                  onClick={() => setActiveTemplateIndex(index)}
                />
              ))}
            </div>

            <div className="carousel-view-all-wrapper">
              <button
                className="carousel-view-all"
                onClick={() => {
                  setView("templates")
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              >
                View all templates <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Templates Showcase - Full Grid */}
      <section className="templates-showcase">
        <div className="section-header">
          <div className="header-badge">
            <FileText size={16} />
            <span>All Templates</span>
          </div>
          <h2>Choose from our beautiful receipt designs</h2>
          <p className="section-description">
            Each template is crafted for clarity and professionalism.
            Pick one that matches your brand and start billing instantly.
          </p>
        </div>

        <div className="templates-grid">
          {templates.map((template) => (
            <div
              className={`template-card ${template.isDefault ? 'featured' : ''}`}
              key={template.id}
              style={{ '--card-gradient': template.gradient, '--accent-color': template.color }}
            >
              <div className="card-top-bar" style={{ background: template.gradient }}></div>
              {template.isDefault && (
                <div className="featured-badge">
                  <Star size={12} fill="#ffffff" /> Most Popular
                </div>
              )}

              <div className="template-preview">
                <MiniReceiptPreview template={template} />
              </div>

              <div className="template-info">
                <div className="template-name-row">
                  <h3>
                    <span className="template-icon-small" style={{ color: template.color }}>
                      {template.icon}
                    </span>
                    {template.name}
                  </h3>
                  <span className="template-category">{template.category}</span>
                </div>
                <p className="template-description">{template.description}</p>
                <div className="template-features">
                  {template.features.slice(0, 3).map((feature, idx) => (
                    <span key={idx} className="template-feature-tag">
                      <CheckCircle size={10} /> {feature}
                    </span>
                  ))}
                </div>
                <div className="template-popularity">
                  <div className="popularity-bar">
                    <div
                      className="popularity-fill"
                      style={{ width: `${template.popularity}%`, background: template.gradient }}
                    ></div>
                  </div>
                  <span className="popularity-text">{template.popularity}% users love this</span>
                </div>
                {renderUsageBadge(template.id)}
              </div>

              <div className="template-actions">
                <button
                  className="template-btn preview"
                  onClick={() => handleTemplateAction(template, 'preview')}
                >
                  <Eye size={14} /> Preview
                </button>
                <button
                  className="template-btn edit"
                  onClick={() => handleTemplateAction(template, 'edit')}
                >
                  <Edit size={14} /> Edit
                </button>
                <button
                  className="template-btn use"
                  style={{ background: template.gradient }}
                  onClick={() => handleTemplateAction(template, 'use')}
                >
                  <PrinterIcon size={14} /> Use
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="templates-cta">
          <button className="cta-button primary large" onClick={handleGetStarted}>
            <Plus size={18} /> Create Your Own Template
            <ArrowRight size={18} />
          </button>
          <p className="cta-subtext">No credit card required • Free forever</p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section">
        <div className="section-header">
          <div className="header-badge">
            <Zap size={16} />
            <span>Why Slipzo</span>
          </div>
          <h2>Everything you need to bill</h2>
          <p className="section-description">
            Built for small shops, by people who understand what shopkeepers need.
          </p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon" style={{ background: "#e0f2fe", color: "#0ea5e9" }}><Receipt size={28} /></div>
            <h3>Instant Receipts</h3>
            <p>Create and print receipts in seconds with our simple editor. Perfect for busy counters.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{ background: "#dcfce7", color: "#10b981" }}><Store size={28} /></div>
            <h3>Shop Profile</h3>
            <p>Set up your shop once. Your name, address, and phone appear on every receipt automatically.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{ background: "#e0f2fe", color: "#0ea5e9" }}><Printer size={28} /></div>
            <h3>Any Printer</h3>
            <p>Works with thermal 58mm printers, standard A4, and everything in between.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{ background: "#fef3c7", color: "#f59e0b" }}><Smartphone size={28} /></div>
            <h3>Mobile Friendly</h3>
            <p>Works perfectly on phones and tablets. Bill from anywhere in your shop.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{ background: "#e0f2fe", color: "#0284c7" }}><Cloud size={28} /></div>
            <h3>Cloud Backup</h3>
            <p>All your receipts are saved securely. Access your history anytime, anywhere.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{ background: "#ffe4e6", color: "#f43f5e" }}><Shield size={28} /></div>
            <h3>Secure & Free</h3>
            <p>Your data is safe. No credit card needed. Start billing with zero cost.</p>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="testimonial-section">
        <div className="section-header">
          <div className="header-badge">
            <Users size={16} />
            <span>Customer Feedback</span>
          </div>
          <h2>Our Customer Feedback</h2>
          <p className="section-description">
            See how thousands of shop owners use Slipzo to transform their daily billing.
          </p>
        </div>

        <div className="testimonial-container">
          <div className="testimonial-card-wrapper" key={activeTestimonialIndex}>
            <div className="testimonial-content">
              <div className="testimonial-rating">
                <span className="stars">★★★★★</span>
              </div>
              <p className="testimonial-quote">
                "{testimonials[activeTestimonialIndex].quote}"
              </p>
              <div className="testimonial-author">
                <div
                  className="author-avatar"
                  style={{ background: testimonials[activeTestimonialIndex].color }}
                >
                  {testimonials[activeTestimonialIndex].initials}
                </div>
                <div>
                  <strong>{testimonials[activeTestimonialIndex].author}</strong>
                  <span>{testimonials[activeTestimonialIndex].role} • {testimonials[activeTestimonialIndex].stats}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="testimonial-dots">
            {testimonials.map((_, index) => (
              <button
                key={index}
                className={`testimonial-dot ${index === activeTestimonialIndex ? 'active' : ''}`}
                onClick={() => setActiveTestimonialIndex(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <div className="cta-content">
          <div className="cta-badge">
            <Gift size={16} />
            <span>Start for free</span>
          </div>
          <h2>Ready to simplify your billing?</h2>
          <p>Join thousands of small shops using Slipzo to create professional receipts.</p>
          <button className="cta-button primary large" onClick={handleGetStarted}>
            Get Started Free <ArrowRight size={18} />
          </button>
          <span className="cta-note">No credit card required • Free forever</span>
        </div>
      </section>

      {/* Template Modal */}
      {showTemplateModal && selectedTemplate && (
        <div className="template-modal-overlay" onClick={() => setShowTemplateModal(false)}>
          <div className="template-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowTemplateModal(false)}>
              ✕
            </button>
            <div className="modal-header">
              <h2>
                <span style={{ color: selectedTemplate.color }}>{selectedTemplate.icon}</span>
                {selectedTemplate.name}
              </h2>
              <span className="modal-category">{selectedTemplate.category}</span>
            </div>
            <div className="modal-body">
              <div className="modal-preview-large">
                <MiniReceiptPreview template={selectedTemplate} />
              </div>
              <div className="modal-info">
                <h4>Template Features</h4>
                <ul className="modal-features-list">
                  {selectedTemplate.features.map((feature, idx) => (
                    <li key={idx}>
                      <CheckCircle size={16} color="#10b981" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {!user && (
                  <div className="modal-usage-info" style={{
                    padding: '0.5rem',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    fontSize: '0.8rem',
                    color: '#64748b'
                  }}>
                    {(() => {
                      const status = getTemplateUsageStatus(selectedTemplate.id)
                      return (
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                          <span>✏️ {status.remainingEdits} edits left</span>
                          <span>🖨️ {status.remainingPrints} prints left</span>
                        </div>
                      )
                    })()}
                  </div>
                )}
                <div className="modal-actions">
                  <button
                    className="modal-btn primary"
                    onClick={() => {
                      setShowTemplateModal(false)
                      sessionStorage.setItem("slipzo-template", selectedTemplate.id)
                      if (!user) {
                        setShowAuth(true)
                        return
                      }
                      setView("bills")
                    }}
                  >
                    <PrinterIcon size={16} /> Use Template
                  </button>
                  <button
                    className="modal-btn secondary"
                    onClick={() => {
                      setShowTemplateModal(false)
                      if (!user) {
                        if (!canEditTemplate(selectedTemplate.id)) {
                          Swal.fire({
                            title: "Edit Limit Reached",
                            text: "You've used all 2 free edits. Please sign up for unlimited access.",
                            icon: "warning",
                            confirmButtonText: "Sign Up Free",
                            confirmButtonColor: "#0ea5e9"
                          }).then(() => setShowAuth(true))
                          return
                        }
                        incrementTemplateEdit(selectedTemplate.id)
                        setShowAuth(true)
                        return
                      }
                      setView("templates")
                    }}
                  >
                    <Edit size={16} /> Edit Template
                  </button>
                  <button
                    className="modal-btn ghost"
                    onClick={() => {
                      setShowTemplateModal(false)
                      if (!user) {
                        setShowAuth(true)
                        return
                      }
                    }}
                  >
                    <Copy size={16} /> Duplicate
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Play({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}