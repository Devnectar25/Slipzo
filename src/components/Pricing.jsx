import { useState, useEffect } from "react"
import { 
  ArrowRight, Check, Zap, Sparkles, Calculator, Sliders, 
  ShieldCheck, Printer, Crown, Layers, Percent, TrendingUp 
} from "lucide-react"
import Swal from "sweetalert2"
import { useTranslation } from "react-i18next"
import { 
  getActivePlanDetails, activatePlan, syncUserQuota, call, 
  getCurrentUserKey, formatNumberByLang 
} from "../lib/utils"

export function Pricing({ setView, setShowAuth, user }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language || "en"
  const formatNum = (v) => formatNumberByLang(v, lang)
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
        confirmButtonColor: "#0284c7"
      })
      return
    }

    const options = {
      key: razorpayKey,
      amount: amountInRupees * 100, // Amount in paise
      currency: "INR",
      name: "Slipzen Print Credits",
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
        color: "#0284c7"
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
              user_name: user?.name || 'Slipzen Member',
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
                <strong>Payment ID:</strong> <code style="background: #e0f2fe; color: #0284c7; padding: 4px 10px; border-radius: 6px; font-weight: 700;">${response.razorpay_payment_id}</code>
              </p>
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 0.85rem 1rem; border-radius: 12px; color: #166534; font-weight: 600;">
                Your <strong>${printCount.toLocaleString()} print quota</strong> has been activated for <strong>${planName}</strong>!
              </div>
            </div>
          `,
          icon: "success",
          confirmButtonText: "Great, Let's Print!",
          confirmButtonColor: "#0284c7",
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

  // Preset plans: Starter Pack (1,000), Pro Growth (2,000), Business Super (5,000)
  const plans = [
    {
      id: "starter",
      name: t("pricing.starterPack", "Starter Pack"),
      rawName: "Starter Pack",
      prints: `1,000 ${t("pricing.prints", "prints")}`,
      numericPrints: 1000,
      price: "₹250",
      numericPrice: 250,
      originalPrice: null,
      description: t("pricing.starterPackDesc", "Perfect for small shops and new merchants getting started with digital billing."),
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
      perPrintCost: `₹0.25 ${t("pricing.perPrint", "/ print")}`,
      cardClass: "card-starter",
      btnClass: "btn-starter",
      iconType: "starter"
    },
    {
      id: "pro",
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
      perPrintCost: `₹0.225 ${t("pricing.perPrint", "/ print")}`,
      cardClass: "card-pro popular-plan-card",
      btnClass: "btn-pro",
      iconType: "pro"
    },
    {
      id: "business",
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
      perPrintCost: `₹0.20 ${t("pricing.perPrint", "/ print")}`,
      cardClass: "card-business",
      btnClass: "btn-business",
      iconType: "business"
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
    <div className="pricing-page-root">
      {/* 1. Hero Section Banner */}
      <section className="pricing-hero-banner">
        <div className="pricing-hero-grid">
          <div className="pricing-hero-left">
            <span className="pricing-eyebrow">{t("pricing.eyebrow", "SLIPZO PRICING")}</span>
            <h1 className="pricing-hero-heading">
              {t("pricing.payOnlyFor", "Pay only for")}<br />
              <span className="pricing-hero-accent">{t("pricing.whatYouPrint", "what you print")}</span>
            </h1>
            <p className="pricing-hero-subtext">
              {t("pricing.subtitle", "Transparent pricing based on ₹0.25 per print with automatic bulk discounts up to 28% OFF. No monthly subscriptions or hidden fees.")}
            </p>

            {/* 3 Horizontal Benefit Badges */}
            <div className="pricing-hero-badges-row">
              <div className="pricing-hero-badge-card">
                <div className="pricing-feat-icon feat-icon-green">
                  <ShieldCheck size={14} />
                </div>
                <div className="pricing-feat-content">
                  <span className="feat-title">No Monthly Fees</span>
                  <span className="feat-subtitle">Pay as you go</span>
                </div>
              </div>

              <div className="pricing-hero-badge-card">
                <div className="pricing-feat-icon feat-icon-blue">
                  <Zap size={14} />
                </div>
                <div className="pricing-feat-content">
                  <span className="feat-title">Automatic Discounts</span>
                  <span className="feat-subtitle">Up to 28% OFF</span>
                </div>
              </div>

              <div className="pricing-hero-badge-card">
                <div className="pricing-feat-icon feat-icon-purple">
                  <Sparkles size={14} />
                </div>
                <div className="pricing-feat-content">
                  <span className="feat-title">Transparent Pricing</span>
                  <span className="feat-subtitle">Only ₹0.25 per print</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Printer 3D Artwork */}
          <div className="pricing-hero-center-art">
            <div className="pricing-hero-art-wrapper">
              <img 
                src="https://apzabspkfpuszlduyoqv.supabase.co/storage/v1/object/public/UI_Images/pricing_hero_printer.jpg" 
                alt="Slipzen POS Thermal Printer" 
                className="pricing-hero-printer-img" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Current Print Usage Card */}
      <section className="pricing-usage-section">
        <div className="pricing-usage-card">
          <div className="pricing-usage-top-row">
            <div className="pricing-usage-left">
              <div className="usage-plan-badge-row">
                <span className={`usage-plan-pill ${activePlan.isFreeTier ? 'pill-free-tier' : 'pill-active-tier'}`}>
                  <Sparkles size={13} /> {activePlan.name || t("pricing.freeStarterTier", "FREE STARTER TIER")}
                </span>
                <span className="usage-active-label">{t("pricing.activePlan", "Active Plan")}</span>
              </div>
              <h2 className="usage-prints-heading">
                <Printer size={22} className="usage-printer-icon" />
                <span>{formatNum((activePlan.printsRemaining || 0).toLocaleString())} {t("pricing.printsRemaining", "prints remaining")}</span>
              </h2>
            </div>

            <div className="pricing-usage-stats-right">
              <div className="usage-stat-box">
                <span className="stat-label">{t("pricing.totalQuota", "TOTAL QUOTA")}</span>
                <span className="stat-value">{formatNum((activePlan.totalPrints || 10).toLocaleString())} {t("pricing.prints", "prints")}</span>
              </div>
              <div className="usage-stat-box">
                <span className="stat-label">{t("pricing.printsUsed", "PRINTS USED")}</span>
                <span className="stat-value used-value">{formatNum((activePlan.usedPrints || (10 - activePlan.printsRemaining)).toLocaleString())} {t("pricing.prints", "prints")}</span>
              </div>
            </div>
          </div>

          {/* Progress Bar Row */}
          <div className="pricing-progress-wrapper">
            <div className="progress-labels-strip">
              <span>{t("pricing.quotaConsumption", "Print Quota Consumption")}</span>
              <span className="progress-pct">
                {formatNum(Math.round(((activePlan.usedPrints || (10 - activePlan.printsRemaining)) / (activePlan.totalPrints || 10)) * 100))}% {t("pricing.used", "Used")}
              </span>
            </div>
            <div className="pricing-progress-track">
              <div 
                className="pricing-progress-fill" 
                style={{ 
                  width: `${Math.min(100, Math.max(0, ((activePlan.usedPrints || (10 - activePlan.printsRemaining)) / (activePlan.totalPrints || 10)) * 100))}%` 
                }} 
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Pricing Plan Cards (3 Cards in one row) */}
      <section className="pricing-cards-section">
        <div className="pricing-cards-grid">
          {plans.map((plan) => (
            <div className={`pricing-plan-card ${plan.cardClass}`} key={plan.id}>
              {plan.popular && (
                <div className="floating-popular-badge">
                  <Crown size={13} /> {t("pricing.mostPopular", "Most Popular")}
                </div>
              )}

              {/* Plan Header & Icon */}
              <div className="plan-header-box">
                <div className="plan-icon-container">
                  {plan.iconType === "starter" && (
                    <div className="plan-icon-pill icon-pill-blue">
                      <Layers size={20} />
                    </div>
                  )}
                  {plan.iconType === "pro" && (
                    <div className="plan-icon-pill icon-pill-cyan">
                      <Zap size={20} />
                    </div>
                  )}
                  {plan.iconType === "business" && (
                    <div className="plan-icon-pill icon-pill-purple">
                      <Crown size={20} />
                    </div>
                  )}
                </div>

                <h3 className="plan-title">{plan.name}</h3>
                <p className="plan-desc">{plan.description}</p>
              </div>

              {/* Price Row */}
              <div className="plan-pricing-display">
                <div className="plan-price-main-line">
                  <span className="plan-price-large">{formatNum(plan.price)}</span>
                  {plan.originalPrice && (
                    <span className="plan-price-strike">{formatNum(plan.originalPrice)}</span>
                  )}
                  {!plan.originalPrice && (
                    <span className="plan-unit-rate-side">{formatNum(plan.perPrintCost)}</span>
                  )}
                </div>

                {plan.originalPrice && (
                  <div className="plan-rate-savings-strip">
                    <span className={`plan-unit-rate-badge ${plan.id === "pro" ? "badge-rate-blue" : "badge-rate-purple"}`}>
                      {formatNum(plan.perPrintCost)}
                    </span>
                    {plan.savings && (
                      <span className="plan-savings-pill-green">
                        <Sparkles size={12} /> {formatNum(plan.savings)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Feature Checklist */}
              <div className="plan-features-list">
                {plan.features.map((feature, idx) => (
                  <div className="plan-feature-item" key={idx}>
                    <div className={`feature-check-dot ${plan.id === "business" ? "dot-purple" : "dot-blue"}`}>
                      <Check size={13} />
                    </div>
                    <span>{formatNum(feature)}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button 
                className={`plan-cta-button ${plan.btnClass}`}
                onClick={() => handleBuyPlan(plan.rawName || plan.name, plan.numericPrice, plan.numericPrints)}
              >
                <span>{formatNum(plan.cta)}</span>
                <ArrowRight size={15} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Interactive Custom Self-Pricing Calculator */}
      <section className="pricing-calculator-section">
        <div className="pricing-calculator-box">
          {/* Top Eyebrow */}
          <div className="calc-eyebrow-row">
            <span className="calc-eyebrow-pill">
              <Calculator size={13} /> {t("pricing.selfPriceEyebrow", "SELF-PRICE CUSTOM PACK")}
            </span>
          </div>

          <h2 className="calc-heading">
            {t("pricing.selfPriceTitle", "Enter your exact print requirement")}
          </h2>
          <p className="calc-subtext">
            {t("pricing.selfPriceDesc", "Need 250, 1,500, or 10,000 prints? Drag the slider or type your custom count below to calculate your instant bulk discount.")}
          </p>

          <div className="calc-inner-grid">
            {/* Left Controls */}
            <div className="calc-controls-col">
              {/* Quick Presets */}
              <div className="quick-presets-container">
                <label className="quick-presets-label">
                  {t("pricing.quickPresets", "QUICK PRESETS")}
                </label>
                <div className="quick-presets-grid">
                  {quickPresets.map(preset => (
                    <button
                      key={preset}
                      onClick={() => setCustomPrints(preset)}
                      className={`preset-pill-btn ${customPrints === preset ? 'active-preset' : ''}`}
                    >
                      <span>{formatNum(preset.toLocaleString())} {t("pricing.prints", "prints")}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Range Slider & Number Input */}
              <div className="adjust-prints-box">
                <div className="slider-header-strip">
                  <span className="adjust-prints-label">
                    <Sliders size={15} /> {t("pricing.adjustPrints", "Adjust Prints:")}
                  </span>
                  <div className="slider-input-group">
                    <input
                      type="number"
                      min="100"
                      max="50000"
                      step="50"
                      value={customPrints}
                      onChange={(e) => setCustomPrints(Math.max(100, Math.min(50000, Number(e.target.value) || 100)))}
                      className="slider-number-input"
                    />
                    <span className="slider-prints-unit">{t("pricing.prints", "prints")}</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="100"
                  max="20000"
                  step="100"
                  value={customPrints}
                  onChange={(e) => setCustomPrints(Number(e.target.value))}
                  className="custom-range-slider"
                />
                
                <div className="slider-marks-row">
                  <span>{formatNum("100")} prints</span>
                  <span>{formatNum("5,000")} prints</span>
                  <span>{formatNum("10,000")} prints</span>
                  <span>{formatNum("20,000")} prints</span>
                </div>
              </div>
            </div>

            {/* Right Output Card */}
            <div className="calc-output-card">
              <div className="floating-percent-badge">
                <Percent size={18} />
              </div>

              <p className="self-price-sublabel">
                {t("pricing.yourSelfPrice", "YOUR SELF PRICE")}
              </p>
              
              <div className="self-price-figure">
                ₹{formatNum(calc.finalPrice.toLocaleString())}
              </div>

              <div className="self-price-rate-line">
                <span className="calc-rate-text">
                  {t("pricing.rate", "Rate:")} <strong>₹{formatNum(calc.rate)} {t("pricing.perPrint", "/ print")}</strong>
                </span>
                {calc.baseCost > calc.finalPrice && (
                  <span className="calc-strikethrough-base">
                    ₹{formatNum(calc.baseCost.toLocaleString())}
                  </span>
                )}
              </div>

              {calc.savings > 0 ? (
                <div className="self-price-savings-pill">
                  <Sparkles size={14} /> 
                  <span>{t("pricing.youSave", { amount: formatNum(calc.savings.toLocaleString()), percent: formatNum(calc.savingsPercent), defaultValue: `🎉 You Save ₹${formatNum(calc.savings.toLocaleString())} (${formatNum(calc.savingsPercent)}% OFF)` })}</span>
                </div>
              ) : (
                <div className="self-price-hint-pill">
                  {formatNum(t("pricing.bulkDiscountHint", "Add 1,500+ prints to unlock bulk discounts!"))}
                </div>
              )}

              <button
                onClick={() => handleBuyPlan("Custom Print Pack", calc.finalPrice, calc.count)}
                className="calc-buy-cta-btn"
              >
                <span>{t("pricing.buyCustomBtn", { count: formatNum(calc.count.toLocaleString()), price: formatNum(calc.finalPrice.toLocaleString()), defaultValue: `Buy ${formatNum(calc.count.toLocaleString())} Prints for ₹${formatNum(calc.finalPrice.toLocaleString())}` })}</span>
                <ArrowRight size={15} />
              </button>

              <div className="calc-security-note">
                <ShieldCheck size={14} />
                <span>{t("pricing.instantActivation", "Instant activation • Prints never expire")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Plan Comparison Table */}
      <section className="pricing-comparison-section">
        <div className="pricing-comparison-box">
          <div className="comparison-header-wrap">
            <h3 className="comparison-main-title">
              <TrendingUp size={20} className="comp-title-icon" />
              <span>{t("pricing.comparisonTitle", "Plan Comparison Summary")}</span>
            </h3>
            <span className="comparison-swipe-hint">
              <span>{t("pricing.swipeToCompare", "Swipe to compare")}</span> →
            </span>
          </div>
          
          {/* Desktop Comparison Table (Visible on screens > 768px) */}
          <div className="comparison-table-scroll-wrapper">
            <table className="comparison-data-table">
              <thead>
                <tr>
                  <th className="th-feature">{t("pricing.colFeature", "Feature / Plan")}</th>
                  <th className="th-starter">{t("pricing.colStarter", "Starter Pack")}</th>
                  <th className="th-pro">{t("pricing.colPro", "Pro Growth (2K)")}</th>
                  <th className="th-business">{t("pricing.colBusiness", "Business (5K)")}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="td-label">{t("pricing.rowTotalPrints", "Total Prints")}</td>
                  <td className="td-val">{formatNum("1,000")}</td>
                  <td className="td-val highlight-pro">{formatNum("2,000")}</td>
                  <td className="td-val highlight-business">{formatNum("5,000")}</td>
                </tr>
                <tr>
                  <td className="td-label">{t("pricing.rowPlanPrice", "Plan Price")}</td>
                  <td className="td-val">{formatNum("₹250")}</td>
                  <td className="td-val highlight-pro-price">{formatNum("₹450")}</td>
                  <td className="td-val highlight-business-price">{formatNum("₹1,000")}</td>
                </tr>
                <tr>
                  <td className="td-label">{t("pricing.rowUnitRate", "Effective Unit Rate")}</td>
                  <td className="td-val">{formatNum("₹0.25")} {t("pricing.perPrint", "/ print")}</td>
                  <td className="td-val highlight-pro">{formatNum("₹0.225")} {t("pricing.perPrint", "/ print")}</td>
                  <td className="td-val highlight-business-green">{formatNum("₹0.20")} {t("pricing.perPrint", "/ print")}</td>
                </tr>
                <tr>
                  <td className="td-label">{t("pricing.rowSavings", "Discount & Savings")}</td>
                  <td className="td-val standard-base-text">{t("pricing.standardBase", "Standard Base")}</td>
                  <td className="td-val savings-pro-text">{t("pricing.save50", "Save ₹50 (10% OFF)")}</td>
                  <td className="td-val savings-biz-text">{t("pricing.save250", "Save ₹250 (20% OFF)")}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile Comparison Matrix (All data directly visible on mobile without scroll) */}
          <div className="comparison-mobile-matrix">
            {/* 3 Plan Headers */}
            <div className="mobile-matrix-header-grid">
              <div className="mm-head-card mm-head-starter">
                <span className="mm-plan-badge mm-badge-starter">Pack</span>
                <span className="mm-plan-title">{t("pricing.colStarter", "Starter Pack")}</span>
              </div>
              <div className="mm-head-card mm-head-pro">
                <span className="mm-plan-badge mm-badge-popular">{t("pricing.mostPopular", "Popular")}</span>
                <span className="mm-plan-title">{t("pricing.colPro", "Pro Growth (2K)")}</span>
              </div>
              <div className="mm-head-card mm-head-business">
                <span className="mm-plan-badge mm-badge-biz">20% OFF</span>
                <span className="mm-plan-title">{t("pricing.colBusiness", "Business (5K)")}</span>
              </div>
            </div>

            {/* Metric 1: Total Prints */}
            <div className="mobile-matrix-block">
              <div className="mm-block-label">
                <span>{t("pricing.rowTotalPrints", "Total Prints")}</span>
              </div>
              <div className="mm-block-values-grid">
                <div className="mm-val-cell mm-val-starter">
                  <strong>{formatNum("1,000")}</strong>
                </div>
                <div className="mm-val-cell mm-val-pro highlight-pro">
                  <strong>{formatNum("2,000")}</strong>
                </div>
                <div className="mm-val-cell mm-val-business highlight-business">
                  <strong>{formatNum("5,000")}</strong>
                </div>
              </div>
            </div>

            {/* Metric 2: Plan Price */}
            <div className="mobile-matrix-block">
              <div className="mm-block-label">
                <span>{t("pricing.rowPlanPrice", "Plan Price")}</span>
              </div>
              <div className="mm-block-values-grid">
                <div className="mm-val-cell mm-val-starter">
                  <strong>{formatNum("₹250")}</strong>
                </div>
                <div className="mm-val-cell mm-val-pro highlight-pro-price">
                  <strong>{formatNum("₹450")}</strong>
                </div>
                <div className="mm-val-cell mm-val-business highlight-business-price">
                  <strong>{formatNum("₹1,000")}</strong>
                </div>
              </div>
            </div>

            {/* Metric 3: Effective Unit Rate */}
            <div className="mobile-matrix-block">
              <div className="mm-block-label">
                <span>{t("pricing.rowUnitRate", "Effective Unit Rate")}</span>
              </div>
              <div className="mm-block-values-grid">
                <div className="mm-val-cell mm-val-starter">
                  <span className="mm-rate-num">{formatNum("₹0.25")}</span>
                  <span className="mm-rate-unit">{t("pricing.perPrint", "/ print")}</span>
                </div>
                <div className="mm-val-cell mm-val-pro highlight-pro">
                  <span className="mm-rate-num">{formatNum("₹0.225")}</span>
                  <span className="mm-rate-unit">{t("pricing.perPrint", "/ print")}</span>
                </div>
                <div className="mm-val-cell mm-val-business highlight-business-green">
                  <span className="mm-rate-num">{formatNum("₹0.20")}</span>
                  <span className="mm-rate-unit">{t("pricing.perPrint", "/ print")}</span>
                </div>
              </div>
            </div>

            {/* Metric 4: Discount & Savings */}
            <div className="mobile-matrix-block">
              <div className="mm-block-label">
                <span>{t("pricing.rowSavings", "Discount & Savings")}</span>
              </div>
              <div className="mm-block-values-grid">
                <div className="mm-val-cell mm-val-starter standard-base-text">
                  <span>{t("pricing.standardBase", "Standard Base")}</span>
                </div>
                <div className="mm-val-cell mm-val-pro savings-pro-text">
                  <span>{t("pricing.save50", "Save ₹50 (10% OFF)")}</span>
                </div>
                <div className="mm-val-cell mm-val-business savings-biz-text">
                  <span>{t("pricing.save250", "Save ₹250 (20% OFF)")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pro Tip Box */}
          <div className="comparison-pro-tip-box">
            <span className="pro-tip-bulb">💡</span>
            <div className="pro-tip-content">
              <strong>{t("pricing.proTipPrefix", "Pro Tip:")}</strong>{" "}
              <span>{t("pricing.proTip", "Buy larger packs or use our Self-Price Calculator above for up to 28% volume discounts on high-volume print orders!").replace(/^💡\s*(Pro\s*Tip|टीप|सुझाव)[\s*:]*\s*/i, "")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Final CTA Section */}
      <section className="pricing-final-cta-section">
        <div className="pricing-final-cta-card">
          <div className="cta-left-art">
            <img 
              src="https://apzabspkfpuszlduyoqv.supabase.co/storage/v1/object/public/UI_Images/templates_hero_illustration.jpg" 
              alt="Slipzen Receipt Billing" 
              className="cta-receipt-art-img" 
            />
          </div>

          <div className="cta-center-content">
            <h2 className="cta-heading">{t("pricing.ctaHeading", "Start billing with Slipzen today")}</h2>
            <p className="cta-subtext">{t("pricing.ctaSub", "Join thousands of retail shop owners across India. Quick 1-minute setup.")}</p>
            <button 
              className="cta-get-started-btn" 
              onClick={() => user ? setView?.("bills") : (setShowAuth ? setShowAuth(true) : setView?.("bills"))}
            >
              <span>{t("pricing.ctaButton", "Get Started Now")}</span>
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="cta-right-checklist">
            <div className="cta-check-row">
              <div className="cta-check-icon"><Check size={13} /></div>
              <span>No credit card required</span>
            </div>
            <div className="cta-check-row">
              <div className="cta-check-icon"><Check size={13} /></div>
              <span>Instant activation</span>
            </div>
            <div className="cta-check-row">
              <div className="cta-check-icon"><Check size={13} /></div>
              <span>Works with all thermal printers</span>
            </div>
            <div className="cta-check-row">
              <div className="cta-check-icon"><Check size={13} /></div>
              <span>Trusted by 10,000+ businesses</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}