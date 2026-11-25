// Measuring units for loose items (sold by weight, volume or length, e.g. rice from a 100 kg sack).
// An item with no unit is counted in pieces. Keep this list in step with Slipzo_api/src/utils/units.js.

export const LOOSE_UNITS = [
  { id: "kg", label: "kg", name: "Kilogram", presets: [0.25, 0.5, 1, 2, 5] },
  { id: "g", label: "g", name: "Gram", presets: [50, 100, 250, 500] },
  { id: "l", label: "L", name: "Litre", presets: [0.5, 1, 2, 5] },
  { id: "ml", label: "ml", name: "Millilitre", presets: [100, 250, 500] },
  { id: "m", label: "m", name: "Metre", presets: [0.5, 1, 2, 5] },
  { id: "dozen", label: "dozen", name: "Dozen", presets: [0.5, 1, 2] }
]

// Still understood (items saved with them keep working), but no longer offered when choosing a unit
const HIDDEN_UNITS = ["m", "dozen"]
/** the units offered when an item is set to be sold by weight or measure */
export const OFFERED_UNITS = LOOSE_UNITS.filter((u) => !HIDDEN_UNITS.includes(u.id))

const BY_ID = Object.fromEntries(LOOSE_UNITS.map((u) => [u.id, u]))

const ALIASES = {
  kgs: "kg", kilo: "kg", kilogram: "kg", kilograms: "kg",
  gm: "g", gms: "g", gram: "g", grams: "g",
  ltr: "l", litre: "l", liter: "l", litres: "l", liters: "l",
  millilitre: "ml", milliliter: "ml",
  meter: "m", metre: "m", meters: "m", metres: "m", mtr: "m",
  dz: "dozen", doz: "dozen"
}

/** "KG", "Litre" -> "kg" / "l"; pieces, empty or unknown -> "" */
export const normalizeUnit = (value) => {
  if (value === null || value === undefined) return ""
  const v = String(value).trim().toLowerCase()
  if (!v) return ""
  if (BY_ID[v]) return v
  return ALIASES[v] || ""
}

export const getUnit = (value) => BY_ID[normalizeUnit(value)] || null

/** true for an item sold by a measuring unit (kg, litre, ...) */
export const isLooseItem = (item) => !!normalizeUnit(item?.unit)

/** short label for a unit: "kg", "L"; "" for pieces */
export const unitLabel = (value) => getUnit(value)?.label || ""

// The same thing measured in a larger or smaller unit
const PAIRS = { kg: ["kg", "g"], g: ["kg", "g"], l: ["l", "ml"], ml: ["l", "ml"] }
const SIZE = { kg: 1000, g: 1, l: 1000, ml: 1 }

/**
 * The units an item's quantity can be entered in: kg and g, or L and ml; only its own unit otherwise.
 * factor: how much one of them is in the item's own unit (an item in kg: 1 g = 0.001).
 */
export const unitChoices = (value) => {
  const own = normalizeUnit(value)
  if (!own) return []
  return (PAIRS[own] || [own]).map((id) => ({ ...BY_ID[id], factor: PAIRS[own] ? SIZE[id] / SIZE[own] : 1 }))
}

/** Quantities keep 3 decimals (250 g = 0.25 kg) */
export const roundQty = (n) => Math.round((Number(n) || 0) * 1000) / 1000

/** A stock amount in the handier unit: 5000 g → "5 kg", 0.25 kg → "250 g", 1500 ml → "1.5 L" */
export const formatStockQty = (n, unit) => {
  const own = normalizeUnit(unit)
  const v = Number(n) || 0
  if (PAIRS[own]) {
    const [big, small] = PAIRS[own]
    const base = v * SIZE[own]
    if (own === small && Math.abs(v) >= 1000) return formatQtyUnit(base / 1000, big)
    if (own === big && v !== 0 && Math.abs(v) < 1) return formatQtyUnit(base, small)
  }
  return formatQtyUnit(v, unit)
}

/** "2.5 kg" for a loose item, "2" for pieces */
export const formatQtyUnit = (n, unit) => {
  const v = roundQty(n)
  const label = unitLabel(unit)
  return label ? `${v} ${label}` : String(v)
}
