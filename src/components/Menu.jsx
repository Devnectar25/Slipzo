import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Utensils,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  RefreshCw,
  ArrowLeft,
  Sparkles,
  Check,
  AlertCircle,
  Mic,
  Volume2
} from "lucide-react"
import { call, money, getCachedData, getStoredMenuItems, saveStoredMenuItems, getCurrentUserKey } from "../lib/utils"
import { useToast } from "./common/Toast"
import { Spinner } from "./common/Skeleton"
import { useTranslation } from "react-i18next"
import { useDbTranslation } from "../lib/translator"
import { VoiceInputButton } from "./common/VoiceInputButton"
import { useSpeechInput } from "../hooks/useSpeechInput"
import "../styles/Menu.css"

export function Menu({ setView, requireAuth, user }) {
  const { t } = useTranslation()
  const { tDb, formatNum } = useDbTranslation()
  const userKey = getCurrentUserKey(user)
  const { success: toastSuccess, error: toastError } = useToast()

  // View state: 'my_menu' (State A) | 'add_items' (State B)
  const [currentView, setCurrentView] = useState(() => {
    try {
      const requested = sessionStorage.getItem("slipzo_menu_initial_tab")
      if (requested) {
        sessionStorage.removeItem("slipzo_menu_initial_tab")
        return requested
      }
    } catch (_) {}
    return "my_menu"
  })

  useEffect(() => {
    try {
      const requested = sessionStorage.getItem("slipzo_menu_initial_tab")
      if (requested) {
        sessionStorage.removeItem("slipzo_menu_initial_tab")
        setCurrentView(requested)
      }
    } catch (_) {}
  }, [])

  // ==========================================
  // STATE A: "MY MENU" (Personal Menu)
  // ==========================================
  const cachedItems = getCachedData("/menu")
  const [items, setItems] = useState(() => {
    if (Array.isArray(cachedItems) && cachedItems.length > 0) return cachedItems
    const stored = getStoredMenuItems(user)
    return stored.length > 0 ? stored : []
  })
  const [loading, setLoading] = useState(() => !cachedItems && items.length === 0)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  // Edit personal item modal
  const [editingItem, setEditingItem] = useState(null)
  const [editPrice, setEditPrice] = useState("")
  const [editActive, setEditActive] = useState(true)
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false)

  // Delete item state
  const [deletingId, setDeletingId] = useState(null)

  // ==========================================
  // STATE B: "ADD ITEMS" (Master Catalog)
  // ==========================================
  const [catalogItems, setCatalogItems] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState("")
  const [catalogCategory, setCatalogCategory] = useState("all")

  // Add confirmation modal
  const [selectedCatalogItem, setSelectedCatalogItem] = useState(null)
  const [customPrice, setCustomPrice] = useState("")
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false)
  const [addFormError, setAddFormError] = useState("")

  // ==========================================
  // SPEECH RECOGNITION (Reusing existing hook)
  // ==========================================
  const {
    isListening,
    transcript,
    browserSupportsSpeech,
    errorMsg,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechInput()

  // Sync spoken transcript into search query
  useEffect(() => {
    if (transcript) {
      const clean = transcript.trim().replace(/\s*[.,!?;:]+$/, "").trim()
      if (currentView === "my_menu") {
        setSearch(clean)
      } else {
        setCatalogSearch(clean)
      }
    }
  }, [transcript, currentView])

  // Display toast if speech recognition encounters error
  useEffect(() => {
    if (errorMsg) {
      toastError(errorMsg || "Couldn't recognize speech. Please try again.")
    }
  }, [errorMsg])

  // Fetch logged-in user's personal menu
  const loadUserMenu = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true)
      const data = await call("/menu").catch(() => null)
      if (Array.isArray(data)) {
        setItems(data)
        saveStoredMenuItems(data, user)
      } else {
        const local = getStoredMenuItems(user)
        if (local.length > 0) setItems(local)
      }
    } catch (err) {
      console.warn("Failed to load user menu, using offline storage:", err)
      const local = getStoredMenuItems(user)
      if (local.length > 0) setItems(local)
    } finally {
      if (showSpinner) setLoading(false)
    }
  }

  // Fetch master catalog for adding items
  const loadMasterCatalog = async () => {
    try {
      setCatalogLoading(true)
      const data = await call("/menu/catalog").catch(() => null)
      if (Array.isArray(data)) {
        setCatalogItems(data)
      }
    } catch (err) {
      console.error("Failed to load master catalog:", err)
      toastError("Could not load available items catalog.")
    } finally {
      setCatalogLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadUserMenu()
      loadMasterCatalog()
    }
  }, [user, userKey])

  // When switching to Add Items view, fetch catalog if not loaded
  useEffect(() => {
    if (currentView === "add_items" && catalogItems.length === 0) {
      loadMasterCatalog()
    }
  }, [currentView, catalogItems.length])

  // Derive categories from User's items
  const userCategories = useMemo(() => {
    const set = new Set()
    items.forEach((it) => {
      if (it.category) set.add(it.category)
    })
    return ["all", ...Array.from(set)]
  }, [items])

  // Filter user menu items
  const filteredUserItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((it) => {
      const matchesSearch = !q ||
        (it.name || "").toLowerCase().includes(q) ||
        (it.category || "").toLowerCase().includes(q)
      const matchesCat = selectedCategory === "all" ||
        (it.category || "").toLowerCase() === selectedCategory.toLowerCase()
      return matchesSearch && matchesCat
    })
  }, [items, search, selectedCategory])

  // Derive categories from Master Catalog
  const catalogCategories = useMemo(() => {
    const set = new Set()
    catalogItems.forEach((it) => {
      if (it.category) set.add(it.category)
    })
    return ["all", ...Array.from(set)]
  }, [catalogItems])

  // Set of menu_item_ids currently in user's menu (for instant duplicate protection)
  const addedMenuItemIds = useMemo(() => {
    return new Set(items.map((i) => i.menu_item_id || i.id))
  }, [items])

  // Filter master catalog items (for Add by Voice & Menu Search)
  const filteredCatalogItemsForSearch = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return catalogItems.filter((it) => {
      const matchesSearch =
        (it.name || "").toLowerCase().includes(q) ||
        (it.category || "").toLowerCase().includes(q)
      const matchesCat = selectedCategory === "all" ||
        (it.category || "").toLowerCase() === selectedCategory.toLowerCase()
      return matchesSearch && matchesCat
    })
  }, [catalogItems, search, selectedCategory])

  // Filter master catalog items (for Add Items page)
  const filteredCatalogItems = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase()
    return catalogItems.filter((it) => {
      const matchesSearch = !q ||
        (it.name || "").toLowerCase().includes(q) ||
        (it.category || "").toLowerCase().includes(q)
      const matchesCat = catalogCategory === "all" ||
        (it.category || "").toLowerCase() === catalogCategory.toLowerCase()
      return matchesSearch && matchesCat
    })
  }, [catalogItems, catalogSearch, catalogCategory])

  // ==========================================
  // HANDLERS: ADD TO MENU CONFIRMATION
  // ==========================================
  const handleOpenAddModal = (catalogItem) => {
    setSelectedCatalogItem(catalogItem)
    // Default the selling price to the master catalog base price
    setCustomPrice(catalogItem.price !== undefined ? String(catalogItem.price) : "")
    setAddFormError("")
  }

  const handleCloseAddModal = () => {
    setSelectedCatalogItem(null)
    setCustomPrice("")
    setAddFormError("")
  }

  const handleConfirmAddToMenu = async (e) => {
    e?.preventDefault()
    if (!selectedCatalogItem) return

    const numPrice = parseFloat(customPrice)
    if (customPrice === "" || isNaN(numPrice) || numPrice < 0) {
      setAddFormError("Please enter a valid non-negative selling price.")
      return
    }

    setIsSubmittingAdd(true)
    setAddFormError("")

    try {
      const payload = {
        menu_item_id: selectedCatalogItem.id,
        custom_price: numPrice
      }

      const added = await call("/menu", {
        method: "POST",
        body: JSON.stringify(payload)
      })

      // Immediately add to user's personal items list
      setItems((prev) => {
        const next = [added, ...prev.filter(p => p.menu_item_id !== selectedCatalogItem.id && p.id !== added.id)]
        saveStoredMenuItems(next, user)
        return next
      })

      // Update catalog item status to Added
      setCatalogItems((prev) =>
        prev.map((it) =>
          it.id === selectedCatalogItem.id
            ? { ...it, is_added: true, user_price: numPrice, user_menu_item_id: added.id }
            : it
        )
      )

      toastSuccess(`Added "${selectedCatalogItem.name}" to My Menu at ${money(numPrice)}`)
      handleCloseAddModal()
    } catch (err) {
      console.error("Failed to add catalog item to user menu:", err)
      setAddFormError(err.detail || err.message || "Unable to add this item to your menu.")
      toastError(err.detail || err.message || "Unable to add this item.")
    } finally {
      setIsSubmittingAdd(false)
    }
  }

  // ==========================================
  // HANDLERS: EDIT USER SELLING PRICE
  // ==========================================
  const handleOpenEditModal = (userItem) => {
    setEditingItem(userItem)
    setEditPrice(userItem.price !== undefined ? String(userItem.price) : "")
    setEditActive(userItem.is_active !== undefined ? Boolean(userItem.is_active) : true)
  }

  const handleCloseEditModal = () => {
    setEditingItem(null)
    setEditPrice("")
  }

  const handleSaveEditPrice = async (e) => {
    e?.preventDefault()
    if (!editingItem) return

    const numPrice = parseFloat(editPrice)
    if (editPrice === "" || isNaN(numPrice) || numPrice < 0) {
      toastError("Please enter a valid price.")
      return
    }

    setIsUpdatingPrice(true)
    try {
      const updated = await call(`/menu/${editingItem.id}`, {
        method: "PUT",
        body: JSON.stringify({
          custom_price: numPrice,
          is_active: editActive
        })
      })

      setItems((prev) => {
        const next = prev.map((it) => (it.id === editingItem.id ? { ...it, ...updated, price: numPrice, custom_price: numPrice, is_active: editActive } : it))
        saveStoredMenuItems(next, user)
        return next
      })

      toastSuccess(`Updated price for "${editingItem.name}" to ${money(numPrice)}`)
      handleCloseEditModal()
    } catch (err) {
      console.error("Failed to update user price:", err)
      toastError(err.detail || err.message || "Unable to update selling price.")
    } finally {
      setIsUpdatingPrice(false)
    }
  }

  // ==========================================
  // HANDLERS: REMOVE FROM USER MENU
  // ==========================================
  const handleRemoveFromUserMenu = async (userItem) => {
    const itemName = userItem.name || "item"
    if (!window.confirm(`Remove "${itemName}" from your personal menu?\n\n(It will still remain available in the master catalog to add anytime).`)) {
      return
    }

    setDeletingId(userItem.id)
    try {
      await call(`/menu/${userItem.id}`, { method: "DELETE" })

      // Remove from user items
      setItems((prev) => {
        const next = prev.filter((it) => it.id !== userItem.id)
        saveStoredMenuItems(next, user)
        return next
      })

      // Reset catalog added state if available
      setCatalogItems((prev) =>
        prev.map((it) =>
          it.id === userItem.menu_item_id || it.id === userItem.id
            ? { ...it, is_added: false, user_price: null, user_menu_item_id: null }
            : it
        )
      )

      toastSuccess(`Removed "${itemName}" from My Menu`)
    } catch (err) {
      console.error("Failed to delete user menu item:", err)
      toastError("Unable to remove item from your menu.")
    } finally {
      setDeletingId(null)
    }
  }

  // Active categories for the pills row
  const activeCategories = search.trim() ? catalogCategories : userCategories

  // Voice recognition result handler
  const handleVoiceSearchResult = useCallback((spokenText) => {
    if (!spokenText) return
    const clean = spokenText.trim()
    if (currentView === "my_menu") {
      setSearch(clean)
    } else {
      setCatalogSearch(clean)
    }
  }, [currentView])

  // Toggle voice search directly without navigating away
  const handleToggleVoiceSearch = (e) => {
    e?.preventDefault()
    e?.stopPropagation()

    if (!browserSupportsSpeech) {
      toastError("Speech recognition is not supported in your current browser. Please try Google Chrome or Safari.")
      return
    }

    if (isListening) {
      stopListening()
    } else {
      resetTranscript()
      startListening()
    }
  }

  return (
    <div className="menu-page-container fade-in">
      {/* ====================================================================
          STATE A: MY MENU (User's Personal Menu)
          ==================================================================== */}
      {currentView === "my_menu" && (
        <>
          {/* Header */}
          <div className="menu-header-bar">
            <div className="menu-header-titles">
              <span className="menu-eyebrow">
                <Utensils size={13} /> {t("menu.eyebrow", "Slipzo Menu")}
              </span>
              <h1 className="menu-main-title">{t("menu.title", "Menu")}</h1>
              <p className="menu-sub-title">
                {t("menu.subtitle", "Manage the items you use for billing")}
              </p>
            </div>

            <div className="menu-header-actions">
              <button
                className="menu-primary-btn"
                onClick={() => {
                  setCurrentView("add_items")
                  setCatalogSearch("")
                }}
              >
                <Plus size={18} /> {t("menu.addItems", "Add Items")}
              </button>

              <button
                type="button"
                className={`menu-secondary-btn ${isListening ? "listening" : ""}`}
                onClick={handleToggleVoiceSearch}
                title={isListening ? t("menu.clickToStop", "Click to stop listening") : t("menu.addByVoice", "Add item by speaking its name")}
                style={isListening ? { borderColor: "#ef4444", background: "#fef2f2", color: "#dc2626" } : {}}
              >
                {isListening ? (
                  <>
                    <span className="speech-pulse-dot" />
                    <Volume2 size={16} className="speech-icon-anim" />
                    <span>{t("menu.listening", "Listening...")}</span>
                  </>
                ) : (
                  <>
                    <Mic size={17} /> <span>{t("menu.addByVoice", "Add by Voice")}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Search Bar + Voice Input */}
          <div className="menu-search-wrapper">
            <Search size={18} className="menu-search-icon" />
            <input
              type="text"
              className="menu-search-input"
              placeholder={isListening ? t("menu.listeningSpeak", "Listening... Speak the item name") : t("menu.searchUserMenu", "Search or speak to find in My Menu...")}
              value={isListening && transcript ? transcript : search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && !isListening && (
              <button className="menu-search-clear-btn" onClick={() => setSearch("")} title={t("bills.clearSearch", "Clear search")}>
                <X size={15} />
              </button>
            )}
            <button
              type="button"
              className={`menu-search-mic-btn ${isListening ? "listening" : ""}`}
              onClick={handleToggleVoiceSearch}
              title={isListening ? t("menu.clickToStop", "Listening... Click to stop") : t("menu.speakItemName", "Speak item name")}
            >
              {isListening ? (
                <Volume2 size={16} className="speech-icon-anim" />
              ) : (
                <Mic size={16} />
              )}
            </button>
          </div>

          {/* Category Filter Pills */}
          {activeCategories.length > 2 && (
            <div className="menu-category-pills-row">
              {activeCategories.map((cat) => {
                const isActive = selectedCategory.toLowerCase() === cat.toLowerCase()
                return (
                  <button
                    key={cat}
                    type="button"
                    className={`menu-category-pill ${isActive ? "active" : ""}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat === "all" ? (search.trim() ? t("menu.allCategories", "All Categories") : t("menu.allItems", "All Items")) : tDb(cat)}
                  </button>
                )
              })}
            </div>
          )}

          {/* Loading state */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "3.5rem 1rem" }}>
              <Spinner />
              <p style={{ color: "#64748b", marginTop: "1rem", fontSize: "0.92rem" }}>
                Loading your menu items...
              </p>
            </div>
          ) : search.trim() !== "" ? (
            /* ================================================================
               SEARCH / VOICE RESULTS (Catalog Items with Add / Added)
               ================================================================ */
            filteredCatalogItemsForSearch.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", background: "#ffffff", borderRadius: "14px", border: "1px dashed #cbd5e1" }}>
                <AlertCircle size={32} style={{ color: "#94a3b8", margin: "0 auto 0.75rem" }} />
                <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#0f172a", marginBottom: "0.25rem" }}>
                  No matching items found for "{search}"
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.88rem", marginBottom: "1rem" }}>
                  Try speaking another item name or search manually.
                </p>
                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="menu-primary-btn"
                    style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                    onClick={() => {
                      setSearch("")
                      resetTranscript()
                      startListening()
                    }}
                  >
                    <Mic size={15} /> Try Again
                  </button>
                  <button
                    type="button"
                    className="menu-secondary-btn"
                    style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                    onClick={() => setSearch("")}
                  >
                    Clear Search
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="menu-section-subheader">
                  <h3 className="menu-section-title">
                    Search Results
                    <span className="menu-items-count-badge">
                      {filteredCatalogItemsForSearch.length} found
                    </span>
                  </h3>
                  <button
                    className="menu-secondary-btn"
                    style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem" }}
                    onClick={() => setSearch("")}
                  >
                    Clear Search
                  </button>
                </div>

                <div className="menu-cards-grid">
                  {filteredCatalogItemsForSearch.map((catItem) => {
                    const isAlreadyAdded = catItem.is_added || addedMenuItemIds.has(catItem.id)
                    return (
                      <div
                        key={catItem.id}
                        className={`catalog-item-card ${isAlreadyAdded ? "already-added" : ""}`}
                      >
                        <div className="menu-card-image-box">
                          {catItem.image_url ? (
                            <img
                              src={catItem.image_url}
                              alt={catItem.name}
                              className="menu-card-image"
                              onError={(e) => {
                                e.target.style.display = "none"
                              }}
                            />
                          ) : (
                            <div className="menu-card-image-placeholder">
                              <Utensils size={22} />
                            </div>
                          )}
                          <span className="menu-card-cat-badge">{catItem.category || "General"}</span>
                        </div>

                        <div className="menu-card-details">
                          <h4 className="menu-card-item-name" title={catItem.name}>
                            {catItem.name}
                          </h4>
                          <div className="menu-card-price-row">
                            <span className="catalog-card-base-price">{money(catItem.price)}</span>
                          </div>
                        </div>

                        <div className="user-menu-card-actions">
                          {isAlreadyAdded ? (
                            <span className="catalog-card-added-badge">
                              <Check size={14} /> Added
                            </span>
                          ) : (
                            <button
                              className="catalog-card-add-btn"
                              onClick={() => handleOpenAddModal(catItem)}
                            >
                              <Plus size={15} /> Add
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )
          ) : items.length === 0 ? (
            /* ================================================================
               PHASE 3: EMPTY STATE (Clean, no master dummy items shown!)
               ================================================================ */
            <div className="menu-empty-state-card">
              <div className="menu-empty-icon-circle">
                <Utensils size={32} />
              </div>
              <h2 className="menu-empty-title">Your menu is empty</h2>
              <p className="menu-empty-desc">
                Add the items you use regularly to create bills faster without manual entry.
              </p>

              <div className="menu-empty-actions-row">
                <button
                  className="menu-primary-btn"
                  onClick={() => {
                    setCurrentView("add_items")
                    setCatalogSearch("")
                  }}
                >
                  <Plus size={18} /> {t("menu.addItems", "Add Items")}
                </button>

                <button
                  type="button"
                  className={`menu-secondary-btn ${isListening ? "listening" : ""}`}
                  onClick={handleToggleVoiceSearch}
                  title={isListening ? t("menu.clickToStop", "Click to stop listening") : t("menu.addByVoice", "Add item by speaking its name")}
                  style={isListening ? { borderColor: "#ef4444", background: "#fef2f2", color: "#dc2626" } : {}}
                >
                  {isListening ? (
                    <>
                      <span className="speech-pulse-dot" />
                      <Volume2 size={16} className="speech-icon-anim" />
                      <span>{t("menu.listening", "Listening...")}</span>
                    </>
                  ) : (
                    <>
                      <Mic size={17} /> <span>{t("menu.addByVoice", "Add by Voice")}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Step-by-step instruction guide */}
              <div className="menu-empty-guide-box">
                <div className="menu-empty-guide-header">{t("menu.quickGuide", "Quick 4-Step Guide")}</div>
                <ul className="menu-empty-guide-steps">
                  <li>
                    <span className="menu-empty-step-num">{formatNum(1)}</span>
                    <span>{t("menu.guideStep1", "Search or speak an item name")}</span>
                  </li>
                  <li>
                    <span className="menu-empty-step-num">{formatNum(2)}</span>
                    <span>{t("menu.guideStep2", "Select an item from the master catalog")}</span>
                  </li>
                  <li>
                    <span className="menu-empty-step-num">{formatNum(3)}</span>
                    <span>{t("menu.guideStep3", "Set your personal selling price")}</span>
                  </li>
                  <li>
                    <span className="menu-empty-step-num">{formatNum(4)}</span>
                    <span>{t("menu.guideStep4", "Add it to your menu for 1-click billing")}</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            /* ================================================================
               PHASE 12: USER MENU CARDS (My Menu List)
               ================================================================ */
            <>
              <div className="menu-section-subheader">
                <h3 className="menu-section-title">
                  {t("menu.myMenu", "My Menu")}
                  <span className="menu-items-count-badge">
                    {formatNum(filteredUserItems.length)} {filteredUserItems.length === 1 ? t("history.item", "item") : t("history.items", "items")}
                  </span>
                </h3>
              </div>

              <div className="menu-cards-grid">
                {filteredUserItems.map((item) => {
                  const isItemActive = item.is_active !== undefined ? Boolean(item.is_active) : true
                  return (
                    <div key={item.id} className="user-menu-card">
                      <div className="menu-card-image-box">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="menu-card-image"
                            onError={(e) => {
                              e.target.style.display = "none"
                            }}
                          />
                        ) : (
                          <div className="menu-card-image-placeholder">
                            <Utensils size={22} />
                          </div>
                        )}
                        <span className="menu-card-cat-badge">{tDb(item.category || "General")}</span>
                        {isItemActive && (
                          <span className="menu-card-status-pill">
                            <span className="menu-card-status-dot" /> {t("menu.active", "Active")}
                          </span>
                        )}
                      </div>

                      <div className="menu-card-details">
                        <h4 className="menu-card-item-name" title={item.name}>
                          {tDb(item.name)}
                        </h4>
                        <div className="menu-card-price-row">
                          <span className="menu-card-selling-price">{money(item.price)}</span>
                        </div>
                      </div>

                      <div className="user-menu-card-actions user-card-bottom-actions">
                        <button
                          className="menu-action-icon-btn edit-btn"
                          onClick={() => handleOpenEditModal(item)}
                          title={t("menu.editPrice", "Edit selling price")}
                        >
                          <Edit2 size={14} />
                          <span className="btn-label">{t("common.edit", "Edit")}</span>
                        </button>
                        <button
                          className="menu-action-icon-btn delete-btn"
                          onClick={() => handleRemoveFromUserMenu(item)}
                          disabled={deletingId === item.id}
                          title={t("menu.removeMenu", "Remove from My Menu")}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ====================================================================
          STATE B: ADD ITEMS FLOW (Catalog Search & Selection)
          ==================================================================== */}
      {currentView === "add_items" && (
        <>
          {/* Back Bar */}
          <div className="add-items-back-bar">
            <button
              className="add-items-back-btn"
              onClick={() => setCurrentView("my_menu")}
              title={t("menu.returnToMenu", "Return to My Menu")}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="add-items-header-title">{t("menu.addItems", "Add Items")}</h2>
              <p className="menu-sub-title">{t("menu.catalogSubtitle", "Search or speak to find items from the master catalog")}</p>
            </div>
          </div>

          {/* Search bar with voice input button */}
          <div className="menu-search-wrapper">
            <Search size={18} className="menu-search-icon" />
            <input
              type="text"
              className="menu-search-input"
              placeholder={t("menu.searchCatalogPlaceholder", "Search or speak to add items (e.g. Cold Coffee, Croissant)...")}
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              autoFocus
            />
            {catalogSearch && (
              <button className="menu-search-clear-btn" onClick={() => setCatalogSearch("")} title={t("bills.clearSearch", "Clear search")}>
                <X size={15} />
              </button>
            )}
            <VoiceInputButton
              onSpeechResult={handleVoiceSearchResult}
              variant="icon-only"
              placeholder={t("menu.speakItemName", "Speak item name")}
            />
          </div>

          {/* Category Filter Pills (Master Catalog) */}
          <div className="menu-category-pills-row">
            {catalogCategories.map((cat) => {
              const isActive = catalogCategory.toLowerCase() === cat.toLowerCase()
              return (
                <button
                  key={cat}
                  type="button"
                  className={`menu-category-pill ${isActive ? "active" : ""}`}
                  onClick={() => setCatalogCategory(cat)}
                >
                  {cat === "all" ? t("menu.allCategories", "All Categories") : tDb(cat)}
                </button>
              )
            })}
          </div>

          {/* Available Catalog Items */}
          <div className="menu-section-subheader">
            <h3 className="menu-section-title">
              {t("menu.availableItems", "Available Items")}
              <span className="menu-items-count-badge">
                {formatNum(filteredCatalogItems.length)} {t("menu.found", "found")}
              </span>
            </h3>
          </div>

          {catalogLoading ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <Spinner />
              <p style={{ color: "#64748b", marginTop: "1rem" }}>{t("menu.searchingCatalog", "Searching catalog...")}</p>
            </div>
          ) : filteredCatalogItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", background: "#ffffff", borderRadius: "14px", border: "1px dashed #cbd5e1" }}>
              <AlertCircle size={32} style={{ color: "#94a3b8", margin: "0 auto 0.75rem" }} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#0f172a", marginBottom: "0.25rem" }}>
                {t("menu.noMatchingItems", "No matching items found")}
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.88rem", marginBottom: "1rem" }}>
                {t("menu.noMatchingItemsDesc", "Try another search term, speak an item name, or pick a different category.")}
              </p>
              <button className="menu-secondary-btn" onClick={() => { setCatalogSearch(""); setCatalogCategory("all"); }}>
                {t("menu.resetFilters", "Reset Filters")}
              </button>
            </div>
          ) : (
            <div className="menu-cards-grid">
              {filteredCatalogItems.map((catItem) => {
                const isAlreadyAdded = catItem.is_added || addedMenuItemIds.has(catItem.id)
                return (
                  <div
                    key={catItem.id}
                    className={`catalog-item-card ${isAlreadyAdded ? "already-added" : ""}`}
                  >
                    <div className="menu-card-image-box">
                      {catItem.image_url ? (
                        <img
                          src={catItem.image_url}
                          alt={catItem.name}
                          className="menu-card-image"
                          onError={(e) => {
                            e.target.style.display = "none"
                          }}
                        />
                      ) : (
                        <div className="menu-card-image-placeholder">
                          <Utensils size={22} />
                        </div>
                      )}
                      <span className="menu-card-cat-badge">{tDb(catItem.category || "General")}</span>
                    </div>

                    <div className="menu-card-details">
                      <h4 className="menu-card-item-name" title={catItem.name}>
                        {tDb(catItem.name)}
                      </h4>
                      <div className="menu-card-price-row">
                        <span className="catalog-card-base-price">{money(catItem.price)}</span>
                      </div>
                    </div>

                    <div className="user-menu-card-actions">
                      {isAlreadyAdded ? (
                        <span className="catalog-card-added-badge">
                          <Check size={14} /> {t("menu.added", "Added")}
                        </span>
                      ) : (
                        <button
                          className="catalog-card-add-btn"
                          onClick={() => handleOpenAddModal(catItem)}
                        >
                          <Plus size={15} /> {t("menu.add", "Add")}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ====================================================================
          PHASE 8: ADD TO MY MENU CONFIRMATION MODAL
          ==================================================================== */}
      {selectedCatalogItem && (
        <div className="menu-modal-backdrop" onClick={handleCloseAddModal}>
          <div className="menu-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="menu-modal-header">
              <h3 className="menu-modal-title">{t("menu.addToMyMenu", "Add to My Menu")}</h3>
              <button className="menu-modal-close-btn" onClick={handleCloseAddModal}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmAddToMenu}>
              <div className="menu-modal-body">
                {/* Item Preview */}
                <div className="menu-modal-item-preview">
                  {selectedCatalogItem.image_url ? (
                    <img
                      src={selectedCatalogItem.image_url}
                      alt={selectedCatalogItem.name}
                      className="menu-modal-preview-img"
                      onError={(e) => {
                        e.target.style.display = "none"
                      }}
                    />
                  ) : (
                    <div className="menu-card-image-placeholder" style={{ width: "60px", height: "60px" }}>
                      <Utensils size={24} />
                    </div>
                  )}
                  <div className="menu-modal-preview-details">
                    <h4 className="menu-modal-preview-name">{tDb(selectedCatalogItem.name)}</h4>
                    <span className="menu-card-cat-badge">{tDb(selectedCatalogItem.category)}</span>
                    <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.2rem" }}>
                      {t("menu.catalogBasePrice", "Catalog base price:")} <strong>{money(selectedCatalogItem.price)}</strong>
                    </div>
                  </div>
                </div>

                {/* Custom Selling Price Input */}
                <div className="menu-modal-field">
                  <label className="menu-modal-label">{t("menu.yourSellingPrice", "Your Selling Price (₹) *")}</label>
                  <div className="menu-modal-price-input-box">
                    <span className="menu-modal-currency-symbol">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="menu-modal-input"
                      placeholder={t("menu.enterSellingPrice", "Enter selling price")}
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                  <span style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "0.3rem", display: "block" }}>
                    {t("menu.pricePersonalNote", "This price is personal to your shop and will appear on your customer receipts.")}
                  </span>
                </div>

                {addFormError && (
                  <div style={{ color: "#ef4444", fontSize: "0.84rem", marginTop: "0.5rem" }}>
                    {addFormError}
                  </div>
                )}
              </div>

              <div className="menu-modal-footer">
                <button
                  type="button"
                  className="menu-secondary-btn"
                  onClick={handleCloseAddModal}
                  disabled={isSubmittingAdd}
                >
                  {t("common.cancel", "Cancel")}
                </button>
                <button
                  type="submit"
                  className="menu-primary-btn"
                  disabled={isSubmittingAdd}
                >
                  {isSubmittingAdd ? t("menu.adding", "Adding...") : t("menu.addToMenu", "Add to Menu")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          PHASE 13: EDIT PERSONAL SELLING PRICE MODAL
          ==================================================================== */}
      {editingItem && (
        <div className="menu-modal-backdrop" onClick={handleCloseEditModal}>
          <div className="menu-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="menu-modal-header">
              <h3 className="menu-modal-title">{t("menu.editSellingPrice", "Edit Selling Price")}</h3>
              <button className="menu-modal-close-btn" onClick={handleCloseEditModal}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditPrice}>
              <div className="menu-modal-body">
                <div className="menu-modal-item-preview">
                  {editingItem.image_url ? (
                    <img
                      src={editingItem.image_url}
                      alt={editingItem.name}
                      className="menu-modal-preview-img"
                    />
                  ) : (
                    <div className="menu-card-image-placeholder" style={{ width: "52px", height: "52px" }}>
                      <Utensils size={20} />
                    </div>
                  )}
                  <div className="menu-modal-preview-details">
                    <h4 className="menu-modal-preview-name">{tDb(editingItem.name)}</h4>
                    <span className="menu-card-cat-badge">{tDb(editingItem.category)}</span>
                  </div>
                </div>

                <div className="menu-modal-field">
                  <label className="menu-modal-label">{t("menu.yourSellingPrice", "Your Selling Price (₹) *")}</label>
                  <div className="menu-modal-price-input-box">
                    <span className="menu-modal-currency-symbol">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="menu-modal-input"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.75rem" }}>
                  <input
                    type="checkbox"
                    id="item-active-check"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    style={{ width: "16px", height: "16px", accentColor: "#0284c7" }}
                  />
                  <label htmlFor="item-active-check" style={{ fontSize: "0.85rem", color: "#334155", fontWeight: "600", cursor: "pointer" }}>
                    {t("menu.activeAvailable", "Active (Available for quick billing)")}
                  </label>
                </div>
              </div>

              <div className="menu-modal-footer">
                <button
                  type="button"
                  className="menu-secondary-btn"
                  onClick={handleCloseEditModal}
                  disabled={isUpdatingPrice}
                >
                  {t("common.cancel", "Cancel")}
                </button>
                <button
                  type="submit"
                  className="menu-primary-btn"
                  disabled={isUpdatingPrice}
                >
                  {isUpdatingPrice ? t("common.saving", "Saving...") : t("common.saveChanges", "Save Changes")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
