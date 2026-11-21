import { useTranslation } from "react-i18next"
import { Scale } from "lucide-react"
import { LOOSE_UNITS, normalizeUnit } from "../../lib/units"
import "../../styles/LooseItems.css"

/**
 * "Loose item" switch for the add / edit item forms. Off = counted in pieces (unit "").
 * On = sold by a measuring unit (kg, g, L, ml, m, dozen); stock and bills then use that unit.
 */
export function LooseUnitPicker({ unit, onChange, disabled = false }) {
  const { t } = useTranslation()
  const current = normalizeUnit(unit)
  const isLoose = !!current

  return (
    <div className={`loose-picker ${isLoose ? "on" : ""}`}>
      <label className="loose-picker-head">
        <span className="loose-picker-icon"><Scale size={16} /></span>
        <span className="loose-picker-text">
          <strong>{t("loose.title", "Loose item")}</strong>
          <small>{t("loose.sub", "Sold by weight or measure (kg, litre, metre…)")}</small>
        </span>
        <input
          type="checkbox"
          role="switch"
          className="loose-switch"
          data-testid="loose-item-switch"
          checked={isLoose}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked ? "kg" : "")}
        />
      </label>

      {isLoose && (
        <div className="loose-units" role="radiogroup" aria-label={t("loose.measureIn", "Measure in")}>
          <span className="loose-units-label">{t("loose.measureIn", "Measure in")}</span>
          <div className="loose-units-chips">
            {LOOSE_UNITS.map((u) => (
              <button
                key={u.id}
                type="button"
                role="radio"
                aria-checked={current === u.id}
                disabled={disabled}
                className={`loose-unit-chip ${current === u.id ? "selected" : ""}`}
                data-testid={`loose-unit-${u.id}`}
                title={t(`loose.unit_${u.id}`, u.name)}
                onClick={() => onChange?.(u.id)}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default LooseUnitPicker
