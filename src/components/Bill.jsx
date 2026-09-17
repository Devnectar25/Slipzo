// Bill.jsx - Updated (removed mobile-sticky-action-bar)

import { useEffect, useMemo, useState, useRef } from "react"
import { printReceiptElement } from "../lib/printReceipt"
import { PrintModal } from "./PrintModal"
import { BUILTIN_TEMPLATES } from "./Templates"
import Swal from "sweetalert2"
import {
  Plus,
  Receipt,
  Printer,
  Trash2,
  Save,
  X,
  CreditCard,
  Building,
  Phone,
  MapPin,
  User,
  UserPlus,
  Hash,
  Eye,
  FileEdit,
  SlidersHorizontal,
  CheckCircle2,
  History,
  PlusCircle,
  ChevronRight,
  CheckSquare,
  Square,
  PackageX,
  Sparkles,
  Utensils,
  Search,
  Edit2
} from "lucide-react"
import {
  call,
  money,
  cleanTextLines,
  findTemplateMatch,
  incrementTemplatePrint,
  canPrintTemplate,
  getRemainingPrints,
  canPrintFree,
  getRemainingFreePrints,
  incrementFreePrintCount,
  getCachedData,
  syncUserQuota,
  getActivePlanDetails,
  getStoredMenuItems,
  saveStoredMenuItems
} from "../lib/utils"
import { ReceiptSkeleton, ButtonLoader, Spinner } from "./common/Skeleton"
import { useToast } from "./common/Toast"

// Demo templates for non-logged-in visitors trying the tool from the home page.
const GUEST_TEMPLATES = [
  { id: "2", name: "Minimal Bill", width: "58mm", show_tax: false, tax_rate: 0, footer: "Thanks for your purchase!", is_default: true },
  { id: "1", name: "Classic Receipt", width: "58mm", show_tax: true, tax_rate: 18, footer: "Thank you for shopping with us!", is_default: false },
  { id: "3", name: "Shop Pro", width: "80mm", show_tax: true, tax_rate: 18, footer: "We appreciate your business!", is_default: false },
  { id: "4", name: "Eco Print", width: "58mm", show_tax: false, tax_rate: 0, footer: "Thank you!", is_default: false },
  { id: "5", name: "Modern Shop", width: "58mm", show_tax: true, tax_rate: 12, footer: "Visit us again!", is_default: false },
  { id: "6", name: "Business Elite", width: "80mm", show_tax: true, tax_rate: 18, footer: "Thank you for your business.", is_default: false }
]

function generateClientBillNumber(prefix = "SLP", sequence = 1001, format = "PREFIX-DATE-SEQ") {
  const cleanPrefix = (prefix || "SLP").trim().toUpperCase()
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  const dateStr = `${year}${month}${day}`
  const seqStr = String(sequence || 1001).padStart(4, "0")

  if (format === "PREFIX-SEQ") {
    return `${cleanPrefix}-${seqStr}`
  } else if (format === "DATE-SEQ") {
    return `${dateStr}-${seqStr}`
    return `${cleanPrefix}-${dateStr}-${seqStr}`
  }
}

function numberToWords(amount) {
  const num = Math.round(Number(amount) || 0)
  if (num === 0) return "Zero Rupees Only"
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ]
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

  function inWords(n) {
    if (n === 0) return ""
    if (n < 20) return a[n] + " "
    if (n < 100) return b[Math.floor(n / 10)] + " " + a[n % 10] + (n % 10 ? " " : "")
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred " + inWords(n % 100)
    if (n < 100000) return inWords(Math.floor(n / 1000)) + "Thousand " + inWords(n % 1000)
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + "Lakh " + inWords(n % 100000)
    return inWords(Math.floor(n / 10000000)) + "Crore " + inWords(n % 10000000)
  }

  return (inWords(num).trim() + " Rupees Only")
}

