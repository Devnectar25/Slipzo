import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Check, Crown, Layers, Zap, ArrowRight, ArrowLeft, ShieldCheck, CalendarDays, Printer } from "lucide-react"
import { ButtonLoader, Spinner } from "./common/Skeleton"
import { startPrintPurchase, resumePendingPurchase, getPendingPayment } from "../lib/buyPrints"
import { call, formatNumberByLang } from "../lib/utils"
import { usePageScrollLock } from "../hooks/usePageScrollLock"
import "../styles/PlanGate.css"

// Plans come from the server (Admin > Plans), the same as on the Pricing page. These print packs hold the translated
// texts of the standard packs, and are shown as they are when the plans cannot be loaded.
const PLANS = [
  {
    id: "starter",
    name: "Starter Pack",
    prints: 1000,
    price: 250,
    rate: "₹0.25",
    blurb: "For small shops getting started with digital billing.",
    perks: ["All receipt templates", "Thermal & POS printer support"],
    icon: Layers
  },
  {
    id: "pro",
    name: "Pro Growth",
    prints: 2000,
    price: 450,
    was: 500,
    rate: "₹0.225",
    blurb: "Our most popular pack for busy daily counters.",
    perks: ["Save ₹50 (10% OFF)", "Sales analytics & CSV export", "WhatsApp receipt sharing"],
    popular: true,
    icon: Zap
  },
  {
    id: "business",
    name: "Business Super",
    prints: 5000,
    price: 1000,
    was: 1250,
    rate: "₹0.20",
    blurb: "Best value for high-volume stores and multi-counter setups.",
    perks: ["Save ₹250 (20% OFF)", "Everything in Pro Growth", "Priority support"],
    icon: Crown
  }
]

const asList = (features) => {
  if (Array.isArray(features)) return features
  try {
    const parsed = JSON.parse(features)
    return Array.isArray(parsed) ? parsed : []
  } catch (_) {
    return []
  }
}

// "print" pack from the server; a standard pack at its usual price keeps its translated texts
const toPrintPlan = (p) => {
  const preset = PLANS.find((x) => x.name === p.name)
  const price = Number(p.price) || 0
  const prints = Number(p.prints_count) || 0
  const plan = {
    id: p.id,
    planId: p.id,
    name: p.name,
    prints,
    price,
    was: Number(p.original_price) > price ? Number(p.original_price) : undefined,
    rate: `₹${(price / (prints || 1)).toFixed(3).replace(/0$/, "")}`,
    popular: Boolean(p.is_popular),
    icon: preset?.icon || Layers
  }
  return preset && preset.price === price && preset.prints === prints
    ? { ...plan, textKey: preset.id, blurb: preset.blurb, perks: preset.perks }
    : { ...plan, blurb: p.description || "", perks: asList(p.features).slice(0, 4) }
}

// plan for a fixed time (1 month, 3 months, 1 year, ...)
const toTimePlan = (p) => {
  const price = Number(p.price) || 0
  const months = Number(p.duration_months) || 0
  return {
    id: p.id,
    planId: p.id,
    name: p.name,
    isTime: true,
    months,
    durationLabel: p.duration_label || "",
    prints: Number(p.prints_count) || 0,
    price,
    was: Number(p.original_price) > price ? Number(p.original_price) : undefined,
    blurb: p.description || "",
    perks: asList(p.features).slice(0, 4),
    popular: Boolean(p.is_popular),
    icon: p.is_popular ? Zap : months >= 12 ? Crown : CalendarDays
  }
}

const fmt = (n) => formatNumberByLang(Number(n).toLocaleString("en-IN"))

