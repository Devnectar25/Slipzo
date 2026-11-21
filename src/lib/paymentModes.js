// Payment modes a shop can accept. The owner picks which ones show on bills in the Shop profile.
// Keep this list in step with Slipzo_api/src/utils/paymentModes.js.
export const PAYMENT_MODES = [
  { id: "Cash", labelKey: "bills.cash", label: "Cash" },
  { id: "UPI", labelKey: "bills.upi", label: "UPI / QR" },
  { id: "Card", labelKey: "bills.card", label: "Card" },
  { id: "Credit", labelKey: "bills.credit", label: "Credit" }
]

const IDS = PAYMENT_MODES.map((m) => m.id)
const canonical = (v) => IDS.find((id) => id.toLowerCase() === String(v || "").trim().toLowerCase()) || null

/** ["upi", "Cash"] / "Cash,UPI" / undefined -> ["Cash", "UPI"] in the standard order; nothing chosen = all modes */
export const parsePaymentModes = (value) => {
  let list = value
  if (typeof list === "string") {
    const raw = list.trim()
    if (raw.startsWith("[")) {
      try { list = JSON.parse(raw) } catch (_) { list = raw.split(",") }
    } else {
      list = raw.split(",")
    }
  }
  if (!Array.isArray(list)) return [...IDS]
  const picked = new Set(list.map(canonical).filter(Boolean))
  const ordered = IDS.filter((id) => picked.has(id))
  return ordered.length ? ordered : [...IDS]
}

/** the modes this shop takes, as { id, labelKey, label } */
export const shopPaymentModes = (shop) => {
  const ids = parsePaymentModes(shop?.payment_modes)
  return PAYMENT_MODES.filter((m) => ids.includes(m.id))
}

/** the mode a new bill starts with: the shop's default, or its first mode */
export const shopDefaultPaymentMode = (shop) => {
  const ids = parsePaymentModes(shop?.payment_modes)
  const d = canonical(shop?.default_payment_mode)
  return d && ids.includes(d) ? d : ids[0]
}
