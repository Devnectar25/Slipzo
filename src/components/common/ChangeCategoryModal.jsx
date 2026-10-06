import { useState, useEffect } from "react"
import { X, Check, Store, AlertCircle, Info } from "lucide-react"
import { call, getCachedData, setCachedData, clearStoredMenuItems } from "../../lib/utils"
import { useToast } from "./Toast"
import { useTranslation } from "react-i18next"
import { TableSetupModal } from "../tables/TableSetupModal"

export const BUSINESS_CATEGORIES = [
  { 
    id: "small_business", 
    label: "Small Business / Cafe & Tea", 
    icon: "☕", 
    desc: "Chai tapri, coffee shop, bakery, snacks, juices & quick bites" 
  },
  { 
    id: "kirana_grocery", 
    label: "Kirana / Grocery Shop", 
    icon: "🛒", 
    desc: "Daily grocery, atta, rice, pulses, spices, packaged food & FMCG" 
  },
  { 
    id: "clothing_garments", 
    label: "Cloth & Garments Shop", 
    icon: "👗", 
    desc: "Apparel, shirts, jeans, sarees, kids wear & readymade garments" 
  },
  { 
    id: "hotel_food", 
    label: "Hotel or Food Restaurant", 
    icon: "🍽️", 
    desc: "Dine-in restaurant, thalis, Chinese, starters & hotel meals" 
  }
]

export function ChangeCategoryModal({ isOpen, onClose, currentCategory = "small_business", onCategoryChanged, user, setView }) {
  const { t } = useTranslation()
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
  }, [isOpen, currentCategory])

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

      // Dispatch global events to inform Menu and Bill screens immediately
      window.dispatchEvent(new CustomEvent("slipzo-menu-update", { detail: { items: [] } }))
      window.dispatchEvent(new CustomEvent("slipzo_shop_updated", { detail: updatedShop }))

      const catObj = BUSINESS_CATEGORIES.find(c => c.id === selectedCat)
      toastSuccess(t("profile.categoryUpdated", `Shop category switched to "${catObj?.label || selectedCat}"`))
      
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

  return (
    <div className="menu-modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="menu-modal-card" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: "560px", width: "95%" }}
      >
        <div className="menu-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#f0f9ff", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Store size={18} />
            </div>
            <div>
              <h3 className="menu-modal-title" style={{ fontSize: "1.1rem" }}>
                {t("profile.changeShopCategory", "Change Shop Category")}
              </h3>
              <p style={{ fontSize: "0.78rem", color: "#64748b", margin: 0 }}>
                {t("profile.changeShopCategoryDesc", "Select your new business type to switch your product catalog")}
              </p>
            </div>
          </div>
          <button className="menu-modal-close-btn" onClick={onClose} disabled={isSaving}>
            <X size={18} />
          </button>
        </div>

        <div className="menu-modal-body" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", background: "#fffbeb", border: "1px solid #fef3c7", padding: "0.65rem 0.85rem", borderRadius: "10px", marginBottom: "1rem", color: "#92400e", fontSize: "0.8rem", lineHeight: "1.35" }}>
            <Info size={16} style={{ flexShrink: 0, marginTop: "2px", color: "#d97706" }} />
            <span>
              {t("profile.categoryChangeWarning", "Switching category will clear your previous personal menu items so you can start fresh with products tailored to your new business.")}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {BUSINESS_CATEGORIES.map((cat) => {
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
                    padding: "0.85rem 1rem",
                    borderRadius: "12px",
                    border: isSelected ? "2px solid #0284c7" : "1.5px solid #e2e8f0",
                    background: isSelected ? "#f0f9ff" : "#ffffff",
                    boxShadow: isSelected ? "0 4px 12px rgba(2, 132, 199, 0.12)" : "none",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                    position: "relative"
                  }}
                >
                  <span style={{ fontSize: "1.6rem", lineHeight: 1 }}>{cat.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ fontSize: "0.92rem", fontWeight: "700", color: isSelected ? "#0369a1" : "#1e293b" }}>
                        {cat.label}
                      </span>
                      {isCurrent && (
                        <span style={{ fontSize: "0.68rem", background: "#e2e8f0", color: "#475569", padding: "1px 6px", borderRadius: "10px", fontWeight: "700" }}>
                          Current
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "2px" }}>
                      {cat.desc}
                    </div>
                  </div>
                  {isSelected && (
                    <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#0284c7", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Check size={13} strokeWidth={3} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {errorMsg && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#ef4444", fontSize: "0.84rem", marginTop: "1rem", background: "#fef2f2", padding: "0.6rem 0.8rem", borderRadius: "8px", border: "1px solid #fecaca" }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        <div className="menu-modal-footer" style={{ padding: "0.9rem 1.25rem", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
          <button
            type="button"
            className="menu-secondary-btn"
            onClick={onClose}
            disabled={isSaving}
          >
            {t("common.cancel", "Cancel")}
          </button>
          <button
            type="button"
            className="menu-primary-btn"
            onClick={handleConfirmChange}
            disabled={isSaving || selectedCat === currentCategory}
            style={{ opacity: selectedCat === currentCategory ? 0.6 : 1 }}
          >
            {isSaving ? t("common.saving", "Saving...") : t("profile.confirmChange", "Switch Category")}
          </button>
        </div>
      </div>
    </div>
  )
}
