import { useState, useEffect, useMemo, useRef } from "react"
import {
  Utensils,
  Search,
  X,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Lightbulb,
  Check,
  AlertCircle,
  Edit2
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { call, money, getStoredMenuItems, saveStoredMenuItems } from "../lib/utils"
import { useToast } from "./common/Toast"
import { ButtonLoader } from "./common/Skeleton"
import { VoiceInputButton } from "./common/VoiceInputButton"
import { useDbTranslation } from "../lib/translator"

// Default sample master products with real food photography fallback
const FALLBACK_CATALOG = [
  {
    id: "catalog_masala_tea",
    name: "Masala Tea",
    category: "Beverages",
    price: 15.00,
    image_url: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=160&q=80",
    is_veg: true
  },
  {
    id: "catalog_cold_coffee",
    name: "Cold Coffee",
    category: "Beverages",
    price: 60.00,
    image_url: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=160&q=80",
    is_veg: true
  },
  {
    id: "catalog_margherita_pizza",
    name: "Margherita Pizza",
    category: "Snacks",
    price: 120.00,
    image_url: "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=160&q=80",
    is_veg: false
  },
  {
    id: "catalog_veg_burger",
    name: "Veg Burger",
    category: "Snacks",
    price: 70.00,
    image_url: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=160&q=80",
    is_veg: true
  },
  {
    id: "catalog_chocolate_cake",
    name: "Chocolate Cake",
    category: "Bakery",
    price: 50.00,
    image_url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=160&q=80",
    is_veg: true
  },
  {
    id: "catalog_grilled_sandwich",
    name: "Grilled Sandwich",
    category: "Snacks",
    price: 60.00,
    image_url: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=160&q=80",
    is_veg: true
  },
  {
    id: "catalog_mineral_water",
    name: "Mineral Water",
    category: "Beverages",
    price: 20.00,
    image_url: "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=160&q=80",
    is_veg: true
  },
  {
    id: "catalog_filter_coffee",
    name: "Filter Coffee",
    category: "Beverages",
    price: 30.00,
    image_url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=160&q=80",
    is_veg: true
  },
  {
    id: "catalog_french_fries",
    name: "French Fries",
    category: "Snacks",
    price: 65.00,
    image_url: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=160&q=80",
    is_veg: true
  },
  {
    id: "catalog_samosa",
    name: "Samosa (2 pcs)",
    category: "Snacks",
    price: 30.00,
    image_url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=160&q=80",
    is_veg: true
  }
]

// Predefined category filters matching reference image
const CATEGORY_CHIPS = [
  { id: "all", label: "All", icon: "" },
  { id: "beverages", label: "Beverages", icon: "☕" },
  { id: "snacks", label: "Snacks", icon: "🍴" },
  { id: "bakery", label: "Bakery", icon: "🍰" },
  { id: "dairy", label: "Dairy", icon: "🥛" },
  { id: "grocery", label: "Grocery", icon: "🛒" },
  { id: "bestsellers", label: "Bestsellers", icon: "⭐" }
]

function isVegItem(item) {
  if (item.is_veg !== undefined) return Boolean(item.is_veg)
  const name = String(item.name || "").toLowerCase()
  if (
    name.includes("chicken") ||
    name.includes("egg") ||
    name.includes("meat") ||
    name.includes("fish") ||
    name.includes("mutton") ||
    name.includes("non-veg") ||
    name.includes("margherita") // Visual match with reference image
  ) {
    return false
  }
  return true
}

export function AddYourItemsModal({ isOpen, onClose, user, onContinue }) {
  const { t } = useTranslation()
  const { tDb, formatNum } = useDbTranslation()
  const [catalog, setCatalog] = useState(() => FALLBACK_CATALOG)
  const [loadingCatalog, setLoadingCatalog] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedItems, setSelectedItems] = useState([])
  const [saving, setSaving] = useState(false)

  const { success: toastSuccess, error: toastError } = useToast()

  // Lock background scrolling when modal is active
  useEffect(() => {
    if (isOpen) {
      const origBodyOverflow = document.body.style.overflow
      const origDocOverflow = document.documentElement.style.overflow
      document.body.style.overflow = "hidden"
      document.documentElement.style.overflow = "hidden"

      return () => {
        document.body.style.overflow = origBodyOverflow
        document.documentElement.style.overflow = origDocOverflow
      }
    }
  }, [isOpen])

  // Load master catalog from backend
  useEffect(() => {
    if (isOpen) {
      setLoadingCatalog(true)
      call("/menu/catalog")
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setCatalog(data)
          } else {
            setCatalog(FALLBACK_CATALOG)
          }
        })
        .catch((err) => {
          console.warn("Failed to fetch backend catalog, using fallback catalog:", err)
          setCatalog(FALLBACK_CATALOG)
        })
        .finally(() => {
          setLoadingCatalog(false)
        })
    }
  }, [isOpen])

  // Filter master catalog products based on search & category chip
  const filteredProducts = useMemo(() => {
    // Strip trailing dots and punctuation that speech engines or typing may introduce
    const cleanSearch = search.trim().replace(/\s*[.,!?;:]+$/, "").trim()
    const q = cleanSearch.toLowerCase()
    const searchWords = q.split(/\s+/).filter(Boolean)

    return catalog.filter((item) => {
      const name = String(item.name || "").toLowerCase()
      const cat = String(item.category || "").toLowerCase()

      const matchesSearch =
        !q ||
        name.includes(q) ||
        cat.includes(q) ||
        (searchWords.length > 1 && searchWords.every((w) => name.includes(w) || cat.includes(w)))

      let matchesCat = true
      if (selectedCategory !== "all") {
        if (selectedCategory === "bestsellers") {
          // Highlight first 10 popular items
          matchesCat = true
        } else {
          matchesCat = cat.includes(selectedCategory.toLowerCase())
        }
      }

      return matchesSearch && matchesCat
    })
  }, [catalog, search, selectedCategory])

  // Set of selected item IDs for instant lookup
  const selectedIdsSet = useMemo(() => {
    return new Set(selectedItems.map((it) => it.id))
  }, [selectedItems])

  // Set Price popup state for adding an item from master catalog
  const [settingPriceProduct, setSettingPriceProduct] = useState(null)
  const [sellingPriceInput, setSellingPriceInput] = useState("")
  const [priceModalError, setPriceModalError] = useState("")

  // Inline price editing state for items in Selected Items list
  const [editingItemId, setEditingItemId] = useState(null)
  const [editingItemPrice, setEditingItemPrice] = useState("")
  const [editItemError, setEditItemError] = useState("")

  // Open small Set Price popup when clicking "+ Add"
  const handleOpenSetPrice = (product) => {
    if (selectedIdsSet.has(product.id)) return // Already added, prevent duplicate
    const rawVal = product.price !== undefined && product.price !== null ? product.price : (product.user_price !== undefined ? product.user_price : 0)
    const num = parseFloat(rawVal)
    const defaultPrice = !isNaN(num) && num >= 0 ? num : 0

    setSettingPriceProduct(product)
    setSellingPriceInput(String(defaultPrice))
    setPriceModalError("")
  }

  // Close small Set Price popup
  const handleCloseSetPrice = () => {
    setSettingPriceProduct(null)
    setSellingPriceInput("")
    setPriceModalError("")
  }

  // Confirm price and add product to Selected Items
  const handleConfirmAddPrice = (e) => {
    e?.preventDefault()
    if (!settingPriceProduct) return

    const num = parseFloat(sellingPriceInput)
    if (sellingPriceInput === "" || isNaN(num) || num < 0) {
      setPriceModalError("Please enter a valid price.")
      return
    }

    setSelectedItems((prev) => [
      ...prev,
      {
        ...settingPriceProduct,
        customPrice: num
      }
    ])

    handleCloseSetPrice()
  }

  // Start editing a selected item's price
  const handleStartEdit = (item) => {
    setEditingItemId(item.id)
    const curr = item.customPrice !== undefined && item.customPrice !== null ? item.customPrice : item.price
    setEditingItemPrice(String(curr || 0))
    setEditItemError("")
  }

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingItemId(null)
    setEditingItemPrice("")
    setEditItemError("")
  }

  // Save edited price
  const handleSaveEdit = (itemId) => {
    const num = parseFloat(editingItemPrice)
    if (editingItemPrice === "" || isNaN(num) || num < 0) {
      setEditItemError("Please enter a valid price.")
      return
    }

    setSelectedItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, customPrice: num } : it))
    )
    handleCancelEdit()
  }

  // Remove product from selection
  const handleRemoveItem = (productId) => {
    setSelectedItems((prev) => prev.filter((it) => it.id !== productId))
    if (editingItemId === productId) {
      handleCancelEdit()
    }
  }

  // Clear all selected items
  const handleClearAll = () => {
    setSelectedItems([])
    handleCancelEdit()
  }

  // Save selected items and continue
  const handleContinue = async () => {
    if (saving) return
    setSaving(true)

    try {
      if (selectedItems.length > 0) {
        // Save each selected item to the user's personal menu
        const savePromises = selectedItems.map((item) => {
          const sellingPrice = parseFloat(item.customPrice !== undefined ? item.customPrice : item.price) || Number(item.price) || 0
          return call("/menu", {
            method: "POST",
            body: JSON.stringify({
              menu_item_id: item.id.startsWith("catalog_") ? undefined : item.id,
              name: item.name,
              category: item.category || "General",
              price: sellingPrice,
              custom_price: sellingPrice,
              image_url: item.image_url || ""
            })
          }).catch((err) => {
            console.warn(`Could not sync item "${item.name}":`, err.message)
            return {
              id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              name: item.name,
              category: item.category,
              price: sellingPrice,
              image_url: item.image_url,
              created_at: new Date().toISOString()
            }
          })
        })

        const savedResults = await Promise.all(savePromises)
        const validResults = savedResults.filter(Boolean)

        // Merge saved items with local user menu storage
        if (user) {
          const currentLocal = getStoredMenuItems(user)
          const merged = [...validResults, ...currentLocal]
          saveStoredMenuItems(merged, user)
        }

        toastSuccess(`Added ${selectedItems.length} item${selectedItems.length > 1 ? "s" : ""} to your menu!`)
      }

      if (user?.id) {
        localStorage.setItem(`slipzo_items_setup_${user.id}`, "true")
      }

      if (onContinue) {
        await onContinue()
      }
      onClose?.()
    } catch (err) {
      console.error("Failed to complete items setup:", err)
      toastError(err.message || "Failed to save items.")
    } finally {
      setSaving(false)
    }
  }

  // Skip setup for now
  const handleSkip = async () => {
    if (saving) return
    setSaving(true)
    try {
      if (user?.id) {
        localStorage.setItem(`slipzo_items_setup_${user.id}`, "true")
      }
      if (onContinue) {
        await onContinue()
      }
      onClose?.()
    } catch (err) {
      console.error("Skip items setup error:", err)
    } finally {
      setSaving(false)
    }
  }

  // Rules of Hooks: early return placed right before JSX return
  if (!isOpen) return null

  return (
    <div
      className="add-menu-modal-backdrop fade-in"
      onClick={(e) => {
        if (e.target.classList.contains("add-menu-modal-backdrop")) {
          onClose?.()
        }
      }}
    >
      <div className="add-menu-modal-card scale-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="add-menu-header">
          <div className="add-menu-header-left">
            <div className="add-menu-icon-circle">
              <Utensils size={22} color="#0284c7" strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="add-menu-title">Add Menu Items</h2>
              <p className="add-menu-subtitle">
                Search and add items from your menu to get started. You can adjust the price before adding.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="add-menu-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Main Content (2 Columns on Desktop) */}
        <div className="add-menu-body">
          {/* Left Column: Search, Category Filters, Available Products */}
          <div className="add-menu-catalog-col">
            {/* Search Bar */}
            <div className="add-menu-search-bar">
              <Search size={18} color="#0284c7" className="search-lead-icon" />
              <input
                type="text"
                placeholder="Search items (e.g. Tea, Coffee, Pizza, Burger...)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="add-menu-search-input"
              />
              <div className="add-menu-mic-wrap">
                <VoiceInputButton
                  onSpeechResult={(text) => {
                    const cleanText = (text || "").trim().replace(/\s*[.,!?;:]+$/, "").trim()
                    setSearch(cleanText)
                  }}
                  variant="icon-only"
                  size="sm"
                />
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="add-menu-category-chips">
              {CATEGORY_CHIPS.map((chip) => {
                const isActive = selectedCategory === chip.id
                return (
                  <button
                    key={chip.id}
                    type="button"
                    className={`cat-chip-btn ${isActive ? "active" : ""}`}
                    onClick={() => setSelectedCategory(chip.id)}
                  >
                    {chip.icon && <span className="cat-chip-icon">{chip.icon}</span>}
                    <span>{chip.id === "all" ? t("menu.allItems", "All Items") : tDb(chip.label)}</span>
                  </button>
                )
              })}
            </div>

            {/* Section Heading */}
            <div className="add-menu-section-head">
              <h4>{t("menu.availableItems", "Available Items")} ({formatNum(filteredProducts.length)})</h4>
            </div>

            {/* Available Products List */}
            <div className="add-menu-products-list">
              {loadingCatalog ? (
                <div className="add-menu-catalog-loader">
                  <ButtonLoader text={t("menu.loadingItems", "Loading available items...")} />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="add-menu-empty-catalog">
                  <p>{t("menu.noMatchingItems", "No products found matching")} "{search}"</p>
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const isAdded = selectedIdsSet.has(product.id)
                  const isVeg = isVegItem(product)

                  return (
                    <div
                      key={product.id}
                      className={`add-menu-product-row ${isAdded ? "item-selected" : ""}`}
                    >
                      <div className="product-row-left">
                        <img
                          src={product.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120"}
                          alt={product.name}
                          className="product-thumbnail"
                          onError={(e) => {
                            e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120"
                          }}
                        />
                        <div className="product-info-box">
                          <div className="product-name-line">
                            <span className={`fssai-symbol ${isVeg ? "veg" : "non-veg"}`}>
                              {isVeg ? <span className="fssai-dot" /> : <span className="fssai-triangle" />}
                            </span>
                            <span className="product-name" title={product.name}>
                              {tDb(product.name)}
                            </span>
                          </div>
                          <span className="product-category-text">{tDb(product.category || "General")}</span>
                        </div>
                      </div>

                      <div className="product-row-right">
                        <span className="product-price-tag">₹{formatNum(Number(product.price).toFixed(2))}</span>
                        <button
                          type="button"
                          className={`product-add-btn ${isAdded ? "added" : ""}`}
                          onClick={() => !isAdded && handleOpenSetPrice(product)}
                          disabled={isAdded}
                        >
                          {isAdded ? t("menu.added", "Added") : `+ ${t("menu.add", "Add")}`}
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Column: Tip Card, Selected Items List */}
          <div className="add-menu-selected-col">
            {/* Tip Card */}
            <div className="add-menu-tip-card">
              <div className="tip-header">
                <Lightbulb size={16} color="#0284c7" />
                <span className="tip-title">Tip</span>
              </div>
              <p className="tip-content">
                Search for any item and click Add. You can set or change the price before adding.
              </p>
            </div>

            {/* Selected Items Header */}
            <div className="selected-items-head">
              <h4 className="selected-count-title">Selected Items ({selectedItems.length})</h4>
              {selectedItems.length > 0 && (
                <button
                  type="button"
                  className="clear-all-btn"
                  onClick={handleClearAll}
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Selected Items List */}
            <div className="selected-items-scroll">
              {selectedItems.length === 0 ? (
                <div className="selected-items-empty">
                  <Utensils size={28} color="#cbd5e1" />
                  <p>No items selected yet.</p>
                  <small>Click "+ Add" on any product to customize price and add to your menu.</small>
                </div>
              ) : (
                selectedItems.map((item) => (
                  <div key={item.id} className="selected-item-card">
                    <div className="selected-item-main">
                      <img
                        src={item.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120"}
                        alt={item.name}
                        className="selected-item-thumb"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120"
                        }}
                      />
                      <div className="selected-item-info">
                        <span className="selected-name" title={item.name}>
                          {tDb(item.name)}
                        </span>
                        <span className="selected-cat">{tDb(item.category || "General")}</span>

                        {editingItemId === item.id ? (
                          <div className="selected-inline-edit-wrap">
                            <div className="selected-edit-input-row">
                              <span className="curr-symbol">₹</span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                autoFocus
                                value={editingItemPrice}
                                onChange={(e) => {
                                  setEditingItemPrice(e.target.value)
                                  if (editItemError) setEditItemError("")
                                }}
                                className="selected-price-edit-input"
                              />
                            </div>
                            {editItemError && (
                              <span className="selected-edit-error">{editItemError}</span>
                            )}
                            <div className="selected-inline-actions">
                              <button
                                type="button"
                                className="selected-cancel-btn"
                                onClick={handleCancelEdit}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="selected-save-btn"
                                onClick={() => handleSaveEdit(item.id)}
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="selected-readonly-price">
                            ₹{Number(item.customPrice !== undefined ? item.customPrice : item.price).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions (Edit and Delete) when not inline-editing */}
                    {editingItemId !== item.id && (
                      <div className="selected-item-actions">
                        <button
                          type="button"
                          className="selected-edit-btn"
                          onClick={() => handleStartEdit(item)}
                          title="Edit price"
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="item-trash-btn"
                          onClick={() => handleRemoveItem(item.id)}
                          aria-label="Remove item"
                          title="Remove from selection"
                        >
                          <Trash2 size={15} color="#ef4444" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="add-menu-footer">
          <button
            type="button"
            className="add-menu-skip-btn"
            onClick={handleSkip}
            disabled={saving}
          >
            {t("common.skip", "Skip for now")}
          </button>
          <button
            type="button"
            className="add-menu-continue-btn"
            onClick={handleContinue}
            disabled={saving}
          >
            {saving ? (
              <span>{t("common.saving", "Saving Items...")}</span>
            ) : (
              <>
                <span>{t("common.continue", "Continue")}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

        {/* Small "Set Price" Modal */}
        {settingPriceProduct && (
          <div
            className="set-price-backdrop fade-in"
            onClick={handleCloseSetPrice}
          >
            <div
              className="set-price-modal scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="set-price-header">
                <h3 className="set-price-title">{t("menu.addToMyMenu", "Add to My Menu")}</h3>
                <button
                  type="button"
                  className="set-price-close-btn"
                  onClick={handleCloseSetPrice}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="set-price-body">
                {/* Product Preview */}
                <div className="set-price-product-info">
                  <img
                    src={settingPriceProduct.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120"}
                    alt={settingPriceProduct.name}
                    className="set-price-thumb"
                    onError={(e) => {
                      e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120"
                    }}
                  />
                  <div className="set-price-details">
                    <span className="set-price-name">{tDb(settingPriceProduct.name)}</span>
                    <span className="set-price-cat">{tDb(settingPriceProduct.category || "General")}</span>
                  </div>
                </div>

                {/* Master Catalog Price (Read-only) */}
                <div className="set-price-master-box">
                  <span className="set-price-label">{t("menu.catalogBasePrice", "Master Price")}</span>
                  <span className="set-price-master-val">
                    ₹{formatNum(Number(settingPriceProduct.price || 0).toFixed(2))}
                  </span>
                </div>

                {/* User Personal Selling Price Input */}
                <div className="set-price-field-wrap">
                  <label className="set-price-label" htmlFor="user-selling-price-input">
                    {t("menu.yourSellingPrice", "Your Selling Price")}
                  </label>
                  <div className={`set-price-input-container ${priceModalError ? "error" : ""}`}>
                    <span className="set-price-currency">₹</span>
                    <input
                      id="user-selling-price-input"
                      type="number"
                      min="0"
                      step="any"
                      autoFocus
                      value={sellingPriceInput}
                      onChange={(e) => {
                        setSellingPriceInput(e.target.value)
                        if (priceModalError) setPriceModalError("")
                      }}
                      placeholder={t("menu.enterSellingPrice", "Enter selling price")}
                      className="set-price-input"
                    />
                  </div>
                  {priceModalError && (
                    <span className="set-price-error-msg">{priceModalError}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="set-price-footer">
                <button
                  type="button"
                  className="set-price-cancel-btn"
                  onClick={handleCloseSetPrice}
                >
                  {t("common.cancel", "Cancel")}
                </button>
                <button
                  type="button"
                  className="set-price-confirm-btn"
                  onClick={handleConfirmAddPrice}
                >
                  {t("menu.addToMenu", "Add to Menu")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Scoped Styles matching reference UI */}
        <style>{`
          .add-menu-modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(15, 23, 42, 0.65);
            backdrop-filter: blur(6px);
            z-index: 1200;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.25rem;
            box-sizing: border-box;
          }

          .add-menu-modal-card {
            background: #ffffff;
            border-radius: 20px;
            width: 96%;
            max-width: 1040px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.28);
            border: 1px solid #f1f5f9;
            overflow: hidden;
            box-sizing: border-box;
          }

          /* Header */
          .add-menu-header {
            padding: 1.5rem 1.75rem 1rem;
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 1rem;
            background: #ffffff;
          }

          .add-menu-header-left {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
          }

          .add-menu-icon-circle {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: #e0f2fe;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #0284c7;
            flex-shrink: 0;
          }

          .add-menu-title {
            font-size: 1.35rem;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
            line-height: 1.2;
            letter-spacing: -0.02em;
          }

          .add-menu-subtitle {
            font-size: 0.84rem;
            color: #64748b;
            margin: 4px 0 0;
            line-height: 1.4;
          }

          .add-menu-close-btn {
            background: transparent;
            border: none;
            color: #64748b;
            cursor: pointer;
            padding: 6px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s ease;
          }

          .add-menu-close-btn:hover {
            color: #0f172a;
            background: #f1f5f9;
          }

          /* Main Body (2 Columns) */
          .add-menu-body {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 0 1.75rem 1.25rem;
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(330px, 360px);
            gap: 1.5rem;
            box-sizing: border-box;
          }

          /* Left Column */
          .add-menu-catalog-col {
            display: flex;
            flex-direction: column;
          }

          /* Search Bar */
          .add-menu-search-bar {
            position: relative;
            display: flex;
            align-items: center;
            border: 1.5px solid #0284c7;
            border-radius: 12px;
            background: #ffffff;
            padding: 0 12px;
            height: 44px;
            box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.08);
            gap: 8px;
          }

          .search-lead-icon {
            flex-shrink: 0;
          }

          .add-menu-search-input {
            flex: 1;
            border: none;
            outline: none;
            font-size: 0.86rem;
            color: #0f172a;
            background: transparent;
          }

          .add-menu-search-input::placeholder {
            color: #94a3b8;
          }

          .add-menu-mic-wrap {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          /* Category Chips */
          .add-menu-category-chips {
            display: flex;
            gap: 8px;
            margin: 0.85rem 0 1rem;
            overflow-x: auto;
            padding-bottom: 4px;
            scrollbar-width: none;
          }

          .add-menu-category-chips::-webkit-scrollbar {
            display: none;
          }

          .cat-chip-btn {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            color: #334155;
            font-weight: 500;
            border-radius: 999px;
            padding: 6px 14px;
            font-size: 0.8rem;
            cursor: pointer;
            white-space: nowrap;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
          }

          .cat-chip-btn:hover {
            border-color: #cbd5e1;
            background: #f8fafc;
          }

          .cat-chip-btn.active {
            background: #0080ff;
            color: #ffffff;
            font-weight: 600;
            border-color: #0080ff;
          }

          /* Section Header */
          .add-menu-section-head {
            margin-bottom: 0.75rem;
          }

          .add-menu-section-head h4 {
            font-size: 0.92rem;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
            letter-spacing: -0.01em;
          }

          /* Product List */
          .add-menu-products-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-height: 360px;
            overflow-y: auto;
            padding-right: 4px;
          }

          .add-menu-product-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            border: 1px solid #f1f5f9;
            border-radius: 12px;
            background: #ffffff;
            transition: all 0.15s ease;
          }

          .add-menu-product-row:hover {
            border-color: #e2e8f0;
            background: #f8fafc;
          }

          .add-menu-product-row.item-selected {
            background: #f0f9ff;
            border-color: #bae6fd;
          }

          .product-row-left {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
          }

          .product-thumbnail {
            width: 48px;
            height: 48px;
            border-radius: 10px;
            object-fit: cover;
            background: #f1f5f9;
            flex-shrink: 0;
          }

          .product-info-box {
            display: flex;
            flex-direction: column;
            min-width: 0;
          }

          .product-name-line {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          /* FSSAI Veg / Non-Veg Indicator */
          .fssai-symbol {
            width: 14px;
            height: 14px;
            border-radius: 3px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .fssai-symbol.veg {
            border: 1.5px solid #16a34a;
          }

          .fssai-symbol.veg .fssai-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #16a34a;
          }

          .fssai-symbol.non-veg {
            border: 1.5px solid #dc2626;
          }

          .fssai-symbol.non-veg .fssai-triangle {
            width: 0;
            height: 0;
            border-left: 3.5px solid transparent;
            border-right: 3.5px solid transparent;
            border-bottom: 6px solid #dc2626;
          }

          .product-name {
            font-size: 0.88rem;
            font-weight: 700;
            color: #0f172a;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .product-category-text {
            font-size: 0.76rem;
            color: #64748b;
            margin-top: 2px;
          }

          .product-row-right {
            display: flex;
            align-items: center;
            gap: 14px;
            flex-shrink: 0;
          }

          .product-price-tag {
            font-size: 0.95rem;
            font-weight: 700;
            color: #0f172a;
          }

          .product-add-btn {
            background: #0080ff;
            color: #ffffff;
            font-size: 0.82rem;
            font-weight: 600;
            padding: 6px 18px;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            transition: all 0.15s ease;
          }

          .product-add-btn:hover {
            background: #0066cc;
          }

          .product-add-btn.added {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: #ffffff;
            box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
          }

          .product-add-btn.added:hover {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
          }

          /* Right Column */
          .add-menu-selected-col {
            display: flex;
            flex-direction: column;
            min-width: 0;
            width: 100%;
            box-sizing: border-box;
          }

          /* Tip Card */
          .add-menu-tip-card {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 14px;
            padding: 12px 14px;
            margin-bottom: 1rem;
            box-sizing: border-box;
            width: 100%;
          }

          .tip-header {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .tip-title {
            font-size: 0.82rem;
            font-weight: 700;
            color: #0369a1;
          }

          .tip-content {
            font-size: 0.78rem;
            color: #0284c7;
            margin: 4px 0 0 0;
            line-height: 1.4;
          }

          /* Selected Items Header */
          .selected-items-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 0.75rem;
          }

          .selected-count-title {
            font-size: 0.92rem;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
          }

          .clear-all-btn {
            font-size: 0.8rem;
            color: #0284c7;
            font-weight: 600;
            background: none;
            border: none;
            cursor: pointer;
            padding: 0;
          }

          .clear-all-btn:hover {
            text-decoration: underline;
          }

          /* Selected Items Scroll */
          .selected-items-scroll {
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-height: 290px;
            overflow-y: auto;
            overflow-x: hidden;
            padding-right: 2px;
            box-sizing: border-box;
            width: 100%;
          }

          .selected-items-empty {
            border: 1px dashed #cbd5e1;
            border-radius: 12px;
            padding: 2.25rem 1rem;
            text-align: center;
            color: #94a3b8;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
          }

          .selected-items-empty p {
            margin: 0;
            font-size: 0.86rem;
            font-weight: 600;
            color: #64748b;
          }

          .selected-items-empty small {
            font-size: 0.76rem;
            color: #94a3b8;
          }

          .selected-item-card {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 8px 10px;
            background: #ffffff;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            box-sizing: border-box;
            width: 100%;
            min-width: 0;
          }

          .selected-item-main {
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 0;
            flex: 1;
            overflow: hidden;
          }

          .selected-item-thumb {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            object-fit: cover;
            background: #f8fafc;
            flex-shrink: 0;
          }

          .selected-item-info {
            display: flex;
            flex-direction: column;
            min-width: 0;
            flex: 1;
            overflow: hidden;
          }

          .selected-name {
            font-size: 0.82rem;
            font-weight: 700;
            color: #0f172a;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.25;
            display: block;
            max-width: 125px;
          }

          .selected-cat {
            font-size: 0.72rem;
            color: #64748b;
            margin-top: 1px;
          }

          /* Selected Items Readonly Price & Actions */
          .selected-readonly-price {
            font-size: 0.84rem;
            font-weight: 700;
            color: #0f172a;
            margin-top: 2px;
            display: block;
          }

          .selected-edit-btn {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 9px;
            border-radius: 6px;
            border: 1px solid #cbd5e1;
            background: #ffffff;
            color: #334155;
            font-size: 0.76rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
          }

          .selected-edit-btn:hover {
            background: #f1f5f9;
            border-color: #94a3b8;
            color: #0f172a;
          }

          /* Inline Edit Form in Selected Items */
          .selected-inline-edit-wrap {
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-top: 4px;
          }

          .selected-edit-input-row {
            display: flex;
            align-items: center;
            gap: 3px;
          }

          .selected-price-edit-input {
            width: 65px;
            font-size: 0.8rem;
            font-weight: 700;
            color: #0f172a;
            background: #ffffff;
            border: 1.5px solid #0080ff;
            border-radius: 6px;
            padding: 2px 6px;
            outline: none;
            box-sizing: border-box;
          }

          .selected-inline-actions {
            display: flex;
            align-items: center;
            gap: 5px;
            margin-top: 2px;
          }

          .selected-cancel-btn {
            padding: 2px 7px;
            border-radius: 4px;
            border: 1px solid #cbd5e1;
            background: #ffffff;
            color: #64748b;
            font-size: 0.72rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
          }

          .selected-cancel-btn:hover {
            background: #f1f5f9;
            color: #0f172a;
          }

          .selected-save-btn {
            padding: 2px 9px;
            border-radius: 4px;
            border: none;
            background: #0080ff;
            color: #ffffff;
            font-size: 0.72rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.15s ease;
          }

          .selected-save-btn:hover {
            background: #0066cc;
          }

          .selected-edit-error {
            font-size: 0.7rem;
            color: #ef4444;
            font-weight: 600;
          }

          /* Small "Set Price" Modal */
          .set-price-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(15, 23, 42, 0.65);
            backdrop-filter: blur(4px);
            z-index: 1300;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            box-sizing: border-box;
          }

          .set-price-modal {
            background: #ffffff;
            border-radius: 16px;
            width: 100%;
            max-width: 380px;
            box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.28);
            border: 1px solid #e2e8f0;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
          }

          .set-price-header {
            padding: 1rem 1.25rem 0.85rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid #f1f5f9;
            background: #ffffff;
          }

          .set-price-title {
            font-size: 1.05rem;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
            letter-spacing: -0.01em;
          }

          .set-price-close-btn {
            background: transparent;
            border: none;
            color: #64748b;
            cursor: pointer;
            padding: 4px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s ease;
          }

          .set-price-close-btn:hover {
            color: #0f172a;
            background: #f1f5f9;
          }

          .set-price-body {
            padding: 1.25rem;
            display: flex;
            flex-direction: column;
            gap: 0.9rem;
            box-sizing: border-box;
          }

          .set-price-product-info {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 10px;
            background: #f8fafc;
            border: 1px solid #f1f5f9;
            border-radius: 12px;
          }

          .set-price-thumb {
            width: 46px;
            height: 46px;
            border-radius: 10px;
            object-fit: cover;
            background: #f1f5f9;
            flex-shrink: 0;
          }

          .set-price-details {
            display: flex;
            flex-direction: column;
            min-width: 0;
          }

          .set-price-name {
            font-size: 0.9rem;
            font-weight: 700;
            color: #0f172a;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .set-price-cat {
            font-size: 0.74rem;
            color: #64748b;
            margin-top: 1px;
          }

          .set-price-master-box {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background: #f8fafc;
            border-radius: 10px;
            border: 1px dashed #cbd5e1;
          }

          .set-price-label {
            font-size: 0.8rem;
            font-weight: 700;
            color: #475569;
          }

          .set-price-master-val {
            font-size: 0.88rem;
            font-weight: 700;
            color: #0f172a;
          }

          .set-price-field-wrap {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .set-price-input-container {
            display: flex;
            align-items: center;
            border: 1.5px solid #0080ff;
            border-radius: 10px;
            padding: 0 12px;
            height: 44px;
            background: #ffffff;
            box-shadow: 0 0 0 3px rgba(0, 128, 255, 0.08);
            gap: 8px;
            transition: all 0.15s ease;
          }

          .set-price-input-container.error {
            border-color: #ef4444;
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.08);
          }

          .set-price-currency {
            font-size: 0.95rem;
            font-weight: 800;
            color: #0f172a;
          }

          .set-price-input {
            flex: 1;
            border: none;
            outline: none;
            font-size: 0.95rem;
            font-weight: 700;
            color: #0f172a;
            background: transparent;
          }

          .set-price-error-msg {
            font-size: 0.75rem;
            color: #ef4444;
            font-weight: 600;
          }

          .set-price-footer {
            padding: 0.85rem 1.25rem;
            background: #f8fafc;
            border-top: 1px solid #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 10px;
            box-sizing: border-box;
          }

          .set-price-cancel-btn {
            padding: 8px 16px;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            background: #ffffff;
            color: #475569;
            font-size: 0.84rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
          }

          .set-price-cancel-btn:hover {
            background: #f1f5f9;
            color: #0f172a;
          }

          .set-price-confirm-btn {
            padding: 8px 20px;
            border-radius: 8px;
            border: none;
            background: #0080ff;
            color: #ffffff;
            font-size: 0.84rem;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0, 128, 255, 0.25);
            transition: all 0.15s ease;
          }

          .set-price-confirm-btn:hover {
            background: #0066cc;
          }

          .item-trash-btn {
            background: transparent;
            border: none;
            padding: 4px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ef4444;
            flex-shrink: 0;
            transition: background 0.15s;
          }

          .item-trash-btn:hover {
            background: #fee2e2;
          }

          /* Footer */
          .add-menu-footer {
            padding: 1rem 1.75rem;
            background: #ffffff;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 12px;
            box-sizing: border-box;
          }

          .add-menu-skip-btn {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            color: #334155;
            font-weight: 600;
            font-size: 0.86rem;
            border-radius: 10px;
            padding: 10px 22px;
            cursor: pointer;
            transition: all 0.15s ease;
          }

          .add-menu-skip-btn:hover {
            background: #f1f5f9;
            border-color: #cbd5e1;
          }

          .add-menu-continue-btn {
            background: #0080ff;
            color: #ffffff;
            font-weight: 600;
            font-size: 0.86rem;
            border-radius: 10px;
            padding: 10px 26px;
            border: none;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(0, 128, 255, 0.25);
            transition: all 0.15s ease;
          }

          .add-menu-continue-btn:hover {
            background: #0066cc;
          }

          .add-menu-continue-btn:disabled,
          .add-menu-skip-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          /* Mobile & Tablet Responsive Styles */
          @media (max-width: 860px) {
            .add-menu-modal-backdrop {
              padding: 0.75rem;
            }

            .add-menu-modal-card {
              max-height: 94vh;
              border-radius: 16px;
              width: 100%;
            }

            .add-menu-header {
              padding: 1.25rem 1rem 0.75rem;
            }

            .add-menu-title {
              font-size: 1.15rem;
            }

            .add-menu-subtitle {
              font-size: 0.78rem;
            }

            .add-menu-body {
              grid-template-columns: 1fr;
              padding: 0 1rem 0.75rem;
              gap: 1.25rem;
            }

            .selected-name {
              max-width: 200px;
            }

            .add-menu-products-list {
              max-height: 240px;
            }

            .selected-items-scroll {
              max-height: 200px;
            }

            .add-menu-footer {
              padding: 0.75rem 1rem;
            }

            .add-menu-skip-btn,
            .add-menu-continue-btn {
              font-size: 0.82rem;
              padding: 8px 16px;
            }
          }
        `}</style>
      </div>
    </div>
  )
}
