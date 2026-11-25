import { useState, useMemo, useEffect, useRef, lazy, Suspense, Fragment } from "react"
import { createPortal } from "react-dom"
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Utensils,
  Search,
  Plus,
  Minus,
  Trash2,
  RotateCcw,
  Save,
  Printer,
  ShoppingBag,
  CreditCard,
  Check,
  X,
  Barcode as BarcodeIcon,
  Tag,
  Percent
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useDbTranslation } from "../../lib/translator"
import {
  call,
  money,
  shortMoney,
  getCachedData,
  findTemplateMatch,
  getItemRate,
  saneAmount,
  getStoredMenuItems,
  removeCachedData,
  invalidateApiCache,
  resetSingleStoredTable,
  getTableDisplayName
} from "../../lib/utils"
import { shopUsesGst, shopShowsGstOnBill, itemGstRate, menuItemRate, normalizeGstRate, gstSummary } from "../../lib/gst"
import { BUILTIN_TEMPLATES } from "../Templates"
import { RealisticReceiptView } from "../RealisticReceiptView"
import { chargeAndPrint, chargeAndSavePdf, printWidthOf } from "../../lib/directPrint"
import { TableResetModal } from "./TableResetModal"
// Loaded on demand: the scanner library is large and only needed once the camera is opened
const CameraScannerModal = lazy(() => import("../common/CameraScannerModal").then((m) => ({ default: m.CameraScannerModal })))
import { VoiceInputButton } from "../common/VoiceInputButton"
import { useBarcodeScanner } from "../../hooks/useBarcodeScanner"
import { matchesItemFuzzy, cleanVoiceQuery } from "../../lib/fuzzySearch"
import { useShowBarcode } from "../../hooks/useShowBarcode"
import { playScanSuccessBeep, playScanErrorBeep } from "../../lib/audioFeedback"
import { useToast } from "../common/Toast"
import Swal from "sweetalert2"
import { Spinner } from "../common/Skeleton"
import "../../styles/NewBillFlow.css"
import { EmptyMenuGuide } from "../common/EmptyMenuGuide"
import { productGroupOf, productGroupChips, productGroupLabel } from "../../lib/productGroups"
import { shopPaymentModes, shopDefaultPaymentMode } from "../../lib/paymentModes"
import { UpiPayCard } from "../common/UpiQr"
import { flyThumb } from "../../lib/flyThumb"
import { mergeOrders, sameOrder } from "../../lib/orderMerge"
import { claimPrint, releasePrint, markBillPrinted, printHolder, explainDeviceConflict } from "../../lib/printClaim"

const orderKeyOf = (name) => (name || "").trim().toLowerCase()