export function PlanGate({ user, shopName, onPurchased, onBack }) {
  const { t } = useTranslation()
  const [buying, setBuying] = useState(null)
  const [plans, setPlans] = useState(null) // { time, print }; null while loading
  const [kind, setKind] = useState("time") // "time" | "print"

  useEffect(() => {
    let alive = true
    call("/subscriptions/plans", { noCache: true })
      .then((res) => {
        const print = (Array.isArray(res?.printPlans) ? res.printPlans : []).map(toPrintPlan)
        const time = (Array.isArray(res?.timePlans) ? res.timePlans : []).map(toTimePlan)
        return { time, print: print.length || time.length ? print : PLANS }
      })
      .catch(() => ({ time: [], print: PLANS }))
      .then((next) => { if (alive) setPlans(next) })
    return () => { alive = false }
  }, [])

  const hasBoth = Boolean(plans && plans.time.length && plans.print.length)
  const shownKind = plans && !plans[kind].length ? (kind === "time" ? "print" : "time") : kind
  const isTime = shownKind === "time"
  const durationText = (plan) => {
    if (plan.months && plan.months % 12 === 0) return t("planGate.years", { count: plan.months / 12, n: fmt(plan.months / 12), defaultValue: plan.durationLabel })
    if (plan.months) return t("planGate.months", { count: plan.months, n: fmt(plan.months), defaultValue: plan.durationLabel })
    return plan.durationLabel
  }

  usePageScrollLock()

  // A payment that was made earlier but never confirmed (server not ready, connection lost) is finished here, with no second charge
  useEffect(() => {
    if (!getPendingPayment(user)) return
    resumePendingPurchase({
      user,
      onActivated: (updated) => { if (updated) onPurchased?.(updated) },
      onDone: () => onPurchased?.()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const buy = async (plan) => {
    if (buying) return
    setBuying(plan.id)
    try {
      await startPrintPurchase({
        planId: plan.planId,
        planName: plan.name,
        validity: plan.isTime ? durationText(plan) : undefined,
        amountInRupees: plan.price,
        printCount: plan.prints,
        user,
        onActivated: (updated) => { if (updated) onPurchased?.(updated) },
        onDone: () => onPurchased?.(plan)
      })
    } finally {
      setBuying(null)
    }
  }

  return (
    <div className="plan-gate" data-testid="plan-gate" role="dialog" aria-modal="true" aria-label={t("planGate.aria", "Choose your plan")}>
      <div className="plan-gate-inner">
        {onBack && (
          <button type="button" className="plan-gate-back" onClick={onBack} data-testid="plan-gate-back" disabled={Boolean(buying)}>
            <ArrowLeft size={15} /> {t("planGate.back", "Back")}
          </button>
        )}
        <header className="plan-gate-head">
          <div className="plan-gate-steps" aria-hidden="true">
            <span className="done"><Check size={12} strokeWidth={3} /></span><i />
            <span className="now">2</span><i className="off" />
            <span className="off">3</span>
          </div>
          <p className="plan-gate-eyebrow">{t("planGate.eyebrow", "ACCOUNT CREATED · CHOOSE YOUR PLAN")}</p>
          <h1>{shopName ? t("planGate.titleShop", "{{shop}} is almost ready", { shop: shopName }) : t("planGate.title", "Your account is ready")}</h1>
          <p className="plan-gate-sub">
            {isTime
              ? t("planGate.subTime", "Pick a plan to start billing. Print as many bills as you need until it ends, then renew when you like.")
              : t("planGate.sub", "Pick a print pack to start billing. Prints never expire, there are no monthly fees, and you can add more any time.")}
          </p>
        </header>

        {hasBoth && (
          <div className="plan-gate-tabs" role="tablist" aria-label={t("planGate.aria", "Choose your plan")}>
            {[["time", CalendarDays, t("planGate.tabTime", "Monthly & yearly plans")], ["print", Printer, t("planGate.tabPrint", "Print packs")]].map(([id, Icon, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={shownKind === id}
                className={shownKind === id ? "active" : ""}
                data-testid={`plan-gate-tab-${id}`}
                onClick={() => setKind(id)}
                disabled={Boolean(buying)}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
        )}

        {!plans && <div className="plan-gate-loading"><Spinner size={30} /></div>}

        <div className="plan-gate-grid">
          {(plans ? plans[shownKind] : []).map((plan) => {
            const Icon = plan.icon
            const textKey = plan.textKey || (plan.planId ? "" : plan.id) // translated texts of a standard print pack
            let perks
            return (
              <article key={plan.id} className={`plan-gate-card ${plan.popular ? "popular" : ""}`} data-testid={`plan-gate-${plan.id}`}>
                {plan.popular && <span className="plan-gate-badge"><Crown size={12} /> {t("planGate.popular", "Most popular")}</span>}
                <span className="plan-gate-icon"><Icon size={20} /></span>
                <h2>{textKey ? t(`planGate.${textKey}.name`, plan.name) : plan.name}</h2>
                <p className="plan-gate-blurb">{textKey ? t(`planGate.${textKey}.blurb`, plan.blurb) : plan.blurb}</p>
                <div className="plan-gate-price">
                  <strong>₹{fmt(plan.price)}</strong>
                  {plan.was && <s>₹{fmt(plan.was)}</s>}
                </div>
                <p className="plan-gate-prints">{plan.isTime ? t("planGate.validity", "{{duration}} validity", { duration: durationText(plan) }) : t("planGate.printsRate", "{{prints}} prints · {{rate}} / print", { prints: fmt(plan.prints), rate: formatNumberByLang(plan.rate) })}</p>
                <ul>
                  {(perks = plan.perks).map((perk) => (
                    <li key={perk}><Check size={14} strokeWidth={3} /> {textKey ? t(`planGate.${textKey}.perk${perks.indexOf(perk)}`, perk) : perk}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="plan-gate-buy"
                  data-testid={`plan-gate-buy-${plan.id}`}
                  onClick={() => buy(plan)}
                  disabled={Boolean(buying)}
                >
                  {buying === plan.id ? <ButtonLoader text={t("planGate.opening", "Opening payment...")} /> : <>{plan.isTime ? t("planGate.buyTime", "Get {{duration}} plan", { duration: durationText(plan) }) : t("planGate.buy", "Buy {{count}} prints", { count: fmt(plan.prints) })} <ArrowRight size={15} /></>}
                </button>
              </article>
            )
          })}
        </div>

        <footer className="plan-gate-foot">
          <span><ShieldCheck size={14} /> {isTime ? t("planGate.secureTime", "Secure payment by Razorpay · Your plan starts as soon as the payment is confirmed") : t("planGate.secure", "Secure payment by Razorpay · Prints are added as soon as the payment is confirmed")}</span>
          <span className="plan-gate-hint">{t("planGate.hint", "Your account is saved. Go back any time and sign in to finish.")}</span>
        </footer>
      </div>
    </div>
  )
}

export default PlanGate
