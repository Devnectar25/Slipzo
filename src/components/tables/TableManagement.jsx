import { useState, useEffect, useMemo } from "react"
import {
  Utensils,
  Search,
  Plus,
  SlidersHorizontal,
  Layers,
  CheckCircle2,
  Clock,
  DollarSign,
  X,
  Sparkles
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useDbTranslation } from "../../lib/translator"
import {
  call,
  money,
  getCachedData,
  setCachedData,
  getStoredTables,
  saveStoredTables
} from "../../lib/utils"
import { TableCard } from "./TableCard"
import { TableBilling } from "./TableBilling"
import { ManageTablesModal } from "./ManageTablesModal"
import { TableSetupModal } from "./TableSetupModal"
import { CardSkeleton } from "../common/Skeleton"
import { useToast } from "../common/Toast"
import "../../styles/TableManagement.css"

export function TableManagement({
  user,
  setView,
  setSelectedBillId,
  requireAuth,
  shop: initialShop
}) {
  const { t } = useTranslation()
  const { formatNum } = useDbTranslation()
  const { error: toastError } = useToast()

  const [shop, setShop] = useState(() => initialShop || getCachedData("/shop") || {})
  const [tables, setTables] = useState(() => {
    const stored = getStoredTables(user)
    if (Array.isArray(stored) && stored.length > 0) return stored
    const count = Number(shop?.table_count || 10)
    return Array.from({ length: count }, (_, i) => ({
      id: `table-${i + 1}`,
      table_number: i + 1,
      name: `Table ${i + 1}`,
      status: "AVAILABLE",
      current_items: [],
      total_amount: 0
    }))
  })

  const [selectedTable, setSelectedTable] = useState(null)
  const [activeFilter, setActiveFilter] = useState("all") // "all" | "available" | "occupied"
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [isManageModalOpen, setIsManageModalOpen] = useState(false)
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false)

  // Load tables from backend
  const loadTables = async () => {
    try {
      const data = await call("/restaurant/tables")
      if (Array.isArray(data) && data.length > 0) {
        setTables(data)
        saveStoredTables(user, data)
      }
    } catch (err) {
      console.warn("Could not fetch remote tables, using local state:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTables()

    const handleShopUpdate = (e) => {
      if (e?.detail) setShop(e.detail)
    }
    window.addEventListener("slipzo_shop_updated", handleShopUpdate)
    return () => window.removeEventListener("slipzo_shop_updated", handleShopUpdate)
  }, [user])

  // Update single table state (items, total, status)
  const handleUpdateTableState = (tableIdOrNum, updates) => {
    setTables((prev) => {
      const updatedList = prev.map((t) => {
        const matches = String(t.id) === String(tableIdOrNum) || String(t.table_number) === String(tableIdOrNum)
        if (matches) {
          return {
            ...t,
            ...updates,
            status: updates.status || ((Array.isArray(updates.current_items) && updates.current_items.length > 0) ? "OCCUPIED" : "AVAILABLE")
          }
        }
        return t
      })
      saveStoredTables(user, updatedList)
      return updatedList
    })

    // Debounced or direct backend update
    call(`/restaurant/tables/${tableIdOrNum}`, {
      method: "PUT",
      body: JSON.stringify(updates)
    }).catch((e) => console.warn("Backend table update warning:", e))
  }

  // Metrics Calculations
  const metrics = useMemo(() => {
    const totalCount = tables.length
    const occupied = tables.filter((t) => t.status === "OCCUPIED" || (Array.isArray(t.current_items) && t.current_items.length > 0))
    const occupiedCount = occupied.length
    const availableCount = Math.max(0, totalCount - occupiedCount)
    const activeTotalRevenue = occupied.reduce((sum, t) => sum + (Number(t.total_amount) || 0), 0)

    return {
      totalCount,
      occupiedCount,
      availableCount,
      activeTotalRevenue
    }
  }, [tables])

  // Filtered Tables
  const filteredTables = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tables.filter((t) => {
      const isOcc = t.status === "OCCUPIED" || (Array.isArray(t.current_items) && t.current_items.length > 0)
      
      if (activeFilter === "available" && isOcc) return false
      if (activeFilter === "occupied" && !isOcc) return false

      if (q) {
        const matchesName = (t.name || "").toLowerCase().includes(q)
        const matchesNum = String(t.table_number).includes(q)
        return matchesName || matchesNum
      }

      return true
    })
  }, [tables, activeFilter, search])

  // If a table is opened for billing, show the TableBilling workspace
  if (selectedTable) {
    const currentTableData = tables.find(
      (t) => String(t.id) === String(selectedTable.id) || String(t.table_number) === String(selectedTable.table_number)
    ) || selectedTable

    return (
      <TableBilling
        table={currentTableData}
        user={user}
        shop={shop}
        onBack={() => {
          setSelectedTable(null)
          loadTables()
        }}
        onUpdateTableState={handleUpdateTableState}
        setView={setView}
        setSelectedBillId={setSelectedBillId}
        requireAuth={requireAuth}
      />
    )
  }

  return (
    <div className="tables-page-root fade-in">
      {/* 1. Hero Section Banner */}
      <section className="tables-hero-banner">
        <div className="tables-hero-grid">
          <div className="tables-hero-left">
            <span className="tables-eyebrow">
              <Utensils size={13} /> {t("tables.eyebrow", "RESTAURANT BILLING")}
            </span>
            <h1 className="tables-hero-heading">
              {t("tables.heroTitlePrefix", "Tables that keep ")}
              <span className="tables-hero-accent">{t("tables.heroTitleAccent", "service fast.")}</span>
            </h1>
            <p className="tables-hero-subtext">
              {t("tables.heroSubtitle", "Select an open table to start adding items, manage live orders, and generate thermal receipts.")}
            </p>
          </div>

          <div className="tables-hero-actions">
            <button
              type="button"
              className="tables-manage-btn"
              onClick={() => setIsManageModalOpen(true)}
            >
              <SlidersHorizontal size={16} />
              <span>{t("tables.manageTables", "Manage Tables")}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Live Metrics Strip */}
      <section className="tables-metrics-strip">
        <div className="tables-metric-card">
          <div className="metric-icon-box metric-icon-blue">
            <Layers size={20} />
          </div>
          <div className="metric-content">
            <div className="metric-label">{t("tables.metricTotal", "Total Tables")}</div>
            <div className="metric-value">{formatNum(metrics.totalCount)}</div>
          </div>
        </div>

        <div className="tables-metric-card">
          <div className="metric-icon-box metric-icon-available">
            <CheckCircle2 size={20} />
          </div>
          <div className="metric-content">
            <div className="metric-label">{t("tables.metricAvailable", "Available")}</div>
            <div className="metric-value">{formatNum(metrics.availableCount)}</div>
          </div>
        </div>

        <div className="tables-metric-card">
          <div className="metric-icon-box metric-icon-occupied">
            <Clock size={20} />
          </div>
          <div className="metric-content">
            <div className="metric-label">{t("tables.metricOccupied", "Occupied")}</div>
            <div className="metric-value">{formatNum(metrics.occupiedCount)}</div>
          </div>
        </div>

        <div className="tables-metric-card">
          <div className="metric-icon-box metric-icon-revenue">
            <DollarSign size={20} />
          </div>
          <div className="metric-content">
            <div className="metric-label">{t("tables.metricActiveOrders", "Active Orders")}</div>
            <div className="metric-value">{money(metrics.activeTotalRevenue)}</div>
          </div>
        </div>
      </section>

      {/* 3. Filter & Search Control Bar */}
      <section className="tables-control-bar">
        <div className="tables-filter-pills">
          <button
            type="button"
            className={`table-filter-pill ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            <span>{t("tables.filterAll", "All Tables")}</span>
            <span className="pill-count">{metrics.totalCount}</span>
          </button>

          <button
            type="button"
            className={`table-filter-pill ${activeFilter === "available" ? "active" : ""}`}
            onClick={() => setActiveFilter("available")}
          >
            <span>{t("tables.filterAvailable", "Available")}</span>
            <span className="pill-count">{metrics.availableCount}</span>
          </button>

          <button
            type="button"
            className={`table-filter-pill ${activeFilter === "occupied" ? "active" : ""}`}
            onClick={() => setActiveFilter("occupied")}
          >
            <span>{t("tables.filterOccupied", "Occupied")}</span>
            <span className="pill-count">{metrics.occupiedCount}</span>
          </button>
        </div>

        <div className="tables-search-box">
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder={t("tables.searchPlaceholder", "Search table (e.g. 4, Table 5)...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </section>

      {/* 4. Tables Grid */}
      {loading && tables.length === 0 ? (
        <CardSkeleton count={8} />
      ) : filteredTables.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 1rem", background: "#ffffff", borderRadius: "16px", border: "1.5px solid #e2e8f0", color: "#64748b" }}>
          <Utensils size={36} style={{ margin: "0 auto 0.75rem", color: "#cbd5e1" }} />
          <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.1rem" }}>{t("tables.noMatchingTables", "No tables match your filter")}</h3>
          <p style={{ margin: "0.5rem 0 1rem", fontSize: "0.85rem" }}>{t("tables.tryAdjustingFilters", "Try adjusting your search query or filter tab.")}</p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setSearch("")
              setActiveFilter("all")
            }}
          >
            {t("tables.clearFilters", "Clear Filters")}
          </button>
        </div>
      ) : (
        <div className="tables-grid">
          {filteredTables.map((tbl) => (
            <TableCard
              key={tbl.id || tbl.table_number}
              table={tbl}
              onSelectTable={(selected) => setSelectedTable(selected)}
            />
          ))}
        </div>
      )}

      {/* Manage Tables Modal */}
      <ManageTablesModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        currentCount={tables.length}
        occupiedCount={metrics.occupiedCount}
        onCountUpdated={(newCount, updatedTables) => {
          if (Array.isArray(updatedTables)) {
            setTables(updatedTables)
            saveStoredTables(user, updatedTables)
          } else {
            loadTables()
          }
        }}
      />

      {/* Initial Table Setup Modal (if manually triggered or configured) */}
      <TableSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        currentCount={tables.length}
        user={user}
        onSetupComplete={(newCount, updatedTables) => {
          if (Array.isArray(updatedTables)) {
            setTables(updatedTables)
            saveStoredTables(user, updatedTables)
          } else {
            loadTables()
          }
        }}
      />
    </div>
  )
}
