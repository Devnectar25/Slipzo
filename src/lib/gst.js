// GST per product. The shop decides in its profile whether products carry GST (gst_enabled) and whether
// bills show the GST breakdown (gst_on_bill). A product's selling price is before GST; bills charge price + GST.
// Keep in step with Slipzo_api/src/utils/gst.js.
import { getItemRate } from "./utils"

export const GST_SLABS = [0, 5, 12, 18, 28]

const truthy = (v) => v === true || v === 1 || v === "1" || v === "true" || v === "t"
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

/** "18" -> 18; empty / invalid -> 0; capped at 50 */
export const normalizeGstRate = (value) => {
  if (value === null || value === undefined || value === "") return 0
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(50, Math.round(n * 100) / 100)
}

export const shopUsesGst = (shop) => truthy(shop?.gst_enabled)
export const shopShowsGstOnBill = (shop) => shopUsesGst(shop) && truthy(shop?.gst_on_bill)

/** selling price + GST */
export const withGst = (price, rate) => round2((Number(price) || 0) * (1 + normalizeGstRate(rate) / 100))

/** the GST % that applies to a menu item in this shop (0 when the shop has GST off) */
export const itemGstRate = (item, shop) => (shopUsesGst(shop) ? normalizeGstRate(item?.gst_rate) : 0)

/** what a menu item costs on a bill: its selling price plus GST when the shop uses GST */
export const menuItemRate = (item, shop) => withGst(getItemRate(item), itemGstRate(item, shop))

/**
 * GST summary for a bill whose line rates already include GST.
 * discountFactor (total / subtotal) spreads a bill discount over the lines.
 * -> { taxable, gst, groups: [{ rate, taxable, gst }] } (only lines with GST > 0 make groups)
 */
export const gstSummary = (lines, discountFactor = 1) => {
  const byRate = new Map()
  let taxable = 0
  let gst = 0
  for (const line of lines || []) {
    const rate = normalizeGstRate(line.gst_rate)
    const gross = (Number(line.qty ?? line.quantity) || 0) * (Number(line.rate) || 0) * discountFactor
    const base = gross / (1 + rate / 100)
    const tax = gross - base
    taxable += base
    gst += tax
    if (rate > 0) {
      const g = byRate.get(rate) || { rate, taxable: 0, gst: 0 }
      g.taxable += base
      g.gst += tax
      byRate.set(rate, g)
    }
  }

  const sortedGroups = [...byRate.values()].sort((a, b) => a.rate - b.rate).map((g) => {
    const halfRate = round2(g.rate / 2)
    const halfGst = round2(g.gst / 2)
    const otherHalfGst = round2(g.gst - halfGst)
    return {
      rate: g.rate,
      taxable: round2(g.taxable),
      gst: round2(g.gst),
      cgstRate: halfRate,
      sgstRate: halfRate,
      cgst: halfGst,
      sgst: otherHalfGst
    }
  })

  const totalRate = sortedGroups.length === 1
    ? sortedGroups[0].rate
    : (taxable > 0 ? round2((gst / taxable) * 100) : 0);

  const halfTotalGst = round2(gst / 2);
  const otherHalfTotalGst = round2(gst - halfTotalGst);

  return {
    taxable: round2(taxable),
    gst: round2(gst),
    totalRate: totalRate,
    cgst: halfTotalGst,
    sgst: otherHalfTotalGst,
    groups: sortedGroups
  };
}
