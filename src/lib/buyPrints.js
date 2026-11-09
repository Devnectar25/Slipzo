import Swal from "sweetalert2"
import i18n from "../i18n/i18n"
import { activatePlan, syncUserQuota, call } from "./utils"

// Plan names are stored in English on the server; the screen shows them in the chosen language
const PLAN_LABEL_KEYS = { "Starter Pack": "planGate.starter.name", "Pro Growth": "planGate.pro.name", "Business Super": "planGate.business.name" }

const tr = (key, fallback, opts) => i18n.t(key, { defaultValue: fallback, ...opts })
const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]))

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })

// ---- a payment that went through at Razorpay but is not confirmed by our server yet is remembered, so the person never pays twice
const PENDING_KEY = "slipzo_pending_payment"
const savePending = (pending) => {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify({ ...pending, savedAt: Date.now() })) } catch (_) { /* storage can be unavailable */ }
}
const clearPending = () => {
  try { localStorage.removeItem(PENDING_KEY) } catch (_) { /* ignore */ }
}
export const getPendingPayment = (user) => {
  try {
    const raw = JSON.parse(localStorage.getItem(PENDING_KEY) || "null")
    if (raw && raw.paymentId && (!raw.userId || raw.userId === user?.id)) return raw
  } catch (_) { /* ignore */ }
  return null
}

// Asks our server to confirm the payment with Razorpay and add the prints. Nothing is added unless the server says yes.
async function confirmPurchase(pending, user) {
  const { paymentId, planName, amountInRupees, printCount } = pending
  const userKey = user?.email || user?.id
  try {
    const subRes = await call("/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        plan_name: planName,
        amount: amountInRupees,
        prints_count: printCount,
        payment_id: paymentId,
        payment_status: "completed",
        user_name: user?.name || "Slipzen Member",
        user_email: user?.email || ""
      })
    })
    if (subRes && subRes.quota) syncUserQuota(subRes.quota, userKey)
    clearPending()
    return { ok: true, subRes, updated: activatePlan(planName, printCount, userKey) }
  } catch (err) {
    // "already used" can mean an earlier try did go through but its answer never reached us: look before giving up
    if (err?.status === 409) {
      try {
        const mine = await call("/subscriptions/my", { noCache: true })
        if ((mine?.subscriptions || []).some((s) => s.payment_id === paymentId)) {
          if (mine.quota) syncUserQuota(mine.quota, userKey)
          clearPending()
          return { ok: true, subRes: mine, updated: activatePlan(planName, printCount, userKey) }
        }
      } catch (_) { /* fall through to the error */ }
    }
    console.warn("⚠️ Could not confirm the purchase with the server:", err)
    return { ok: false, reason: err?.message || "" }
  }
}

const successPopup = ({ paymentId, planName, printCount }) => {
  const planLabel = PLAN_LABEL_KEYS[planName] ? tr(PLAN_LABEL_KEYS[planName], planName) : planName
  return Swal.fire({
    title: tr("pay.successTitle", "🎉 Payment Successful!"),
    html: `
      <div style="text-align: center; font-size: 0.95rem; line-height: 1.6; color: #0C1F41; padding: 0.5rem 0;">
        <p style="margin-bottom: 0.75rem; font-size: 0.9rem;">
          <strong>${tr("pay.paymentId", "Payment ID:")}</strong> <code style="background: #e0f2fe; color: #0284c7; padding: 4px 10px; border-radius: 6px; font-weight: 700;">${escapeHtml(paymentId)}</code>
        </p>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 0.85rem 1rem; border-radius: 12px; color: #166534; font-weight: 600;">
          ${tr("pay.activated", "Your <strong>{{prints}} print quota</strong> has been activated for <strong>{{plan}}</strong>!", { prints: printCount.toLocaleString(), plan: escapeHtml(planLabel) })}
        </div>
      </div>
    `,
    icon: "success",
    confirmButtonText: tr("pay.great", "Great, Let's Print!"),
    confirmButtonColor: "#0284c7",
    background: "#ffffff",
    borderRadius: "20px"
  })
}

/**
 * Confirms a payment with the server, with the same "Try again" available as long as it keeps failing.
 * Resolves true once the prints were added.
 */
