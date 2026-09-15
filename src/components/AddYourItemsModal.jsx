import { useState, useEffect } from "react"
import { Utensils, Plus, Trash2, ArrowRight, Check, X, AlertCircle } from "lucide-react"
import { call, money, getStoredMenuItems, saveStoredMenuItems } from "../lib/utils"
import { useToast } from "./common/Toast"
import { ButtonLoader } from "./common/Skeleton"

export function AddYourItemsModal({ isOpen, onClose, user, onContinue }) {
  const [items, setItems] = useState([])
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState("")

  const { success: toastSuccess, error: toastError } = useToast()

  useEffect(() => {
    if (isOpen && user) {
      const initial = getStoredMenuItems(user)
      if (initial.length > 0) setItems(initial)
      call("/menu")
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setItems(data)
            saveStoredMenuItems(data, user)
          }
        })
        .catch(() => {})
    }
  }, [isOpen, user])

  if (!isOpen) return null

  const handleAddItem = async (e) => {
    e?.preventDefault()
    setError("")

    const cleanName = name.trim()
    const numPrice = parseFloat(price)

    if (!cleanName) {
      setError("Please enter an item name.")
      return
    }

    if (price === "" || isNaN(numPrice) || numPrice < 0) {
      setError("Please enter a valid price.")
      return
    }

    setAdding(true)
    try {
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
      setName("")
      setPrice("")
      toastSuccess(`Added "${cleanName}"`)
    } catch (err) {
      console.error("Failed to add menu item:", err)
      setError(err.message || "Failed to add item.")
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteItem = async (id) => {
    try {
      await call(`/menu/${id}`, { method: "DELETE" }).catch(() => null)
      setItems((prev) => {
        const next = prev.filter((it) => it.id !== id)
        saveStoredMenuItems(next, user)
        return next
      })
    } catch (err) {
      console.error("Failed to delete item:", err)
    }
  }

  const handleFinish = () => {
    if (user?.id) {
      localStorage.setItem(`slipzo_items_setup_${user.id}`, "true")
    }
    onContinue?.()
    onClose()
  }

  return (
    <div
      className="modal-backdrop fade-in"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(6px)",
        zIndex: 1150,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem"
      }}
      onClick={(e) => {
        e.stopPropagation()
      }}
    >
      <div
        className="modal-card scale-in"
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "480px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden"
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.5rem 1.75rem 1rem",
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            color: "#ffffff"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "rgba(56, 189, 248, 0.15)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                color: "#38bdf8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Utensils size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "700", color: "#ffffff", margin: 0 }}>
                Add Your Shop Items
              </h3>
              <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: 0, marginTop: "2px" }}>
                Add common items sold by your shop for quick billing
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "1.5rem 1.75rem", overflowY: "auto", flex: 1 }}>
          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                padding: "0.65rem 0.85rem",
                borderRadius: "8px",
                fontSize: "0.83rem",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}
            >
              <AlertCircle size={15} flexShrink={0} />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Add Form */}
          <form onSubmit={handleAddItem} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "0.6rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "#475569", marginBottom: "0.3rem" }}>
                  Item Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tea, Coffee, Pizza"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.9rem",
                    outline: "none"
                  }}
                  autoFocus
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "#475569", marginBottom: "0.3rem" }}>
                  Price (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="₹ 0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.9rem",
                    outline: "none"
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="primary-button"
              disabled={adding}
              style={{ width: "100%", justifyContent: "center", padding: "0.6rem" }}
            >
              {adding ? <ButtonLoader text="Adding..." /> : <><Plus size={16} /> Add Item</>}
            </button>
          </form>

          {/* Existing Added Items List */}
          <div>
            <h4 style={{ fontSize: "0.85rem", fontWeight: "700", color: "#334155", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Saved Items ({items.length})
            </h4>

            {items.length === 0 ? (
              <div style={{ padding: "1.25rem", textAlign: "center", background: "#f8fafc", borderRadius: "10px", border: "1px dashed #cbd5e1", color: "#64748b", fontSize: "0.85rem" }}>
                No items added yet. Add a few items above or click Continue to proceed.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: "180px", overflowY: "auto", paddingRight: "4px" }}>
                {items.map((it) => (
                  <div
                    key={it.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.55rem 0.85rem",
                      background: "#f8fafc",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0"
                    }}
                  >
                    <span style={{ fontWeight: "600", color: "#0f172a", fontSize: "0.88rem" }}>{it.name}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontWeight: "700", color: "#0284c7", fontSize: "0.9rem" }}>{money(it.price)}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(it.id)}
                        style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "2px" }}
                        title="Remove item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="add-items-footer">
          <button
            type="button"
            className="secondary-button add-items-skip-btn"
            onClick={handleFinish}
          >
            Skip for now
          </button>
          <button
            type="button"
            className="primary-button add-items-continue-btn"
            onClick={handleFinish}
          >
            <span>Continue to Billing</span> <ArrowRight size={16} />
          </button>
        </div>

        <style>{`
          .add-items-footer {
            padding: 0.85rem 1.25rem !important;
            background: #f8fafc !important;
            border-top: 1px solid #e2e8f0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: flex-end !important;
            gap: 0.85rem !important;
            box-sizing: border-box !important;
            width: 100% !important;
          }

          .add-items-skip-btn {
            font-size: 0.85rem !important;
            padding: 0.5rem 0.9rem !important;
            width: auto !important;
            max-width: fit-content !important;
            white-space: nowrap !important;
            flex-shrink: 0 !important;
          }

          .add-items-continue-btn {
            font-size: 0.88rem !important;
            padding: 0.5rem 1rem !important;
            width: auto !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 0.4rem !important;
          }

          @media (max-width: 480px) {
            .add-items-footer {
              padding: 0.75rem 0.85rem !important;
              gap: 0.6rem !important;
              justify-content: space-between !important;
            }

            .add-items-skip-btn {
              font-size: 0.8rem !important;
              padding: 0.45rem 0.75rem !important;
            }

            .add-items-continue-btn {
              font-size: 0.82rem !important;
              padding: 0.45rem 0.75rem !important;
            }
          }
        `}</style>
      </div>
    </div>
  )
}
