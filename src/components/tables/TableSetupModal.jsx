import { useState } from "react"
import { Utensils, Minus, Plus, Check, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { call, setCachedData, getCachedData } from "../../lib/utils"
import { useToast } from "../common/Toast"

export function TableSetupModal({ isOpen, onClose, onSetupComplete, currentCount = 10, user }) {
  const { t } = useTranslation()
  const { success: toastSuccess, error: toastError } = useToast()
  const [count, setCount] = useState(currentCount || 10)
  const [isSaving, setIsSaving] = useState(false)

  if (!isOpen) return null

  const presets = [5, 10, 15, 20, 25, 30, 50]

  const handleIncrement = () => {
    setCount((prev) => Math.min(prev + 1, 100))
  }

  const handleDecrement = () => {
    setCount((prev) => Math.max(prev - 1, 1))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // 1. Update shop table_count in backend
      const cachedShop = getCachedData("/shop") || {}
      const updatedShop = { ...cachedShop, table_count: count, business_type: "hotel_food" }
      
      await call("/shop", {
        method: "PUT",
        body: JSON.stringify(updatedShop)
      }).catch((e) => console.warn("Shop update warning in setup:", e))

      setCachedData("/shop", updatedShop)

      // 2. Setup tables in backend
      const res = await call("/restaurant/tables/setup", {
        method: "POST",
        body: JSON.stringify({ table_count: count })
      }).catch((e) => console.warn("Restaurant tables setup API warning:", e))

      toastSuccess(t("tables.setupSuccess", `Restaurant configured with ${count} tables!`))
      
      if (onSetupComplete) {
        onSetupComplete(count, res?.tables)
      }
      onClose()
    } catch (err) {
      console.error("Failed to setup tables:", err)
      toastError("Failed to save table setup. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="table-modal-backdrop" onClick={onClose} style={{ zIndex: 10001 }}>
      <div className="table-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
        <div className="table-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f0f9ff", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Utensils size={20} />
            </div>
            <div>
              <h3 className="table-modal-title">
                {t("tables.setupTitle", "Set Up Your Tables")}
              </h3>
              <p style={{ fontSize: "0.78rem", color: "#64748b", margin: 0 }}>
                {t("tables.setupSubtitle", "Choose how many tables your restaurant has.")}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            disabled={isSaving}
            style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="table-modal-body" style={{ textAlign: "center", padding: "1.5rem 1.25rem" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {t("tables.numberOfTables", "Number of Tables")}
          </div>

          <div className="table-count-stepper">
            <button
              type="button"
              className="stepper-btn"
              onClick={handleDecrement}
              disabled={count <= 1 || isSaving}
              aria-label="Decrease tables"
            >
              <Minus size={18} />
            </button>
            <div className="stepper-display">
              {count}
            </div>
            <button
              type="button"
              className="stepper-btn"
              onClick={handleIncrement}
              disabled={count >= 100 || isSaving}
              aria-label="Increase tables"
            >
              <Plus size={18} />
            </button>
          </div>

          <div style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: "0.6rem" }}>
            {t("tables.quickPresets", "Quick select preset:")}
          </div>

          <div className="table-preset-buttons">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                className={`table-preset-btn ${count === p ? "active" : ""}`}
                onClick={() => setCount(p)}
                disabled={isSaving}
              >
                {p} {t("tables.tablesSuffix", "tables")}
              </button>
            ))}
          </div>
        </div>

        <div className="table-modal-footer">
          <button
            type="button"
            className="menu-secondary-btn"
            onClick={onClose}
            disabled={isSaving}
            style={{ padding: "0.6rem 1.15rem", borderRadius: "10px" }}
          >
            {t("common.cancel", "Cancel")}
          </button>
          <button
            type="button"
            className="table-btn-print"
            onClick={handleSave}
            disabled={isSaving}
            style={{ padding: "0.6rem 1.5rem", borderRadius: "10px", background: "#0284c7" }}
          >
            <Check size={16} />
            <span>{isSaving ? t("common.saving", "Saving...") : t("tables.saveAndContinue", "Save & Start Billing")}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