async function confirmWithRetry(pending, user, { onActivated, onDone } = {}) {
  for (;;) {
    Swal.fire({
      title: tr("pricing.activatingPlan", "Activating your plan..."),
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    })
    const result = await confirmPurchase(pending, user)
    if (result.ok) {
      onActivated?.(result.updated, result.subRes)
      await successPopup(pending)
      onDone?.()
      return true
    }

    // The money may already have been taken, so show what happened and keep the payment ID in view
    const choice = await Swal.fire({
      title: tr("pricing.confirmFailedTitle", "We could not confirm your payment yet"),
      html: `<div style="line-height:1.6;font-size:0.95rem;color:#0C1F41">
          <p>${tr("pricing.confirmFailedText", "If money was deducted, your prints will be added once the payment is confirmed. Please keep this payment ID and contact support if they do not appear.")}</p>
          ${result.reason ? `<p style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:0.5rem 0.75rem;color:#9a3412;font-size:0.88rem">${escapeHtml(result.reason)}</p>` : ""}
          <p><strong>${tr("pay.paymentId", "Payment ID:")}</strong> <code>${escapeHtml(pending.paymentId)}</code></p>
          <p style="font-size:0.85rem;color:#475569">${tr("pay.noSecondCharge", "You do not need to pay again. Press Try again to confirm this same payment.")}</p>
        </div>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: tr("pay.tryAgain", "Try again"),
      cancelButtonText: tr("pay.close", "Close"),
      confirmButtonColor: "#0284c7",
      reverseButtons: true
    })
    if (!choice.isConfirmed) return false
  }
}

/** Picks up a payment that was made but never confirmed (for example the server was not ready), without charging again. */
export async function resumePendingPurchase({ user, onActivated, onDone }) {
  const pending = getPendingPayment(user)
  if (!pending || !user || user.staff_of) return false
  return confirmWithRetry(pending, user, { onActivated, onDone })
}

/**
 * Opens Razorpay for a print pack and, once the server has confirmed the payment, adds the prints.
 * Used by the Pricing page and by the plan step shown right after sign up.
 *
 * onActivated(plan)  - the server confirmed the payment and the prints were added
 * onDone()           - the person closed the "Payment Successful" message
 * Resolves true if the payment window was opened, false if it could not be (owner-only, no network, ...).
 */
export async function startPrintPurchase({ planName, amountInRupees, printCount, user, onActivated, onDone }) {
  // The server refuses plan purchases from workers, so stop before any money is taken
  if (user?.staff_of) {
    Swal.fire({
      title: tr("pricing.ownerOnlyTitle", "Only the shop owner can buy prints"),
      text: tr("pricing.ownerOnlyText", "Please ask the owner of your shop to buy more prints."),
      icon: "info",
      confirmButtonColor: "#0284c7"
    })
    return false
  }

  const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_SIPp9QznVVM48W"

  const isLoaded = await loadRazorpay()
  if (!isLoaded) {
    Swal.fire({
      title: tr("pay.connectionError", "Connection Error"),
      text: tr("pay.sdkFailed", "Razorpay SDK failed to load. Please check your internet connection."),
      icon: "warning",
      confirmButtonColor: "#0284c7"
    })
    return false
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
      contact: user?.phone || user?.shop_phone || ""
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
      const pending = {
        paymentId: response.razorpay_payment_id || `PAY_${Date.now()}`,
        planName,
        amountInRupees,
        printCount,
        userId: user?.id || null
      }
      // Written down before the server is asked, so a failed or interrupted confirmation can be finished later
      savePending(pending)
      await confirmWithRetry(pending, user, { onActivated, onDone })
    },
    modal: {
      ondismiss: function () {
        console.log("Razorpay modal closed")
      }
    }
  }

  try {
    const rzp = new window.Razorpay(options)
    rzp.on("payment.failed", function (response) {
      Swal.fire({
        title: tr("pay.declined", "Payment Declined"),
        text: response.error?.description || tr("pay.declinedText", "Transaction failed or was declined."),
        icon: "error",
        confirmButtonColor: "#ef4444"
      })
    })
    rzp.open()
    return true
  } catch (err) {
    console.error("Razorpay launch error:", err)
    Swal.fire({
      title: tr("pay.error", "Razorpay Error"),
      text: err.message || tr("pay.initFailed", "Failed to initialize payment gateway."),
      icon: "error",
      confirmButtonColor: "#ef4444"
    })
    return false
  }
}