export function TableBilling({
  table,
  user,
  shop,
  onBack,
  onUpdateTableState,
  setView,
  setSelectedBillId,
  requireAuth
}) {
  const { t } = useTranslation()
  const { tDb, formatNum } = useDbTranslation()
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast()
  // Cafe / tea / small business and hotel / restaurant shops do not use barcodes at all
  // Up-to-date shop details: the prop can be a snapshot taken before the shop loaded, which made the bill
  // preview and printed bills fall back to the Classic template and lose the shop name
  const [shopInfo, setShopInfo] = useState(() => ({ ...(getCachedData("/shop") || {}), ...(shop || {}) }))
  // payment modes the shop takes (Shop profile); the bill starts with the shop's default
  const paymentOptions = useMemo(() => shopPaymentModes(shopInfo), [shopInfo?.payment_modes])
  useEffect(() => {
    let alive = true
    setShopInfo((prev) => ({ ...prev, ...(getCachedData("/shop") || {}), ...(shop || {}) }))
    call("/shop").then((fresh) => { if (alive && fresh && typeof fresh === "object") setShopInfo((prev) => ({ ...prev, ...fresh })) }).catch(() => { })
    const onShop = (e) => { if (e?.detail) setShopInfo((prev) => ({ ...prev, ...e.detail })) }
    window.addEventListener("slipzo_shop_updated", onShop)
    return () => { alive = false; window.removeEventListener("slipzo_shop_updated", onShop) }
  }, [shop])
  const showBarcode = useShowBarcode(shopInfo?.business_type ? shopInfo : null)

  // Helper to extract image from item object supporting various schemas
  const resolveItemImage = (item) => {
    if (!item) return ""
    if (item.image_url) {
      if (Array.isArray(item.image_url)) return item.image_url[0] || ""
      return item.image_url
    }
    if (item.image) {
      if (Array.isArray(item.image)) return item.image[0] || ""
      return item.image
    }
    if (item.imageUrl) {
      if (Array.isArray(item.imageUrl)) return item.imageUrl[0] || ""
      return item.imageUrl
    }
    if (item.photo_url) return item.photo_url
    if (item.photo) return item.photo
    if (Array.isArray(item.images)) return item.images[0] || ""
    return ""
  }

  const normalizeItems = (rawItems) => {
    let list = []
    if (Array.isArray(rawItems)) {
      list = rawItems
    } else if (typeof rawItems === "string") {
      try {
        const parsed = JSON.parse(rawItems)
        if (Array.isArray(parsed)) list = parsed
      } catch (_) { }
    }
    return list.map((it) => {
      const qty = Number(it.quantity !== undefined ? it.quantity : (it.qty !== undefined ? it.qty : 1)) || 1
      // a line on the order already has GST in its rate (added once, in handleAddItem). Adding it here again
      // grew the price on every sync with the table until it became Infinity, which is stored as 0.
      // An impossible rate left over from that becomes 0 here, then is taken from the menu again (see below).
      const rate = saneAmount(getItemRate(it), 1e6)
      return {
        id: it.id || (Date.now() + Math.floor(Math.random() * 1000)),
        name: (it.name || "").trim(),
        barcode: it.barcode || null,
        rate: rate,
        price: rate,
        quantity: qty,
        gst_rate: normalizeGstRate(it.gst_rate),
        qty: qty,
        category: it.category || "General",
        image_url: resolveItemImage(it)
      }
    }).filter((it) => it.name)
  }

  const [items, setItems] = useState(() => normalizeItems(table?.current_items))

  // Keep items synced if table reference changes
  useEffect(() => {
    setItems(normalizeItems(table?.current_items))
    setDiscount("0")
    setDiscountType("percent")
  }, [table?.id, table?.table_number, JSON.stringify(table?.current_items)])

  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [paymentMode, setPaymentMode] = useState(() => shopDefaultPaymentMode({ ...(getCachedData("/shop") || {}), ...(shop || {}) }))
  const paymentPickedRef = useRef(false)
  useEffect(() => {
    const allowed = paymentOptions.some((m) => m.id === paymentMode)
    if (!allowed || !paymentPickedRef.current) setPaymentMode(shopDefaultPaymentMode(shopInfo))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopInfo?.payment_modes, shopInfo?.default_payment_mode])
  // "order": pick items, the right side only lists what was added; "bill": the bill summary with payment and print
  const [step, setStep] = useState("order")
  const [isSaving, setIsSaving] = useState(false)
  const [busyAction, setBusyAction] = useState(null) // "save" | "print" while a request is running
  const [printedNumber, setPrintedNumber] = useState("") // real bill number once saved, shown on the receipt being printed
  const printBillIdRef = useRef(null) // bill saved by a print attempt that could not print (no credits): reused, not saved twice
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false)

  // Shop Personal Menu Items
  const cachedMenuItems = getCachedData("/menu")
  const [userMenuItems, setUserMenuItems] = useState(() => {
    const stored = getStoredMenuItems(user)
    if (Array.isArray(stored) && stored.length > 0) return stored
    return Array.isArray(cachedMenuItems) ? cachedMenuItems : []
  })
  const [loadingMenu, setLoadingMenu] = useState(() => !cachedMenuItems || userMenuItems.length === 0)

  useEffect(() => {
    let isMounted = true
    const loadMenu = async () => {
      try {
        const data = await call("/menu", { noCache: true }).catch(() => null)
        if (isMounted && Array.isArray(data)) {
          setUserMenuItems(data)
        } else if (isMounted) {
          // Fallback to local storage if API fails
          const local = getStoredMenuItems(user)
          if (local.length > 0) setUserMenuItems(local)
        }
      } catch (err) {
        console.warn("Failed to load menu, using offline storage:", err)
        const local = getStoredMenuItems(user)
        if (local.length > 0) setUserMenuItems(local)
      } finally {
        if (isMounted) setLoadingMenu(false)
      }
    }
    loadMenu()
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    const onMenuUpdate = (e) => {
      if (Array.isArray(e?.detail?.items) && e.detail.items.length > 0) {
        setUserMenuItems(e.detail.items)
      } else if (e?.detail?.updatedItem) {
        const { id, stock_qty, track_stock, low_stock_alert } = e.detail.updatedItem
        setUserMenuItems((prev) => prev.map((it) => (it.id === id ? { ...it, stock_qty, track_stock, low_stock_alert } : it)))
      } else {
        const local = getStoredMenuItems(user)
        if (local.length > 0) setUserMenuItems(local)
      }
    }
    const onStockUpdated = (e) => {
      const { id, stock_qty, track_stock, low_stock_alert } = e?.detail || {}
      if (!id) return
      setUserMenuItems((prev) => prev.map((it) => (it.id === id ? { ...it, stock_qty, track_stock, low_stock_alert } : it)))
    }
    window.addEventListener("slipzo-menu-update", onMenuUpdate)
    window.addEventListener("slipzo-stock-updated", onStockUpdated)
    return () => {
      window.removeEventListener("slipzo-menu-update", onMenuUpdate)
      window.removeEventListener("slipzo-stock-updated", onStockUpdated)
    }
  }, [user])

  // Bill Calculations & Discount
  const [discountType, setDiscountType] = useState("percent") // "percent" (%) default | "amount" (₹)
  const [discount, setDiscount] = useState("0")
  const [discountFocused, setDiscountFocused] = useState(false)

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const q = Number(item.quantity !== undefined ? item.quantity : (item.qty !== undefined ? item.qty : 1)) || 0
      const r = Number(item.rate !== undefined ? item.rate : (item.price !== undefined ? item.price : 0)) || 0
      return sum + (q * r)
    }, 0)
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

  const totalItemsCount = useMemo(() => {
    return items.reduce((sum, item) => {
      const q = Number(item.quantity !== undefined ? item.quantity : (item.qty !== undefined ? item.qty : 1)) || 0
      return sum + q
    }, 0)
  }, [items])

  // Sync items/total to parent for in-session display only (no status change, no backend write)
  useEffect(() => {
    if (onUpdateTableState) {
      onUpdateTableState(table.id || table.table_number, {
        current_items: items,
        total_amount: total
        // status intentionally omitted — only Save/Reset/Print change it
      })
    }
  }, [items, total])

  // ==========================================
  // KEEP THE OPEN ORDER WHEN LEAVING THE TABLE
  // Items added here only lived in memory until Save, so going back to the table list (which reloads from
  // the server) threw them away. Leaving now stores them as the table's open order, the same data Save
  // stores for the table, but without creating a bill.
  // ==========================================
  const orderSignature = (list) => JSON.stringify(
    (list || [])
      .filter((it) => it.name && it.name.trim() && Number(it.quantity) > 0)
      .map((it) => [it.name.trim().toLowerCase(), Number(it.quantity), Number(it.rate)])
  )
  const itemsRef = useRef(items)
  useEffect(() => { itemsRef.current = items }, [items])
  // What the server already holds for this table, so an unchanged order is not written again
  const savedOrderRef = useRef(orderSignature(normalizeItems(table?.current_items)))

  // ==========================================
  // THE SAME TABLE ON ANOTHER DEVICE
  // baseRef is the order as the server had it when this screen last matched it. When another device changes the table,
  // its changes and the ones made here are put together, so neither waiter's items are lost and items already billed
  // elsewhere do not come back. (null: a bill opened from History, until the table was read once.)
  // ==========================================
  const baseRef = useRef(table?.editing_bill_id ? null : normalizeItems(table?.current_items))
  const busyRef = useRef(false)

  const readRemoteOrder = async () => {
    const list = await call("/restaurant/tables", { noCache: true })
    const mine = (Array.isArray(list) ? list : []).find((x) => String(x.id) === String(table.id)) ||
      (Array.isArray(list) ? list : []).find((x) => Number(x.table_number) === Number(table.table_number))
    return mine ? normalizeItems(mine.current_items) : null
  }

  // Resolves true when the order on this screen changed because of another device
  const syncWithServer = async () => {
    const theirs = await readRemoteOrder().catch(() => null)
    if (!theirs) return false
    if (baseRef.current === null) {
      baseRef.current = theirs
      return false
    }
    if (sameOrder(baseRef.current, theirs)) return false
    const merged = normalizeItems(mergeOrders(baseRef.current, itemsRef.current, theirs))
    baseRef.current = theirs
    savedOrderRef.current = orderSignature(theirs)
    if (sameOrder(merged, itemsRef.current)) return false
    itemsRef.current = merged
    setItems(merged)
    if (merged.length === 0) setStep("order")
    return true
  }
  const tellOrderChanged = () => toastInfo(itemsRef.current.length
    ? t("multi.orderUpdated", "This table was changed on another device. The order is updated, please check it.")
    : t("multi.orderBilled", "This table was billed on another device."))
  const syncRef = useRef(syncWithServer)
  syncRef.current = syncWithServer

  useEffect(() => {
    const check = async () => {
      if (busyRef.current || document.visibilityState !== "visible") return
      if (await syncRef.current()) tellOrderChanged()
    }
    check()
    const timer = setInterval(check, 7000)
    document.addEventListener("visibilitychange", check)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", check)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const keepOpenOrder = async ({ keepalive = false } = {}) => {
    const list = itemsRef.current.filter((it) => it.name && it.name.trim() && Number(it.quantity) > 0)
    if (list.length === 0) return false
    const signature = orderSignature(list)
    if (signature === savedOrderRef.current) return false

    const previous = savedOrderRef.current
    savedOrderRef.current = signature // claimed up front, so two exits at once do not save twice
    const updates = {
      current_items: list,
      total_amount: list.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.rate) || 0), 0),
      status: "OCCUPIED"
    }
    const tableIdOrNum = table.id || table.table_number
    try {
      // keepalive lets the request finish even if the page is closing
      // base_items lets the server add another device's changes instead of writing over them
      const body = baseRef.current ? { ...updates, base_items: baseRef.current } : updates
      const updated = await call(`/restaurant/tables/${tableIdOrNum}`, { method: "PUT", body: JSON.stringify(body), keepalive })
      if (Array.isArray(updated?.current_items)) {
        baseRef.current = normalizeItems(updated.current_items)
        savedOrderRef.current = orderSignature(baseRef.current)
      }
      if (onUpdateTableState) onUpdateTableState(tableIdOrNum, { ...updates, ...(updated || {}), status: updated?.status || "OCCUPIED" })
      return true
    } catch (e) {
      savedOrderRef.current = previous
      console.warn("Could not keep the open order for this table:", e)
      return false
    }
  }
  // Exits that unmount or close the page run from outside this render, so they read the latest function
  const keepOpenOrderRef = useRef(keepOpenOrder)
  keepOpenOrderRef.current = keepOpenOrder

  useEffect(() => {
    const onHidden = () => { if (document.visibilityState === "hidden") keepOpenOrderRef.current({ keepalive: true }) }
    const onPageHide = () => { keepOpenOrderRef.current({ keepalive: true }) }
    document.addEventListener("visibilitychange", onHidden)
    window.addEventListener("pagehide", onPageHide)
    return () => {
      document.removeEventListener("visibilitychange", onHidden)
      window.removeEventListener("pagehide", onPageHide)
      // Leaving through the sidebar, the phone's back button or any other route
      keepOpenOrderRef.current({ keepalive: true })
    }
  }, [])

  const handleBackClick = async () => {
    const kept = await keepOpenOrder()
    if (kept) {
      const tableNameStr = getTableDisplayName(table, t, formatNum)
      toastSuccess(t("tables.orderKept", { tableName: tableNameStr, defaultValue: `Order kept for ${tableNameStr}` }))
    }
    onBack()
  }

  // Categories list from personal menu
  const menuCategories = useMemo(() => {
    const set = new Set()
    userMenuItems.forEach((it) => {
      if (it.category) set.add(it.category)
    })
    return ["all", ...Array.from(set)]
  }, [userMenuItems])

  // Orders stored while the price bug above existed have lines without a usable price: take it from the menu again
  useEffect(() => {
    const isBroken = (rate) => saneAmount(rate, 1e6) === 0
    if (!items.some((it) => isBroken(it.rate))) return
    const menuByName = new Map(userMenuItems.map((m) => [orderKeyOf(m.name), m]))
    let changed = false
    const repaired = items.map((it) => {
      if (!isBroken(it.rate)) return it
      const menuItem = menuByName.get(orderKeyOf(it.name))
      const rate = menuItem ? menuItemRate(menuItem, shopInfo) : 0
      if (isBroken(rate)) return it
      changed = true
      return { ...it, rate, price: rate, gst_rate: itemGstRate(menuItem, shopInfo) }
    })
    if (changed) setItems(repaired)
  }, [items, userMenuItems, shopInfo])

  // Map of added items by lowercase name
  const addedItemMap = useMemo(() => {
    const map = new Map()
    items.forEach((it) => {
      map.set((it.name || "").trim().toLowerCase(), it)
    })
    return map
  }, [items])

  // Filter chips: the shop type's 4-5 product groups that have items (see lib/productGroups)
  const groupBType = shopInfo?.business_type || "hotel"
  const groupChips = useMemo(() => productGroupChips(userMenuItems, groupBType), [userMenuItems, groupBType])
  useEffect(() => {
    if (selectedCategory !== "all" && !groupChips.some((g) => g.id === selectedCategory)) setSelectedCategory("all")
  }, [groupChips, selectedCategory])

  // Filtered menu items
  const filteredMenuItems = useMemo(() => {
    const q = cleanVoiceQuery(search)
    return userMenuItems.filter((it) => {
      // same spelling- and voice-tolerant search as the billing screen and My Menu
      const matchesSearch = !q || matchesItemFuzzy(it, q, { tDb })
      const matchesCat = selectedCategory === "all" || productGroupOf(it, groupBType) === selectedCategory
      return matchesSearch && matchesCat
    })
  }, [userMenuItems, search, selectedCategory, groupBType, tDb])

  // ==========================================
  // ITEM ADD / QUANTITY HANDLERS
  // ==========================================
  // returns true when the item was added
  const handleAddItem = (menuItem) => {
    if (!menuItem) return false

    if (menuItem.is_active === false || menuItem.is_available === false) {
      playScanErrorBeep()
      Swal.fire({
        title: t("menu.itemUnavailable", "Item Not Available"),
        text: t("menu.itemUnavailableDesc", "This item is currently unavailable in your menu."),
        icon: "warning",
        confirmButtonColor: "#0284c7"
      })
      return false
    }

    const cleanName = (menuItem.name || "").trim()
    const rate = menuItemRate(menuItem, shopInfo)
    const itemImage = resolveItemImage(menuItem)

    setItems((prev) => {
      const idx = prev.findIndex((i) => (i.name || "").trim().toLowerCase() === cleanName.toLowerCase())
      if (idx >= 0) {
        return prev.map((it, i) =>
          i === idx ? { ...it, quantity: Number(it.quantity || 0) + 1, image_url: it.image_url || itemImage } : it
        )
      } else {
        return [
          ...prev,
          {
            id: Date.now() + Math.floor(Math.random() * 1000),
            name: cleanName,
            barcode: menuItem.barcode || null,
            rate: rate,
            gst_rate: itemGstRate(menuItem, shopInfo),
            quantity: 1,
            category: menuItem.category || "General",
            image_url: itemImage
          }
        ]
      }
    })
    return true
  }

  // ==========================================
  // FLY TO THE ADDED ITEMS LIST
  // The item is on the order at once (so nothing can be lost); only its row stays hidden until the picture lands.
  // ==========================================
  const [flyingKeys, setFlyingKeys] = useState([])
  const flightsRef = useRef(new Map()) // item key -> stops its flight
  const orderListRef = useRef(null)
  const orderBarRef = useRef(null) // phones: the bar that stands in for the list
  useEffect(() => {
    const flights = flightsRef.current
    return () => { flights.forEach((stop) => stop()); flights.clear() }
  }, [])
  const stopFlights = () => {
    flightsRef.current.forEach((stop) => stop())
    flightsRef.current.clear()
    setFlyingKeys([])
  }
  const findOrderRow = (key) => orderListRef.current?.querySelector(`[data-order-key="${CSS.escape(key)}"]`)

  const flyIntoOrder = (menuItem, card) => {
    const key = orderKeyOf(menuItem.name)
    flightsRef.current.get(key)?.()
    // a new item's row appears when the picture lands; an item already listed stays in view
    if (!addedItemMap.has(key)) setFlyingKeys((prev) => (prev.includes(key) ? prev : [...prev, key]))

    const land = () => {
      flightsRef.current.delete(key)
      setFlyingKeys((prev) => prev.filter((k) => k !== key))
      const row = findOrderRow(key)
      if (row) {
        row.classList.remove("just-added")
        void row.offsetWidth // restarts the drop-in when the same item is added again
        row.classList.add("just-added")
        setTimeout(() => row.classList.remove("just-added"), 700)
      }
      orderBarRef.current?.animate?.(
        [{ transform: "scale(1)" }, { transform: "scale(1.04)" }, { transform: "scale(1)" }],
        { duration: 300, easing: "ease-out" }
      )
    }

    let stopFly = null
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        // where it lands: the item's own (still hidden) row, or on a phone the bar at the bottom
        let to = null
        const barRect = orderBarRef.current?.getBoundingClientRect()
        if (barRect && barRect.width > 0) {
          to = { left: barRect.left + 14, top: barRect.top + (barRect.height - 34) / 2, width: 34, height: 34 }
        } else {
          const row = findOrderRow(key)
          const list = orderListRef.current
          if (row && list) {
            const lr = list.getBoundingClientRect()
            const rr = row.getBoundingClientRect()
            // scroll only the list itself, never the page
            if (rr.bottom > lr.bottom) list.scrollTop += rr.bottom - lr.bottom
            else if (rr.top < lr.top) list.scrollTop -= lr.top - rr.top
            const r = (row.querySelector(".tb-order-thumb") || row).getBoundingClientRect()
            to = { left: r.left, top: Math.max(8, Math.min(window.innerHeight - r.height - 8, r.top)), width: r.width, height: r.height }
          }
        }
        const thumb = [...(card?.querySelectorAll(".nb-item-thumb, .nb-item-thumb-placeholder") || [])].find((el) => el.offsetParent !== null)
        stopFly = flyThumb({ startEl: thumb || null, to, onLand: land })
      })
    })
    flightsRef.current.set(key, () => { cancelAnimationFrame(frame); stopFly?.() })
  }

  const handleAddWithFly = (menuItem, e) => {
    const card = e.currentTarget.closest(".nb-item-card")
    if (handleAddItem(menuItem)) flyIntoOrder(menuItem, card)
  }

  const showBill = () => {
    if (items.length === 0) return
    stopFlights()
    setStep("bill")
  }
  // both steps start at the top of the page
  const workspaceRef = useRef(null)
  const firstStepRender = useRef(true)
  useEffect(() => {
    if (firstStepRender.current) { firstStepRender.current = false; return }
    workspaceRef.current?.scrollIntoView({ block: "start" })
  }, [step])

  const handleUpdateQty = (itemName, delta) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => (i.name || "").trim().toLowerCase() === itemName.trim().toLowerCase())
      if (idx < 0) return prev
      const newQty = Number(prev[idx].quantity || 0) + delta
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== idx)
      }
      return prev.map((it, i) =>
        i === idx ? { ...it, quantity: newQty } : it
      )
    })
  }

  const handleRemoveItem = (itemName) => {
    setItems((prev) => prev.filter((i) => (i.name || "").trim().toLowerCase() !== itemName.trim().toLowerCase()))
  }

  // ==========================================
  // BARCODE LISTENER
  // ==========================================
  const handleBarcodeDetected = (rawBarcode) => {
    if (!rawBarcode) return false
    const barcode = String(rawBarcode).trim()
    const match = userMenuItems.find(
      (it) => (it.barcode || "").trim().toLowerCase() === barcode.toLowerCase() && it.barcode_active !== false && it.barcode_active !== 0 && it.barcode_active !== "0" && it.barcode_active !== "false"
    )
    if (match) {
      handleAddItem(match)
      playScanSuccessBeep()
      return true
    }
    playScanErrorBeep()
    toastError(t("tables.noBarcodeMatch", "No item matching barcode \"{{code}}\" found in menu.", { code: barcode }))
    return false
  }

  useBarcodeScanner((scanned) => {
    handleBarcodeDetected(scanned)
  }, { enabled: showBarcode })

  // ==========================================
  // RESET TABLE BILL
  // ==========================================
  const handleConfirmReset = async () => {
    setItems([])
    setStep("order")
    baseRef.current = []
    itemsRef.current = [] // a cleared order must never be re-saved while the screen closes
    if (onUpdateTableState) {
      onUpdateTableState(table.id || table.table_number, {
        current_items: [],
        total_amount: 0,
        status: "AVAILABLE"
      })
    }
    // Also inform backend reset
    await call(`/restaurant/tables/reset/${table.id || table.table_number}`, {
      method: "POST"
    }).catch((e) => console.warn("Backend table reset warning:", e))

    const tableNameStr = getTableDisplayName(table, t, formatNum)
    toastSuccess(t("tables.tableResetSuccess", { tableName: tableNameStr, defaultValue: `${tableNameStr} cleared.` }))
  }

  // ==========================================
  // SAVE BILL / PERSIST ACTIVE TABLE ORDER & RECORD BILL
  // ==========================================
  // The receipt as it will print, in the template the shop picked (same view as the New Bill screen)
  const showGst = useMemo(() => shopShowsGstOnBill(shopInfo), [shopInfo])
  const discountFactor = useMemo(() => (subtotal > 0 ? total / subtotal : 1), [total, subtotal])
  const linesForPrint = useMemo(() => {
    return items
      .filter((it) => it.name && Number(it.quantity) > 0)
      .map((it) => {
        const qty = Number(it.quantity) || 1
        const rate = Number(it.rate) || 0
        return { name: it.name, qty, rate, gst_rate: it.gst_rate || 0, total: qty * rate }
      })
  }, [items])
  const gstData = useMemo(() => (showGst ? gstSummary(linesForPrint, discountFactor) : null), [showGst, linesForPrint, discountFactor])

  const previewTemplate = useMemo(() => {
    const list = getCachedData("/templates") || BUILTIN_TEMPLATES
    const matched = findTemplateMatch(list, shopInfo?.default_template_id) || list[0] || BUILTIN_TEMPLATES[0]
    const rawWidth = String(matched?.width || shopInfo?.receipt_width || "80mm").toLowerCase()
    const width = rawWidth === "a4" || rawWidth === "full" ? "a4" : (rawWidth.startsWith("55") || rawWidth.startsWith("58") ? "55mm" : "80mm")
    const sequence = shopInfo?.invoice_sequence || shopInfo?.next_invoice_number || 1001
    return {
      ...matched,
      width,
      previewData: {
        shopName: shopInfo?.name || shopInfo?.shop_name || t("bills.yourShop", "Your Shop"),
        address: shopInfo?.address || "",
        phone: shopInfo?.phone || "",
        gst: showGst ? (shopInfo?.gstin || "") : "",
        showGstOnBill: showGst,
        gstSummary: gstData,
        logo_url: shopInfo?.logo_url || "",
        invoiceNo: printedNumber || table.editing_bill_number || `${shopInfo?.invoice_prefix || "SLP"}-${sequence}`,
        date: new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        tableNumber: table.name || table.table_number || "",
        items: linesForPrint,
        subtotal,
        discount: Number(discountAmount || 0),
        tax: 0,
        total,
        payment: paymentMode,
        footer: matched?.footer || shopInfo?.receipt_footer || "Thank you for visiting! Please come again."
      }
    }
  }, [linesForPrint, shopInfo, table, subtotal, discountAmount, total, paymentMode, printedNumber, t, showGst, gstData])

  const handleSaveBill = async () => {
    if (!user) {
      requireAuth?.("dashboard")
      return
    }

    const validItems = items.filter((it) => it.name && it.name.trim() && Number(it.quantity) > 0)
    if (validItems.length === 0) {
      toastError(t("bills.addItemsBeforePrint", "Please add at least one item to save the bill."))
      return
    }

    setBusyAction("save")
    setIsSaving(true)
    busyRef.current = true
    try {
      if (await syncWithServer()) {
        tellOrderChanged()
        return
      }
      const cachedTemplates = getCachedData("/templates") || BUILTIN_TEMPLATES
      const matchedTemplate = findTemplateMatch(cachedTemplates, shopInfo?.default_template_id) || cachedTemplates[0] || BUILTIN_TEMPLATES[0]

      const billData = {
        template_id: matchedTemplate.id || "classic",
        template_name: matchedTemplate.name || "Classic Receipt",
        template_width: matchedTemplate.width || (shopInfo?.receipt_width === "58mm" ? "58mm" : (shopInfo?.receipt_width === "55mm" ? "55mm" : (shopInfo?.receipt_width?.toLowerCase() === "a4" ? "a4" : "80mm"))),
        table_number: table.name || `Table ${table.table_number}`,
        table: table.name || `Table ${table.table_number}`,
        items: validItems.map((it) => ({
          name: it.name.trim(),
          barcode: it.barcode || null,
          quantity: Number(it.quantity) || 1,
          rate: Number(it.rate) || 0
        })),
        subtotal: subtotal,
        discount: Number(discountAmount || 0),
        discount_type: discountType,
        discount_value: Number(discount) || 0,
        tax_rate: 0,
        tax_mode: 0,
        tax_amount: 0,
        total: total,
        payment_mode: paymentMode,
        // one bill per table order, whichever of the shop's devices saves or prints it
        table_order: true,
        is_saved: true
      }

      // 1. Create or update bill in database
      let savedBill = null
      if (table.editing_bill_id) {
        try {
          savedBill = await call(`/bills/${table.editing_bill_id}`, {
            method: "PUT",
            body: JSON.stringify({ ...billData, holder: printHolder() })
          })
        } catch (err) {
          if (err?.status === 409) throw err // being printed, or already printed, on another device
          savedBill = await call("/bills", {
            method: "POST",
            body: JSON.stringify({ ...billData, holder: printHolder() })
          })
        }
      } else {
        savedBill = await call("/bills", {
          method: "POST",
          body: JSON.stringify({ ...billData, holder: printHolder() })
        })
      }

      // 2. Dispatch event so Home page (Dashboard) and other components update immediately
      window.dispatchEvent(new CustomEvent("slipzo_bill_saved", { detail: savedBill }))

      // 3. Persist table active order and OCCUPIED status in restaurant_tables
      const tableUpdates = {
        current_items: validItems,
        total_amount: total,
        status: "OCCUPIED"
      }

      const tableIdOrNum = table.id || table.table_number

      // Update backend and wait for confirmation
      let updatedTable = null
      try {
        updatedTable = await call(`/restaurant/tables/${tableIdOrNum}`, {
          method: "PUT",
          body: JSON.stringify(baseRef.current ? { ...tableUpdates, base_items: baseRef.current } : tableUpdates)
        })
        if (Array.isArray(updatedTable?.current_items)) baseRef.current = normalizeItems(updatedTable.current_items)
      } catch (e) {
        console.warn("Backend table update warning:", e)
      }

      // The server now holds exactly this order
      savedOrderRef.current = orderSignature(validItems)

      // Sync state with OCCUPIED status
      if (onUpdateTableState) {
        onUpdateTableState(tableIdOrNum, {
          ...tableUpdates,
          ...(updatedTable || {}),
          status: "OCCUPIED"
        })
      }

      const tableNameStr = getTableDisplayName(table, t, formatNum)
      toastSuccess(t("tables.orderSavedSuccess", { tableName: tableNameStr, defaultValue: `Bill saved for ${tableNameStr}!` }))
      onBack()
    } catch (err) {
      console.error("Failed to save restaurant table bill:", err)
      if (await explainDeviceConflict(err)) return
      toastError(err.detail || err.message || "Failed to save bill.")
    } finally {
      busyRef.current = false
      setIsSaving(false)
      setBusyAction(null)
    }
  }

  // ==========================================
  // PRINT BILL (ROUTES TO EXISTING REPRINT FLOW)
  // ==========================================
  const handlePrintBill = async () => {
    if (isSaving) return

    if (!user) {
      requireAuth?.("dashboard")
      return
    }

    const validItems = items.filter((it) => it.name && it.name.trim() && Number(it.quantity) > 0)
    if (validItems.length === 0) {
      toastError(t("bills.addItemsBeforePrint", "Please add items to bill before printing."))
      return
    }

    setBusyAction("print")
    setIsSaving(true)
    busyRef.current = true
    const tableClaim = table.table_number || table.id
    let claimed = false
    try {
      // one device at a time bills a table, and it bills the order as it really is now
      const claim = await claimPrint({ table: tableClaim, user })
      if (!claim.ok) return
      claimed = true
      if (await syncWithServer()) {
        tellOrderChanged()
        return
      }
      const cachedTemplates = getCachedData("/templates") || BUILTIN_TEMPLATES
      const matchedTemplate = findTemplateMatch(cachedTemplates, shopInfo?.default_template_id) || cachedTemplates[0] || BUILTIN_TEMPLATES[0]

      const billData = {
        template_id: matchedTemplate.id || "classic",
        template_name: matchedTemplate.name || "Classic Receipt",
        template_width: matchedTemplate.width || (shopInfo?.receipt_width === "58mm" ? "58mm" : (shopInfo?.receipt_width === "55mm" ? "55mm" : (shopInfo?.receipt_width?.toLowerCase() === "a4" ? "a4" : "80mm"))),
        table_number: table.name || `Table ${table.table_number}`,
        table: table.name || `Table ${table.table_number}`,
        items: validItems.map((it) => ({
          name: it.name.trim(),
          barcode: it.barcode || null,
          quantity: Number(it.quantity) || 1,
          rate: Number(it.rate) || 0
        })),
        subtotal: subtotal,
        discount: Number(discountAmount || 0),
        discount_type: discountType,
        discount_value: Number(discount) || 0,
        tax_rate: 0,
        tax_mode: 0,
        tax_amount: 0,
        total: total,
        payment_mode: paymentMode,
        // one bill per table order, whichever of the shop's devices saves or prints it
        table_order: true,
        // kept as a saved bill until it has really printed (it is marked printed below, after printing)
        is_saved: true
      }

      // an existing bill for this table is updated (it used to be updated AND saved again as a second bill)
      const existingId = table.editing_bill_id || printBillIdRef.current
      let savedBill = null
      if (existingId) {
        savedBill = await call(`/bills/${existingId}`, { method: "PUT", body: JSON.stringify({ ...billData, holder: printHolder() }) }).catch((err) => {
          if (err?.status === 409) throw err // being printed, or already printed, on another device
          return null
        })
        if (savedBill && !savedBill.id) savedBill = { ...savedBill, id: existingId }
      }
      if (!savedBill) {
        savedBill = await call("/bills", { method: "POST", body: JSON.stringify({ ...billData, holder: printHolder() }) })
      }
      printBillIdRef.current = savedBill?.id || null

      // print straight from this screen: the receipt shown here, with the real bill number
      if (savedBill?.number) setPrintedNumber(savedBill.number)
      await new Promise((resolve) => setTimeout(resolve, 120))
      const printed = await chargeAndPrint({
        user,
        elementId: "table-receipt-to-print",
        pageWidth: printWidthOf(previewTemplate?.width),
        onNeedPlan: () => setView?.("pricing"),
        billNumber: savedBill?.number,
        billId: savedBill?.id
      })
      // not printed: the saved bill stays linked to this table, so printing later updates it instead of adding another
      if (printed !== true && savedBill?.id && onUpdateTableState) {
        onUpdateTableState(table.id || table.table_number, { editing_bill_id: savedBill.id, editing_bill_number: savedBill.number || null })
      }
      if (printed === "cancelled") {
        toastInfo(t("tables.savedPrintCancelled", "Print cancelled. The bill is saved and the table stays open."))
        return
      }
      if (printed === "failed" || printed === "busy") return // the reason was already shown in a popup; the table stays open
      if (printed !== true) {
        toastError(t("tables.savedNotPrinted", "The bill is saved but was not printed. Add print credits and press Print again."))
        return
      }
      if (savedBill?.id) await markBillPrinted(savedBill.id).catch(() => { })

      // If this table had an active saved bill in saved_bills, mark as printed in backend so it's removed from Home screen
      const tableLabel = getTableDisplayName(table, t, formatNum)
      // (a server that keeps a table order as one bill has no other bill of this order left)
      if (!savedBill?.table_linked) call(`/bills/print-table/${encodeURIComponent(table.name || `Table ${table.table_number}`)}`, { method: "POST" }).catch(() => { })

      // Printed: clear the table
      printBillIdRef.current = null
      setPrintedNumber("")
      setItems([])
      itemsRef.current = [] // a printed order is finished; leaving must not store it again
      baseRef.current = []
      const tableIdOrNum = table.id || table.table_number

      if (onUpdateTableState) {
        onUpdateTableState(tableIdOrNum, {
          current_items: [],
          total_amount: 0,
          status: "AVAILABLE",
          editing_bill_id: null,
          editing_bill_number: null
        })
      }

      await call(`/restaurant/tables/reset/${tableIdOrNum}`, {
        method: "POST"
      }).catch(() => { })

      // Invalidate restaurant tables cache so TableManagement gets clean state
      removeCachedData("/restaurant/tables")
      removeCachedData("/tables")
      invalidateApiCache("restaurant")
      invalidateApiCache("tables")
      resetSingleStoredTable(user, tableIdOrNum)

      window.dispatchEvent(
        new CustomEvent("slipzo_bill_printed", {
          detail: { ...savedBill, id: savedBill?.id, billId: savedBill?.id, table_number: tableLabel }
        })
      )

      toastSuccess(t("bills.printedSuccess", "Printed successfully!"))
      onBack?.()
    } catch (err) {
      console.error("Failed to print table bill:", err)
      if (await explainDeviceConflict(err)) return
      toastError(err.detail || err.message || "Failed to process print.")
    } finally {
      busyRef.current = false
      if (claimed) releasePrint({ table: tableClaim }) // after the table was cleared, so the other device sees that
      setIsSaving(false)
      setBusyAction(null)
    }
  }

  const isOccupied = items.length > 0

  return (
    <div className={`table-billing-workspace fade-in ${step === "order" && items.length > 0 ? "has-order-bar" : ""}`} ref={workspaceRef}>
      {/* Borderless Top Bar for Item Selection Step */}
      {step === "order" && (
        <div className="tb-top-toolbar">
          <div className="tb-toolbar-left">
            <button
              type="button"
              className="table-billing-back-btn"
              onClick={handleBackClick}
            >
              <ArrowLeft size={16} />
              <span>{t("tables.backToTables", "Tables")}</span>
            </button>
          </div>

          <div className="table-menu-search-row tb-toolbar-search">
            <div className="table-menu-search-input">
              <Search size={16} color="#64748b" className="table-search-icon" />
              <input
                type="text"
                placeholder={t("menu.searchPlaceholder", "Search items or speak to add (e.g. Tea, Coffee, Pizza...)")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="table-search-clear-btn"
                  title={t("bills.clearSearch", "Clear search")}
                >
                  <X size={14} />
                </button>
              )}
              <VoiceInputButton
                onSpeechResult={(text) => setSearch((text || "").trim().replace(/\s*[.,!?;:]+$/, "").trim())}
                placeholder={t("menu.voiceSearch", "Speak to search item")}
              />
            </div>

            {showBarcode && (
              <button
                type="button"
                className="table-scan-barcode-btn"
                onClick={() => setIsCameraScannerOpen(true)}
                title={t("bills.scanBarcodeTooltip", "Scan barcode with Camera or USB/BT Scanner")}
              >
                <BarcodeIcon size={18} />
                <span className="table-scan-btn-text">{t("bills.scanBarcode", "Scan Barcode")}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Split Layout */}
      <div className={step === "bill" ? "tb-bill-step" : "nb-desktop-layout"}>
        {/* LEFT COLUMN: Menu Items */}
        {step === "order" && (
        <div className="nb-left-col">
          {/* My Menu Items Container */}
          <div className="nb-menu-card-container">
            <div className="nb-menu-card-header tb-menu-card-header">
              <div className="tb-menu-card-titles">
                <div className="table-billing-title-box">
                  <h2 className="table-billing-title">
                    {getTableDisplayName(table, t, formatNum)}
                  </h2>
                  <span className={`table-status-badge ${isOccupied ? "badge-occupied" : "badge-available"}`}>
                    <span className="status-dot" />
                    {isOccupied ? t("tables.occupied", "Occupied") : t("tables.available", "Available")}
                  </span>
                  {table.editing_bill_number && (
                    <span className="tb-editing-pill">
                      ✏️ Editing Bill #{table.editing_bill_number}
                    </span>
                  )}
                </div>
                <div className="tb-menu-card-title-group">
                  <h3 className="nb-menu-card-title">{t("bills.myMenuItems", "My Menu Items")}</h3>
                  <span className="nb-menu-items-count">
                    {formatNum(filteredMenuItems.length)} {filteredMenuItems.length === 1 ? t("bills.item", "item") : t("bills.items", "items")}
                  </span>
                </div>
              </div>
              {userMenuItems.length > 0 && (
                <button
                  type="button"
                  className="tb-add-more-inline-btn"
                  onClick={() => {
                    sessionStorage.setItem("slipzo_menu_initial_tab", "add_items")
                    setView?.("menu")
                  }}
                >
                  <Plus size={14} />
                  <span>{t("bills.addMoreItems", "Add More Items")}</span>
                </button>
              )}
            </div>

            {/* Product group filter chips */}
            {!loadingMenu && groupChips.length > 1 && (
              <div className="nb-group-chips" role="tablist" aria-label={t("productGroups.filter", "Filter products")}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedCategory === "all"}
                  className={`nb-group-chip ${selectedCategory === "all" ? "active" : ""}`}
                  onClick={() => setSelectedCategory("all")}
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
                    onClick={() => setSelectedCategory(g.id)}
                  >
                    <span aria-hidden="true">{g.icon}</span> {productGroupLabel(t, groupBType, g)}
                  </button>
                ))}
              </div>
            )}

            {loadingMenu ? (
              <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#64748b" }}>
                {t("common.loading", "Loading menu items...")}
              </div>
            ) : userMenuItems.length === 0 ? (
              <EmptyMenuGuide
                businessType={shopInfo?.business_type || "hotel"}
                onAddItems={() => {
                  sessionStorage.setItem("slipzo_menu_initial_tab", "add_items")
                  setView?.("menu")
                }}
              />
            ) : filteredMenuItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
                <p style={{ margin: 0, fontWeight: "600" }}>{t("menu.noItemsFound", "No matching menu items found.")}</p>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    sessionStorage.setItem("slipzo_menu_initial_tab", "add_items")
                    setView?.("menu")
                  }}
                  style={{ marginTop: "0.85rem", fontSize: "0.82rem" }}
                >
                  + {t("menu.addItems", "Add Items to Menu")}
                </button>
              </div>
            ) : (
              <div className="nb-menu-items-list">
                {filteredMenuItems.map((item) => {
                  const cleanName = (item.name || "").trim()
                  const added = addedItemMap.get(cleanName.toLowerCase())
                  const currentQty = added ? Number(added.quantity || 0) : 0
                  const price = menuItemRate(item, shopInfo)
                  const itemImg = resolveItemImage(item)

                  return (
                    <div key={item.id || cleanName} className="nb-item-card">
                      <div className="nb-item-left">
                        {itemImg ? (
                          <img
                            src={itemImg}
                            alt={item.name}
                            className="nb-item-thumb"
                            onError={(e) => {
                              e.target.style.display = "none"
                              if (e.target.nextSibling) e.target.nextSibling.style.display = "flex"
                            }}
                          />
                        ) : null}
                        <div className="nb-item-thumb-placeholder" style={{ display: itemImg ? "none" : "flex" }}>
                          <Utensils size={18} />
                        </div>

                        <div className="nb-item-info">
                          <h4 className="nb-item-name" title={item.name}>{tDb(item.name)}</h4>
                          <span className="nb-item-category">{tDb(item.category || "General")}</span>
                          <div className="nb-item-price nb-item-price-desktop" style={{ "--len": shortMoney(price).length }}>
                            {shortMoney(price)}
                          </div>
                        </div>
                      </div>

                      <div className="nb-item-actions-wrapper">
                        <div className="nb-item-price nb-item-price-mobile">
                          {shortMoney(price)}
                        </div>

                        {currentQty > 0 ? (
                          <div className="nb-qty-controls-group">
                            <button
                              type="button"
                              className="nb-qty-btn"
                              onClick={() => handleUpdateQty(item.name, -1)}
                              title={t("bills.decrease", "Decrease quantity")}
                              aria-label={t("bills.decrease", "Decrease quantity")}
                            >
                              −
                            </button>
                            <span className="nb-qty-value">{formatNum(currentQty)}</span>
                            <button
                              type="button"
                              className="nb-qty-btn"
                              onClick={(e) => handleAddWithFly(item, e)}
                              title={t("bills.increase", "Increase quantity")}
                              aria-label={t("bills.increase", "Increase quantity")}
                            >
                              +
                            </button>
                            <button
                              type="button"
                              className="nb-item-del-btn"
                              onClick={() => handleRemoveItem(item.name)}
                              title={t("bills.removeFromBill", "Remove item")}
                              aria-label={t("bills.removeFromBill", "Remove item")}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="nb-add-btn"
                            onClick={(e) => handleAddWithFly(item, e)}
                            title={t("bills.addItemToBill", "Add item")}
                          >
                            <Plus size={14} /> {t("bills.add", "Add")}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        )}

        {/* RIGHT COLUMN, step 1: the items added to this table, with their quantity only */}
        {step === "order" && (
        <div className="nb-right-col tb-order-col">
          <div className="nb-summary-card tb-order-card">
            <div className="tb-order-head">
              <h4>{t("tables.addedItems", "Added Items")}</h4>
              <span className="tb-order-count">
                {formatNum(totalItemsCount)} {totalItemsCount === 1 ? t("history.item", "item") : t("history.items", "items")} • {money(total)}
              </span>
            </div>

            <div className="tb-order-list" ref={orderListRef}>
              {items.length === 0 && <p className="tb-order-empty">{t("tables.addedItemsEmpty", "Tap Add on an item to see it here.")}</p>}
              {items.map((it, idx) => {
                const key = orderKeyOf(it.name)
                return (
                  <div key={`${key}-${idx}`} data-order-key={key} data-flying={flyingKeys.includes(key) || undefined} className="selected-item-card tb-order-row">
                    <div className="tb-order-thumb">
                      <Utensils size={16} />
                      {it.image_url && <img src={it.image_url} alt="" onError={(e) => { e.currentTarget.style.display = "none" }} />}
                    </div>
                    <span className="tb-order-name" title={it.name}>{tDb(it.name)}</span>
                    <span className="tb-order-qty">× {formatNum(it.quantity)}</span>
                  </div>
                )
              })}
            </div>

            <button type="button" className="nb-save-bill-btn tb-view-bill-btn" onClick={showBill} disabled={items.length === 0}>
              <span>{t("tables.viewBill", "View Bill")}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
        )}

        {/* Step 2: the bill */}
        {step === "bill" && (
        <div className="nb-right-col">
          {/* Bill Summary Card */}
          <div className="nb-summary-card">
            {/* Dedicated Print DOM Container */}
            <div style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0, pointerEvents: "none" }}>
              <div id="table-receipt-to-print" className={`receipt-preview-content format-${previewTemplate.width === "a4" ? "a4" : previewTemplate.width}`}>
                <RealisticReceiptView template={previewTemplate} />
              </div>
            </div>

            {/* Bill Summary Header */}
            <div className="nb-summary-header-row tb-bill-card-header">
              <div className="tb-bill-card-header-left">
                <button
                  type="button"
                  className="table-billing-back-btn tb-bill-back-btn"
                  onClick={() => setStep("order")}
                  disabled={isSaving}
                >
                  <ArrowLeft size={15} />
                  <span>{t("tables.backToItems", "Items")}</span>
                </button>
                <div className="tb-bill-title-wrap">
                  <div className="tb-bill-title-line">
                    <h4 className="tb-bill-card-title">{t("bills.billSummary", "Bill Summary")}</h4>
                    {table.editing_bill_number && (
                      <span className="tb-editing-pill">
                        ✏️ #{table.editing_bill_number}
                      </span>
                    )}
                  </div>
                  <div className="tb-bill-table-sub">
                    <span>{getTableDisplayName(table, t, formatNum)}</span>
                    <span className={`table-status-badge ${isOccupied ? "badge-occupied" : "badge-available"}`}>
                      <span className="status-dot" />
                      {isOccupied ? t("tables.occupied", "Occupied") : t("tables.available", "Available")}
                    </span>
                  </div>
                </div>
              </div>
              <span className="tb-order-count">
                {formatNum(totalItemsCount)} {totalItemsCount === 1 ? t("history.item", "item") : t("history.items", "items")}
              </span>
            </div>

            {/* Items in Bill Summary */}
            {items.length === 0 ? (
              <div style={{ padding: "1.75rem 1rem", textAlign: "center", color: "#94a3b8" }}>
                <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600 }}>{t("tables.previewEmpty", "Add items to see the bill summary.")}</p>
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
                        {it.quantity} × {money(it.rate)}
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>
                      {money(Number(it.quantity) * Number(it.rate))}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="nb-summary-details">
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
                      <span>{t("bills.paymentModeUpper", t("bills.paymentMode", "PAYMENT MODE"))}</span>
                    </label>
                  </div>
                  <select
                    value={paymentMode}
                    onChange={(e) => { setPaymentMode(e.target.value); paymentPickedRef.current = true }}
                    className="nb-payment-select"
                  >
                    {paymentOptions.map((m) => (
                      <option key={m.id} value={m.id}>{t(m.labelKey, m.label)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* UPI: QR code from the shop's UPI ID with the exact bill amount, for the customer to scan */}
              {paymentMode === "UPI" && (
                <UpiPayCard
                  upiId={shopInfo?.upi_id}
                  payeeName={shopInfo?.name}
                  amount={total}
                  note={table?.name ? `${shopInfo?.name || "Bill"} - ${table.name}` : ""}
                  onAddUpiId={() => {
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
                      <Fragment key={g.rate}>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#475569", marginBottom: "0.15rem" }}>
                          <span>CGST ({g.cgstRate}%)</span>
                          <span>{money(g.cgst)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#475569", marginBottom: "0.15rem" }}>
                          <span>SGST ({g.sgstRate}%)</span>
                          <span>{money(g.sgst)}</span>
                        </div>
                      </Fragment>
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

              {/* Billing Action Buttons */}
              <div className="nb-action-row" style={{ display: "flex", gap: "0.6rem", marginTop: "0.85rem" }}>
                <button
                  type="button"
                  className="nb-save-bill-btn"
                  onClick={handlePrintBill}
                  disabled={isSaving || items.length === 0}
                  style={{
                    flex: 1,
                    background: "#0284c7",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    padding: "0.75rem 1rem",
                    fontSize: "0.9rem",
                    fontWeight: "700",
                    cursor: (isSaving || items.length === 0) ? "not-allowed" : "pointer",
                    opacity: (isSaving || items.length === 0) ? 0.6 : 1,
                    transition: "all 0.15s ease",
                    boxShadow: "0 2px 6px rgba(2, 132, 199, 0.25)"
                  }}
                >
                  {busyAction === "print" ? <Spinner size={16} /> : <Printer size={16} />}
                  <span>{busyAction === "print" ? t("bills.printing", "Printing...") : t("bills.print", "Print")}</span>
                </button>

                <button
                  type="button"
                  className="nb-save-bill-btn"
                  onClick={handleSaveBill}
                  disabled={isSaving || items.length === 0}
                  style={{
                    flex: 1,
                    background: "#ffffff",
                    color: "#0f172a",
                    border: "1.5px solid #cbd5e1",
                    borderRadius: "10px",
                    padding: "0.75rem 1rem",
                    fontSize: "0.9rem",
                    fontWeight: "700",
                    cursor: (isSaving || items.length === 0) ? "not-allowed" : "pointer",
                    opacity: (isSaving || items.length === 0) ? 0.6 : 1,
                    transition: "all 0.15s ease",
                    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)"
                  }}
                >
                  {busyAction === "save" ? <Spinner size={16} /> : <Save size={16} />}
                  <span>{busyAction === "save" ? t("bills.saving", "Saving...") : t("bills.saveBill", "Save Bill")}</span>
                </button>
              </div>

              <div className="tb-secondary-actions" style={{ display: "flex", gap: "0.6rem", marginTop: "0.55rem", width: "100%" }}>
                <button
                  type="button"
                  className="tb-pdf-btn"
                  data-testid="table-pdf-button"
                  disabled={isSaving || items.length === 0}
                  onClick={() => chargeAndSavePdf({ user, elementId: "table-receipt-to-print", pageWidth: printWidthOf(previewTemplate?.width), billNumber: previewTemplate?.previewData?.invoiceNo, onNeedPlan: () => setView?.("pricing") })}
                  style={{
                    flex: 1,
                    width: "auto",
                    marginTop: 0,
                    whiteSpace: "nowrap"
                  }}
                >
                  <Download size={15} /> {t("bills.downloadPdf", "Download PDF")}
                </button>

                {items.length > 0 && (
                  <button
                    type="button"
                    className="tb-reset-btn"
                    onClick={() => setIsResetModalOpen(true)}
                    disabled={isSaving}
                    style={{
                      flex: 1,
                      width: "auto",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.45rem",
                      marginTop: 0,
                      padding: "0.6rem 0.75rem",
                      borderRadius: "10px",
                      border: "1.5px solid #fecaca",
                      background: "#fef2f2",
                      color: "#dc2626",
                      fontSize: "0.86rem",
                      fontWeight: "700",
                      cursor: isSaving ? "not-allowed" : "pointer",
                      opacity: isSaving ? 0.55 : 1,
                      transition: "all 0.15s ease",
                      boxShadow: "0 1px 2px rgba(220, 38, 38, 0.05)",
                      whiteSpace: "nowrap"
                    }}
                  >
                    <RotateCcw size={15} /> {t("tables.resetTable", t("common.resetTable", "Reset Table"))}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Phones: the added items are below the menu, so this bar shows the count and opens the bill */}
      {step === "order" && items.length > 0 && createPortal(
        <button type="button" className="tb-order-bar" ref={orderBarRef} onClick={showBill}>
          <span className="tb-order-bar-count">
            {formatNum(totalItemsCount)} {totalItemsCount === 1 ? t("history.item", "item") : t("history.items", "items")} • {money(total)}
          </span>
          <span className="tb-order-bar-go">{t("tables.viewBill", "View Bill")} <ArrowRight size={16} /></span>
        </button>,
        document.body
      )}

      {/* Reset Confirmation Modal */}
      <TableResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleConfirmReset}
        tableName={getTableDisplayName(table, t, formatNum)}
      />

      {/* Barcode Camera Scanner */}
      {showBarcode && isCameraScannerOpen && (
        <Suspense fallback={<div className="scanner-chunk-loader" role="status" aria-label={t("common.openingCamera", "Opening camera")}><Spinner size={34} /></div>}>
          <CameraScannerModal
            isOpen={isCameraScannerOpen}
            onClose={() => setIsCameraScannerOpen(false)}
            onScanSuccess={(scanned) => {
              handleBarcodeDetected(scanned)
              setIsCameraScannerOpen(false)
            }}
          />
        </Suspense>
      )}
    </div>
  )
}
