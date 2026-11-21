import { useState, useEffect } from "react"
import { 
  ArrowRight, Check, Zap, Sparkles, Calculator, Sliders, 
  ShieldCheck, Printer, Crown, Layers, Percent, TrendingUp,
  Clock, Calendar
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { ButtonLoader } from "./common/Skeleton"
import { startPrintPurchase, resumePendingPurchase, getPendingPayment } from "../lib/buyPrints"
import { translatePlanName } from "../lib/apiMessages"
import { 
  getActivePlanDetails, syncUserQuota, call, 
  getCurrentUserKey, formatNumberByLang 
} from "../lib/utils"

export function Pricing({ setView, setShowAuth, user }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language || "en"
  const formatNum = (v) => formatNumberByLang(v, lang)
  const [customPrints, setCustomPrints] = useState(2500)
  const [buyingPlan, setBuyingPlan] = useState(null)
  const userKey = getCurrentUserKey(user)
  const [activePlan, setActivePlan] = useState(() => getActivePlanDetails(userKey))

  const [pricingCategory, setPricingCategory] = useState("time")
  const [serverTimePlans, setServerTimePlans] = useState([])
  const [serverPrintPlans, setServerPrintPlans] = useState([])
  const [loadingPlans, setLoadingPlans] = useState(false)

  // Fetch dynamic plans configured from the Admin Panel
  useEffect(() => {
    let isMounted = true
    const fetchPlans = async () => {
      setLoadingPlans(true)
      try {
        const res = await call("/subscriptions/plans", { noCache: true })
        if (res && res.success && isMounted) {
          if (Array.isArray(res.timePlans) && res.timePlans.length > 0) {
            setServerTimePlans(res.timePlans)
          }
          if (Array.isArray(res.printPlans) && res.printPlans.length > 0) {
            setServerPrintPlans(res.printPlans)
          }
        }
      } catch (err) {
        console.warn("Could not load dynamic plans, using fallback presets:", err)
      } finally {
        if (isMounted) setLoadingPlans(false)
      }
    }
    fetchPlans()
    return () => { isMounted = false }
  }, [])

  // Finish a payment that was made earlier but never confirmed, with no second charge
  useEffect(() => {
    if (!user || !getPendingPayment(user)) return
    resumePendingPurchase({ user, onActivated: (updated) => { if (updated) setActivePlan(updated) } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let isMounted = true
    const currentKey = getCurrentUserKey(user)

    const fetchFreshQuota = async (force = false) => {
      if (!user) return
      try {
        const subRes = await call("/subscriptions/my", { noCache: true })
        if (subRes && subRes.quota && isMounted) {
          const synced = syncUserQuota(subRes.quota, currentKey)
          if (synced) setActivePlan(synced)
        }
      } catch (err) {
        console.warn("Could not fetch user quota in Pricing:", err)
      }
    }

    fetchFreshQuota()

    // A message that carries the numbers is already fresh (it comes from the server through syncUserQuota):
    // use them. Asking the server again here would save, send this message again and loop without end.
    // Only a message without numbers asks the server, at most once every few seconds.
    let lastAsked = 0
    const handleUpdate = (e) => {
      const direct = e?.detail?.quota || e?.detail?.plan
      if (direct && typeof direct === 'object') {
        setActivePlan(direct)
        return
      }
      setActivePlan(getActivePlanDetails(getCurrentUserKey(user)))
      if (Date.now() - lastAsked > 5000) {
        lastAsked = Date.now()
        fetchFreshQuota(true)
      }
    }
    window.addEventListener("slipzo-quota-update", handleUpdate)
    window.addEventListener("storage", handleUpdate)
    return () => {
      isMounted = false
      window.removeEventListener("slipzo-quota-update", handleUpdate)
      window.removeEventListener("storage", handleUpdate)
    }
  }, [user])

  const handleBuyPlan = async (planOrName, amount, prints) => {
    if (buyingPlan) return
    if (!user) {
      if (typeof setShowAuth === "function") setShowAuth(true)
      return
    }
    let planId = undefined
    let planName = ""
    let amountInRupees = 0
    let printCount = 0

    if (typeof planOrName === "object" && planOrName !== null) {
      planId = planOrName.id
      planName = planOrName.rawName || planOrName.name
      amountInRupees = Number(planOrName.numericPrice || 0)
      printCount = Number(planOrName.numericPrints || 0)
    } else {
      planName = String(planOrName)
      amountInRupees = Number(amount || 0)
      printCount = Number(prints || 0)
    }

    setBuyingPlan(planName)
    try {
      await startPrintPurchase({
        planId,
        planName,
        amountInRupees,
        printCount,
        user,
        t,
        onActivated: (updated) => { if (updated) setActivePlan(updated) }
      })
    } finally {
      setBuyingPlan(null)
    }
  }

  // Preset Default Time-Based Plans (1 Month, 3 Months, 1 Year)
  const defaultTimePlans = [
    {
      id: "time_1m",
      name: t("pricing.month1Plan", "1 Month Plan"),
      rawName: "1 Month Plan",
      durationLabel: t("pricing.month1Validity", "1 Month Validity (30 Days)"),
      price: "₹299",
      numericPrice: 299,
      originalPrice: "₹399",
      numericPrints: 0,
      description: t("pricing.month1Desc", "Ideal for standard billing with unlimited prints for 30 full days."),
      features: [
        t("pricing.featureUnlimitedPrints", "Unlimited prints for 30 days"),
        t("pricing.featureThermalPOS", "Thermal & POS printer support"),
        t("pricing.featureAllTemplates", "All receipt templates included"),
        t("pricing.featureShopBranding", "Custom shop branding & logo"),
        t("pricing.featureSalesAnalytics", "Sales analytics & CSV export"),
        t("pricing.featureEmailChat", "Email & chat support")
      ],
      cta: t("pricing.getPlanNow", "Get 1 Month Plan"),
      popular: false,
      savings: t("pricing.save100", "Save ₹100 (25% OFF)"),
      cardClass: "card-starter",
      btnClass: "btn-starter",
      iconType: "starter"
    },
    {
      id: "time_3m",
      name: t("pricing.month3Plan", "3 Months Plan"),
      rawName: "3 Months Plan",
      durationLabel: t("pricing.month3Validity", "3 Months Validity (90 Days)"),
      price: "₹799",
      numericPrice: 799,
      originalPrice: "₹1,199",
      numericPrints: 0,
      description: t("pricing.month3Desc", "Our most popular quarterly plan with unlimited billing and priority support."),
      features: [
        t("pricing.featureUnlimitedPrints90", "Unlimited prints for 90 days"),
        t("pricing.save400Quarterly", "Save ₹400 vs monthly renewal"),
        t("pricing.featureThermalPOS", "Thermal & POS printer support"),
        t("pricing.featureDynamicUpi", "Dynamic UPI QR payment codes"),
        t("pricing.featureWhatsappShare", "WhatsApp receipt sharing"),
        t("pricing.featureSalesAnalytics", "Sales analytics & Excel export"),
        t("pricing.featurePrioritySupport", "Priority customer support")
      ],
      cta: t("pricing.getPlanNow", "Get 3 Months Plan"),
      popular: true,
      savings: t("pricing.save400", "Save ₹400 (33% OFF)"),
      cardClass: "card-pro popular-plan-card",
      btnClass: "btn-starter",
      iconType: "pro"
    },
    {
      id: "time_1y",
      name: t("pricing.year1Plan", "1 Year Plan"),
      rawName: "1 Year Plan",
      durationLabel: t("pricing.year1Validity", "1 Year Validity (365 Days)"),
      price: "₹2,499",
      numericPrice: 2499,
      originalPrice: "₹3,599",
      numericPrints: 0,
      description: t("pricing.year1Desc", "Maximum savings: Complete hassle-free billing for full 365 days (~₹6.8/day)."),
      features: [
        t("pricing.featureUnlimitedPrints365", "Full 365 days unlimited billing"),
        t("pricing.save1100Annual", "Save ₹1,100 (Best Value)"),
        t("pricing.featureMultiDevice", "Multi-device & counter sync"),
        t("pricing.featureDynamicUpi", "Dynamic UPI QR payment codes"),
        t("pricing.featureProPlus", "Everything in 3 Months Plan"),
        t("pricing.featureCloudBackup", "Automatic cloud backups"),
        t("pricing.featureDedicatedManager", "Dedicated VIP support manager")
      ],
      cta: t("pricing.getPlanNow", "Get 1 Year Plan"),
      popular: false,
      savings: t("pricing.save1100", "Save ₹1,100 (30% OFF)"),
      cardClass: "card-business",
      btnClass: "btn-starter",
      iconType: "business"
    }
  ]

  // Preset Default Print-Based Plans: Starter Pack (1,000), Pro Growth (2,000), Business Super (5,000)
  const defaultPrintPlans = [
    {
      id: "print_starter",
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
      id: "print_pro",
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
      btnClass: "btn-starter",
      iconType: "pro"
    },
    {
      id: "print_business",
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
      btnClass: "btn-starter",
      iconType: "business"
    }
  ]

  // Helper to parse features from server if stored as string/array
  const parseFeaturesList = (feat) => {
    if (Array.isArray(feat)) return feat
    if (!feat) return []
    try {
      const parsed = JSON.parse(feat)
      return Array.isArray(parsed) ? parsed : [String(feat)]
    } catch (_) {
      return String(feat).split("\n").map(s => s.trim()).filter(Boolean)
    }
  }

  // Active Time Plans (from server if loaded, else default)
  const displayTimePlans = serverTimePlans.length > 0
    ? serverTimePlans.map(p => ({
        id: p.id,
        name: p.name,
        rawName: p.name,
        durationLabel: p.duration_label || (p.duration_months === 12 ? "1 Year Validity (365 Days)" : `${p.duration_months} Months Validity`),
        price: `₹${Number(p.price || 0).toLocaleString("en-IN")}`,
        numericPrice: Number(p.price || 0),
        originalPrice: p.original_price ? `₹${Number(p.original_price).toLocaleString("en-IN")}` : null,
        numericPrints: Number(p.prints_count || 0),
        description: p.description || "",
        features: parseFeaturesList(p.features),
        popular: Boolean(p.is_popular),
        savings: p.original_price && p.original_price > p.price 
          ? `Save ₹${(p.original_price - p.price).toLocaleString("en-IN")}` 
          : null,
        cta: `Get ${p.name}`,
        cardClass: p.is_popular ? "card-pro popular-plan-card" : (p.duration_months >= 12 ? "card-business" : "card-starter"),
        btnClass: "btn-starter",
        iconType: p.duration_months >= 12 ? "business" : (p.is_popular ? "pro" : "starter")
      }))
    : defaultTimePlans

  // Active Print Plans (from server if loaded, else default)
  const displayPrintPlans = serverPrintPlans.length > 0
    ? serverPrintPlans.map(p => {
        const printsCount = Number(p.prints_count || 1000)
        const priceNum = Number(p.price || 0)
        const perPrint = (priceNum / (printsCount || 1)).toFixed(2).replace(/\.00$/, "")
        return {
          id: p.id,
          name: p.name,
          rawName: p.name,
          prints: `${printsCount.toLocaleString("en-IN")} ${t("pricing.prints", "prints")}`,
          numericPrints: printsCount,
          price: `₹${priceNum.toLocaleString("en-IN")}`,
          numericPrice: priceNum,
          originalPrice: p.original_price ? `₹${Number(p.original_price).toLocaleString("en-IN")}` : null,
          description: p.description || "",
          features: parseFeaturesList(p.features),
          popular: Boolean(p.is_popular),
          savings: p.original_price && p.original_price > p.price 
            ? `Save ₹${(p.original_price - p.price).toLocaleString("en-IN")}` 
            : null,
          perPrintCost: `₹${perPrint} ${t("pricing.perPrint", "/ print")}`,
          cardClass: p.is_popular ? "card-pro popular-plan-card" : (printsCount >= 5000 ? "card-business" : "card-starter"),
          btnClass: "btn-starter",
          iconType: printsCount >= 5000 ? "business" : (p.is_popular ? "pro" : "starter"),
          cta: t("pricing.getPrints", { count: printsCount.toLocaleString("en-IN"), defaultValue: `Get ${printsCount.toLocaleString("en-IN")} Prints` })
        }
      })
    : defaultPrintPlans

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
            <span className="pricing-eyebrow">{t("pricing.eyebrow", "SLIPZEN PRICING")}</span>
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
                  <span className="feat-title">{t("pricingPage.noFees", "No Monthly Fees")}</span>
                  <span className="feat-subtitle">{t("pricingPage.payAsYouGo", "Pay as you go")}</span>
                </div>
              </div>

              <div className="pricing-hero-badge-card">
                <div className="pricing-feat-icon feat-icon-blue">
                  <Zap size={14} />
                </div>
                <div className="pricing-feat-content">
                  <span className="feat-title">{t("pricingPage.autoDiscounts", "Automatic Discounts")}</span>
                  <span className="feat-subtitle">{t("pricingPage.upTo28", "Up to 28% OFF")}</span>
                </div>
              </div>

              <div className="pricing-hero-badge-card">
                <div className="pricing-feat-icon feat-icon-purple">
                  <Sparkles size={14} />
                </div>
                <div className="pricing-feat-content">
                  <span className="feat-title">{t("pricingPage.transparent", "Transparent Pricing")}</span>
                  <span className="feat-subtitle">{t("pricingPage.only025", "Only ₹0.25 per print")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Printer 3D Artwork */}
          <div className="pricing-hero-center-art">
            <div className="pricing-hero-art-wrapper">
              <img 
                src="https://apzabspkfpuszlduyoqv.supabase.co/storage/v1/object/public/UI_Images/pricing_hero_printer.jpg" 
                alt={t("pricingPage.altPrinter", "Slipzen POS Thermal Printer")} 
                className="pricing-hero-printer-img" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Current Print Usage Card (only for a signed-in account) */}
      {user && <section className="pricing-usage-section">
        <div className="pricing-usage-card">
          <div className="pricing-usage-top-row">
            <div className="pricing-usage-left">
              <div className="usage-plan-badge-row">
                <span className={`usage-plan-pill ${activePlan.isFreeTier ? 'pill-free-tier' : 'pill-active-tier'}`}>
                  <Sparkles size={13} /> {translatePlanName(activePlan.name) || activePlan.planName || t("pricing.freeStarterTier", "FREE STARTER TIER")}
                </span>
                <span className="usage-active-label">{t("pricing.activePlan", "Active Plan")}</span>
                {activePlan.hasActiveTimePlan && (
                  <span className={`usage-expiry-status-badge ${activePlan.isExpired ? 'expired' : (activePlan.daysRemaining <= 3 ? 'expiring' : 'valid')}`}>
                    {activePlan.isExpired ? t("expiry.expiredBadge", "Expired") : `${activePlan.daysRemaining} ${t("sidebar.daysLeft", "days left")}`}
                  </span>
                )}
              </div>
              {activePlan.hasActiveTimePlan ? (
                <h2 className="usage-prints-heading">
                  <Clock size={22} className="usage-printer-icon" style={{ color: (activePlan.daysRemaining <= 3 ? '#ef4444' : '#0284c7') }} />
                  <span>
                    {activePlan.isExpired
                      ? t("expiry.planExpired", "Plan Expired")
                      : (activePlan.daysRemaining === 0
                          ? t("expiry.todayNotice", "Expires Today!")
                          : t("expiry.daysRemainingHeading", "{{n}} days validity remaining", { n: activePlan.daysRemaining }))}
                  </span>
                </h2>
              ) : (
                <h2 className="usage-prints-heading">
                  <Printer size={22} className="usage-printer-icon" />
                  <span>{formatNum((activePlan.printsRemaining || 0).toLocaleString())} {t("pricing.printsRemaining", "prints remaining")}</span>
                </h2>
              )}
            </div>

            <div className="pricing-usage-stats-right">
              {activePlan.hasActiveTimePlan ? (
                <>
                  <div className="usage-stat-box">
                    <span className="stat-label">{t("expiry.validityStatus", "VALID UNTIL")}</span>
                    <span className="stat-value">{activePlan.expiresAt ? new Date(activePlan.expiresAt).toLocaleDateString() : "--"}</span>
                  </div>
                  <div className="usage-stat-box">
                    <span className="stat-label">{t("expiry.daysLeftLabel", "DAYS REMAINING")}</span>
                    <span className={`stat-value ${activePlan.daysRemaining <= 3 ? 'used-value' : ''}`}>
                      {activePlan.isExpired ? "0" : formatNum(String(activePlan.daysRemaining))} {t("pricing.days", "days")}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="usage-stat-box">
                    <span className="stat-label">{t("pricing.totalQuota", "TOTAL QUOTA")}</span>
                    <span className="stat-value">{formatNum((activePlan.totalPrints || 0).toLocaleString())} {t("pricing.prints", "prints")}</span>
                  </div>
                  <div className="usage-stat-box">
                    <span className="stat-label">{t("pricing.printsUsed", "PRINTS USED")}</span>
                    <span className="stat-value used-value">{formatNum((activePlan.usedPrints || (10 - activePlan.printsRemaining)).toLocaleString())} {t("pricing.prints", "prints")}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Progress Bar Row */}
          <div className="pricing-progress-wrapper">
            <div className="progress-labels-strip">
              <span>{t("pricing.quotaConsumption", "Print Quota Consumption")}</span>
              <span className="progress-pct">
                {formatNum(activePlan.totalPrints > 0 ? Math.round(((activePlan.usedPrints || Math.max(0, activePlan.totalPrints - (activePlan.printsRemaining || 0))) / activePlan.totalPrints) * 100) : 0)}% {t("pricing.used", "Used")}
              </span>
            </div>
            <div className="pricing-progress-track">
              <div 
                className="pricing-progress-fill" 
                style={{ 
                  width: `${activePlan.totalPrints > 0 ? Math.min(100, Math.max(0, ((activePlan.usedPrints || Math.max(0, activePlan.totalPrints - (activePlan.printsRemaining || 0))) / activePlan.totalPrints) * 100)) : 0}%` 
                }} 
              />
            </div>
          </div>
        </div>
      </section>}

      {/* Category Switcher Tabs: Time-Based vs Print-Based */}
      <section className="pricing-category-tabs-section">
        <div className="pricing-category-tabs-wrapper">
          <div className="pricing-category-tabs">
            <button
              type="button"
              className={`pricing-category-tab ${pricingCategory === "time" ? "active" : ""}`}
              onClick={() => setPricingCategory("time")}
            >
              <Clock size={16} />
              <span>{t("pricing.timePlansTab", "Time-Based Plans")}</span>
              <span className="tab-pill-badge">{t("pricing.validityBadge", "1 Mo • 3 Mo • 1 Yr")}</span>
            </button>
            <button
              type="button"
              className={`pricing-category-tab ${pricingCategory === "print" ? "active" : ""}`}
              onClick={() => setPricingCategory("print")}
            >
              <Printer size={16} />
              <span>{t("pricing.printPlansTab", "Print-Based Plans")}</span>
              <span className="tab-pill-badge">{t("pricing.payPerPrint", "Pay Per Print")}</span>
            </button>
          </div>
          <p className="pricing-category-subtitle">
            {pricingCategory === "time" 
              ? t("pricing.timePlansSubtitle", "Enjoy unlimited bills and prints for a fixed monthly, quarterly, or yearly duration.") 
              : t("pricing.printPlansSubtitle", "Pay only for what you print with permanent credits that never expire.")}
          </p>
        </div>
      </section>

      {/* 3. Pricing Plan Cards */}
      <section className="pricing-cards-section">
        <div className="pricing-cards-grid">
          {(pricingCategory === "time" ? displayTimePlans : displayPrintPlans).map((plan) => (
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
                {plan.durationLabel && (
                  <div className="plan-duration-badge">
                    <Clock size={12} />
                    <span>{formatNum(plan.durationLabel)}</span>
                  </div>
                )}
                {plan.prints && !plan.durationLabel && (
                  <div className="plan-duration-badge" style={{ background: '#f8fafc', borderColor: '#cbd5e1', color: '#334155' }}>
                    <Printer size={12} />
                    <span>{formatNum(plan.prints)}</span>
                  </div>
                )}
                <p className="plan-desc">{plan.description}</p>
              </div>

              {/* Price Row */}
              <div className="plan-pricing-display">
                <div className="plan-price-main-line">
                  <span className="plan-price-large">{formatNum(plan.price)}</span>
                  {plan.originalPrice && (
                    <span className="plan-price-strike">{formatNum(plan.originalPrice)}</span>
                  )}
                  {!plan.originalPrice && plan.perPrintCost && (
                    <span className="plan-unit-rate-side">{formatNum(plan.perPrintCost)}</span>
                  )}
                </div>

                {plan.originalPrice && (
                  <div className="plan-rate-savings-strip">
                    {plan.perPrintCost && (
                      <span className={`plan-unit-rate-badge ${plan.id?.includes("pro") ? "badge-rate-blue" : "badge-rate-purple"}`}>
                        {formatNum(plan.perPrintCost)}
                      </span>
                    )}
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
                {(plan.features || []).map((feature, idx) => (
                  <div className="plan-feature-item" key={idx}>
                    <div className={`feature-check-dot ${plan.cardClass?.includes("business") ? "dot-purple" : "dot-blue"}`}>
                      <Check size={13} />
                    </div>
                    <span>{formatNum(feature)}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button 
                className={`plan-cta-button ${plan.btnClass || "btn-starter"}`}
                onClick={() => handleBuyPlan(plan)}
                disabled={Boolean(buyingPlan)}
              >
                {buyingPlan === (plan.rawName || plan.name) ? (
                  <ButtonLoader text={t("pricing.openingPayment", "Opening payment...")} />
                ) : (
                  <>
                    <span>{formatNum(plan.cta || t("pricing.getPlanNow", "Get Plan Now"))}</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Extra Highlights when in Time-Based Mode */}
        {pricingCategory === "time" && (
          <div className="time-plans-highlights-grid">
            <div className="time-highlight-card">
              <div className="time-hl-icon icon-blue"><Zap size={20} /></div>
              <h4 className="time-hl-title">{t("pricing.unlimitedBillsTitle", "Unlimited Daily Billing")}</h4>
              <p className="time-hl-desc">{t("pricing.unlimitedBillsDesc", "Create and print unlimited customer bills during your active validity without checking print balances.")}</p>
            </div>
            <div className="time-highlight-card">
              <div className="time-hl-icon icon-cyan"><Clock size={20} /></div>
              <h4 className="time-hl-title">{t("pricing.peaceOfMindTitle", "Zero Checkout Interruption")}</h4>
              <p className="time-hl-desc">{t("pricing.peaceOfMindDesc", "Never get paused during busy store rush hours. Perfect for 30, 90 or 365 days of worry-free retail sales.")}</p>
            </div>
            <div className="time-highlight-card">
              <div className="time-hl-icon icon-purple"><Crown size={20} /></div>
              <h4 className="time-hl-title">{t("pricing.prioritySupportTitle", "Priority POS Support")}</h4>
              <p className="time-hl-desc">{t("pricing.prioritySupportDesc", "Direct phone and WhatsApp assistance for setting up Bluetooth & USB POS thermal printers and multi-devices.")}</p>
            </div>
          </div>
        )}
      </section>

      {/* 4 & 5: Print-Based Custom Calculator and Comparison Table (shown in Print mode) */}
      {pricingCategory === "print" && (
        <>
          {/* 4. Interactive Custom Self-Pricing Calculator */}
          <section className="pricing-calculator-section">
        <div className="pricing-calculator-box">
          {/* Top Eyebrow */}
          <div className="calc-eyebrow-row">
            <span className="calc-eyebrow-pill">
              <Calculator size={13} /> {t("pricing.selfPriceEyebrow", "CUSTOM PRINT PACK")}
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
                  <span>{formatNum("100")} {t("pricing.prints", "prints")}</span>
                  <span>{formatNum("5,000")} {t("pricing.prints", "prints")}</span>
                  <span>{formatNum("10,000")} {t("pricing.prints", "prints")}</span>
                  <span>{formatNum("20,000")} {t("pricing.prints", "prints")}</span>
                </div>
              </div>
            </div>

            {/* Right Output Card */}
            <div className="calc-output-card">
              <div className="floating-percent-badge">
                <Percent size={18} />
              </div>

              <p className="self-price-sublabel">
                {t("pricing.yourSelfPrice", "YOUR CUSTOM PRICE")}
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
              disabled={Boolean(buyingPlan)}
              >
                {buyingPlan === "Custom Print Pack" ? (
                  <ButtonLoader text={t("pricing.openingPayment", "Opening payment...")} />
                ) : (
                  <>
                    <span>{t("pricing.buyCustomBtn", { count: formatNum(calc.count.toLocaleString()), price: formatNum(calc.finalPrice.toLocaleString()), defaultValue: `Buy ${formatNum(calc.count.toLocaleString())} Prints for ₹${formatNum(calc.finalPrice.toLocaleString())}` })}</span>
                    <ArrowRight size={15} />
                  </>
                )}
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
                  <td className="td-val standard-base-text">{t("pricing.standardBase", "Standard Rate")}</td>
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
                <span className="mm-plan-badge mm-badge-starter">{t("pricingPage.pack", "Pack")}</span>
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
                  <span>{t("pricing.standardBase", "Standard Rate")}</span>
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
              <span>{t("pricing.proTip", "Buy larger packs or use our Custom Pricing Calculator above to get volume discounts of up to 28% on bulk print orders!").replace(/^💡\s*(Pro\s*Tip|टीप|सुझाव)[\s*:]*\s*/i, "")}</span>
            </div>
          </div>
        </div>
      </section>
      </>
      )}

      {/* 6. Final CTA Section */}
      <section className="pricing-final-cta-section">
        <div className="pricing-final-cta-card">
          <div className="cta-left-art">
            <img 
              src="https://apzabspkfpuszlduyoqv.supabase.co/storage/v1/object/public/UI_Images/templates_hero_illustration.jpg" 
              alt={t("pricingPage.altBilling", "Slipzen Receipt Billing")} 
              className="cta-receipt-art-img" 
            />
          </div>

          <div className="cta-center-content">
            <h2 className="cta-heading">{t("pricing.ctaHeading", "Start billing with Slipzen today")}</h2>
            <p className="cta-subtext">{t("pricing.ctaSub", "Join thousands of retail shop owners across India with a quick, 1-minute setup.")}</p>
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
              <span>{t("pricingPage.noCard", "Pay only for what you print")}</span>
            </div>
            <div className="cta-check-row">
              <div className="cta-check-icon"><Check size={13} /></div>
              <span>{t("pricingPage.instant", "Instant activation")}</span>
            </div>
            <div className="cta-check-row">
              <div className="cta-check-icon"><Check size={13} /></div>
              <span>{t("pricingPage.allPrinters", "Works with all thermal printers")}</span>
            </div>
            <div className="cta-check-row">
              <div className="cta-check-icon"><Check size={13} /></div>
              <span>{t("pricingPage.trusted", "Trusted by 10,000+ businesses")}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}