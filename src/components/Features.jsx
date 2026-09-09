import { ArrowRight, Zap, Printer, Store, Shield, Sparkles, Users, Clock, 
  Smartphone, Cloud, Palette, BarChart, CreditCard, RefreshCw } from "lucide-react"

export function Features({ setView, setShowAuth }) {
  const features = [
    {
      icon: <Zap size={24} />,
      title: "Lightning Fast",
      description: "Create receipts in under 10 seconds. Perfect for busy shops with long queues.",
      color: "#0ea5e9"
    },
    {
      icon: <Printer size={24} />,
      title: "Multiple Printer Support",
      description: "Works with 58mm thermal printers, 80mm receipt printers, and standard A4.",
      color: "#8b5cf6"
    },
    {
      icon: <Store size={24} />,
      title: "Shop Customization",
      description: "Add your logo, address, phone number, and GST details to every receipt.",
      color: "#f59e0b"
    },
    {
      icon: <Smartphone size={24} />,
      title: "Mobile Friendly",
      description: "Works perfectly on phones and tablets. Bill from anywhere in your shop.",
      color: "#10b981"
    },
    {
      icon: <Cloud size={24} />,
      title: "Cloud Backup",
      description: "All your receipts are saved securely. Access your history anytime, anywhere.",
      color: "#6366f1"
    },
    {
      icon: <Palette size={24} />,
      title: "Custom Templates",
      description: "Create receipt templates that match your brand. Save them for quick reuse.",
      color: "#ec4899"
    },
    {
      icon: <BarChart size={24} />,
      title: "Sales Analytics",
      description: "Track your daily sales, see what's selling, and understand your business better.",
      color: "#14b8a6"
    },
    {
      icon: <CreditCard size={24} />,
      title: "Multiple Payment Modes",
      description: "Accept Cash, UPI, Cards, Credit, and Online payments with ease.",
      color: "#f43f5e"
    },
    {
      icon: <RefreshCw size={24} />,
      title: "Easy Reprints",
      description: "Accidentally printed wrong receipt? Reprint any receipt from history.",
      color: "#8b5cf6"
    }
  ]

  return (
    <div className="features-page">
      {/* Header */}
      <section className="features-header">
        <div className="features-header-content">
          <p className="eyebrow">FEATURES</p>
          <h1>Everything you need to<br />run your billing smoothly</h1>
          <p className="header-description">
            Slipzo is built for small shops, by people who understand what shopkeepers need.
            No complexity. Just clean, fast billing.
          </p>
          <button className="cta-button primary" onClick={() => setShowAuth(true)}>
            Start billing free <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-grid-section">
        <div className="features-grid-container">
          {features.map((feature, index) => (
            <div className="feature-card-large" key={index}>
              <div className="feature-icon-large" style={{ color: feature.color }}>
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section className="features-testimonial">
        <div className="testimonial-container">
          <div className="testimonial-content">
            <p className="testimonial-quote">
              "I've been using Slipzo for 6 months now. It's reduced my billing time by 80%. 
              My customers love the professional receipts."
            </p>
            <div className="testimonial-author">
              <div className="author-avatar">PS</div>
              <div>
                <strong>Priya Sharma</strong>
                <span>Store owner, Mumbai</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="features-cta">
        <div className="cta-content">
          <h2>Ready to try Slipzo?</h2>
          <p>Start billing today. No credit card required.</p>
          <button className="cta-button primary large" onClick={() => setShowAuth(true)}>
            Get Started Free <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </div>
  )
}