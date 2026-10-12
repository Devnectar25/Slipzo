import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, Check, Store, AlertCircle, Info } from "lucide-react"
import { 
  call, 
  getCachedData, 
  setCachedData, 
  removeCachedData, 
  invalidateApiCache, 
  clearStoredMenuItems, 
  clearStoredTables, 
  resetStoredTables, 
  createDefaultTables 
} from "../../lib/utils"
import { useToast } from "./Toast"
import { useTranslation } from "react-i18next"
import { TableSetupModal } from "../tables/TableSetupModal"

export const getBusinessCategories = (t) => [
  { 
    id: "small_business", 
    label: t ? t("profile.catSmallBusiness", "Small Business / Cafe & Tea") : "Small Business / Cafe & Tea", 
    icon: "☕", 
    desc: t ? t("profile.catSmallBusinessDesc", "Chai tapri, coffee shop, bakery, snacks, juices & quick bites") : "Chai tapri, coffee shop, bakery, snacks, juices & quick bites" 
  },
  { 
    id: "kirana_grocery", 
    label: t ? t("profile.catKiranaGrocery", "Kirana / Grocery Shop") : "Kirana / Grocery Shop", 
    icon: "🛒", 
    desc: t ? t("profile.catKiranaGroceryDesc", "Daily grocery, atta, rice, pulses, spices, packaged food & FMCG") : "Daily grocery, atta, rice, pulses, spices, packaged food & FMCG" 
  },
  { 
    id: "clothing_garments", 
    label: t ? t("profile.catClothingGarments", "Cloth & Garments Shop") : "Cloth & Garments Shop", 
    icon: "👗", 
    desc: t ? t("profile.catClothingGarmentsDesc", "Apparel, shirts, jeans, sarees, kids wear & readymade garments") : "Apparel, shirts, jeans, sarees, kids wear & readymade garments" 
  },
  { 
    id: "hotel_food", 
    label: t ? t("profile.catHotelFood", "Hotel or Food Restaurant") : "Hotel or Food Restaurant", 
    icon: "🍽️", 
    desc: t ? t("profile.catHotelFoodDesc", "Dine-in restaurant, thalis, Chinese, starters & hotel meals") : "Dine-in restaurant, thalis, Chinese, starters & hotel meals" 
  }
]

export const BUSINESS_CATEGORIES = getBusinessCategories(null)

