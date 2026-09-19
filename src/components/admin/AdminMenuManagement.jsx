import { useState, useEffect, useMemo } from "react"
import {
  Utensils,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter
} from "lucide-react"
import { call, money } from "../../lib/utils"
import Swal from "sweetalert2"

const DEFAULT_CATEGORIES = [
  "Bakery",
  "Beverages",
  "Breakfast",
  "Desserts",
  "Fast Food",
  "Main Course",
  "Snacks",
  "South Indian",
  "General"
]

export function AdminMenuManagement({ getAdminHeaders }) {
  const [loading, setLoading] = useState(true)
  const [menuItems, setMenuItems] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all") // "all" | "active" | "inactive"

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formName, setFormName] = useState("")
  const [formCategory, setFormCategory] = useState("Beverages")
  const [formPrice, setFormPrice] = useState("")
  const [formImageUrl, setFormImageUrl] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formIsAvailable, setFormIsAvailable] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  const loadMasterMenu = async () => {
    setLoading(true)
    try {
      const headers = getAdminHeaders ? getAdminHeaders() : {}
      const res = await call("/admin/menu?limit=200", { headers })
      if (res && Array.isArray(res.items)) {
        setMenuItems(res.items)
      } else if (Array.isArray(res)) {
        setMenuItems(res)
      }
    } catch (err) {
      console.error("Failed to load admin menu items:", err)
      Swal.fire("Error", err.detail || err.message || "Failed to load master menu catalog", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMasterMenu()
  }, [])

  // Categories list
  const allCategories = useMemo(() => {
    const set = new Set(DEFAULT_CATEGORIES)
    menuItems.forEach((m) => {
      if (m.category) set.add(m.category)
    })
    return ["all", ...Array.from(set)]
  }, [menuItems])

  // Filtered master items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const q = searchQuery.trim().toLowerCase()
      const matchesQuery =
        !q ||
        (item.name || "").toLowerCase().includes(q) ||
        (item.category || "").toLowerCase().includes(q) ||
        (item.description || "").toLowerCase().includes(q)

      const matchesCategory =
        categoryFilter === "all" ||
        (item.category || "").toLowerCase() === categoryFilter.toLowerCase()

      const isActive = item.is_available !== undefined ? Boolean(item.is_available) : true
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && isActive) ||
        (statusFilter === "inactive" && !isActive)

      return matchesQuery && matchesCategory && matchesStatus
    })
  }, [menuItems, searchQuery, categoryFilter, statusFilter])

  // Pagination calculation
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredItems.slice(start, start + pageSize)
  }, [filteredItems, currentPage, pageSize])

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingItem(null)
    setFormName("")
    setFormCategory("Beverages")
    setFormPrice("")
    setFormImageUrl("")
    setFormDescription("")
    setFormIsAvailable(true)
    setFormError("")
    setShowModal(true)
  }

  // Open Edit Modal
  const handleOpenEditModal = (item) => {
    setEditingItem(item)
    setFormName(item.name || "")
    setFormCategory(item.category || "General")
    setFormPrice(item.price !== undefined ? String(item.price) : "")
    setFormImageUrl(item.image_url || "")
    setFormDescription(item.description || "")
    setFormIsAvailable(item.is_available !== undefined ? Boolean(item.is_available) : true)
    setFormError("")
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingItem(null)
  }

  // Save (Create or Update)
  const handleSaveItem = async (e) => {
    e?.preventDefault()
    setFormError("")

    const cleanName = formName.trim()
    const numPrice = parseFloat(formPrice)

    if (!cleanName) {
      setFormError("Item name is required.")
      return
    }

    if (isNaN(numPrice) || numPrice < 0) {
      setFormError("Base price must be a non-negative number.")
      return
    }

    setSubmitting(true)
    const headers = getAdminHeaders ? getAdminHeaders() : {}

    const payload = {
      name: cleanName,
      category: formCategory.trim() || "General",
      price: numPrice,
      image_url: formImageUrl.trim(),
      description: formDescription.trim(),
      is_available: formIsAvailable
    }

    try {
      if (editingItem) {
        // Update
        const res = await call(`/admin/menu/${editingItem.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(payload)
        })

        setMenuItems((prev) =>
          prev.map((it) => (it.id === editingItem.id ? { ...it, ...(res.item || payload) } : it))
        )
        Swal.fire({
          title: "Updated!",
          text: `Master item "${cleanName}" updated successfully.`,
          icon: "success",
          confirmButtonColor: "#0284c7"
        })
      } else {
        // Create
        const res = await call("/admin/menu", {
          method: "POST",
          headers,
          body: JSON.stringify(payload)
        })

        const created = res.item || res
        setMenuItems((prev) => [created, ...prev])
        Swal.fire({
          title: "Created!",
          text: `Master item "${cleanName}" added to catalog.`,
          icon: "success",
          confirmButtonColor: "#0284c7"
        })
      }

      handleCloseModal()
    } catch (err) {
      console.error("Failed to save menu item:", err)
      setFormError(err.detail || err.message || "Failed to save item.")
    } finally {
      setSubmitting(false)
    }
  }

  // Toggle Active / Inactive status
  const handleToggleStatus = async (item) => {
    const currentStatus = item.is_available !== undefined ? Boolean(item.is_available) : true
    const newStatus = !currentStatus
    const headers = getAdminHeaders ? getAdminHeaders() : {}

    // Optimistic UI update
    setMenuItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, is_available: newStatus } : it))
    )

    try {
      await call(`/admin/menu/${item.id}/status`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ is_available: newStatus })
      })
    } catch (err) {
      // Revert on error
      setMenuItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, is_available: currentStatus } : it))
      )
      Swal.fire("Error", "Failed to update item status", "error")
    }
  }

  // Delete / Safe Deactivate
  const handleDeleteItem = async (item) => {
    const confirm = await Swal.fire({
      title: `Delete "${item.name}"?`,
      text: "If this item is assigned in active user menus, it will be safely deactivated instead of deleted to protect user billing records.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, Delete / Deactivate"
    })

    if (!confirm.isConfirmed) return

    const headers = getAdminHeaders ? getAdminHeaders() : {}
    try {
      const res = await call(`/admin/menu/${item.id}`, {
        method: "DELETE",
        headers
      })

      if (res?.softDeleted) {
        setMenuItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, is_available: false } : it))
        )
        Swal.fire({
          title: "Deactivated",
          text: res.detail || "Item was deactivated to protect existing user menu assignments.",
          icon: "info",
          confirmButtonColor: "#0284c7"
        })
      } else {
        setMenuItems((prev) => prev.filter((it) => it.id !== item.id))
        Swal.fire({
          title: "Deleted!",
          text: `"${item.name}" has been removed from the master catalog.`,
          icon: "success",
          confirmButtonColor: "#0284c7"
        })
      }
    } catch (err) {
      console.error("Failed to delete item:", err)
      Swal.fire("Error", err.detail || err.message || "Failed to delete item", "error")
    }
  }

  return (
    <div className="admin-section fade-in">
      {/* Top Banner / Actions Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.25rem"
        }}
      >
        <div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "800", color: "#0f172a", margin: 0 }}>
            Master Menu Catalog
          </h3>
          <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0.2rem 0 0 0" }}>
            Total {menuItems.length} master items available for shop users to add to their personal menus.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.65rem", alignItems: "center" }}>
          <button
            className="admin-refresh-btn"
            onClick={loadMasterMenu}
            disabled={loading}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
          </button>
          <button
            className="admin-btn admin-btn-primary"
            onClick={handleOpenCreateModal}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              background: "#0284c7",
              color: "#ffffff",
              padding: "0.55rem 1rem",
              borderRadius: "8px",
              fontWeight: "600",
              fontSize: "0.88rem",
              border: "none",
              cursor: "pointer"
            }}
          >
            <Plus size={16} /> Add Menu Item
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="admin-filter-bar" style={{ marginBottom: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1", minWidth: "220px" }}>
          <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search master catalog by item name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: "32px", width: "100%", boxSizing: "border-box" }}
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="admin-select-input"
          style={{ minWidth: "160px" }}
        >
          {allCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === "all" ? "All Categories" : cat}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="admin-select-input"
          style={{ minWidth: "140px" }}
        >
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Table Data */}
      <div className="admin-table-wrapper" style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", color: "#475569" }}>
                  Item
                </th>
                <th style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", color: "#475569" }}>
                  Category
                </th>
                <th style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", color: "#475569" }}>
                  Base Catalog Price
                </th>
                <th style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", color: "#475569", textAlign: "center" }}>
                  Status
                </th>
                <th style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", color: "#475569", textAlign: "center", width: "120px" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
                    Loading master menu items...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
                    No menu items found matching filters.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const isActive = item.is_available !== undefined ? Boolean(item.is_available) : true
                  return (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      {/* Image & Name */}
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              style={{
                                width: "42px",
                                height: "42px",
                                borderRadius: "8px",
                                objectFit: "cover",
                                border: "1px solid #e2e8f0",
                                flexShrink: 0
                              }}
                              onError={(e) => {
                                e.target.style.display = "none"
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "42px",
                                height: "42px",
                                borderRadius: "8px",
                                background: "#f0f9ff",
                                color: "#0284c7",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                              }}
                            >
                              <Utensils size={18} />
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "0.9rem" }}>
                              {item.name}
                            </div>
                            {item.description && (
                              <div style={{ fontSize: "0.75rem", color: "#64748b", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {item.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span
                          style={{
                            background: "#f1f5f9",
                            color: "#475569",
                            padding: "0.2rem 0.6rem",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            fontWeight: "600"
                          }}
                        >
                          {item.category || "General"}
                        </span>
                      </td>

                      {/* Base Price */}
                      <td style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "#0f172a" }}>
                        {money(item.price)}
                      </td>

                      {/* Status Toggle */}
                      <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            padding: "0.25rem 0.65rem",
                            borderRadius: "999px",
                            fontSize: "0.75rem",
                            fontWeight: "700",
                            border: "none",
                            cursor: "pointer",
                            background: isActive ? "#dcfce7" : "#f1f5f9",
                            color: isActive ? "#15803d" : "#64748b",
                            transition: "all 0.15s ease"
                          }}
                          title="Click to toggle status"
                        >
                          {isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {isActive ? "Active" : "Inactive"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                          <button
                            type="button"
                            className="admin-action-btn admin-action-btn-edit"
                            onClick={() => handleOpenEditModal(item)}
                            title="Edit master item"
                            style={{
                              width: "30px",
                              height: "30px",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "6px",
                              border: "1px solid #e2e8f0",
                              background: "#ffffff",
                              color: "#0284c7",
                              cursor: "pointer"
                            }}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            className="admin-action-btn admin-action-btn-delete"
                            onClick={() => handleDeleteItem(item)}
                            title="Delete / Deactivate"
                            style={{
                              width: "30px",
                              height: "30px",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "6px",
                              border: "1px solid #fee2e2",
                              background: "#ffffff",
                              color: "#ef4444",
                              cursor: "pointer"
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.75rem 1rem",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            flexWrap: "wrap",
            gap: "0.75rem"
          }}
        >
          <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
            Showing <strong>{filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> - <strong>{Math.min(currentPage * pageSize, filteredItems.length)}</strong> of <strong>{filteredItems.length}</strong> master items
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="admin-page-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.35rem 0.65rem",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                background: "#ffffff",
                cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                opacity: currentPage <= 1 ? 0.5 : 1
              }}
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <span style={{ fontSize: "0.82rem", color: "#334155" }}>
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="admin-page-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.35rem 0.65rem",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                background: "#ffffff",
                cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                opacity: currentPage >= totalPages ? 0.5 : 1
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================================
          ADMIN ADD / EDIT MASTER ITEM MODAL
          ==================================================================== */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(3px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem"
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
              border: "1px solid #e2e8f0",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1rem 1.25rem",
                borderBottom: "1px solid #f1f5f9"
              }}
            >
              <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "800", color: "#0f172a" }}>
                {editingItem ? "Edit Master Menu Item" : "Add Master Menu Item"}
              </h4>
              <button
                onClick={handleCloseModal}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveItem}>
              <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Item Name */}
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "700", color: "#334155", marginBottom: "0.35rem" }}>
                    Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Cold Coffee, Chocolate Brownie"
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.75rem",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "0.9rem",
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                {/* Category & Price Row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "700", color: "#334155", marginBottom: "0.35rem" }}>
                      Category *
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.6rem 0.75rem",
                        borderRadius: "8px",
                        border: "1.5px solid #cbd5e1",
                        fontSize: "0.9rem",
                        boxSizing: "border-box"
                      }}
                    >
                      {DEFAULT_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "700", color: "#334155", marginBottom: "0.35rem" }}>
                      Base Price (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      placeholder="e.g. 50"
                      style={{
                        width: "100%",
                        padding: "0.6rem 0.75rem",
                        borderRadius: "8px",
                        border: "1.5px solid #cbd5e1",
                        fontSize: "0.9rem",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                </div>

                {/* Image URL with preview */}
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "700", color: "#334155", marginBottom: "0.35rem" }}>
                    Image URL (Supabase Storage / Public Link)
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <input
                      type="text"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      placeholder="https://.../menu-item-images/items/..."
                      style={{
                        flex: 1,
                        padding: "0.6rem 0.75rem",
                        borderRadius: "8px",
                        border: "1.5px solid #cbd5e1",
                        fontSize: "0.85rem",
                        boxSizing: "border-box"
                      }}
                    />
                    {formImageUrl && (
                      <img
                        src={formImageUrl}
                        alt="Preview"
                        style={{ width: "36px", height: "36px", borderRadius: "6px", objectFit: "cover", border: "1px solid #e2e8f0" }}
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "700", color: "#334155", marginBottom: "0.35rem" }}>
                    Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Short description of the item..."
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.75rem",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "0.85rem",
                      boxSizing: "border-box",
                      fontFamily: "inherit"
                    }}
                  />
                </div>

                {/* Active Status Toggle */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input
                    type="checkbox"
                    id="admin-item-active"
                    checked={formIsAvailable}
                    onChange={(e) => setFormIsAvailable(e.target.checked)}
                    style={{ width: "16px", height: "16px", accentColor: "#0284c7" }}
                  />
                  <label htmlFor="admin-item-active" style={{ fontSize: "0.85rem", fontWeight: "600", color: "#334155", cursor: "pointer" }}>
                    Available in User Catalog (Active)
                  </label>
                </div>

                {formError && (
                  <div style={{ color: "#ef4444", fontSize: "0.82rem", background: "#fef2f2", padding: "0.5rem 0.75rem", borderRadius: "6px" }}>
                    {formError}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.65rem",
                  padding: "0.85rem 1.25rem",
                  borderTop: "1px solid #f1f5f9",
                  background: "#f8fafc"
                }}
              >
                <button
                  type="button"
                  className="admin-btn"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#ffffff", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "0.5rem 1.15rem",
                    borderRadius: "8px",
                    border: "none",
                    background: "#0284c7",
                    color: "#ffffff",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  {submitting ? "Saving..." : editingItem ? "Save Changes" : "Create Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
