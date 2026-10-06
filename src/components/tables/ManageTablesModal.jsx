import { useState } from "react"
import { SlidersHorizontal, Minus, Plus, Check, X, AlertCircle } from "lucide-react"
import { useTranslation } from "react-i18next"
import { call, setCachedData, getCachedData } from "../../lib/utils"
import { useToast } from "../common/Toast"

export function ManageTablesModal({ isOpen, onClose, currentCount = 10, occupiedCount = 0, onCountUpdated }) {
  const { t } = useTranslation()
  const { success: toastSuccess, error: toastError } = useToast()
  const [count, setCount] = useState(currentCount || 10)
  const [isSaving, setIsSaving] = useState(false)

  if (!isOpen) return null

  const handleIncrement = () => setCount((prev) => Math.min(prev + 1, 100))
  const handleDecrement = () => setCount((prev) => Math.max(prev - 1, 1))

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const cachedShop = getCachedData("/shop") || {}
      const updatedShop = { ...cachedShop, table_count: count }
      
      await call("/shop", {
        method: "PUT",
        body: JSON.stringify(updatedShop)
      }).catch((e) => console.warn("Shop update warning:", e))

      setCachedData("/shop", updatedShop)

      const res = await call("/restaurant/tables/setup", {
        method: "POST",
        body: JSON.stringify({ table_count: count })
      }).catch((e) => console.warn("Tables setup error:", e))

      toastSuccess(t("tables.countUpdated", `Restaurant tables updated to ${count}`))
      if (onCountUpdated) {
        onCountUpdated(count, res?.tables)
      }
      onClose()
    } catch (err) {
      console.error("Failed to update tables:", err)
      toastError("Failed to update tables")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="table-modal-backdrop" onClick={onClose} style={{ zIndex: 10001 }}>
      <div className="table-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px" }}>
        <div className="table-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "#f0f9ff", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <SlidersHorizontal size={18} />
            </div>
            <div>
              <h3 className="table-modal-title">
                {t("tables.manageTitle", "Manage Tables")}
              </h3>
              <p style={{ fontSize: "0.78rem", color: "#64748b", margin: 0 }}>
                {t("tables.manageSubtitle", "Add or remove tables in your restaurant")}
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

        <div className="table-modal-body" style={{ textAlign: "center", padding: "1.25rem" }}>
          {occupiedCount > 0 && count < currentCount && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#fffbeb", border: "1px solid #fde68a", color: "#b45309", padding: "0.6rem 0.85rem", borderRadius: "10px", marginBottom: "1rem", fontSize: "0.78rem", textAlign: "left" }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{t("tables.occupiedWarning", `You currently have ${occupiedCount} occupied tables. Occupied tables will not be deleted.`)}</span>
            </div>
          )}

          <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#475569" }}>
            {t("tables.totalTables", "Total Restaurant Tables")}
          </div>

          <div className="table-count-stepper">
            <button
              type="button"
              className="stepper-btn"
              onClick={handleDecrement}
              disabled={count <= 1 || isSaving}
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
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="table-modal-footer">
          <button
            type="button"
            className="menu-secondary-btn"
            onClick={onClose}
            disabled={isSaving}
            style={{ padding: "0.6rem 1rem", borderRadius: "10px" }}
          >
            {t("common.cancel", "Cancel")}
          </button>
          <button
            type="button"
            className="table-btn-print"
            onClick={handleSave}
            disabled={isSaving}
            style={{ padding: "0.6rem 1.35rem", borderRadius: "10px" }}
          >
            <Check size={16} />
            <span>{isSaving ? t("common.saving", "Saving...") : t("common.saveChanges", "Save Changes")}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