export function ChangeCategoryModal({ isOpen, onClose, currentCategory = "small_business", onCategoryChanged, user, setView }) {
  const { t } = useTranslation()
  const categories = getBusinessCategories(t)
  const { success: toastSuccess, error: toastError } = useToast()
  const [selectedCat, setSelectedCat] = useState(currentCategory)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [showTableSetup, setShowTableSetup] = useState(false)
  const [savedShop, setSavedShop] = useState(null)

  useEffect(() => {
    if (isOpen) {
      setSelectedCat(currentCategory)
      setShowTableSetup(false)
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  if (!isOpen && !showTableSetup) return null

  const handleConfirmChange = async () => {
    if (selectedCat === currentCategory) {
      onClose()
      return
    }

    setIsSaving(true)
    setErrorMsg("")

    try {
      const cachedShop = getCachedData("/shop") || {}
      const updatedShop = await call("/shop", {
        method: "PUT",
        body: JSON.stringify({
          ...cachedShop,
          business_type: selectedCat
        })
      })

      // Update shop cache
      setCachedData("/shop", updatedShop)
      setSavedShop(updatedShop)

      // Clear menu cache and local storage items since category changed
      setCachedData("/menu", [])
      clearStoredMenuItems(user)

      // Also reset tables both remotely and locally whenever business category changes
      try {
        await call("/restaurant/tables/reset-all", { method: "POST" })
      } catch (tableResetErr) {
        console.warn("Backend tables reset call warning:", tableResetErr)
      }

      // Invalidate API caches for restaurant tables
      removeCachedData("/restaurant/tables")
      removeCachedData("/tables")
      invalidateApiCache("restaurant")
      invalidateApiCache("tables")

      // Clear local stored tables and reset to fresh available empty tables
      clearStoredTables(user)
      const freshTables = resetStoredTables(user, updatedShop?.table_count || 10)

      // Clear any pending table edit session data
      try {
        sessionStorage.removeItem("slipzo_edit_table")
        sessionStorage.removeItem("slipzo_edit_bill")
      } catch (_) {}

      // Dispatch global events to inform Menu, Bill, and Table screens immediately
      window.dispatchEvent(new CustomEvent("slipzo-menu-update", { detail: { items: [] } }))
      window.dispatchEvent(new CustomEvent("slipzo_tables_reset", { detail: { tables: freshTables, table_count: updatedShop?.table_count || 10 } }))
      window.dispatchEvent(new CustomEvent("slipzo_shop_updated", { detail: updatedShop }))

      const catObj = categories.find(c => c.id === selectedCat)
      toastSuccess(t("profile.categoryUpdated", { category: catObj?.label || selectedCat, defaultValue: `Shop category switched to "${catObj?.label || selectedCat}"` }))
      
      if (onCategoryChanged) {
        onCategoryChanged(selectedCat, updatedShop)
      }

      // If switched to Hotel / Restaurant, trigger Table Setup popup
      if (selectedCat === "hotel_food") {
        setShowTableSetup(true)
      } else {
        onClose()
      }
    } catch (err) {
      console.error("Failed to change shop category:", err)
      setErrorMsg(err.detail || err.message || "Failed to update category. Please try again.")
      toastError(err.detail || err.message || "Failed to update category.")
    } finally {
      setIsSaving(false)
    }
  }

  if (showTableSetup) {
    return (
      <TableSetupModal
        isOpen={true}
        onClose={() => {
          setShowTableSetup(false)
          onClose()
        }}
        currentCount={savedShop?.table_count || 10}
        user={user}
        onSetupComplete={(count) => {
          setShowTableSetup(false)
          onClose()
          if (setView) setView("tables")
        }}
      />
    )
  }

  const modalContent = (
    <div 
      className="category-modal-backdrop" 
      onClick={onClose} 
      style={{ 
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        boxSizing: "border-box",
        animation: "fadeIn 0.15s ease",
        overscrollBehavior: "contain"
      }}
    >
      <div 
        className="menu-modal-card category-change-modal-card" 
        onClick={(e) => e.stopPropagation()} 
        style={{
          maxWidth: "540px",
          width: "95%",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          borderRadius: "20px",
          boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.35)",
          border: "1.5px solid #bae6fd",
          overflow: "hidden",
          animation: "scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        <div className="menu-modal-header" style={{ padding: "1.15rem 1.25rem", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#ffffff", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#f0f9ff", border: "1.5px solid #bae6fd", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Store size={20} />
            </div>
            <div>
              <h3 className="menu-modal-title" style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", margin: 0, lineHeight: 1.25 }}>
                {t("profile.changeShopCategory", "Change Shop Category")}
              </h3>
              <p style={{ fontSize: "0.78rem", color: "#64748b", margin: "2px 0 0 0", lineHeight: 1.3 }}>
                {t("profile.changeShopCategoryDesc", "Select your new business type to switch your product catalog")}
              </p>
            </div>
          </div>
          <button 
            className="menu-modal-close-btn" 
            onClick={onClose} 
            disabled={isSaving}
            style={{ background: "#f1f5f9", border: "none", width: "32px", height: "32px", borderRadius: "50%", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="menu-modal-body" style={{ padding: "1.15rem 1.25rem", overflowY: "auto", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", background: "#fffbeb", border: "1px solid #fef3c7", padding: "0.75rem 0.9rem", borderRadius: "12px", marginBottom: "1.1rem", color: "#92400e", fontSize: "0.82rem", lineHeight: "1.4" }}>
            <Info size={17} style={{ flexShrink: 0, marginTop: "1px", color: "#d97706" }} />
            <span>
              {t("profile.categoryChangeWarning", "Switching category will clear your previous personal menu items so you can start fresh with products tailored to your new business.")}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {categories.map((cat) => {
              const isSelected = selectedCat === cat.id
              const isCurrent = currentCategory === cat.id

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCat(cat.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.85rem",
                    padding: "0.9rem 1.1rem",
                    borderRadius: "14px",
                    border: isSelected ? "2px solid #0284c7" : "1.5px solid #e2e8f0",
                    background: isSelected ? "#f0f9ff" : "#ffffff",
                    boxShadow: isSelected ? "0 4px 12px rgba(2, 132, 199, 0.12)" : "0 1px 3px rgba(0,0,0,0.02)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                    position: "relative",
                    width: "100%",
                    boxSizing: "border-box"
                  }}
                >
                  <span style={{ fontSize: "1.75rem", lineHeight: 1, flexShrink: 0 }}>{cat.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.95rem", fontWeight: "700", color: isSelected ? "#0369a1" : "#0f172a" }}>
                        {cat.label}
                      </span>
                      {isCurrent && (
                        <span style={{ fontSize: "0.68rem", background: "#e0f2fe", color: "#0284c7", padding: "2px 8px", borderRadius: "10px", fontWeight: "700", whiteSpace: "nowrap" }}>
                          {t("profile.activeCategory", "Active Category")}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "3px", lineHeight: 1.4 }}>
                      {cat.desc}
                    </div>
                  </div>
                  {isSelected && (
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#0284c7", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {errorMsg && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#ef4444", fontSize: "0.84rem", marginTop: "1rem", background: "#fef2f2", padding: "0.65rem 0.85rem", borderRadius: "10px", border: "1px solid #fecaca" }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        <div className="menu-modal-footer" style={{ padding: "0.9rem 1.25rem", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.75rem", flexShrink: 0 }}>
          <button
            type="button"
            className="menu-secondary-btn"
            onClick={onClose}
            disabled={isSaving}
            style={{
              padding: "0.65rem 1.25rem",
              borderRadius: "10px",
              fontSize: "0.86rem",
              fontWeight: 600,
              border: "1.5px solid #cbd5e1",
              background: "#ffffff",
              color: "#334155",
              cursor: "pointer"
            }}
          >
            {t("common.cancel", "Cancel")}
          </button>
          <button
            type="button"
            className="menu-primary-btn"
            onClick={handleConfirmChange}
            disabled={isSaving}
            style={{
              padding: "0.65rem 1.35rem",
              borderRadius: "10px",
              fontSize: "0.86rem",
              fontWeight: 700,
              border: "none",
              background: "#0284c7",
              color: "#ffffff",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(2, 132, 199, 0.25)"
            }}
          >
            {isSaving ? t("common.saving", "Saving...") : t("profile.confirmChange", "Switch Category")}
          </button>
        </div>
      </div>
    </div>
  )

  if (typeof document !== "undefined") {
    return createPortal(modalContent, document.body)
  }

  return modalContent
}
