import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
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
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  LayoutGrid,
  Coffee,
  Croissant,
  Pizza,
  Soup,
  UtensilsCrossed,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  Barcode as BarcodeIcon
} from "lucide-react"
import { call, money, getCachedData, getStoredMenuItems, saveStoredMenuItems, clearStoredMenuItems, getCurrentUserKey, invalidateApiCache, isMenuCategory, DEFAULT_SHOP_MENU_ITEMS, DEFAULT_KIRANA_MENU_ITEMS, getFallbackCatalogForCategory, isInventoryShop, stockInfo } from "../lib/utils"
import { useToast } from "./common/Toast"
import { Spinner, ButtonLoader, CardSkeleton } from "./common/Skeleton"
import { useTranslation } from "react-i18next"
import { useDbTranslation } from "../lib/translator"
import { VoiceInputButton } from "./common/VoiceInputButton"
import { useSpeechInput } from "../hooks/useSpeechInput"
import { BarcodeModal } from "./common/BarcodeModal"
import { useShowBarcode } from "../hooks/useShowBarcode"
import { StockModal, StockBadge, InventorySummary } from "./common/StockModal"
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

const MENU_VIEW_KEY = "slipzo_menu_view"

export function Menu({ setView, requireAuth, user }) {
  const { t } = useTranslation()
  const { tDb, formatNum } = useDbTranslation()
  const userKey = getCurrentUserKey(user)
  const { success: toastSuccess, error: toastError } = useToast()

  // View state: 'my_menu' (Shop Menu) | 'add_items' (Catalog Grid)
  // The address bar stays on /menu for both screens, so a page reload used to drop the user from
  // "Available Items" back to the list. The tab remembers the screen; leaving Menu clears it.
  const [currentView, setCurrentView] = useState(() => {
    try {
      return sessionStorage.getItem(MENU_VIEW_KEY) === "add_items" ? "add_items" : "my_menu"
    } catch (e) {
      return "my_menu"
    }
  })

  useEffect(() => {
    try {
      if (currentView === "add_items") sessionStorage.setItem(MENU_VIEW_KEY, "add_items")
      else sessionStorage.removeItem(MENU_VIEW_KEY)
    } catch (e) {}
  }, [currentView])

  // Unmount means the user left the Menu page; a reload never runs this
  useEffect(() => {
    return () => {
      try { sessionStorage.removeItem(MENU_VIEW_KEY) } catch (e) {}
    }
  }, [])

  // User shop business type context
  const cachedShop = getCachedData("/shop")
  const defaultBusinessType = cachedShop?.business_type || "small_business"
  const [selectedBusinessType, setSelectedBusinessType] = useState(defaultBusinessType)
  // Cafe / tea / small business and hotel / restaurant shops do not use barcodes at all
  const showBarcode = useShowBarcode(selectedBusinessType)
  const isMenu = isMenuCategory(selectedBusinessType)
  // Kirana / grocery and cloth shops keep stock for every item
  const isInventory = isInventoryShop(selectedBusinessType)
  const [stockItem, setStockItem] = useState(null) // item whose stock popup is open
  const [stockFilter, setStockFilter] = useState("all") // "all" | "low" | "out" | "untracked"
  const [addStockQty, setAddStockQty] = useState("")
  const [addLowAlert, setAddLowAlert] = useState("5")
  const [customStockQty, setCustomStockQty] = useState("")
  const [customLowAlert, setCustomLowAlert] = useState("5")

  // reads the two opening-stock inputs; returns { error } or { fields } to send with POST /menu
  const readOpeningStock = (qtyText, alertText) => {
    if (!isInventory) return { fields: {} }
    const fields = {}
    if (String(qtyText).trim() !== "") {
      const q = Number(qtyText)
      if (!Number.isFinite(q) || q < 0) return { error: t("stock.errOpening", "Opening stock must be 0 or more.") }
      fields.stock_qty = q
    }
    if (String(alertText).trim() !== "") {
      const a = Number(alertText)
      if (!Number.isFinite(a) || a < 0) return { error: t("stock.errAlert", "Low-stock alert must be 0 or more.") }
      fields.low_stock_alert = a
    }
    return { fields }
  }
  // stock fields for the item kept on screen after it is added
  const localStockFields = (res, fields) => ({
    track_stock: res?.track_stock ?? (fields.stock_qty !== undefined),
    stock_qty: res?.stock_qty ?? (fields.stock_qty !== undefined ? fields.stock_qty : null),
    low_stock_alert: res?.low_stock_alert ?? (fields.low_stock_alert !== undefined ? fields.low_stock_alert : 5)
  })
  const handleStockSaved = (result) => {
    if (!result?.id) return
    setItems((prev) => {
      const next = prev.map((it) => (it.id === result.id ? { ...it, stock_qty: result.stock_qty, track_stock: result.track_stock, low_stock_alert: result.low_stock_alert } : it))
      saveStoredMenuItems(next, user)
      return next
    })
    toastSuccess(t("stock.saved", "Stock updated"))
  }

  const isDefaultBarcodeActiveForBusinessType = (bType, catItem) => {
    if (catItem) {
      const bcode = String(catItem.barcode || "").toLowerCase()
      const itemBType = String(catItem.business_type || "").toLowerCase()
      if (bcode.startsWith("hotel-") || bcode.startsWith("sb-") || bcode.startsWith("cafe-") || itemBType.includes("hotel") || itemBType.includes("food") || itemBType.includes("small_business") || itemBType.includes("cafe")) {
        return false
      }
      if (bcode.startsWith("kg-") || bcode.startsWith("kirana-") || bcode.startsWith("cg-") || bcode.startsWith("cloth-") || bcode.startsWith("garment-") || itemBType.includes("kirana") || itemBType.includes("clothing")) {
        return true
      }
    }

    const currentShop = getCachedData("/shop") || {}
    const rawType = String(bType || selectedBusinessType || currentShop.business_type || user?.business_type || "").toLowerCase()
    
    if (rawType.includes("hotel") || rawType.includes("food") || rawType.includes("small_business") || rawType.includes("cafe")) {
      return false
    }
    if (rawType.includes("kirana") || rawType.includes("grocery") || rawType.includes("cloth") || rawType.includes("garment")) {
      return true
    }

    return false
  }

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
        clearStoredMenuItems(user)
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
  // With nothing to show yet, an empty list must not read as "your menu is empty"
  const [loading, setLoading] = useState(() => Boolean(user) && items.length === 0)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [myMenuSort, setMyMenuSort] = useState("Latest")
  const [sortOpen, setSortOpen] = useState(false)
  const [myMenuPage, setMyMenuPage] = useState(1)
  const [myMenuPageSize, setMyMenuPageSize] = useState(12)

  // Edit personal item modal
  const [editingItem, setEditingItem] = useState(null)
  const [editName, setEditName] = useState("")
  const [editPrice, setEditPrice] = useState("")
  const [editActive, setEditActive] = useState(true)
  const [editBarcodeActive, setEditBarcodeActive] = useState(true)
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false)
  const [editFormError, setEditFormError] = useState("")

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
  const [catalogPage, setCatalogPage] = useState(1)
  const [catalogPageSize, setCatalogPageSize] = useState(12)
  const [filterOpen, setFilterOpen] = useState(false)
  const [favorites, setFavorites] = useState(() => new Set())

  // Add confirmation modal
  const [selectedCatalogItem, setSelectedCatalogItem] = useState(null)
  const [customPrice, setCustomPrice] = useState("")
  const [addBarcodeActive, setAddBarcodeActive] = useState(() => isDefaultBarcodeActiveForBusinessType(defaultBusinessType))
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
  const [customBarcodeActive, setCustomBarcodeActive] = useState(() => isDefaultBarcodeActiveForBusinessType(defaultBusinessType))
  const [customImageUrl, setCustomImageUrl] = useState("")
  const [customImagePreview, setCustomImagePreview] = useState("")
  const [customImageMode, setCustomImageMode] = useState("upload") // "upload" | "url"
  const [isCreatingCustom, setIsCreatingCustom] = useState(false)
  const [customFormError, setCustomFormError] = useState("")
  const customFileInputRef = useRef(null)

  useEffect(() => {
    const handleBack = (e) => {
      if (isCustomModalOpen || selectedCatalogItem || editingItem || barcodeModalItem || stockItem) {
        e.preventDefault()
        setStockItem(null)
        setIsCustomModalOpen(false)
        setSelectedCatalogItem(null)
        setEditingItem(null)
        setBarcodeModalItem(null)
        return
      }
      if (currentView === "add_items") {
        e.preventDefault()
        setCurrentView("my_menu")
        return
      }
    }
    window.addEventListener("slipzo_handle_back_button", handleBack)
    return () => window.removeEventListener("slipzo_handle_back_button", handleBack)
  }, [isCustomModalOpen, selectedCatalogItem, editingItem, barcodeModalItem, stockItem, currentView])

  const handleOpenCustomModal = () => {
    setCustomName("")
    setCustomCat("General")
    setCustomItemPrice("")
    setCustomBarcode("")
    setCustomBarcodeActive(isDefaultBarcodeActiveForBusinessType(selectedBusinessType))
    setCustomImageUrl("")
    setCustomImagePreview("")
    setCustomFormError("")
    setCustomStockQty("")
    setCustomLowAlert("5")
    setIsCustomModalOpen(true)
  }

  const handleCloseCustomModal = () => {
    setIsCustomModalOpen(false)
    setCustomName("")
    setCustomCat("General")
    setCustomItemPrice("")
    setCustomBarcode("")
    setCustomBarcodeActive(isDefaultBarcodeActiveForBusinessType(selectedBusinessType))
    setCustomImageUrl("")
    setCustomImagePreview("")
    setCustomFormError("")
  }

  const handleCustomImageFileChange = (e) => {
    const file = e.target?.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setCustomFormError("Image file size must be less than 5MB.")
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setCustomImagePreview(reader.result)
      setCustomImageUrl(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveCustomImage = () => {
    setCustomImageUrl("")
    setCustomImagePreview("")
    if (customFileInputRef.current) {
      customFileInputRef.current.value = ""
    }
  }

  const handleCustomItemPriceChange = (val) => {
    setCustomItemPrice(val)
    setCustomFormError("")
  }

  const handleCustomNameChange = (val) => {
    setCustomName(val)
    setCustomFormError("")
  }

  const handleSaveCustomItem = async (e) => {
    e?.preventDefault()
    if (isCreatingCustom) return

    const trimmedName = customName.trim()
    if (!trimmedName) {
      setCustomFormError("Item name is required.")
      return
    }

    const numPrice = parseFloat(customItemPrice)
    if (customItemPrice === "" || isNaN(numPrice) || numPrice <= 0) {
      setCustomFormError("Enter a valid price.")
      return
    }

    const isDuplicate = items.some(
      (it) => (it.name || "").trim().toLowerCase() === trimmedName.toLowerCase()
    )
    if (isDuplicate) {
      setCustomFormError("A product with this name is already in your menu.")
      return
    }

    const customStock = readOpeningStock(customStockQty, customLowAlert)
    if (customStock.error) {
      setCustomFormError(customStock.error)
      return
    }

    const isCatalogDuplicate = catalogItems.some(
      (it) => (it.name || "").trim().toLowerCase() === trimmedName.toLowerCase()
    )
    if (isCatalogDuplicate) {
      setCustomFormError(`"${trimmedName}" already exists in the catalog. You can add it directly from the catalog.`)
      return
    }

    setIsCreatingCustom(true)
    setCustomFormError("")
    try {
      const finalImage = customImagePreview || customImageUrl || ""
      const payload = {
        name: trimmedName,
        category: customCat.trim() || "General",
        custom_price: numPrice,
        price: numPrice,
        image_url: finalImage,
        barcode: customBarcode.trim() || undefined,
        barcode_active: customBarcodeActive,
        is_custom: true,
        ...customStock.fields
      }

      const res = await call("/menu", {
        method: "POST",
        body: JSON.stringify(payload)
      })

      const newItem = {
        id: res?.id || res?.menu_item_id || `custom_${Date.now()}`,
        menu_item_id: res?.id || res?.menu_item_id || `custom_${Date.now()}`,
        name: trimmedName,
        category: customCat.trim() || "General",
        price: numPrice,
        custom_price: numPrice,
        is_active: true,
        image_url: finalImage,
        barcode: customBarcode.trim() || res?.barcode || `BC${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        barcode_active: customBarcodeActive,
        ...localStockFields(res, customStock.fields)
      }

      setItems((prev) => {
        const next = [newItem, ...prev]
        saveStoredMenuItems(next, user)
        return next
      })

      invalidateApiCache("/menu")
      toastSuccess(t("menu.createdCustom", "Created custom product \"{{name}}\"", { name: trimmedName }))
      handleCloseCustomModal()
    } catch (err) {
      console.error("Error creating custom item:", err)
      setCustomFormError(err?.message || "Unable to add the item. Please try again.")
    } finally {
      setIsCreatingCustom(false)
    }
  }

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

  const handleVoiceSearchResult = (text) => {
    const clean = String(text || "").trim().replace(/\s*[.,!?;:]+$/, "").trim()
    if (currentView === "my_menu") {
      setSearch(clean)
    } else {
      setCatalogSearch(clean)
    }
  }

  // Fetch logged-in user's personal menu
  const loadUserMenu = async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true)
      const cachedShop = getCachedData("/shop")
      const currentBType = (cachedShop?.business_type || selectedBusinessType || "small_business").toLowerCase()
      const data = await call(`/menu?business_type=${encodeURIComponent(currentBType)}`).catch(() => null)

      const isCloth = currentBType.includes("clothing") || currentBType.includes("garment")
      const isKirana = currentBType.includes("kirana") || currentBType.includes("grocery")

      const filterForCategory = (arr) => {
        if (!Array.isArray(arr)) return []
        if (isCloth) {
          return arr.filter(it => {
            const itCat = (it.category || "").toLowerCase()
            return !itCat.includes("tea") && !itCat.includes("chai") && !itCat.includes("coffee") && !itCat.includes("snack") && !itCat.includes("beverage") && !itCat.includes("bread") && !itCat.includes("food")
          })
        }
        if (isKirana) {
          return arr.filter(it => {
            const name = (it.name || "").toLowerCase()
            const itCat = (it.category || "").toLowerCase()
            const isCafeOnly = (itCat.includes("bakery") || itCat.includes("snack")) && (name.includes("croissant") || name.includes("cappuccino") || name.includes("club sandwich") || name.includes("muffin"))
            return !isCafeOnly
          })
        }
        return arr
      }

      if (Array.isArray(data)) {
        const cleanData = filterForCategory(data)
        setItems(cleanData)
        saveStoredMenuItems(cleanData, user)
      } else {
        const local = getStoredMenuItems(user)
        const cleanLocal = filterForCategory(local)
        setItems(cleanLocal)
      }
    } catch (err) {
      console.warn("Failed to load user menu, using offline storage:", err)
      const cachedShop = getCachedData("/shop")
      const currentBType = (cachedShop?.business_type || selectedBusinessType || "small_business").toLowerCase()
      const isCloth = currentBType.includes("clothing") || currentBType.includes("garment")
      const isKirana = currentBType.includes("kirana") || currentBType.includes("grocery")
      const local = getStoredMenuItems(user)
      const cleanLocal = local.filter(it => {
        const itCat = (it.category || "").toLowerCase()
        const name = (it.name || "").toLowerCase()
        if (isCloth) return !itCat.includes("tea") && !itCat.includes("chai") && !itCat.includes("coffee") && !itCat.includes("snack") && !itCat.includes("beverage") && !itCat.includes("bread") && !itCat.includes("food")
        if (isKirana) return !((itCat.includes("bakery") || itCat.includes("snack")) && (name.includes("croissant") || name.includes("cappuccino") || name.includes("club sandwich") || name.includes("muffin")))
        return true
      })
      setItems(cleanLocal)
    } finally {
      if (showSpinner) setLoading(false)
    }
  }

  // Fetch master catalog for adding items based on business type
  const loadMasterCatalog = async (bType = selectedBusinessType) => {
    try {
      setCatalogLoading(true)
      const cachedShop = getCachedData("/shop")
      const currentBType = (bType || cachedShop?.business_type || "small_business").toLowerCase()
      const data = await call(`/menu/catalog?business_type=${encodeURIComponent(currentBType)}`).catch(() => null)
      if (Array.isArray(data) && data.length > 0) {
        setCatalogItems(data)
      } else {
        setCatalogItems(getFallbackCatalogForCategory(currentBType))
      }
    } catch (err) {
      console.warn("Could not load master catalog from API, using fallback:", err)
      const cachedShop = getCachedData("/shop")
      const currentBType = (bType || cachedShop?.business_type || "small_business").toLowerCase()
      setCatalogItems(getFallbackCatalogForCategory(currentBType))
    } finally {
      setCatalogLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadUserMenu(items.length === 0)
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
    const list = [{ id: "all", label: t("menu.allItems", "All Items"), icon: <LayoutGrid size={15} /> }]
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
      let matchesStock = true
      if (isInventory && stockFilter !== "all") {
        const level = stockInfo(it).level
        matchesStock = stockFilter === "untracked" ? level === "none" : level === stockFilter
      }
      return matchesSearch && matchesCat && matchesStock
    })

    if (myMenuSort === "Price: Low to High") {
      res = [...res].sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
    } else if (myMenuSort === "Price: High to Low") {
      res = [...res].sort((a, b) => Number(b.price || 0) - Number(a.price || 0))
    } else if (myMenuSort === "Name") {
      res = [...res].sort((a, b) => (a.name || "").localeCompare(b.name || ""))
    }
    return res
  }, [items, search, selectedCategory, myMenuSort, isInventory, stockFilter])

  const totalMyMenuPages = useMemo(() => {
    return Math.ceil(filteredUserItems.length / myMenuPageSize) || 1
  }, [filteredUserItems.length, myMenuPageSize])

  const paginatedUserItems = useMemo(() => {
    const start = (myMenuPage - 1) * myMenuPageSize
    return filteredUserItems.slice(start, start + myMenuPageSize)
  }, [filteredUserItems, myMenuPage, myMenuPageSize])

  useEffect(() => {
    setMyMenuPage(1)
  }, [search, selectedCategory, myMenuSort])

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

  const totalCatalogPages = useMemo(() => {
    return Math.ceil(filteredCatalogItems.length / catalogPageSize) || 1
  }, [filteredCatalogItems.length, catalogPageSize])

  const paginatedCatalogItems = useMemo(() => {
    const start = (catalogPage - 1) * catalogPageSize
    return filteredCatalogItems.slice(start, start + catalogPageSize)
  }, [filteredCatalogItems, catalogPage, catalogPageSize])

  useEffect(() => {
    setCatalogPage(1)
  }, [catalogSearch, catalogCategory, catalogSort])

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
    const hasSameName = items.some(
      (it) => (it.name || "").trim().toLowerCase() === (catItem.name || "").trim().toLowerCase()
    )
    if (isAlreadyAdded || hasSameName) {
      toastError(`"${catItem.name}" is already in your menu`)
      return
    }

    try {
      const defaultBActive = isDefaultBarcodeActiveForBusinessType(selectedBusinessType)
      const isBActive = catItem.barcode_active !== undefined ? Boolean(catItem.barcode_active) : defaultBActive
      const added = await call("/menu", {
        method: "POST",
        body: JSON.stringify({
          menu_item_id: catItem.id,
          name: catItem.name,
          category: catItem.category,
          custom_price: Number(catItem.price || 0),
          image_url: catItem.image_url || "",
          barcode_active: isBActive
        })
      })

      const newItem = {
        id: added?.id || `user_${Date.now()}`,
        menu_item_id: catItem.id,
        name: catItem.name,
        category: catItem.category || "General",
        price: Number(catItem.price || 0),
        custom_price: Number(catItem.price || 0),
        is_active: true,
        barcode_active: isBActive,
        image_url: catItem.image_url || ""
      }

      setItems((prev) => {
        const next = [newItem, ...prev]
        saveStoredMenuItems(next, user)
        return next
      })

      toastSuccess(t("menu.toastAdded", "Added \"{{name}}\" to My Menu!", { name: catItem.name }))
    } catch (err) {
      toastError(err?.message || "Failed to add item to menu.")
    }
  }

  const handleOpenAddModal = (catalogItem) => {
    setSelectedCatalogItem(catalogItem)
    setCustomPrice(catalogItem.price !== undefined ? String(catalogItem.price) : "")
    const defaultBActive = isDefaultBarcodeActiveForBusinessType(selectedBusinessType, catalogItem)
    setAddBarcodeActive(defaultBActive)
    setAddFormError("")
    setAddStockQty("")
    setAddLowAlert("5")
  }

  const handleCloseAddModal = () => {
    setSelectedCatalogItem(null)
    setCustomPrice("")
    setAddBarcodeActive(isDefaultBarcodeActiveForBusinessType(selectedBusinessType))
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

    const hasSameName = items.some(
      (it) => (it.name || "").trim().toLowerCase() === (selectedCatalogItem.name || "").trim().toLowerCase()
    )
    if (hasSameName) {
      setAddFormError(`A product named "${selectedCatalogItem.name}" is already in your menu.`)
      return
    }

    const addStock = readOpeningStock(addStockQty, addLowAlert)
    if (addStock.error) {
      setAddFormError(addStock.error)
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
          image_url: selectedCatalogItem.image_url || "",
          barcode_active: addBarcodeActive,
          ...addStock.fields
        })
      })

      const newItem = {
        id: added?.id || `user_${Date.now()}`,
        menu_item_id: selectedCatalogItem.id,
        name: selectedCatalogItem.name,
        category: selectedCatalogItem.category,
        price: numPrice,
        custom_price: numPrice,
        is_active: true,
        barcode_active: addBarcodeActive,
        barcode: added?.barcode || selectedCatalogItem.barcode,
        image_url: selectedCatalogItem.image_url || "",
        ...localStockFields(added, addStock.fields)
      }

      setItems((prev) => {
        const next = [newItem, ...prev]
        saveStoredMenuItems(next, user)
        return next
      })

      toastSuccess(`Added "${selectedCatalogItem.name}" to My Menu!`)
      handleCloseAddModal()
    } catch (err) {
      setAddFormError(err?.message || "Failed to add item to menu.")
    } finally {
      setIsSubmittingAdd(false)
    }
  }

  const handleOpenEditModal = (userItem) => {
    setEditingItem(userItem)
    setEditName(userItem?.name || "")
    setEditPrice(userItem?.price !== undefined ? String(userItem.price) : "")
    setEditActive(userItem?.is_active !== undefined ? Boolean(userItem.is_active) : true)
    const isBActive = userItem?.barcode_active !== false && userItem?.barcode_active !== 0 && userItem?.barcode_active !== "0" && userItem?.barcode_active !== "false"
    setEditBarcodeActive(isBActive)
    setEditFormError("")
  }

  const handleCloseEditModal = () => {
    setEditingItem(null)
    setEditName("")
    setEditPrice("")
    setEditBarcodeActive(true)
    setEditFormError("")
  }

  const handleSaveEditPrice = async (e) => {
    e?.preventDefault()
    if (!editingItem || isUpdatingPrice) return

    const trimmedName = (editingItem?.name || "").trim()

    const numPrice = parseFloat(editPrice)
    if (editPrice === "" || isNaN(numPrice) || numPrice <= 0) {
      setEditFormError("Enter a valid price.")
      return
    }

    setIsUpdatingPrice(true)
    setEditFormError("")
    try {
      await call(`/menu/${editingItem.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: trimmedName,
          custom_price: numPrice,
          is_active: editActive,
          barcode_active: editBarcodeActive
        })
      }).catch(() => null)

      setItems((prev) => {
        const next = prev.map((it) => (it.id === editingItem.id ? { ...it, name: trimmedName, price: numPrice, custom_price: numPrice, is_active: editActive, barcode_active: editBarcodeActive } : it))
        saveStoredMenuItems(next, user)
        return next
      })

      toastSuccess(t("menu.toastUpdated", "Updated \"{{name}}\"", { name: trimmedName }))
      handleCloseEditModal()
    } catch (err) {
      setEditFormError("Unable to update item. Please try again.")
    } finally {
      setIsUpdatingPrice(false)
    }
  }

  const handleRemoveFromUserMenu = async (userItem, e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()

    if (!userItem || deletingId === userItem.id || (typeof Swal !== "undefined" && Swal.isVisible())) {
      return
    }

    const itemName = userItem?.name || "item"

    const confirmResult = await Swal.fire({
      title: t("menu.removeTitle", "Remove menu item?"),
      text: t("menu.removeAsk", "Remove \"{{name}}\" from your menu?", { name: itemName }),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: t("menu.removeBtn", "Remove"),
      cancelButtonText: t("common.cancel", "Cancel"),
      reverseButtons: true,
      focusCancel: true
    })

    if (!confirmResult.isConfirmed) return

    setDeletingId(userItem.id)
    try {
      await call(`/menu/${userItem.id}`, { method: "DELETE" }).catch(() => null)

      setItems((prev) => {
        const next = prev.filter((it) => it.id !== userItem.id)
        saveStoredMenuItems(next, user)
        return next
      })

      toastSuccess(t("menu.toastRemoved", "Removed \"{{name}}\" from My Menu", { name: itemName }))
    } catch (err) {
      toastError(t("menu.err_removeFailed", "Unable to remove item from your menu."))
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleVoiceSearch = (e) => {
    e?.preventDefault()
    e?.stopPropagation()

    if (!browserSupportsSpeech) {
      toastError(t("menu.err_speech", "Speech recognition is not supported in this browser."))
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
            {/* Top Action Bar: 3 buttons in a line */}
            <div className="mob-menu-top-header">
              <button
                type="button"
                className="mob-menu-btn mob-menu-add-btn"
                onClick={() => {
                  setCurrentView("add_items")
                  setCatalogSearch("")
                }}
                title={isMenu ? t("menu.addMenu", "Add Menu") : t("menu.addItem", "Add Item")}
              >
                <Plus size={15} />
                <span className="mob-btn-text-full">{isMenu ? t("menu.addMenu", "Add Menu") : t("menu.addItem", "Add Item")}</span>
                <span className="mob-btn-text-short">{t("menu.add", "Add")}</span>
              </button>

              <button
                type="button"
                className="mob-menu-btn mob-menu-custom-btn"
                onClick={handleOpenCustomModal}
                title={isMenu ? tDb("Create Custom Menu") : tDb("Create Custom Item")}
              >
                <Sparkles size={14} />
                <span className="mob-btn-text-full">{isMenu ? tDb("Custom Menu") : tDb("Custom Item")}</span>
                <span className="mob-btn-text-short">{isMenu ? tDb("Custom Menu") : tDb("Custom Item")}</span>
              </button>
            </div>

            {/* Search Bar + Voice Input */}
          <div className="menu-search-wrapper">
            <Search size={18} className="menu-search-icon" />
            <input
              type="text"
              className="menu-search-input"
              placeholder={isListening
                ? (isMenu ? t("menu.listeningSpeakMenu", "Listening... Speak menu name") : t("menu.listeningSpeak", "Listening... Speak the item name"))
                : (isMenu ? t("menu.searchUserMenu", "Search or speak to find in My Menu...") : t("menu.searchUserItems", "Search or speak to find in My Items..."))}
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

          {isInventory && items.length > 0 && (
            <InventorySummary items={items} filter={stockFilter} onFilter={(f) => { setStockFilter(f); setMyMenuPage(1) }} formatMoney={money} />
          )}
            {isInventory && stockFilter !== "all" && (
              <div className="inv-filter-note">
                <span>{stockFilter === "low" ? t("stock.showingLow", "Showing items with low stock") : stockFilter === "out" ? t("stock.showingOut", "Showing items that are out of stock") : t("stock.showingUntracked", "Showing items without stock")}</span>
                <button type="button" onClick={() => setStockFilter("all")}>{t("stock.showAll", "Show all")}</button>
              </div>
            )}

          {/* Section Subheader: My Menu count & Sort */}
            <div className="mob-menu-subheader">
              <div className="mob-menu-count-wrap">
                <h3 className="mob-menu-heading">{isMenu ? t("menu.myMenu", "My Menu") : t("menu.myItems", "My Items")}</h3>
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
                  <p style={{ color: "#64748b", marginTop: "0.75rem", fontSize: "0.88rem" }}>{t("menu.loadingMenuItems", "Loading menu items...")}</p>
                </div>
              ) : filteredUserItems.length === 0 ? (
                <div className="mob-menu-empty-card">
                  <Utensils size={32} style={{ color: "#94a3b8", margin: "0 auto 0.5rem" }} />
                  <h4 style={{ fontSize: "1rem", fontWeight: "700", color: "#0C1F41", margin: "0 0 0.25rem" }}>
                    {(search || stockFilter !== "all")
                      ? t("menu.noMatchingItems", "No matching items found")
                      : (isMenu ? t("menu.emptyTitle", "Your menu is empty") : t("menu.emptyItemsTitle", "Your item list is empty"))}
                  </h4>
                  <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 0.75rem", textAlign: "center" }}>
                    {(search || stockFilter !== "all")
                      ? t("menu.tryAnotherSearch", "Try another search term or reset filters.")
                      : (isMenu ? t("menu.tapAddMenuHint", "Tap \"Add Menu\" to choose from the catalog.") : t("menu.tapAddItemHint", "Tap \"Add Item\" to choose items from the catalog."))}
                  </p>
                  {(search || stockFilter !== "all") ? (
                    <button
                      type="button"
                      className="mob-menu-reset-btn"
                      onClick={() => { setSearch(""); setSelectedCategory("all"); setStockFilter("all"); }}
                    >
                      {t("menu.resetSearch", "Reset Search")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="mob-menu-reset-btn"
                      onClick={() => setCurrentView("add_items")}
                    >
                      <Plus size={14} style={{ marginRight: "4px" }} /> {isMenu ? t("menu.addMenu", "Add Menu") : t("menu.addItem", "Add Item")}
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {paginatedUserItems.map((item) => {
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
                                <span className="mob-status-dot" /> {t("menu.statusActive", "Active")}
                              </span>
                            )}
                          </div>
                          {isInventory && (
                            <div className="mob-item-stock-row">
                              <StockBadge item={item} onClick={() => setStockItem(item)} />
                            </div>
                          )}
                        </div>

                        <div className="mob-item-actions">
                          <button
                            type="button"
                            className="mob-item-edit-btn"
                            onClick={() => handleOpenEditModal(item)}
                            title={t("menu.editPrice", "Edit selling price")}
                            aria-label={t("menu.edit", "Edit")}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            className="mob-item-delete-btn"
                            onClick={(e) => handleRemoveFromUserMenu(item, e)}
                            disabled={deletingId === item.id}
                            title={t("menu.removeFromMenu", "Remove from My Menu")}
                            aria-label={t("menu.delete", "Delete")}
                          >
                            {deletingId === item.id ? <Spinner size="xs" /> : <Trash2 size={16} />}
                          </button>
                        </div>
                      </div>
                    )
                  })}

                  {totalMyMenuPages > 1 && (
                    <div className="menu-pagination-bar">
                      <div className="menu-pagination-info">
                        {t("menu.showing", "Showing")} <strong>{formatNum((myMenuPage - 1) * myMenuPageSize + 1)}</strong>–<strong>{formatNum(Math.min(myMenuPage * myMenuPageSize, filteredUserItems.length))}</strong> of <strong>{formatNum(filteredUserItems.length)}</strong> items
                      </div>
                      <div className="menu-pagination-controls">
                        <button
                          type="button"
                          className="menu-pagination-btn"
                          disabled={myMenuPage <= 1}
                          onClick={() => setMyMenuPage((p) => Math.max(1, p - 1))}
                          title={t("menu.prevPage", "Previous page")}
                        >
                          <ChevronLeft size={16} /> {t("menu.prev", "Prev")}
                        </button>
                        {Array.from({ length: totalMyMenuPages }, (_, i) => i + 1).map((pg) => {
                          if (pg === 1 || pg === totalMyMenuPages || Math.abs(pg - myMenuPage) <= 1) {
                            return (
                              <button
                                key={pg}
                                type="button"
                                className={`menu-pagination-page-btn ${pg === myMenuPage ? "active" : ""}`}
                                onClick={() => setMyMenuPage(pg)}
                              >
                                {formatNum(pg)}
                              </button>
                            )
                          }
                          if ((pg === 2 && myMenuPage > 3) || (pg === totalMyMenuPages - 1 && myMenuPage < totalMyMenuPages - 2)) {
                            return <span key={pg} className="menu-pagination-ellipsis">...</span>
                          }
                          return null
                        })}
                        <button
                          type="button"
                          className="menu-pagination-btn"
                          disabled={myMenuPage >= totalMyMenuPages}
                          onClick={() => setMyMenuPage((p) => Math.min(totalMyMenuPages, p + 1))}
                          title={t("menu.nextPage", "Next page")}
                        >
                          {t("menu.next", "Next")} <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
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
                  placeholder={t("menu.searchItems", "Search items...")}
                />
                <button
                  type="button"
                  className={`mob-search-mic-btn-inline ${isListening ? "listening" : ""}`}
                  onClick={handleToggleVoiceSearch}
                  title={t("menu.voiceSearchLabel", "Voice Search")}
                >
                  <Mic size={16} />
                </button>
              </div>
            </div>

            {/* Filter & Sort Controls Row */}
            <div className="mob-catalog-filter-sort-row">
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
              <span style={{ marginLeft: "auto" }} />
              <button
                type="button"
                className="mob-catalog-view-toggle-btn"
                onClick={() => setCurrentView("my_menu")}
                title={t("menu.toggleView", "Toggle View")}
              >
                <LayoutGrid size={18} />
              </button>
            </div>

            {/* 2-Column Catalog Cards Grid */}
            {catalogLoading ? (
              <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
                <Spinner />
                <p style={{ color: "#64748b", marginTop: "0.75rem", fontSize: "0.88rem" }}>{t("menu.loadingCatalog", "Loading catalog...")}</p>
              </div>
            ) : filteredCatalogItems.length === 0 ? (
              <div className="mob-menu-empty-card">
                <AlertCircle size={32} style={{ color: "#94a3b8", margin: "0 auto 0.5rem" }} />
                <h4 style={{ fontSize: "1rem", fontWeight: "700", color: "#0C1F41", margin: "0 0 0.25rem" }}>
                  {t("menu.noCatalog", "No catalog items found")}
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
                    {t("menu.resetFilters", "Reset Filters")}
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="menu-section-subheader">
                  <h3 className="menu-section-title">
                    {t("menu.searchResults", "Search Results")}
                    <span className="menu-items-count-badge">
                      {formatNum(filteredCatalogItems.length)} {t("menu.found", "found")}
                    </span>
                  </h3>
                  {catalogSearch && (
                    <button
                      className="menu-secondary-btn"
                      style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem" }}
                      onClick={() => setCatalogSearch("")}
                    >
                      {t("menu.clearSearch", "Clear Search")}
                    </button>
                  )}
                </div>

                <div className="menu-cards-grid">
                  {paginatedCatalogItems.map((catItem) => {
                    const isAlreadyAdded = catItem.is_added || addedMenuItemIds.has(catItem.id)
                    const isFav = favorites?.has?.(catItem.id)
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
                              {getItemPlaceholderIcon(catItem.category, 26)}
                            </div>
                          )}
                          <span className="menu-card-overlay-cat">{tDb(catItem.category || "General")}</span>
                          {showBarcode && catItem.barcode && (
                            <span className="menu-card-barcode-badge">
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
                              type="button"
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

                {totalCatalogPages > 1 && (
                  <div className="menu-pagination-bar" style={{ marginTop: "1rem" }}>
                    <div className="menu-pagination-info">
                      {t("menu.showing", "Showing")} <strong>{formatNum((catalogPage - 1) * catalogPageSize + 1)}</strong>–<strong>{formatNum(Math.min(catalogPage * catalogPageSize, filteredCatalogItems.length))}</strong> of <strong>{formatNum(filteredCatalogItems.length)}</strong> items
                    </div>
                    <div className="menu-pagination-controls">
                      <button
                        type="button"
                        className="menu-pagination-btn"
                        disabled={catalogPage <= 1}
                        onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
                        title={t("menu.prevPage", "Previous page")}
                      >
                        <ChevronLeft size={16} /> {t("menu.prev", "Prev")}
                      </button>
                      {Array.from({ length: totalCatalogPages }, (_, i) => i + 1).map((pg) => {
                        if (pg === 1 || pg === totalCatalogPages || Math.abs(pg - catalogPage) <= 1) {
                          return (
                            <button
                              key={pg}
                              type="button"
                              className={`menu-pagination-page-btn ${pg === catalogPage ? "active" : ""}`}
                              onClick={() => setCatalogPage(pg)}
                            >
                              {formatNum(pg)}
                            </button>
                          )
                        }
                        if ((pg === 2 && catalogPage > 3) || (pg === totalCatalogPages - 1 && catalogPage < totalCatalogPages - 2)) {
                          return <span key={pg} className="menu-pagination-ellipsis">...</span>
                        }
                        return null
                      })}
                      <button
                        type="button"
                        className="menu-pagination-btn"
                        disabled={catalogPage >= totalCatalogPages}
                        onClick={() => setCatalogPage((p) => Math.min(totalCatalogPages, p + 1))}
                        title={t("menu.nextPage", "Next page")}
                      >
                        {t("menu.next", "Next")} <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
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
                  <Utensils size={13} /> {isMenu ? t("menu.eyebrow", "SHOP MENU") : t("menu.eyebrowItem", "SHOP ITEM")}
                </span>
                <h1 className="menu-main-title">{isMenu ? t("menu.title", "Menu") : t("menu.titleItem", "Item")}</h1>
                <p className="menu-sub-title">
                  {isMenu ? t("menu.subtitleMenu", "Manage the menu you use for billing") : t("menu.subtitle", "Manage products and services sold by your shop for fast billing")}
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
                  <Plus size={18} /> {isMenu ? t("menu.addMenu", "Add Menu") : t("menu.addItem", "Add Item")}
                </button>

                <button
                  type="button"
                  className="menu-secondary-btn"
                  onClick={handleOpenCustomModal}
                  style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <Sparkles size={16} style={{ color: "#0284c7" }} /> <span>{isMenu ? tDb("Custom Menu") : tDb("Custom Item")}</span>
                </button>
              </div>
            </div>

            {/* Desktop Menu Search Bar */}
            <div className="menu-search-wrapper">
              <Search size={18} className="menu-search-icon" />
              <input
                type="text"
                className="menu-search-input"
                placeholder={isListening
                  ? (isMenu ? t("menu.listeningSpeakMenu", "Listening... Speak menu name") : t("menu.listeningSpeak", "Listening... Speak item name"))
                  : (isMenu ? t("menu.searchUserMenu", "Search or speak to find in My Menu...") : t("menu.searchUserItems", "Search or speak to find in My Items..."))}
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
                  <Mic size={18} style={{ color: "#0284c7" }} />
                )}
              </button>
            </div>

            {/* Empty State vs User Menu Cards */}
            {loading ? (
              <CardSkeleton count={6} />
            ) : items.length === 0 ? (
              /* ================================================================
                 PHASE 3: EMPTY STATE (Clean, no master dummy items shown!)
                 ================================================================ */
              <div className="menu-empty-state-card">
                <div className="menu-empty-icon-circle">
                  <Utensils size={32} />
                </div>
                <h2 className="menu-empty-title">{isMenu ? t("menu.emptyTitle", "Your menu is empty") : t("menu.emptyItemsTitle", "Your item list is empty")}</h2>
                <p className="menu-empty-desc">
                  {isMenu ? t("menu.emptyDesc", "Add the items you use regularly to create bills faster without manual entry.") : t("menu.emptyItemsDesc", "Add the items you sell regularly to create bills faster without manual entry.")}
                </p>

                <div className="menu-empty-actions-row">
                  <button
                    className="menu-primary-btn"
                    onClick={() => {
                      setCurrentView("add_items")
                      setCatalogSearch("")
                    }}
                  >
                    <Plus size={18} /> {isMenu ? t("menu.addMenu", "Add Menu") : t("menu.addItem", "Add Item")}
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
                {isInventory && (
                  <InventorySummary items={items} filter={stockFilter} onFilter={(f) => { setStockFilter(f); setMyMenuPage(1) }} formatMoney={money} />
                )}
                {isInventory && stockFilter !== "all" && (
              <div className="inv-filter-note">
                <span>{stockFilter === "low" ? t("stock.showingLow", "Showing items with low stock") : stockFilter === "out" ? t("stock.showingOut", "Showing items that are out of stock") : t("stock.showingUntracked", "Showing items without stock")}</span>
                <button type="button" onClick={() => setStockFilter("all")}>{t("stock.showAll", "Show all")}</button>
              </div>
            )}
                <div className="menu-section-subheader">
                  <h3 className="menu-section-title">
                    {isMenu ? t("menu.myMenu", "My Menu") : t("menu.myItems", "My Items")}
                    <span className="menu-items-count-badge">
                      {formatNum(filteredUserItems.length)} {filteredUserItems.length === 1 ? t("history.item", "item") : t("history.items", "items")}
                    </span>
                  </h3>
                </div>

                {filteredUserItems.length === 0 && (search.trim() || stockFilter !== "all") ? (
                  <div style={{ textAlign: "center", padding: "2.5rem 1rem", background: "#ffffff", borderRadius: "12px", border: "1px dashed #cbd5e1", marginTop: "1rem" }}>
                    <AlertCircle size={32} style={{ color: "#94a3b8", margin: "0 auto 0.5rem" }} />
                    <h4 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#0f172a", margin: "0 0 0.25rem" }}>
                      {t("menu.noMenuItems", "No menu items found")}
                    </h4>
                    <p style={{ fontSize: "0.88rem", color: "#64748b", margin: "0 0 0.75rem" }}>
                      No items in your menu match "{search}".
                    </p>
                    <button
                      type="button"
                      className="menu-secondary-btn"
                      onClick={() => setSearch("")}
                    >
                      {t("menu.clearSearch", "Clear Search")}
                    </button>
                  </div>
                ) : (

              <>
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
                              {getItemPlaceholderIcon(item.category, 28)}
                            </div>
                          )}
                          <span className="menu-card-overlay-cat">{tDb(item.category || "General")}</span>
                          <span className={`menu-card-status-pill ${isItemActive ? "active" : "inactive"}`}>
                            <span className={`menu-card-status-dot ${isItemActive ? "active" : "inactive"}`} />
                            {isItemActive ? t("menu.active", "Active") : t("menu.deactive", "Deactive")}
                          </span>
                        </div>

                        <div className="menu-card-details">
                          <h4 className="menu-card-item-name" title={item.name}>
                            {tDb(item.name)}
                          </h4>
                          <div className="menu-card-price-row">
                            <span className="menu-card-selling-price">{money(item.price)}</span>
                          </div>
                          {isInventory && (
                            <div className="menu-card-stock-row">
                              <StockBadge item={item} onClick={() => setStockItem(item)} />
                            </div>
                          )}
                        </div>

                        <div className="user-menu-card-actions">
                          {showBarcode && Boolean(item.barcode) && item.barcode_active !== false && item.barcode_active !== 0 && item.barcode_active !== "0" && item.barcode_active !== "false" && (
                            <button
                              type="button"
                              className="menu-action-btn barcode-btn"
                              onClick={() => setBarcodeModalItem(item)}
                              title={t("menu.viewBarcode", "View Barcode")}
                            >
                              <span>{t("menu.barcode", "Barcode")}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            className="menu-action-btn edit-btn"
                            onClick={() => handleOpenEditModal(item)}
                            title={t("menu.editPrice", "Edit selling price")}
                          >
                            <Edit2 size={13} />
                            <span>{t("common.edit", "Edit")}</span>
                          </button>
                          <button
                            type="button"
                            className="menu-action-btn delete-btn"
                            onClick={(e) => handleRemoveFromUserMenu(item, e)}
                            disabled={deletingId === item.id}
                            title={t("menu.removeMenu", "Remove from My Menu")}
                          >
                            {deletingId === item.id ? <Spinner size="xs" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {totalMyMenuPages > 1 && (
                  <div className="menu-pagination-bar">
                    <div className="menu-pagination-info">
                      {t("menu.showing", "Showing")} <strong>{formatNum((myMenuPage - 1) * myMenuPageSize + 1)}</strong>–<strong>{formatNum(Math.min(myMenuPage * myMenuPageSize, filteredUserItems.length))}</strong> of <strong>{formatNum(filteredUserItems.length)}</strong> items
                    </div>
                    <div className="menu-pagination-controls">
                      <button
                        type="button"
                        className="menu-pagination-btn"
                        disabled={myMenuPage <= 1}
                        onClick={() => setMyMenuPage((p) => Math.max(1, p - 1))}
                        title={t("menu.prevPage", "Previous page")}
                      >
                        <ChevronLeft size={16} /> {t("menu.prev", "Prev")}
                      </button>

                      {Array.from({ length: totalMyMenuPages }, (_, i) => i + 1).map((pg) => {
                        if (pg === 1 || pg === totalMyMenuPages || Math.abs(pg - myMenuPage) <= 1) {
                          return (
                            <button
                              key={pg}
                              type="button"
                              className={`menu-pagination-page-btn ${pg === myMenuPage ? "active" : ""}`}
                              onClick={() => setMyMenuPage(pg)}
                            >
                              {formatNum(pg)}
                            </button>
                          )
                        }
                        if ((pg === 2 && myMenuPage > 3) || (pg === totalMyMenuPages - 1 && myMenuPage < totalMyMenuPages - 2)) {
                          return <span key={pg} className="menu-pagination-ellipsis">...</span>
                        }
                        return null
                      })}

                      <button
                        type="button"
                        className="menu-pagination-btn"
                        disabled={myMenuPage >= totalMyMenuPages}
                        onClick={() => setMyMenuPage((p) => Math.min(totalMyMenuPages, p + 1))}
                        title={t("menu.nextPage", "Next page")}
                      >
                        {t("menu.next", "Next")} <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
              )}
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
          <div className="add-items-back-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <button
                className="add-items-back-btn"
                onClick={() => setCurrentView("my_menu")}
                title={isMenu ? t("menu.returnToMenu", "Return to My Menu") : t("menu.returnToItems", "Return to My Items")}
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 className="add-items-header-title">{isMenu ? t("menu.addMenu", "Add Menu") : t("menu.addItem", "Add Item")}</h2>
                <p className="menu-sub-title">{isMenu ? t("menu.catalogSubtitle", "Select your catalog and add products to your menu") : t("menu.catalogSubtitleItem", "Select your catalog and add products to your items")}</p>
              </div>
            </div>
            <button
              type="button"
              className="menu-secondary-btn"
              onClick={handleOpenCustomModal}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 0.85rem", fontSize: "0.85rem" }}
            >
              <Plus size={16} /> <span>{isMenu ? tDb("Create Custom Menu") : tDb("Create Custom Item")}</span>
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
                            {getItemPlaceholderIcon(catItem.category, 26)}
                          </div>
                        )}
                        <span className="menu-card-overlay-cat">{tDb(catItem.category || "General")}</span>
                        {showBarcode && catItem.barcode && (
                          <span className="menu-card-barcode-badge">
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
                    {t("menu.showing", "Showing")} <strong>{formatNum((catalogPage - 1) * catalogPageSize + 1)}</strong>–<strong>{formatNum(Math.min(catalogPage * catalogPageSize, filteredCatalogItems.length))}</strong> of <strong>{formatNum(filteredCatalogItems.length)}</strong> products
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginRight: "0.5rem", fontSize: "0.85rem", color: "#64748b" }}>
                      <span>{t("menu.perPage", "Per page:")}</span>
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
                      {t("menu.previous", "Previous")}
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
                      {t("menu.next", "Next")}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
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
              <h3 className="menu-modal-title">{isMenu ? t("menu.addToMyMenu", "Add to My Menu") : t("menu.addToMyItems", "Add to My Items")}</h3>
              <button className="menu-modal-close-btn" onClick={handleCloseAddModal}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmAddToMenu}>
              <div className="menu-modal-body">
                {/* item being added: fixed-size picture, name and the catalog price */}
                <div className="amm-item">
                  <div className="amm-thumb">
                    {selectedCatalogItem.image_url ? (
                      <img
                        src={selectedCatalogItem.image_url}
                        alt={selectedCatalogItem.name}
                        onError={(e) => { e.currentTarget.style.display = "none" }}
                      />
                    ) : (
                      getItemPlaceholderIcon(selectedCatalogItem.category, 24)
                    )}
                  </div>
                  <div className="amm-item-text">
                    <h4 className="amm-item-name">{tDb(selectedCatalogItem.name)}</h4>
                    {selectedCatalogItem.category && <span className="amm-item-cat">{tDb(selectedCatalogItem.category)}</span>}
                  </div>
                </div>

                <div className="amm-base">
                  <span>{t("menu.catalogBasePrice", "Catalog base price:")}</span>
                  <strong>{money(selectedCatalogItem.price)}</strong>
                </div>

                <div className="menu-modal-field amm-field">
                  <label className="menu-modal-label" htmlFor="amm-price">{t("menu.yourSellingPrice", "Your Selling Price (₹) *")}</label>
                  <div className="amm-price">
                    <span className="amm-currency">₹</span>
                    <input
                      id="amm-price"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      className="amm-price-input"
                      placeholder={t("menu.enterSellingPrice", "Enter selling price")}
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                  <span className="amm-note">
                    {t("menu.pricePersonalNote", "This price is personal to your shop and will appear on your customer receipts.")}
                  </span>
                </div>

                {isInventory && (
                <div className="menu-modal-field" style={{ marginTop: "0.9rem" }}>
                  <div className="stock-open-row">
                    <div>
                      <label className="menu-modal-label" htmlFor="amm-stock">{t("stock.openingLabel", "Opening stock")}</label>
                      <input
                        id="amm-stock"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        className="menu-modal-input"
                        placeholder={t("stock.openingPlaceholder", "Pieces you have")}
                        value={addStockQty}
                        onChange={(e) => setAddStockQty(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="menu-modal-label" htmlFor="amm-alert">{t("stock.alertLabel", "Low-stock alert at")}</label>
                      <input
                        id="amm-alert"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        className="menu-modal-input"
                        value={addLowAlert}
                        onChange={(e) => setAddLowAlert(e.target.value)}
                      />
                    </div>
                  </div>
                  <span className="stock-open-hint">{t("stock.openingHint", "Each bill takes sold pieces out of stock. Leave blank to skip stock for this item.")}</span>
                </div>
                )}

                {showBarcode && (
<>
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
                      <span>{t("menu.masterBarcode", "Master Barcode:")} <code>{selectedCatalogItem.barcode}</code></span>
                    </div>
                  )}
                </div>
</>
)}

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
                  {isSubmittingAdd ? <ButtonLoader text={t("menu.adding", "Adding...")} /> : (isMenu ? t("menu.addToMenu", "Add to Menu") : t("menu.addToItemList", "Add to Items"))}
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
                      onChange={(e) => {
                        setEditPrice(e.target.value)
                        setEditFormError("")
                      }}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {editFormError && (
                  <div style={{ color: "#ef4444", fontSize: "0.78rem", marginTop: "0.4rem", fontWeight: "600" }}>
                    {editFormError}
                  </div>
                )}

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

                {showBarcode && (
<>
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
                      <span>{t("menu.itemBarcode", "Item Barcode:")} <code>{editingItem.barcode}</code></span>
                    </div>
                  )}
                </div>
</>
)}
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
                  {isUpdatingPrice ? <ButtonLoader text={t("common.saving", "Saving...")} /> : t("common.saveChanges", "Save Changes")}
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
      {isCustomModalOpen && createPortal(
        <div className="menu-modal-backdrop" onClick={handleCloseCustomModal}>
          <div className="menu-modal-card custom-product-card" onClick={(e) => e.stopPropagation()}>
            <div className="menu-modal-header">
              <h3 className="menu-modal-title">{isMenu ? tDb("Create Custom Menu") : tDb("Create Custom Item")}</h3>
              <button className="menu-modal-close-btn" onClick={handleCloseCustomModal}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomItem}>
              <div className="menu-modal-body" style={{ padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                {/* 1. Product Image Section */}
                <div className="menu-modal-field" style={{ margin: 0 }}>
                  <div className="cp-image-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                    <label className="menu-modal-label" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.76rem" }}>
                      <ImageIcon size={13} style={{ color: "#0284c7" }} />
                      <span>{tDb("Product Image (Optional)")}</span>
                    </label>
                    <div className="cp-image-toggle" style={{ display: "flex", gap: "2px", background: "#f1f5f9", padding: "2px", borderRadius: "5px" }}>
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
                        {tDb("Upload")}
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
                        {tDb("Link")}
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
                        <div className="cp-upload-preview" style={{
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
                              alt={t("menu.preview", "Preview")}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "0.74rem", fontWeight: "700", color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {customName ? `${customName} ${tDb("Photo")}` : tDb("Photo Ready")}
                            </div>
                            <div style={{ fontSize: "0.66rem", color: "#16a34a", fontWeight: "600" }}>
                              ✓ {tDb("Attached")}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "0.3rem" }}>
                            <button
                              type="button"
                              onClick={() => customFileInputRef.current?.click()}
                              className="menu-secondary-btn"
                              style={{ padding: "0.15rem 0.45rem", fontSize: "0.68rem", height: "24px" }}
                            >
                              {tDb("Change")}
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveCustomImage}
                              className="menu-delete-btn"
                              style={{ padding: "0.15rem 0.35rem", height: "24px" }}
                              title={tDb("Remove image")}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="cp-upload-drop"
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
                          <div className="cp-upload-text" style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
                            <span style={{ fontSize: "0.76rem", fontWeight: "700", color: "#0f172a" }}>
                              {tDb("Click to upload product image")}
                            </span>
                            <span style={{ fontSize: "0.65rem", color: "#64748b" }}>
                              {tDb("(PNG, JPG, WebP max 5MB)")}
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
                            alt={t("menu.urlPreview", "URL preview")}
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
                  <label className="menu-modal-label">{tDb("Product Name *")}</label>
                  <div className="cp-name-input-wrap">
                    <input
                      type="text"
                      className="menu-modal-input"
                      placeholder={tDb("e.g. Masala Dosa, Cotton Shirt, Special Chai")}
                      value={customName}
                      onChange={(e) => handleCustomNameChange(e.target.value)}
                      required
                      autoFocus={window.matchMedia("(min-width: 641px)").matches}
                      style={{ height: "35px", fontSize: "0.85rem" }}
                    />
                    <div className="cp-name-voice-wrap">
                      <VoiceInputButton
                        size="sm"
                        variant="icon-only"
                        placeholder={t("menu.speakItemName", "Speak item name")}
                        onSpeechResult={(text) => handleCustomNameChange(text)}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Category */}
                <div className="menu-modal-field" style={{ margin: 0 }}>
                  <label className="menu-modal-label">{tDb("Category")}</label>
                  <select
                    className="menu-modal-input"
                    value={customCat}
                    onChange={(e) => setCustomCat(e.target.value)}
                    style={{
                      height: "35px",
                      fontSize: "0.85rem",
                      padding: "0 0.75rem",
                      background: "#ffffff",
                      cursor: "pointer"
                    }}
                  >
                    <option value="Small Business / Cafe & Tea">{tDb("Small Business / Cafe & Tea")}</option>
                    <option value="Kirana / Grocery Shop">{tDb("Kirana / Grocery Shop")}</option>
                    <option value="Cloth & Garments Shop">{tDb("Cloth & Garments Shop")}</option>
                    <option value="Hotel or Food Restaurant">{tDb("Hotel or Food Restaurant")}</option>
                    <option value="General">{tDb("General")}</option>
                  </select>
                </div>

                {/* 4. Selling Price */}
                <div className="menu-modal-field" style={{ margin: 0 }}>
                  <label className="menu-modal-label">{tDb("Selling Price (₹) *")}</label>
                  <div className="menu-modal-price-input-box">
                    <span className="menu-modal-currency-symbol" style={{ left: "9px", fontSize: "0.9rem" }}>₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="menu-modal-input"
                      placeholder="0.00"
                      value={customItemPrice}
                      onChange={(e) => handleCustomItemPriceChange(e.target.value)}
                      required
                      style={{ height: "35px", fontSize: "0.88rem", paddingLeft: "1.5rem" }}
                    />
                  </div>
                </div>

                {isInventory && (
                <div className="menu-modal-field" style={{ margin: 0 }}>
                  <div className="stock-open-row">
                    <div>
                      <label className="menu-modal-label" htmlFor="cp-stock">{t("stock.openingLabel", "Opening stock")}</label>
                      <input
                        id="cp-stock"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        className="menu-modal-input"
                        placeholder={t("stock.openingPlaceholder", "Pieces you have")}
                        value={customStockQty}
                        onChange={(e) => setCustomStockQty(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="menu-modal-label" htmlFor="cp-alert">{t("stock.alertLabel", "Low-stock alert at")}</label>
                      <input
                        id="cp-alert"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        className="menu-modal-input"
                        value={customLowAlert}
                        onChange={(e) => setCustomLowAlert(e.target.value)}
                      />
                    </div>
                  </div>
                  <span className="stock-open-hint">{t("stock.openingHint", "Each bill takes sold pieces out of stock. Leave blank to skip stock for this item.")}</span>
                </div>
                )}

                {showBarcode && (
<>
{/* 5. Barcode / SKU */}
                <div className="menu-modal-field" style={{ margin: 0 }}>
                  <label className="menu-modal-label">{tDb("Barcode / SKU (Optional)")}</label>
                  <input
                    type="text"
                    className="menu-modal-input"
                    placeholder={tDb("Leave blank to auto-generate")}
                    value={customBarcode}
                    onChange={(e) => setCustomBarcode(e.target.value)}
                    style={{ height: "35px", fontSize: "0.85rem" }}
                  />
                </div>

                {/* 6. Barcode Status */}
                <div className="menu-modal-field" style={{ margin: 0 }}>
                  <label className="menu-modal-label">{tDb("Barcode Status")}</label>
                  <div className="cp-status-row" style={{ display: "flex", gap: "0.4rem", height: "34px" }}>
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
                      <Check size={13} /> {tDb("Active (Scan Ready)")}
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
                      <X size={13} /> {tDb("Deactive (Manual Only)")}
                    </button>
                  </div>
                </div>
</>
)}

                {customFormError && (
                  <div style={{ color: "#ef4444", fontSize: "0.76rem", marginTop: "0.15rem" }}>
                    {tDb(customFormError)}
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
                  {tDb("Cancel")}
                </button>
                <button
                  type="submit"
                  className="menu-primary-btn"
                  disabled={isCreatingCustom}
                  style={{ height: "35px", padding: "0 1rem", fontSize: "0.82rem" }}
                >
                  {isCreatingCustom ? <ButtonLoader text={tDb("Creating...")} /> : tDb("Create Product")}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Stock popup (kirana / grocery and cloth shops) */}
      <StockModal
        item={stockItem}
        isOpen={Boolean(stockItem)}
        onClose={() => setStockItem(null)}
        onSaved={handleStockSaved}
      />

      {/* Barcode View & Print Modal */}
      <BarcodeModal
        item={barcodeModalItem}
        isOpen={Boolean(barcodeModalItem)}
        onClose={() => setBarcodeModalItem(null)}
      />
    </div>
  )
}
