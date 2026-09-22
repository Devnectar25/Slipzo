import { useEffect, useMemo, useState, useRef } from "react"
import { printReceiptElement } from "../lib/printReceipt"
import { BUILTIN_TEMPLATES } from "./Templates"
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
  Lightbulb
} from "lucide-react"
import {
  call,
  money,
  findTemplateMatch,
  canPrintFree,
  getRemainingFreePrints,
  incrementFreePrintCount,
  getCachedData,
  syncUserQuota,
  getActivePlanDetails,
  getStoredMenuItems,
  saveStoredMenuItems,
  getCurrentUserKey
} from "../lib/utils"
import { Spinner } from "./common/Skeleton"
import { useToast } from "./common/Toast"
import { VoiceInputButton } from "./common/VoiceInputButton"
import { useTranslation } from "react-i18next"
import { useDbTranslation } from "../lib/translator"
import "../styles/NewBillFlow.css"

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

export function Bill({ user, requireAuth, setView, setSelectedBillId, shop: initialShop, setShop: parentSetShop }) {
  const { t } = useTranslation()
  const { tDb, formatNum, lang } = useDbTranslation()
  const userKey = getCurrentUserKey(user)
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

  // Data Caches
  const cachedShop = getCachedData("/shop")
  const cachedTemplates = getCachedData("/templates")
  const cachedMenuItems = getCachedData("/menu")

  const [templates, setTemplates] = useState(() => (Array.isArray(cachedTemplates) ? cachedTemplates : []))
  const [selectedId, setSelectedId] = useState(() => {
    const list = Array.isArray(cachedTemplates) && cachedTemplates.length > 0 ? cachedTemplates : BUILTIN_TEMPLATES
    const targetTplId = initialShop?.default_template_id || 
                        cachedShop?.default_template_id || 
                        (typeof window !== "undefined" ? localStorage.getItem("slipzo_default_template_id") : null)
    if (targetTplId) {
      const match = findTemplateMatch(list, targetTplId)
      if (match) return match.id
      return targetTplId
    }
    return ""
  })

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
    if (Array.isArray(cachedMenuItems) && cachedMenuItems.length > 0) return cachedMenuItems
    const stored = getStoredMenuItems(user)
    return Array.isArray(stored) ? stored : []
  })
  const [loadingMenu, setLoadingMenu] = useState(() => !cachedMenuItems && userMenuItems.length === 0)

  // Bill Items & Details State
  const [items, setItems] = useState([])
  const [discount, setDiscount] = useState("0")
  const [tax, setTax] = useState("0")
  const [payment, setPayment] = useState("Cash")
  const [saved, setSaved] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

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

  // In-Page Flow Step: "bill" (Steps 1, 2, 3) | "success" (Step 4)
  const [flowStep, setFlowStep] = useState("bill")

  // Search & Category Filters (Step 1)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  // Receipt preview drawer toggle
  const [showPreviewDrawer, setShowPreviewDrawer] = useState(false)

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
            setSelectedId(BUILTIN_TEMPLATES[0].id)
            setCustomBillNumber(generateClientBillNumber("SLP", 1001, "PREFIX-DATE-SEQ"))
          }
          return
        }

        const [shopData, templatesData, menuData] = await Promise.all([
          call("/shop").catch(() => ({})),
          call("/templates").catch(() => []),
          call("/menu").catch(() => [])
        ])

        if (!isMounted) return

        setShop(shopData || {})

        const dbTemplates = Array.isArray(templatesData) ? templatesData : []
        const extraBuiltins = BUILTIN_TEMPLATES.filter(b => !dbTemplates.some(t => (t.name || "").toLowerCase() === (b.name || "").toLowerCase()))
        const combinedTemplates = dbTemplates.length > 0 ? [...dbTemplates, ...extraBuiltins] : BUILTIN_TEMPLATES
        setTemplates(combinedTemplates)

        // Automatically resolve the user's selected template from Shop Profile
        let resolvedTpl = null
        const targetTpl = shopData?.default_template_id || (typeof window !== "undefined" ? localStorage.getItem("slipzo_default_template_id") : null)
        if (targetTpl) {
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

        // Scoped User Menu Items
        const validMenu = Array.isArray(menuData) ? menuData : (Array.isArray(menuData?.items) ? menuData.items : [])
        const userList = validMenu.length > 0 ? validMenu : getStoredMenuItems(user)
        setUserMenuItems(Array.isArray(userList) ? userList : [])
        if (Array.isArray(userList) && userList.length > 0) {
          saveStoredMenuItems(userList, user)
        }

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
    return () => { isMounted = false }
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

  // Tax and totals calculation
  const shopTaxMode = useMemo(() => {
    if (!shop || shop.show_tax === undefined || shop.show_tax === null) return 2
    if (shop.show_tax === false || shop.show_tax === 0 || shop.show_tax === "0") return 0
    if (shop.show_tax === true) return 2
    return Number(shop.show_tax)
  }, [shop])

  const isTaxEnabled = shopTaxMode !== 0
  const taxRate = Number(tax) || 0

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0)
  }, [items])

  const discountAmount = useMemo(() => {
    const val = Number(discount) || 0
    if (val <= 0) return 0
    return Math.min(val, subtotal)
  }, [discount, subtotal])

  const taxableAmount = Math.max(0, subtotal - discountAmount)

  const taxAmount = useMemo(() => {
    if (!isTaxEnabled || taxRate <= 0) return 0
    return (taxableAmount * taxRate) / 100
  }, [taxableAmount, isTaxEnabled, taxRate])

  const total = useMemo(() => {
    return Math.max(0, taxableAmount + taxAmount)
  }, [taxableAmount, taxAmount])

  // Total quantity of items in current bill
  const totalItemsInBill = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
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

  // Categories list from User's menu items
  const menuCategories = useMemo(() => {
    const set = new Set()
    userMenuItems.forEach((it) => {
      if (it.category) set.add(it.category)
    })
    return ["all", ...Array.from(set)]
  }, [userMenuItems])

  // Filter user menu items
  const filteredMenuItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return userMenuItems.filter((it) => {
      const matchesSearch = !q ||
        (it.name || "").toLowerCase().includes(q) ||
        (it.category || "").toLowerCase().includes(q)
      const matchesCat = selectedCategory === "all" ||
        (it.category || "").toLowerCase() === selectedCategory.toLowerCase()
      return matchesSearch && matchesCat
    })
  }, [userMenuItems, search, selectedCategory])

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

  // Map of added bill items by clean name (for card button and quantity controls)
  const addedItemMap = useMemo(() => {
    const map = new Map()
    items.forEach((it) => {
      map.set((it.name || "").trim().toLowerCase(), it)
    })
    return map
  }, [items])

  // ==========================================
  // HANDLERS: ADD / MANAGE ITEMS
  // ==========================================
  const handleAddItemFromMenu = (menuItem) => {
    if (!menuItem) return
    const cleanName = (menuItem.name || "").trim()
    const rate = Number(menuItem.price !== undefined ? menuItem.price : menuItem.custom_price || 0)

    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => (i.name || "").trim().toLowerCase() === cleanName.toLowerCase())
      if (existingIdx >= 0) {
        // Increment quantity of existing item
        return prev.map((item, idx) =>
          idx === existingIdx ? { ...item, quantity: Number(item.quantity || 0) + 1 } : item
        )
      } else {
        // Add new item row
        const newId = Date.now() + Math.floor(Math.random() * 1000)
        return [
          ...prev,
          {
            id: newId,
            name: cleanName,
            rate: rate,
            quantity: 1,
            category: menuItem.category || "General",
            image_url: menuItem.image_url || ""
          }
        ]
      }
    })

    toastSuccess(`Added ${cleanName} (${money(rate)})`)
  }

  const handleUpdateQuantity = (itemId, delta) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === itemId) {
          const newQty = Math.max(1, (Number(it.quantity) || 1) + delta)
          return { ...it, quantity: newQty }
        }
        return it
      })
    )
  }

  const handleDeleteItem = (itemId) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId))
  }

  const handleClearAll = () => {
    if (items.length === 0) return
    if (window.confirm("Clear all items from this bill?")) {
      setItems([])
    }
  }

  const handleAddMoreItemsClick = () => {
    if (flowStep === "success") {
      setFlowStep("bill")
    }
    setTimeout(() => {
      const searchEl = document.querySelector(".nb-search-input")
      if (searchEl) {
        searchEl.scrollIntoView({ behavior: "smooth", block: "center" })
        searchEl.focus()
      }
    }, 50)
  }

  // ==========================================
  // HANDLERS: SAVE BILL (0 PRINT CREDITS)
  // ==========================================
  const handleSaveBill = async () => {
    if (!user) {
      requireAuth?.("dashboard")
      return
    }

    const validItems = items.filter((item) => item.name && item.name.trim() && Number(item.quantity) > 0)
    if (validItems.length === 0) {
      toastError("Please add at least one item to save the bill.")
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      const billData = {
        template_id: activeTemplate?.id || selectedId || "",
        template_name: activeTemplate?.name || "",
        template_width: activeTemplate?.width || (shop?.receipt_width === "58mm" ? "58mm" : "80mm"),
        items: validItems.map((item) => ({
          name: item.name.trim(),
          quantity: Number(item.quantity) || 1,
          rate: Number(item.rate) || 0
        })),
        subtotal: subtotal,
        discount: discountAmount,
        tax_rate: taxRate,
        tax_mode: shopTaxMode,
        tax_amount: taxAmount,
        total: total,
        payment_mode: payment,
        number: customBillNumber || ""
      }

      // Save bill to backend - Deducts 0 print credits!
      const bill = await call("/bills", {
        method: "POST",
        body: JSON.stringify(billData)
      })

      setSaved(bill)
      window.dispatchEvent(new CustomEvent("slipzo_bill_saved", { detail: bill }))
      if (bill?.number) {
        setCustomBillNumber(bill.number)
      }

      toastSuccess(`Bill #${bill?.number || customBillNumber} saved successfully!`)
      setFlowStep("success")
    } catch (err) {
      console.error("Failed to save bill:", err)
      const msg = err.detail || err.message || "Failed to save bill. Please try again."
      setSaveError(msg)
      toastError(msg)
    } finally {
      setIsSaving(false)
    }
  }

  // ==========================================
  // HANDLERS: PRINT BILL -> DIRECT TO FINAL PRINT PREVIEW
  // ==========================================
  const handlePrintBill = async () => {
    if (isSaving) return

    if (!user) {
      requireAuth?.("bills")
      return
    }

    const validItems = items.filter((item) => item.name && item.name.trim() && Number(item.quantity) > 0)
    if (validItems.length === 0) {
      toastError(t("bills.addItemsBeforePrint", "Please add items to bill before printing."))
      return
    }

    // If bill already saved, directly navigate to final print preview
    if (saved?.id) {
      setSelectedBillId?.(saved.id)
      sessionStorage.setItem("slipzo-reprint-id", saved.id)
      sessionStorage.setItem("slipzo-print-origin", "bills")
      setView("reprint")
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      const billData = {
        template_id: activeTemplate?.id || selectedId || "",
        template_name: activeTemplate?.name || "",
        template_width: activeTemplate?.width || (shop?.receipt_width === "58mm" ? "58mm" : "80mm"),
        items: validItems.map((item) => ({
          name: item.name.trim(),
          quantity: Number(item.quantity) || 1,
          rate: Number(item.rate) || 0
        })),
        subtotal: subtotal,
        discount: discountAmount,
        tax_rate: taxRate,
        tax_mode: shopTaxMode,
        tax_amount: taxAmount,
        total: total,
        payment_mode: payment,
        number: customBillNumber || ""
      }

      const bill = await call("/bills", {
        method: "POST",
        body: JSON.stringify(billData)
      })

      setSaved(bill)
      window.dispatchEvent(new CustomEvent("slipzo_bill_saved", { detail: bill }))
      if (bill?.number) {
        setCustomBillNumber(bill.number)
      }

      // DIRECTLY navigate to existing final print preview without showing any intermediate page!
      setSelectedBillId?.(bill.id)
      sessionStorage.setItem("slipzo-reprint-id", bill.id)
      sessionStorage.setItem("slipzo-print-origin", "bills")
      setView("reprint")
    } catch (err) {
      console.error("Failed to save and print bill:", err)
      const msg = err.detail || err.message || "Failed to save bill. Please try again."
      setSaveError(msg)
      toastError(msg)
    } finally {
      setIsSaving(false)
    }
  }

  // ==========================================
  // HANDLERS: DIRECT PRINT (1 PRINT CREDIT)
  // ==========================================
  const handleDirectPrint = async () => {
    if (isPrintingRef.current) return
    isPrintingRef.current = true

    const userAuthKey = user?.email || user?.id || userKey

    // Check if user has available quota
    if (!canPrintFree(userAuthKey)) {
      const plan = getActivePlanDetails(userAuthKey)
      if (plan?.isFreeTier) {
        window.dispatchEvent(new CustomEvent("slipzo-show-free-reward-expired", { detail: { force: true } }))
      } else {
        Swal.fire({
          title: "Print Quota Limit Reached",
          text: "You have used all available prints in your plan. Please view pricing plans to add print credits.",
          icon: "warning",
          confirmButtonText: "View Pricing Plans",
          confirmButtonColor: "#F66016"
        }).then(() => {
          setView("pricing")
        })
      }
      isPrintingRef.current = false
      return
    }

    try {
      const templateWidth = activeTemplate?.width || (shop?.receipt_width === "58mm" ? "58mm" : "80mm")
      printReceiptElement("receipt-to-print", {
        pageWidth: templateWidth === "58mm" ? "58mm" : "80mm"
      })
      toastSuccess("Printed successfully!")
    } catch (err) {
      console.error("Printing failed:", err)
      toastError("Printing failed. Please check printer connection.")
    } finally {
      setTimeout(() => {
        isPrintingRef.current = false
      }, 800)
    }
  }

  // Create new bill (reset state for next customer)
  const handleCreateNewBill = () => {
    setItems([])
    setSaved(null)
    setSaveError(null)
    setSearch("")
    setSelectedCategory("all")
    setPayment("Cash")

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
            <p className="nb-page-subtitle">{t("bills.newBillSubtitle", "Add items from your menu and create a bill")}</p>
          </div>
        </div>

        <div className="nb-header-right">
          <button
            type="button"
            className="nb-top-add-more-btn"
            onClick={handleAddMoreItemsClick}
            title={t("bills.addMoreItems", "Add More Items")}
          >
            <Plus size={15} />
            <span>{t("bills.addMoreItems", "Add More Items")}</span>
          </button>

          <button
            className="nb-top-print-btn"
            onClick={handlePrintBill}
            disabled={isSaving || items.length === 0}
            title={t("bills.print", "Print")}
          >
            <Printer size={15} />
            <span>{isSaving ? t("bills.saving", "Saving...") : t("bills.print", "Print")}</span>
          </button>
        </div>
      </header>

      {/* ====================================================================
          STEP 4: SUCCESS & PRINT SCREEN (When Bill is Saved)
          ==================================================================== */}
      {flowStep === "success" ? (
        <div className="nb-success-card fade-in">
          <div className="nb-success-check-circle">
            <Check size={36} />
          </div>

          <h2 className="nb-success-title">{t("bills.createdSuccess", "Bill Created Successfully!")}</h2>

          <p className="nb-success-text">
            Your bill has been saved. You can print it now using your selected receipt template (
            <strong>{activeTemplate?.name || "Shop Pro"}</strong>).
          </p>

          <div className="nb-success-actions">
            <button className="nb-success-print-btn" onClick={() => {
              if (saved?.id) {
                setSelectedBillId?.(saved.id)
                sessionStorage.setItem("slipzo-reprint-id", saved.id)
                sessionStorage.setItem("slipzo-print-origin", "bills")
                setView("reprint")
              } else {
                handlePrintBill()
              }
            }}>
              <Printer size={18} /> {t("bills.printReceipt", "Print Receipt")}
            </button>

            <button
              className="nb-success-view-btn"
              onClick={() => setShowPreviewDrawer(!showPreviewDrawer)}
            >
              <Eye size={16} /> {showPreviewDrawer ? "Hide Details" : t("bills.viewReceipt", "View Bill Details")}
            </button>

            <button className="nb-success-new-btn" onClick={handleCreateNewBill}>
              <Plus size={16} /> {t("bills.createNewBill", "Create New Bill")}
            </button>
          </div>

          {/* Optional Bill Details Drawer */}
          {showPreviewDrawer && (
            <div style={{ marginTop: "1.5rem", textAlign: "left", background: "#FFF2DE", padding: "1rem", borderRadius: "12px", border: "1px solid #F7CDAB" }}>
              <div style={{ fontWeight: "700", fontSize: "0.88rem", marginBottom: "0.5rem" }}>
                Bill Summary
              </div>
              <div style={{ fontSize: "0.82rem", color: "#575B6B", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {items.map((it, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{tDb(it.name)} (×{it.quantity})</span>
                    <span>{money(it.quantity * it.rate)}</span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid #cbd5e1", marginTop: "0.4rem", paddingTop: "0.4rem", fontWeight: "800", color: "#0f172a", display: "flex", justifyContent: "space-between" }}>
                  <span>{t("bills.totalAmount", "Total Amount")} ({tDb(payment)})</span>
                  <span>{money(total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Step 1: Search Bar with Voice Recognition */}
          <div className="nb-search-bar">
            <Search size={18} className="nb-search-icon" />
            <input
              type="text"
              className="nb-search-input"
              placeholder={t("bills.searchPlaceholder", "Search items or speak to add (e.g. Tea, Coffee, Pizza...)")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="nb-search-clear-btn"
                onClick={() => setSearch("")}
                title={t("bills.clearSearch", "Clear search")}
              >
                <X size={15} />
              </button>
            )}
            <VoiceInputButton
              onSpeechResult={(text) => setSearch((text || "").trim().replace(/\s*[.,!?;:]+$/, "").trim())}
              variant="icon-only"
              placeholder={t("bills.speakItemName", "Speak item name")}
            />
          </div>

          {/* Step 1: Category Filter Chips */}
          {menuCategories.length > 2 && (
            <div className="nb-category-chips-row">
              {menuCategories.map((cat) => {
                const isActive = selectedCategory.toLowerCase() === cat.toLowerCase()
                const icon = cat === "all" ? "" : getCategoryIcon(cat)
                return (
                  <button
                    key={cat}
                    type="button"
                    className={`nb-category-chip ${isActive ? "active" : ""}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {icon}{cat === "all" ? t("bills.allItems", "All Items") : tDb(cat)}
                  </button>
                )
              })}
            </div>
          )}

          {/* Main 2-Column Content Layout */}
          <div className="nb-desktop-layout">
            {/* LEFT COLUMN: Main Menu-Items Container */}
            <div className="nb-left-col">
              <div className="nb-menu-card-container">
                <div className="nb-menu-card-header">
                  <h3 className="nb-menu-card-title">{t("bills.myMenuItems", "My Menu Items")}</h3>
                  <span className="nb-menu-items-count">
                    {formatNum(filteredMenuItems.length)} {filteredMenuItems.length === 1 ? t("bills.item", "item") : t("bills.items", "items")}
                  </span>
                </div>

                {loadingMenu ? (
                  <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                    <Spinner />
                    <p style={{ fontSize: "0.85rem", color: "#74788A", marginTop: "0.75rem" }}>
                      Loading your menu items...
                    </p>
                  </div>
                ) : userMenuItems.length === 0 ? (
                  /* Empty Menu State */
                  <div className="nb-empty-menu-card">
                    <div className="nb-empty-icon">
                      <Utensils size={28} />
                    </div>
                    <h4 className="nb-empty-title">Your Menu is Empty</h4>
                    <p className="nb-empty-desc">
                      Add items to your personal menu first to start creating bills with fast 1-click adding.
                    </p>
                    <button
                      type="button"
                      className="nb-add-btn"
                      onClick={() => setView?.("menu")}
                      style={{ margin: "0 auto", padding: "0.6rem 1.25rem", fontSize: "0.9rem" }}
                    >
                      <Plus size={16} /> Go to Menu
                    </button>
                  </div>
                ) : filteredMenuItems.length === 0 ? (
                  /* No Search Results */
                  <div style={{ textAlign: "center", padding: "2.5rem 1rem", background: "#ffffff", borderRadius: "12px", border: "1px dashed #D9DDE4", marginBottom: "1rem" }}>
                    <AlertCircle size={28} style={{ color: "#8F93A5", margin: "0 auto 0.5rem" }} />
                    <div style={{ fontWeight: "700", color: "#0C1F41", fontSize: "0.95rem" }}>No items found</div>
                    <p style={{ color: "#74788A", fontSize: "0.82rem", margin: "0.2rem 0 0.85rem" }}>
                      Try another item name or category.
                    </p>
                    <button
                      type="button"
                      className="nb-add-more-btn"
                      onClick={() => { setSearch(""); setSelectedCategory("all"); }}
                    >
                      Reset Filter
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Menu Item Cards List */}
                    <div className="nb-menu-items-list">
                      {paginatedMenuItems.map((menuItem) => {
                        const nameKey = (menuItem.name || "").trim().toLowerCase()
                        const addedItem = addedItemMap.get(nameKey)
                        return (
                          <div key={menuItem.id} className="nb-item-card">
                            <div className="nb-item-left">
                              {menuItem.image_url ? (
                                <img
                                  src={menuItem.image_url}
                                  alt={menuItem.name}
                                  className="nb-item-thumb"
                                  onError={(e) => { e.target.style.display = "none"; }}
                                />
                              ) : (
                                <div className="nb-item-thumb-placeholder">
                                  <Utensils size={18} />
                                </div>
                              )}

                              <div className="nb-item-info">
                                <h4 className="nb-item-name" title={menuItem.name}>{tDb(menuItem.name)}</h4>
                                <span className="nb-item-category">{tDb(menuItem.category || "General")}</span>
                                <div className="nb-item-price nb-item-price-desktop">
                                  {money(menuItem.price !== undefined ? menuItem.price : menuItem.custom_price || 0)}
                                </div>
                              </div>
                            </div>

                            <div className="nb-item-actions-wrapper">
                              <div className="nb-item-price nb-item-price-mobile">
                                {money(menuItem.price !== undefined ? menuItem.price : menuItem.custom_price || 0)}
                              </div>

                              {addedItem ? (
                                <div className="nb-qty-controls-group">
                                  <button
                                    type="button"
                                    className="nb-qty-btn"
                                    onClick={() => handleUpdateQuantity(addedItem.id, -1)}
                                    title="Decrease quantity"
                                    aria-label="Decrease quantity"
                                  >
                                    −
                                  </button>
                                  <span className="nb-qty-value">{formatNum(addedItem.quantity)}</span>
                                  <button
                                    type="button"
                                    className="nb-qty-btn"
                                    onClick={() => handleUpdateQuantity(addedItem.id, 1)}
                                    title="Increase quantity"
                                    aria-label="Increase quantity"
                                  >
                                    +
                                  </button>
                                  <button
                                    type="button"
                                    className="nb-item-del-btn"
                                    onClick={() => handleDeleteItem(addedItem.id)}
                                    title={t("bills.removeFromBill", "Remove from bill")}
                                    aria-label={t("bills.removeFromBill", "Remove from bill")}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
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
                  </>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Bill Summary & Tip Card */}
            <div className="nb-right-col">
              <div className="nb-summary-card">
                <div className="nb-summary-header-row">
                  <div className="nb-summary-icon-box">
                    <FileText size={18} className="nb-summary-icon" />
                  </div>
                  <h4 className="nb-summary-header">{t("bills.billSummary", "Bill Summary")}</h4>
                </div>

                <div className="nb-summary-details">
                  <div className="nb-summary-row">
                    <span className="nb-summary-label">{t("bills.itemsInBill", "Items in Bill")}</span>
                    <span className="nb-summary-val">{formatNum(totalItemsInBill)}</span>
                  </div>

                  <div className="nb-summary-row">
                    <span className="nb-summary-label">{t("common.subtotal", "Subtotal")}</span>
                    <span className="nb-summary-val">{money(subtotal)}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="nb-summary-row discount-row" style={{ color: "#16a34a" }}>
                      <span className="nb-summary-label">{t("common.discount", "Discount")}</span>
                      <span className="nb-summary-val">-{money(discountAmount)}</span>
                    </div>
                  )}

                  {isTaxEnabled && taxRate > 0 && (
                    <div className="nb-summary-row">
                      <span className="nb-summary-label">{t("common.tax", "GST")} ({formatNum(taxRate)}%)</span>
                      <span className="nb-summary-val">{money(taxAmount)}</span>
                    </div>
                  )}
                </div>

                <div className="nb-summary-divider" />

                <div className="nb-summary-row total-row">
                  <span className="nb-total-label">{t("bills.totalAmount", "Total Amount")}</span>
                  <span className="nb-summary-val-total">{money(total)}</span>
                </div>

                {/* Payment Mode */}
                <div className="nb-payment-section">
                  <label className="nb-payment-label">
                    <CreditCard size={15} style={{ color: "#0f172a" }} />
                    <span>{t("bills.paymentMode", "Payment Mode")}</span>
                  </label>
                  <select
                    value={payment}
                    onChange={(e) => setPayment(e.target.value)}
                    className="nb-payment-select"
                  >
                    <option value="Cash">{t("bills.cash", "Cash")}</option>
                    <option value="UPI">{t("bills.upi", "UPI")}</option>
                    <option value="Card">{t("bills.card", "Card")}</option>
                    <option value="Credit">{t("bills.credit", "Credit")}</option>
                  </select>
                </div>

                {saveError && (
                  <div style={{ color: "#ef4444", fontSize: "0.82rem", background: "#FFE1E5", padding: "0.5rem 0.75rem", borderRadius: "6px", marginTop: "0.75rem" }}>
                    {saveError}
                  </div>
                )}

                {/* Direct Print Bill button + Save Bill Button */}
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                  <button
                    type="button"
                    className="nb-save-bill-btn"
                    onClick={handlePrintBill}
                    disabled={isSaving || items.length === 0}
                    style={{
                      flex: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.45rem",
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
                      boxShadow: "0 1px 3px rgba(2, 132, 199, 0.25)"
                    }}
                  >
                    <Printer size={18} />
                    <span>{isSaving ? t("bills.saving", "Saving...") : t("bills.print", "Print Bill")}</span>
                  </button>
                  <button
                    type="button"
                    className="nb-save-bill-btn"
                    onClick={handleSaveBill}
                    disabled={isSaving || items.length === 0}
                    style={{
                      flex: 1,
                      background: "#f1f5f9",
                      color: "#334155",
                      border: "1px solid #cbd5e1"
                    }}
                  >
                    <Save size={18} />
                    <span>{isSaving ? t("bills.saving", "Saving...") : t("bills.saveBill", "Save Bill")}</span>
                  </button>
                </div>
              </div>

              {/* Tip Card directly below Bill Summary */}
              <div className="nb-tip-card">
                <Lightbulb size={20} className="nb-tip-icon" />
                <div className="nb-tip-content">
                  <h4 className="nb-tip-title">{t("bills.tipTitle", "Tip")}</h4>
                  <p className="nb-tip-desc">
                    {t("bills.tipDesc", "Search and add items from your menu. Adjust quantity using + / - or remove items anytime.")}
                  </p>
                </div>
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
                  title="Previous Page"
                  aria-label="Previous Page"
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
                  title="Next Page"
                  aria-label="Next Page"
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
          Always rendered clean with the user's selected Shop Profile template
          so printReceiptElement can print the full receipt without popups!
          ==================================================================== */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0, pointerEvents: "none" }}>
        {(() => {
          const isNarrow = activeTemplate?.width === "58mm" || activeTemplate?.width === "55mm" || shop?.printer_width === "58mm" || shop?.printer_width === "55mm"
          const baseSize = isNarrow ? "13.5px" : "15px"
          const shopNameSize = isNarrow ? "20px" : "23px"
          const totalSize = isNarrow ? "18px" : "21px"
          const footerSize = isNarrow ? "12.5px" : "13.5px"
          return (
            <div
              id="receipt-to-print"
              className={`receipt-preview-inner ${isNarrow ? "width-58mm format-58mm" : "width-80mm format-80mm"}`}
              style={{
                width: isNarrow ? "58mm" : "80mm",
                background: "#ffffff",
                padding: isNarrow ? "6px" : "10px",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif, monospace",
                color: "#000000",
                fontSize: baseSize,
                lineHeight: 1.45
              }}
            >
              <div style={{ textAlign: "center", marginBottom: "8px" }}>
                <h2 style={{ fontSize: shopNameSize, fontWeight: "900", margin: "0 0 2px", color: "#000000" }}>
                  {shop?.name || "Shop Receipt"}
                </h2>
                {shop?.address && <div style={{ fontSize: baseSize, fontWeight: "600", color: "#000000" }}>{shop.address}</div>}
                {shop?.phone && <div style={{ fontSize: baseSize, fontWeight: "600", color: "#000000" }}>Tel: {shop.phone}</div>}
                {shop?.gstin && <div style={{ fontSize: baseSize, fontWeight: "600", color: "#000000" }}>GSTIN: {shop.gstin}</div>}
              </div>

              <div style={{ borderTop: "1.5px dashed #000", borderBottom: "1.5px dashed #000", padding: "5px 0", fontSize: baseSize, fontWeight: "700", margin: "5px 0", display: "flex", justifyContent: "space-between" }}>
                <span>{tDb("Invoice")}: #{formatNum(customBillNumber)}</span>
                <span>{formatNum(formattedDate)} {formatNum(formattedTime)}</span>
              </div>

              <div style={{ margin: "6px 0" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: baseSize }}>
                  <thead>
                    <tr style={{ borderBottom: "1.5px solid #000" }}>
                      <th style={{ textAlign: "left", paddingBottom: "4px", fontWeight: "900" }}>{t("bills.colItemName", "Item")}</th>
                      <th style={{ textAlign: "center", paddingBottom: "4px", fontWeight: "900" }}>{t("bills.qty", "Qty")}</th>
                      <th style={{ textAlign: "right", paddingBottom: "4px", fontWeight: "900" }}>{t("bills.rate", "Rate")}</th>
                      <th style={{ textAlign: "right", paddingBottom: "4px", fontWeight: "900" }}>{t("bills.amt", "Amt")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} style={{ fontWeight: "700" }}>
                        <td style={{ padding: "3px 0", wordBreak: "break-word" }}>{tDb(item.name)}</td>
                        <td style={{ textAlign: "center", padding: "3px 0" }}>{formatNum(item.quantity)}</td>
                        <td style={{ textAlign: "right", padding: "3px 0" }}>{money(item.rate)}</td>
                        <td style={{ textAlign: "right", padding: "3px 0" }}>{money(item.quantity * item.rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ borderTop: "1.5px dashed #000", paddingTop: "5px", fontSize: baseSize }}>
                <div style={{ display: "flex", justifyContent: "space-between", margin: "3px 0", fontWeight: "600" }}>
                  <span>{t("common.subtotal", "Subtotal")}:</span>
                  <span>{money(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", margin: "3px 0", fontWeight: "600" }}>
                    <span>{t("common.discount", "Discount")}:</span>
                    <span>-{money(discountAmount)}</span>
                  </div>
                )}
                {isTaxEnabled && taxRate > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", margin: "3px 0", fontWeight: "600" }}>
                    <span>{t("common.tax", "GST")} ({formatNum(taxRate)}%):</span>
                    <span>{money(taxAmount)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", margin: "5px 0 3px", fontWeight: "900", fontSize: totalSize, borderTop: "2px solid #000", paddingTop: "5px" }}>
                  <span>{t("bills.totalAmount", "Total")}:</span>
                  <span>{money(total)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: baseSize, margin: "3px 0", fontWeight: "700" }}>
                  <span>{t("bills.paymentMode", "Payment Mode")}:</span>
                  <span>{tDb(payment)}</span>
                </div>
              </div>

              <div style={{ textAlign: "center", fontSize: footerSize, fontWeight: "600", marginTop: "10px", borderTop: "1.5px dashed #000", paddingTop: "5px", lineHeight: 1.4 }}>
                {activeTemplate?.footer || shop?.receipt_footer || "Thank you for shopping with us!"}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}