import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { X, Scale } from "lucide-react"
import { money } from "../../lib/utils"
import { getUnit, unitLabel, roundQty, formatQtyUnit } from "../../lib/units"
import "../../styles/LooseItems.css"

/**
 * Asks how much of a loose item goes on the bill (e.g. 2.5 kg of rice), with quick amounts and the price.
 * maxQty: what stock allows (Infinity when the item has no stock count).
 * onConfirm(qty) gets the chosen quantity in the item's unit.
 */
export function LooseQtyModal({ item, rate, initialQty, maxQty = Infinity, isEdit = false, onConfirm, onClose }) {
  const { t } = useTranslation()
  const unit = getUnit(item?.unit)
  const label = unitLabel(item?.unit)
  const [value, setValue] = useState(initialQty ? String(roundQty(initialQty)) : "")
  const [error, setError] = useState("")
  const inputRef = useRef(null)

  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 30)
    const onKey = (e) => { if (e.key === "Escape") onClose?.() }
    window.addEventListener("keydown", onKey)
    return () => { clearTimeout(id); window.removeEventListener("keydown", onKey) }
  }, [onClose])

  if (!item) return null

  const qty = value === "" ? 0 : Number(value)
  const valid = Number.isFinite(qty) && qty > 0
  const amount = valid ? Math.round(qty * (Number(rate) || 0) * 100) / 100 : 0
  const hasStock = Number.isFinite(maxQty)

  const submit = (e) => {
    e?.preventDefault()
    if (!valid) {
      setError(t("loose.errQty", "Enter how much, e.g. 1.5"))
      return
    }
    const q = roundQty(qty)
    if (q <= 0) {
      setError(t("loose.errQty", "Enter how much, e.g. 1.5"))
      return
    }
    if (hasStock && q > maxQty) {
      setError(maxQty <= 0
        ? t("stock.warnOut", "\"{{name}}\" is out of stock", { name: item.name })
        : t("loose.errMore", "Only {{n}} left in stock", { n: formatQtyUnit(maxQty, item.unit) }))
      return
    }
    onConfirm?.(q)
  }

  return (
    <div className="loose-qty-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <form className="loose-qty-modal" role="dialog" aria-modal="true" onSubmit={submit} data-testid="loose-qty-modal">
        <div className="loose-qty-head">
          <span className="loose-qty-icon"><Scale size={18} /></span>
          <div className="loose-qty-title">
            <h3>{item.name}</h3>
            <span>{money(rate)} / {label}</span>
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
            onChange={(e) => { setValue(e.target.value); if (error) setError("") }}
          />
          <span className="loose-qty-suffix">{label}</span>
        </div>

        {unit?.presets?.length > 0 && (
          <div className="loose-qty-presets">
            {unit.presets.map((p) => (
              <button
                key={p}
                type="button"
                className={`loose-qty-preset ${Number(value) === p ? "selected" : ""}`}
                onClick={() => { setValue(String(p)); setError("") }}
              >
                {p} {label}
              </button>
            ))}
          </div>
        )}

        {hasStock && (
          <p className="loose-qty-stock">
            {t("stock.countShort", "{{n}} in stock", { n: formatQtyUnit(Math.max(0, maxQty), item.unit) })}
          </p>
        )}

        {error && <p className="loose-qty-error" role="alert">{error}</p>}

        <div className="loose-qty-total">
          <span>{t("loose.amount", "Amount")}</span>
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