export function Bill({ user, requireAuth, setView, shop: initialShop, setShop: parentSetShop }) {
  const userKey = user?.email || user?.id
  const [shop, setShopState] = useState(initialShop || {})

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

  const { success: toastSuccess, error: toastError } = useToast()

  const cachedTemplates = getCachedData("/templates")
  const cachedShop = getCachedData("/shop")

  const cachedCustomers = getCachedData("/customers")
  const cachedMenuItems = getCachedData("/menu")

  const [templates, setTemplates] = useState(() => {
    if (Array.isArray(cachedTemplates) && cachedTemplates.length > 0) return cachedTemplates
    return user ? [] : GUEST_TEMPLATES
  })
  const [selectedId, setSelectedId] = useState(() => sessionStorage.getItem("slipzo-template") || (cachedTemplates?.[0]?.id || ""))
  const [customers, setCustomers] = useState(() => (Array.isArray(cachedCustomers) ? cachedCustomers : []))
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerName, setCustomerName] = useState("")
  const [items, setItems] = useState([{ id: 1, name: "", quantity: 1, rate: "" }])
  const [discount, setDiscount] = useState("")
  const [tax, setTax] = useState(0)
  const [payment, setPayment] = useState("Cash")
  const [saved, setSaved] = useState(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(() => !(cachedTemplates && cachedShop))
  const [error, setError] = useState(null)
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
  const [editingBillNumber, setEditingBillNumber] = useState(false)
  const [activeMobileTab, setActiveMobileTab] = useState("edit") // "edit" | "preview"
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false)
  const [quickCustomerForm, setQuickCustomerForm] = useState({ name: "", phone: "" })
  const [quickCustomerLoading, setQuickCustomerLoading] = useState(false)

  // Shop Menu Items State
  const [menuItems, setMenuItems] = useState(() => (Array.isArray(cachedMenuItems) ? cachedMenuItems : []))
  const [showItemPickerModal, setShowItemPickerModal] = useState(false)
  const [itemPickerSearch, setItemPickerSearch] = useState("")
  const [showAddNewItemModal, setShowAddNewItemModal] = useState(false)
  const [newItemName, setNewItemName] = useState("")
  const [newItemPrice, setNewItemPrice] = useState("")
  const [newItemSaving, setNewItemSaving] = useState(false)

  const receiptRef = useRef(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [printFormat, setPrintFormat] = useState(() => {
    const saved = localStorage.getItem("slipzo_print_settings")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.pageWidth) {
          if (parsed.pageWidth === "55mm" || parsed.pageWidth === "55") return "55mm"
          if (parsed.pageWidth === "80mm" || parsed.pageWidth === "80") return "80mm"
          if (parsed.pageWidth === "a4") return "a4"
        }
      } catch (_) { }
    }
    return "80mm"
  })

  const handleFormatChange = (fmt) => {
    setPrintFormat(fmt)
    const saved = localStorage.getItem("slipzo_print_settings")
    let settings = {}
    if (saved) {
      try { settings = JSON.parse(saved) } catch (_) { }
    }
    settings.pageWidth = fmt
    localStorage.setItem("slipzo_print_settings", JSON.stringify(settings))
  }

  // New Bill Flow State: "form" | "existing_items"
  const [flowState, setFlowState] = useState("form")
  const [recentItems, setRecentItems] = useState([])
  const [loadingRecentItems, setLoadingRecentItems] = useState(false)
  const [selectedRecentIndices, setSelectedRecentIndices] = useState([])

  const fetchRecentBillItems = async () => {
    if (!user) {
      setRecentItems([])
      return
    }
    setLoadingRecentItems(true)
    try {
      // Fetch latest 3 bills for the logged-in user
      const res = await call("/bills?limit=3")
      const billsList = Array.isArray(res?.bills) ? res.bills : (Array.isArray(res) ? res : [])
      const latest3 = billsList.slice(0, 3)

      // Deduplicate items across the last 3 bills by item name (case-insensitive)
      const itemMap = new Map()
      latest3.forEach((b) => {
        const billItems = Array.isArray(b.items) ? b.items : (typeof b.items === 'string' ? JSON.parse(b.items) : [])
        if (Array.isArray(billItems)) {
          billItems.forEach((item) => {
            if (item && item.name && item.name.trim()) {
              const key = item.name.trim().toLowerCase()
              if (!itemMap.has(key)) {
                itemMap.set(key, {
                  id: item.id || `rec_${Date.now()}_${Math.random()}`,
                  name: item.name.trim(),
                  quantity: Number(item.quantity) || 1,
                  rate: Number(item.rate) || 0,
                  billNumber: b.number || ''
                })
              }
            }
          })
        }
      })

      const extracted = Array.from(itemMap.values())
      setRecentItems(extracted)
      setSelectedRecentIndices([])
    } catch (err) {
      console.warn("Could not fetch recent bill items:", err)
      setRecentItems([])
    } finally {
      setLoadingRecentItems(false)
    }
  }

  const toggleRecentItemSelection = (index) => {
    setSelectedRecentIndices((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index)
      } else {
        return [...prev, index]
      }
    })
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!cachedTemplates && !cachedShop) setInitialLoading(true)
        setError(null)

        if (!user) {
          setTemplates(GUEST_TEMPLATES)
          setShop({ name: "Your Shop Name", address: "", phone: "", invoice_prefix: "SLP", invoice_sequence: 1001 })
          if (!selectedId) {
            setSelectedId(GUEST_TEMPLATES[0].id)
          }
          setCustomBillNumber(generateClientBillNumber("SLP", 1001, "PREFIX-DATE-SEQ"))
          return
        }

        const [templatesData, shopData, customersData, menuData] = await Promise.all([
          call("/templates").catch(() => []),
          call("/shop").catch(() => ({})),
          call("/customers").catch(() => []),
          call("/menu").catch(() => [])
        ])

        const dbTemplates = Array.isArray(templatesData) ? templatesData : []
        const dbNames = new Set(dbTemplates.map(t => (t.name || "").toLowerCase()))
        const extraBuiltins = BUILTIN_TEMPLATES.filter(b => !dbNames.has((b.name || "").toLowerCase()))
        let templatesArray = [...dbTemplates, ...extraBuiltins]
        if (templatesArray.length === 0) templatesArray = BUILTIN_TEMPLATES

        const validMenuData = Array.isArray(menuData) ? menuData : (Array.isArray(menuData?.menu) ? menuData.menu : (Array.isArray(menuData?.items) ? menuData.items : []))
        let menuItemsList = validMenuData.length > 0 ? validMenuData : getStoredMenuItems(user)
        if (!Array.isArray(menuItemsList)) menuItemsList = []
        if (menuItemsList.length > 0) {
          saveStoredMenuItems(menuItemsList, user)
        }

        setTemplates(templatesArray)
        setShop(shopData || {})
        setCustomers(Array.isArray(customersData) ? customersData : [])
        setMenuItems(menuItemsList)

        // Auto-apply saved receipt template from session or shop profile using findTemplateMatch
        const sessionTplId = sessionStorage.getItem("slipzo-template")
        let resolvedTpl = null

        if (sessionTplId) {
          resolvedTpl = findTemplateMatch(templatesArray, sessionTplId)
        }
        if (!resolvedTpl && shopData?.default_template_id) {
          resolvedTpl = findTemplateMatch(templatesArray, shopData.default_template_id)
        }
        if (!resolvedTpl && templatesArray.length > 0) {
          resolvedTpl = templatesArray.find((t) => t.is_default) || templatesArray[0]
        }

        if (resolvedTpl) {
          setSelectedId(resolvedTpl.id)
        }

        // Auto-populate default discount and tax from shop profile
        if (shopData?.default_discount !== undefined && shopData?.default_discount !== null) {
          setDiscount(String(shopData.default_discount))
        } else {
          setDiscount("0")
        }

        if (shopData?.tax_rate !== undefined && shopData?.tax_rate !== null) {
          setTax(String(shopData.tax_rate))
        } else {
          setTax("0")
        }

        // Generate live invoice number
        const nextNum = generateClientBillNumber(
          shopData?.invoice_prefix || "SLP",
          shopData?.invoice_sequence || 1001,
          shopData?.invoice_format || "PREFIX-DATE-SEQ"
        )
        setCustomBillNumber(nextNum)

        // Check if a customer was pre-selected from session
        const storedCustomer = sessionStorage.getItem("slipzo-selected-customer")
        if (storedCustomer) {
          try {
            const cust = JSON.parse(storedCustomer)
            setSelectedCustomer(cust)
            sessionStorage.removeItem("slipzo-selected-customer")
          } catch (e) {
            sessionStorage.removeItem("slipzo-selected-customer")
          }
        }

        // Check if a product was pre-selected from session
        const storedItem = sessionStorage.getItem("slipzo-quick-item")
        if (storedItem) {
          try {
            const item = JSON.parse(storedItem)
            if (item && item.name) {
              setItems([{ id: Date.now(), name: item.name, rate: item.rate || 0, quantity: item.quantity || 1 }])
            }
            sessionStorage.removeItem("slipzo-quick-item")
          } catch (e) {
            sessionStorage.removeItem("slipzo-quick-item")
          }
        }
      } catch (err) {
        console.error("Failed to load bill setup data:", err)
        setTemplates(BUILTIN_TEMPLATES)
        if (!selectedId && BUILTIN_TEMPLATES.length > 0) {
          setSelectedId(BUILTIN_TEMPLATES[0].id)
        }
      } finally {
        setInitialLoading(false)
      }
    }
    loadData()
  }, [user])

  const shopTaxMode = useMemo(() => {
    if (!shop || shop.show_tax === undefined || shop.show_tax === null) return 2
    if (shop.show_tax === false || shop.show_tax === 0 || shop.show_tax === "0") return 0
    if (shop.show_tax === true) return 2
    return Number(shop.show_tax)
  }, [shop])

  const isTaxEnabled = shopTaxMode !== 0

  const selected = useMemo(() => {
    const list = Array.isArray(templates) && templates.length > 0 ? templates : BUILTIN_TEMPLATES
    return findTemplateMatch(list, selectedId) || list.find((t) => t.is_default) || list[0] || null
  }, [templates, selectedId])

  const templateType = useMemo(() => {
    const id = String(selected?.id || selected?.templateId || "").toLowerCase()
    if (id === "1" || id.includes("classic")) return "classic"
    if (id === "2" || id.includes("minimal")) return "minimal"
    if (id === "3" || id.includes("pro")) return "pro"
    if (id === "4" || id.includes("eco")) return "eco"
    if (id === "5" || id.includes("modern")) return "modern"
    if (id === "6" || id.includes("elite")) return "elite"
    return "classic"
  }, [selected])

  const activeItems = useMemo(
    () => items.filter((item) => item.name && item.name.trim()),
    [items]
  )

  const totalUnits = useMemo(
    () => activeItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    [activeItems]
  )

  // Sync tax and discount from shop profile as the single source of truth
  useEffect(() => {
    if (shop) {
      if (shop.default_discount !== undefined && shop.default_discount !== null) {
        setDiscount(String(shop.default_discount))
      } else {
        setDiscount("0")
      }

      if (!isTaxEnabled) {
        setTax("0")
      } else if (shop.tax_rate !== undefined && shop.tax_rate !== null) {
        setTax(String(shop.tax_rate))
      } else {
        setTax("0")
      }
    }
  }, [shop, isTaxEnabled])

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0),
        0
      ),
    [items]
  )

  const discountAmount = useMemo(() => {
    const val = Number(discount)
    return isNaN(val) ? 0 : Math.max(0, val)
  }, [discount])

  const taxable = useMemo(() => Math.max(0, subtotal - discountAmount), [subtotal, discountAmount])

  const taxRate = useMemo(() => {
    if (!isTaxEnabled || shopTaxMode === 0) return 0
    const val = Number(tax)
    return isNaN(val) ? 0 : Math.max(0, val)
  }, [tax, isTaxEnabled, shopTaxMode])

  const taxAmount = useMemo(() => {
    if (!isTaxEnabled || shopTaxMode === 0 || taxRate <= 0 || taxable <= 0) return 0
    if (shopTaxMode === 1) {
      // TAX INCLUDED (prices contain tax): Extract tax portion for display
      const base = taxable / (1 + taxRate / 100)
      return taxable - base
    }
    // TAX EXTRA (shopTaxMode === 2): Tax is added on top of discounted subtotal
    return taxable * (taxRate / 100)
  }, [taxable, taxRate, isTaxEnabled, shopTaxMode])

  const total = useMemo(() => {
    if (isTaxEnabled && shopTaxMode === 2 && taxRate > 0) {
      // TAX EXTRA: Payable Grand Total = Taxable Subtotal + Tax Amount
      return taxable + taxAmount
    }
    // TAX INCLUDED (shopTaxMode === 1) or NO TAX (shopTaxMode === 0): Payable Grand Total = Taxable Subtotal
    return taxable
  }, [taxable, taxAmount, taxRate, isTaxEnabled, shopTaxMode])

  const increaseQuantity = (index) => {
    setItems((prevItems) =>
      prevItems.map((item, i) => {
        if (i !== index) return item
        const currentQty = Math.max(1, Number(item.quantity) || 1)
        return { ...item, quantity: currentQty + 1 }
      })
    )
  }

  const decreaseQuantity = (index) => {
    setItems((prevItems) =>
      prevItems.map((item, i) => {
        if (i !== index) return item
        const currentQty = Math.max(1, Number(item.quantity) || 1)
        return { ...item, quantity: Math.max(1, currentQty - 1) }
      })
    )
  }

  const updateItemRow = (index, updates) => {
    setItems((prevItems) =>
      prevItems.map((item, i) => (i === index ? { ...item, ...updates } : item))
    )
  }

  const updateItem = (index, key, value) => {
    setItems((prevItems) =>
      prevItems.map((item, i) => {
        if (i !== index) return item
        const updated = { ...item, [key]: value }
        if (key === "name") {
          const matched = Array.isArray(menuItems) ? menuItems.find(
            (m) => (m.name || "").toLowerCase() === String(value || "").trim().toLowerCase()
          ) : null
          if (matched && matched.price !== undefined) {
            updated.rate = String(matched.price)
            updated.isSaved = true
          } else {
            updated.isSaved = false
          }
        }
        return updated
      })
    )
  }

  const handleSelectMenuItem = (menuItem) => {
    if (!menuItem) return
    const newRate = String(menuItem.price !== undefined ? menuItem.price : 0)
    setItems((prevItems) => {
      const lastItem = prevItems[prevItems.length - 1]
      if (prevItems.length === 1 && !lastItem?.name?.trim() && (!lastItem?.rate || lastItem?.rate === "0" || lastItem?.rate === 0)) {
        return [{ id: lastItem.id, name: menuItem.name, quantity: 1, rate: newRate, isSaved: true }]
      }
      const newId = Math.max(...prevItems.map((i) => i.id), 0) + 1
      return [...prevItems, { id: newId, name: menuItem.name, quantity: 1, rate: newRate, isSaved: true }]
    })
    setShowItemPickerModal(false)
    if (toastSuccess) toastSuccess(`Added ${menuItem.name} (₹${menuItem.price})`)
  }

  const handleSaveNewItemFromBill = async (e) => {
    e?.preventDefault()
    if (!newItemName.trim()) {
      if (toastError) toastError("Please enter an item name")
      return
    }
    const numPrice = parseFloat(newItemPrice) || 0

    setNewItemSaving(true)
    try {
      let savedItem = { name: newItemName.trim(), price: numPrice }
      if (user) {
        savedItem = await call("/menu", {
          method: "POST",
          body: JSON.stringify({ name: newItemName.trim(), price: numPrice })
        }).catch(() => ({
          id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: newItemName.trim(),
          price: numPrice,
          created_at: new Date().toISOString()
        }))
        setMenuItems((prev) => {
          const next = [savedItem, ...prev]
          saveStoredMenuItems(next, user)
          return next
        })
      }
      handleSelectMenuItem(savedItem)
      setShowAddNewItemModal(false)
      setNewItemName("")
      setNewItemPrice("")
    } catch (err) {
      if (toastError) toastError(err.message || "Failed to save menu item")
    } finally {
      setNewItemSaving(false)
    }
  }

  const handleAddItemClick = () => {
    addItem()
  }

  const addItem = () => {
    const newId = Math.max(...items.map((i) => i.id), 0) + 1
    setItems([...items, { id: newId, name: "", quantity: 1, rate: "" }])
  }

  const removeItem = (index) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const clearAllItems = () => {
    setItems([{ id: 1, name: "", quantity: 1, rate: "" }])
  }

  const handleQuickAddCustomer = async (e) => {
    e.preventDefault()
    if (!quickCustomerForm.name.trim()) return
    try {
      setQuickCustomerLoading(true)
      const newCust = await call("/customers", {
        method: "POST",
        body: JSON.stringify(quickCustomerForm)
      })
      setCustomers((prev) => [newCust, ...prev])
      setSelectedCustomer(newCust)
      setShowQuickCustomerModal(false)
      setQuickCustomerForm({ name: "", phone: "" })
      toastSuccess(`Added customer ${newCust.name}`)
    } catch (err) {
      toastError(err.message || "Failed to add customer")
    } finally {
      setQuickCustomerLoading(false)
    }
  }

  const saveBill = async () => {
    if (!user) {
      requireAuth?.("dashboard")
      return
    }

    const userKey = user?.email || user?.id

    setLoading(true)
    setError(null)

    const validItems = items.filter((item) => item.name && item.name.trim())

    if (validItems.length === 0) {
      setError("Please add at least one item")
      toastError("Please add at least one item")
      setLoading(false)
      return
    }

    try {
      const billData = {
        template_id: selected?.id || "",
        items: validItems.map((item) => ({
          name: item.name.trim(),
          quantity: Number(item.quantity) || 0,
          rate: Number(item.rate) || 0
        })),
        subtotal: subtotal,
        discount: Number(discount) || 0,
        tax_rate: Number(tax) || 0,
        tax_mode: shopTaxMode,
        tax_amount: taxAmount,
        total: total,
        payment_mode: payment,
        customer_id: selectedCustomer?.id || null,
        customer_name: customerName ? customerName.trim() : (selectedCustomer?.name || ""),
        customer_phone: selectedCustomer?.phone || "",
        number: customBillNumber || ""
      }

      const bill = await call("/bills", {
        method: "POST",
        body: JSON.stringify(billData)
      })

      if (bill && bill.quota) {
        syncUserQuota(bill.quota, userKey)
      }

      setSaved(bill)
      setCustomBillNumber(bill.number)
      toastSuccess(`Bill #${bill.number} saved successfully!`)

      // Increment local shop sequence preview
      if (shop.invoice_sequence) {
        setShop((s) => ({ ...s, invoice_sequence: Number(s.invoice_sequence) + 1 }))
      }
    } catch (err) {
      console.error("Failed to save bill:", err)
      const msg = err.message || "Failed to save bill. Please try again."
      setError(msg)
      toastError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    const userKey = user?.email || user?.id
    if (!canPrintFree(userKey)) {
      const plan = getActivePlanDetails(userKey)
      if (plan?.isFreeTier) {
        window.dispatchEvent(new CustomEvent("slipzo-show-free-reward-expired", { detail: { force: true } }))
      } else {
        const msg = "⚠️ You have reached your print quota limit."
        if (toastError) toastError(msg)
        Swal.fire({
          title: "Print Quota Reached",
          text: "You have used all available prints in your plan. Please select a plan to add print credits and continue.",
          icon: "warning",
          confirmButtonText: "View Pricing Plans",
          confirmButtonColor: "#0ea5e9"
        }).then(() => {
          setView("pricing")
        })
      }
      return
    }

    setShowPrintModal(true)
  }

  const handlePrintComplete = (newQuota) => {
    if (newQuota && user) {
      syncUserQuota(newQuota, user?.email || user?.id)
    }
    if (selected?.id) {
      const key = `template_usage_${selected.id}`
      try {
        const data = localStorage.getItem(key)
        const usage = data ? JSON.parse(data) : { edits: 0, prints: 0 }
        usage.prints = (usage.prints || 0) + 1
        localStorage.setItem(key, JSON.stringify(usage))
      } catch (_) {}
    }
  }

  const resetForm = () => {
    setItems([{ id: 1, name: "", quantity: 1, rate: "" }])
    if (shop?.default_discount !== undefined && shop?.default_discount !== null) {
      setDiscount(String(shop.default_discount))
    } else {
      setDiscount("0")
    }

    if (!isTaxEnabled) {
      setTax("0")
    } else if (shop?.tax_rate !== undefined && shop?.tax_rate !== null) {
      setTax(String(shop.tax_rate))
    } else {
      setTax("0")
    }

    setPayment("Cash")
    setCustomerName("")
    setSelectedCustomer(null)
    setSaved(null)
    setError(null)
    setFlowState("form")

    const nextNum = generateClientBillNumber(
      shop?.invoice_prefix || "SLP",
      shop?.invoice_sequence || 1001,
      shop?.invoice_format || "PREFIX-DATE-SEQ"
    )
    setCustomBillNumber(nextNum)
  }

  // Render usage info for non-logged-in users
  const renderUsageInfo = () => {
    if (user) return null

    const remaining = getRemainingFreePrints()
    const hasRemaining = remaining > 0

    return (
      <div
        className="usage-info-bar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 1rem",
          borderRadius: "8px",
          fontSize: "0.75rem",
          background: hasRemaining ? "#f8fafc" : "#fef2f2",
          border: `1px solid ${hasRemaining ? "#e2e8f0" : "#fecaca"}`,
          color: hasRemaining ? "#64748b" : "#dc2626",
          marginTop: "0.5rem",
          marginBottom: "0.5rem"
        }}
      >
        <span>
          🖨️ {hasRemaining ? `${remaining} free ${remaining === 1 ? "print" : "prints"} remaining (10 free prints limit)` : "0 free prints remaining. Limit reached!"}
        </span>
        <button
          className="usage-cta"
          onClick={() => setView("pricing")}
          style={{
            marginLeft: "auto",
            padding: "0.2rem 0.75rem",
            background: hasRemaining ? "#0ea5e9" : "#0f172a",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.7rem",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          {hasRemaining ? "View Pricing Plans" : "Upgrade / View Plans"}
        </button>
      </div>
    )
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

  if (initialLoading) {
    return (
      <div className="page bill-page fade-in">
        <div className="page-intro">
          <div>
            <p className="eyebrow accent">NEW RECEIPT</p>
            <h2>Create Bill</h2>
          </div>
        </div>
        <div className="bill-grid">
          <div className="bill-editor-panel">
            <ReceiptSkeleton />
          </div>
          <div className="receipt-preview-panel">
            <ReceiptSkeleton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page bill-page fade-in">
      {/* 1. SELECTION POPUP MODAL */}
      {flowState === "popup" && (
        <div className="new-bill-popup-backdrop fade-in">
          <div className="new-bill-popup-card">
            <span className="popup-badge">New Bill Workflow</span>
            <h2>Choose how you want to create your bill</h2>
            <p className="popup-sub">Select an option to start adding items</p>

            <div className="popup-options-grid">
              <button
                type="button"
                className="popup-option-btn primary-option"
                onClick={() => {
                  fetchRecentBillItems()
                  setFlowState("existing_items")
                }}
              >
                <div className="option-icon-box">
                  <History size={22} />
                </div>
                <div className="option-text">
                  <strong>Use Existing Item</strong>
                  <small>Use items from your latest 3 bills</small>
                </div>
                <ChevronRight size={18} className="option-arrow" />
              </button>

              <button
                type="button"
                className="popup-option-btn secondary-option"
                onClick={() => setFlowState("form")}
              >
                <div className="option-icon-box accent">
                  <PlusCircle size={22} />
                </div>
                <div className="option-text">
                  <strong>Create New Bill</strong>
                  <small>Start with a fresh empty bill</small>
                </div>
                <ChevronRight size={18} className="option-arrow" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. EXISTING ITEMS SELECTION INTERFACE */}
      {flowState === "existing_items" && (
        <div className="existing-items-container fade-in">
          <div className="existing-items-header">
            <div>
              <h3>Select Items from Recent Bills</h3>
              <p>Showing deduplicated items from your latest 3 previous bills</p>
            </div>
            <button
              type="button"
              className="secondary-button small"
              onClick={() => setFlowState("form")}
            >
              <Plus size={14} /> Add New Item
            </button>
          </div>

          {loadingRecentItems ? (
            <div style={{ padding: "3rem 0", textAlign: "center" }}>
              <Spinner size={26} />
              <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.75rem" }}>
                Loading items from your last 3 bills...
              </p>
            </div>
          ) : recentItems.length === 0 ? (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "2.5rem 1.5rem", textAlign: "center", marginBottom: "1.25rem" }}>
              <PackageX size={42} style={{ color: "#cbd5e1", margin: "0 auto 0.75rem" }} />
              <h4 style={{ fontSize: "1.1rem", color: "#0f172a", margin: "0 0 0.25rem 0" }}>No previous items available</h4>
              <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "0 0 1.25rem 0" }}>
                You have no items saved in your last 3 bills yet.
              </p>
              <button
                type="button"
                className="primary-button"
                onClick={() => setFlowState("form")}
              >
                <Plus size={16} /> Add New Item
              </button>
            </div>
          ) : (
            <>
              <div className="recent-items-grid">
                {recentItems.map((item, idx) => {
                  const isSelected = selectedRecentIndices.includes(idx)
                  return (
                    <div
                      key={item.id || idx}
                      className={`recent-item-card ${isSelected ? "selected" : ""}`}
                      onClick={() => toggleRecentItemSelection(idx)}
                    >
                      <div className="item-checkbox">
                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                      </div>
                      <div className="item-details">
                        <div className="item-name">{item.name}</div>
                        <div className="item-meta">
                          {item.quantity} × ₹{item.rate}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="existing-items-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setFlowState("form")}
                >
                  + Add New Item
                </button>

                <button
                  type="button"
                  className="primary-button"
                  disabled={selectedRecentIndices.length === 0}
                  onClick={() => {
                    const chosen = selectedRecentIndices.map((idx) => recentItems[idx]).filter(Boolean)
                    if (chosen.length > 0) {
                      setItems(
                        chosen.map((itm, i) => ({
                          id: Date.now() + i,
                          name: itm.name,
                          quantity: itm.quantity,
                          rate: itm.rate
                        }))
                      )
                    }
                    setFlowState("form")
                  }}
                >
                  Add {selectedRecentIndices.length} {selectedRecentIndices.length === 1 ? "Item" : "Items"} to Bill
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Header */}
      <div className="bill-header">
        <div className="bill-header-left">
          <h2 className="bill-header-title">New Bill</h2>
          <p className="bill-header-subtitle">Add items and create a bill</p>
        </div>
      </div>

      {renderUsageInfo()}

      <div className={`bill-grid ${activeMobileTab === "preview" ? "show-mobile-preview" : "show-mobile-edit"}`}>
        {/* LEFT - Bill Editor Column */}
        <div className="bill-editor-column">
          <div className="bill-editor-panel">
            {/* Invoice Number - Top Right */}
            <div className="invoice-number-field" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginBottom: '0.85rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>
                INVOICE NO.
              </label>
              <div>
                {editingBillNumber ? (
                  <input
                    type="text"
                    value={customBillNumber}
                    onChange={(e) => setCustomBillNumber(e.target.value)}
                    onBlur={() => setEditingBillNumber(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingBillNumber(false)}
                    autoFocus
                    className="item-input"
                    style={{
                      width: '140px',
                      padding: '0.28rem 0.6rem',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      fontFamily: 'monospace, sans-serif',
                      borderRadius: '6px',
                      border: '1.5px solid #0ea5e9',
                      background: '#ffffff',
                      color: '#0f172a',
                      textAlign: 'center'
                    }}
                  />
                ) : (
                  <div 
                    onClick={() => setEditingBillNumber(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                      border: '1px solid #bae6fd',
                      borderRadius: '6px',
                      padding: '0.28rem 0.65rem',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      fontFamily: 'monospace, sans-serif',
                      color: '#0369a1',
                      boxShadow: '0 1px 2px rgba(14, 165, 233, 0.08)',
                      cursor: 'pointer',
                      letterSpacing: '0.3px',
                      userSelect: 'none',
                      maxWidth: '100%',
                      whiteSpace: 'nowrap'
                    }}
                    title="Click to edit invoice number"
                  >
                    {customBillNumber || "Auto-generated"}
                  </div>
                )}
              </div>
            </div>

            {/* Items & Services Card */}
            <div className="editor-section items-section">
              <div className="items-header">
                <span className="items-header-label">ITEMS & SERVICES</span>
                <button type="button" className="clear-all-btn" onClick={clearAllItems}>
                  Clear All
                </button>
              </div>

              <div className="items-table-labels">
                <span className="col-label col-item-name">Item Name</span>
                <span className="col-label col-qty">Qty</span>
                <span className="col-label col-rate">Rate</span>
                <span className="col-label col-total">Total</span>
                <span className="col-label col-delete"></span>
              </div>

              <div className="items-list">
                {items.map((item, index) => (
                  <div className="item-card-row" key={item.id}>
                    {/* Item Name */}
                    <div className="item-col item-col-name">
                      {user && Array.isArray(menuItems) && menuItems.length > 0 ? (
                        <div className="item-name-select-wrapper">
                          <select
                            data-testid={`bill-item-${index}-select`}
                            value={item.isSaved ? item.name : (item.name ? "__CUSTOM__" : "")}
                            onChange={(e) => {
                              const selectedVal = e.target.value
                              if (selectedVal === "__ADD_NEW__") {
                                setNewItemName("")
                                setNewItemPrice("")
                                setShowAddNewItemModal(true)
                                return
                              }
                              if (selectedVal === "" || selectedVal === "__CUSTOM__") {
                                updateItemRow(index, { isSaved: false })
                                return
                              }
                              const matched = menuItems.find(m => m.name === selectedVal)
                              if (matched) {
                                updateItemRow(index, {
                                  name: matched.name,
                                  rate: String(matched.price),
                                  isSaved: true
                                })
                              }
                            }}
                            className="item-select-input"
                          >
                            <option value="">-- Select Item --</option>
                            {menuItems.map((m) => (
                              <option key={m.id} value={m.name}>
                                {m.name}
                              </option>
                            ))}
                            {item.name && !item.isSaved && (
                              <option value="__CUSTOM__">{item.name}</option>
                            )}
                            <option value="__ADD_NEW__">+ Add New Item to Menu...</option>
                          </select>
                        </div>
                      ) : (
                        <input
                          data-testid={`bill-item-${index}-name-input`}
                          placeholder="Item name"
                          value={item.name}
                          onChange={(e) => updateItem(index, "name", e.target.value)}
                          className="item-text-input"
                          autoComplete="off"
                        />
                      )}
                    </div>

                    {/* Quantity Stepper Control (- Left, Number Middle, + Right) */}
                    <div className="item-col item-col-qty">
                      <div className="qty-stepper">
                        <button
                          type="button"
                          className="qty-btn qty-minus"
                          onClick={() => decreaseQuantity(index)}
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <div className="qty-val-container">
                          <input
                            data-testid={`bill-item-${index}-quantity-input`}
                            type="text"
                            inputMode="numeric"
                            value={item.quantity === 0 || item.quantity === "0" ? "" : item.quantity}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              let val = e.target.value.replace(/[^0-9]/g, "");
                              if (val.length > 1 && val.startsWith("0")) {
                                val = val.replace(/^0+/, "");
                              }
                              updateItem(index, "quantity", val);
                            }}
                            onBlur={() => {
                              if (!item.quantity || Number(item.quantity) <= 0) {
                                updateItem(index, "quantity", 1);
                              }
                            }}
                            className="qty-val-input"
                          />
                        </div>
                        <button
                          type="button"
                          className="qty-btn qty-plus"
                          onClick={() => increaseQuantity(index)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Rate Input */}
                    <div className="item-col item-col-rate">
                      <input
                        data-testid={`bill-item-${index}-rate-input`}
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={item.rate === 0 || item.rate === "0" ? "" : item.rate}
                        readOnly={Boolean(item.isSaved)}
                        onFocus={(e) => {
                          if (!item.isSaved) e.target.select()
                        }}
                        onChange={(e) => {
                          if (item.isSaved) return
                          let val = e.target.value.replace(/[^0-9.]/g, "");
                          const parts = val.split(".");
                          if (parts.length > 2) {
                            val = parts[0] + "." + parts.slice(1).join("");
                          }
                          if (val.length > 1 && val.startsWith("0") && !val.startsWith("0.")) {
                            val = val.replace(/^0+/, "");
                            if (val.startsWith(".")) val = "0" + val;
                          }
                          updateItem(index, "rate", val);
                        }}
                        onBlur={() => {
                          if (item.isSaved) return
                          if (item.rate) {
                            const num = parseFloat(item.rate);
                            if (isNaN(num) || num === 0) {
                              updateItem(index, "rate", "");
                            } else {
                              updateItem(index, "rate", String(num));
                            }
                          }
                        }}
                        className={`rate-input ${item.isSaved ? "read-only-rate" : ""}`}
                      />
                    </div>

                    {/* Total Amount */}
                    <div className="item-col item-col-total">
                      <span className="row-item-total">
                        {((Number(item.quantity) || 0) * (Number(item.rate) || 0)).toFixed(2)}
                      </span>
                    </div>

                    {/* Delete Button */}
                    <div className="item-col item-col-delete">
                      <button
                        type="button"
                        className="row-delete-btn"
                        onClick={() => removeItem(index)}
                        disabled={items.length <= 1}
                        title="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                data-testid="add-bill-item-button"
                className="reference-add-item-btn"
                onClick={handleAddItemClick}
              >
                <Plus size={16} /> Add Item
              </button>
            </div>

            {/* Discount & Tax Rate - Hidden on Mobile */}
            <div className="editor-section options-grid mobile-hide-field" style={{ display: 'none' }}>
              <div className="option-group">
                <label className="field-label option-field-label">
                  <span className="option-label-text">
                    <span>DISCOUNT (₹)</span>
                  </span>
                  <input
                    data-testid="bill-discount-input"
                    type="text"
                    readOnly
                    disabled
                    value={discount}
                    className="option-input"
                  />
                </label>
              </div>
              <div className="option-group">
                <label className="field-label option-field-label">
                  <span className="option-label-text">
                    <span>TAX RATE (%)</span>
                  </span>
                  <input
                    data-testid="bill-tax-input"
                    type="text"
                    readOnly
                    disabled
                    value={!isTaxEnabled ? "0" : tax}
                    className="option-input"
                  />
                </label>
              </div>
            </div>

            {/* Payment Mode Card */}
            <div className="editor-section payment-mode-card">
              <div className="payment-mode-header">PAYMENT MODE</div>
              <select
                data-testid="bill-payment-select"
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
                className="payment-mode-select"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / QR</option>
              </select>
            </div>

            {/* Total Amount Card */}
            <div className="editor-section grand-total-card">
              <span className="grand-total-label">Total Amount</span>
              <span className="grand-total-value">{money(total)}</span>
            </div>

            {error && <div className="error-message slide-up">{error}</div>}

            {saved && (
              <div className="success-message slide-up">
                <div className="success-icon">✓</div>
                <div>
                  <strong>Receipt saved successfully!</strong>
                  <span className="success-details">
                    Bill #{saved.number} · {saved.items?.length || 0} items · {saved.payment_mode}
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons: Reset, Save Bill, Print */}
            <div className="bill-actions-bar reference-actions-bar">
              <button
                data-testid="reset-bill-button"
                type="button"
                className="ref-action-btn ref-btn-reset"
                onClick={resetForm}
              >
                <X size={16} /> Reset
              </button>
              <button
                data-testid="save-bill-button"
                type="button"
                className="ref-action-btn ref-btn-save"
                onClick={saveBill}
                disabled={loading}
              >
                {loading ? (
                  <ButtonLoader text="Saving..." />
                ) : (
                  <>
                    <Save size={16} /> {!user ? "Sign up to save" : "Save Bill"}
                  </>
                )}
              </button>
              <button
                data-testid="print-receipt-button"
                type="button"
                className="ref-action-btn ref-btn-print"
                onClick={handlePrint}
                disabled={isPrinting}
              >
                {isPrinting ? (
                  <ButtonLoader text="Printing..." />
                ) : (
                  <>
                    <Printer size={16} /> Print
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT - Receipt Preview */}
        <div className="receipt-preview-panel">
          <div className="preview-header">
            <div className="preview-title-wrap">
              <h3>Receipt Preview</h3>
              <span className="preview-badge">
                {printFormat === "a4" ? "A4 Sheet" : `${printFormat} Thermal`}
              </span>
            </div>
            {/* Print Size Selection: 55mm Thermal, 80mm Thermal, A4 */}
            <div className="print-format-toggle-group" role="group" aria-label="Print Size">
              <button
                type="button"
                className={`format-toggle-btn ${printFormat === "55mm" ? "active" : ""}`}
                onClick={() => handleFormatChange("55mm")}
                title="55mm Thermal Roll (Compact POS)"
              >
                55mm Thermal
              </button>
              <button
                type="button"
                className={`format-toggle-btn ${printFormat === "80mm" ? "active" : ""}`}
                onClick={() => handleFormatChange("80mm")}
                title="80mm Thermal Roll (Standard Retail POS)"
              >
                80mm Thermal
              </button>
              <button
                type="button"
                className={`format-toggle-btn ${printFormat === "a4" ? "active" : ""}`}
                onClick={() => handleFormatChange("a4")}
                title="A4 Standard Document"
              >
                A4
              </button>
            </div>
          </div>

          {/* Template Switcher Toolbar */}
          <div className="preview-template-toolbar">
            <div className="preview-tpl-label-wrap">
              <SlidersHorizontal size={14} />
              <span>Style:</span>
              <select
                className="preview-template-select"
                value={selected?.id || ""}
                onChange={(e) => {
                  setSelectedId(e.target.value)
                  sessionStorage.setItem("slipzo-template", e.target.value)
                }}
              >
                {(Array.isArray(templates) && templates.length > 0 ? templates : BUILTIN_TEMPLATES).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.width || "58mm"})
                  </option>
                ))}
              </select>
            </div>
            <div className="preview-template-pills">
              {[
                { id: "classic", label: "Classic" },
                { id: "minimal", label: "Minimal" },
                { id: "pro", label: "Shop Pro" },
                { id: "eco", label: "Eco Print" },
                { id: "modern", label: "Modern" },
                { id: "elite", label: "Business Elite" }
              ].map((p) => {
                const isActive = templateType === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`tpl-pill-btn ${isActive ? "active" : ""}`}
                    onClick={() => {
                      const list = Array.isArray(templates) && templates.length > 0 ? templates : BUILTIN_TEMPLATES
                      const match = list.find(
                        (t) => String(t.id).toLowerCase() === p.id || String(t.name).toLowerCase().includes(p.id)
                      )
                      const targetId = match ? match.id : p.id
                      setSelectedId(targetId)
                      sessionStorage.setItem("slipzo-template", targetId)
                    }}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div
            ref={receiptRef}
            id="receipt-to-print"
            className={`receipt-preview-content format-${printFormat} tpl-style-${templateType} tpl-id-${selected?.id || "classic"}`}
          >
            {/* ========================================================================= */}
            {/* 1. CLASSIC RECEIPT STRUCTURE */}
            {/* ========================================================================= */}
            {templateType === "classic" && (
              <div className="receipt-classic-container">
                <div className="receipt-shop">
                  <div className="classic-crest">
                    {(shop?.name || "S").trim().charAt(0).toUpperCase()}
                  </div>
                  <h2 className="receipt-shop-name">
                    {cleanTextLines(shop?.name || "Classic Mart").map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))}
                  </h2>
                  {shop?.address && cleanTextLines(shop.address).length > 0 && (
                    <div className="receipt-shop-address">
                      {cleanTextLines(shop.address).map((line, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          {idx === 0 && <MapPin size={12} />} <span>{line}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {shop?.phone && (
                    <p className="receipt-shop-phone">
                      <Phone size={12} /> {shop.phone}
                    </p>
                  )}
                  {shop?.gstin && (
                    <p className="receipt-shop-phone" style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                      GSTIN: {shop.gstin}
                    </p>
                  )}
                </div>

                <div className="classic-meta-grid">
                  <div><span>INVOICE:</span> <b>#{customBillNumber || "CM-8821"}</b></div>
                  <div><span>DATE:</span> <b>{formattedDate}</b></div>
                  <div><span>COUNTER:</span> <b>POS-01</b></div>
                  <div><span>TIME:</span> <b>{formattedTime}</b></div>
                </div>

                {selectedCustomer && (
                  <div className="receipt-customer-line">
                    <span>Customer: <b>{selectedCustomer.name}</b></span>
                    {selectedCustomer.phone && <small>Ph: {selectedCustomer.phone}</small>}
                  </div>
                )}

                <div className="classic-divider-double" />

                <div className="classic-items-table">
                  <div className="receipt-items-header">
                    <span>ITEM</span>
                    <span>QTY</span>
                    <span>RATE</span>
                    <span>AMOUNT</span>
                  </div>
                  {activeItems.length > 0 ? (
                    activeItems.map((item, index) => {
                      const qty = Number(item.quantity) || 0
                      const rate = Number(item.rate) || 0
                      const amount = qty * rate
                      return (
                        <div className="receipt-item-row" key={item.id || index}>
                          <span className="receipt-item-name">{item.name}</span>
                          <span className="receipt-item-qty">{qty}</span>
                          <span className="receipt-item-rate">{money(rate)}</span>
                          <span className="receipt-item-amount">{money(amount)}</span>
                        </div>
                      )
                    })
                  ) : (
                    <div className="receipt-empty-items">
                      <p>No items added</p>
                      <small>Add items to see preview</small>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b', padding: '0.2rem 0.4rem', borderBottom: '1px solid #e2e8f0', marginBottom: '0.4rem' }}>
                  <span>Items: <b>{activeItems.length}</b></span>
                  <span>Total Units: <b>{totalUnits}</b></span>
                </div>

                <div className="receipt-totals">
                  <div className="receipt-total-row">
                    <span>Subtotal</span>
                    <span>{money(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="receipt-total-row discount">
                      <span>Discount</span>
                      <span>-{money(discountAmount)}</span>
                    </div>
                  )}
                  {isTaxEnabled && taxRate > 0 && (
                    <div className="classic-gst-box">
                      <div className="gst-line">
                        <span>Taxable Value</span>
                        <span>{money(taxable)}</span>
                      </div>
                      <div className="gst-line">
                        <span>CGST ({taxRate / 2}%)</span>
                        <span>{money(taxAmount / 2)}</span>
                      </div>
                      <div className="gst-line">
                        <span>SGST ({taxRate / 2}%)</span>
                        <span>{money(taxAmount / 2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="classic-grand-banner">
                  <span>GRAND TOTAL</span>
                  <span>{money(total)}</span>
                </div>

                <div className="receipt-payment" style={{ padding: '0.3rem 0', fontSize: '0.74rem' }}>
                  <span>Payment Mode:</span>
                  <b>{payment}</b>
                </div>

                <div className="receipt-barcode-wrap">
                  <div className="receipt-barcode-bars">|||| ||| ||||| || |||||| ||</div>
                  <div className="receipt-barcode-num">*{customBillNumber || "SLP-DRAFT"}*</div>
                </div>

                <div className="classic-policy-footer">
                  <p>{selected?.footer || "Thank you for shopping with us! Goods once sold can be exchanged within 7 days with original invoice."}</p>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 2. MINIMAL CLEAN BILL STRUCTURE */}
            {/* ========================================================================= */}
            {templateType === "minimal" && (
              <div className="receipt-minimal-container">
                <div className="receipt-shop">
                  <div className="minimal-dot-logo">S</div>
                  <h2 className="receipt-shop-name" style={{ fontSize: '1.15rem', letterSpacing: '-0.3px' }}>
                    {shop?.name || "Minimal Cafe"}
                  </h2>
                  <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '0.2rem 0 0' }}>
                    {[shop?.phone, shop?.address].filter(Boolean).join(" · ") || "Specialty Store"}
                  </p>
                </div>

                <div className="minimal-meta-clean">
                  <span>#{customBillNumber || "INV-102"}</span>
                  <span>{formattedDate} {formattedTime}</span>
                </div>

                {selectedCustomer && (
                  <div className="receipt-customer-line" style={{ border: 'none', padding: '0.25rem 0' }}>
                    <span>Customer: <b>{selectedCustomer.name}</b></span>
                  </div>
                )}

                <div style={{ margin: '0.6rem 0' }}>
                  {activeItems.length > 0 ? (
                    activeItems.map((item, index) => {
                      const qty = Number(item.quantity) || 0
                      const rate = Number(item.rate) || 0
                      return (
                        <div className="minimal-item-entry" key={item.id || index}>
                          <div className="minimal-item-info">
                            <span className="minimal-item-title">{item.name}</span>
                            <span className="minimal-item-sub">{qty} × {money(rate)}</span>
                          </div>
                          <span className="minimal-item-price">{money(qty * rate)}</span>
                        </div>
                      )
                    })
                  ) : (
                    <div className="receipt-empty-items">
                      <p>No items added</p>
                    </div>
                  )}
                </div>

                {discountAmount > 0 && (
                  <div className="receipt-total-row discount" style={{ padding: '0.2rem 0' }}>
                    <span>Discount</span>
                    <span>-{money(discountAmount)}</span>
                  </div>
                )}
                {isTaxEnabled && taxRate > 0 && (
                  <div className="receipt-total-row" style={{ padding: '0.2rem 0' }}>
                    <span>Tax ({taxRate}%)</span>
                    <span>{money(taxAmount)}</span>
                  </div>
                )}

                <div className="minimal-total-hero">
                  <span>TOTAL AMOUNT</span>
                  <span>{money(total)}</span>
                </div>

                <div style={{ textAlign: 'center', margin: '0.6rem 0 0.3rem' }}>
                  <div className="minimal-paid-stamp">PAID VIA {payment?.toUpperCase()}</div>
                </div>

                <p style={{ textAlign: 'center', fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.6rem', fontStyle: 'italic' }}>
                  {selected?.footer || "thank you for visiting · please come again"}
                </p>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 3. SHOP PRO (RETAIL POS) STRUCTURE */}
            {/* ========================================================================= */}
            {templateType === "pro" && (
              <div className="receipt-pro-container">
                <div className="pro-store-ribbon" style={{ background: "#2563eb", color: "#ffffff", padding: "0.55rem 0.75rem", borderRadius: "6px", textAlign: "center", marginBottom: "0.5rem" }}>
                  <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, letterSpacing: "0.3px" }}>{shop?.name || "RETAIL STORE"}</h2>
                  <p style={{ fontSize: "0.65rem", margin: "0.15rem 0 0", opacity: 0.9 }}>RETAIL POS RECEIPT</p>
                </div>

                <div style={{ textAlign: 'center', fontSize: '0.68rem', color: '#475569', marginBottom: '0.5rem' }}>
                  {shop?.address && <div>{shop.address}</div>}
                  {shop?.phone && <div>Tel: {shop.phone}</div>}
                  {shop?.gstin && <div style={{ fontWeight: 700, color: "#0f172a" }}>GSTIN: {shop.gstin}</div>}
                </div>

                <div className="pro-meta-bar" style={{ display: "flex", justifyContent: "space-between", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "0.35rem 0.6rem", fontSize: "0.68rem", margin: "0.5rem 0" }}>
                  <div><span>BILL NO:</span> <b>#{customBillNumber || "POS-4401"}</b></div>
                  <div><span>DATE:</span> <b>{formattedDate}</b></div>
                  <div><span>PAY:</span> <b>{payment}</b></div>
                </div>

                {selectedCustomer && (
                  <div className="receipt-customer-line" style={{ background: '#f8fafc', padding: '0.35rem 0.5rem', borderRadius: '4px', margin: '0.4rem 0', fontSize: '0.72rem' }}>
                    <span>Customer: <b>{selectedCustomer.name}</b></span>
                    {selectedCustomer.phone && <small style={{ color: '#64748b', marginLeft: '0.5rem' }}>Ph: {selectedCustomer.phone}</small>}
                  </div>
                )}

                <div className="receipt-items" style={{ margin: "0.6rem 0" }}>
                  <div className="receipt-items-header" style={{ borderBottom: '2px solid #2563eb', display: 'grid', gridTemplateColumns: '2.2fr 0.5fr 1fr 1fr', padding: '0.3rem 0', fontSize: '0.7rem', fontWeight: 800, color: '#1e293b' }}>
                    <span>Item Description</span>
                    <span style={{ textAlign: 'center' }}>Qty</span>
                    <span style={{ textAlign: 'right' }}>Rate</span>
                    <span style={{ textAlign: 'right' }}>Amount</span>
                  </div>
                  {activeItems.length > 0 ? (
                    activeItems.map((item, index) => {
                      const qty = Number(item.quantity) || 0
                      const rate = Number(item.rate) || 0
                      return (
                        <div className="receipt-item-row" key={item.id || index} style={{ display: 'grid', gridTemplateColumns: '2.2fr 0.5fr 1fr 1fr', padding: '0.35rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.72rem' }}>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.name}</span>
                          <span style={{ textAlign: 'center', color: '#475569' }}>{qty}</span>
                          <span style={{ textAlign: 'right', color: '#475569' }}>{money(rate)}</span>
                          <span style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{money(qty * rate)}</span>
                        </div>
                      )
                    })
                  ) : (
                    <div className="receipt-empty-items">
                      <p>No items added</p>
                    </div>
                  )}
                </div>

                <div className="receipt-totals" style={{ fontSize: '0.74rem', margin: '0.5rem 0' }}>
                  <div className="receipt-total-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0', color: '#475569' }}>
                    <span>Gross Subtotal ({totalUnits} items)</span>
                    <span>{money(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="receipt-total-row discount" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0', color: '#059669', fontWeight: 700 }}>
                      <span>Discount</span>
                      <span>-{money(discountAmount)}</span>
                    </div>
                  )}
                  {isTaxEnabled && taxRate > 0 && (
                    <div className="receipt-total-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0', color: '#475569' }}>
                      <span>GST ({taxRate}%)</span>
                      <span>{money(taxAmount)}</span>
                    </div>
                  )}
                  <div className="receipt-grand-total" style={{ borderTop: '2px solid #2563eb', color: '#1d4ed8', display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', fontWeight: 900, fontSize: '0.95rem', marginTop: '0.3rem' }}>
                    <span>NET PAYABLE</span>
                    <span>{money(total)}</span>
                  </div>
                </div>

                <div className="receipt-footer" style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.5rem', marginTop: '0.5rem', textAlign: 'center' }}>
                  <p className="receipt-thanks" style={{ fontSize: '0.68rem', color: '#64748b', margin: 0 }}>
                    {selected?.footer || "Thank you for shopping with us! Please come again."}
                  </p>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 4. ECO PRINT (THERMAL MONOSPACE) STRUCTURE */}
            {/* ========================================================================= */}
            {templateType === "eco" && (
              <div className="receipt-eco-container" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                <div className="eco-sawtooth-top" />
                <div className="eco-header-box" style={{ textAlign: "center", borderBottom: "1px dashed #0d9488", paddingBottom: "0.4rem", marginBottom: "0.4rem" }}>
                  <h2 style={{ fontSize: "0.95rem", fontWeight: 900, letterSpacing: "0.5px", margin: 0 }}>
                    *** {shop?.name?.toUpperCase() || "THERMAL SHOP"} ***
                  </h2>
                  <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '0.15rem' }}>
                    {shop?.address && <div>{shop.address}</div>}
                    {shop?.phone && <div>TEL: {shop.phone}</div>}
                    {shop?.gstin && <div>GSTIN: {shop.gstin}</div>}
                  </div>
                </div>

                <div style={{ borderTop: '1px dashed #94a3b8', margin: '0.35rem 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 700, margin: '0.3rem 0' }}>
                  <span>BILL: #{customBillNumber || "KJ-7734"}</span>
                  <span>{formattedDate} {formattedTime}</span>
                </div>

                <div style={{ borderTop: '1px dashed #94a3b8', margin: '0.35rem 0' }} />

                <div className="eco-items-mono" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', margin: '0.4rem 0' }}>
                  {activeItems.length > 0 ? (
                    activeItems.map((item, index) => {
                      const qty = Number(item.quantity) || 0
                      const rate = Number(item.rate) || 0
                      return (
                        <div className="eco-item-row-mono" key={item.id || index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700 }}>
                          <span>{qty}x {item.name}</span>
                          <span>{money(qty * rate)}</span>
                        </div>
                      )
                    })
                  ) : (
                    <div style={{ textAlign: 'center', fontSize: '0.68rem', padding: '0.5rem 0' }}>No items added</div>
                  )}
                </div>

                <div style={{ borderTop: '1px dashed #94a3b8', margin: '0.35rem 0' }} />

                <div className="receipt-totals" style={{ padding: 0, fontSize: '0.7rem', margin: '0.35rem 0' }}>
                  <div className="receipt-total-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.1rem 0' }}>
                    <span>SUBTOTAL:</span>
                    <span>{money(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="receipt-total-row discount" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.1rem 0', color: '#dc2626' }}>
                      <span>DISCOUNT:</span>
                      <span>-{money(discountAmount)}</span>
                    </div>
                  )}
                  {isTaxEnabled && taxRate > 0 && (
                    <div className="receipt-total-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.1rem 0' }}>
                      <span>TAX ({taxRate}%):</span>
                      <span>{money(taxAmount)}</span>
                    </div>
                  )}
                </div>

                <div className="eco-total-box" style={{ border: "2px solid #0f172a", padding: "0.4rem 0.6rem", display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: "0.92rem", margin: "0.45rem 0" }}>
                  <span>TOTAL:</span>
                  <span>{money(total)}</span>
                </div>

                <div className="receipt-payment" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", padding: "0.15rem 0" }}>
                  <span>PAID VIA:</span>
                  <b>{payment?.toUpperCase()}</b>
                </div>

                <div style={{ borderTop: '1px dashed #94a3b8', margin: '0.45rem 0' }} />

                <div style={{ textAlign: "center", fontSize: "0.65rem", color: "#475569", margin: "0.3rem 0" }}>
                  {selected?.footer || "Thank you for shopping with us!"}
                </div>

                <div className="eco-sawtooth-bottom" />
              </div>
            )}

            {/* ========================================================================= */}
            {/* 5. MODERN SHOP (BOUTIQUE & CAFE) STRUCTURE */}
            {/* ========================================================================= */}
            {templateType === "modern" && (
              <div className="receipt-modern-container">
                <div className="receipt-shop" style={{ textAlign: "center", border: 'none', paddingBottom: '0.4rem' }}>
                  <h2 className="receipt-shop-name" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.15rem' }}>
                    {shop?.name || "Modern Shop"}
                  </h2>
                  {shop?.address && (
                    <div style={{ fontSize: '0.7rem', color: '#64748b', margin: '0.15rem 0' }}>
                      {shop.address}
                    </div>
                  )}
                  {shop?.phone && (
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      Tel: {shop.phone}
                    </div>
                  )}
                  {shop?.gstin && (
                    <div style={{ fontSize: '0.68rem', color: '#0ea5e9', fontWeight: 600, marginTop: '0.1rem' }}>
                      GSTIN: {shop.gstin}
                    </div>
                  )}
                </div>

                {selectedCustomer && (
                  <div className="receipt-customer-line" style={{ display: "flex", justifyContent: "space-between", background: '#f8fafc', padding: '0.35rem 0.5rem', borderRadius: '6px', margin: '0.35rem 0', fontSize: '0.7rem' }}>
                    <span>Customer: <b>{selectedCustomer.name}</b></span>
                    {selectedCustomer.phone && <small style={{ color: '#64748b' }}>{selectedCustomer.phone}</small>}
                  </div>
                )}

                <div className="receipt-meta" style={{ display: "flex", justifyContent: "space-between", borderBottom: '1px solid #f1f5f9', padding: '0.4rem 0', fontSize: '0.7rem', color: '#64748b' }}>
                  <span>Invoice: <b>#{customBillNumber || "INV-2026"}</b></span>
                  <span>{formattedDate} {formattedTime}</span>
                </div>

                <div style={{ margin: '0.5rem 0' }}>
                  {activeItems.length > 0 ? (
                    activeItems.map((item, index) => {
                      const qty = Number(item.quantity) || 0
                      const rate = Number(item.rate) || 0
                      return (
                        <div className="modern-item-card" key={item.id || index} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.45rem 0.65rem", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                          <div className="item-meta">
                            <span className="item-name" style={{ fontWeight: 700, fontSize: "0.78rem", color: "#0f172a" }}>{item.name}</span>
                            <small className="item-details" style={{ display: 'block', fontSize: "0.68rem", color: "#64748b" }}>{qty} qty @ {money(rate)}</small>
                          </div>
                          <span className="item-amt-badge" style={{ background: "#e0f2fe", color: "#0284c7", fontWeight: 800, fontSize: "0.78rem", padding: "0.2rem 0.5rem", borderRadius: "6px" }}>{money(qty * rate)}</span>
                        </div>
                      )
                    })
                  ) : (
                    <div className="receipt-empty-items">
                      <p>No items added</p>
                    </div>
                  )}
                </div>

                <div className="receipt-totals" style={{ background: '#f8fafc', padding: '0.65rem', borderRadius: '8px', fontSize: '0.74rem' }}>
                  <div className="receipt-total-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0', color: '#475569' }}>
                    <span>Subtotal</span>
                    <span>{money(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="receipt-total-row discount" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0', color: '#059669', fontWeight: 700 }}>
                      <span>Discount</span>
                      <span>-{money(discountAmount)}</span>
                    </div>
                  )}
                  {isTaxEnabled && taxRate > 0 && (
                    <div className="receipt-total-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0', color: '#475569' }}>
                      <span>GST ({taxRate}%)</span>
                      <span>{money(taxAmount)}</span>
                    </div>
                  )}
                  <div className="receipt-grand-total" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '0.4rem', color: '#0ea5e9', fontWeight: 800, fontSize: '0.95rem', marginTop: '0.25rem' }}>
                    <span>Amount Due</span>
                    <span>{money(total)}</span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.7rem", padding: "0.4rem 0.2rem", color: "#64748b" }}>
                  <span>Payment Method</span>
                  <b style={{ color: "#0f172a" }}>{payment}</b>
                </div>

                <p style={{ textAlign: 'center', fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.6rem', lineHeight: 1.4 }}>
                  {selected?.footer || "Thank you for your visit! Please come again."}
                </p>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 6. BUSINESS ELITE (FORMAL TAX INVOICE) STRUCTURE */}
            {/* ========================================================================= */}
            {templateType === "elite" && (
              <div className="receipt-elite-container">
                <div className="elite-tax-banner" style={{ background: "#0284c7", color: "#ffffff", padding: "0.45rem 0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 800, fontSize: "0.78rem", letterSpacing: "0.5px", borderRadius: "4px", marginBottom: "0.65rem" }}>
                  <span>TAX INVOICE</span>
                  <span>ORIGINAL FOR RECIPIENT</span>
                </div>

                <div className="elite-party-card" style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "0.45rem 0.6rem", background: "#f8fafc", fontSize: "0.7rem", marginBottom: "0.5rem" }}>
                  <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.2rem" }}>Supplier / Seller</div>
                  <h4 style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.15rem" }}>{shop?.name || "Techno Computers"}</h4>
                  <p style={{ color: "#475569", margin: "0.05rem 0", fontSize: "0.68rem" }}>{shop?.address || "Main Street, Commercial Hub"}</p>
                  <p style={{ color: "#475569", margin: "0.05rem 0", fontSize: "0.68rem" }}>Tel: {shop?.phone || "N/A"}</p>
                  {shop?.gstin && <p style={{ color: "#0f172a", fontWeight: 700, margin: "0.05rem 0", fontSize: "0.68rem" }}>GSTIN: {shop.gstin}</p>}
                </div>

                <div className="classic-meta-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", fontSize: "0.68rem", background: "#f8fafc", padding: "0.35rem 0.5rem", borderRadius: "4px", margin: "0.4rem 0" }}>
                  <div><span style={{ color: "#64748b" }}>Invoice No:</span> <b>#{customBillNumber || "TC-INV-904"}</b></div>
                  <div><span style={{ color: "#64748b" }}>Date:</span> <b>{formattedDate}</b></div>
                  <div><span style={{ color: "#64748b" }}>Payment:</span> <b>{payment}</b></div>
                  <div><span style={{ color: "#64748b" }}>Items:</span> <b>{activeItems.length}</b></div>
                </div>

                {selectedCustomer && (
                  <div style={{ fontSize: "0.68rem", color: "#475569", background: "#f8fafc", padding: "0.3rem 0.5rem", borderRadius: "4px", marginBottom: "0.4rem" }}>
                    Billed To: <b>{selectedCustomer.name}</b> {selectedCustomer.phone ? `(${selectedCustomer.phone})` : ""}
                  </div>
                )}

                <div className="classic-items-table" style={{ margin: "0.5rem 0" }}>
                  <div className="receipt-items-header" style={{ display: "grid", gridTemplateColumns: "0.4fr 2.2fr 0.6fr 1fr 1fr", gap: "4px", fontSize: "0.68rem", fontWeight: 800, borderBottom: "1px solid #cbd5e1", paddingBottom: "0.3rem" }}>
                    <span>#</span>
                    <span>Description</span>
                    <span style={{ textAlign: "center" }}>Qty</span>
                    <span style={{ textAlign: "right" }}>Rate</span>
                    <span style={{ textAlign: "right" }}>Amount</span>
                  </div>
                  {activeItems.length > 0 ? (
                    activeItems.map((item, index) => {
                      const qty = Number(item.quantity) || 0
                      const rate = Number(item.rate) || 0
                      const amount = qty * rate
                      return (
                        <div className="receipt-item-row" key={item.id || index} style={{ display: "grid", gridTemplateColumns: "0.4fr 2.2fr 0.6fr 1fr 1fr", gap: "4px", fontSize: "0.7rem", padding: "0.3rem 0", borderBottom: "1px solid #f1f5f9" }}>
                          <span>{index + 1}</span>
                          <span style={{ fontWeight: 600 }}>{item.name}</span>
                          <span style={{ textAlign: "center" }}>{qty}</span>
                          <span style={{ textAlign: "right" }}>{money(rate)}</span>
                          <span style={{ textAlign: "right", fontWeight: 700 }}>{money(amount)}</span>
                        </div>
                      )
                    })
                  ) : (
                    <div className="receipt-empty-items">
                      <p>No items added</p>
                    </div>
                  )}
                </div>

                {isTaxEnabled && taxRate > 0 && (
                  <table className="elite-tax-analysis-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.68rem", margin: "0.5rem 0", border: "1px solid #cbd5e1" }}>
                    <thead>
                      <tr style={{ background: "#f1f5f9" }}>
                        <th style={{ padding: "0.3rem", border: "1px solid #cbd5e1", textAlign: "left" }}>Taxable Amt</th>
                        <th style={{ padding: "0.3rem", border: "1px solid #cbd5e1", textAlign: "right" }}>CGST ({taxRate / 2}%)</th>
                        <th style={{ padding: "0.3rem", border: "1px solid #cbd5e1", textAlign: "right" }}>SGST ({taxRate / 2}%)</th>
                        <th style={{ padding: "0.3rem", border: "1px solid #cbd5e1", textAlign: "right" }}>Total Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: "0.3rem", border: "1px solid #e2e8f0" }}>{money(taxable)}</td>
                        <td style={{ padding: "0.3rem", border: "1px solid #e2e8f0", textAlign: "right" }}>{money(taxAmount / 2)}</td>
                        <td style={{ padding: "0.3rem", border: "1px solid #e2e8f0", textAlign: "right" }}>{money(taxAmount / 2)}</td>
                        <td style={{ padding: "0.3rem", border: "1px solid #e2e8f0", textAlign: "right", fontWeight: 700 }}>{money(taxAmount)}</td>
                      </tr>
                    </tbody>
                  </table>
                )}

                <div className="receipt-totals" style={{ fontSize: "0.74rem", margin: "0.5rem 0" }}>
                  <div className="receipt-total-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0' }}>
                    <span>Subtotal</span>
                    <span>{money(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="receipt-total-row discount" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0', color: '#dc2626' }}>
                      <span>Discount</span>
                      <span>-{money(discountAmount)}</span>
                    </div>
                  )}
                  {isTaxEnabled && taxRate > 0 && (
                    <div className="receipt-total-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0', color: '#475569' }}>
                      <span>GST Output ({taxRate}%)</span>
                      <span>{money(taxAmount)}</span>
                    </div>
                  )}
                  <div className="receipt-grand-total" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #0284c7', color: '#0284c7', padding: '0.45rem 0', fontWeight: 900, fontSize: '0.95rem', marginTop: '0.25rem' }}>
                    <span>TOTAL INVOICE VALUE</span>
                    <span>{money(total)}</span>
                  </div>
                </div>

                <div className="receipt-barcode-wrap" style={{ textAlign: "center", margin: "0.5rem 0 0.35rem" }}>
                  <div className="receipt-barcode-bars" style={{ letterSpacing: "3px", fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>|||| ||| ||||| || |||||| ||</div>
                  <div className="receipt-barcode-num" style={{ fontSize: "0.65rem", color: "#64748b" }}>*{customBillNumber || "TC-INV-904"}*</div>
                </div>

                <p style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.45rem', textAlign: 'center', lineHeight: 1.3, borderTop: '1px dashed #cbd5e1', paddingTop: '0.45rem' }}>
                  {selected?.footer || "Thank you for your business. Terms & conditions apply."}
                </p>
              </div>
            )}
          </div>

          {/* Quick Actions in Preview */}
          <div className="preview-actions">
            <button className="preview-action-button" onClick={handlePrint} disabled={isPrinting}>
              <Printer size={16} /> {isPrinting ? "Printing..." : "Print Receipt"}
            </button>
            <button
              className="preview-action-button secondary"
              onClick={() => (user ? setView("history") : requireAuth?.("history"))}
            >
              View History
            </button>
          </div>
        </div>
      </div>



      {/* Quick Add Customer Modal */}
      {showQuickCustomerModal && (
        <div className="modal-backdrop fade-in" onClick={() => setShowQuickCustomerModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Quick Add Customer</h3>
              <button className="modal-close-btn" onClick={() => setShowQuickCustomerModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleQuickAddCustomer} className="modal-form">
              <div className="form-group">
                <label>
                  Customer Name *
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Suman Gupta"
                    value={quickCustomerForm.name}
                    onChange={(e) =>
                      setQuickCustomerForm({ ...quickCustomerForm, name: e.target.value })
                    }
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  Phone Number
                  <input
                    type="tel"
                    placeholder="98765 43210"
                    value={quickCustomerForm.phone}
                    onChange={(e) =>
                      setQuickCustomerForm({ ...quickCustomerForm, phone: e.target.value })
                    }
                  />
                </label>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowQuickCustomerModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={quickCustomerLoading}>
                  {quickCustomerLoading ? <ButtonLoader text="Saving..." /> : "Add & Select"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Thermal Print Setup & Adjustment Modal */}
      <PrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        onPrinted={handlePrintComplete}
        defaultWidth={printFormat}
        elementId="receipt-to-print"
        user={user}
      />

      {/* Saved Shop Items Picker Modal */}
      {showItemPickerModal && (
        <div
          className="modal-backdrop fade-in"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem"
          }}
          onClick={() => setShowItemPickerModal(false)}
        >
          <div
            className="modal-card scale-in"
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "460px",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#f8fafc"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#e0f2fe", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Utensils size={18} />
                </div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>Select Saved Shop Item</h3>
              </div>
              <button
                onClick={() => setShowItemPickerModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "1.25rem 1.5rem", flex: 1, overflowY: "auto" }}>
              {/* Search Bar */}
              <div style={{ position: "relative", marginBottom: "1rem" }}>
                <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                <input
                  type="text"
                  placeholder="Search shop items..."
                  value={itemPickerSearch}
                  onChange={(e) => setItemPickerSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.8rem 0.6rem 34px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.9rem",
                    outline: "none"
                  }}
                  autoFocus
                />
              </div>

              {/* List of Saved Menu Items */}
              {menuItems.filter(m => (m.name || "").toLowerCase().includes(itemPickerSearch.trim().toLowerCase())).length === 0 ? (
                <div style={{ textAlign: "center", padding: "1.5rem 1rem", color: "#64748b", fontSize: "0.88rem" }}>
                  No saved items matching "{itemPickerSearch}".
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                  {menuItems
                    .filter(m => (m.name || "").toLowerCase().includes(itemPickerSearch.trim().toLowerCase()))
                    .map((menuItem) => (
                      <button
                        key={menuItem.id}
                        type="button"
                        onClick={() => handleSelectMenuItem(menuItem)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.75rem 1rem",
                          borderRadius: "10px",
                          border: "1px solid #e2e8f0",
                          background: "#ffffff",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.15s ease"
                        }}
                        className="table-row-hover"
                      >
                        <span style={{ fontWeight: "600", color: "#0f172a", fontSize: "0.92rem" }}>
                          {menuItem.name}
                        </span>
                        <span style={{ fontWeight: "700", color: "#0ea5e9", fontSize: "0.95rem" }}>
                          {money(menuItem.price)}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "1rem 1.5rem",
                background: "#f8fafc",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <button
                type="button"
                className="ghost-button small"
                onClick={() => {
                  setShowItemPickerModal(false)
                  addItem()
                }}
              >
                Add Blank Line
              </button>
              <button
                type="button"
                className="primary-button small"
                onClick={() => {
                  setShowItemPickerModal(false)
                  setNewItemName("")
                  setNewItemPrice("")
                  setShowAddNewItemModal(true)
                }}
              >
                <Plus size={14} /> Add New Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Item Modal */}
      {showAddNewItemModal && (
        <div
          className="modal-backdrop fade-in"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
            zIndex: 1110,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem"
          }}
          onClick={() => setShowAddNewItemModal(false)}
        >
          <div
            className="modal-card scale-in"
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "420px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#0f172a" }}>Add New Item</h3>
              <button onClick={() => setShowAddNewItemModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveNewItemFromBill} style={{ padding: "1.25rem 1.5rem" }}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "700", color: "#475569", marginBottom: "0.3rem" }}>Item Name *</label>
                <input
                  type="text"
                  placeholder="Item name"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  style={{ width: "100%", padding: "0.65rem 0.8rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none" }}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "700", color: "#475569", marginBottom: "0.3rem" }}>Price / Rate (₹) *</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  style={{ width: "100%", padding: "0.65rem 0.8rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none" }}
                />
              </div>

              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                <button type="button" className="secondary-button" onClick={() => setShowAddNewItemModal(false)} disabled={newItemSaving}>Cancel</button>
                <button type="submit" className="primary-button" disabled={newItemSaving}>
                  {newItemSaving ? <ButtonLoader text="Saving..." /> : "Add to Bill & Save to Menu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Scoped Responsive Fix for Saved Item Dropdown Overflow */}
      <style>{`
        @media (max-width: 768px) {
          .bill-page .bill-editor-column,
          .bill-page .bill-editor-panel,
          .bill-page .editor-section,
          .bill-page .items-section,
          .bill-page .items-list,
          .bill-page .item-card,
          .bill-page .item-row,
          .bill-page .item-field,
          .bill-page .item-name-field {
            min-width: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
          }

          .bill-page .option-select {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            display: block !important;
          }

          .bill-page .option-select option {
            max-width: 100% !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: normal !important;
            word-break: break-word !important;
          }

          .bill-page .option-group .option-sub-label-hidden,
          .bill-page .option-group .option-sub-label[style*="visibility: hidden"],
          .bill-page .option-group .option-sub-label[style*="hidden"] {
            display: none !important;
          }

          .bill-page .option-label-text {
            min-height: auto !important;
          }

          .bill-page .option-field-label {
            gap: 0.25rem !important;
          }
        }
      `}</style>
    </div>
  )
}