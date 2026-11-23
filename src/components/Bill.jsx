import { useEffect, useLayoutEffect, useMemo, useState, useRef, lazy, Suspense } from "react"
import { printReceiptElement } from "../lib/printReceipt"
import { chargeAndPrint, spendPrintCredit, chargeAndSavePdf, printWidthOf } from "../lib/directPrint"
import { Capacitor } from "@capacitor/core"

// The Android app's print screen says whether the receipt printed. A browser's print window does not (Print and
// Cancel close it the same way), so there the app only says the receipt was sent to the printer.
const PRINT_CONFIRMED = Capacitor.isNativePlatform()
import { BUILTIN_TEMPLATES } from "./Templates"
import { RealisticReceiptView } from "./RealisticReceiptView"
import Swal from "sweetalert2"
import {
  Plus,
  Printer,
  Trash2,
  CheckCircle2,
  X,
  Search,
  Check,
  RotateCcw,
  Utensils,
  Shirt,
  ShoppingBag,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  CreditCard,
  Building,
  Phone,
  Hash,
  AlertCircle,
  FileText,
  Save,
  Pencil,
  Barcode as BarcodeIcon,
  Download,
  AlertTriangle,
  Zap,
  Receipt,
  Tag,
  Percent
} from "lucide-react"
import {
  call,
  money,
  getItemRate,
  findTemplateMatch,
  canPrintFree,
  getRemainingFreePrints,
  incrementFreePrintCount,
  getCachedData,
  syncUserQuota,
  getActivePlanDetails,
  getStoredMenuItems,
  saveStoredMenuItems,
  getCurrentUserKey,
  isMenuCategory,
  isInventoryShop,
  stockInfo,
  formatQty,
  invalidateApiCache,
  updateItemStockInStorageAndCache
} from "../lib/utils"
import { StockBadge, StockModal } from "./common/StockModal"
import { Spinner } from "./common/Skeleton"
import { useToast } from "./common/Toast"
import { VoiceInputButton } from "./common/VoiceInputButton"
import { useTranslation } from "react-i18next"
import { useDbTranslation } from "../lib/translator"
import { matchesItemFuzzy, cleanVoiceQuery } from "../lib/fuzzySearch"
// Loaded on demand: the scanner library is large and only needed once the camera is opened
const CameraScannerModal = lazy(() => import("./common/CameraScannerModal").then((m) => ({ default: m.CameraScannerModal })))
import { useBarcodeScanner } from "../hooks/useBarcodeScanner"
import { useShowBarcode } from "../hooks/useShowBarcode"
import { playScanSuccessBeep, playScanErrorBeep } from "../lib/audioFeedback"
import "../styles/NewBillFlow.css"
import { LooseQtyModal } from "./common/LooseQtyModal"
import { shopPaymentModes, shopDefaultPaymentMode } from "../lib/paymentModes"
import { UpiPayCard } from "./common/UpiQr"
import { shopUsesGst, shopShowsGstOnBill, itemGstRate, menuItemRate, gstSummary } from "../lib/gst"
import { isLooseItem, normalizeUnit, unitLabel, formatQtyUnit, roundQty } from "../lib/units"
import { EmptyMenuGuide } from "./common/EmptyMenuGuide"
import { productGroupOf, productGroupChips, productGroupLabelKey } from "../lib/productGroups"

function generateClientBillNumber(prefix = "SLP", sequence = 1001, format = "PREFIX-DATE-SEQ") {
  const cleanPrefix = (prefix || "SLP").trim().toUpperCase()
  const today = new Date()
  const year = today.getFullYear()
  const shortYear = String(year).slice(-2)
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  const dateStr = `${year}${month}${day}`
  const shortDateStr = `${shortYear}${month}${day}`
  const seqStr = String(sequence || 1001).padStart(4, "0")

  if (format === "PREFIX-SEQ") {
    return `${cleanPrefix}-${seqStr}`
  } else if (format === "PREFIX-SHORTDATE-SEQ") {
    return `${cleanPrefix}-${shortDateStr}-${seqStr}`
  } else if (format === "PREFIX-YEAR-SEQ") {
    return `${cleanPrefix}-${shortYear}-${seqStr}`
  } else if (format === "SEQ") {
    return seqStr
  } else {
    return `${cleanPrefix}-${dateStr}-${seqStr}`
  }
}

// "Use Template" (Templates page, landing page, public templates) stores the picked template here and opens New Bill
const PENDING_TEMPLATE_KEY = "slipzo-template"
const readPendingTemplate = () => {
  try { return typeof window !== "undefined" ? sessionStorage.getItem(PENDING_TEMPLATE_KEY) : null } catch (_) { return null }
}
const clearPendingTemplate = () => {
  try { sessionStorage.removeItem(PENDING_TEMPLATE_KEY) } catch (_) { }
}

