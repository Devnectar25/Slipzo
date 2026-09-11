import { useState, useEffect } from "react"
import { ArrowRight, Check, Zap, Sparkles, Calculator, Sliders, ShieldCheck, HelpCircle, Printer, RefreshCw } from "lucide-react"
import Swal from "sweetalert2"
import { getActivePlanDetails, activatePlan } from "../lib/utils"

export function Pricing({ setView, setShowAuth, user }) {
  const [customPrints, setCustomPrints] = useState(2500)
  const [activePlan, setActivePlan] = useState(getActivePlanDetails())

  useEffect(() => {
    const handleUpdate = () => {
      setActivePlan(getActivePlanDetails())
    }
    window.addEventListener("slipzo-quota-update", handleUpdate)
    window.addEventListener("storage", handleUpdate)
    return () => {
      window.removeEventListener("slipzo-quota-update", handleUpdate)
      window.removeEventListener("storage", handleUpdate)
    }
  }, [])

  const handleBuyPlan = async (planName, amountInRupees, printCount) => {
    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_SIPp9QznVVM48W'

    const loadRazorpay = () => {
      return new Promise((resolve) => {
        if (window.Razorpay) return resolve(true)
        const script = document.createElement("script")
        script.src = "https://checkout.razorpay.com/v1/checkout.js"
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        document.body.appendChild(script)
      })
    }

    const isLoaded = await loadRazorpay()
    if (!isLoaded) {
      Swal.fire({
        title: "Connection Error",
        text: "Razorpay SDK failed to load. Please check your internet connection.",
        icon: "warning",
        confirmButtonColor: "#0ea5e9"
      })
      return
    }

    const options = {
      key: razorpayKey,
      amount: amountInRupees * 100, // Amount in paise
      currency: "INR",
      name: "Slipzo Print Credits",
      description: `${planName} (${printCount.toLocaleString()} prints)`,
      image: "/logo.png",
      prefill: {
        name: user?.name || "",
        email: user?.email || "",
        contact: user?.shop_phone || ""
      },
      notes: {
        plan_name: planName,
        prints: printCount
      },
      theme: {
        color: "#0f172a"
      },
      handler: function (response) {
        console.log("💳 Razorpay Payment Success:", response.razorpay_payment_id)
        const updated = activatePlan(planName, printCount)
        if (updated) setActivePlan(updated)
        
        Swal.fire({
          title: "🎉 Payment Successful!",
          html: `
            <div style="text-align: center; font-size: 0.95rem; line-height: 1.6; color: #334155; padding: 0.5rem 0;">
              <p style="margin-bottom: 0.75rem; font-size: 0.9rem;">
                <strong>Payment ID:</strong> <code style="background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-weight: 700;">${response.razorpay_payment_id}</code>
              </p>
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 0.85rem 1rem; border-radius: 12px; color: #166534; font-weight: 600;">
                Your <strong>${printCount.toLocaleString()} print quota</strong> has been activated for <strong>${planName}</strong>!
              </div>
            </div>
          `,
          icon: "success",
          confirmButtonText: "Great, Let's Print!",
          confirmButtonColor: "#0ea5e9",
          background: "#ffffff",
          borderRadius: "20px"
        })
      },
      modal: {
        ondismiss: function () {
          console.log("Razorpay modal closed")
        }
      }
    }

    try {
      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (response) {
        Swal.fire({
          title: "Payment Declined",
          text: response.error?.description || "Transaction failed or was declined.",
          icon: "error",
          confirmButtonColor: "#ef4444"
        })
      })
      rzp.open()
    } catch (err) {
      console.error("Razorpay launch error:", err)
      Swal.fire({
        title: "Razorpay Error",
        text: err.message || "Failed to initialize payment gateway.",
        icon: "error",
        confirmButtonColor: "#ef4444"
      })
    }
  }

  // Preset plans: 1,000, 2,000, 5,000
  const plans = [
    {
      name: "Starter Pack",
      prints: "1,000 prints",
      numericPrints: 1000,
      price: "₹250",
      numericPrice: 250,
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
      numericPrints: 2000,
      price: "₹450",
      numericPrice: 450,
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
      numericPrints: 5000,
      price: "₹1,000",
      numericPrice: 1000,
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

      {/* Active Subscription & Print Quota Manager Banner */}
      <section style={{ maxWidth: '1200px', margin: '0 auto 2.5rem', padding: '0 1.5rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '20px',
          padding: '1.75rem 2rem',
          border: '1.5px solid #e2e8f0',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{
                  background: activePlan.isFreeTier ? '#fef3c7' : '#dcfce7',
                  color: activePlan.isFreeTier ? '#d97706' : '#15803d',
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
                  <ShieldCheck size={14} /> {activePlan.name || "Free Starter Tier"}
                </span>
                <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Active Plan</span>
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Printer size={22} style={{ color: '#0ea5e9' }} />
                {activePlan.printsRemaining?.toLocaleString()} prints remaining
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', flexWrap: 'wrap' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px' }}>TOTAL QUOTA</span>
                <strong style={{ fontSize: '1.15rem', color: '#0f172a', fontWeight: 800 }}>
                  {(activePlan.totalPrints || 10).toLocaleString()} prints
                </strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px' }}>PRINTS USED</span>
                <strong style={{ fontSize: '1.15rem', color: '#0ea5e9', fontWeight: 800 }}>
                  {(activePlan.usedPrints || (10 - activePlan.printsRemaining)).toLocaleString()} prints
                </strong>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '0.4rem' }}>
              <span>Print Quota Consumption</span>
              <span>
                {Math.round(((activePlan.usedPrints || (10 - activePlan.printsRemaining)) / (activePlan.totalPrints || 10)) * 100)}% Used
              </span>
            </div>
            <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, Math.max(0, ((activePlan.usedPrints || (10 - activePlan.printsRemaining)) / (activePlan.totalPrints || 10)) * 100))}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #38bdf8 0%, #0ea5e9 100%)',
                borderRadius: '9999px',
                transition: 'width 0.4s ease'
              }} />
            </div>
          </div>
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
                onClick={() => handleBuyPlan(plan.name, plan.numericPrice, plan.numericPrints)}
              >
                {plan.cta}
                <ArrowRight size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Custom Self-Pricing Calculator */}
      <section className="custom-pricing-section">
        <div className="custom-pricing-box">
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
              <div className="quick-presets-container" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 600 }}>
                  QUICK PRESETS
                </label>
                <div className="quick-presets-grid">
                  {quickPresets.map(preset => (
                    <button
                      key={preset}
                      onClick={() => setCustomPrints(preset)}
                      className={`preset-card-btn ${customPrints === preset ? 'active' : ''}`}
                    >
                      <span className="preset-count-text">{preset.toLocaleString()} prints</span>
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
                
                <div className="slider-marks" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem', gap: '0.25rem', flexWrap: 'wrap' }}>
                  <span>100 prints</span>
                  <span>5,000 prints</span>
                  <span>10,000 prints</span>
                  <span>20,000 prints</span>
                </div>
              </div>
            </div>

            {/* Self Price Output Card */}
            <div className="self-price-card" style={{
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
              
              <div className="self-price-amount" style={{ fontSize: '3rem', fontWeight: 800, color: 'white', lineHeight: 1, margin: '0.25rem 0' }}>
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
                <div className="self-price-savings-badge" style={{
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
                onClick={() => handleBuyPlan("Custom Print Pack", calc.finalPrice, calc.count)}
                className="custom-price-buy-btn"
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
                <ArrowRight size={15} />
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
      <section className="pricing-comparison">
        <div className="pricing-comparison-box">
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
          <button className="cta-button primary large" onClick={() => user ? setView?.("bills") : (setShowAuth ? setShowAuth(true) : setView?.("bills"))}>
            Get Started Now <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </div>
  )
}