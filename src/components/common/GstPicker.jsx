import { useTranslation } from "react-i18next"
import { Percent } from "lucide-react"
import { money } from "../../lib/utils"
import { GST_SLABS, normalizeGstRate, withGst } from "../../lib/gst"
import "../../styles/GstPicker.css"

/**
 * GST % for a product (add / edit item forms), shown when the shop has GST turned on.
 * Shows: selling price + GST = total price (what the bill charges).
 * rate: "" or a number as text; onChange(text)
 */
export function GstPicker({ rate, onChange, price, unitLabel = "", disabled = false }) {
  const { t } = useTranslation()
  const r = normalizeGstRate(rate)
  const p = Number(price) || 0
  const gstAmount = Math.round(p * r) / 100
  const total = withGst(p, r)
  const isSlab = GST_SLABS.includes(r) && String(rate) !== ""
  const per = unitLabel ? ` / ${unitLabel}` : ""

  return (
    <div className="gst-picker" data-testid="gst-picker">
      <span className="gst-picker-label">
        <Percent size={14} /> {t("gst.rateLabel", "GST on this product")}
      </span>
      <div className="gst-picker-row">
        <div className="gst-chips" role="radiogroup" aria-label={t("gst.rateLabel", "GST on this product")}>
          {GST_SLABS.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={isSlab && r === s}
              disabled={disabled}
              className={`gst-chip ${isSlab && r === s ? "selected" : ""}`}
              data-testid={`gst-chip-${s}`}
              onClick={() => onChange?.(String(s))}
            >
              {s === 0 ? t("gst.none", "No GST") : `${s}%`}
            </button>
          ))}
        </div>
        <div className="gst-custom">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max="50"
            step="any"
            placeholder={t("gst.other", "Other")}
            value={isSlab ? "" : rate}
            disabled={disabled}
            aria-label={t("gst.otherRate", "Other GST %")}
            data-testid="gst-custom-input"
            onChange={(e) => onChange?.(e.target.value)}
          />
          <span>%</span>
        </div>
      </div>

      {/* loose items (sold by kg, litre…) get GST only when the shop owner picks a rate here */}
      {unitLabel && r === 0 && (
        <span className="gst-loose-note" data-testid="gst-loose-note">
          {t("gst.looseNote", "Loose item: no GST is added on bills unless you choose a rate.")}
        </span>
      )}

      <div className="gst-total" data-testid="gst-total">
        <div className="gst-total-row">
          <span>{t("gst.sellingPrice", "Selling price")}</span>
          <span>{money(p)}{per}</span>
        </div>
        <div className="gst-total-row">
          <span>{t("gst.gstAmount", "GST ({{rate}}%)", { rate: r })}</span>
          <span>+ {money(gstAmount)}</span>
        </div>
        <div className="gst-total-row grand">
          <span>{t("gst.totalPrice", "Total price")}</span>
          <strong>{money(total)}{per}</strong>
        </div>
        <span className="gst-total-note">{t("gst.totalNote", "Bills charge the total price.")}</span>
      </div>
    </div>
  )
}

export default GstPicker
