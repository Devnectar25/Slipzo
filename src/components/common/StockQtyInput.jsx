import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { useTranslation } from "react-i18next"
import { normalizeUnit, unitChoices, roundQty, formatQtyUnit } from "../../lib/units"
import "../../styles/LooseItems.css"

/**
 * A stock amount. Items sold by weight or volume can be entered in kg or g, or in L or ml.
 * value / onChange are always in the item's own unit (text, "" = empty); typing 5000 and g gives 5 for an item in kg.
 * 1000 g or ml and more turn into kg or L in the field itself.
 */
export function StockQtyInput({ unit, value, onChange, className = "", inputRef, ...rest }) {
  const { t } = useTranslation()
  const own = normalizeUnit(unit)
  const choices = unitChoices(own)
  const [shownId, setShownId] = useState(own)
  const [text, setText] = useState(value === undefined || value === null ? "" : String(value))
  const sentRef = useRef(text) // what this field last told its form
  const typedRef = useRef(false) // the number on screen was typed (not converted, not from a quick button)
  const ownRef = useRef(own)

  const shown = choices.find((c) => c.id === shownId) || choices.find((c) => c.id === own)
  const factor = shown?.factor || 1

  const send = (nextText, nextFactor) => {
    const n = Number(nextText)
    const out = nextText === "" ? "" : !Number.isFinite(n) ? nextText : nextFactor === 1 ? nextText : String(roundQty(n * nextFactor))
    sentRef.current = out
    onChange?.(out)
  }

  // 5000 g → 5 kg
  const scaleUp = (current, currentText) => {
    const n = Number(currentText)
    const bigger = choices.find((c) => c.factor > (current?.factor || 1))
    if (!bigger || !current || currentText === "" || !Number.isFinite(n) || n < 1000) return false
    const next = String(roundQty((n * current.factor) / bigger.factor))
    typedRef.current = false
    setText(next)
    setShownId(bigger.id)
    send(next, bigger.factor)
    return true
  }

  // the item is measured in something else now: the same number, in the new unit
  useEffect(() => {
    if (ownRef.current === own) return
    ownRef.current = own
    setShownId(own)
    const next = unitChoices(own)
    const self = next.find((c) => c.id === own)
    const bigger = next.find((c) => c.factor > 1)
    const n = Number(text)
    if (self && bigger && text !== "" && n >= 1000) {
      const scaled = String(roundQty(n / bigger.factor))
      typedRef.current = false
      setText(scaled)
      setShownId(bigger.id)
    }
    send(text, 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [own])

  // changed from outside (a quick button, the form was cleared): shown in the item's own unit
  useEffect(() => {
    const v = value === undefined || value === null ? "" : String(value)
    if (v === sentRef.current) return
    sentRef.current = v
    typedRef.current = false
    setText(v)
    setShownId(ownRef.current)
  }, [value])

  const changeUnit = (id) => {
    const next = choices.find((c) => c.id === id)
    if (!next) return
    const n = Number(text)
    let nextText = text
    if (text !== "" && Number.isFinite(n) && !typedRef.current) nextText = String(roundQty((n * factor) / next.factor))
    const wasTyped = typedRef.current
    setShownId(id)
    setText(nextText)
    if (wasTyped && scaleUp(next, nextText)) return
    send(nextText, next.factor)
  }

  const input = (
    <input
      {...rest}
      ref={inputRef}
      type="number"
      inputMode="decimal"
      min="0"
      step="any"
      className={className}
      value={text}
      onChange={(e) => {
        typedRef.current = true
        setText(e.target.value)
        send(e.target.value, factor)
      }}
      onBlur={() => { if (typedRef.current) scaleUp(shown, text) }}
    />
  )
  if (choices.length < 2) return input

  const n = Number(text)
  return (
    <span className="stock-unit-field">
      {input}
      <span className="stock-unit-pick">
        <select
          value={shown?.id}
          onChange={(e) => changeUnit(e.target.value)}
          disabled={rest.disabled}
          aria-label={t("loose.measureIn", "Measure in")}
          data-testid={rest.id ? `${rest.id}-unit` : undefined}
        >
          {choices.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <ChevronDown size={14} aria-hidden="true" />
      </span>
      {shown?.id !== own && text !== "" && Number.isFinite(n) && n > 0 && (
        <small className="stock-unit-own">= {formatQtyUnit(n * factor, own)}</small>
      )}
    </span>
  )
}

export default StockQtyInput
