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
  Volume2,
  SlidersHorizontal,
  Heart,
  ChevronDown,
  ArrowUpDown,
  LayoutGrid,
  Coffee,
  Croissant,
  Pizza,
  Soup,
  UtensilsCrossed
} from "lucide-react"
import { call, money, getCachedData, getStoredMenuItems, saveStoredMenuItems, getCurrentUserKey, invalidateApiCache, DEFAULT_SHOP_MENU_ITEMS } from "../lib/utils"
import { useToast } from "./common/Toast"
import { Spinner } from "./common/Skeleton"
import { useTranslation } from "react-i18next"
import { useDbTranslation } from "../lib/translator"
import { VoiceInputButton } from "./common/VoiceInputButton"
import { useSpeechInput } from "../hooks/useSpeechInput"
import "../styles/Menu.css"

const FALLBACK_MASTER_CATALOG = [
  ...DEFAULT_SHOP_MENU_ITEMS,
  {
    id: "catalog_masala_tea",
    name: "Masala Tea",
    category: "Beverages",
    price: 20.00,
    image_url: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=400&q=80",
    is_active: true
  },
  {
    id: "catalog_cold_coffee",
    name: "Cold Coffee",
    category: "Beverages",
    price: 75.00,
    image_url: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=400&q=80",
    is_active: true
  },
  {
    id: "catalog_margherita_pizza",
    name: "Margherita Pizza",
    category: "Snacks",
    price: 140.00,
    image_url: "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=400&q=80",
    is_active: true
  },
  {
    id: "catalog_veg_burger",
    name: "Veg Burger",
    category: "Snacks",
    price: 80.00,
    image_url: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=400&q=80",
    is_active: true
  },
  {
    id: "catalog_french_fries",
    name: "French Fries",
    category: "Snacks",
    price: 65.00,
    image_url: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=400&q=80",
    is_active: true
  },
  {
    id: "catalog_samosa",
    name: "Samosa (2 pcs)",
    category: "Snacks",
    price: 30.00,
    image_url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80",
    is_active: true
  }
]

function MenuImageThumbnail({ src, alt, className = "mob-item-thumb", wrapClassName = "mob-item-thumb-wrap", iconSize = 22 }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  return (
    <div className={wrapClassName}>
      {src && !failed ? (
        <img
          src={src}
          alt={alt || "Item"}
          className={className}
          onError={() => setFailed(true)}
          loading="lazy"
        />
      ) : (
        <div className="menu-thumb-fallback-icon">
          <Utensils size={iconSize} />
        </div>
      )}
    </div>
  )
}

