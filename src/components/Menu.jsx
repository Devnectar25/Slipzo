import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import {
  Utensils,
  Shirt,
  ShoppingBag,
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
import { BarcodeModal } from "./common/BarcodeModal"
import Swal from "sweetalert2"
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

  // User shop business type context
  const cachedShop = getCachedData("/shop")
  const defaultBusinessType = cachedShop?.business_type || "small_business"
  const [selectedBusinessType, setSelectedBusinessType] = useState(defaultBusinessType)

  const getItemPlaceholderIcon = (category, sz = 22) => {
    const cat = (category || "").toLowerCase()
    const isCloth = (selectedBusinessType || "").toLowerCase().includes("clothing") || (selectedBusinessType || "").toLowerCase().includes("garment") || cat.includes("wear") || cat.includes("cloth") || cat.includes("garment") || cat.includes("shirt") || cat.includes("saree") || cat.includes("dress") || cat.includes("kids") || cat.includes("jacket")
    const isFood = (selectedBusinessType || "").toLowerCase().includes("hotel") || (selectedBusinessType || "").toLowerCase().includes("food") || cat.includes("food") || cat.includes("bread") || cat.includes("beverage") || cat.includes("chai") || cat.includes("roti") || cat.includes("snack")
    if (isCloth) return <Shirt size={sz} />
    if (isFood) return <Utensils size={sz} />
    return <ShoppingBag size={sz} />
  }

  // Listen to shop updates to sync business type and clear personal menu
  useEffect(() => {
    const handleShopUpdate = (e) => {
      const updatedShop = e?.detail || getCachedData("/shop")
      if (updatedShop?.business_type) {
        setSelectedBusinessType(updatedShop.business_type)
        // Reset items to empty array & reload to ensure clean state
        setItems([])
        loadUserMenu(true)
        loadMasterCatalog(updatedShop.business_type)
      }
    }
    const handleMenuUpdate = (e) => {
      if (Array.isArray(e?.detail?.items)) {
        setItems(e.detail.items)
      } else {
        loadUserMenu(false)
      }
    }
    window.addEventListener("slipzo_shop_updated", handleShopUpdate)
    window.addEventListener("slipzo-menu-update", handleMenuUpdate)
    return () => {
      window.removeEventListener("slipzo_shop_updated", handleShopUpdate)
      window.removeEventListener("slipzo-menu-update", handleMenuUpdate)
    }
  }, [user, userKey])

  // ==========================================
  // STATE A: "MY MENU" (Personal Menu)
  // ==========================================
  const cachedItems = getCachedData("/menu")
  const [items, setItems] = useState(() => {
    const isCloth = (defaultBusinessType || "").toLowerCase().includes("clothing") || (defaultBusinessType || "").toLowerCase().includes("garment")
    const filterForCloth = (arr) => {
      if (!Array.isArray(arr) || !isCloth) return Array.isArray(arr) ? arr : []
      return arr.filter(it => {
        const itCat = (it.category || "").toLowerCase()
        return !itCat.includes("tea") && !itCat.includes("chai") && !itCat.includes("coffee") && !itCat.includes("snack") && !itCat.includes("beverage") && !itCat.includes("bread") && !itCat.includes("food")
      })
    }
    if (Array.isArray(cachedItems) && cachedItems.length > 0) return filterForCloth(cachedItems)
    const stored = getStoredMenuItems(user)
    return filterForCloth(stored)
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
  const [editBarcodeActive, setEditBarcodeActive] = useState(true)
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
  const [addBarcodeActive, setAddBarcodeActive] = useState(true)
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false)
  const [addFormError, setAddFormError] = useState("")

  // Barcode View & Print Modal
  const [barcodeModalItem, setBarcodeModalItem] = useState(null)

  // Custom Item Creation Modal State
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false)
  const [customName, setCustomName] = useState("")
  const [customCat, setCustomCat] = useState("General")
  const [customItemPrice, setCustomItemPrice] = useState("")
  const [customBarcode, setCustomBarcode] = useState("")
  const [customBarcodeActive, setCustomBarcodeActive] = useState(true)
  const [customImageUrl, setCustomImageUrl] = useState("")
  const [customImagePreview, setCustomImagePreview] = useState("")
  const [customImageMode, setCustomImageMode] = useState("upload") // "upload" | "url"
  const [isCreatingCustom, setIsCreatingCustom] = useState(false)
  const [customFormError, setCustomFormError] = useState("")
  const customFileInputRef = useRef(null)

  // ==========================================
  // BODY SCROLL LOCK WHEN MODAL IS OPEN
  // ==========================================
  const isAnyMenuModalOpen = Boolean(
    selectedCatalogItem ||
    editingItem ||
    isCustomModalOpen ||
    barcodeModalItem
  )

  useEffect(() => {
    if (isAnyMenuModalOpen) {
      const originalBodyOverflow = document.body.style.overflow
      const originalDocOverflow = document.documentElement.style.overflow

      document.body.style.overflow = "hidden"
      document.documentElement.style.overflow = "hidden"

      const elementsToLock = document.querySelectorAll(
        ".shell-content, .shell-main, .app, .public-layout, .main-content, .menu-page-container"
      )
      elementsToLock.forEach(el => {
        el.dataset.origOverflow = el.style.overflow
        el.style.overflow = "hidden"
      })

      return () => {
        document.body.style.overflow = originalBodyOverflow
        document.documentElement.style.overflow = originalDocOverflow
        elementsToLock.forEach(el => {
          el.style.overflow = el.dataset.origOverflow || ""
        })
      }
    }
  }, [isAnyMenuModalOpen])

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
      const isCloth = (selectedBusinessType || "").toLowerCase().includes("clothing") || (selectedBusinessType || "").toLowerCase().includes("garment")
      const filterForCloth = (arr) => {
        if (!Array.isArray(arr) || !isCloth) return Array.isArray(arr) ? arr : []
        return arr.filter(it => {
          const itCat = (it.category || "").toLowerCase()
          return !itCat.includes("tea") && !itCat.includes("chai") && !itCat.includes("coffee") && !itCat.includes("snack") && !itCat.includes("beverage") && !itCat.includes("bread") && !itCat.includes("food")
        })
      }
      if (Array.isArray(data)) {
        const cleanData = filterForCloth(data)
        setItems(cleanData)
        saveStoredMenuItems(cleanData, user)
      } else {
        const local = getStoredMenuItems(user)
        const cleanLocal = filterForCloth(local)
        if (cleanLocal.length > 0) setItems(cleanLocal)
      }
    } catch (err) {
      console.warn("Failed to load user menu, using offline storage:", err)
      const isCloth = (selectedBusinessType || "").toLowerCase().includes("clothing") || (selectedBusinessType || "").toLowerCase().includes("garment")
      const local = getStoredMenuItems(user)
      const cleanLocal = isCloth ? local.filter(it => {
        const itCat = (it.category || "").toLowerCase()
        return !itCat.includes("tea") && !itCat.includes("chai") && !itCat.includes("coffee") && !itCat.includes("snack") && !itCat.includes("beverage") && !itCat.includes("bread") && !itCat.includes("food")
      }) : local
      if (cleanLocal.length > 0) setItems(cleanLocal)
    } finally {
      if (showSpinner) setLoading(false)
    }
  }

  // Fetch master catalog for adding items based on business type
  const loadMasterCatalog = async (bType = selectedBusinessType) => {
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
      loadMasterCatalog(selectedBusinessType)
    }
  }, [user, userKey, selectedBusinessType])

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
        (it.category || "").toLowerCase().includes(q) ||
        (it.barcode || "").toLowerCase().includes(q)
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
    setAddBarcodeActive(catalogItem.barcode_active !== false)
    setAddFormError("")
  }

  const handleCloseAddModal = () => {
    setSelectedCatalogItem(null)
    setCustomPrice("")
    setAddBarcodeActive(true)
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
    setEditBarcodeActive(userItem.barcode_active !== false)
  }

  const handleCloseEditModal = () => {
    setEditingItem(null)
    setEditPrice("")
    setEditBarcodeActive(true)
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
          is_active: editActive,
          barcode_active: editBarcodeActive
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
          {myMenuCategories.length > 2 && (
            <div className="menu-category-pills-row">
              {myMenuCategories.map((cat) => {
                const isActive = selectedCategory.toLowerCase() === cat.id.toLowerCase()
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`mob-category-chip ${isActive ? "active" : ""}`}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.id === "all" ? (search.trim() ? t("menu.allCategories", "All Categories") : t("menu.allItems", "All Items")) : tDb(cat.label)}
                  </button>
                )
              })}
            </div>
          )}

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
                              {getItemPlaceholderIcon(catItem.category, 22)}
                            </div>
                          )}
                          <span className="menu-card-cat-badge">{catItem.category || "General"}</span>
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
              </>
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

            {/* Empty State vs User Menu Cards */}
            {items.length === 0 ? (
              /* ================================================================
                 PHASE 3: EMPTY STATE (Clean, no master dummy items shown!)
                 ================================================================ */
              <div className="menu-empty-state-card">
                <div className="menu-empty-icon-circle">
                  <Utensils size={32} />
                </div>
                <h2 className="menu-empty-title">{t("menu.emptyTitle", "Your menu is empty")}</h2>
                <p className="menu-empty-desc">
                  {t("menu.emptyDesc", "Add the items you use regularly to create bills faster without manual entry.")}
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
                {paginatedUserItems.map((item) => {
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
                            {getItemPlaceholderIcon(item.category, 22)}
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
                  )
                })}
              </div>
              </>
            )}
          </>
        )}
      </div>

      {/* ====================================================================
          STATE B: ADD ITEMS FLOW (Catalog Search & Selection)
          ==================================================================== */}
      {currentView === "add_items" && (
        <>
          {/* Back Bar */}
          <div className="add-items-back-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <button
                className="add-items-back-btn"
                onClick={() => setCurrentView("my_menu")}
                title={t("menu.returnToMenu", "Return to My Menu")}
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 className="add-items-header-title">{t("menu.addItems", "Add Items")}</h2>
                <p className="menu-sub-title">{t("menu.catalogSubtitle", "Select your catalog and add products to your menu")}</p>
              </div>
            </div>
            <button
              type="button"
              className="menu-secondary-btn"
              onClick={handleOpenCustomModal}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 0.85rem", fontSize: "0.85rem" }}
            >
              <Plus size={16} /> <span>{t("menu.createCustom", "+ Create Custom Item")}</span>
            </button>
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
            <>
              <div className="menu-cards-grid">
                {paginatedCatalogItems.map((catItem) => {
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
                            {getItemPlaceholderIcon(catItem.category, 22)}
                          </div>
                        )}
                        <span className="menu-card-cat-badge">{tDb(catItem.category || "General")}</span>
                        {catItem.barcode && (
                          <span style={{ position: "absolute", bottom: "6px", right: "6px", fontSize: "0.64rem", fontWeight: "700", background: "rgba(255,255,255,0.94)", color: "#334155", border: "1px solid #cbd5e1", padding: "1px 5px", borderRadius: "5px", display: "flex", alignItems: "center", gap: "3px", zIndex: 2, backdropFilter: "blur(4px)", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                            <BarcodeIcon size={10} /> {catItem.barcode}
                          </span>
                        )}
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

              {/* Master Catalog Pagination Bar */}
              {filteredCatalogItems.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginTop: "1.5rem", padding: "1rem 1.25rem", background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.88rem", color: "#64748b" }}>
                    Showing <strong>{formatNum((catalogPage - 1) * catalogPageSize + 1)}</strong>–<strong>{formatNum(Math.min(catalogPage * catalogPageSize, filteredCatalogItems.length))}</strong> of <strong>{formatNum(filteredCatalogItems.length)}</strong> products
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginRight: "0.5rem", fontSize: "0.85rem", color: "#64748b" }}>
                      <span>Per page:</span>
                      <select
                        value={catalogPageSize}
                        onChange={(e) => {
                          setCatalogPageSize(Number(e.target.value))
                          setCatalogPage(1)
                        }}
                        style={{ padding: "0.3rem 0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: "0.85rem", fontWeight: "600", color: "#0f172a" }}
                      >
                        <option value={12}>12</option>
                        <option value={24}>24</option>
                        <option value={48}>48</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      disabled={catalogPage <= 1}
                      onClick={() => setCatalogPage(p => Math.max(1, p - 1))}
                      className="menu-secondary-btn"
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem", opacity: catalogPage <= 1 ? 0.5 : 1, cursor: catalogPage <= 1 ? "not-allowed" : "pointer" }}
                    >
                      Previous
                    </button>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      {Array.from({ length: totalCatalogPages }).map((_, idx) => {
                        const pageNum = idx + 1
                        if (
                          pageNum === 1 ||
                          pageNum === totalCatalogPages ||
                          (pageNum >= catalogPage - 1 && pageNum <= catalogPage + 1)
                        ) {
                          const isActive = pageNum === catalogPage
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setCatalogPage(pageNum)}
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "6px",
                                border: isActive ? "1px solid #0284c7" : "1px solid #e2e8f0",
                                background: isActive ? "#0284c7" : "#ffffff",
                                color: isActive ? "#ffffff" : "#334155",
                                fontWeight: "600",
                                fontSize: "0.85rem",
                                cursor: "pointer",
                                transition: "all 0.15s ease"
                              }}
                            >
                              {formatNum(pageNum)}
                            </button>
                          )
                        } else if (
                          (pageNum === catalogPage - 2 && pageNum > 1) ||
                          (pageNum === catalogPage + 2 && pageNum < totalCatalogPages)
                        ) {
                          return <span key={pageNum} style={{ padding: "0 0.25rem", color: "#94a3b8", alignSelf: "center" }}>...</span>
                        }
                        return null
                      })}
                    </div>
                    <button
                      type="button"
                      disabled={catalogPage >= totalCatalogPages}
                      onClick={() => setCatalogPage(p => Math.min(totalCatalogPages, p + 1))}
                      className="menu-secondary-btn"
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem", opacity: catalogPage >= totalCatalogPages ? 0.5 : 1, cursor: catalogPage >= totalCatalogPages ? "not-allowed" : "pointer" }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

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
                      {getItemPlaceholderIcon(selectedCatalogItem.category, 24)}
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

                {/* Barcode Active / Deactive toggle */}
                <div className="menu-modal-field" style={{ marginTop: "1rem" }}>
                  <label className="menu-modal-label">{t("menu.barcodeStatus", "Barcode Status")}</label>
                  <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.4rem" }}>
                    <button
                      type="button"
                      onClick={() => setAddBarcodeActive(true)}
                      style={{
                        flex: 1,
                        padding: "0.55rem 0.75rem",
                        borderRadius: "8px",
                        border: addBarcodeActive ? "2px solid #16a34a" : "1px solid #cbd5e1",
                        background: addBarcodeActive ? "#f0fdf4" : "#ffffff",
                        color: addBarcodeActive ? "#15803d" : "#64748b",
                        fontWeight: "600",
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.35rem"
                      }}
                    >
                      <Check size={15} /> {t("menu.barcodeActive", "Active (Scan Ready)")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddBarcodeActive(false)}
                      style={{
                        flex: 1,
                        padding: "0.55rem 0.75rem",
                        borderRadius: "8px",
                        border: !addBarcodeActive ? "2px solid #dc2626" : "1px solid #cbd5e1",
                        background: !addBarcodeActive ? "#fef2f2" : "#ffffff",
                        color: !addBarcodeActive ? "#b91c1c" : "#64748b",
                        fontWeight: "600",
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.35rem"
                      }}
                    >
                      <X size={15} /> {t("menu.barcodeDeactive", "Deactive (Manual Only)")}
                    </button>
                  </div>
                  {selectedCatalogItem.barcode && addBarcodeActive && (
                    <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "0.35rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <BarcodeIcon size={13} />
                      <span>Master Barcode: <code>{selectedCatalogItem.barcode}</code></span>
                    </div>
                  )}
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
                  {editingItem.image_url ? (
                    <img
                      src={editingItem.image_url}
                      alt={editingItem.name}
                      className="menu-modal-preview-img"
                    />
                  ) : (
                    <div className="menu-card-image-placeholder" style={{ width: "52px", height: "52px" }}>
                      {getItemPlaceholderIcon(editingItem.category, 20)}
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
                    style={{ width: "16px", height: "16px", accentColor: "#F66016" }}
                  />
                  <label htmlFor="item-active-check" style={{ fontSize: "0.85rem", color: "#334155", fontWeight: "600", cursor: "pointer" }}>
                    {t("menu.activeAvailable", "Active (Available for quick billing)")}
                  </label>
                </div>

                {/* Barcode Active / Deactive toggle */}
                <div className="menu-modal-field" style={{ marginTop: "1rem" }}>
                  <label className="menu-modal-label">{t("menu.barcodeStatus", "Barcode Status")}</label>
                  <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.4rem" }}>
                    <button
                      type="button"
                      onClick={() => setEditBarcodeActive(true)}
                      style={{
                        flex: 1,
                        padding: "0.55rem 0.75rem",
                        borderRadius: "8px",
                        border: editBarcodeActive ? "2px solid #16a34a" : "1px solid #cbd5e1",
                        background: editBarcodeActive ? "#f0fdf4" : "#ffffff",
                        color: editBarcodeActive ? "#15803d" : "#64748b",
                        fontWeight: "600",
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.35rem"
                      }}
                    >
                      <Check size={15} /> {t("menu.barcodeActive", "Active (Scan Enabled)")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditBarcodeActive(false)}
                      style={{
                        flex: 1,
                        padding: "0.55rem 0.75rem",
                        borderRadius: "8px",
                        border: !editBarcodeActive ? "2px solid #dc2626" : "1px solid #cbd5e1",
                        background: !editBarcodeActive ? "#fef2f2" : "#ffffff",
                        color: !editBarcodeActive ? "#b91c1c" : "#64748b",
                        fontWeight: "600",
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.35rem"
                      }}
                    >
                      <X size={15} /> {t("menu.barcodeDeactive", "Deactive (No Scan)")}
                    </button>
                  </div>
                  {editingItem.barcode && editBarcodeActive && (
                    <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "0.35rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <BarcodeIcon size={13} />
                      <span>Item Barcode: <code>{editingItem.barcode}</code></span>
                    </div>
                  )}
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

      {/* ====================================================================
          CREATE CUSTOM ITEM MODAL
          ==================================================================== */}
      {/* ====================================================================
          CREATE CUSTOM ITEM MODAL
          ==================================================================== */}
      {isCustomModalOpen && (
        <div className="menu-modal-backdrop" onClick={handleCloseCustomModal}>
          <div className="menu-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "440px" }}>
            <div className="menu-modal-header">
              <h3 className="menu-modal-title">{t("menu.createCustomTitle", "Create Custom Product")}</h3>
              <button className="menu-modal-close-btn" onClick={handleCloseCustomModal}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomItem} style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div className="menu-modal-body" style={{ padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                {/* 1. Product Image Section */}
                <div className="menu-modal-field" style={{ margin: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                    <label className="menu-modal-label" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.76rem" }}>
                      <ImageIcon size={13} style={{ color: "#0284c7" }} />
                      <span>{t("menu.productImage", "Product Image (Optional)")}</span>
                    </label>
                    <div style={{ display: "flex", gap: "2px", background: "#f1f5f9", padding: "2px", borderRadius: "5px" }}>
                      <button
                        type="button"
                        onClick={() => setCustomImageMode("upload")}
                        style={{
                          border: "none",
                          background: customImageMode === "upload" ? "#ffffff" : "transparent",
                          color: customImageMode === "upload" ? "#0284c7" : "#64748b",
                          fontSize: "0.7rem",
                          fontWeight: "700",
                          padding: "2px 7px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          boxShadow: customImageMode === "upload" ? "0 1px 2px rgba(0,0,0,0.08)" : "none"
                        }}
                      >
                        Upload
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomImageMode("url")}
                        style={{
                          border: "none",
                          background: customImageMode === "url" ? "#ffffff" : "transparent",
                          color: customImageMode === "url" ? "#0284c7" : "#64748b",
                          fontSize: "0.7rem",
                          fontWeight: "700",
                          padding: "2px 7px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          boxShadow: customImageMode === "url" ? "0 1px 2px rgba(0,0,0,0.08)" : "none"
                        }}
                      >
                        Link
                      </button>
                    </div>
                  </div>

                  {customImageMode === "upload" ? (
                    <div>
                      <input
                        type="file"
                        ref={customFileInputRef}
                        onChange={handleCustomImageFileChange}
                        accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                        style={{ display: "none" }}
                      />
                      {customImagePreview ? (
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.6rem",
                          padding: "0.3rem 0.55rem",
                          background: "#f8fafc",
                          border: "1.5px solid #cbd5e1",
                          borderRadius: "8px",
                          height: "40px",
                          boxSizing: "border-box"
                        }}>
                          <div style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "5px",
                            overflow: "hidden",
                            background: "#e2e8f0",
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}>
                            <img
                              src={customImagePreview}
                              alt="Preview"
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "0.74rem", fontWeight: "700", color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {customName ? `${customName} Photo` : "Photo Ready"}
                            </div>
                            <div style={{ fontSize: "0.66rem", color: "#16a34a", fontWeight: "600" }}>
                              ✓ Attached
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "0.3rem" }}>
                            <button
                              type="button"
                              onClick={() => customFileInputRef.current?.click()}
                              className="menu-secondary-btn"
                              style={{ padding: "0.15rem 0.45rem", fontSize: "0.68rem", height: "24px" }}
                            >
                              Change
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveCustomImage}
                              className="menu-delete-btn"
                              style={{ padding: "0.15rem 0.35rem", height: "24px" }}
                              title="Remove image"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => customFileInputRef.current?.click()}
                          style={{
                            border: "1.5px dashed #cbd5e1",
                            borderRadius: "8px",
                            padding: "0.35rem 0.75rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.55rem",
                            background: "#f8fafc",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            height: "40px",
                            boxSizing: "border-box"
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#0284c7"; e.currentTarget.style.background = "#f0f9ff" }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.background = "#f8fafc" }}
                        >
                          <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#e0f2fe", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Upload size={12} />
                          </div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
                            <span style={{ fontSize: "0.76rem", fontWeight: "700", color: "#0f172a" }}>
                              Click to upload product image
                            </span>
                            <span style={{ fontSize: "0.65rem", color: "#64748b" }}>
                              (PNG, JPG, WebP max 5MB)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                        <LinkIcon size={13} style={{ position: "absolute", left: "9px", color: "#94a3b8" }} />
                        <input
                          type="url"
                          className="menu-modal-input"
                          placeholder="https://example.com/item.jpg"
                          value={customImageUrl}
                          onChange={(e) => {
                            setCustomImageUrl(e.target.value)
                            setCustomImagePreview(e.target.value)
                          }}
                          style={{ paddingLeft: "1.8rem", height: "35px", fontSize: "0.82rem" }}
                        />
                      </div>
                      {customImageUrl && (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.25rem", padding: "0.2rem 0.5rem", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                          <img
                            src={customImageUrl}
                            alt="URL preview"
                            onError={(e) => { e.currentTarget.style.display = "none" }}
                            style={{ width: "22px", height: "22px", borderRadius: "4px", objectFit: "cover" }}
                          />
                          <span style={{ fontSize: "0.7rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                            {customImageUrl}
                          </span>
                          <button
                            type="button"
                            onClick={handleRemoveCustomImage}
                            style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer", padding: "2px" }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Product Name */}
                <div className="menu-modal-field" style={{ margin: 0 }}>
                  <label className="menu-modal-label">{t("menu.productName", "Product Name *")}</label>
                  <input
                    type="text"
                    className="menu-modal-input"
                    placeholder="e.g. Masala Dosa, Cotton Shirt, Special Chai"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    required
                    autoFocus
                    style={{ height: "35px", fontSize: "0.85rem" }}
                  />
                </div>

                {/* 3. Category */}
                <div className="menu-modal-field" style={{ margin: 0 }}>
                  <label className="menu-modal-label">{t("menu.category", "Category")}</label>
                  <input
                    type="text"
                    className="menu-modal-input"
                    placeholder="e.g. Snacks, Beverages, Garments, Grocery"
                    value={customCat}
                    onChange={(e) => setCustomCat(e.target.value)}
                    style={{ height: "35px", fontSize: "0.85rem" }}
                  />
                </div>

                {/* 4. Selling Price */}
                <div className="menu-modal-field" style={{ margin: 0 }}>
                  <label className="menu-modal-label">{t("menu.sellingPrice", "Selling Price (₹) *")}</label>
                  <div className="menu-modal-price-input-box">
                    <span className="menu-modal-currency-symbol" style={{ left: "9px", fontSize: "0.9rem" }}>₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="menu-modal-input"
                      placeholder="0.00"
                      value={customItemPrice}
                      onChange={(e) => setCustomItemPrice(e.target.value)}
                      required
                      style={{ height: "35px", fontSize: "0.88rem", paddingLeft: "1.5rem" }}
                    />
                  </div>
                </div>

                {/* 5. Barcode / SKU */}
                <div className="menu-modal-field" style={{ margin: 0 }}>
                  <label className="menu-modal-label">{t("menu.customBarcode", "Barcode / SKU (Optional)")}</label>
                  <input
                    type="text"
                    className="menu-modal-input"
                    placeholder="Leave blank to auto-generate"
                    value={customBarcode}
                    onChange={(e) => setCustomBarcode(e.target.value)}
                    style={{ height: "35px", fontSize: "0.85rem" }}
                  />
                </div>

                {/* 6. Barcode Status */}
                <div className="menu-modal-field" style={{ margin: 0 }}>
                  <label className="menu-modal-label">{t("menu.barcodeStatus", "Barcode Status")}</label>
                  <div style={{ display: "flex", gap: "0.4rem", height: "34px" }}>
                    <button
                      type="button"
                      onClick={() => setCustomBarcodeActive(true)}
                      style={{
                        flex: 1,
                        padding: "0 0.5rem",
                        borderRadius: "7px",
                        border: customBarcodeActive ? "1.5px solid #16a34a" : "1px solid #cbd5e1",
                        background: customBarcodeActive ? "#f0fdf4" : "#ffffff",
                        color: customBarcodeActive ? "#15803d" : "#64748b",
                        fontWeight: "700",
                        fontSize: "0.76rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.3rem"
                      }}
                    >
                      <Check size={13} /> Active (Scan Ready)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomBarcodeActive(false)}
                      style={{
                        flex: 1,
                        padding: "0 0.5rem",
                        borderRadius: "7px",
                        border: !customBarcodeActive ? "1.5px solid #dc2626" : "1px solid #cbd5e1",
                        background: !customBarcodeActive ? "#fef2f2" : "#ffffff",
                        color: !customBarcodeActive ? "#b91c1c" : "#64748b",
                        fontWeight: "700",
                        fontSize: "0.76rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.3rem"
                      }}
                    >
                      <X size={13} /> Deactive (Manual Only)
                    </button>
                  </div>
                </div>

                {customFormError && (
                  <div style={{ color: "#ef4444", fontSize: "0.76rem", marginTop: "0.15rem" }}>
                    {customFormError}
                  </div>
                )}
              </div>

              <div className="menu-modal-footer">
                <button
                  type="button"
                  className="menu-secondary-btn"
                  onClick={handleCloseCustomModal}
                  disabled={isCreatingCustom}
                  style={{ height: "35px", padding: "0 0.9rem", fontSize: "0.82rem" }}
                >
                  {t("common.cancel", "Cancel")}
                </button>
                <button
                  type="submit"
                  className="menu-primary-btn"
                  disabled={isCreatingCustom}
                  style={{ height: "35px", padding: "0 1rem", fontSize: "0.82rem" }}
                >
                  {isCreatingCustom ? t("common.creating", "Creating...") : t("menu.createItem", "Create Product")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode View & Print Modal */}
      <BarcodeModal
        item={barcodeModalItem}
        isOpen={Boolean(barcodeModalItem)}
        onClose={() => setBarcodeModalItem(null)}
      />
    </div>
  )
}
