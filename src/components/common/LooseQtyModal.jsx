import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { X, Scale, ChevronDown } from "lucide-react"
import { money } from "../../lib/utils"
import { normalizeUnit, unitChoices, unitLabel, roundQty, formatQtyUnit, formatStockQty } from "../../lib/units"
import { lockPageScroll } from "../../lib/scrollLock"
import "../../styles/LooseItems.css"

/**
 * Asks how much of a loose item goes on the bill (e.g. 2.5 kg of rice), with quick amounts and the price.
 * The quantity can be entered in kg or g, or in L or ml; the bill keeps it in the item's own unit.
 * maxQty: what stock allows (Infinity when the item has no stock count).
 * onConfirm(qty) gets the chosen quantity in the item's unit.
 */
export function LooseQtyModal({ item, rate, initialQty, maxQty = Infinity, isEdit = false, onConfirm, onClose }) {
  const { t } = useTranslation()
  const ownUnit = normalizeUnit(item?.unit)
  const choices = unitChoices(ownUnit)
  // less than 1 kg / 1 L already on the bill opens as g / ml: 250 g, not 0.25 kg
  const [unitId, setUnitId] = useState(() => (
    initialQty > 0 && initialQty < 1 && choices.some((c) => c.factor < 1) ? choices.find((c) => c.factor < 1).id : ownUnit
  ))
  const unit = choices.find((c) => c.id === unitId) || choices[0]
  const factor = unit?.factor || 1
  const label = unit?.label || ""
  const [value, setValue] = useState(() => (initialQty ? String(roundQty(initialQty / factor)) : ""))
  const typedRef = useRef(false) // the number was typed here (not a quick amount, not what was on the bill)
  const [error, setError] = useState("")
  const inputRef = useRef(null)

  // the page behind stays still while this is open (released when it closes, however it closes)
  useEffect(() => lockPageScroll(), [])

  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 30)
    const onKey = (e) => { if (e.key === "Escape") onClose?.() }
    window.addEventListener("keydown", onKey)
    return () => { clearTimeout(id); window.removeEventListener("keydown", onKey) }
  }, [onClose])

  if (!item) return null

  const qty = value === "" ? 0 : Number(value)
  const valid = Number.isFinite(qty) && qty > 0
  const ownQty = valid ? roundQty(qty * factor) : 0 // in the item's own unit, as the bill keeps it
  const amount = valid ? Math.round(ownQty * (Number(rate) || 0) * 100) / 100 : 0
  const hasStock = Number.isFinite(maxQty)

  // a number just typed is kept (250, then "g" = 250 g); any other amount stays the same amount (2 kg → 2000 g)
  const changeUnit = (id) => {
    const next = choices.find((c) => c.id === id)
    if (!next) return
    if (valid && !typedRef.current) setValue(String(roundQty((qty * factor) / next.factor)))
    setUnitId(id)
    setError("")
    inputRef.current?.focus()
  }

  const submit = (e) => {
    e?.preventDefault()
    if (!valid) {
      setError(t("loose.errQty", "Enter how much, e.g. 1.5"))
      return
    }
    const q = ownQty
    if (q <= 0) {
      setError(t("loose.errQty", "Enter how much, e.g. 1.5"))
      return
    }
    if (hasStock && q > maxQty) {
      setError(maxQty <= 0
        ? t("stock.warnOut", "\"{{name}}\" is out of stock", { name: item.name })
        : t("loose.errMore", "Only {{n}} left in stock", { n: formatStockQty(maxQty, item.unit) }))
      return
    }
    onConfirm?.(q)
  }

  return (
    <div className="loose-qty-backdrop">
      <form className="loose-qty-modal" role="dialog" aria-modal="true" onSubmit={submit} data-testid="loose-qty-modal">
        <div className="loose-qty-head">
          <span className="loose-qty-icon"><Scale size={18} /></span>
          <div className="loose-qty-title">
            <h3>{item.name}</h3>
            <span>{money(rate)} / {unitLabel(ownUnit)}</span>
          </div>
          <button type="button" className="loose-qty-close" onClick={onClose} aria-label={t("common.close", "Close")}>
            <X size={18} />
          </button>
        </div>

        <label className="loose-qty-label" htmlFor="loose-qty-input">
          {t("loose.howMuch", "How much? (in {{unit}})", { unit: label })}
        </label>
        <div className={`loose-qty-field ${error ? "error" : ""}`}>
          <input
            id="loose-qty-input"
            ref={inputRef}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0"
            value={value}
            data-testid="loose-qty-input"
            onChange={(e) => { typedRef.current = true; setValue(e.target.value); if (error) setError("") }}
          />
          {choices.length > 1 ? (
            <span className="loose-qty-unit">
              <select
                value={unit.id}
                onChange={(e) => changeUnit(e.target.value)}
                aria-label={t("loose.measureIn", "Measure in")}
                data-testid="loose-qty-unit"
              >
                {choices.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </span>
          ) : (
            <span className="loose-qty-suffix">{label}</span>
          )}
        </div>

        {unit?.presets?.length > 0 && (
          <div className="loose-qty-presets">
            {unit.presets.map((p) => (
              <button
                key={p}
                type="button"
                className={`loose-qty-preset ${Number(value) === p ? "selected" : ""}`}
                onClick={() => { typedRef.current = false; setValue(String(p)); setError("") }}
              >
                {p} {label}
              </button>
            ))}
          </div>
        )}

        {hasStock && (
          <p className="loose-qty-stock">
            {t("stock.countShort", "{{n}} in stock", { n: formatStockQty(Math.max(0, maxQty), item.unit) })}
          </p>
        )}

        {error && <p className="loose-qty-error" role="alert">{error}</p>}

        <div className="loose-qty-total">
          <span>
            {t("loose.amount", "Amount")}
            {valid && unit?.id !== ownUnit && <small className="loose-qty-own">{formatQtyUnit(ownQty, ownUnit)}</small>}
          </span>
          <strong>{money(amount)}</strong>
        </div>

        <div className="loose-qty-actions">
          <button type="button" className="loose-qty-cancel" onClick={onClose}>{t("common.cancel", "Cancel")}</button>
          <button type="submit" className="loose-qty-confirm" data-testid="loose-qty-confirm">
            {isEdit ? t("loose.update", "Update") : t("loose.addToBill", "Add to bill")}
          </button>
        </div>
      </form>
    </div>
  )
}

export default LooseQtyModal
