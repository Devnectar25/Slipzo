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
  } else {
    return `${cleanPrefix}-${dateStr}-${seqStr}`
  }
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

  const [templates, setTemplates] = useState(() => {
    if (Array.isArray(cachedTemplates) && cachedTemplates.length > 0) return cachedTemplates
    return user ? [] : GUEST_TEMPLATES
  })
  const [selectedId, setSelectedId] = useState(() => sessionStorage.getItem("slipzo-template") || (cachedTemplates?.[0]?.id || ""))
  const [customers, setCustomers] = useState(() => getCachedData("/customers") || [])
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
  const [menuItems, setMenuItems] = useState(() => getCachedData("/menu") || [])
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
      } catch (_) {}
    }
    return "80mm"
  })

  const handleFormatChange = (fmt) => {
    setPrintFormat(fmt)
    const saved = localStorage.getItem("slipzo_print_settings")
    let settings = {}
    if (saved) {
      try { settings = JSON.parse(saved) } catch (_) {}
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

        let menuItemsList = Array.isArray(menuData) && menuData.length > 0 ? menuData : getStoredMenuItems(user)
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
    if (user && Array.isArray(menuItems) && menuItems.length > 0) {
      setItemPickerSearch("")
      setShowItemPickerModal(true)
    } else if (user) {
      setNewItemName("")
      setNewItemPrice("")
      setShowAddNewItemModal(true)
    } else {
      addItem()
    }
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
    const currentQuota = getActivePlanDetails(userKey)
    if (currentQuota && currentQuota.printsRemaining <= 0) {
      const msg = "⚠️ Print quota limit reached. You have 0 prints remaining."
      setError(msg)
      toastError(msg)
      Swal.fire({
        title: "Print Quota Reached",
        text: "You have 0 prints remaining in your subscription balance. Please purchase a plan to add print credits and continue creating bills.",
        icon: "warning",
        confirmButtonText: "View Pricing Plans",
        confirmButtonColor: "#0ea5e9"
      }).then(() => {
        setView("pricing")
      })
      return
    }

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
      if (msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("0 prints")) {
        Swal.fire({
          title: "Print Quota Limit Reached",
          text: msg,
          icon: "warning",
          confirmButtonText: "View Pricing Plans",
          confirmButtonColor: "#0ea5e9"
        }).then(() => {
          setView("pricing")
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    const userKey = user?.email || user?.id
    if (!canPrintFree(userKey)) {
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
      return
    }

    setShowPrintModal(true)
  }

  const handlePrintComplete = () => {
    if (selected?.id) {
      incrementTemplatePrint(selected.id)
    }
    const remaining = getRemainingFreePrints()
    if (remaining <= 0) {
      const msg = "⚠️ You have used all prints in your quota!"
      if (toastError) toastError(msg)
      Swal.fire({
        title: "Print Quota Exhausted",
        text: "You have 0 prints remaining in your subscription. Please top up your print quota to continue printing.",
        icon: "warning",
        confirmButtonText: "Explore Plans",
        confirmButtonColor: "#0ea5e9"
      }).then(() => {
        setView("pricing")
      })
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
          <p className="eyebrow accent">NEW RECEIPT</p>
          <h2>Create Bill</h2>
          <p className="subtle">Add items and generate a professional receipt</p>
        </div>
      </div>

      {renderUsageInfo()}

      <div className={`bill-grid ${activeMobileTab === "preview" ? "show-mobile-preview" : "show-mobile-edit"}`}>
        {/* LEFT - Bill Editor Column */}
        <div className="bill-editor-column">
          <div className="bill-editor-panel">
            {/* Top Section: Compact Top-Right Invoice Number */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
              {/* Compact Top-Right Invoice Number */}
              <div className="compact-invoice-container" style={{ flexShrink: 0, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  INVOICE NO.
                </span>
                {editingBillNumber ? (
                  <input
                    type="text"
                    className="inline-bill-num-input"
                    value={customBillNumber}
                    onChange={(e) => setCustomBillNumber(e.target.value)}
                    onBlur={() => setEditingBillNumber(false)}
                    onKeyDown={(e) => { if (e.key === "Enter") setEditingBillNumber(false) }}
                    autoFocus
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', fontWeight: '700', borderRadius: '6px', border: '1.5px solid #0284c7', maxWidth: '140px', textAlign: 'right', outline: 'none' }}
                  />
                ) : (
                  <button
                    type="button"
                    className="compact-invoice-btn"
                    onClick={() => setEditingBillNumber(true)}
                    title="Click to edit invoice number"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.25rem 0.55rem',
                      background: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      borderRadius: '6px',
                      color: '#0284c7',
                      fontWeight: '700',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Hash size={12} style={{ color: '#0284c7' }} />
                    <span>{customBillNumber || "SLP-1001"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Customer Section - Text Input */}
            <div className="editor-section" style={{ marginBottom: '1.5rem' }}>
              <label className="field-label">
                <span>CUSTOMER (OPTIONAL)</span>
                <div style={{ position: 'relative', marginTop: '0.35rem' }}>
                  <input
                    type="text"
                    placeholder="Enter customer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="item-input"
                    style={{ width: '100%', paddingRight: customerName ? '32px' : '0.8rem' }}
                  />
                  {customerName && (
                    <button
                      type="button"
                      onClick={() => setCustomerName("")}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                      title="Clear customer name"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </label>
            </div>

          {/* Items Section */}
          <div className="editor-section items-section">
            <div className="items-header">
              <span className="items-header-label">Items & Services</span>
              <button className="ghost-button small" onClick={clearAllItems}>
                Clear all
              </button>
            </div>

            <div className="items-list">
              {items.map((item, index) => (
                <div className="item-card" key={item.id}>
                  <div className="item-row">
                    <div className="item-field item-name-field" style={{ minWidth: 0, maxWidth: "100%", width: "100%", boxSizing: "border-box" }}>
                      {user && Array.isArray(menuItems) && menuItems.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, maxWidth: '100%', width: '100%', boxSizing: 'border-box' }}>
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
                            className="item-input option-select"
                            style={{
                              fontSize: '0.88rem',
                              fontWeight: item.isSaved ? '600' : '400',
                              background: item.isSaved ? '#f0f9ff' : '#ffffff',
                              borderColor: item.isSaved ? '#0ea5e9' : '#e2e8f0',
                              width: '100%',
                              maxWidth: '100%',
                              minWidth: 0,
                              boxSizing: 'border-box',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden'
                            }}
                          >
                            <option value="">-- Select Saved Shop Item --</option>
                            {menuItems.map((m) => (
                              <option key={m.id} value={m.name}>
                                {m.name} — ₹{m.price}
                              </option>
                            ))}
                            {item.name && !item.isSaved && (
                              <option value="__CUSTOM__">Custom: {item.name}</option>
                            )}
                            <option value="__ADD_NEW__">+ Add New Item to Menu...</option>
                          </select>
                          {(!item.isSaved || !item.name) && (
                            <input
                              data-testid={`bill-item-${index}-name-input`}
                              placeholder="Or type custom item name..."
                              value={item.name}
                              onChange={(e) => updateItem(index, "name", e.target.value)}
                              className="item-input"
                              style={{ fontSize: '0.82rem' }}
                              autoComplete="off"
                            />
                          )}
                        </div>
                      ) : (
                        <input
                          data-testid={`bill-item-${index}-name-input`}
                          placeholder="Item name / description"
                          value={item.name}
                          onChange={(e) => updateItem(index, "name", e.target.value)}
                          className="item-input"
                          autoComplete="off"
                        />
                      )}
                    </div>
                    <div className="item-field item-qty-field">
                      <label className="mobile-only-field-label">Qty</label>
                      <input
                        data-testid={`bill-item-${index}-quantity-input`}
                        type="text"
                        inputMode="numeric"
                        placeholder="1"
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
                        className="item-input number-input"
                      />
                    </div>
                    <div className="item-field item-rate-field">
                      <label className="mobile-only-field-label">Rate (₹)</label>
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
                        className={`item-input number-input ${item.isSaved ? "read-only-rate" : ""}`}
                        style={{
                          background: item.isSaved ? "#f8fafc" : "#ffffff",
                          color: item.isSaved ? "#0f172a" : "inherit",
                          fontWeight: item.isSaved ? "700" : "inherit",
                          cursor: item.isSaved ? "not-allowed" : "text"
                        }}
                        title={item.isSaved ? "Rate auto-populated from saved Shop Item" : undefined}
                      />
                    </div>
                    <div className="item-field item-amount-field">
                      <span className="item-amount">
                        {money((Number(item.quantity) || 0) * (Number(item.rate) || 0))}
                      </span>
                    </div>
                    <button
                      className="remove-item-button"
                      onClick={() => removeItem(index)}
                      disabled={items.length <= 1}
                      title="Remove item"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              data-testid="add-bill-item-button"
              className="add-item-button"
              onClick={handleAddItemClick}
            >
              <Plus size={16} /> Add Item
            </button>
          </div>

          {/* Bill Options: Discount, Tax, Payment */}
          <div className="editor-section options-grid">
            <div className="option-group">
              <label className="field-label">
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Discount (₹)</span>
                  <small style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>(Fixed in Shop Profile)</small>
                </span>
                <input
                  data-testid="bill-discount-input"
                  type="text"
                  readOnly
                  disabled
                  value={discount}
                  placeholder="0"
                  className="option-input"
                  style={{ background: "#f8fafc", cursor: "not-allowed", color: "#334155", fontWeight: 600 }}
                  title="Fixed default discount set in Shop Profile"
                />
              </label>
            </div>
            <div className="option-group">
              <label className="field-label">
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Tax Rate (%)</span>
                  <small style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>(Fixed in Shop Profile)</small>
                </span>
                <input
                  data-testid="bill-tax-input"
                  type="text"
                  readOnly
                  disabled
                  value={!isTaxEnabled ? "0" : tax}
                  placeholder="0"
                  className="option-input"
                  style={{ background: "#f8fafc", cursor: "not-allowed", color: "#334155", fontWeight: 600 }}
                  title="Fixed default tax rate set in Shop Profile"
                />
              </label>
            </div>
            <div className="option-group">
              <label className="field-label">
                <span>Payment Mode</span>
                <select
                  data-testid="bill-payment-select"
                  value={payment}
                  onChange={(e) => setPayment(e.target.value)}
                  className="option-select"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / QR</option>
                </select>
              </label>
            </div>
          </div>

          {renderUsageInfo()}

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
        </div>

        {/* Action Buttons: Reset, Save Bill, Print */}
        <div className="bill-actions-bar">
          <button
            data-testid="reset-bill-button"
            className="secondary-button"
            onClick={resetForm}
          >
            <X size={15} /> Reset
          </button>
          <button
            data-testid="save-bill-button"
            className="primary-button"
            onClick={saveBill}
            disabled={loading}
          >
            {loading ? (
              <ButtonLoader text="Saving..." />
            ) : (
              <>
                <Save size={15} /> {!user ? "Sign up to save" : "Save Bill"}
              </>
            )}
          </button>
          <button
            data-testid="print-receipt-button"
            className="print-button"
            onClick={handlePrint}
            disabled={isPrinting}
          >
            {isPrinting ? (
              <ButtonLoader text="Printing..." />
            ) : (
              <>
                <Printer size={15} /> Print
              </>
            )}
          </button>
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

          <div
            ref={receiptRef}
            id="receipt-to-print"
            className={`receipt-preview-content format-${printFormat} tpl-style-${selected?.id || "2"}`}
          >
            {/* Template Specific Header Badge */}
            {(selected?.id === "6" || selected?.id === "elite") && (
              <div className="receipt-tax-badge">TAX INVOICE</div>
            )}
            {(selected?.id === "5" || selected?.id === "modern") && (
              <div className="receipt-boutique-badge">BOUTIQUE RECEIPT</div>
            )}

            {/* Shop Header */}
            <div className="receipt-shop">
              <div className="receipt-logo">S</div>
              <h2 className="receipt-shop-name">
                {cleanTextLines(shop?.name || "Slipzo Shop").map((line, idx) => (
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

            {/* Receipt Meta */}
            <div className="receipt-meta">
              <span className="receipt-number" style={{ whiteSpace: 'nowrap' }}>#{customBillNumber || "SLP-DRAFT"}</span>
              <span className="receipt-date" style={{ whiteSpace: 'nowrap' }}>
                {formattedDate} {formattedTime}
              </span>
            </div>

            {/* Customer Line in Preview */}
            {selectedCustomer && (
              <div className="receipt-customer-line">
                <span>Customer: <b>{selectedCustomer.name}</b></span>
                {selectedCustomer.phone && <small>Ph: {selectedCustomer.phone}</small>}
              </div>
            )}

            {/* Divider */}
            <div className="receipt-divider"></div>

            {/* Items */}
            <div className="receipt-items">
              <div className="receipt-items-header">
                <span>Item</span>
                <span>Qty</span>
                <span>Rate</span>
                <span>Amount</span>
              </div>
              {items.filter((item) => item.name && item.name.trim()).length > 0 ? (
                items
                  .filter((item) => item.name && item.name.trim())
                  .map((item, index) => {
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

            {/* Totals */}
            <div className="receipt-totals">
              {isTaxEnabled && shopTaxMode === 1 && taxRate > 0 ? (
                <div className="receipt-total-row">
                  <span>Taxable Subtotal</span>
                  <span>{money(taxable - taxAmount)}</span>
                </div>
              ) : (
                <div className="receipt-total-row">
                  <span>Subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="receipt-total-row discount">
                  <span>Discount</span>
                  <span>-{money(discountAmount)}</span>
                </div>
              )}
              {isTaxEnabled && taxRate > 0 && (
                <div className="receipt-total-row">
                  <span>{shopTaxMode === 1 ? `GST (${taxRate}%)` : `Tax (${taxRate}%)`}</span>
                  <span>{money(taxAmount)}</span>
                </div>
              )}
              <div className="receipt-grand-total">
                <span>Grand Total</span>
                <span>{money(total)}</span>
              </div>
            </div>

            {/* Divider */}
            <div className="receipt-divider"></div>

            {/* Special Features per Template */}
            {(selected?.id === "3" || selected?.id === "pro") && (
              <div className="receipt-pro-extras">
                <div className="receipt-qr-wrapper">
                  <div className="receipt-qr-box">UPI QR</div>
                  <span>Scan to pay with any UPI App</span>
                </div>
                <div className="receipt-loyalty-tag">★ Earned {Math.floor(total / 50)} Loyalty Points</div>
              </div>
            )}

            {(selected?.id === "6" || selected?.id === "elite") && (
              <div className="receipt-signatory-wrapper">
                <div className="signatory-line" />
                <span>Authorized Signatory</span>
              </div>
            )}

            {/* Footer */}
            <div className="receipt-footer">
              <div className="receipt-payment">
                <span>Payment Mode</span>
                <span>{payment}</span>
              </div>
              <p className="receipt-thanks">
                {selected?.footer || "Thank you for shopping with us!"}
              </p>
            </div>
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
        }
      `}</style>
    </div>
  )
}