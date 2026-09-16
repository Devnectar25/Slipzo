import { useState, useEffect } from "react"
import {
  Utensils,
  Plus,
  Search,
  Edit2,
  Trash2,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  X,
  Layers,
  Sparkles,
  ShoppingBag,
  RefreshCw
} from "lucide-react"
import { call, money, getCachedData, getStoredMenuItems, saveStoredMenuItems, getCurrentUserKey } from "../lib/utils"
import { useToast } from "./common/Toast"
import { ButtonLoader, Spinner } from "./common/Skeleton"

export function Menu({ setView, requireAuth, user }) {
  const userKey = getCurrentUserKey(user)
  const cachedItems = getCachedData("/menu")
  const [items, setItems] = useState(() => {
    if (Array.isArray(cachedItems) && cachedItems.length > 0) return cachedItems
    const stored = getStoredMenuItems(user)
    return stored.length > 0 ? stored : []
  })
  const [loading, setLoading] = useState(() => !cachedItems && items.length === 0)
  const [search, setSearch] = useState("")

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  // Delete modal state
  const [deletingId, setDeletingId] = useState(null)

  const { success: toastSuccess, error: toastError } = useToast()

  const loadItems = async () => {
    try {
      setLoading(true)
      const data = await call("/menu").catch(() => null)
      if (Array.isArray(data) && data.length > 0) {
        setItems(data)
        saveStoredMenuItems(data, user)
      } else {
        const local = getStoredMenuItems(user)
        if (local.length > 0) {
          setItems(local)
        }
      }
    } catch (err) {
      console.warn("Using offline shop menu items:", err)
      const local = getStoredMenuItems(user)
      if (local.length > 0) {
        setItems(local)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadItems()
    }
    const handleMenuUpdate = (e) => {
      const activeKey = getCurrentUserKey(user)
      if (!e?.detail?.userKey || e.detail.userKey === activeKey) {
        const stored = getStoredMenuItems(user)
        if (stored && stored.length > 0) {
          setItems(stored)
        }
      }
    }
    window.addEventListener("slipzo-menu-update", handleMenuUpdate)
    return () => window.removeEventListener("slipzo-menu-update", handleMenuUpdate)
  }, [user, userKey])

  const handleOpenAddModal = () => {
    setEditingItem(null)
    setName("")
    setPrice("")
    setFormError("")
    setShowModal(true)
  }

  const handleOpenEditModal = (item) => {
    setEditingItem(item)
    setName(item.name || "")
    setPrice(item.price !== undefined ? String(item.price) : "")
    setFormError("")
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    setFormError("")

    const cleanName = name.trim()
    const numPrice = parseFloat(price)

    if (!cleanName) {
      setFormError("Item name is required.")
      return
    }

    if (cleanName.length > 100) {
      setFormError("Item name cannot exceed 100 characters.")
      return
    }

    if (price === "" || isNaN(numPrice) || numPrice < 0) {
      setFormError("Please enter a valid non-negative price.")
      return
    }

    setSubmitting(true)
    try {
      if (editingItem) {
        // Update existing item
        const updated = await call(`/menu/${editingItem.id}`, {
          method: "PUT",
          body: JSON.stringify({ name: cleanName, price: numPrice })
        }).catch(() => ({ id: editingItem.id, name: cleanName, price: numPrice }))

        setItems((prev) => {
          const next = prev.map((it) => (it.id === editingItem.id ? updated : it))
          saveStoredMenuItems(next, user)
          return next
        })
        toastSuccess(`Updated "${cleanName}"`)
      } else {
        // Create new item
        let created = await call("/menu", {
          method: "POST",
          body: JSON.stringify({ name: cleanName, price: numPrice })
        }).catch((err) => {
          console.warn("Backend API unavailable, saving item locally:", err.message)
          return {
            id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: cleanName,
            price: numPrice,
            created_at: new Date().toISOString()
          }
        })
        setItems((prev) => {
          const next = [created, ...prev]
          saveStoredMenuItems(next, user)
          return next
        })
        toastSuccess(`Added "${cleanName}" to Shop Menu`)
      }
      setShowModal(false)
    } catch (err) {
      console.error("Failed to save menu item:", err)
      setFormError(err.message || "Failed to save menu item.")
      toastError(err.message || "Failed to save menu item.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      setDeletingId(id)
      await call(`/menu/${id}`, { method: "DELETE" }).catch(() => null)
      setItems((prev) => {
        const next = prev.filter((it) => it.id !== id)
        saveStoredMenuItems(next, user)
        return next
      })
      toastSuccess("Menu item deleted")
    } catch (err) {
      setItems((prev) => {
        const next = prev.filter((it) => it.id !== id)
        saveStoredMenuItems(next, user)
        return next
      })
      toastSuccess("Menu item deleted")
    } finally {
      setDeletingId(null)
    }
  }

  const safeItems = Array.isArray(items) ? items : []
  const filteredItems = safeItems.filter((it) =>
    (it.name || "").toLowerCase().includes(search.trim().toLowerCase())
  )

  return (
    <div className="page menu-page fade-in">
      {/* Page Header */}
      <div className="page-intro menu-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
        <div style={{ flex: 1, minWidth: "260px" }}>
          <p className="eyebrow accent" style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "11px", fontWeight: "700", letterSpacing: "1.5px", textTransform: "uppercase", color: "#0ea5e9", margin: "0 0 0.35rem 0" }}>
            <Utensils size={14} /> SHOP MENU
          </p>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0f172a", margin: "0 0 0.35rem 0", lineHeight: 1.25 }}>
            Menu & Items
          </h2>
          <p className="subtle" style={{ fontSize: "0.875rem", color: "#64748b", margin: 0, lineHeight: 1.45, maxWidth: "560px" }}>
            Manage products and services sold by your shop for fast billing
          </p>
        </div>
        <button className="primary-button" onClick={handleOpenAddModal} style={{ gap: "0.5rem", whiteSpace: "nowrap", flexShrink: 0, alignSelf: "flex-start" }}>
          <Plus size={18} /> Add New Item
        </button>
      </div>

      {/* Stats Cards Row */}
      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginTop: "1rem", marginBottom: "1.25rem" }}>
        <div className="stat-card" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "0.95rem 1.15rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <div className="stat-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="stat-label" style={{ fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", color: "#64748b", letterSpacing: "0.05em" }}>Total Saved Items</span>
            <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Utensils size={15} style={{ color: "#0284c7" }} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: "1.4rem", fontWeight: "800", color: "#0f172a", marginTop: "0.1rem", marginBottom: "0.1rem" }}>{items.length}</div>
          <div className="stat-footer subtle" style={{ fontSize: "0.78rem", color: "#64748b" }}>Items ready for quick billing</div>
        </div>

        <div className="stat-card" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "0.95rem 1.15rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <div className="stat-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="stat-label" style={{ fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", color: "#64748b", letterSpacing: "0.05em" }}>Average Item Price</span>
            <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <DollarSign size={15} style={{ color: "#0284c7" }} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: "1.4rem", fontWeight: "800", color: "#0ea5e9", marginTop: "0.1rem", marginBottom: "0.1rem" }}>
            {items.length > 0
              ? money(items.reduce((acc, i) => acc + (Number(i.price) || 0), 0) / items.length)
              : money(0)}
          </div>
          <div className="stat-footer subtle" style={{ fontSize: "0.78rem", color: "#64748b" }}>Across active shop menu</div>
        </div>

        <div className="stat-card" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "0.95rem 1.15rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <div className="stat-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="stat-label" style={{ fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", color: "#64748b", letterSpacing: "0.05em" }}>Shop Account</span>
            <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={15} style={{ color: "#0284c7" }} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: "1.15rem", fontWeight: "700", color: "#0f172a", marginTop: "0.1rem", marginBottom: "0.1rem", wordBreak: "break-word" }}>
            {user?.name || "Authenticated Shop"}
          </div>
          <div className="stat-footer subtle" style={{ fontSize: "0.78rem", color: "#64748b" }}>User-isolated shop items</div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="filter-bar" style={{ marginBottom: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <div className="search-box flex-1" style={{ minWidth: "240px", position: "relative" }}>
          <Search size={16} className="search-icon" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
          <input
            type="text"
            placeholder="Search saved items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
            style={{ paddingLeft: "36px", width: "100%" }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button className="ghost-button" onClick={loadItems} title="Refresh items">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
          <Spinner />
          <p style={{ color: "#64748b", marginTop: "1rem" }}>Loading your shop menu...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        /* Empty State */
        <div
          className="empty-state-card"
          style={{
            background: "#ffffff",
            border: "1px dashed #cbd5e1",
            borderRadius: "16px",
            padding: "3.5rem 1.5rem",
            textAlign: "center",
            maxWidth: "520px",
            margin: "2rem auto"
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "#e0f2fe",
              color: "#0284c7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem"
            }}
          >
            <Utensils size={28} />
          </div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#0f172a", marginBottom: "0.5rem" }}>
            {search ? "No matching items found" : "No menu items yet"}
          </h3>
          <p style={{ color: "#64748b", fontSize: "0.9rem", lineHeight: "1.5", marginBottom: "1.5rem" }}>
            {search
              ? `No items found matching "${search}". Try clearing your search filter.`
              : "Add your shop's commonly sold items to create bills faster without typing names and prices manually."}
          </p>
          {search ? (
            <button className="secondary-button" onClick={() => setSearch("")}>
              Clear Search Filter
            </button>
          ) : (
            <button className="primary-button" onClick={handleOpenAddModal} style={{ margin: "0 auto" }}>
              <Plus size={16} /> Add Your First Item
            </button>
          )}
        </div>
      ) : (
        /* Items Grid / Table */
        <div className="card-table-wrapper" style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.78rem", fontWeight: "700", textTransform: "uppercase", color: "#475569", letterSpacing: "0.05em" }}>
                    Item Name
                  </th>
                  <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.78rem", fontWeight: "700", textTransform: "uppercase", color: "#475569", letterSpacing: "0.05em", textAlign: "right" }}>
                    Default Price (₹)
                  </th>
                  <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.78rem", fontWeight: "700", textTransform: "uppercase", color: "#475569", letterSpacing: "0.05em", textAlign: "right", width: "140px" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s ease" }} className="table-row-hover">
                    <td style={{ padding: "1rem 1.25rem" }}>
                      <div style={{ fontWeight: "600", color: "#0f172a", fontSize: "0.95rem" }}>
                        {item.name}
                      </div>
                    </td>
                    <td style={{ padding: "1rem 1.25rem", textAlign: "right", fontWeight: "700", color: "#0ea5e9", fontSize: "1rem" }}>
                      {money(item.price)}
                    </td>
                    <td style={{ padding: "1rem 1.25rem", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                        <button
                          className="icon-button small"
                          title="Edit item"
                          onClick={() => handleOpenEditModal(item)}
                          style={{ color: "#0284c7", background: "#f0f9ff", border: "1px solid #bae6fd" }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="icon-button small"
                          title="Delete item"
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          style={{ color: "#ef4444", background: "#fef2f2", border: "1px solid #fecaca" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Item Modal */}
      {showModal && (
        <div
          className="modal-backdrop fade-in"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem"
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="modal-card scale-in"
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "460px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#f8fafc"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#e0f2fe", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Utensils size={18} />
                </div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>
                  {editingItem ? "Edit Shop Item" : "Add New Shop Item"}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} style={{ padding: "1.5rem" }}>
              {formError && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}
                >
                  <AlertCircle size={16} flexShrink={0} />
                  <span>{formError}</span>
                </div>
              )}

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#334155", marginBottom: "0.4rem" }}>
                  Item Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tea, Coffee, Sandwich, Cold Drink"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.7rem 0.9rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.95rem",
                    outline: "none"
                  }}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#334155", marginBottom: "0.4rem" }}>
                  Price (₹) *
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontWeight: "600", color: "#64748b" }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.7rem 0.9rem 0.7rem 28px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.95rem",
                      outline: "none"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={submitting}
                  style={{ minWidth: "120px" }}
                >
                  {submitting ? <ButtonLoader text="Saving..." /> : editingItem ? "Update Item" : "Save Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .menu-page {
            padding: 1rem 0.85rem 6.5rem 0.85rem !important;
            max-width: 100vw !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
          }

          .menu-page .page-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.85rem !important;
            margin-bottom: 1.25rem !important;
            width: 100% !important;
          }

          .menu-page .page-header > div {
            width: 100% !important;
          }

          .menu-page .page-header h2 {
            font-size: 1.35rem !important;
            line-height: 1.3 !important;
            margin-top: 0.2rem !important;
          }

          .menu-page .page-header p.subtle {
            font-size: 0.85rem !important;
            line-height: 1.4 !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            white-space: normal !important;
            margin-top: 0.35rem !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          .menu-page .page-header .primary-button {
            width: 100% !important;
            justify-content: center !important;
            padding: 0.7rem 1rem !important;
            box-sizing: border-box !important;
          }

          .menu-page .stats-grid {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 0.85rem !important;
            width: 100% !important;
            margin-top: 1rem !important;
            margin-bottom: 1.25rem !important;
          }

          .menu-page .stat-card {
            width: 100% !important;
            box-sizing: border-box !important;
            padding: 1rem 1.15rem !important;
            border-radius: 14px !important;
          }

          .menu-page .stat-value {
            word-break: break-word !important;
          }

          .menu-page .filter-bar {
            width: 100% !important;
            box-sizing: border-box !important;
            margin-bottom: 1.25rem !important;
            gap: 0.5rem !important;
          }

          .menu-page .search-box {
            min-width: 0 !important;
            width: 100% !important;
            flex: 1 1 auto !important;
          }

          .menu-page .search-input {
            width: 100% !important;
            box-sizing: border-box !important;
          }

          .menu-page .card-table-wrapper {
            width: 100% !important;
            box-sizing: border-box !important;
            border-radius: 12px !important;
            overflow-x: hidden !important;
          }

          .menu-page .data-table {
            width: 100% !important;
            table-layout: fixed !important;
          }

          .menu-page .data-table th,
          .menu-page .data-table td {
            padding: 0.75rem 0.5rem !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            white-space: normal !important;
          }

          .menu-page .data-table th {
            font-size: 0.72rem !important;
            letter-spacing: 0 !important;
          }

          .menu-page .data-table th:nth-child(1),
          .menu-page .data-table td:nth-child(1) {
            width: 44% !important;
          }

          .menu-page .data-table th:nth-child(2),
          .menu-page .data-table td:nth-child(2) {
            width: 32% !important;
            font-size: 0.88rem !important;
          }

          .menu-page .data-table th:nth-child(3),
          .menu-page .data-table td:nth-child(3) {
            width: 24% !important;
          }

          .menu-page .data-table td:nth-child(3) > div {
            justify-content: flex-end !important;
            gap: 0.25rem !important;
          }

          .menu-page .data-table .icon-button.small {
            padding: 5px !important;
            width: 28px !important;
            height: 28px !important;
          }
        }
      `}</style>
    </div>
  )
}