export function Bill({ user, requireAuth, setView, setSelectedBillId, shop: initialShop, setShop: parentSetShop }) {
  const { t } = useTranslation()
  const { tDb, formatNum, lang } = useDbTranslation()
  const userKey = getCurrentUserKey(user)
  const [shop, setShopState] = useState(initialShop || {})
  // Cafe / tea / small business and hotel / restaurant shops do not use barcodes at all
  const showBarcode = useShowBarcode(shop?.business_type ? shop : null)
  const isMenu = isMenuCategory(shop)

  const setShop = (updater) => {
    setShopState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater
      if (parentSetShop) parentSetShop(next)
      return next
    })
  }

  useEffect(() => {
    if (initialShop) setShopState(initialShop)
  }, [initialShop])

  const { success: toastSuccess, error: toastError, info: toastInfo, warning: toastWarning } = useToast()
  const [activePlan, setActivePlan] = useState(() => getActivePlanDetails(userKey))

  useEffect(() => {
    const handleQuotaUpdate = (e) => {
      const direct = e?.detail?.quota || e?.detail?.plan
      if (direct && typeof direct === "object") {
        setActivePlan(direct)
        return
      }
      setActivePlan(getActivePlanDetails(getCurrentUserKey(user)))
    }
    window.addEventListener("slipzo-quota-update", handleQuotaUpdate)
    window.addEventListener("storage", handleQuotaUpdate)
    return () => {
      window.removeEventListener("slipzo-quota-update", handleQuotaUpdate)
      window.removeEventListener("storage", handleQuotaUpdate)
    }
  }, [user, userKey])

  // Data Caches
  const cachedShop = getCachedData("/shop")
  const cachedTemplates = getCachedData("/templates")
  const cachedMenuItems = getCachedData("/menu")

  const [templates, setTemplates] = useState(() => (Array.isArray(cachedTemplates) ? cachedTemplates : []))
  const [selectedId, setSelectedId] = useState(() => {
    const list = Array.isArray(cachedTemplates) && cachedTemplates.length > 0 ? cachedTemplates : BUILTIN_TEMPLATES
    // A template picked with "Use Template" (Templates page / landing page) comes first
    const targetTplId = readPendingTemplate() ||
      initialShop?.default_template_id ||
      cachedShop?.default_template_id ||
      (typeof window !== "undefined" ? localStorage.getItem("slipzo_default_template_id") : null)
    if (targetTplId) {
      const match = findTemplateMatch(list, targetTplId)
      if (match) return match.id
      return targetTplId
    }
    return ""
  })

  // A template picked with "Use Template" becomes the shop's receipt template (same setting as Shop Profile ->
  // Receipt Template), so this bill AND the next ones are shown and printed with it, not only one bill.
  const rememberPickedTemplate = (tpl, shopData) => {
    if (!tpl?.id) return
    try { localStorage.setItem("slipzo_default_template_id", tpl.id) } catch (_) { }
    toastSuccess(t("bills.usingTemplate", "Using the \"{{name}}\" template", { name: tDb(tpl.name || "") }))
    // workers cannot change the shop; an owner without a shop name yet keeps the choice on this device
    if (user?.staff_of || !shopData?.name || String(shopData.default_template_id || "") === String(tpl.id)) return
    const updated = { ...shopData, default_template_id: tpl.id }
    call("/shop", {
      method: "PUT",
      // the endpoint replaces name / address / phone, so the current values are sent along unchanged
      body: JSON.stringify({ name: shopData.name, address: shopData.address || "", phone: shopData.phone || "", default_template_id: tpl.id })
    }).then(() => {
      setShop(updated)
    }).catch((err) => console.warn("Could not save the picked template as default:", err))
  }

  // Listen for shop updates (e.g. template changed in Shop Profile or Onboarding)
  useEffect(() => {
    const handleShopUpdated = (e) => {
      if (e?.detail) {
        setShop(e.detail)
        if (e.detail.default_template_id) {
          const list = Array.isArray(templates) && templates.length > 0 ? templates : BUILTIN_TEMPLATES
          const match = findTemplateMatch(list, e.detail.default_template_id)
          if (match) {
            setSelectedId(match.id)
          } else {
            setSelectedId(e.detail.default_template_id)
          }
        }
      }
    }
    window.addEventListener("slipzo_shop_updated", handleShopUpdated)
    return () => window.removeEventListener("slipzo_shop_updated", handleShopUpdated)
  }, [templates])

  // Logged-in User's Personal Menu Items
  const [userMenuItems, setUserMenuItems] = useState(() => {
    const stored = getStoredMenuItems(user)
    if (Array.isArray(stored) && stored.length > 0) return stored
    if (Array.isArray(cachedMenuItems) && cachedMenuItems.length > 0) return cachedMenuItems
    return []
  })
  const [loadingMenu, setLoadingMenu] = useState(() => !cachedMenuItems && userMenuItems.length === 0)

  // Bill Items & Details State
  // The bill being built survives leaving this screen (e.g. "Add more items" opens the Menu, which unmounts this
  // page): it is kept in this browser tab for this account until it is saved, printed or cleared.
  const draftKey = `slipzo_bill_draft:${userKey || "guest"}`
  const [draft] = useState(() => {
    try {
      const d = JSON.parse(sessionStorage.getItem(draftKey) || "null")
      return d && Array.isArray(d.items) && d.items.length > 0 ? d : null
    } catch (_) {
      return null
    }
  })
  const [items, setItems] = useState(() => draft?.items || [])
  const [discountType, setDiscountType] = useState(() => draft?.discountType || "percent") // "percent" (%) default | "amount" (₹)
  const [discount, setDiscount] = useState(() => draft?.discount ?? "0")
  const [discountFocused, setDiscountFocused] = useState(false)
  const [tax, setTax] = useState("0")
  const [payment, setPayment] = useState(() => draft?.payment || shopDefaultPaymentMode(initialShop))
  // the person picked a mode on this bill (a saved draft counts): don't switch it to the shop's default
  const paymentPickedRef = useRef(Boolean(draft?.payment))
  const [saved, setSaved] = useState(null)
  const [busyAction, setBusyAction] = useState(null) // "print" | "save" | null
  const isSaving = busyAction !== null
  const [saveError, setSaveError] = useState(null)
  const [editingBillId, setEditingBillId] = useState(null)

  // paper size for printing, chosen on the bill and remembered on this device (the printer belongs to the device).
  // "" = use the receipt template's width
  const [paperSize, setPaperSizeState] = useState(() => {
    try { return localStorage.getItem("slipzo_paper_size") || "" } catch (_) { return "" }
  })
  const setPaperSize = (size) => {
    setPaperSizeState(size)
    try { localStorage.setItem("slipzo_paper_size", size) } catch (_) {}
  }

  // payment modes the shop takes (Shop profile); a new bill starts with the shop's default
  const paymentOptions = useMemo(() => shopPaymentModes(shop), [shop?.payment_modes])
  useEffect(() => {
    if (editingBillId) return
    const allowed = paymentOptions.some((m) => m.id === payment)
    if (!allowed || !paymentPickedRef.current) setPayment(shopDefaultPaymentMode(shop))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.payment_modes, shop?.default_payment_mode, editingBillId])
  const editBaseQtyRef = useRef(new Map()) // name -> quantity on the bill being edited
  const [editingBillNumber, setEditingBillNumber] = useState(null)

  // Invoice Number
  const [customBillNumber, setCustomBillNumber] = useState(() => {
    if (cachedShop) {
      return generateClientBillNumber(
        cachedShop.invoice_prefix || "SLP",
        cachedShop.invoice_sequence || 1001,
        cachedShop.invoice_format || "PREFIX-DATE-SEQ"
      )
    }
    return ""
  })

  // Load saved bill for editing if set in sessionStorage
  useEffect(() => {
    const editBillStr = sessionStorage.getItem("slipzo_edit_bill")
    if (editBillStr) {
      try {
        const editBill = JSON.parse(editBillStr)
        sessionStorage.removeItem("slipzo_edit_bill")
        if (editBill && editBill.id) {
          setEditingBillId(editBill.id)
          setEditingBillNumber(editBill.number || "")
          if (editBill.number) setCustomBillNumber(editBill.number)
          if (editBill.payment_mode) { setPayment(editBill.payment_mode); paymentPickedRef.current = true }
          if (editBill.discount_type) setDiscountType(editBill.discount_type)
          if (editBill.discount_value !== undefined) {
            setDiscount(String(editBill.discount_value))
          } else if (editBill.discount !== undefined) {
            setDiscount(String(editBill.discount))
          }
          if (editBill.tax_rate !== undefined) setTax(String(editBill.tax_rate))
          if (editBill.template_id) setSelectedId(editBill.template_id)

          let rawItems = editBill.items
          if (typeof rawItems === "string") {
            try { rawItems = JSON.parse(rawItems) } catch (_) {}
          }
          editBaseQtyRef.current = new Map()
          if (Array.isArray(rawItems)) {
            rawItems.forEach((it) => {
              const k = String(it.name || "").trim().toLowerCase()
              editBaseQtyRef.current.set(k, (editBaseQtyRef.current.get(k) || 0) + (Number(it.quantity) || 0))
            })
          }
          if (Array.isArray(rawItems) && rawItems.length > 0) {
            setItems(rawItems.map((it, idx) => ({
              id: it.id || (Date.now() + idx),
              name: it.name || "",
              barcode: it.barcode || null,
              rate: Number(it.rate) || 0,
              quantity: Number(it.quantity) || 1,
              unit: normalizeUnit(it.unit),
              gst_rate: Number(it.gst_rate) || 0,
              category: it.category || "General",
              image_url: it.image_url || ""
            })))
          }
          toastSuccess(t("bills.loadedEdit", "Loaded saved bill #{{n}} for editing", { n: editBill.number }))
        }
      } catch (e) {
        console.warn("Failed to parse edit bill:", e)
      }
    }
  }, [])

  // In-Page Flow Step: "bill" (Steps 1, 2, 3) | "success" (Step 4)
  const [flowStep, setFlowStep] = useState("bill")
  // The bill and its result screen swap on the same page, so the page would keep its scroll position
  // and the next screen would open part way down. Every step opens at the top, before it is painted.
  const shownStepRef = useRef(flowStep)
  useLayoutEffect(() => {
    if (shownStepRef.current === flowStep) return
    shownStepRef.current = flowStep
    window.scrollTo({ top: 0, left: 0, behavior: "instant" })
  }, [flowStep])
  // what the result screen reports: "saved" (not printed yet) or "printed"
  const [doneAction, setDoneAction] = useState("saved")

  // Keep the unsaved bill as a draft. A saved/printed bill or a saved bill being edited is not a draft (it lives on
  // the server; restoring it would make a duplicate new bill), and an empty bill clears it.
  useEffect(() => {
    try {
      if (items.length === 0 || saved || editingBillId || flowStep !== "bill") {
        sessionStorage.removeItem(draftKey)
      } else {
        sessionStorage.setItem(draftKey, JSON.stringify({ items, discount, discountType, payment }))
      }
    } catch (_) {}
  }, [items, discount, discountType, payment, saved, editingBillId, flowStep, draftKey])

  // Search & Category Filters (Step 1)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  // Receipt preview drawer toggle

  // Print guard to prevent duplicate print deductions
  const isPrintingRef = useRef(false)

  // Load shop, user's menu, and default template
  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      try {
        if (!user) {
          if (isMounted) {
            setTemplates(BUILTIN_TEMPLATES)
            const picked = findTemplateMatch(BUILTIN_TEMPLATES, readPendingTemplate())
            setSelectedId((picked || BUILTIN_TEMPLATES[0]).id)
            setCustomBillNumber(generateClientBillNumber("SLP", 1001, "PREFIX-DATE-SEQ"))
          }
          return
        }

        const [shopData, templatesData, menuData] = await Promise.all([
          call("/shop").catch(() => ({})),
          call("/templates").catch(() => []),
          call("/menu", { noCache: true }).catch(() => [])
        ])

        if (!isMounted) return

        setShop(shopData || {})

        const dbTemplates = Array.isArray(templatesData) ? templatesData : []
        const extraBuiltins = BUILTIN_TEMPLATES.filter(b => !dbTemplates.some(t => (t.name || "").toLowerCase() === (b.name || "").toLowerCase()))
        const combinedTemplates = dbTemplates.length > 0 ? [...dbTemplates, ...extraBuiltins] : BUILTIN_TEMPLATES
        setTemplates(combinedTemplates)

        // "Use Template" choice first, otherwise the template selected in Shop Profile
        let resolvedTpl = null
        const pendingTpl = readPendingTemplate()
        const pickedTpl = pendingTpl
          ? (findTemplateMatch(combinedTemplates, pendingTpl) || findTemplateMatch(BUILTIN_TEMPLATES, pendingTpl))
          : null
        if (pendingTpl) clearPendingTemplate()
        if (pickedTpl) {
          resolvedTpl = pickedTpl
          rememberPickedTemplate(pickedTpl, shopData)
        }
        const targetTpl = shopData?.default_template_id || (typeof window !== "undefined" ? localStorage.getItem("slipzo_default_template_id") : null)
        if (!resolvedTpl && targetTpl) {
          resolvedTpl = findTemplateMatch(combinedTemplates, targetTpl)
          if (!resolvedTpl) {
            resolvedTpl = findTemplateMatch(BUILTIN_TEMPLATES, targetTpl)
          }
        }
        if (resolvedTpl) {
          setSelectedId(resolvedTpl.id)
        } else if (combinedTemplates.length > 0 && !selectedId) {
          resolvedTpl = combinedTemplates.find(t => t.is_default) || combinedTemplates[0]
          if (resolvedTpl) setSelectedId(resolvedTpl.id)
        }

        // Set default discount and tax from shop profile
        if (shopData?.default_discount !== undefined && shopData?.default_discount !== null) {
          setDiscount(String(shopData.default_discount))
        }
        if (shopData?.tax_rate !== undefined && shopData?.tax_rate !== null) {
          setTax(String(shopData.tax_rate))
        }

        // Scoped User Menu Items with strict category isolation
        const currentBType = (shopData?.business_type || "small_business").toLowerCase()
        const isClothingShop = currentBType.includes("clothing") || currentBType.includes("garment")

        let validMenu = Array.isArray(menuData) ? menuData : (Array.isArray(menuData?.items) ? menuData.items : [])

        // If in clothing shop, strictly filter out food/drink/grocery items
        if (isClothingShop && validMenu.length > 0) {
          validMenu = validMenu.filter(it => {
            const itBType = (it.business_type || "").toLowerCase()
            const itCat = (it.category || "").toLowerCase()
            const isFood = itBType.includes("hotel") || itBType.includes("food") || itBType.includes("kirana") || itCat.includes("food") || itCat.includes("bread") || itCat.includes("beverage") || itCat.includes("chai") || itCat.includes("roti") || itCat.includes("snack") || itCat.includes("dessert") || itCat.includes("fast food")
            return !isFood && (itBType === "clothing_garments" || itCat.includes("wear") || itCat.includes("cloth") || itCat.includes("garment") || itCat.includes("saree") || itCat.includes("shirt") || itCat.includes("jean") || itCat.includes("dress") || itCat.includes("trouser") || itCat.includes("kurti") || itCat.includes("jacket") || itCat.includes("essential"))
          })
        }

        const userList = Array.isArray(validMenu) ? validMenu : []
        setUserMenuItems(userList)
        saveStoredMenuItems(userList, user)

        // Live Invoice Number
        const inv = generateClientBillNumber(
          shopData?.invoice_prefix || "SLP",
          shopData?.invoice_sequence || 1001,
          shopData?.invoice_format || "PREFIX-DATE-SEQ"
        )
        setCustomBillNumber(inv)
      } catch (err) {
        console.error("Failed to load bill data:", err)
      } finally {
        if (isMounted) setLoadingMenu(false)
      }
    }

    loadData()

    const handleShopUpdate = (e) => {
      if (e?.detail) setShop(e.detail)
      loadData()
    }

    const handleMenuUpdate = (e) => {
      if (Array.isArray(e?.detail?.items) && e.detail.items.length > 0) {
        setUserMenuItems(e.detail.items)
      } else if (e?.detail?.updatedItem) {
        const { id, stock_qty, track_stock, low_stock_alert } = e.detail.updatedItem
        setUserMenuItems((prev) => prev.map((it) => (it.id === id ? { ...it, stock_qty, track_stock, low_stock_alert } : it)))
      } else {
        const stored = getStoredMenuItems(user)
        if (stored.length > 0) setUserMenuItems(stored)
        else call("/menu", { noCache: true }).then(res => {
          if (Array.isArray(res)) setUserMenuItems(res)
        }).catch(() => { })
      }
    }

    const handleStockUpdated = (e) => {
      const { id, stock_qty, track_stock, low_stock_alert } = e?.detail || {}
      if (!id) return
      setUserMenuItems((prev) => prev.map((it) => (it.id === id ? { ...it, stock_qty, track_stock, low_stock_alert } : it)))
    }

    window.addEventListener("slipzo_shop_updated", handleShopUpdate)
    window.addEventListener("slipzo-menu-update", handleMenuUpdate)
    window.addEventListener("slipzo-stock-updated", handleStockUpdated)

    return () => {
      isMounted = false
      window.removeEventListener("slipzo_shop_updated", handleShopUpdate)
      window.removeEventListener("slipzo-menu-update", handleMenuUpdate)
      window.removeEventListener("slipzo-stock-updated", handleStockUpdated)
    }
  }, [user, userKey])

  // Resolve active template
  const activeTemplate = useMemo(() => {
    const list = Array.isArray(templates) && templates.length > 0 ? templates : BUILTIN_TEMPLATES
    return findTemplateMatch(list, selectedId) || list.find(t => t.is_default) || list[0] || BUILTIN_TEMPLATES[0]
  }, [templates, selectedId])

  const templateType = useMemo(() => {
    const id = String(activeTemplate?.id || "").toLowerCase()
    if (id === "1" || id.includes("classic")) return "classic"
    if (id === "2" || id.includes("minimal")) return "minimal"
    if (id === "3" || id.includes("pro")) return "pro"
    if (id === "4" || id.includes("eco")) return "eco"
    if (id === "5" || id.includes("modern")) return "modern"
    if (id === "6" || id.includes("elite")) return "elite"
    return "classic"
  }, [activeTemplate])

  // Totals calculation

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0)
  }, [items])

  const discountAmount = useMemo(() => {
    const val = parseFloat(discount) || 0
    if (val <= 0) return 0
    if (discountType === "percent") {
      const pct = Math.min(100, Math.max(0, val))
      return Math.min(subtotal, Math.round(((subtotal * pct) / 100) * 100) / 100)
    }
    return Math.min(val, subtotal)
  }, [discount, discountType, subtotal])

  const total = useMemo(() => {
    return Math.max(0, subtotal - discountAmount)
  }, [subtotal, discountAmount])

  // Total quantity of items in current bill
  const totalItemsInBill = useMemo(() => {
    return items.reduce((sum, item) => sum + (normalizeUnit(item.unit) ? 1 : (Number(item.quantity) || 0)), 0)
  }, [items])

  // Helper for category emoji matching reference design
  const getCategoryIcon = (catName) => {
    const c = (catName || "").toLowerCase().trim()
    if (c.includes("beverage") || c.includes("drink") || c.includes("coffee") || c.includes("tea")) return "☕ "
    if (c.includes("snack") || c.includes("burger") || c.includes("pizza") || c.includes("fast food")) return "🍟 "
    if (c.includes("bakery") || c.includes("cake") || c.includes("bread")) return "🥐 "
    if (c.includes("main") || c.includes("meal") || c.includes("thali") || c.includes("rice")) return "🍲 "
    if (c.includes("dessert") || c.includes("sweet") || c.includes("ice cream")) return "🧁 "
    return ""
  }

  // Filter chips: the shop type's 4-5 product groups that have items (see lib/productGroups)
  const groupChips = useMemo(() => productGroupChips(userMenuItems, shop?.business_type), [userMenuItems, shop?.business_type])
  useEffect(() => {
    if (selectedCategory !== "all" && !groupChips.some((g) => g.id === selectedCategory)) setSelectedCategory("all")
  }, [groupChips, selectedCategory])

  // Map of added bill items by clean name (for card button and quantity controls)
  const addedItemMap = useMemo(() => {
    const map = new Map()
    items.forEach((it, idx) => {
      map.set((it.name || "").trim().toLowerCase(), { ...it, billIndex: idx })
    })
    return map
  }, [items])

  // Filter the menu items. Cards keep their menu order: adding an item to the bill never moves its card
  // (it only shows the quantity controls in the same place).
  const filteredMenuItems = useMemo(() => {
    const q = search.trim()
    const filtered = userMenuItems.filter((it) => {
      const matchesSearch = !q || matchesItemFuzzy(it, q, { tDb, lang })
      const matchesCat = selectedCategory === "all" || productGroupOf(it, shop?.business_type) === selectedCategory
      return matchesSearch && matchesCat
    })

    return filtered
  }, [userMenuItems, search, selectedCategory, shop?.business_type])

  // Pagination for My Menu Items on New Bill page
  const [menuPage, setMenuPage] = useState(1)
  const menuPageSize = 6

  // Reset page when search or category filter changes
  useEffect(() => {
    setMenuPage(1)
  }, [search, selectedCategory])

  const totalMenuPages = Math.ceil(filteredMenuItems.length / menuPageSize) || 1
  const startItemIndex = filteredMenuItems.length > 0 ? (menuPage - 1) * menuPageSize + 1 : 0
  const endItemIndex = Math.min(menuPage * menuPageSize, filteredMenuItems.length)

  const paginatedMenuItems = useMemo(() => {
    const start = (menuPage - 1) * menuPageSize
    return filteredMenuItems.slice(start, start + menuPageSize)
  }, [filteredMenuItems, menuPage, menuPageSize])

  useEffect(() => {
    if (menuPage > totalMenuPages) {
      setMenuPage(Math.max(1, totalMenuPages))
    }
  }, [totalMenuPages, menuPage])

  // ==========================================
  // HANDLERS: ADD / MANAGE ITEMS
  // ==========================================
  // ---------- stock (kirana / grocery and cloth shops) ----------
  const isInventory = isInventoryShop(shop?.business_type)
  // The owner can restock straight from the bill (workers may not change stock, the server refuses it)
  const canManageStock = isInventory && !user?.staff_of
  const [stockItem, setStockItem] = useState(null)
  const handleStockSaved = (res) => {
    if (!res?.id) return
    setUserMenuItems((prev) => {
      const next = prev.map((it) => (it.id === res.id
        ? { ...it, stock_qty: res.stock_qty, track_stock: res.track_stock, low_stock_alert: res.low_stock_alert }
        : it))
      saveStoredMenuItems(next, user)
      return next
    })
    toastSuccess(t("stock.saved", "Stock updated"))
  }
  const findMenuItemFor = (line) => {
    const code = String(line?.barcode || "").trim().toLowerCase()
    const name = String(line?.name || "").trim().toLowerCase()
    return (code && userMenuItems.find((m) => String(m.barcode || "").trim().toLowerCase() === code)) ||
      userMenuItems.find((m) => String(m.name || "").trim().toLowerCase() === name) || null
  }
  // most pieces of an item this bill may hold (Infinity when the item has no stock count)
  const maxQtyFor = (menuItem) => {
    if (!isInventory || !menuItem) return Infinity
    const info = stockInfo(menuItem)
    if (!info.tracked) return Infinity
    const onThisBill = editingBillId ? (editBaseQtyRef.current.get(String(menuItem.name || "").trim().toLowerCase()) || 0) : 0
    return Math.max(0, info.qty + onThisBill)
  }
  // the bill cannot take more than is in stock: says why and returns true when the change is refused
  const refuseIfShort = (menuItem, wantedQty) => {
    const max = maxQtyFor(menuItem)
    if (wantedQty <= max) return false
    playScanErrorBeep()
    toastError(max <= 0
      ? t("stock.warnOut", "\"{{name}}\" is out of stock", { name: menuItem.name })
      : t("stock.warnShort", "Only {{n}} of \"{{name}}\" left in stock", { n: formatQtyUnit(max, menuItem.unit), name: menuItem.name }))
    return true
  }
  // after a bill is saved the server has taken the sold pieces out of stock: show the new counts
  const refreshMenuStock = () => {
    if (!isInventory) return
    invalidateApiCache("/menu")
    call("/menu", { noCache: true }).then((res) => {
      if (Array.isArray(res)) {
        setUserMenuItems(res)
        saveStoredMenuItems(res, user)
      }
    }).catch(() => {})
  }

  // loose item (sold by kg, litre, ...): the quantity box is open for { menuItem, lineId, initialQty }
  const [looseEntry, setLooseEntry] = useState(null)
  const openLooseEntry = (menuItem) => {
    const cleanName = (menuItem.name || "").trim().toLowerCase()
    const line = items.find((i) => (i.name || "").trim().toLowerCase() === cleanName)
    setLooseEntry({ menuItem, lineId: line?.id || null, initialQty: line ? Number(line.quantity) || 0 : 0 })
  }
  const handleLooseConfirm = (qty) => {
    if (!looseEntry) return
    const { menuItem, lineId } = looseEntry
    const q = roundQty(qty)
    if (lineId) {
      setItems((prev) => prev.map((it) => (it.id === lineId ? { ...it, quantity: q } : it)))
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: Date.now() + Math.floor(Math.random() * 1000),
          name: (menuItem.name || "").trim(),
          barcode: menuItem.barcode || null,
          rate: menuItemRate(menuItem, shop),
          gst_rate: itemGstRate(menuItem, shop),
          quantity: q,
          unit: normalizeUnit(menuItem.unit),
          category: menuItem.category || "General",
          image_url: menuItem.image_url || ""
        }
      ])
    }
    setLooseEntry(null)
  }

  const handleAddItemFromMenu = (menuItem) => {
    if (!menuItem) return false

    // Verify active status and master catalog availability
    if (menuItem.is_active === false || menuItem.is_available === false) {
      playScanErrorBeep()
      Swal.fire({
        title: t("bills.itemUnavailable", "Item Not Available"),
        text: t("bills.itemUnavailableText", "This item is currently unavailable in your menu and cannot be added to the bill."),
        icon: "warning",
        confirmButtonColor: "#0284c7",
        confirmButtonText: "OK"
      })
      return false
    }

    // loose items ask how much (2.5 kg) instead of adding one piece
    const looseSource = isLooseItem(menuItem) ? menuItem : findMenuItemFor(menuItem)
    if (isLooseItem(looseSource)) {
      if (maxQtyFor(looseSource) <= 0) {
        refuseIfShort(looseSource, 1)
        return false
      }
      openLooseEntry({ ...menuItem, unit: looseSource.unit })
      return true
    }

    const cleanName = (menuItem.name || "").trim()
    const rate = menuItemRate(menuItem, shop)

    const inCart = items.find((i) => (i.name || "").trim().toLowerCase() === cleanName.toLowerCase())
    if (refuseIfShort(findMenuItemFor(menuItem) || menuItem, Number(inCart?.quantity || 0) + 1)) return false

    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => (i.name || "").trim().toLowerCase() === cleanName.toLowerCase())
      if (existingIdx >= 0) {
        const updatedQty = Number(prev[existingIdx].quantity || 0) + 1
        return prev.map((item, idx) =>
          idx === existingIdx ? { ...item, quantity: updatedQty } : item
        )
      } else {
        const newId = Date.now() + Math.floor(Math.random() * 1000)
        return [
          ...prev,
          {
            id: newId,
            name: cleanName,
            barcode: menuItem.barcode || null,
            rate: rate,
            gst_rate: itemGstRate(menuItem, shop),
            quantity: 1,
            category: menuItem.category || "General",
            image_url: menuItem.image_url || ""
          }
        ]
      }
    })
    return true
  }

  const handleUpdateQuantity = (itemId, delta) => {
    const line = items.find((it) => it.id === itemId)
    if (delta > 0) {
      if (line && refuseIfShort(findMenuItemFor(line), (Number(line.quantity) || 1) + delta)) return
    }
    // "−" on the last piece takes the item off the bill: confirm it like the trash button
    if (delta < 0 && line && (Number(line.quantity) || 1) + delta <= 0) {
      handleDeleteItem(line.name || line.id, line.name)
      return
    }
    setItems((prev) =>
      prev.reduce((acc, it) => {
        if (it.id !== itemId) {
          acc.push(it)
          return acc
        }
        const newQty = (Number(it.quantity) || 1) + delta
        if (newQty > 0) acc.push({ ...it, quantity: newQty })
        return acc
      }, [])
    )
  }

  // Trash button on a bill line: ask first, then take the item off the bill
  const handleDeleteItem = async (itemIdOrName, displayName) => {
    if (Swal.isVisible()) return
    const name = displayName || (typeof itemIdOrName === "string" ? itemIdOrName : "")
    const confirmResult = await Swal.fire({
      title: t("bills.removeItemTitle", "Remove this item?"),
      text: name
        ? t("bills.removeItemText", "\"{{name}}\" will be removed from this bill.", { name: tDb(name) })
        : t("bills.removeItemTextGeneric", "This item will be removed from this bill."),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: t("bills.removeItemYes", "Yes, remove"),
      cancelButtonText: t("common.cancel", "Cancel"),
      reverseButtons: true,
      focusCancel: true
    })
    if (!confirmResult.isConfirmed) return

    const targetName = typeof itemIdOrName === "string" ? itemIdOrName.trim().toLowerCase() : null
    setItems((prev) =>
      prev.filter((it) =>
        targetName
          ? (it.name || "").trim().toLowerCase() !== targetName
          : it.id !== itemIdOrName
      )
    )
  }

  const handleClearAll = async () => {
    if (items.length === 0) return
    const confirmResult = await Swal.fire({
      title: t("bills.clearTitle", "Clear All Items?"),
      text: t("bills.clearText", "Are you sure you want to remove all items from this bill?"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: t("bills.clearYes", "Yes, Clear All"),
      cancelButtonText: t("common.cancel", "Cancel"),
      reverseButtons: true,
      focusCancel: true
    })
    if (confirmResult.isConfirmed) {
      setItems([])
    }
  }

  const handleAddMoreItemsClick = () => {
    sessionStorage.setItem("slipzo_menu_initial_tab", "add_items")
    setView?.("menu")
  }

  // ==========================================
  // UNIFIED BARCODE DETECTION HANDLER
  // Camera, USB/BT Scanner & Manual Entry all route here!
  // ==========================================
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false)

  const handleBarcodeDetected = async (rawBarcode) => {
    if (!rawBarcode || !String(rawBarcode).trim()) return false
    let clean = String(rawBarcode)
      .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
      .replace(/^\][A-Za-z0-9]{2}/, "")
      .trim()

    if (!clean) return false

    // Normalize hardware scanner regional keyboard layout mappings & unpadded inputs
    if (/^-4-+\d+$/i.test(clean)) {
      const numPart = clean.replace(/^-4-+/, "")
      clean = `SLP-${numPart.padStart(6, "0")}`
    } else if (/^SLP\d+$/i.test(clean)) {
      const numPart = clean.slice(3)
      clean = `SLP-${numPart.padStart(6, "0")}`
    } else if (/^SLP-\d+$/i.test(clean)) {
      const numPart = clean.slice(4)
      clean = `SLP-${numPart.padStart(6, "0")}`
    }

    const barcode = clean

    // 1. Check local loaded userMenuItems first (authenticated shopkeeper's menu)
    let localMatch = userMenuItems.find(
      (it) => (it.barcode || "").trim().toLowerCase() === barcode.toLowerCase()
    )

    if (!localMatch && /^\d+$/.test(barcode)) {
      const padded = `SLP-${barcode.padStart(6, "0")}`.toLowerCase()
      localMatch = userMenuItems.find(
        (it) => (it.barcode || "").trim().toLowerCase() === padded
      )
    }

    if (!localMatch) {
      const strippedBarcode = barcode.replace(/^SLP-?/i, "").toLowerCase()
      localMatch = userMenuItems.find((it) => {
        const itemBarcode = (it.barcode || "").trim().toLowerCase()
        const strippedItemBarcode = itemBarcode.replace(/^SLP-?/i, "")
        return itemBarcode === barcode.toLowerCase() || (strippedBarcode && strippedItemBarcode === strippedBarcode)
      })
    }

    if (localMatch) {
      if (localMatch.is_active === false || localMatch.is_available === false || localMatch.barcode_active === false) {
        playScanErrorBeep()
        await Swal.fire({
          title: t("bills.itemUnavailable", "Item Not Available"),
          text: localMatch.barcode_active === false
            ? "Barcode scanning is deactivated for this item in your menu."
            : t("bills.itemUnavailableText", "This item is currently unavailable in your menu and cannot be added to the bill."),
          icon: "warning",
          confirmButtonColor: "#0284c7",
          confirmButtonText: "OK"
        })
        return false
      }
      if (!handleAddItemFromMenu(localMatch)) return false
      playScanSuccessBeep()
      return true
    }

    // 2. Query backend barcode lookup endpoint (server-side shop isolation & availability check)
    try {
      const res = await call(`/menu/barcode/${encodeURIComponent(barcode)}`)

      if (res && res.found && res.available && res.item) {
        if (res.item.is_active === false || res.item.is_available === false) {
          playScanErrorBeep()
          await Swal.fire({
            title: t("bills.itemUnavailable", "Item Not Available"),
            text: t("bills.itemUnavailableText", "This item is currently unavailable in your menu and cannot be added to the bill."),
            icon: "warning",
            confirmButtonColor: "#0284c7",
            confirmButtonText: "OK"
          })
          return false
        }
        if (!handleAddItemFromMenu(res.item)) return false
        playScanSuccessBeep()
        return true
      }

      // 3. Item is in Master Catalog, but not available in current shopkeeper's menu
      if (res && res.found && (!res.available || res.in_catalog || res.code === "NOT_IN_USER_MENU" || res.code === "ITEM_UNAVAILABLE")) {
        playScanErrorBeep()
        await Swal.fire({
          title: t("bills.itemUnavailable", "Item Not Available"),
          text: t("bills.itemUnavailableText", "This item is currently unavailable in your menu and cannot be added to the bill."),
          icon: "warning",
          confirmButtonColor: "#0284c7",
          confirmButtonText: "OK"
        })
        return false
      }
    } catch (err) {
      // Backend returned 422 (Unavailable / Inactive / Not in user menu)
      if (
        err?.code === "ITEM_UNAVAILABLE" ||
        err?.code === "ITEM_INACTIVE" ||
        err?.code === "NOT_IN_USER_MENU" ||
        err?.status === 422 ||
        err?.found ||
        err?.in_catalog
      ) {
        playScanErrorBeep()
        await Swal.fire({
          title: t("bills.itemUnavailable", "Item Not Available"),
          text: t("bills.itemUnavailableText", "This item is currently unavailable in your menu and cannot be added to the bill."),
          icon: "warning",
          confirmButtonColor: "#0284c7",
          confirmButtonText: "OK"
        })
        return false
      }

      // 4. Unknown Barcode (404 Product Not Found)
      if (err?.code === "PRODUCT_NOT_FOUND" || err?.status === 404) {
        playScanErrorBeep()
        const notFoundResult = await Swal.fire({
          title: t("bills.productNotFound", "Product Not Found"),
          text: `No product was found matching barcode "${barcode}".`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#0284c7",
          cancelButtonColor: "#64748b",
          confirmButtonText: t("bills.addProduct", "Add Product"),
          cancelButtonText: t("common.cancel", "Cancel")
        })

        if (notFoundResult.isConfirmed) {
          sessionStorage.setItem("slipzo_menu_initial_tab", "add_items")
          setView?.("menu")
        }
        return false
      }
    }

    // Default Fallback: Unknown Barcode
    playScanErrorBeep()
    const notFoundResult = await Swal.fire({
      title: t("bills.productNotFound", "Product Not Found"),
      text: `No product was found matching barcode "${barcode}".`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#0284c7",
      cancelButtonColor: "#64748b",
      confirmButtonText: t("bills.addProduct", "Add Product"),
      cancelButtonText: t("common.cancel", "Cancel")
    })

    if (notFoundResult.isConfirmed) {
      sessionStorage.setItem("slipzo_menu_initial_tab", "add_items")
      setView?.("menu")
    }
    return false
  }

  // Hardware USB / Bluetooth Scanner listener
  useBarcodeScanner(
    (scannedBarcode) => {
      setSearch("")
      handleBarcodeDetected(scannedBarcode)
    },
    { enabled: flowStep === "bill" && showBarcode }
  )

  // ==========================================
  // HANDLERS: SAVE BILL (0 PRINT CREDITS)
  // ==========================================
  const handleSaveBill = async () => {
    if (isSaving) return

    if (!user) {
      requireAuth?.("dashboard")
      return
    }

    const validItems = items.filter((item) => item.name && item.name.trim() && Number(item.quantity) > 0)
    if (validItems.length === 0) {
      toastError(t("bills.err_noItems", "Please add at least one item to save the bill."))
      return
    }

    setBusyAction("save")
    setSaveError(null)

    try {
      const billData = {
        template_id: activeTemplate?.id || selectedId || "",
        template_name: activeTemplate?.name || "",
        template_width: currentPaperWidth,
        items: validItems.map((item) => ({
          name: item.name.trim(),
          barcode: item.barcode || null,
          quantity: Number(item.quantity) || 1,
          rate: getItemRate(item),
          unit: normalizeUnit(item.unit) || null,
          // GST % in this line's rate, so the day's GST can be added up from saved bills
          gst_rate: Number(item.gst_rate) || 0
        })),
        subtotal: subtotal,
        discount: discountAmount,
        discount_type: discountType,
        discount_value: Number(discount) || 0,
        tax_rate: 0,
        tax_mode: 0,
        tax_amount: 0,
        total: total,
        payment_mode: payment,
        number: customBillNumber || "",
        is_saved: true
      }

      // Save bill to backend (update if editing, create if new) - Deducts 0 print credits!
      let bill
      const existingId = editingBillId || saved?.id
      if (existingId) {
        bill = await call(`/bills/${existingId}`, {
          method: "PUT",
          body: JSON.stringify(billData)
        })
        bill = { ...(saved || {}), ...(bill || {}), id: existingId }
        toastSuccess(t("bills.updatedOk", "Bill #{{n}} updated successfully!", { n: bill?.number || customBillNumber }))
      } else {
        bill = await call("/bills", {
          method: "POST",
          body: JSON.stringify(billData)
        })
        toastSuccess(t("bills.savedOk", "Bill #{{n}} saved successfully!", { n: bill?.number || customBillNumber }))
      }

      setSaved(bill)
      refreshMenuStock()
      window.dispatchEvent(new CustomEvent("slipzo_bill_saved", { detail: bill }))
      if (bill?.number) {
        setCustomBillNumber(bill.number)
      }

      setDoneAction("saved")
      setFlowStep("success")
    } catch (err) {
      console.error("Failed to save bill:", err)
      const msg = err.detail || err.message || t("bills.err_saveFailed", "Failed to save bill. Please try again.")
      setSaveError(msg)
      toastError(msg)
    } finally {
      setBusyAction(null)
    }
  }

  // Browser printing ("quiet"): the print window closes the same way for Print, Save as PDF and Cancel, so nothing
  // changes on screen afterwards. The bill uses one credit when its print window first closes; printing it again
  // (or saving its PDF) is free.
  const unchargedPrintRef = useRef(null) // bill sent to a print window, credit not used yet
  const chargedBillIdsRef = useRef(new Set()) // bills whose credit was already used in this visit
  const chargeSentPrint = async () => {
    const bill = unchargedPrintRef.current
    if (!bill) return
    unchargedPrintRef.current = null
    if (bill.id && chargedBillIdsRef.current.has(bill.id)) return
    if (bill.id) chargedBillIdsRef.current.add(bill.id)
    await spendPrintCredit(user)
    if (bill.id) await call(`/bills/${bill.id}/print`, { method: "POST" }).catch(() => {})
    window.dispatchEvent(new CustomEvent("slipzo_bill_printed", { detail: bill }))
  }
  // leaving the page with a bill sent to the printer still uses its credit
  useEffect(() => () => { chargeSentPrint().catch(() => {}) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Print from the result screen. The bill is already saved. Android app: marked printed (and a credit used) once
  // its print screen says it printed. Browser: see chargeSentPrint above.
  // Resolves the chargeAndPrint result: true, "sent" (browser), "cancelled", "failed" or false (no print credits).
  const printNow = async (bill) => {
    await new Promise((resolve) => setTimeout(resolve, 60)) // let the receipt pick up the saved bill number
    const ok = await chargeAndPrint({
      user,
      elementId: "receipt-to-print",
      pageWidth: printWidthOf(templateForPrint?.width),
      onNeedPlan: () => setView("pricing"),
      billNumber: bill?.number || customBillNumber,
      chargeLater: !PRINT_CONFIRMED
    })
    if (ok === "sent") {
      // the print window closed (printed, saved as PDF, or cancelled: a browser does not say which).
      // The bill's credit is used now, once per bill; no message and no change on screen.
      if (!(bill?.id && chargedBillIdsRef.current.has(bill.id))) {
        unchargedPrintRef.current = bill
        await chargeSentPrint()
      }
      return ok
    }
    if (ok === "cancelled") {
      toastInfo(t("bills.notPrintedSaved", "Not printed. The bill is saved, so you can print it any time."))
      // a bill that already printed once stays "printed" when a reprint is cancelled
      setDoneAction((prev) => (prev === "printed" ? prev : "saved"))
      return ok
    }
    if (ok !== true) return ok
    if (bill?.id) await call(`/bills/${bill.id}/print`, { method: "POST" }).catch(() => {})
    refreshMenuStock()
    window.dispatchEvent(new CustomEvent("slipzo_bill_printed", { detail: bill }))
    toastSuccess(t("bills.printedSuccess", "Printed successfully!"))
    setDoneAction("printed")
    setFlowStep("success")

    // Low prints reminder check
    const currentAuthKey = getCurrentUserKey(user)
    const freshPlan = getActivePlanDetails(currentAuthKey)
    const rem = freshPlan?.printsRemaining !== undefined ? Number(freshPlan.printsRemaining) : null
    if (rem !== null && rem <= 10 && rem > 0) {
      const alertedKey = `slipzo_low_prints_dialog_${currentAuthKey}`
      const lastAlerted = Number(sessionStorage.getItem(alertedKey) || -1)
      if (rem === 10 || (lastAlerted !== rem && rem <= 5)) {
        sessionStorage.setItem(alertedKey, String(rem))
        Swal.fire({
          title: t("bills.lowPrintsReminderTitle", "Low Print Balance Reminder"),
          html: `<p style="font-size:0.95rem;color:#475569;margin:0 0 0.5rem 0">${t("bills.lowPrintsReminderText", "You have only {{n}} prints remaining in your plan. Recharge now to keep printing uninterrupted.", { n: rem })}</p>`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: t("bills.rechargeNow", "Recharge Now"),
          cancelButtonText: t("bills.later", "Later"),
          confirmButtonColor: "#0284c7"
        }).then((result) => {
          if (result.isConfirmed) {
            setView("pricing")
          }
        })
      }
    }
    return true
  }

  // Saving the bill as a PDF counts as printing it: one credit per bill, like printing (a bill whose credit was
  // already used gets its PDF free, and printing it after the PDF is free too).
  const handleDownloadPdf = async () => {
    const billId = saved?.id
    // a print window was already opened for this bill: its credit is used now and covers the PDF
    if (billId && unchargedPrintRef.current?.id === billId) await chargeSentPrint()
    const free = doneAction === "printed" || Boolean(billId && chargedBillIdsRef.current.has(billId))
    const ok = await chargeAndSavePdf({
      user,
      elementId: "receipt-to-print",
      pageWidth: printWidthOf(templateForPrint?.width),
      billNumber: saved?.number || customBillNumber,
      onNeedPlan: () => setView("pricing"),
      free
    })
    if (!ok || free) return
    unchargedPrintRef.current = null
    if (billId) {
      chargedBillIdsRef.current.add(billId)
      call(`/bills/${billId}/print`, { method: "POST" }).catch(() => {})
      window.dispatchEvent(new CustomEvent("slipzo_bill_printed", { detail: saved }))
    }
  }

  // ==========================================
  // HANDLERS: PRINT AGAIN (FOR ALREADY PRINTED BILLS)
  // ==========================================
  const handlePrintAgain = async () => {
    if (isSaving) return
    const billToPrint = saved || {
      id: editingBillId,
      number: customBillNumber,
      items,
      total,
      subtotal,
      discount: discountAmount,
      discount_type: discountType,
      discount_value: Number(discount) || 0,
      payment_mode: payment
    }
    setBusyAction("print")
    try {
      const ok = await printNow(billToPrint)
      if (ok === false) {
        toastError(t("bills.savedNotPrinted", "The bill is saved but was not printed. Add print credits and press Print again."))
      }
    } catch (err) {
      console.error("Print again failed:", err)
      const msg = err?.detail || err?.message || t("bills.err_saveFailed", "Failed to print receipt.")
      toastError(msg)
    } finally {
      setBusyAction(null)
    }
  }

  // ==========================================
  // HANDLERS: PRINT BILL -> SAVE, THEN PRINT DIRECTLY
  // ==========================================
  const handlePrintBill = async () => {
    if (isSaving) return

    if (!user) {
      requireAuth?.("bills")
      return
    }

    // If bill was already saved & printed, re-printing should directly print without re-saving
    if (doneAction === "printed" && saved) {
      return handlePrintAgain()
    }

    const validItems = items.filter((item) => item.name && item.name.trim() && Number(item.quantity) > 0)
    if (validItems.length === 0) {
      toastError(t("bills.addItemsBeforePrint", "Please add items to bill before printing."))
      return
    }

    setBusyAction("print")
    setSaveError(null)

    try {
      const billData = {
        template_id: activeTemplate?.id || selectedId || "",
        template_name: activeTemplate?.name || "",
        template_width: currentPaperWidth,
        items: validItems.map((item) => ({
          name: item.name.trim(),
          barcode: item.barcode || null,
          quantity: Number(item.quantity) || 1,
          rate: getItemRate(item),
          unit: normalizeUnit(item.unit) || null,
          // GST % in this line's rate, so the day's GST can be added up from saved bills
          gst_rate: Number(item.gst_rate) || 0
        })),
        subtotal: subtotal,
        discount: discountAmount,
        discount_type: discountType,
        discount_value: Number(discount) || 0,
        tax_rate: 0,
        tax_mode: 0,
        tax_amount: 0,
        total: total,
        payment_mode: payment,
        number: customBillNumber || "",
        // kept as a saved bill until it has really printed (a cancelled print then waits under "Waiting to print")
        is_saved: true
      }

      // the bill already exists (being edited, saved, or a print that was cancelled): update it with what is on screen
      let bill
      const isPrinted = doneAction === "printed"
      const existingId = editingBillId || (saved?.id && !isPrinted ? saved?.id : null)
      if (existingId) {
        try {
          await call(`/bills/${existingId}`, {
            method: "PUT",
            body: JSON.stringify(billData)
          })
          bill = { ...(saved || {}), ...billData, id: existingId, number: saved?.number || editingBillNumber || customBillNumber }
        } catch (updateErr) {
          console.warn("Could not update bill in backend:", updateErr)
          bill = { ...(saved || {}), ...billData, id: existingId, number: saved?.number || editingBillNumber || customBillNumber }
        }
      } else {
        bill = await call("/bills", {
          method: "POST",
          body: JSON.stringify(billData)
        })
      }

      setSaved(bill)
      refreshMenuStock()
      window.dispatchEvent(new CustomEvent("slipzo_bill_saved", { detail: bill }))
      if (bill?.number) {
        setCustomBillNumber(bill.number)
      }

      // The result screen comes first: there the paper size is chosen and its Print button opens the print window
      setDoneAction("saved")
      setFlowStep("success")
    } catch (err) {
      console.error("Failed to save and print bill:", err)
      const msg = err.detail || err.message || t("bills.err_saveFailed", "Failed to save bill. Please try again.")
      setSaveError(msg)
      toastError(msg)
    } finally {
      setBusyAction(null)
    }
  }

  // ==========================================
  // HANDLERS: DIRECT PRINT (1 PRINT CREDIT)
  // ==========================================
  const handleDirectPrint = async () => {
    if (isPrintingRef.current) return
    isPrintingRef.current = true

    const userAuthKey = getCurrentUserKey(user)

    // Check if user has available quota
    if (!canPrintFree(userAuthKey)) {
      const plan = getActivePlanDetails(userAuthKey)
      if (plan?.isFreeTier) {
        window.dispatchEvent(new CustomEvent("slipzo-show-free-reward-expired", { detail: { force: true } }))
      } else {
        Swal.fire({
          title: t("bills.quotaTitle", "Print Quota Limit Reached"),
          text: t("bills.quotaText", "You have used all available prints in your plan. Please view pricing plans to add print credits."),
          icon: "warning",
          confirmButtonText: t("bills.viewPlans", "View Pricing Plans"),
          confirmButtonColor: "#0284c7"
        }).then(() => {
          setView("pricing")
        })
      }
      isPrintingRef.current = false
      return
    }

    try {
      const templateWidth = printWidthOf(templateForPrint?.width)
      const result = await printReceiptElement("receipt-to-print", {
        pageWidth: templateWidth || "80mm"
      })
      if (result?.printed && PRINT_CONFIRMED) toastSuccess(t("bills.printedSuccess", "Printed successfully!"))
      else if (result?.cancelled) toastInfo(t("bills.printCancelled", "Print cancelled. Nothing was printed."))
    } catch (err) {
      console.error("Printing failed:", err)
      toastError(t("bills.err_printFailed", "Printing failed. Please check printer connection."))
    } finally {
      setTimeout(() => {
        isPrintingRef.current = false
      }, 800)
    }
  }

  // Create new bill (reset state for next customer)
  // Result screen -> back to the bill with the same items, to change them. The bill is already saved, so the next
  // Print or Save updates it (same bill number). Only offered before the receipt has printed.
  const handleBackToBill = () => {
    // going back to change the bill: what was sent to the print window is not charged
    unchargedPrintRef.current = null
    setFlowStep("bill")
  }

  const handleCreateNewBill = () => {
    chargeSentPrint()
    setItems([])
    setDiscount("0")
    setDiscountType("percent")
    setSaved(null)
    setSaveError(null)
    setSearch("")
    setSelectedCategory("all")
    setPayment(shopDefaultPaymentMode(shop))
    paymentPickedRef.current = false

    const nextSeq = (shop?.invoice_sequence || 1001) + 1
    if (shop?.invoice_sequence) {
      setShop((s) => ({ ...s, invoice_sequence: nextSeq }))
    }

    const nextInv = generateClientBillNumber(
      shop?.invoice_prefix || "SLP",
      nextSeq,
      shop?.invoice_format || "PREFIX-DATE-SEQ"
    )
    setCustomBillNumber(nextInv)
    setFlowStep("bill")
  }

  const today = new Date()
  const formattedDate = today.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  })
  const formattedTime = today.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  })

  const showGst = useMemo(() => shopShowsGstOnBill(shop), [shop])
  const discountFactor = useMemo(() => (subtotal > 0 ? total / subtotal : 1), [total, subtotal])
  const gstData = useMemo(() => (showGst ? gstSummary(items, discountFactor) : null), [showGst, items, discountFactor])

  // Dynamically resolve receipt data for RealisticReceiptView
  const templateForPrint = useMemo(() => {
    const list = Array.isArray(templates) && templates.length > 0 ? templates : BUILTIN_TEMPLATES
    const matched = findTemplateMatch(list, selectedId) || list.find(t => t.is_default) || list[0] || BUILTIN_TEMPLATES[0]

    const itemsList = items.map((it) => {
      const qty = Number(it.quantity !== undefined ? it.quantity : (it.qty !== undefined ? it.qty : 1))
      const rate = Number(it.rate !== undefined ? it.rate : (it.price !== undefined ? it.price : 0))
      return {
        name: it.name || "Item",
        qty,
        rate,
        unit: normalizeUnit(it.unit),
        total: Number(it.total !== undefined ? it.total : (qty * rate))
      }
    })

    const formattedDate = new Date().toLocaleDateString(lang === "mr" ? "mr-IN" : lang === "hi" ? "hi-IN" : "en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })

    const rawTemplateWidth = String(paperSize || activeTemplate?.width || shop?.receipt_width || shop?.printer_width || "80mm").trim().toLowerCase()
    const isA4Width = rawTemplateWidth === "a4" || rawTemplateWidth === "full"
    const is55Width = rawTemplateWidth === "55mm" || rawTemplateWidth === "58mm" || rawTemplateWidth === "55" || rawTemplateWidth === "58"
    const templateWidth = isA4Width ? "a4" : (is55Width ? "55mm" : "80mm")

    return {
      ...matched,
      id: matched.id,
      templateId: matched.templateId,
      name: matched.name,
      width: templateWidth,
      footer: activeTemplate?.footer || shop?.receipt_footer || "Thank you for shopping with us! Please come again.",
      previewData: {
        shopName: shop?.name || "Shop Receipt",
        address: shop?.address || "",
        phone: shop?.phone || "",
        gst: showGst ? (shop?.gstin || shop?.gst || "") : "",
        showGstOnBill: showGst,
        gstSummary: gstData,
        customerName: "",
        customerPhone: "",
        invoiceNo: customBillNumber,
        date: formattedDate,
        items: itemsList,
        subtotal: Number(subtotal || 0),
        discount: Number(discountAmount || 0),
        taxRate: 0,
        tax: 0,
        total: Number(total || 0),
        payment: payment || "Cash",
        footer: activeTemplate?.footer || shop?.receipt_footer || "Thank you for shopping with us! Please come again."
      }
    }
  }, [templates, selectedId, activeTemplate, items, shop, customBillNumber, subtotal, discountAmount, discountType, total, payment, lang, showGst, gstData, paperSize])
  // the paper size the bill prints on: "58mm" | "80mm" | "a4"
  const currentPaperWidth = templateForPrint?.width === "55mm" ? "58mm" : (templateForPrint?.width || "80mm")

  return (
    <div className="new-bill-flow-container fade-in">
      {/* ====================================================================
          TOP HEADER: Slipzo branding, Live Invoice Number, and Top-Right Print
          ==================================================================== */}
      <header className="nb-top-header">
        <div className="nb-header-left">
          <div className="nb-header-icon-box">
            <FileText size={22} className="nb-header-icon" />
          </div>
          <div className="nb-header-titles">
            <h1 className="nb-page-title">{t("bills.newBillTitle", "New Bill")}</h1>
            <p className="nb-page-subtitle">
              {isMenu ? t("bills.newBillMenuSubtitle", "Select from your menu and create a bill") : t("bills.newBillSubtitle", "Add items and create a bill")}
            </p>
          </div>
        </div>
      </header>

      {/* ====================================================================
          STEP 4: SUCCESS & PRINT SCREEN (When Bill is Saved)
          ==================================================================== */}
      {flowStep === "success" ? (
        (() => {
          const printed = doneAction === "printed"
          const doneItems = items.filter((it) => it.name && String(it.name).trim() && Number(it.quantity) > 0)
          const billNo = saved?.number || customBillNumber
          return (
            <div className="nbd-success-wrapper fade-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem", width: "100%", maxWidth: "960px", margin: "12px auto 40px", padding: "0 1rem", boxSizing: "border-box" }}>
              <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: "1.5rem", width: "100%", alignItems: "flex-start" }}>
                {/* 1. Payment Collected Confirmation Card */}
                <div className={`nbd ${printed ? "is-printed" : "is-saved"}`} style={{ flex: "1 1 420px", maxWidth: "460px", margin: 0, position: "relative" }} data-testid="bill-done">
                  {!printed && (
                    <button
                      type="button"
                      className="nbd-back-btn"
                      onClick={handleBackToBill}
                      disabled={isSaving}
                      data-testid="bill-done-back"
                    >
                      <ArrowLeft size={16} /> {t("bills.backToBill", "Back to bill")}
                    </button>
                  )}
                  <div className="nbd-hero">
                    <span className="nbd-badge" style={{ background: "#16a34a", boxShadow: "0 0 0 8px #dcfce7, 0 10px 24px rgba(22, 163, 74, 0.2)" }}>
                      <CheckCircle2 size={34} color="#ffffff" strokeWidth={2.5} />
                    </span>
                    <span className="nbd-status" style={{ background: "#dcfce7", color: "#15803d", borderColor: "#bbf7d0" }}>
                      ✓ {t("bills.paymentCollected", "Payment Collected")}
                    </span>
                    <h2 className="nbd-title" style={{ color: "#0f172a" }}>
                      {printed ? t("bills.donePrinted", "Bill printed") : t("bills.paymentCollectedSuccess", "Payment Collected Successfully")}
                    </h2>
                    <div className="nbd-amount" style={{ color: "#15803d" }}>{money(total)}</div>
                    <div className="nbd-meta">
                      {billNo && <span className="nbd-chip">#{billNo}</span>}
                      <span className="nbd-chip" style={{ background: "#f0fdf4", color: "#166534", borderColor: "#bbf7d0" }}>
                        {t("bills.paidVia", "Paid via {{mode}}", { mode: tDb(payment) })}
                      </span>
                      <span>{t("bills.itemsCount", "{{n}} items", { n: doneItems.length })}</span>
                      <span className="nbd-dot" aria-hidden="true" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  {/* Low Prints Reminder Notice on Success Screen */}
                  {activePlan?.printsRemaining !== undefined && Number(activePlan.printsRemaining) <= 10 && Number(activePlan.printsRemaining) > 0 && (
                    <div style={{
                      background: "#fffbeb",
                      border: "1.5px solid #fde68a",
                      borderRadius: "12px",
                      padding: "10px 14px",
                      margin: "0 1.25rem 1rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                      flexWrap: "wrap"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#b45309", fontSize: "0.85rem", fontWeight: "700" }}>
                        <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0 }} />
                        <span>{t("bills.lowPrintsLeft", "Only {{n}} prints left in your plan", { n: activePlan.printsRemaining })}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setView("pricing")}
                        style={{
                          background: "#d97706",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          padding: "4px 10px",
                          fontSize: "0.8rem",
                          fontWeight: "700",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <Zap size={13} /> {t("bills.rechargeNow", "Recharge Now")}
                      </button>
                    </div>
                  )}

                  <div className="nbd-actions">
                    {/* Paper size for this printer (remembered on this device), then Print opens the print window */}
                    <div className="nb-paper-size nbd-paper-size" role="radiogroup" aria-label={t("bills.paperSize", "Paper size")}>
                      <span className="nb-paper-size-label"><Printer size={14} /> {t("bills.paperSize", "Paper size")}</span>
                      <div className="nb-paper-size-options">
                        {[["58mm", "58 mm"], ["80mm", "80 mm"], ["a4", "A4"]].map(([id, label]) => (
                          <button
                            key={id}
                            type="button"
                            role="radio"
                            aria-checked={currentPaperWidth === id}
                            className={`nb-paper-size-btn ${currentPaperWidth === id ? "active" : ""}`}
                            onClick={() => setPaperSize(id)}
                            disabled={isSaving}
                            data-testid={`paper-size-${id}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button type="button" className="nbd-btn primary" onClick={() => handlePrintAgain()} disabled={isSaving} data-testid="bill-done-print">
                      <Printer size={18} /> {busyAction === "print" ? t("bills.printing", "Printing...") : printed ? t("bills.printAgain", "Print again") : t("bills.printReceipt", "Print Receipt")}
                    </button>
                    <div className="nbd-row">
                      <button type="button" className="nbd-btn" onClick={handleCreateNewBill} data-testid="bill-done-new">
                        <Plus size={16} /> {t("bills.createNewBill", "Create New Bill")}
                      </button>
                      <button type="button" className="nbd-btn" onClick={handleDownloadPdf} data-testid="bill-success-pdf">
                        <Download size={16} /> {t("bills.pdfShort", "PDF")}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Bill Preview Card on Success Page */}
                <div className="nbd-preview-card" style={{ flex: "1 1 380px", maxWidth: "460px", background: "#ffffff", borderRadius: "24px", border: "1px solid #bae6fd", padding: "1.25rem", boxShadow: "0 1px 2px rgba(12, 31, 65, 0.04), 0 16px 40px rgba(12, 31, 65, 0.08)", boxSizing: "border-box" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", paddingBottom: "0.55rem", borderBottom: "1px solid #f0f9ff" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Receipt size={17} color="#0284c7" />
                      <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0C1F41" }}>{t("bills.billPreview", "Bill Preview")}</span>
                    </div>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#0284c7", background: "#f0f9ff", padding: "3px 9px", borderRadius: "12px", border: "1px solid #bae6fd" }}>
                      {tDb(templateForPrint?.name || "Classic Receipt")} · {currentPaperWidth === "a4" ? "A4" : currentPaperWidth.replace("mm", " mm")}
                    </span>
                  </div>
                  <div
                    className={`receipt-preview-content tb-preview-paper nb-preview-paper format-${String(templateForPrint?.width || "80mm").toLowerCase() === "55mm" ? "55mm" : (String(templateForPrint?.width || "").toLowerCase() === "a4" ? "a4" : "80mm")}`}
                    style={{ margin: "0 auto", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderRadius: "8px", overflow: "hidden" }}
                    aria-label={t("bills.billPreview", "Bill Preview")}
                  >
                    <RealisticReceiptView template={templateForPrint} />
                  </div>
                </div>
              </div>
            </div>
          )
        })()
      ) : (
        <>
          {/* Low Prints Reminder Banner on New Bill page */}
          {activePlan?.printsRemaining !== undefined && Number(activePlan.printsRemaining) <= 10 && Number(activePlan.printsRemaining) > 0 && (
            <div
              className="fade-in"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#fffbeb",
                border: "1.5px solid #fde68a",
                borderRadius: "12px",
                padding: "10px 14px",
                marginBottom: "1rem",
                boxShadow: "0 2px 6px rgba(217, 119, 6, 0.08)",
                gap: "10px",
                flexWrap: "wrap"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#b45309", fontWeight: "700", fontSize: "0.88rem" }}>
                <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0 }} />
                <span>
                  {t("bills.lowPrintsBanner", "Reminder: Only {{n}} prints remaining in your plan!", { n: activePlan.printsRemaining })}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setView("pricing")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  background: "#d97706",
                  color: "#ffffff",
                  border: "none",
                  padding: "5px 12px",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                <Zap size={14} />
                {t("bills.rechargeNow", "Recharge Now")}
              </button>
            </div>
          )}

          {/* Editing Saved Bill Banner */}
          {editingBillId && (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#eff6ff",
              border: "1.5px solid #bfdbfe",
              borderRadius: "12px",
              padding: "10px 16px",
              marginBottom: "1rem",
              boxShadow: "0 2px 6px rgba(37, 99, 235, 0.06)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#1d4ed8", fontWeight: "700", fontSize: "0.9rem" }}>
                <Pencil size={16} />
                <span>Editing Saved Bill #{editingBillNumber || customBillNumber}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingBillId(null)
                  setEditingBillNumber(null)
                  setItems([])
                  toastSuccess(t("bills.newMode", "Switched to new bill mode"))
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "#ffffff",
                  border: "1px solid #bfdbfe",
                  color: "#1d4ed8",
                  padding: "4px 10px",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                <X size={13} /> {t("bills.cancelNew", "Cancel / New Bill")}
              </button>
            </div>
          )}

          {/* Step 1: Search Bar & Barcode Scanner Row */}
          <div className="nb-search-row">
            <div className="nb-search-bar">
              <Search size={19} className="nb-search-icon" />
              <input
                type="text"
                className="nb-search-input"
                placeholder={t("bills.searchPlaceholder", "Search items or speak to add (e.g. Tea, Coffee, Pizza...)")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = (search || "").trim();
                    if (val) {
                      e.preventDefault();
                      setSearch("");
                      const nameMatch = userMenuItems.find(
                        (it) => (it.name || "").trim().toLowerCase() === val.toLowerCase()
                      ) || userMenuItems.find(
                        (it) => matchesItemFuzzy(it, val, { tDb, lang })
                      );
                      if (nameMatch) {
                        if (nameMatch.is_active === false || nameMatch.is_available === false) {
                          playScanErrorBeep();
                          Swal.fire({
                            title: t("bills.itemUnavailable", "Item Not Available"),
                            text: t("bills.itemUnavailableText", "This item is currently unavailable in your menu and cannot be added to the bill."),
                            icon: "warning",
                            confirmButtonColor: "#0284c7",
                            confirmButtonText: "OK"
                          });
                        } else {
                          handleAddItemFromMenu(nameMatch);
                          playScanSuccessBeep();
                        }
                      } else {
                        handleBarcodeDetected(val);
                      }
                    }
                  }
                }}
          />
              {search && (
                <button
                  type="button"
                  className="nb-search-clear-btn"
                  onClick={() => setSearch("")}
                  title={t("bills.clearSearch", "Clear search")}
                >
                  <X size={16} />
                </button>
              )}
              <div className="nb-search-voice-wrapper">
                <VoiceInputButton
                  onSpeechResult={(text) => setSearch(cleanVoiceQuery(text))}
                  variant="icon-only"
                  placeholder={t("bills.speakItemName", "Speak item name")}
                />
              </div>
            </div>

            {showBarcode && (
              <button
                type="button"
                className="nb-scan-barcode-btn"
                onClick={() => setIsCameraScannerOpen(true)}
                title={t("bills.scanBarcodeTooltip", "Scan barcode with Camera or USB/BT Scanner")}
              >
                <BarcodeIcon size={18} />
                <span>{t("bills.scanBarcode", "Scan Barcode")}</span>
              </button>
            )}
          </div>

          {/* Main 2-Column Content Layout */}
          <div className="nb-desktop-layout">
            {/* LEFT COLUMN: Main Menu-Items Container */}
            <div className="nb-left-col">
              <div className="nb-menu-card-container">
                <div className="nb-menu-card-header">
                  <h3 className="nb-menu-card-title">{isMenu ? t("bills.myMenuTitle", "My Menu") : t("bills.myItemsTitle", "My Items")}</h3>
                  <span className="nb-menu-items-count">
                    {formatNum(filteredMenuItems.length)} {filteredMenuItems.length === 1 ? t("bills.item", "item") : t("bills.items", "items")}
                  </span>
                </div>

                {/* Product group filter chips */}
                {!loadingMenu && groupChips.length > 1 && (
                  <div
                    className="nb-group-chips"
                    role="tablist"
                    aria-label={t("productGroups.filter", "Filter products")}
                    onWheel={(e) => {
                      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                        e.currentTarget.scrollLeft += e.deltaY
                      }
                    }}
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={selectedCategory === "all"}
                      className={`nb-group-chip ${selectedCategory === "all" ? "active" : ""}`}
                      onClick={(e) => {
                        setSelectedCategory("all")
                        e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
                      }}
                    >
                      {t("productGroups.all", "All")}
                    </button>
                    {groupChips.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        role="tab"
                        aria-selected={selectedCategory === g.id}
                        className={`nb-group-chip ${selectedCategory === g.id ? "active" : ""}`}
                        onClick={(e) => {
                          setSelectedCategory(g.id)
                          e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
                        }}
                      >
                        <span aria-hidden="true">{g.icon}</span> {t(productGroupLabelKey(shop?.business_type, g.id), g.label)}
                      </button>
                    ))}
                  </div>
                )}

                {loadingMenu ? (
                  <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                    <Spinner />
                    <p style={{ fontSize: "0.85rem", color: "#74788A", marginTop: "0.75rem" }}>
                      {t("bills.loadingMenu", "Loading your menu items...")}
                    </p>
                  </div>
                ) : userMenuItems.length === 0 ? (
                  /* Empty Menu State & New User Guide */
                  <EmptyMenuGuide
                    businessType={shop?.business_type}
                    onAddItems={handleAddMoreItemsClick}
                  />
                ) : filteredMenuItems.length === 0 ? (
                  /* No Search Results */
                  <div style={{ textAlign: "center", padding: "2.5rem 1rem", background: "#ffffff", borderRadius: "12px", border: "1px dashed #D9DDE4", marginBottom: "1rem" }}>
                    <AlertCircle size={28} style={{ color: "#8F93A5", margin: "0 auto 0.5rem" }} />
                    <div style={{ fontWeight: "700", color: "#0C1F41", fontSize: "0.95rem" }}>{t("bills.noItems", "No items found")}</div>
                    <p style={{ color: "#74788A", fontSize: "0.82rem", margin: "0.2rem 0 0.85rem" }}>
                      {t("bills.tryAnother", "Try another item name or category.")}
                    </p>
                    <button
                      type="button"
                      className="nb-add-more-btn"
                      onClick={() => { setSearch(""); setSelectedCategory("all"); }}
                    >
                      {t("bills.resetFilter", "Reset Filter")}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Menu Item Cards List */}
                    <div className="nb-menu-items-list">
                      {paginatedMenuItems.map((menuItem) => {
                        const nameKey = (menuItem.name || "").trim().toLowerCase()
                        const addedItem = addedItemMap.get(nameKey)
                        const itemCat = (menuItem.category || "").toLowerCase()
                        const isClothItem = (shop?.business_type || "").toLowerCase().includes("clothing") || (shop?.business_type || "").toLowerCase().includes("garment") || itemCat.includes("wear") || itemCat.includes("cloth") || itemCat.includes("garment") || itemCat.includes("shirt") || itemCat.includes("saree") || itemCat.includes("dress")
                        const isFoodItem = (shop?.business_type || "").toLowerCase().includes("hotel") || (shop?.business_type || "").toLowerCase().includes("food") || itemCat.includes("food") || itemCat.includes("bread") || itemCat.includes("beverage") || itemCat.includes("chai")

                        return (
                          <div key={menuItem.id} className="nb-item-card">
                            <div className="nb-item-left">
                              {menuItem.image_url ? (
                                <img
                                  src={menuItem.image_url}
                                  alt={menuItem.name}
                                  className="nb-item-thumb"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                    if (e.target.nextSibling) e.target.nextSibling.style.display = "flex";
                                  }}
                                />
                              ) : null}
                              <div
                                className="nb-item-thumb-placeholder"
                                style={{ display: menuItem.image_url ? "none" : "flex" }}
                              >
                                {isClothItem ? <Shirt size={26} /> : (isFoodItem ? <Utensils size={26} /> : <ShoppingBag size={26} />)}
                              </div>

                              <div className="nb-item-info">
                                <h4 className="nb-item-name" title={menuItem.name}>{tDb(menuItem.name)}</h4>
                                <span className="nb-item-category">{tDb(menuItem.category || "General")}</span>
                                <div className="nb-item-price nb-item-price-desktop">
                                  {money(menuItemRate(menuItem, shop))}
                                  {isLooseItem(menuItem) && <span className="loose-per-unit">/ {unitLabel(menuItem.unit)}</span>}
                                </div>
                                {isInventory && stockInfo(menuItem).tracked && (
                                  <div className="nb-item-stock">
                                    <StockBadge item={menuItem} onClick={canManageStock ? () => setStockItem(menuItem) : undefined} />
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="nb-item-actions-wrapper">
                              <div className="nb-item-price nb-item-price-mobile">
                                {money(menuItemRate(menuItem, shop))}
                                {isLooseItem(menuItem) && <span className="loose-per-unit">/ {unitLabel(menuItem.unit)}</span>}
                              </div>

                              {addedItem && isLooseItem(menuItem) ? (
                                <div className="nb-qty-controls-group">
                                  <button
                                    type="button"
                                    className="loose-line-qty"
                                    onClick={() => openLooseEntry(menuItem)}
                                    title={t("loose.change", "Change quantity")}
                                    data-testid="loose-line-qty"
                                  >
                                    {formatQtyUnit(addedItem.quantity, menuItem.unit)}
                                  </button>
                                  <button
                                    type="button"
                                    className="nb-item-del-btn"
                                    onClick={() => handleDeleteItem(addedItem.name || addedItem.id, addedItem.name)}
                                    title={t("bills.removeFromBill", "Remove from bill")}
                                    aria-label={t("bills.removeFromBill", "Remove from bill")}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ) : addedItem ? (
                                <div className="nb-qty-controls-group">
                                  <button
                                    type="button"
                                    className="nb-qty-btn"
                                    onClick={() => handleUpdateQuantity(addedItem.id, -1)}
                                    title={t("bills.decrease", "Decrease quantity")}
                                    aria-label={t("bills.decrease", "Decrease quantity")}
                                  >
                                    −
                                  </button>
                                  <span className="nb-qty-value">{formatNum(addedItem.quantity)}</span>
                                  <button
                                    type="button"
                                    className={`nb-qty-btn ${Number(addedItem.quantity) >= maxQtyFor(menuItem) ? "at-max" : ""}`}
                                    onClick={() => handleUpdateQuantity(addedItem.id, 1)}
                                    title={Number(addedItem.quantity) >= maxQtyFor(menuItem) ? t("stock.noMore", "No more in stock") : t("bills.increase", "Increase quantity")}
                                    aria-label={t("bills.increase", "Increase quantity")}
                                  >
                                    +
                                  </button>
                                  <button
                                    type="button"
                                    className="nb-item-del-btn"
                                    onClick={() => handleDeleteItem(addedItem.name || addedItem.id, addedItem.name)}
                                    title={t("bills.removeFromBill", "Remove from bill")}
                                    aria-label={t("bills.removeFromBill", "Remove from bill")}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ) : maxQtyFor(menuItem) <= 0 ? (
                                canManageStock ? (
                                  // out of stock: offer to add stock here instead of a dead button
                                  <button
                                    type="button"
                                    className="nb-add-btn nb-add-btn-restock"
                                    onClick={() => setStockItem(menuItem)}
                                    title={t("stock.outAddStock", "Out of stock. Tap to add stock")}
                                  >
                                    <Plus size={14} /> {t("stock.addStockShort", "Add stock")}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="nb-add-btn nb-add-btn-out"
                                    onClick={() => refuseIfShort(menuItem, 1)}
                                    title={t("stock.outOfStock", "Out of stock")}
                                  >
                                    {t("stock.outOfStock", "Out of stock")}
                                  </button>
                                )
                              ) : (
                                <button
                                  type="button"
                                  className="nb-add-btn"
                                  onClick={() => handleAddItemFromMenu(menuItem)}
                                  title={t("bills.addItemToBill", "Add item to current bill")}
                                >
                                  <Plus size={14} /> {t("bills.add", "Add")}
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* after the last item: go to the Menu page to add more items */}
                    <button
                      type="button"
                      className="nb-add-more-items-summary-btn nb-add-more-after-list"
                      onClick={handleAddMoreItemsClick}
                      title={isMenu ? t("bills.addMoreMenu", "Add More Menu") : t("bills.addMoreItems", "Add More Items")}
                    >
                      <Plus size={16} />
                      <span>{isMenu ? t("bills.addMoreMenu", "Add More Menu") : t("bills.addMoreItems", "Add More Items")}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Bill Summary */}
            <div className="nb-right-col">
              <div className="nb-summary-card">
                {/* Bill Summary Header */}
                <div className="nb-summary-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.65rem", borderBottom: "1px solid #e2e8f0", marginBottom: "0.65rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#0284c7" }}>
                      <FileText size={17} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: "0.98rem", fontWeight: 800, color: "#0C1F41", margin: 0 }}>
                        {t("bills.billSummary", "Bill Summary")}
                      </h4>
                      <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                        #{customBillNumber}
                      </span>
                    </div>
                  </div>
                  <span style={{ background: "#e0f2fe", color: "#0369a1", fontSize: "0.72rem", fontWeight: 700, padding: "0.2rem 0.55rem", borderRadius: "20px" }}>
                    {t("bills.itemsCount", "{{n}} items", { n: totalItemsInBill })}
                  </span>
                </div>

                {/* Items in Bill Summary */}
                {items.length === 0 ? (
                  <div style={{ padding: "1.75rem 1rem", textAlign: "center", color: "#94a3b8" }}>
                    <ShoppingBag size={28} style={{ margin: "0 auto 0.4rem", opacity: 0.45, display: "block" }} />
                    <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600 }}>{t("bills.emptyCart", "No items added yet")}</p>
                    <p style={{ margin: "0.2rem 0 0", fontSize: "0.74rem", color: "#94a3b8" }}>{t("bills.selectFromMenuHint", "Add items from the menu to build the bill")}</p>
                  </div>
                ) : (
                  <div className="nb-summary-items-list" style={{ maxHeight: "180px", overflowY: "auto", margin: "0.4rem 0 0.8rem", paddingRight: "4px" }}>
                    {items.map((it, idx) => (
                      <div key={it.id || idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.32rem 0", fontSize: "0.8rem", borderBottom: "1px dashed #f1f5f9" }}>
                        <div style={{ flex: 1, minWidth: 0, paddingRight: "0.5rem" }}>
                          <span style={{ fontWeight: 600, color: "#1e293b", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {tDb(it.name)}
                          </span>
                          <span style={{ fontSize: "0.71rem", color: "#64748b" }}>
                            {formatQtyUnit(it.quantity, it.unit)} × {money(getItemRate(it))}
                          </span>
                        </div>
                        <span style={{ fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>
                          {money(Number(it.quantity) * getItemRate(it))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Billing Options Row: Discount & Payment Mode Side by Side in One Line */}
                <div className="nb-billing-options-row">
                  {/* Left: Discount */}
                  <div className="nb-discount-col">
                    <div className="nb-discount-header">
                      <label className="nb-payment-label">
                        <Tag size={13} style={{ color: "#0f172a" }} />
                        <span>{t("bills.discount", "Discount")}</span>
                      </label>
                      <div className="nb-discount-toggle-group">
                        <button
                          type="button"
                          className={`nb-discount-toggle-btn ${discountType === "amount" ? "active" : ""}`}
                          onClick={() => setDiscountType("amount")}
                          title={t("bills.discountAmountMode", "₹ Flat Amount")}
                        >
                          <span className="nb-toggle-full">₹ Flat</span>
                          <span className="nb-toggle-short">₹</span>
                        </button>
                        <button
                          type="button"
                          className={`nb-discount-toggle-btn ${discountType === "percent" ? "active" : ""}`}
                          onClick={() => {
                            setDiscountType("percent")
                            const curr = parseFloat(discount) || 0
                            if (curr > 100) setDiscount("10")
                          }}
                          title={t("bills.discountPercentMode", "% Percentage")}
                        >
                          <span className="nb-toggle-full">% Off</span>
                          <span className="nb-toggle-short">%</span>
                        </button>
                      </div>
                    </div>

                    <div className="nb-discount-input-wrapper">
                      <div className="nb-discount-input-field">
                        <span className="nb-discount-prefix">{discountType === "amount" ? "₹" : "%"}</span>
                        <input
                          type="number"
                          min="0"
                          max={discountType === "percent" ? "100" : String(subtotal)}
                          step={discountType === "percent" ? "1" : "any"}
                          placeholder={discountType === "percent" ? "0" : "0.00"}
                          value={discount === "0" && !discountFocused ? "" : discount}
                          onFocus={() => setDiscountFocused(true)}
                          onBlur={() => setDiscountFocused(false)}
                          onChange={(e) => {
                            const raw = e.target.value
                            if (raw === "") {
                              setDiscount("0")
                              return
                            }
                            const val = parseFloat(raw)
                            if (isNaN(val) || val < 0) {
                              setDiscount("0")
                              return
                            }
                            if (discountType === "percent") {
                              setDiscount(String(Math.min(100, val)))
                            } else {
                              setDiscount(String(Math.min(subtotal, val)))
                            }
                          }}
                          className="nb-discount-input"
                          aria-label={t("bills.discount", "Discount")}
                        />
                        {parseFloat(discount) > 0 && (
                          <button
                            type="button"
                            className="nb-discount-clear-btn"
                            onClick={() => setDiscount("0")}
                            title={t("common.clear", "Clear discount")}
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      {discountAmount > 0 && (
                        <div className="nb-discount-savings-badge">
                          <Percent size={11} />
                          <span>
                            {discountType === "percent"
                              ? t("bills.savesAmount", "Save {{amt}} ({{pct}}% off)", { amt: money(discountAmount), pct: formatNum(discount) })
                              : t("bills.savesAmountFlat", "Save {{amt}} off", { amt: money(discountAmount) })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Payment Mode */}
                  <div className="nb-payment-col">
                    <div className="nb-payment-header">
                      <label className="nb-payment-label">
                        <CreditCard size={13} style={{ color: "#0f172a" }} />
                        <span>{t("bills.paymentMode", "Payment Mode")}</span>
                      </label>
                    </div>
                    <select
                      value={payment}
                      onChange={(e) => { setPayment(e.target.value); paymentPickedRef.current = true }}
                      className="nb-payment-select"
                    >
                      {paymentOptions.map((m) => (
                        <option key={m.id} value={m.id}>{t(m.labelKey, m.label)}</option>
                      ))}
                      {/* an older bill being edited keeps its mode even if the shop no longer offers it */}
                      {payment && !paymentOptions.some((m) => m.id === payment) && (
                        <option value={payment}>{tDb(payment)}</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* UPI: QR code from the shop's UPI ID with the exact bill amount, for the customer to scan */}
                {payment === "UPI" && (
                  <UpiPayCard
                    upiId={shop?.upi_id}
                    payeeName={shop?.name}
                    amount={total}
                    note={customBillNumber ? `Bill ${customBillNumber}` : (shop?.name ? `${shop.name} bill` : "")}
                    onAddUpiId={user?.staff_of ? undefined : () => {
                      sessionStorage.setItem("slipzo_scroll_to", "payment-modes-section")
                      sessionStorage.setItem("slipzo_focus_target", "shop-upi-id")
                      setView?.("shop")
                      window.dispatchEvent(new CustomEvent("slipzo-scroll-to-target", { detail: "shop-upi-id" }))
                    }}
                  />
                )}

                {/* Instant Totals Breakdown */}
                <div className="nb-totals-summary">
                  <div className="nb-total-row">
                    <span>{t("bills.subtotal", "Subtotal")}</span>
                    <span>{money(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="nb-total-row discount-row">
                      <span>{t("bills.discount", "Discount")} {discountType === "percent" ? `(${formatNum(discount)}%)` : ""}</span>
                      <span>-{money(discountAmount)}</span>
                    </div>
                  )}

                  {/* GST Split (CGST + SGST & Total GST %) */}
                  {showGst && gstData && gstData.gst > 0 && (
                    <div className="nb-summary-gst-box" style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "8px", padding: "0.4rem 0.6rem", margin: "0.45rem 0", fontSize: "0.78rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", marginBottom: "0.2rem" }}>
                        <span>{t("bills.taxableValue", "Taxable Value")}</span>
                        <span>{money(gstData.taxable)}</span>
                      </div>
                      {gstData.groups?.map((g) => (
                        <React.Fragment key={g.rate}>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "#475569", marginBottom: "0.15rem" }}>
                            <span>CGST ({g.cgstRate}%)</span>
                            <span>{money(g.cgst)}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "#475569", marginBottom: "0.15rem" }}>
                            <span>SGST ({g.sgstRate}%)</span>
                            <span>{money(g.sgst)}</span>
                          </div>
                        </React.Fragment>
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#0369a1", fontWeight: 700, borderTop: "1px dashed #e2e8f0", paddingTop: "0.25rem", marginTop: "0.2rem" }}>
                        <span>{t("bills.totalGstIncluded", "Total GST ({{rate}}% Included)", { rate: gstData.totalRate || 18 })}</span>
                        <span>{money(gstData.gst)}</span>
                      </div>
                    </div>
                  )}

                  <div className="nb-total-row grand-total-row">
                    <span>{t("bills.grandTotal", "Total Payable")}</span>
                    <span className="nb-grand-total-val">{money(total)}</span>
                  </div>
                </div>

                {saveError && (
                  <div style={{ color: "#ef4444", fontSize: "0.82rem", background: "#FFE1E5", padding: "0.5rem 0.75rem", borderRadius: "6px", marginTop: "0.75rem" }}>
                    {saveError}
                  </div>
                )}

                {/* Direct Print Bill button + Save Bill Button */}
                <div className="nb-action-row" style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="nb-save-bill-btn"
                    onClick={handlePrintBill}
                    disabled={isSaving || items.length === 0}
                    style={{
                      flex: "1 1 120px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.45rem",
                      background: "#0284c7",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "10px",
                      padding: "0.75rem 0.75rem",
                      fontSize: "0.88rem",
                      fontWeight: "700",
                      cursor: (isSaving || items.length === 0) ? "not-allowed" : "pointer",
                      opacity: (isSaving || items.length === 0) ? 0.6 : 1,
                      transition: "all 0.15s ease",
                      boxShadow: "0 1px 3px rgba(2, 132, 199, 0.25)"
                    }}
                  >
                    {busyAction === "print" ? <Spinner size={18} /> : <Printer size={18} />}
                    <span>{busyAction === "print" ? t("bills.printing", "Printing...") : t("bills.print", "Print Bill")}</span>
                  </button>
                  <button
                    type="button"
                    className="nb-save-bill-btn"
                    onClick={handleSaveBill}
                    disabled={isSaving || items.length === 0}
                    style={{
                      flex: "1 1 120px",
                      background: "#f1f5f9",
                      color: "#334155",
                      border: "1px solid #cbd5e1",
                      padding: "0.75rem 0.75rem",
                      fontSize: "0.88rem"
                    }}
                  >
                    {busyAction === "save" ? <Spinner size={18} /> : <Save size={18} />}
                    <span>{busyAction === "save" ? t("bills.saving", "Saving...") : t("bills.saveBill", "Save Bill")}</span>
                  </button>
                </div>
                <button
                  type="button"
                  className="tb-pdf-btn"
                  data-testid="bill-pdf-button"
                  onClick={handleDownloadPdf}
                  disabled={isSaving || items.length === 0}
                >
                  <Download size={15} /> {t("bills.downloadPdf", "Download PDF")}
                </button>
              </div>
            </div>
          </div>

          {/* Full Page Width Standalone Pagination Bar (Moved down below both columns) */}
          {filteredMenuItems.length > 0 && (
            <div className="nb-standalone-pagination">
              <div className="pagination-info nb-standalone-pagination-info">
                {t("bills.showing", {
                  start: formatNum(startItemIndex),
                  end: formatNum(endItemIndex),
                  total: formatNum(filteredMenuItems.length),
                  defaultValue: `Showing ${formatNum(startItemIndex)} to ${formatNum(endItemIndex)} of ${formatNum(filteredMenuItems.length)} items`
                })}
              </div>

              <div className="pagination-controls">
                <button
                  type="button"
                  className="pagination-btn"
                  disabled={menuPage <= 1}
                  onClick={() => setMenuPage((p) => Math.max(1, p - 1))}
                  title={t("common.prevPage", "Previous Page")}
                  aria-label={t("common.prevPage", "Previous Page")}
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="page-numbers">
                  {Array.from({ length: totalMenuPages }).map((_, i) => {
                    const pageNum = i + 1
                    if (
                      pageNum === 1 ||
                      pageNum === totalMenuPages ||
                      (pageNum >= menuPage - 1 && pageNum <= menuPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          className={`page-num-btn ${menuPage === pageNum ? "active" : ""}`}
                          onClick={() => setMenuPage(pageNum)}
                        >
                          {formatNum(pageNum)}
                        </button>
                      )
                    }
                    if (pageNum === menuPage - 2 || pageNum === menuPage + 2) {
                      return <span key={pageNum} className="page-ellipsis">…</span>
                    }
                    return null
                  })}
                </div>

                <button
                  type="button"
                  className="pagination-btn"
                  disabled={menuPage >= totalMenuPages}
                  onClick={() => setMenuPage((p) => Math.min(totalMenuPages, p + 1))}
                  title={t("common.nextPage", "Next Page")}
                  aria-label={t("common.nextPage", "Next Page")}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ====================================================================
          RECEIPT PRINT DOM CONTAINER (#receipt-to-print)
          Uses the single source of truth: RealisticReceiptView!
          ==================================================================== */}
      <div className="receipt-print-wrapper" style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0, pointerEvents: "none" }}>
        <div
          id="receipt-to-print"
          data-receipt-print-area="true"
          className={`receipt-preview-content receipt-print-area format-${templateForPrint?.width?.toLowerCase() === "55mm" ? "55mm" : (templateForPrint?.width?.toLowerCase() === "a4" ? "a4" : "80mm")}`}
          style={{
            background: "#ffffff",
            width: templateForPrint?.width?.toLowerCase() === "55mm" ? "55mm" : (templateForPrint?.width?.toLowerCase() === "a4" ? "100%" : "80mm"),
            maxWidth: templateForPrint?.width?.toLowerCase() === "55mm" ? "55mm" : (templateForPrint?.width?.toLowerCase() === "a4" ? "100%" : "80mm"),
            margin: "0 auto"
          }}
        >
          <RealisticReceiptView template={templateForPrint} />
        </div>
      </div>

      {/* Add / set stock without leaving the bill (owner, kirana / cloth shops) */}
      {canManageStock && (
        <StockModal
          item={stockItem}
          isOpen={Boolean(stockItem)}
          onClose={() => setStockItem(null)}
          onSaved={handleStockSaved}
        />
      )}

      {looseEntry && (
        <LooseQtyModal
          item={looseEntry.menuItem}
          rate={menuItemRate(looseEntry.menuItem, shop)}
          initialQty={looseEntry.initialQty}
          isEdit={Boolean(looseEntry.lineId)}
          maxQty={maxQtyFor(findMenuItemFor(looseEntry.menuItem) || looseEntry.menuItem)}
          onConfirm={handleLooseConfirm}
          onClose={() => setLooseEntry(null)}
        />
      )}

      {/* Camera Barcode Scanner Modal */}
      {showBarcode && isCameraScannerOpen && (
        <Suspense fallback={<div className="scanner-chunk-loader" role="status" aria-label={t("common.openingCamera", "Opening camera")}><Spinner size={34} /></div>}>
          <CameraScannerModal
            isOpen={isCameraScannerOpen}
            onClose={() => setIsCameraScannerOpen(false)}
            onScan={handleBarcodeDetected}
            title={t("bills.scanItemBarcode", "Scan Item Barcode")}
          />
        </Suspense>
      )}
    </div>
  )
}
