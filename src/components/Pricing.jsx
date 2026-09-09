import { useState } from "react"
import { ArrowRight, Check, Zap, Sparkles, Calculator, Sliders, ShieldCheck, HelpCircle } from "lucide-react"

export function Pricing({ setView, setShowAuth }) {
  const [customPrints, setCustomPrints] = useState(2500)

  // Preset plans: 1,000, 2,000, 5,000
  const plans = [
    {
      name: "Starter Pack",
      prints: "1,000 prints",
      price: "₹250",
      originalPrice: null,
      description: "Ideal for small shops and new merchants getting started with digital billing.",
      features: [
        "1,000 prints total",
        "₹0.25 per print standard rate",
        "All receipt templates included",
        "Thermal & POS printer support",
        "Basic shop profile & logo",
        "Email & chat support"
      ],
      cta: "Get 1,000 Prints",
      popular: false,
      savings: null,
      perPrintCost: "₹0.25 / print"
    },
    {
      name: "Pro Growth",
      prints: "2,000 prints",
      price: "₹450",
      originalPrice: "₹500",
      description: "Our most popular pack for active daily checkout counters.",
      features: [
        "2,000 prints total",
        "Save ₹50 (10% OFF discount)",
        "₹0.225 per print effective rate",
        "Advanced shop customization",
        "Sales analytics & Excel/CSV export",
        "WhatsApp receipt sharing",
        "Priority customer support"
      ],
      cta: "Get 2,000 Prints",
      popular: true,
      savings: "Save ₹50 (10% OFF)",
      perPrintCost: "₹0.225 / print"
    },
    {
      name: "Business Super",
      prints: "5,000 prints",
      price: "₹1,000",
      originalPrice: "₹1,250",
      description: "Maximum savings for high-volume retail stores & multi-counter setups.",
      features: [
        "5,000 prints total",
        "Save ₹250 (20% OFF discount)",
        "₹0.20 per print effective rate",
        "Everything in Pro Growth",
        "Multi-device & counter sync",
        "Dynamic UPI QR payment codes",
        "Dedicated account manager",
        "24/7 priority support"
      ],
      cta: "Get 5,000 Prints",
      popular: false,
      savings: "Save ₹250 (20% OFF)",
      perPrintCost: "₹0.20 / print"
    }
  ]

  // Calculate dynamic self-pricing for custom print count
  const calculateSelfPrice = (count) => {
    const validCount = Math.max(100, Math.min(50000, Number(count) || 100))
    let rate = 0.25
    let discountLabel = ""
    
    if (validCount >= 7500) {
      rate = 0.18
      discountLabel = "28% Volume Discount"
    } else if (validCount >= 3500) {
      rate = 0.20
      discountLabel = "20% Bulk Discount"
    } else if (validCount >= 1500) {
      rate = 0.225
      discountLabel = "10% Bulk Discount"
    }

    const baseCost = Math.round(validCount * 0.25)
    const finalPrice = Math.round(validCount * rate)
    const savings = Math.max(0, baseCost - finalPrice)
    const savingsPercent = baseCost > 0 ? Math.round((savings / baseCost) * 100) : 0

    return {
      count: validCount,
      rate,
      baseCost,
      finalPrice,
      savings,
      savingsPercent,
      discountLabel
    }
  }

  const calc = calculateSelfPrice(customPrints)

  const quickPresets = [250, 500, 1000, 2000, 3500, 5000, 10000]

  return (
    <div className="pricing-page">
      {/* Header */}
      <section className="pricing-header">
        <div className="pricing-header-content">
          <p className="eyebrow">SLIPZO PRICING</p>
          <h1>Pay only for what you print</h1>
          <p className="header-description">
            Transparent pricing based on ₹0.25 per print with automatic bulk discounts up to 28% OFF. No monthly subscriptions or hidden fees.
          </p>
        </div>
      </section>

      {/* Preset Plans (1,000, 2,000, 5,000) */}
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
                  {plan.originalPrice && (
                    <span style={{
                      textDecoration: 'line-through',
                      color: '#94a3b8',
                      fontSize: '1.25rem',
                      fontWeight: 500,
                      marginLeft: '0.4rem'
                    }}>
                      {plan.originalPrice}
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: '0.85rem',
                  color: plan.savings ? '#0284c7' : '#64748b',
                  marginTop: '-0.2rem',
                  marginBottom: '0.35rem',
                  fontWeight: 600
                }}>
                  {plan.perPrintCost}
                </div>
                {plan.savings && (
                  <div className="plan-savings" style={{ 
                    color: '#10b981', 
                    fontSize: '0.82rem', 
                    fontWeight: 700,
                    marginBottom: '0.5rem'
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

      {/* Interactive Custom Self-Pricing Calculator */}
      <section className="custom-pricing-section" style={{
        maxWidth: '1200px',
        margin: '0 auto 3rem',
        padding: '0 1.5rem'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '24px',
          padding: '2.5rem 2rem',
          color: 'white',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '240px',
            height: '240px',
            background: 'radial-gradient(circle, rgba(14, 165, 233, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            marginBottom: '0.5rem'
          }}>
            <span style={{
              background: '#0ea5e9',
              color: 'white',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.25rem 0.75rem',
              borderRadius: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <Calculator size={14} /> Self-Price Custom Pack
            </span>
          </div>

          <h2 style={{ fontSize: '1.85rem', fontWeight: 700, margin: '0.25rem 0 0.5rem' }}>
            Enter your exact print requirement
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: '650px', marginBottom: '2rem' }}>
            Need 250, 1,500, or 10,000 prints? Drag the slider or type your custom count below to calculate your instant bulk discount.
          </p>

          <div className="custom-pricing-grid">
            {/* Controls */}
            <div>
              {/* Preset Buttons */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 600 }}>
                  QUICK PRESETS
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {quickPresets.map(preset => (
                    <button
                      key={preset}
                      onClick={() => setCustomPrints(preset)}
                      style={{
                        background: customPrints === preset ? '#0ea5e9' : 'rgba(255, 255, 255, 0.08)',
                        color: 'white',
                        border: customPrints === preset ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.12)',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '10px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {preset.toLocaleString()} prints
                    </button>
                  ))}
                </div>
              </div>

              {/* Range Slider & Number Input */}
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div className="slider-header-controls">
                  <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>
                    <Sliders size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.4rem' }} />
                    Adjust Prints:
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <input
                      type="number"
                      min="100"
                      max="50000"
                      step="50"
                      value={customPrints}
                      onChange={(e) => setCustomPrints(Math.max(100, Math.min(50000, Number(e.target.value) || 100)))}
                      style={{
                        background: 'white',
                        color: '#0f172a',
                        border: 'none',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontWeight: 700,
                        width: '110px',
                        textAlign: 'right'
                      }}
                    />
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>prints</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="100"
                  max="20000"
                  step="100"
                  value={customPrints}
                  onChange={(e) => setCustomPrints(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: '8px',
                    accentColor: '#0ea5e9',
                    cursor: 'pointer'
                  }}
                />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                  <span>100 prints</span>
                  <span>5,000 prints</span>
                  <span>10,000 prints</span>
                  <span>20,000 prints</span>
                </div>
              </div>
            </div>

            {/* Self Price Output Card */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.07)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '20px',
              padding: '1.75rem',
              textAlign: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <p style={{ fontSize: '0.78rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#38bdf8', fontWeight: 700, margin: '0 0 0.35rem' }}>
                YOUR SELF PRICE
              </p>
              
              <div style={{ fontSize: '3rem', fontWeight: 800, color: 'white', lineHeight: 1, margin: '0.25rem 0' }}>
                ₹{calc.finalPrice.toLocaleString()}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0 1rem' }}>
                <span style={{ fontSize: '0.88rem', color: '#cbd5e1' }}>
                  Rate: <strong>₹{calc.rate} / print</strong>
                </span>
                {calc.baseCost > calc.finalPrice && (
                  <span style={{ textDecoration: 'line-through', fontSize: '0.82rem', color: '#64748b' }}>
                    ₹{calc.baseCost.toLocaleString()}
                  </span>
                )}
              </div>

              {calc.savings > 0 ? (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.18)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#34d399',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  marginBottom: '1.25rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <Sparkles size={16} /> 🎉 You Save ₹{calc.savings.toLocaleString()} ({calc.savingsPercent}% OFF)
                </div>
              ) : (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#cbd5e1',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  marginBottom: '1.25rem'
                }}>
                  Add 1,500+ prints to unlock bulk discounts!
                </div>
              )}

              <button
                onClick={() => setShowAuth(true)}
                style={{
                  width: '100%',
                  background: '#0ea5e9',
                  color: 'white',
                  border: 'none',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 6px 20px rgba(14, 165, 233, 0.4)'
                }}
              >
                Buy {calc.count.toLocaleString()} Prints for ₹{calc.finalPrice.toLocaleString()}
                <ArrowRight size={18} />
              </button>

              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.75rem', margin: '0.75rem 0 0 0' }}>
                <ShieldCheck size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.2rem', color: '#10b981' }} />
                Instant activation • Prints never expire
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Comparison Table */}
      <section className="pricing-comparison" style={{ 
        padding: '1rem 2rem 3rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{ 
          background: 'white', 
          borderRadius: '20px', 
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          padding: '1.75rem',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)'
        }}>
          <h3 style={{ 
            textAlign: 'center', 
            fontSize: '1.35rem', 
            fontWeight: 700,
            marginBottom: '1.5rem',
            color: '#0f172a'
          }}>
            Plan Comparison Summary
          </h3>
          
          {/* Desktop Comparison Table */}
          <div className="desktop-comparison-table">
            <div className="comparison-grid" style={{ 
              display: 'grid', 
              gridTemplateColumns: '1.8fr 1fr 1fr 1fr',
              gap: '0.5rem',
              fontSize: '0.9rem'
            }}>
              <div style={{ fontWeight: 700, color: '#64748b', padding: '0.65rem' }}>Feature / Plan</div>
              <div style={{ fontWeight: 700, color: '#0f172a', textAlign: 'center', padding: '0.65rem' }}>Starter Pack</div>
              <div style={{ fontWeight: 700, color: '#0ea5e9', textAlign: 'center', padding: '0.65rem' }}>Pro Growth (2K)</div>
              <div style={{ fontWeight: 700, color: '#10b981', textAlign: 'center', padding: '0.65rem' }}>Business (5K)</div>
              
              <div style={{ color: '#64748b', padding: '0.65rem', borderTop: '1px solid #f1f5f9' }}>Total Prints</div>
              <div style={{ textAlign: 'center', padding: '0.65rem', borderTop: '1px solid #f1f5f9', fontWeight: 600 }}>1,000</div>
              <div style={{ textAlign: 'center', padding: '0.65rem', borderTop: '1px solid #f1f5f9', fontWeight: 600 }}>2,000</div>
              <div style={{ textAlign: 'center', padding: '0.65rem', borderTop: '1px solid #f1f5f9', fontWeight: 600 }}>5,000</div>
              
              <div style={{ color: '#64748b', padding: '0.65rem', borderTop: '1px solid #f1f5f9' }}>Plan Price</div>
              <div style={{ textAlign: 'center', padding: '0.65rem', borderTop: '1px solid #f1f5f9' }}>₹250</div>
              <div style={{ textAlign: 'center', padding: '0.65rem', borderTop: '1px solid #f1f5f9', color: '#0ea5e9', fontWeight: 700 }}>₹450</div>
              <div style={{ textAlign: 'center', padding: '0.65rem', borderTop: '1px solid #f1f5f9', color: '#10b981', fontWeight: 700 }}>₹1,000</div>
              
              <div style={{ color: '#64748b', padding: '0.65rem', borderTop: '1px solid #f1f5f9' }}>Effective Unit Rate</div>
              <div style={{ textAlign: 'center', padding: '0.65rem', borderTop: '1px solid #f1f5f9' }}>₹0.25 / print</div>
              <div style={{ textAlign: 'center', padding: '0.65rem', borderTop: '1px solid #f1f5f9', color: '#0ea5e9', fontWeight: 600 }}>₹0.225 / print</div>
              <div style={{ textAlign: 'center', padding: '0.65rem', borderTop: '1px solid #f1f5f9', color: '#10b981', fontWeight: 700 }}>₹0.20 / print</div>
              
              <div style={{ color: '#64748b', padding: '0.65rem', borderTop: '1px solid #f1f5f9' }}>Discount & Savings</div>
              <div style={{ textAlign: 'center', padding: '0.65rem', borderTop: '1px solid #f1f5f9', color: '#94a3b8' }}>Standard Base</div>
              <div style={{ textAlign: 'center', padding: '0.65rem', borderTop: '1px solid #f1f5f9', color: '#0ea5e9', fontWeight: 700 }}>Save ₹50 (10% OFF)</div>
              <div style={{ textAlign: 'center', padding: '0.65rem', borderTop: '1px solid #f1f5f9', color: '#10b981', fontWeight: 700 }}>Save ₹250 (20% OFF)</div>
            </div>
          </div>

          {/* Mobile Non-Scrolling Comparison Cards */}
          <div className="mobile-comparison-cards">
            <div className="mobile-comp-card">
              <div className="comp-card-header">
                <h4>Starter Pack</h4>
                <span className="comp-price">₹250</span>
              </div>
              <div className="comp-card-row">
                <span>Total Prints</span>
                <strong>1,000 prints</strong>
              </div>
              <div className="comp-card-row">
                <span>Unit Rate</span>
                <strong>₹0.25 / print</strong>
              </div>
              <div className="comp-card-row">
                <span>Savings</span>
                <span className="badge-standard">Standard Base</span>
              </div>
            </div>

            <div className="mobile-comp-card popular">
              <div className="comp-card-header">
                <h4>Pro Growth (2K)</h4>
                <span className="comp-price">₹450</span>
              </div>
              <div className="comp-card-row">
                <span>Total Prints</span>
                <strong>2,000 prints</strong>
              </div>
              <div className="comp-card-row">
                <span>Unit Rate</span>
                <strong>₹0.225 / print</strong>
              </div>
              <div className="comp-card-row">
                <span>Savings</span>
                <span className="badge-savings blue">Save ₹50 (10% OFF)</span>
              </div>
            </div>

            <div className="mobile-comp-card best-value">
              <div className="comp-card-header">
                <h4>Business (5K)</h4>
                <span className="comp-price">₹1,000</span>
              </div>
              <div className="comp-card-row">
                <span>Total Prints</span>
                <strong>5,000 prints</strong>
              </div>
              <div className="comp-card-row">
                <span>Unit Rate</span>
                <strong>₹0.20 / print</strong>
              </div>
              <div className="comp-card-row">
                <span>Savings</span>
                <span className="badge-savings green">Save ₹250 (20% OFF)</span>
              </div>
            </div>
          </div>

          <div style={{ 
            marginTop: '1.25rem', 
            padding: '0.85rem 1.25rem', 
            background: '#f0f9ff', 
            border: '1px solid #bae6fd',
            borderRadius: '12px',
            fontSize: '0.85rem',
            color: '#0369a1',
            textAlign: 'center'
          }}>
            💡 <strong>Pro Tip:</strong> Buy larger packs or use our <strong>Self-Price Calculator</strong> above for up to <strong>28% volume discounts</strong> on high-volume print orders!
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pricing-cta">
        <div className="cta-content">
          <h2>Start billing with Slipzo today</h2>
          <p>Join thousands of retail shop owners across India. Quick 1-minute setup.</p>
          <button className="cta-button primary large" onClick={() => setShowAuth(true)}>
            Get Started Now <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </div>
  )
}