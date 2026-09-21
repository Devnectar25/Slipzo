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

export function Bill({ user, requireAuth, setView, shop: initialShop, setShop: parentSetShop }) {
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

  // Shop & Templates State
  const [templates, setTemplates] = useState(() => (Array.isArray(cachedTemplates) ? cachedTemplates : []))
  const [selectedId, setSelectedId] = useState("")

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
        if (shopData?.default_template_id) {
          resolvedTpl = findTemplateMatch(combinedTemplates, shopData.default_template_id)
        }
        if (!resolvedTpl && combinedTemplates.length > 0) {
          resolvedTpl = combinedTemplates.find(t => t.is_default) || combinedTemplates[0]
        }
        if (resolvedTpl) {
          setSelectedId(resolvedTpl.id)
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
        template_id: activeTemplate?.id || "",
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
          confirmButtonColor: "#0284c7"
        }).then(() => {
          setView("pricing")
        })
      }
      isPrintingRef.current = false
      return
    }

    try {
      if (user) {
        // Authenticated user: deduct exactly 1 print credit
        let quota = null
        try {
          const res = await call("/subscriptions/consume-print", { method: "POST" })
          if (res && res.quota) {
            quota = res.quota
            syncUserQuota(res.quota, userAuthKey)
          }
        } catch (err) {
          console.error("Print quota deduction failed:", err)
          const errMsg = err?.detail || err?.message || "No print credits available"
          Swal.fire({
            title: "Print Quota Reached",
            text: errMsg,
            icon: "warning",
            confirmButtonText: "View Plans",
            confirmButtonColor: "#0284c7"
          })
          isPrintingRef.current = false
          return
        }

        // Execute print using user's Shop Profile template width
        const templateWidth = activeTemplate?.width || (shop?.receipt_width === "58mm" ? "58mm" : "80mm")
        printReceiptElement("receipt-to-print", {
          pageWidth: templateWidth === "58mm" ? "58mm" : "80mm"
        })

        toastSuccess("Printed successfully!")

        if (quota && quota.isFreeTier && Number(quota.printsRemaining) === 0) {
          window.dispatchEvent(new CustomEvent("slipzo-show-free-reward-expired", { detail: { force: true, quota } }))
        }
      } else {
        // Guest user local print
        incrementFreePrintCount(userAuthKey)
        const templateWidth = activeTemplate?.width || "80mm"
        printReceiptElement("receipt-to-print", {
          pageWidth: templateWidth === "58mm" ? "58mm" : "80mm"
        })
      }
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
            <h1 className="nb-page-title">New Bill</h1>
            <p className="nb-page-subtitle">Add items from your menu and create a bill</p>
          </div>
        </div>

        <div className="nb-header-right">
          <button
            type="button"
            className="nb-top-add-more-btn"
            onClick={handleAddMoreItemsClick}
            title="Add more items to bill"
          >
            <Plus size={15} />
            <span>Add More Items</span>
          </button>

          <button
            className="nb-top-print-btn"
            onClick={() => {
              if (items.length === 0) {
                toastError("Please add items to bill before printing.")
                return
              }
              handleDirectPrint()
            }}
            disabled={items.length === 0}
            title="Print Receipt"
          >
            <Printer size={15} />
            <span>Print</span>
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

          <h2 className="nb-success-title">Bill Created Successfully!</h2>

          <p className="nb-success-text">
            Your bill has been saved. You can print it now using your selected receipt template (
            <strong>{activeTemplate?.name || "Shop Pro"}</strong>).
          </p>

          <div className="nb-success-actions">
            <button className="nb-success-print-btn" onClick={handleDirectPrint}>
              <Printer size={18} /> Print Receipt
            </button>

            <button
              className="nb-success-view-btn"
              onClick={() => setShowPreviewDrawer(!showPreviewDrawer)}
            >
              <Eye size={16} /> {showPreviewDrawer ? "Hide Details" : "View Bill Details"}
            </button>

            <button className="nb-success-new-btn" onClick={handleCreateNewBill}>
              <Plus size={16} /> Create New Bill
            </button>
          </div>

          {/* Optional Bill Details Drawer */}
          {showPreviewDrawer && (
            <div style={{ marginTop: "1.5rem", textAlign: "left", background: "#f8fafc", padding: "1rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontWeight: "700", fontSize: "0.88rem", marginBottom: "0.5rem" }}>
                Bill Summary
              </div>
              <div style={{ fontSize: "0.82rem", color: "#475569", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {items.map((it, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{it.name} (×{it.quantity})</span>
                    <span>{money(it.quantity * it.rate)}</span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid #cbd5e1", marginTop: "0.4rem", paddingTop: "0.4rem", fontWeight: "800", color: "#0f172a", display: "flex", justifyContent: "space-between" }}>
                  <span>Total Amount Paid ({payment})</span>
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
              placeholder="Search items or speak to add (e.g. Tea, Coffee, Pizza...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="nb-search-clear-btn"
                onClick={() => setSearch("")}
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
            <VoiceInputButton
              onSpeechResult={(text) => setSearch((text || "").trim().replace(/\s*[.,!?;:]+$/, "").trim())}
              variant="icon-only"
              placeholder="Speak item name"
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
                    {icon}{cat === "all" ? "All Items" : cat}
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
                  <h3 className="nb-menu-card-title">My Menu Items</h3>
                  <span className="nb-menu-items-count">
                    {filteredMenuItems.length} {filteredMenuItems.length === 1 ? "item" : "items"}
                  </span>
                </div>

                {loadingMenu ? (
                  <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                    <Spinner />
                    <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.75rem" }}>
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
                  <div style={{ textAlign: "center", padding: "2.5rem 1rem", background: "#ffffff", borderRadius: "12px", border: "1px dashed #cbd5e1", marginBottom: "1rem" }}>
                    <AlertCircle size={28} style={{ color: "#94a3b8", margin: "0 auto 0.5rem" }} />
                    <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "0.95rem" }}>No items found</div>
                    <p style={{ color: "#64748b", fontSize: "0.82rem", margin: "0.2rem 0 0.85rem" }}>
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
                                <h4 className="nb-item-name" title={menuItem.name}>{menuItem.name}</h4>
                                <span className="nb-item-category">{menuItem.category || "General"}</span>
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
                                  <span className="nb-qty-value">{addedItem.quantity}</span>
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
                                    title="Remove from bill"
                                    aria-label="Remove from bill"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="nb-add-btn"
                                  onClick={() => handleAddItemFromMenu(menuItem)}
                                  title="Add item to current bill"
                                >
                                  <Plus size={14} /> Add
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
                  <h4 className="nb-summary-header">Bill Summary</h4>
                </div>

                <div className="nb-summary-details">
                  <div className="nb-summary-row">
                    <span className="nb-summary-label">Items in Bill</span>
                    <span className="nb-summary-val">{totalItemsInBill}</span>
                  </div>

                  <div className="nb-summary-row">
                    <span className="nb-summary-label">Subtotal</span>
                    <span className="nb-summary-val">{money(subtotal)}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="nb-summary-row discount-row" style={{ color: "#16a34a" }}>
                      <span className="nb-summary-label">Discount</span>
                      <span className="nb-summary-val">-{money(discountAmount)}</span>
                    </div>
                  )}

                  {isTaxEnabled && taxRate > 0 && (
                    <div className="nb-summary-row">
                      <span className="nb-summary-label">GST ({taxRate}%)</span>
                      <span className="nb-summary-val">{money(taxAmount)}</span>
                    </div>
                  )}
                </div>

                <div className="nb-summary-divider" />

                <div className="nb-summary-row total-row">
                  <span className="nb-total-label">Total Amount</span>
                  <span className="nb-summary-val-total">{money(total)}</span>
                </div>

                {/* Payment Mode */}
                <div className="nb-payment-section">
                  <label className="nb-payment-label">
                    <CreditCard size={15} style={{ color: "#0f172a" }} />
                    <span>Payment Mode</span>
                  </label>
                  <select
                    value={payment}
                    onChange={(e) => setPayment(e.target.value)}
                    className="nb-payment-select"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Credit">Credit</option>
                  </select>
                </div>

                {saveError && (
                  <div style={{ color: "#ef4444", fontSize: "0.82rem", background: "#fef2f2", padding: "0.5rem 0.75rem", borderRadius: "6px", marginTop: "0.75rem" }}>
                    {saveError}
                  </div>
                )}

                {/* Save Bill Button - Consumes 0 print credits! */}
                <button
                  type="button"
                  className="nb-save-bill-btn"
                  onClick={handleSaveBill}
                  disabled={isSaving || items.length === 0}
                >
                  <Save size={18} />
                  <span>{isSaving ? "Saving Bill..." : "Save Bill"}</span>
                </button>
              </div>

              {/* Tip Card directly below Bill Summary */}
              <div className="nb-tip-card">
                <Lightbulb size={20} className="nb-tip-icon" />
                <div className="nb-tip-content">
                  <h4 className="nb-tip-title">Tip</h4>
                  <p className="nb-tip-desc">
                    Search and add items from your menu. Adjust quantity using + / - or remove items anytime.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Full Page Width Standalone Pagination Bar (Moved down below both columns) */}
          {filteredMenuItems.length > 0 && (
            <div className="nb-standalone-pagination">
              <div className="pagination-info nb-standalone-pagination-info">
                Showing <span>{startItemIndex}</span> to <span>{endItemIndex}</span> of <span>{filteredMenuItems.length}</span> items
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
                          {pageNum}
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
        <div
          id="receipt-to-print"
          className="receipt-preview-inner"
          style={{
            width: activeTemplate?.width === "58mm" ? "58mm" : "80mm",
            background: "#ffffff",
            padding: "10px",
            fontFamily: "Courier, monospace",
            color: "#000000"
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "8px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "800", margin: "0 0 2px" }}>
              {shop?.name || "Shop Receipt"}
            </h2>
            {shop?.address && <div style={{ fontSize: "11px" }}>{shop.address}</div>}
            {shop?.phone && <div style={{ fontSize: "11px" }}>Tel: {shop.phone}</div>}
            {shop?.gstin && <div style={{ fontSize: "11px" }}>GSTIN: {shop.gstin}</div>}
          </div>

          <div style={{ borderTop: "1px dashed #000", borderBottom: "1px dashed #000", padding: "4px 0", fontSize: "11px", margin: "4px 0", display: "flex", justifyContent: "space-between" }}>
            <span>Invoice: #{customBillNumber}</span>
            <span>{formattedDate} {formattedTime}</span>
          </div>

          <div style={{ margin: "6px 0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #000" }}>
                  <th style={{ textAlign: "left", paddingBottom: "2px" }}>Item</th>
                  <th style={{ textAlign: "center", paddingBottom: "2px" }}>Qty</th>
                  <th style={{ textAlign: "right", paddingBottom: "2px" }}>Rate</th>
                  <th style={{ textAlign: "right", paddingBottom: "2px" }}>Amt</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: "2px 0" }}>{item.name}</td>
                    <td style={{ textAlign: "center", padding: "2px 0" }}>{item.quantity}</td>
                    <td style={{ textAlign: "right", padding: "2px 0" }}>{money(item.rate)}</td>
                    <td style={{ textAlign: "right", padding: "2px 0" }}>{money(item.quantity * item.rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ borderTop: "1px dashed #000", paddingTop: "4px", fontSize: "11px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", margin: "2px 0" }}>
              <span>Subtotal:</span>
              <span>{money(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", margin: "2px 0" }}>
                <span>Discount:</span>
                <span>-{money(discountAmount)}</span>
              </div>
            )}
            {isTaxEnabled && taxRate > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", margin: "2px 0" }}>
                <span>GST ({taxRate}%):</span>
                <span>{money(taxAmount)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0 2px", fontWeight: "800", fontSize: "13px", borderTop: "1px solid #000", paddingTop: "3px" }}>
              <span>Total:</span>
              <span>{money(total)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", margin: "2px 0" }}>
              <span>Payment Mode:</span>
              <span>{payment}</span>
            </div>
          </div>

          <div style={{ textAlign: "center", fontSize: "10px", marginTop: "10px", borderTop: "1px dashed #000", paddingTop: "4px" }}>
            {activeTemplate?.footer || shop?.receipt_footer || "Thank you for shopping with us!"}
          </div>
        </div>
      </div>
    </div>
  )
}