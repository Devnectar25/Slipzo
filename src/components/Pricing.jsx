import { ArrowRight, Check, Shield, Zap, Users, Crown } from "lucide-react"

export function Pricing({ setView, setShowAuth }) {
  const plans = [
    {
      name: "Basic",
      price: "₹250",
      period: "",
      description: "Perfect for small shops just getting started",
      features: [
        "100 prints",
        "Basic shop profile",
        "Standard receipt templates",
        "Email support",
        "Print receipts",
        "Manual billing"
      ],
      cta: "Start Basic",
      popular: false,
      perPrintCost: "₹2.50/print"
    },
    {
      name: "Pro",
      price: "₹1,250",
      period: "",
      description: "Save ₹50 with Pro billing • 500 prints total",
      features: [
        "500 prints",
        "Advanced shop customization",
        "Custom receipt templates",
        "Priority support",
        "Sales analytics",
        "Export data",
        "Multiple printer support"
      ],
      cta: "Start Pro",
      popular: true,
      savings: "Save ₹50",
      perPrintCost: "₹2.50/print"
    },
    {
      name: "Business",
      price: "₹2,500",
      period: "",
      description: "Best value — save ₹200 • 1,000 prints total",
      features: [
        "1,000 prints",
        "Everything in Pro",
        "Multi-location support",
        "Advanced analytics",
        "Custom branding",
        "API access",
        "Dedicated account manager",
        "24/7 phone support",
        "Custom integrations"
      ],
      cta: "Start Business",
      popular: false,
      savings: "Save ₹200",
      perPrintCost: "₹2.50/print"
    }
  ]

  return (
    <div className="pricing-page">
      {/* Header */}
      <section className="pricing-header">
        <div className="pricing-header-content">
          <p className="eyebrow">PRICING</p>
          <h1>Simple, transparent pricing</h1>
          <p className="header-description">
            Choose the plan that fits your shop. All plans include core features to start billing immediately.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="pricing-plans">
        <div className="plans-grid">
          {plans.map((plan, index) => (
            <div className={`pricing-card ${plan.popular ? 'popular' : ''}`} key={index}>
              {plan.popular && (
                <div className="popular-badge">
                  <Zap size={14} /> Most Popular
                </div>
              )}
              {plan.savings && !plan.popular && (
                <div className="popular-badge" style={{ background: '#10b981' }}>
                  🎉 {plan.savings}
                </div>
              )}
              <div className="plan-header">
                <h3>{plan.name}</h3>
                <div className="plan-price">
                  <span className="price-amount">{plan.price}</span>
                  {plan.period && <span className="price-period">{plan.period}</span>}
                </div>
                <div style={{
                  fontSize: '0.85rem',
                  color: '#64748b',
                  marginTop: '-0.25rem',
                  marginBottom: '0.25rem',
                  fontWeight: 500
                }}>
                  {plan.perPrintCost}
                </div>
                {plan.savings && (
                  <div className="plan-savings" style={{ 
                    color: '#10b981', 
                    fontSize: '0.8rem', 
                    fontWeight: 600,
                    marginTop: '-0.25rem',
                    marginBottom: '0.25rem'
                  }}>
                    🎉 {plan.savings}
                  </div>
                )}
                <p className="plan-description">{plan.description}</p>
              </div>
              <div className="plan-features">
                {plan.features.map((feature, idx) => (
                  <div className="plan-feature" key={idx}>
                    <Check size={16} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <button 
                className={`plan-cta ${plan.popular ? 'primary' : 'secondary'}`}
                onClick={() => setShowAuth(true)}
              >
                {plan.cta}
                <ArrowRight size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Comparison Table */}
      <section className="pricing-comparison" style={{ 
        padding: '3rem 2rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{ 
          background: 'white', 
          borderRadius: '16px', 
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          padding: '1.5rem'
        }}>
          <h3 style={{ 
            textAlign: 'center', 
            fontSize: '1.25rem', 
            fontWeight: 600,
            marginBottom: '1.5rem',
            color: '#0f172a'
          }}>
            Compare Plans
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            gap: '0.5rem',
            fontSize: '0.9rem'
          }}>
            <div style={{ fontWeight: 600, color: '#64748b', padding: '0.5rem' }}>Feature</div>
            <div style={{ fontWeight: 600, color: '#0f172a', textAlign: 'center', padding: '0.5rem' }}>Basic</div>
            <div style={{ fontWeight: 600, color: '#0f172a', textAlign: 'center', padding: '0.5rem' }}>Pro</div>
            <div style={{ fontWeight: 600, color: '#0f172a', textAlign: 'center', padding: '0.5rem' }}>Business</div>
            
            <div style={{ color: '#64748b', padding: '0.5rem', borderTop: '1px solid #f1f5f9' }}>Price</div>
            <div style={{ textAlign: 'center', padding: '0.5rem', borderTop: '1px solid #f1f5f9' }}>₹250</div>
            <div style={{ textAlign: 'center', padding: '0.5rem', borderTop: '1px solid #f1f5f9', color: '#10b981', fontWeight: 600 }}>₹1,250</div>
            <div style={{ textAlign: 'center', padding: '0.5rem', borderTop: '1px solid #f1f5f9', color: '#0ea5e9', fontWeight: 600 }}>₹2,500</div>
            
            <div style={{ color: '#64748b', padding: '0.5rem', borderTop: '1px solid #f1f5f9' }}>Total Prints</div>
            <div style={{ textAlign: 'center', padding: '0.5rem', borderTop: '1px solid #f1f5f9' }}>100</div>
            <div style={{ textAlign: 'center', padding: '0.5rem', borderTop: '1px solid #f1f5f9' }}>500</div>
            <div style={{ textAlign: 'center', padding: '0.5rem', borderTop: '1px solid #f1f5f9' }}>1,000</div>
            
            <div style={{ color: '#64748b', padding: '0.5rem', borderTop: '1px solid #f1f5f9' }}>Cost per Print</div>
            <div style={{ textAlign: 'center', padding: '0.5rem', borderTop: '1px solid #f1f5f9' }}>₹2.50</div>
            <div style={{ textAlign: 'center', padding: '0.5rem', borderTop: '1px solid #f1f5f9' }}>₹2.50</div>
            <div style={{ textAlign: 'center', padding: '0.5rem', borderTop: '1px solid #f1f5f9' }}>₹2.50</div>
            
            <div style={{ color: '#64748b', padding: '0.5rem', borderTop: '1px solid #f1f5f9' }}>Savings</div>
            <div style={{ textAlign: 'center', padding: '0.5rem', borderTop: '1px solid #f1f5f9' }}>—</div>
            <div style={{ textAlign: 'center', padding: '0.5rem', borderTop: '1px solid #f1f5f9', color: '#10b981' }}>₹50 off</div>
            <div style={{ textAlign: 'center', padding: '0.5rem', borderTop: '1px solid #f1f5f9', color: '#0ea5e9' }}>₹200 off</div>
          </div>
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem', 
            background: '#f8fafc', 
            borderRadius: '8px',
            fontSize: '0.8rem',
            color: '#64748b',
            textAlign: 'center'
          }}>
            <strong style={{ color: '#0f172a' }}> Best Value:</strong> Business plan saves you ₹200 and gives you 1,000 prints — just ₹2.50 per print!
          </div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="pricing-faq">
        <div className="faq-content">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h4>What happens if I exceed my print limit?</h4>
              <p>You'll receive a notification when you're close to your limit. You can upgrade anytime to get more prints.</p>
            </div>
            <div className="faq-item">
              <h4>Can I change plans later?</h4>
              <p>Yes, you can upgrade or downgrade your plan anytime. Changes take effect immediately.</p>
            </div>
            <div className="faq-item">
              <h4>Is there a setup fee?</h4>
              <p>No setup fee. Start billing immediately after creating your account.</p>
            </div>
            <div className="faq-item">
              <h4>What payment methods do you accept?</h4>
              <p>We accept all major credit cards, UPI, and net banking.</p>
            </div>
            <div className="faq-item">
              <h4>Can I cancel anytime?</h4>
              <p>Yes, you can cancel your subscription anytime. No questions asked.</p>
            </div>
            <div className="faq-item">
              <h4>Is there a free trial?</h4>
              <p>Yes, start with our Basic plan and cancel anytime. No long-term commitment.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pricing-cta">
        <div className="cta-content">
          <h2>Start billing with Slipzo</h2>
          <p>Join thousands of happy shop owners. No credit card required.</p>
          <button className="cta-button primary large" onClick={() => setShowAuth(true)}>
            Get Started Free <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </div>
  )
}