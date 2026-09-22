import { useState, useEffect } from "react"
import { ArrowRight, Check, Zap, Sparkles, Calculator, Sliders, ShieldCheck, HelpCircle, Printer, RefreshCw } from "lucide-react"
import Swal from "sweetalert2"
import { useTranslation } from "react-i18next"
import { getActivePlanDetails, activatePlan, syncUserQuota, call, getCurrentUserKey } from "../lib/utils"

export function Pricing({ setView, setShowAuth, user }) {
  const { t } = useTranslation()
  const [customPrints, setCustomPrints] = useState(2500)
  const userKey = getCurrentUserKey(user)
  const [activePlan, setActivePlan] = useState(() => getActivePlanDetails(userKey))

  useEffect(() => {
    let isMounted = true
    const currentKey = getCurrentUserKey(user)

    const fetchFreshQuota = async () => {
      if (!user) return
      try {
        const subRes = await call("/subscriptions/my")
        if (subRes && subRes.quota && isMounted) {
          const synced = syncUserQuota(subRes.quota, currentKey)
          if (synced) setActivePlan(synced)
        }
      } catch (err) {
        console.warn("Could not fetch user quota in Pricing:", err)
      }
    }

    fetchFreshQuota()

    const handleUpdate = () => {
      setActivePlan(getActivePlanDetails(getCurrentUserKey(user)))
    }
    window.addEventListener("slipzo-quota-update", handleUpdate)
    window.addEventListener("storage", handleUpdate)
    return () => {
      isMounted = false
      window.removeEventListener("slipzo-quota-update", handleUpdate)
      window.removeEventListener("storage", handleUpdate)
    }
  }, [user])

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
        confirmButtonColor: "#FB821B"
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
        color: "#0C1F41"
      },
      handler: async function (response) {
        console.log("💳 Razorpay Payment Success:", response.razorpay_payment_id)
        const currentUserKey = user?.email || user?.id
        const updated = activatePlan(planName, printCount, currentUserKey)
        if (updated) setActivePlan(updated)
        
        // Persist purchase data into backend subscriptions database table
        try {
          const subRes = await call('/subscriptions', {
            method: 'POST',
            body: JSON.stringify({
              plan_name: planName,
              amount: amountInRupees,
              prints_count: printCount,
              payment_id: response.razorpay_payment_id || `PAY_${Date.now()}`,
              payment_status: 'completed',
              user_name: user?.name || 'Slipzo Member',
              user_email: user?.email || ''
            })
          })
          if (subRes && subRes.quota) {
            syncUserQuota(subRes.quota, currentUserKey)
          }
          console.log('✅ Subscription saved to database!')
        } catch (subErr) {
          console.warn('⚠️ Could not persist subscription to DB backend:', subErr)
        }
        
        Swal.fire({
          title: "🎉 Payment Successful!",
          html: `
            <div style="text-align: center; font-size: 0.95rem; line-height: 1.6; color: #0C1F41; padding: 0.5rem 0;">
              <p style="margin-bottom: 0.75rem; font-size: 0.9rem;">
                <strong>Payment ID:</strong> <code style="background: #FFE6D2; color: #FA4406; padding: 4px 10px; border-radius: 6px; font-weight: 700;">${response.razorpay_payment_id}</code>
              </p>
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 0.85rem 1rem; border-radius: 12px; color: #166534; font-weight: 600;">
                Your <strong>${printCount.toLocaleString()} print quota</strong> has been activated for <strong>${planName}</strong>!
              </div>
            </div>
          `,
          icon: "success",
          confirmButtonText: "Great, Let's Print!",
          confirmButtonColor: "#FB821B",
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
      name: t("pricing.starterPack", "Starter Pack"),
      rawName: "Starter Pack",
      prints: `1,000 ${t("pricing.prints", "prints")}`,
      numericPrints: 1000,
      price: "₹250",
      numericPrice: 250,
      originalPrice: null,
      description: t("pricing.starterPackDesc", "Ideal for small shops and new merchants getting started with digital billing."),
      features: [
        t("pricing.feature1000Prints", "1,000 prints total"),
        t("pricing.featureRate25", "₹0.25 per print standard rate"),
        t("pricing.featureAllTemplates", "All receipt templates included"),
        t("pricing.featureThermalPOS", "Thermal & POS printer support"),
        t("pricing.featureBasicProfile", "Basic shop profile & logo"),
        t("pricing.featureEmailChat", "Email & chat support")
      ],
      cta: t("pricing.getPrints", { count: "1,000", defaultValue: "Get 1,000 Prints" }),
      popular: false,
      savings: null,
      perPrintCost: `₹0.25 ${t("pricing.perPrint", "/ print")}`
    },
    {
      name: t("pricing.proGrowth", "Pro Growth"),
      rawName: "Pro Growth",
      prints: `2,000 ${t("pricing.prints", "prints")}`,
      numericPrints: 2000,
      price: "₹450",
      numericPrice: 450,
      originalPrice: "₹500",
      description: t("pricing.proGrowthDesc", "Our most popular pack for active daily checkout counters."),
      features: [
        t("pricing.feature2000Prints", "2,000 prints total"),
        t("pricing.save50", "Save ₹50 (10% OFF)"),
        t("pricing.featureRate225", "₹0.225 per print effective rate"),
        t("pricing.featureAdvancedCustom", "Advanced shop customization"),
        t("pricing.featureSalesAnalytics", "Sales analytics & Excel/CSV export"),
        t("pricing.featureWhatsappShare", "WhatsApp receipt sharing"),
        t("pricing.featurePrioritySupport", "Priority customer support")
      ],
      cta: t("pricing.getPrints", { count: "2,000", defaultValue: "Get 2,000 Prints" }),
      popular: true,
      savings: t("pricing.save50", "Save ₹50 (10% OFF)"),
      perPrintCost: `₹0.225 ${t("pricing.perPrint", "/ print")}`
    },
    {
      name: t("pricing.businessSuper", "Business Super"),
      rawName: "Business Super",
      prints: `5,000 ${t("pricing.prints", "prints")}`,
      numericPrints: 5000,
      price: "₹1,000",
      numericPrice: 1000,
      originalPrice: "₹1,250",
      description: t("pricing.businessSuperDesc", "Maximum savings for high-volume retail stores & multi-counter setups."),
      features: [
        t("pricing.feature5000Prints", "5,000 prints total"),
        t("pricing.save250", "Save ₹250 (20% OFF)"),
        t("pricing.featureRate20", "₹0.20 per print effective rate"),
        t("pricing.featureProPlus", "Everything in Pro Growth"),
        t("pricing.featureMultiDevice", "Multi-device & counter sync"),
        t("pricing.featureDynamicUpi", "Dynamic UPI QR payment codes"),
        t("pricing.featureDedicatedManager", "Dedicated account manager"),
        t("pricing.feature247Support", "24/7 priority support")
      ],
      cta: t("pricing.getPrints", { count: "5,000", defaultValue: "Get 5,000 Prints" }),
      popular: false,
      savings: t("pricing.save250", "Save ₹250 (20% OFF)"),
      perPrintCost: `₹0.20 ${t("pricing.perPrint", "/ print")}`
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
          <p className="eyebrow">{t("pricing.eyebrow", "SLIPZO PRICING")}</p>
          <h1>{t("pricing.title", "Pay only for what you print")}</h1>
          <p className="header-description">
            {t("pricing.subtitle", "Transparent pricing based on ₹0.25 per print with automatic bulk discounts up to 28% OFF. No monthly subscriptions or hidden fees.")}
          </p>
        </div>
      </section>

      {/* Active Subscription & Print Quota Manager Banner */}
      <section className="active-quota-section" style={{ maxWidth: '1200px', margin: '0 auto 2.5rem', padding: '0 1.5rem' }}>
        <div className="active-quota-card" style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #FFF2DE 100%)',
          borderRadius: '20px',
          padding: '1.75rem 2rem',
          border: '1.5px solid #F7CDAB',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div className="active-quota-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div className="active-quota-info">
              <div className="active-plan-tag-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span className="active-plan-badge" style={{
                  background: activePlan.isFreeTier ? '#FFF0C7' : '#dcfce7',
                  color: activePlan.isFreeTier ? '#d97706' : '#15803d',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  whiteSpace: 'nowrap'
                }}>
                  <ShieldCheck size={14} /> {activePlan.name || t("pricing.freeStarterTier", "Free Starter Tier")}
                </span>
                <span style={{ fontSize: '0.82rem', color: '#74788A', fontWeight: 600 }}>{t("pricing.activePlan", "Active Plan")}</span>
              </div>
              <h2 className="active-quota-heading" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0C1F41', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Printer size={22} style={{ color: '#FB821B' }} />
                {activePlan.printsRemaining?.toLocaleString()} {t("pricing.printsRemaining", "prints remaining")}
              </h2>
            </div>

            <div className="active-quota-stats-row" style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', flexWrap: 'wrap' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.72rem', color: '#74788A', fontWeight: 700, letterSpacing: '0.5px' }}>{t("pricing.totalQuota", "TOTAL QUOTA")}</span>
                <strong style={{ fontSize: '1.15rem', color: '#0C1F41', fontWeight: 800 }}>
                  {(activePlan.totalPrints || 10).toLocaleString()} {t("pricing.prints", "prints")}
                </strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.72rem', color: '#74788A', fontWeight: 700, letterSpacing: '0.5px' }}>{t("pricing.printsUsed", "PRINTS USED")}</span>
                <strong style={{ fontSize: '1.15rem', color: '#FB821B', fontWeight: 800 }}>
                  {(activePlan.usedPrints || (10 - activePlan.printsRemaining)).toLocaleString()} {t("pricing.prints", "prints")}
                </strong>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#74788A', fontWeight: 600, marginBottom: '0.4rem' }}>
              <span>{t("pricing.quotaConsumption", "Print Quota Consumption")}</span>
              <span>
                {Math.round(((activePlan.usedPrints || (10 - activePlan.printsRemaining)) / (activePlan.totalPrints || 10)) * 100)}% {t("pricing.used", "Used")}
              </span>
            </div>
            <div style={{ width: '100%', height: '10px', background: '#F7CDAB', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, Math.max(0, ((activePlan.usedPrints || (10 - activePlan.printsRemaining)) / (activePlan.totalPrints || 10)) * 100))}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #FC9B3E 0%, #FB821B 100%)',
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
                  <Zap size={14} /> {t("pricing.mostPopular", "Most Popular")}
                </div>
              )}
              {plan.savings && !plan.popular && (
                <div className="popular-badge green-badge" style={{ background: '#10b981' }}>
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
                      color: '#8F93A5',
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
                  color: plan.savings ? '#F66016' : '#74788A',
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
                onClick={() => handleBuyPlan(plan.rawName || plan.name, plan.numericPrice, plan.numericPrints)}
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
            background: 'radial-gradient(circle, rgba(246, 96, 22, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            marginBottom: '0.5rem'
          }}>
            <span style={{
              background: '#FB821B',
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
              <Calculator size={14} /> {t("pricing.selfPriceEyebrow", "Self-Price Custom Pack")}
            </span>
          </div>

          <h2 style={{ fontSize: '1.85rem', fontWeight: 700, margin: '0.25rem 0 0.5rem' }}>
            {t("pricing.selfPriceTitle", "Enter your exact print requirement")}
          </h2>
          <p style={{ color: '#8F93A5', fontSize: '0.95rem', maxWidth: '650px', marginBottom: '2rem' }}>
            {t("pricing.selfPriceDesc", "Need 250, 1,500, or 10,000 prints? Drag the slider or type your custom count below to calculate your instant bulk discount.")}
          </p>

          <div className="custom-pricing-grid">
            {/* Controls */}
            <div>
              {/* Preset Buttons */}
              <div className="quick-presets-container" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#8F93A5', marginBottom: '0.5rem', fontWeight: 600 }}>
                  {t("pricing.quickPresets", "QUICK PRESETS")}
                </label>
                <div className="quick-presets-grid">
                  {quickPresets.map(preset => (
                    <button
                      key={preset}
                      onClick={() => setCustomPrints(preset)}
                      className={`preset-card-btn ${customPrints === preset ? 'active' : ''}`}
                    >
                      <span className="preset-count-text">{preset.toLocaleString()} {t("pricing.prints", "prints")}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Range Slider & Number Input */}
              <div className="adjust-prints-card" style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div className="slider-header-controls">
                  <span style={{ fontSize: '0.85rem', color: '#D9DDE4', fontWeight: 600 }}>
                    <Sliders size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.4rem' }} />
                    {t("pricing.adjustPrints", "Adjust Prints:")}
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
                        color: '#0C1F41',
                        border: 'none',
                        padding: '0.4rem 0.5rem',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontWeight: 700,
                        width: '95px',
                        textAlign: 'center'
                      }}
                    />
                    <span style={{ fontSize: '0.85rem', color: '#8F93A5', fontWeight: 600 }}>{t("pricing.prints", "prints")}</span>
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
                    accentColor: '#FB821B',
                    cursor: 'pointer'
                  }}
                />
                
                <div className="slider-marks" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#74788A', marginTop: '0.35rem', gap: '0.25rem', flexWrap: 'wrap' }}>
                  <span>100 {t("pricing.prints", "prints")}</span>
                  <span>5,000 {t("pricing.prints", "prints")}</span>
                  <span>10,000 {t("pricing.prints", "prints")}</span>
                  <span>20,000 {t("pricing.prints", "prints")}</span>
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
              <p style={{ fontSize: '0.78rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#FC9B3E', fontWeight: 700, margin: '0 0 0.35rem' }}>
                {t("pricing.yourSelfPrice", "YOUR SELF PRICE")}
              </p>
              
              <div className="self-price-amount" style={{ fontSize: '3rem', fontWeight: 800, color: 'white', lineHeight: 1, margin: '0.25rem 0' }}>
                ₹{calc.finalPrice.toLocaleString()}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0 1rem' }}>
                <span style={{ fontSize: '0.88rem', color: '#D9DDE4' }}>
                  {t("pricing.rate", "Rate:")} <strong>₹{calc.rate} {t("pricing.perPrint", "/ print")}</strong>
                </span>
                {calc.baseCost > calc.finalPrice && (
                  <span style={{ textDecoration: 'line-through', fontSize: '0.82rem', color: '#74788A' }}>
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
                  <Sparkles size={16} /> {t("pricing.youSave", { amount: calc.savings.toLocaleString(), percent: calc.savingsPercent, defaultValue: `🎉 You Save ₹${calc.savings.toLocaleString()} (${calc.savingsPercent}% OFF)` })}
                </div>
              ) : (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#D9DDE4',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  marginBottom: '1.25rem'
                }}>
                  {t("pricing.bulkDiscountHint", "Add 1,500+ prints to unlock bulk discounts!")}
                </div>
              )}

              <button
                onClick={() => handleBuyPlan("Custom Print Pack", calc.finalPrice, calc.count)}
                className="custom-price-buy-btn"
                style={{
                  width: '100%',
                  background: '#FB821B',
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
                  boxShadow: '0 6px 20px rgba(246, 96, 22, 0.4)'
                }}
              >
                {t("pricing.buyCustomBtn", { count: calc.count.toLocaleString(), price: calc.finalPrice.toLocaleString(), defaultValue: `Buy ${calc.count.toLocaleString()} Prints for ₹${calc.finalPrice.toLocaleString()}` })}
                <ArrowRight size={15} />
              </button>

              <p style={{ fontSize: '0.75rem', color: '#74788A', marginTop: '0.75rem', margin: '0.75rem 0 0 0' }}>
                <ShieldCheck size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.2rem', color: '#10b981' }} />
                {t("pricing.instantActivation", "Instant activation • Prints never expire")}
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
            color: '#0C1F41'
          }}>
            {t("pricing.comparisonTitle", "Plan Comparison Summary")}
          </h3>
          
          {/* Desktop Comparison Table */}
          <div className="desktop-comparison-table">
            <div className="comparison-grid" style={{ 
              display: 'grid', 
              gridTemplateColumns: '1.8fr 1fr 1fr 1fr',
              gap: '0.5rem',
              fontSize: '0.9rem'
            }}>
              <div style={{ fontWeight: 700, color: '#74788A', padding: '0.65rem' }}>{t("pricing.colFeature", "Feature / Plan")}</div>
              <div style={{ fontWeight: 700, color: '#0C1F41', textAlign: 'center', padding: '0.65rem' }}>{t("pricing.colStarter", "Starter Pack")}</div>
              <div style={{ fontWeight: 700, color: '#FB821B', textAlign: 'center', padding: '0.65rem' }}>{t("pricing.colPro", "Pro Growth (2K)")}</div>
              <div style={{ fontWeight: 700, color: '#10b981', textAlign: 'center', padding: '0.65rem' }}>{t("pricing.colBusiness", "Business (5K)")}</div>
              
              <div style={{ color: '#74788A', padding: '0.65rem', borderTop: '1px solid #FDF4EB' }}>{t("pricing.rowTotalPrints", "Total Prints")}</div>
              <div style={{ textAlign: 'center', padding: '0.65rem', borderTop: '1px solid #FDF4EB', fontWeight: 600 }}>1,000</div>
              <div style={{ textAlign: 'center', padding: '0.65rem', borderTop: '1px solid #FDF4EB', fontWeight: 600 }}>2,000</div>
              <div style={{ textAlign: 'center', padding: '0.65rem', borderTop: '1px solid #FDF4EB', fontWeight: 600 }}>5,000</div>
              
              <div style={{ color: '#74788A', padding: '0.65rem', borderTop: '1px solid #FDF4EB' }}>{t("pricing.rowPlanPrice", "Plan Price")}</div>
              <div style={{ textAlign: 'center', padding: '0.65rem', borderTop: '1px solid #FDF4EB' }}>₹250</div>
              <div style={{ textAlign: 'center', padding: '0.65rem', borderTop: '1px solid #FDF4EB', color: '#FB821B', fontWeight: 700 }}>₹450</div>
              <div style={{ textAlign: 'center', padding: '0.65rem', borderTop: '1px solid #FDF4EB', color: '#10b981', fontWeight: 700 }}>₹1,000</div>
              
              <div style={{ color: '#74788A', padding: '0.65rem', borderTop: '1px solid #FDF4EB' }}>{t("pricing.rowUnitRate", "Effective Unit Rate")}</div>
              <div style={{ textAlign: 'center', padding: '0.65rem', borderTop: '1px solid #FDF4EB' }}>₹0.25 {t("pricing.perPrint", "/ print")}</div>
              <div style={{ textAlign: 'center', padding: '0.65rem', borderTop: '1px solid #FDF4EB', color: '#FB821B', fontWeight: 600 }}>₹0.225 {t("pricing.perPrint", "/ print")}</div>
              <div style={{ textAlign: 'center', padding: '0.65rem', borderTop: '1px solid #FDF4EB', color: '#10b981', fontWeight: 700 }}>₹0.20 {t("pricing.perPrint", "/ print")}</div>
              
              <div style={{ color: '#74788A', padding: '0.65rem', borderTop: '1px solid #FDF4EB' }}>{t("pricing.rowSavings", "Discount & Savings")}</div>
              <div style={{ textAlign: 'center', padding: '0.65rem', borderTop: '1px solid #FDF4EB', color: '#8F93A5' }}>{t("pricing.standardBase", "Standard Base")}</div>
              <div style={{ textAlign: 'center', padding: '0.65rem', borderTop: '1px solid #FDF4EB', color: '#FB821B', fontWeight: 700 }}>{t("pricing.save50", "Save ₹50 (10% OFF)")}</div>
              <div style={{ textAlign: 'center', padding: '0.65rem', borderTop: '1px solid #FDF4EB', color: '#10b981', fontWeight: 700 }}>{t("pricing.save250", "Save ₹250 (20% OFF)")}</div>
            </div>
          </div>

          {/* Mobile Non-Scrolling Comparison Cards */}
          <div className="mobile-comparison-cards">
            <div className="mobile-comp-card">
              <div className="comp-card-header">
                <h4>{t("pricing.colStarter", "Starter Pack")}</h4>
                <span className="comp-price">₹250</span>
              </div>
              <div className="comp-card-row">
                <span>{t("pricing.rowTotalPrints", "Total Prints")}</span>
                <strong>1,000 {t("pricing.prints", "prints")}</strong>
              </div>
              <div className="comp-card-row">
                <span>{t("pricing.rowUnitRate", "Unit Rate")}</span>
                <strong>₹0.25 {t("pricing.perPrint", "/ print")}</strong>
              </div>
              <div className="comp-card-row">
                <span>{t("pricing.rowSavings", "Savings")}</span>
                <span className="badge-standard">{t("pricing.standardBase", "Standard Base")}</span>
              </div>
            </div>

            <div className="mobile-comp-card popular">
              <div className="comp-card-header">
                <h4>{t("pricing.colPro", "Pro Growth (2K)")}</h4>
                <span className="comp-price">₹450</span>
              </div>
              <div className="comp-card-row">
                <span>{t("pricing.rowTotalPrints", "Total Prints")}</span>
                <strong>2,000 {t("pricing.prints", "prints")}</strong>
              </div>
              <div className="comp-card-row">
                <span>{t("pricing.rowUnitRate", "Unit Rate")}</span>
                <strong>₹0.225 {t("pricing.perPrint", "/ print")}</strong>
              </div>
              <div className="comp-card-row">
                <span>{t("pricing.rowSavings", "Savings")}</span>
                <span className="badge-savings blue">{t("pricing.save50", "Save ₹50 (10% OFF)")}</span>
              </div>
            </div>

            <div className="mobile-comp-card best-value">
              <div className="comp-card-header">
                <h4>{t("pricing.colBusiness", "Business (5K)")}</h4>
                <span className="comp-price">₹1,000</span>
              </div>
              <div className="comp-card-row">
                <span>{t("pricing.rowTotalPrints", "Total Prints")}</span>
                <strong>5,000 {t("pricing.prints", "prints")}</strong>
              </div>
              <div className="comp-card-row">
                <span>{t("pricing.rowUnitRate", "Unit Rate")}</span>
                <strong>₹0.20 {t("pricing.perPrint", "/ print")}</strong>
              </div>
              <div className="comp-card-row">
                <span>{t("pricing.rowSavings", "Savings")}</span>
                <span className="badge-savings green">{t("pricing.save250", "Save ₹250 (20% OFF)")}</span>
              </div>
            </div>
          </div>

          <div style={{ 
            marginTop: '1.25rem', 
            padding: '0.85rem 1.25rem', 
            background: '#FFF0E5', 
            border: '1px solid #FADCC3',
            borderRadius: '12px',
            fontSize: '0.85rem',
            color: '#FA4406',
            textAlign: 'center'
          }}>
            {t("pricing.proTip", "💡 Pro Tip: Buy larger packs or use our Self-Price Calculator above for up to 28% volume discounts on high-volume print orders!")}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pricing-cta">
        <div className="cta-content">
          <h2>{t("pricing.ctaHeading", "Start billing with Slipzo today")}</h2>
          <p>{t("pricing.ctaSub", "Join thousands of retail shop owners across India. Quick 1-minute setup.")}</p>
          <button className="cta-button primary large" onClick={() => user ? setView?.("bills") : (setShowAuth ? setShowAuth(true) : setView?.("bills"))}>
            {t("pricing.ctaButton", "Get Started Now")} <ArrowRight size={18} />
          </button>
        </div>
      </section>

      <style>{`
        /* Active Plan Card Mobile Fixes */
        @media (max-width: 640px) {
          .pricing-page .active-quota-section {
            padding: 0 0.75rem !important;
            margin: 0.75rem auto 1.25rem !important;
          }

          .pricing-page .active-quota-card {
            padding: 1rem 0.85rem !important;
            border-radius: 16px !important;
            gap: 0.75rem !important;
            text-align: center !important;
            align-items: center !important;
          }

          .pricing-page .active-quota-header {
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            gap: 0.65rem !important;
            width: 100% !important;
          }

          .pricing-page .active-quota-info {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            width: 100% !important;
          }

          .pricing-page .active-plan-tag-row {
            justify-content: center !important;
            width: 100% !important;
          }

          .pricing-page .active-plan-badge {
            white-space: nowrap !important;
            font-size: 0.7rem !important;
            padding: 0.2rem 0.65rem !important;
          }

          .pricing-page .active-quota-heading {
            justify-content: center !important;
            text-align: center !important;
            font-size: 1.3rem !important;
          }

          .pricing-page .active-quota-stats-row {
            justify-content: center !important;
            width: 100% !important;
            gap: 1.25rem !important;
            text-align: center !important;
          }

          /* Business Super & Preset Cards Mobile Alignment & Spacing */
          .pricing-plans .plans-grid {
            display: flex !important;
            flex-direction: column !important;
            gap: 2.25rem !important;
          }

          .pricing-card {
            padding-top: 1.85rem !important;
          }

          /* Adjust Prints Card Mobile Reduction */
          .adjust-prints-card {
            padding: 0.85rem 0.9rem !important;
            margin: 0 auto !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
        }

        /* Badge Positioning & Centering */
        .popular-badge {
          position: absolute;
          top: -14px;
          left: 50%;
          transform: translateX(-50%);
          background: #FB821B;
          color: white;
          padding: 0.35rem 1rem;
          border-radius: 20px;
          font-size: 0.78rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 0.35rem;
          white-space: nowrap;
          z-index: 2;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .popular-badge.green-badge {
          background: #10b981 !important;
        }
      `}</style>
    </div>
  )
}