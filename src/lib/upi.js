// UPI payment QR codes. Any UPI app (GPay, PhonePe, Paytm, BHIM…) can scan the link below,
// fill in the shop's UPI ID and the exact bill amount, and pay. No payment gateway is involved.
// Keep the UPI ID check in step with Slipzo_api/src/utils/paymentModes.js.

const UPI_RE = /^[a-z0-9._-]{2,256}@[a-z][a-z0-9.-]{1,63}$/

/** " Shop@OKAXIS " -> "shop@okaxis" */
export const normalizeUpiId = (value) => String(value ?? "").trim().toLowerCase()

export const isValidUpiId = (value) => UPI_RE.test(normalizeUpiId(value))

/**
 * upi://pay link for a QR code.
 * amount: the exact amount to pay (rupees); left out when 0, then the customer types it.
 * note: shown to the customer in their UPI app, e.g. "Bill SLP-1004".
 */
export const buildUpiLink = ({ upiId, payeeName, amount, note }) => {
  const params = new URLSearchParams()
  params.set("pa", normalizeUpiId(upiId))
  if (payeeName) params.set("pn", String(payeeName).trim().slice(0, 50))
  const amt = Math.round((Number(amount) || 0) * 100) / 100
  if (amt > 0) params.set("am", amt.toFixed(2))
  params.set("cu", "INR")
  if (note) params.set("tn", String(note).trim().slice(0, 50))
  // URLSearchParams writes spaces as "+" (some UPI apps show it literally) and "@" as "%40" (some apps then reject the UPI ID)
  return `upi://pay?${params.toString().replace(/\+/g, "%20").replace(/%40/g, "@")}`
}
