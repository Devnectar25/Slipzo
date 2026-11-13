import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Check, Crown, Layers, Zap, ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react"
import { ButtonLoader } from "./common/Skeleton"
import { startPrintPurchase, resumePendingPurchase, getPendingPayment } from "../lib/buyPrints"
import { formatNumberByLang } from "../lib/utils"
import "../styles/PlanGate.css"

// Same packs and prices as the Pricing page. The server checks the price against the payment, so these are only labels.
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

const fmt = (n) => formatNumberByLang(Number(n).toLocaleString("en-IN"))

export function PlanGate({ user, shopName, onPurchased, onBack }) {
  const { t } = useTranslation()
  const [buying, setBuying] = useState(null)

  useEffect(() => {
    const prevBody = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prevBody }
  }, [])

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
        planName: plan.name,
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
            {t("planGate.sub", "Pick a print pack to start billing. Prints never expire, there are no monthly fees, and you can add more any time.")}
          </p>
        </header>

        <div className="plan-gate-grid">
          {PLANS.map((plan) => {
            const Icon = plan.icon
            let perks
            return (
              <article key={plan.id} className={`plan-gate-card ${plan.popular ? "popular" : ""}`} data-testid={`plan-gate-${plan.id}`}>
                {plan.popular && <span className="plan-gate-badge"><Crown size={12} /> {t("planGate.popular", "Most popular")}</span>}
                <span className="plan-gate-icon"><Icon size={20} /></span>
                <h2>{t(`planGate.${plan.id}.name`, plan.name)}</h2>
                <p className="plan-gate-blurb">{t(`planGate.${plan.id}.blurb`, plan.blurb)}</p>
                <div className="plan-gate-price">
                  <strong>₹{fmt(plan.price)}</strong>
                  {plan.was && <s>₹{fmt(plan.was)}</s>}
                </div>
                <p className="plan-gate-prints">{t("planGate.printsRate", "{{prints}} prints · {{rate}} / print", { prints: fmt(plan.prints), rate: formatNumberByLang(plan.rate) })}</p>
                <ul>
                  {(perks = plan.perks).map((perk) => (
                    <li key={perk}><Check size={14} strokeWidth={3} /> {t(`planGate.${plan.id}.perk${perks.indexOf(perk)}`, perk)}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="plan-gate-buy"
                  data-testid={`plan-gate-buy-${plan.id}`}
                  onClick={() => buy(plan)}
                  disabled={Boolean(buying)}
                >
                  {buying === plan.id ? <ButtonLoader text={t("planGate.opening", "Opening payment...")} /> : <>{t("planGate.buy", "Buy {{count}} prints", { count: fmt(plan.prints) })} <ArrowRight size={15} /></>}
                </button>
              </article>
            )
          })}
        </div>

        <footer className="plan-gate-foot">
          <span><ShieldCheck size={14} /> {t("planGate.secure", "Secure payment by Razorpay · Prints are added as soon as the payment is confirmed")}</span>
          <span className="plan-gate-hint">{t("planGate.hint", "Your account is saved. Go back any time and sign in to finish.")}</span>
        </footer>
      </div>
    </div>
  )
}

export default PlanGate