export function Menu({ setView, requireAuth, user }) {
  const { t } = useTranslation()
  const { tDb, formatNum } = useDbTranslation()
  const userKey = getCurrentUserKey(user)
  const { success: toastSuccess, error: toastError } = useToast()

  // View state: 'my_menu' (Shop Menu) | 'add_items' (Catalog Grid)
  const [currentView, setCurrentView] = useState("my_menu")

  // ==========================================
  // STATE A: "MY MENU" (Personal Menu)
  // ==========================================
  const cachedItems = getCachedData("/menu")
  const [items, setItems] = useState(() => {
    if (Array.isArray(cachedItems) && cachedItems.length > 0) return cachedItems
    const stored = getStoredMenuItems(user)
    return stored.length > 0 ? stored : DEFAULT_SHOP_MENU_ITEMS
  })
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [myMenuSort, setMyMenuSort] = useState("Latest")
  const [sortOpen, setSortOpen] = useState(false)

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
  const [catalogSort, setCatalogSort] = useState("Popular")
  const [filterOpen, setFilterOpen] = useState(false)
  const [favorites, setFavorites] = useState(() => new Set())

  // Add confirmation modal
  const [selectedCatalogItem, setSelectedCatalogItem] = useState(null)
  const [customPrice, setCustomPrice] = useState("")
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false)
  const [addFormError, setAddFormError] = useState("")

  // ==========================================
  // SPEECH RECOGNITION
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

  useEffect(() => {
    if (errorMsg) {
      toastError(errorMsg || "Couldn't recognize speech. Please try again.")
    }
  }, [errorMsg])

  // Fetch logged-in user's personal menu
  const loadUserMenu = async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true)
      const data = await call("/menu").catch(() => null)
      if (Array.isArray(data) && data.length > 0) {
        setItems(data)
        saveStoredMenuItems(data, user)
      } else {
        const local = getStoredMenuItems(user)
        if (local.length > 0) setItems(local)
      }
    } catch (err) {
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
      if (Array.isArray(data) && data.length > 0) {
        setCatalogItems(data)
      } else {
        setCatalogItems(FALLBACK_MASTER_CATALOG)
      }
    } catch (err) {
      console.warn("Could not load master catalog from API, using fallback:", err)
      setCatalogItems(FALLBACK_MASTER_CATALOG)
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

  useEffect(() => {
    if (currentView === "add_items") {
      loadMasterCatalog()
    }
  }, [currentView])

  // Extract categories dynamically from user's actual personal menu items
  const myMenuCategories = useMemo(() => {
    const set = new Set()
    items.forEach((it) => {
      if (it.category && typeof it.category === "string" && it.category.trim()) {
        set.add(it.category.trim())
      }
    })
    const list = [{ id: "all", label: "All Items", icon: <LayoutGrid size={15} /> }]
    const getCategoryIcon = (catName) => {
      const lower = String(catName || "").toLowerCase()
      if (lower.includes("baker") || lower.includes("bread") || lower.includes("croissant")) return <Croissant size={15} />
      if (lower.includes("beverag") || lower.includes("drink") || lower.includes("coffee") || lower.includes("tea") || lower.includes("milk")) return <Coffee size={15} />
      if (lower.includes("break") || lower.includes("paratha")) return <Utensils size={15} />
      if (lower.includes("snack") || lower.includes("sandwich") || lower.includes("burger") || lower.includes("pizza") || lower.includes("fries")) return <Pizza size={15} />
      if (lower.includes("main") || lower.includes("course") || lower.includes("meal") || lower.includes("curry") || lower.includes("rice")) return <Soup size={15} />
      return <UtensilsCrossed size={15} />
    }
    Array.from(set).forEach((cat) => {
      list.push({
        id: cat,
        label: cat,
        icon: getCategoryIcon(cat)
      })
    })
    return list
  }, [items])

  // Extract categories dynamically from user's actual master catalog items
  const catalogCategories = useMemo(() => {
    const set = new Set()
    catalogItems.forEach((it) => {
      if (it.category && typeof it.category === "string" && it.category.trim()) {
        set.add(it.category.trim())
      }
    })
    const list = [{ id: "all", label: "All" }]
    Array.from(set).forEach((cat) => {
      list.push({ id: cat, label: cat })
    })
    return list
  }, [catalogItems])

  // Added item ids
  const addedMenuItemIds = useMemo(() => {
    return new Set(items.map((i) => i.menu_item_id || i.id))
  }, [items])

  // Filter & sort user menu items from actual items
  const filteredUserItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    let res = items.filter((it) => {
      const matchesSearch = !q ||
        (it.name || "").toLowerCase().includes(q) ||
        (it.category || "").toLowerCase().includes(q)
      const matchesCat = selectedCategory === "all" ||
        (it.category || "").toLowerCase() === selectedCategory.toLowerCase()
      return matchesSearch && matchesCat
    })

    if (myMenuSort === "Price: Low to High") {
      res = [...res].sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
    } else if (myMenuSort === "Price: High to Low") {
      res = [...res].sort((a, b) => Number(b.price || 0) - Number(a.price || 0))
    } else if (myMenuSort === "Name") {
      res = [...res].sort((a, b) => (a.name || "").localeCompare(b.name || ""))
    }
    return res
  }, [items, search, selectedCategory, myMenuSort])

  // Filter & sort catalog items purely from authentic catalogItems
  const filteredCatalogItems = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase()
    let res = catalogItems.filter((it) => {
      const matchesSearch = !q ||
        (it.name || "").toLowerCase().includes(q) ||
        (it.category || "").toLowerCase().includes(q)
      const matchesCat = catalogCategory === "all" ||
        (it.category || "").toLowerCase() === catalogCategory.toLowerCase()
      return matchesSearch && matchesCat
    })

    if (catalogSort === "Price: Low to High") {
      res = [...res].sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
    } else if (catalogSort === "Price: High to Low") {
      res = [...res].sort((a, b) => Number(b.price || 0) - Number(a.price || 0))
    } else if (catalogSort === "Popular") {
      res = [...res].sort((a, b) => (favorites.has(b.id) ? 1 : 0) - (favorites.has(a.id) ? 1 : 0))
    }
    return res
  }, [catalogItems, catalogSearch, catalogCategory, catalogSort, favorites])

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleQuickAdd = async (catItem) => {
    const isAlreadyAdded = catItem.is_added || addedMenuItemIds.has(catItem.id)
    if (isAlreadyAdded) {
      toastSuccess(`"${catItem.name}" is already in your menu`)
      return
    }

    try {
      const added = await call("/menu", {
        method: "POST",
        body: JSON.stringify({
          menu_item_id: catItem.id,
          name: catItem.name,
          category: catItem.category,
          custom_price: Number(catItem.price || 0),
          image_url: catItem.image_url || ""
        })
      }).catch(() => null)

      const newItem = {
        id: added?.id || `user_${Date.now()}`,
        menu_item_id: catItem.id,
        name: catItem.name,
        category: catItem.category || "General",
        price: Number(catItem.price || 0),
        custom_price: Number(catItem.price || 0),
        is_active: true,
        image_url: catItem.image_url || ""
      }

      setItems((prev) => {
        const next = [newItem, ...prev]
        saveStoredMenuItems(next, user)
        return next
      })

      toastSuccess(`Added "${catItem.name}" to My Menu!`)
    } catch (err) {
      toastError("Failed to add item to menu.")
    }
  }

  const handleOpenAddModal = (catalogItem) => {
    setSelectedCatalogItem(catalogItem)
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
    try {
      const added = await call("/menu", {
        method: "POST",
        body: JSON.stringify({
          menu_item_id: selectedCatalogItem.id,
          name: selectedCatalogItem.name,
          category: selectedCatalogItem.category,
          custom_price: numPrice,
          image_url: selectedCatalogItem.image_url || ""
        })
      }).catch(() => null)

      const newItem = {
        id: added?.id || `user_${Date.now()}`,
        menu_item_id: selectedCatalogItem.id,
        name: selectedCatalogItem.name,
        category: selectedCatalogItem.category,
        price: numPrice,
        custom_price: numPrice,
        is_active: true,
        image_url: selectedCatalogItem.image_url || ""
      }

      setItems((prev) => {
        const next = [newItem, ...prev]
        saveStoredMenuItems(next, user)
        return next
      })

      toastSuccess(`Added "${selectedCatalogItem.name}" to My Menu!`)
      handleCloseAddModal()
    } catch (err) {
      toastError("Failed to add item to menu.")
    } finally {
      setIsSubmittingAdd(false)
    }
  }

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
      await call(`/menu/${editingItem.id}`, {
        method: "PUT",
        body: JSON.stringify({
          custom_price: numPrice,
          is_active: editActive
        })
      }).catch(() => null)

      setItems((prev) => {
        const next = prev.map((it) => (it.id === editingItem.id ? { ...it, price: numPrice, custom_price: numPrice, is_active: editActive } : it))
        saveStoredMenuItems(next, user)
        return next
      })

      toastSuccess(`Updated "${editingItem.name}"`)
      handleCloseEditModal()
    } catch (err) {
      toastError("Unable to update selling price.")
    } finally {
      setIsUpdatingPrice(false)
    }
  }

  const handleRemoveFromUserMenu = async (userItem) => {
    const itemName = userItem.name || "item"
    if (!window.confirm(`Remove "${itemName}" from your menu?`)) {
      return
    }

    setDeletingId(userItem.id)
    try {
      await call(`/menu/${userItem.id}`, { method: "DELETE" }).catch(() => null)

      setItems((prev) => {
        const next = prev.filter((it) => it.id !== userItem.id)
        saveStoredMenuItems(next, user)
        return next
      })

      toastSuccess(`Removed "${itemName}" from My Menu`)
    } catch (err) {
      toastError("Unable to remove item from your menu.")
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleVoiceSearch = (e) => {
    e?.preventDefault()
    e?.stopPropagation()

    if (!browserSupportsSpeech) {
      toastError("Speech recognition is not supported in this browser.")
      return
    }

    if (isListening) {
      stopListening()
    } else {
      resetTranscript()
      startListening()
    }
  }

  const getCategoryBadgeClass = (category) => {
    const c = String(category || "").toLowerCase()
    if (c.includes("bakery")) return "cat-badge-bakery"
    if (c.includes("beverag") || c.includes("drink") || c.includes("coffee") || c.includes("tea") || c.includes("milk")) return "cat-badge-beverages"
    if (c.includes("snack") || c.includes("sandwich")) return "cat-badge-snacks"
    if (c.includes("break") || c.includes("paratha")) return "cat-badge-breakfast"
    if (c.includes("main") || c.includes("naan") || c.includes("course") || c.includes("meal")) return "cat-badge-main-course"
    if (c.includes("groc")) return "cat-badge-groceries"
    if (c.includes("elect")) return "cat-badge-electronics"
    return "cat-badge-default"
  }

  return (
    <div className="menu-page-container fade-in">
      {/* ====================================================================
          📱 MOBILE VIEW: Pixel-perfect match with User's Uploaded Images
          ==================================================================== */}
      <div className="mobile-menu-layout">
        {currentView === "my_menu" ? (
          /* ================================================================
             IMAGE 2: Shop Menu List View
             ================================================================ */
          <div className="mob-shop-menu-view">
            {/* Top Action Bar */}
            <div className="mob-menu-top-header">
              <div className="mob-menu-eyebrow-pill">
                <Utensils size={13} />
                <span>SHOP MENU</span>
              </div>
              <div className="mob-menu-top-actions">
                <button
                  type="button"
                  className="mob-menu-add-item-btn"
                  onClick={() => setCurrentView("add_items")}
                >
                  <Plus size={16} />
                  <span>Add Item</span>
                </button>
                <button
                  type="button"
                  className={`mob-menu-voice-btn ${isListening ? "listening" : ""}`}
                  onClick={handleToggleVoiceSearch}
                >
                  <Mic size={15} />
                  <span>{isListening ? "Listening..." : "Add by Voice"}</span>
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mob-menu-search-bar">
              <Search size={18} className="mob-search-icon" />
              <input
                type="text"
                value={isListening && transcript ? transcript : search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search menu items (e.g. coffee, milk, bread...)"
              />
              <button
                type="button"
                className={`mob-search-mic-btn ${isListening ? "listening" : ""}`}
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
                    key={cat.id}
                    type="button"
                    className={`mob-category-chip ${isActive ? "active" : ""}`}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat === "all" ? (search.trim() ? t("menu.allCategories", "All Categories") : t("menu.allItems", "All Items")) : tDb(cat)}
                  </button>
                )
              })}
            </div>

            {/* Section Subheader: My Menu count & Sort */}
            <div className="mob-menu-subheader">
              <div className="mob-menu-count-wrap">
                <h3 className="mob-menu-heading">My Menu</h3>
                <span className="mob-menu-count-badge">
                  {filteredUserItems.length} {filteredUserItems.length === 1 ? "item" : "items"}
                </span>
              </div>
              <div className="mob-menu-sort-wrapper">
                <button
                  type="button"
                  className="mob-menu-sort-btn"
                  onClick={() => setSortOpen((prev) => !prev)}
                >
                  <ArrowUpDown size={14} />
                  <span>{myMenuSort}</span>
                  <ChevronDown size={14} />
                </button>
                {sortOpen && (
                  <div className="mob-menu-sort-dropdown">
                    {["Latest", "Popular", "Name", "Price: Low to High", "Price: High to Low"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setMyMenuSort(opt)
                          setSortOpen(false)
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Menu Items List */}
            <div className="mob-menu-list">
              {loading ? (
                <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
                  <Spinner />
                  <p style={{ color: "#64748b", marginTop: "0.75rem", fontSize: "0.88rem" }}>Loading menu items...</p>
                </div>
              ) : filteredUserItems.length === 0 ? (
                <div className="mob-menu-empty-card">
                  <Utensils size={32} style={{ color: "#94a3b8", margin: "0 auto 0.5rem" }} />
                  <h4 style={{ fontSize: "1rem", fontWeight: "700", color: "#0C1F41", margin: "0 0 0.25rem" }}>
                    {search ? "No matching items found" : "Your menu is empty"}
                  </h4>
                  <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 0.75rem", textAlign: "center" }}>
                    {search ? "Try another search term or reset filters." : "Tap \"Add Item\" to choose items from the catalog."}
                  </p>
                  {search ? (
                    <button
                      type="button"
                      className="mob-menu-reset-btn"
                      onClick={() => { setSearch(""); setSelectedCategory("all"); }}
                    >
                      Reset Search
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="mob-menu-reset-btn"
                      onClick={() => setCurrentView("add_items")}
                    >
                      <Plus size={14} style={{ marginRight: "4px" }} /> Add Items
                    </button>
                  )}
                </div>
              ) : (
                filteredUserItems.map((item) => {
                  const isItemActive = item.is_active !== undefined ? Boolean(item.is_active) : true
                  return (
                    <div key={item.id} className="mob-menu-item-card">
                      <MenuImageThumbnail
                        src={item.image_url}
                        alt={item.name}
                        className="mob-item-thumb"
                        wrapClassName="mob-item-thumb-wrap"
                        iconSize={24}
                      />

                      <div className="mob-item-details">
                        <h4 className="mob-item-name">{item.name}</h4>
                        <span className={`mob-item-cat-badge ${getCategoryBadgeClass(item.category)}`}>
                          {item.category || "General"}
                        </span>
                        <div className="mob-item-price-status">
                          <span className="mob-item-price">{money(item.price)}</span>
                          {isItemActive && (
                            <span className="mob-item-active-status">
                              <span className="mob-status-dot" /> Active
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mob-item-actions">
                        <button
                          type="button"
                          className="mob-item-edit-btn"
                          onClick={() => handleOpenEditModal(item)}
                          title="Edit selling price"
                          aria-label="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          className="mob-item-delete-btn"
                          onClick={() => handleRemoveFromUserMenu(item)}
                          disabled={deletingId === item.id}
                          title="Remove from My Menu"
                          aria-label="Delete"
                        >
                          {deletingId === item.id ? <Spinner size="xs" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        ) : (
          /* ================================================================
             IMAGE 1: Catalog 2-Column Grid View
             ================================================================ */
          <div className="mob-catalog-grid-view">
            {/* Search Bar + Filter Icon Button */}
            <div className="mob-catalog-search-row">
              <div className="mob-catalog-search-input-box">
                <Search size={18} className="mob-search-icon" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Search items..."
                />
                <button
                  type="button"
                  className={`mob-search-mic-btn-inline ${isListening ? "listening" : ""}`}
                  onClick={handleToggleVoiceSearch}
                  title="Voice Search"
                >
                  <Mic size={16} />
                </button>
              </div>
              <button
                type="button"
                className="mob-catalog-filter-btn"
                onClick={() => setFilterOpen((prev) => !prev)}
                title="Filter Options"
              >
                <SlidersHorizontal size={18} />
              </button>
            </div>

            {/* Category Chips + Grid/List View Toggle Button */}
            <div className="mob-catalog-categories-row">
              <div className="mob-catalog-chips-scroll">
                {catalogCategories.map((cat) => {
                  const isActive = catalogCategory.toLowerCase() === cat.id.toLowerCase()
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className={`mob-catalog-chip ${isActive ? "active" : ""}`}
                      onClick={() => setCatalogCategory(cat.id)}
                    >
                      {cat.label}
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                className="mob-catalog-view-toggle-btn"
                onClick={() => setCurrentView("my_menu")}
                title="Toggle View"
              >
                <LayoutGrid size={18} />
              </button>
            </div>

            {/* Filter & Sort Controls Row */}
            <div className="mob-catalog-filter-sort-row">
              <div className="mob-dropdown-relative">
                <button
                  type="button"
                  className="mob-filter-sort-pill"
                  onClick={() => setFilterOpen((prev) => !prev)}
                >
                  <span>Filter</span>
                  <ChevronDown size={14} />
                </button>
              </div>

              <div className="mob-dropdown-relative">
                <button
                  type="button"
                  className="mob-filter-sort-pill"
                  onClick={() => setSortOpen((prev) => !prev)}
                >
                  <span>Sort : {catalogSort}</span>
                  <ChevronDown size={14} />
                </button>
                {sortOpen && (
                  <div className="mob-catalog-sort-menu">
                    {["Popular", "Latest", "Price: Low to High", "Price: High to Low"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setCatalogSort(s)
                          setSortOpen(false)
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 2-Column Catalog Cards Grid */}
            {catalogLoading ? (
              <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
                <Spinner />
                <p style={{ color: "#64748b", marginTop: "0.75rem", fontSize: "0.88rem" }}>Loading catalog...</p>
              </div>
            ) : filteredCatalogItems.length === 0 ? (
              <div className="mob-menu-empty-card">
                <AlertCircle size={32} style={{ color: "#94a3b8", margin: "0 auto 0.5rem" }} />
                <h4 style={{ fontSize: "1rem", fontWeight: "700", color: "#0C1F41", margin: "0 0 0.25rem" }}>
                  No catalog items found
                </h4>
                <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 0.75rem", textAlign: "center" }}>
                  {catalogSearch ? "Try adjusting your search or category." : "No items available in the catalog."}
                </p>
                {catalogSearch && (
                  <button
                    type="button"
                    className="mob-menu-reset-btn"
                    onClick={() => { setCatalogSearch(""); setCatalogCategory("all"); }}
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="mob-catalog-2col-grid">
                {filteredCatalogItems.map((catItem) => {
                  const isFav = favorites.has(catItem.id)
                  const isAlreadyAdded = catItem.is_added || addedMenuItemIds.has(catItem.id)
                  return (
                    <div key={catItem.id} className="mob-catalog-card">
                      <div className="mob-catalog-image-wrap">
                        {catItem.image_url ? (
                          <img
                            src={catItem.image_url}
                            alt={catItem.name}
                            className="mob-catalog-image"
                            onError={(e) => { e.target.style.display = "none" }}
                          />
                        ) : (
                          <div className="mob-catalog-image-placeholder">
                            <Utensils size={24} />
                          </div>
                        )}
                        <button
                          type="button"
                          className={`mob-catalog-heart-btn ${isFav ? "favorited" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite(catItem.id)
                          }}
                          aria-label="Favorite"
                        >
                          <Heart
                            size={15}
                            fill={isFav ? "#EF4444" : "none"}
                            color={isFav ? "#EF4444" : "#475569"}
                          />
                        </button>
                      </div>

                      <h4 className="mob-catalog-item-name">{catItem.name}</h4>

                      <div className="mob-catalog-card-bottom">
                        <span className="mob-catalog-price">{money(catItem.price)}</span>
                        <button
                          type="button"
                          className={`mob-catalog-add-btn ${isAlreadyAdded ? "added" : ""}`}
                          onClick={() => handleQuickAdd(catItem)}
                        >
                          {isAlreadyAdded ? (
                            <>
                              <Check size={13} style={{ strokeWidth: 2.5 }} />
                              <span>Added</span>
                            </>
                          ) : (
                            <span>Add</span>
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ====================================================================
          💻 DESKTOP VIEW (> 768px): Preserved for Desktop Displays
          ==================================================================== */}
      <div className="desktop-menu-layout">
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

            {/* Menu Cards Grid */}
            <div className="menu-section-subheader">
              <h3 className="menu-section-title">
                My Menu
                <span className="menu-items-count-badge">
                  {filteredUserItems.length} {filteredUserItems.length === 1 ? "item" : "items"}
                </span>
              </h3>
            </div>

                        <div className="menu-card-details">
                          <h4 className="menu-card-item-name" title={item.name}>
                            {tDb(item.name)}
                          </h4>
                          <span className="menu-card-cat-badge">{tDb(item.category || "General")}</span>
                          <div className="menu-card-price-row">
                            <span className="menu-card-selling-price">{money(item.price)}</span>
                            {isItemActive && (
                              <span className="menu-card-status-pill">
                                <span className="menu-card-status-dot" /> {t("menu.active", "Active")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="user-menu-card-actions">
                        <button
                          className="menu-action-icon-btn"
                          onClick={() => handleOpenEditModal(item)}
                          title={t("menu.editPrice", "Edit selling price")}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          className="menu-action-icon-btn delete-btn"
                          onClick={() => handleRemoveFromUserMenu(item)}
                          disabled={deletingId === item.id}
                          title={t("menu.removeMenu", "Remove from My Menu")}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

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
          </>
        )}

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

            {/* Available Catalog Items */}
            <div className="menu-cards-grid">
              {filteredCatalogItems.map((catItem) => {
                const isAlreadyAdded = catItem.is_added || addedMenuItemIds.has(catItem.id)
                return (
                  <div
                    key={catItem.id}
                    className={`catalog-item-card ${isAlreadyAdded ? "already-added" : ""}`}
                  >
                    <div className="user-menu-card-left">
                      <MenuImageThumbnail
                        src={catItem.image_url}
                        alt={catItem.name}
                        className="menu-card-image"
                        wrapClassName="menu-card-image-wrap"
                        iconSize={24}
                      />

                      <div className="menu-card-details">
                        <h4 className="menu-card-item-name" title={catItem.name}>
                          {tDb(catItem.name)}
                        </h4>
                        <span className="menu-card-cat-badge">{tDb(catItem.category || "General")}</span>
                        <div className="menu-card-price-row">
                          <span className="catalog-card-base-price">{money(catItem.price)}</span>
                        </div>
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
          </>
        )}
      </div>

      {/* ====================================================================
          SHARED MODAL: ADD TO MY MENU CONFIRMATION
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
                <div className="menu-modal-item-preview">
                  <MenuImageThumbnail
                    src={selectedCatalogItem.image_url}
                    alt={selectedCatalogItem.name}
                    className="menu-modal-preview-img"
                    wrapClassName="menu-modal-image-wrap"
                    iconSize={28}
                  />
                  <div className="menu-modal-preview-details">
                    <h4 className="menu-modal-preview-name">{tDb(selectedCatalogItem.name)}</h4>
                    <span className="menu-card-cat-badge">{tDb(selectedCatalogItem.category)}</span>
                    <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.2rem" }}>
                      {t("menu.catalogBasePrice", "Catalog base price:")} <strong>{money(selectedCatalogItem.price)}</strong>
                    </div>
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
          SHARED MODAL: EDIT PERSONAL SELLING PRICE
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
                  <MenuImageThumbnail
                    src={editingItem.image_url}
                    alt={editingItem.name}
                    className="menu-modal-preview-img"
                    wrapClassName="menu-modal-image-wrap"
                    iconSize={28}
                  />
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
                    style={{ width: "16px", height: "16px", accentColor: "#F66016" }}
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
