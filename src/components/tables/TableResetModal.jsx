import { AlertTriangle, X } from "lucide-react"
import { useTranslation } from "react-i18next"

export function TableResetModal({ isOpen, onClose, onConfirm, tableName = "Table" }) {
  const { t } = useTranslation()

  if (!isOpen) return null

  return (
    <div className="table-modal-backdrop" onClick={onClose}>
      <div className="table-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px" }}>
        <div className="table-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={18} />
            </div>
            <h3 className="table-modal-title" style={{ fontSize: "1.05rem" }}>
              {t("tables.resetModalTitle", "Reset Current Bill?")}
            </h3>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="table-modal-body">
          <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.88rem", color: "#334155", lineHeight: "1.4" }}>
            {t("tables.resetModalDesc", { tableName, defaultValue: `Are you sure you want to remove all currently added items from ${tableName}?` })}
          </p>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.65rem 0.85rem", fontSize: "0.78rem", color: "#64748b" }}>
            ℹ️ {t("tables.resetModalNote", "This only clears the active unsaved cart for this table. No bills from Bill History will be deleted.")}
          </div>
        </div>

        <div className="table-modal-footer">
          <button
            type="button"
            className="menu-secondary-btn"
            onClick={onClose}
            style={{ padding: "0.55rem 1rem", fontSize: "0.85rem", borderRadius: "8px" }}
          >
            {t("common.cancel", "Cancel")}
          </button>
          <button
            type="button"
            className="table-btn-reset"
            onClick={() => {
              onConfirm()
              onClose()
            }}
            style={{ padding: "0.55rem 1rem", fontSize: "0.85rem", borderRadius: "8px" }}
          >
            {t("tables.resetConfirmBtn", "Yes, Reset Table")}
          </button>
        </div>
      </div>
    </div>
  )
}
