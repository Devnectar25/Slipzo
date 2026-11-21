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

/** Quantities keep 3 decimals (250 g = 0.25 kg) */
export const roundQty = (n) => Math.round((Number(n) || 0) * 1000) / 1000

/** "2.5 kg" for a loose item, "2" for pieces */
export const formatQtyUnit = (n, unit) => {
  const v = roundQty(n)
  const label = unitLabel(unit)
  return label ? `${v} ${label}` : String(v)
}
