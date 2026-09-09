import { useState } from "react"
import { ArrowRight, Mail, MessageCircle, Phone, HelpCircle, BookOpen, Zap } from "lucide-react"

export function Support({ setView, setShowAuth }) {
  const [form, setForm] = useState({ name: "", email: "", message: "" })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 5000)
  }

  const supportOptions = [
    {
      icon: <MessageCircle size={24} />,
      title: "Live Chat",
      description: "Chat with our support team in real-time",
      action: "Start chat",
      color: "#0ea5e9"
    },
    {
      icon: <Mail size={24} />,
      title: "Email Support",
      description: "Get help via email. We'll respond within 24 hours",
      action: "support@slipzo.com",
      color: "#8b5cf6"
    },
    {
      icon: <Phone size={24} />,
      title: "Phone Support",
      description: "Speak to our support team directly",
      action: "+91 12345 67890",
      color: "#10b981"
    },
    {
      icon: <HelpCircle size={24} />,
      title: "Knowledge Base",
      description: "Find answers in our comprehensive help center",
      action: "Browse articles",
      color: "#f59e0b"
    }
  ]

  return (
    <div className="support-page">
      {/* Header */}
      <section className="support-header">
        <div className="support-header-content">
          <p className="eyebrow">SUPPORT</p>
          <h1>How can we help you?</h1>
          <p className="header-description">
            We're here to help you with any questions or issues. Choose from the options below
            or send us a message.
          </p>
        </div>
      </section>

      {/* Support Options */}
      <section className="support-options">
        <div className="support-grid">
          {supportOptions.map((option, index) => (
            <div className="support-card" key={index}>
              <div className="support-icon" style={{ color: option.color }}>
                {option.icon}
              </div>
              <h3>{option.title}</h3>
              <p>{option.description}</p>
              <button className="support-action">
                {option.action} <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Form */}
      <section className="support-form-section">
        <div className="form-container">
          <div className="form-header">
            <h2>Send us a message</h2>
            <p>Fill out the form below and we'll get back to you within 24 hours.</p>
          </div>
          <form className="support-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Your Name</label>
              <input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                rows="5"
                placeholder="Describe your issue or question"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="cta-button primary">
              Send Message <ArrowRight size={18} />
            </button>
            {submitted && (
              <div className="success-message">
                ✓ Message sent successfully! We'll get back to you soon.
              </div>
            )}
          </form>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="support-faq">
        <div className="faq-content">
          <h2>Quick Answers</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h4>How do I create my first receipt?</h4>
              <p>Sign up, go to the Bill page, add items, and click Save. Your receipt will be ready to print.</p>
            </div>
            <div className="faq-item">
              <h4>Can I print on thermal printers?</h4>
              <p>Yes! Slipzo supports 58mm and 80mm thermal printers out of the box.</p>
            </div>
            <div className="faq-item">
              <h4>Is my data secure?</h4>
              <p>Yes, all data is encrypted and stored securely. We prioritize your data privacy.</p>
            </div>
            <div className="faq-item">
              <h4>How do I edit my shop profile?</h4>
              <p>Go to Shop Profile in the sidebar. You can update your shop name, address, and phone.</p>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        /* Enhanced Form Styles */
        .support-form-section .form-container {
          background: white;
          border-radius: 20px;
          padding: 2.5rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
          border: 1px solid #e2e8f0;
          max-width: 600px;
          margin: 0 auto;
        }

        .support-form-section .form-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .support-form-section .form-header h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 0.25rem;
        }

        .support-form-section .form-header p {
          color: #64748b;
          font-size: 0.95rem;
          margin: 0;
        }

        .support-form .form-group {
          margin-bottom: 1.25rem;
        }

        .support-form .form-group label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: #475569;
          margin-bottom: 0.4rem;
          letter-spacing: 0.3px;
        }

        .support-form .form-group input,
        .support-form .form-group textarea {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 0.95rem;
          font-family: inherit;
          transition: all 0.25s ease;
          background: #fafbfc;
          color: #0f172a;
        }

        .support-form .form-group input:focus,
        .support-form .form-group textarea:focus {
          outline: none;
          border-color: #0ea5e9;
          background: white;
          box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.08);
        }

        .support-form .form-group input:hover,
        .support-form .form-group textarea:hover {
          border-color: #94a3b8;
        }

        .support-form .form-group input::placeholder,
        .support-form .form-group textarea::placeholder {
          color: #94a3b8;
          font-weight: 400;
        }

        .support-form .form-group textarea {
          resize: vertical;
          min-height: 120px;
          line-height: 1.6;
        }

        .support-form .cta-button.primary {
          width: 100%;
          padding: 0.85rem 1.5rem;
          background: #0f172a;
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 0.25rem;
        }

        .support-form .cta-button.primary:hover {
          background: #1e293b;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.15);
        }

        .support-form .cta-button.primary:active {
          transform: translateY(0);
        }

        .support-form .success-message {
          margin-top: 1rem;
          padding: 0.9rem 1.25rem;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 10px;
          color: #16a34a;
          font-weight: 500;
          font-size: 0.95rem;
          text-align: center;
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .support-form-section .form-container {
            padding: 1.5rem;
            border-radius: 16px;
          }

          .support-form .form-group input,
          .support-form .form-group textarea {
            padding: 0.65rem 0.9rem;
            font-size: 0.9rem;
          }

          .support-form .cta-button.primary {
            padding: 0.75rem 1.25rem;
            font-size: 0.9rem;
          }
        }

        @media (max-width: 480px) {
          .support-form-section .form-container {
            padding: 1.25rem;
          }

          .support-form-section .form-header h2 {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </div>
  )
}