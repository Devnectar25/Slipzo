import { Utensils, ShoppingBag, ArrowRight } from "lucide-react"
import { money } from "../../lib/utils"
import { useTranslation } from "react-i18next"
import { useDbTranslation } from "../../lib/translator"

export function TableCard({ table, onSelectTable }) {
  const { t } = useTranslation()
  const { formatNum } = useDbTranslation()

  let currentItems = []
  if (Array.isArray(table.current_items)) {
    currentItems = table.current_items
  } else if (typeof table.current_items === "string") {
    try {
      const parsed = JSON.parse(table.current_items)
      if (Array.isArray(parsed)) currentItems = parsed
    } catch (_) {}
  }

  const isOccupied = table.status === "OCCUPIED" || currentItems.length > 0
  const itemsCount = currentItems.reduce((sum, it) => {
    const q = Number(it.quantity !== undefined ? it.quantity : (it.qty !== undefined ? it.qty : 1))
    return sum + (isNaN(q) || q <= 0 ? 1 : q)
  }, 0)

  const computedTotal = currentItems.reduce((sum, it) => {
    const q = Number(it.quantity !== undefined ? it.quantity : (it.qty !== undefined ? it.qty : 1)) || 1
    const r = Number(it.rate !== undefined ? it.rate : (it.price !== undefined ? it.price : 0)) || 0
    return sum + (q * r)
  }, 0)

  const totalAmount = Number(table.total_amount) > 0 ? Number(table.total_amount) : computedTotal

  return (
    <div
      className={`table-card ${isOccupied ? "occupied" : "available"}`}
      onClick={() => onSelectTable(table)}
      data-testid={`table-card-${table.table_number}`}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelectTable(table)
        }
      }}
    >
      <div className="table-card-top-bar" />

      <div className="table-card-header">
        <div className="table-number-title">
          <Utensils size={18} style={{ color: isOccupied ? "#0284c7" : "#64748b" }} />
          <span>{table.name || `Table ${table.table_number}`}</span>
        </div>

        <span className={`table-status-badge ${isOccupied ? "badge-occupied" : "badge-available"}`}>
          <span className="status-dot" />
          {isOccupied ? t("tables.occupied", "Occupied") : t("tables.available", "Available")}
        </span>
      </div>

      <div className="table-card-body">
        {isOccupied ? (
          <div className="table-occupied-info">
            <div className="table-items-count">
              <ShoppingBag size={14} />
              <span>
                {formatNum(itemsCount)} {itemsCount === 1 ? t("history.item", "item") : t("history.items", "items")}
              </span>
            </div>
            <div className="table-total-amount">
              {money(totalAmount)}
            </div>
          </div>
        ) : (
          <div className="table-available-hint">
            <span>{t("tables.noActiveBill", "Ready for guests")}</span>
          </div>
        )}
      </div>

      <div className="table-card-footer">
        <button
          type="button"
          className="table-action-btn"
          onClick={(e) => {
            e.stopPropagation()
            onSelectTable(table)
          }}
        >
          <span>{isOccupied ? t("tables.viewOrder", "View Bill") : t("tables.openTable", "Open Table")}</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}
