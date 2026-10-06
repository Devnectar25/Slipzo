import { useState, useMemo, useEffect } from "react"
import {
  ArrowLeft,
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
  FileText,
  Lightbulb,
  Barcode as BarcodeIcon
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useDbTranslation } from "../../lib/translator"
import {
  call,
  money,
  getCachedData,
  findTemplateMatch
} from "../../lib/utils"
import { BUILTIN_TEMPLATES } from "../Templates"
import { TableResetModal } from "./TableResetModal"
import { CameraScannerModal } from "../common/CameraScannerModal"
import { VoiceInputButton } from "../common/VoiceInputButton"
import { useBarcodeScanner } from "../../hooks/useBarcodeScanner"
import { playScanSuccessBeep, playScanErrorBeep } from "../../lib/audioFeedback"
import { useToast } from "../common/Toast"
import Swal from "sweetalert2"
import "../../styles/NewBillFlow.css"

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
  const { success: toastSuccess, error: toastError } = useToast()

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
      } catch (_) {}
    }
    return list.map((it) => {
      const qty = Number(it.quantity !== undefined ? it.quantity : (it.qty !== undefined ? it.qty : 1)) || 1
      const rate = Number(it.rate !== undefined ? it.rate : (it.price !== undefined ? it.price : (it.custom_price !== undefined ? it.custom_price : 0))) || 0
      return {
        id: it.id || (Date.now() + Math.floor(Math.random() * 1000)),
        name: (it.name || "").trim(),
        barcode: it.barcode || null,
        rate: rate,
        price: rate,
        quantity: qty,
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
  }, [table?.id, table?.table_number, JSON.stringify(table?.current_items)])

  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [paymentMode, setPaymentMode] = useState("Cash")
  const [isSaving, setIsSaving] = useState(false)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false)

  // Shop Personal Menu Items
  const cachedMenuItems = getCachedData("/menu")
  const [userMenuItems, setUserMenuItems] = useState(() => (Array.isArray(cachedMenuItems) ? cachedMenuItems : []))
  const [loadingMenu, setLoadingMenu] = useState(() => !cachedMenuItems || userMenuItems.length === 0)

  useEffect(() => {
    let isMounted = true
    const loadMenu = async () => {
      try {
        let data = await call("/menu?business_type=hotel_food")
        // If user menu is empty, fallback to master hotel catalog so hotel products are immediately available
        if (Array.isArray(data) && data.length === 0) {
          const catalog = await call("/menu/catalog?business_type=hotel_food")
          if (Array.isArray(catalog) && catalog.length > 0) {
            data = catalog
          }
        }
        if (isMounted && Array.isArray(data)) {
          setUserMenuItems(data)
        }
      } catch (err) {
        console.warn("Failed to load restaurant menu:", err)
      } finally {
        if (isMounted) setLoadingMenu(false)
      }
    }
    loadMenu()
    return () => { isMounted = false }
  }, [])

  // Bill Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const q = Number(item.quantity !== undefined ? item.quantity : (item.qty !== undefined ? item.qty : 1)) || 0
      const r = Number(item.rate !== undefined ? item.rate : (item.price !== undefined ? item.price : 0)) || 0
      return sum + (q * r)
    }, 0)
  }, [items])

  const total = subtotal

  const totalItemsCount = useMemo(() => {
    return items.reduce((sum, item) => {
      const q = Number(item.quantity !== undefined ? item.quantity : (item.qty !== undefined ? item.qty : 1)) || 0
      return sum + q
    }, 0)
  }, [items])

  // Sync back to parent table state whenever items change
  useEffect(() => {
    if (onUpdateTableState) {
      onUpdateTableState(table.id || table.table_number, {
        current_items: items,
        total_amount: total,
        status: items.length > 0 ? "OCCUPIED" : "AVAILABLE"
      })
    }
  }, [items, total])

  // Categories list from personal menu
  const menuCategories = useMemo(() => {
    const set = new Set()
    userMenuItems.forEach((it) => {
      if (it.category) set.add(it.category)
    })
    return ["all", ...Array.from(set)]
  }, [userMenuItems])

  // Map of added items by lowercase name
  const addedItemMap = useMemo(() => {
    const map = new Map()
    items.forEach((it) => {
      map.set((it.name || "").trim().toLowerCase(), it)
    })
    return map
  }, [items])

  // Filtered menu items
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

  // ==========================================
  // ITEM ADD / QUANTITY HANDLERS
  // ==========================================
  const handleAddItem = (menuItem) => {
    if (!menuItem) return

    if (menuItem.is_active === false || menuItem.is_available === false) {
      playScanErrorBeep()
      Swal.fire({
        title: t("menu.itemUnavailable", "Item Not Available"),
        text: t("menu.itemUnavailableDesc", "This item is currently unavailable in your menu."),
        icon: "warning",
        confirmButtonColor: "#0284c7"
      })
      return
    }

    const cleanName = (menuItem.name || "").trim()
    const rate = Number(menuItem.custom_price !== undefined ? menuItem.custom_price : (menuItem.price !== undefined ? menuItem.price : 0))
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
            quantity: 1,
            category: menuItem.category || "General",
            image_url: itemImage
          }
        ]
      }
    })
  }

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
      (it) => (it.barcode || "").trim().toLowerCase() === barcode.toLowerCase()
    )
    if (match) {
      handleAddItem(match)
      playScanSuccessBeep()
      return true
    }
    playScanErrorBeep()
    toastError(`No item matching barcode "${barcode}" found in menu.`)
    return false
  }

  useBarcodeScanner((scanned) => {
    handleBarcodeDetected(scanned)
  })

  // ==========================================
  // RESET TABLE BILL
  // ==========================================
  const handleConfirmReset = async () => {
    setItems([])
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

    toastSuccess(t("tables.tableResetSuccess", `${table.name || `Table ${table.table_number}`} cleared.`))
  }

  // ==========================================
  // SAVE BILL / PERSIST ACTIVE TABLE ORDER & RECORD BILL
  // ==========================================
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

    setIsSaving(true)
    try {
      const cachedTemplates = getCachedData("/templates") || BUILTIN_TEMPLATES
      const matchedTemplate = findTemplateMatch(cachedTemplates, shop?.default_template_id) || cachedTemplates[0] || BUILTIN_TEMPLATES[0]

      const billData = {
        template_id: matchedTemplate.id || "classic",
        template_name: matchedTemplate.name || "Classic Receipt",
        template_width: matchedTemplate.width || (shop?.receipt_width === "58mm" ? "58mm" : "80mm"),
        table_number: table.name || `Table ${table.table_number}`,
        table: table.name || `Table ${table.table_number}`,
        items: validItems.map((it) => ({
          name: it.name.trim(),
          barcode: it.barcode || null,
          quantity: Number(it.quantity) || 1,
          rate: Number(it.rate) || 0
        })),
        subtotal: subtotal,
        discount: 0,
        tax_rate: 0,
        tax_mode: 0,
        tax_amount: 0,
        total: total,
        payment_mode: paymentMode
      }

      // 1. Create and save bill in database
      const savedBill = await call("/bills", {
        method: "POST",
        body: JSON.stringify(billData)
      })

      // 2. Dispatch event so Home page (Dashboard) and other components update immediately
      window.dispatchEvent(new CustomEvent("slipzo_bill_saved", { detail: savedBill }))

      // 3. Persist table active order and OCCUPIED status in restaurant_tables
      const tableUpdates = {
        current_items: validItems,
        total_amount: total,
        status: "OCCUPIED"
      }

      if (onUpdateTableState) {
        onUpdateTableState(table.id || table.table_number, tableUpdates)
      }

      await call(`/restaurant/tables/${table.id || table.table_number}`, {
        method: "PUT",
        body: JSON.stringify(tableUpdates)
      }).catch((e) => console.warn("Backend table update warning:", e))

      toastSuccess(t("tables.orderSavedSuccess", `Bill saved for ${table.name || `Table ${table.table_number}`}!`))
      onBack()
    } catch (err) {
      console.error("Failed to save restaurant table bill:", err)
      toastError(err.detail || err.message || "Failed to save bill.")
    } finally {
      setIsSaving(false)
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

    setIsSaving(true)
    try {
      const cachedTemplates = getCachedData("/templates") || BUILTIN_TEMPLATES
      const matchedTemplate = findTemplateMatch(cachedTemplates, shop?.default_template_id) || cachedTemplates[0] || BUILTIN_TEMPLATES[0]

      const billData = {
        template_id: matchedTemplate.id || "classic",
        template_name: matchedTemplate.name || "Classic Receipt",
        template_width: matchedTemplate.width || (shop?.receipt_width === "58mm" ? "58mm" : "80mm"),
        table_number: table.name || `Table ${table.table_number}`,
        table: table.name || `Table ${table.table_number}`,
        items: validItems.map((it) => ({
          name: it.name.trim(),
          barcode: it.barcode || null,
          quantity: Number(it.quantity) || 1,
          rate: Number(it.rate) || 0
        })),
        subtotal: subtotal,
        discount: 0,
        tax_rate: 0,
        tax_mode: 0,
        tax_amount: 0,
        total: total,
        payment_mode: paymentMode
      }

      const savedBill = await call("/bills", {
        method: "POST",
        body: JSON.stringify(billData)
      })

      window.dispatchEvent(new CustomEvent("slipzo_bill_saved", { detail: savedBill }))

      // Clear table and route directly to reprint
      setItems([])
      if (onUpdateTableState) {
        onUpdateTableState(table.id || table.table_number, {
          current_items: [],
          total_amount: 0,
          status: "AVAILABLE"
        })
      }
      await call(`/restaurant/tables/reset/${table.id || table.table_number}`, {
        method: "POST"
      }).catch(() => {})

      setSelectedBillId?.(savedBill.id)
      sessionStorage.setItem("slipzo-reprint-id", savedBill.id)
      sessionStorage.setItem("slipzo-print-origin", "bills")
      setView?.("reprint")
    } catch (err) {
      console.error("Failed to print table bill:", err)
      toastError(err.detail || err.message || "Failed to process print.")
    } finally {
      setIsSaving(false)
    }
  }

  const isOccupied = items.length > 0

  return (
    <div className="table-billing-workspace fade-in">
      {/* Top Header */}
      <div className="table-billing-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <button type="button" className="table-billing-back-btn" onClick={onBack}>
            <ArrowLeft size={16} />
            <span>{t("tables.backToTables", "Tables")}</span>
          </button>

          <div className="table-billing-title-box">
            <h2 className="table-billing-title">
              {table.name || `Table ${table.table_number}`}
            </h2>
            <span className={`table-status-badge ${isOccupied ? "badge-occupied" : "badge-available"}`}>
              <span className="status-dot" />
              {isOccupied ? t("tables.occupied", "Occupied") : t("tables.available", "Available")}
            </span>
          </div>
        </div>

        <div style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: "600" }}>
          {totalItemsCount} {totalItemsCount === 1 ? t("history.item", "item") : t("history.items", "items")} • {money(total)}
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="nb-desktop-layout" style={{ marginTop: "1rem" }}>
        {/* LEFT COLUMN: Menu Items */}
        <div className="nb-left-col">
          {/* Search & Inputs */}
          <div className="table-menu-search-row" style={{ marginBottom: "0.85rem" }}>
            <div className="table-menu-search-input">
              <Search size={16} color="#64748b" />
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
                  style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <VoiceInputButton
              onTranscript={(text) => setSearch(text)}
              placeholder={t("menu.voiceSearch", "Speak to search item")}
            />

            <button
              type="button"
              className="icon-button"
              onClick={() => setIsCameraScannerOpen(true)}
              title="Scan Barcode"
              style={{ padding: "0.55rem 0.75rem", borderRadius: "10px", background: "#f0f9ff", color: "#0284c7", border: "1.5px solid #bae6fd", display: "inline-flex", alignItems: "center", gap: "0.35rem", fontWeight: "700", fontSize: "0.82rem" }}
            >
              <BarcodeIcon size={18} />
              <span className="hide-mobile">Scan Barcode</span>
            </button>
          </div>

          {/* Categories Horizontal Scroll */}
          <div className="table-categories-scroll" style={{ marginBottom: "0.85rem" }}>
            {menuCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`table-cat-chip ${selectedCategory === cat ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === "all" ? t("menu.allCategories", "All Categories") : tDb(cat)}
              </button>
            ))}
          </div>

          {/* My Menu Items Container */}
          <div className="nb-menu-card-container">
            <div className="nb-menu-card-header">
              <h3 className="nb-menu-card-title">{t("bills.myMenuItems", "My Menu Items")}</h3>
              <span className="nb-menu-items-count">
                {formatNum(filteredMenuItems.length)} {filteredMenuItems.length === 1 ? t("bills.item", "item") : t("bills.items", "items")}
              </span>
            </div>

            {loadingMenu ? (
              <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#64748b" }}>
                {t("common.loading", "Loading menu items...")}
              </div>
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
                  const price = Number(item.custom_price !== undefined ? item.custom_price : (item.price !== undefined ? item.price : 0))
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
                          <div className="nb-item-price nb-item-price-desktop">
                            {money(price)}
                          </div>
                        </div>
                      </div>

                      <div className="nb-item-actions-wrapper">
                        <div className="nb-item-price nb-item-price-mobile">
                          {money(price)}
                        </div>

                        {currentQty > 0 ? (
                          <div className="nb-qty-controls-group">
                            <button
                              type="button"
                              className="nb-qty-btn"
                              onClick={() => handleUpdateQty(item.name, -1)}
                              title="Decrease quantity"
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <span className="nb-qty-value">{formatNum(currentQty)}</span>
                            <button
                              type="button"
                              className="nb-qty-btn"
                              onClick={() => handleUpdateQty(item.name, 1)}
                              title="Increase quantity"
                              aria-label="Increase quantity"
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
                            onClick={() => handleAddItem(item)}
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

        {/* RIGHT COLUMN: Add More Items Button & Bill Summary Card */}
        <div className="nb-right-col">
          <button
            type="button"
            className="nb-add-more-items-summary-btn"
            onClick={() => {
              sessionStorage.setItem("slipzo_menu_initial_tab", "add_items")
              setView?.("menu")
            }}
          >
            <Plus size={16} /> {t("bills.addMoreItems", "Add More Items")}
          </button>

          {/* Bill Summary Card */}
          <div className="nb-summary-card">
            <div className="nb-summary-header-row">
              <div className="nb-summary-icon-box">
                <FileText className="nb-summary-icon" size={18} />
              </div>
              <h3 className="nb-summary-header">{t("bills.billSummary", "Bill Summary")}</h3>
              <span style={{ marginLeft: "auto", fontSize: "0.82rem", background: "#f0f9ff", color: "#0369a1", padding: "2px 8px", borderRadius: "10px", fontWeight: "700" }}>
                {table.name || `Table ${table.table_number}`}
              </span>
            </div>

            <div className="nb-summary-details">
              <div className="nb-summary-row">
                <span className="nb-summary-label">{t("bills.itemsInBill", "Items in Bill")}</span>
                <span className="nb-summary-val">{formatNum(totalItemsCount)}</span>
              </div>

              <div className="nb-summary-row">
                <span className="nb-summary-label">{t("common.subtotal", "Subtotal")}</span>
                <span className="nb-summary-val">{money(subtotal)}</span>
              </div>

              <div className="nb-summary-divider" />

              <div className="nb-summary-row total-row">
                <span className="nb-total-label">{t("bills.totalAmount", "Total Amount")}</span>
                <span className="nb-summary-val-total">{money(total)}</span>
              </div>

              {/* PAYMENT MODE */}
              <div className="nb-payment-section">
                <label className="nb-payment-label">
                  <CreditCard size={15} style={{ color: "#0f172a" }} />
                  <span>{t("bills.paymentModeUpper", "PAYMENT MODE")}</span>
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="nb-payment-select"
                >
                  <option value="Cash">{t("bills.cash", "Cash")}</option>
                  <option value="UPI">{t("bills.upi", "UPI")}</option>
                  <option value="Card">{t("bills.card", "Card")}</option>
                </select>
              </div>

              {/* Billing Action Buttons */}
              <div style={{ display: "flex", gap: "0.6rem", marginTop: "1rem" }}>
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
                  <Printer size={16} />
                  <span>{isSaving ? t("bills.saving", "Saving...") : t("bills.print", "Print")}</span>
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
                  <Save size={16} />
                  <span>{isSaving ? t("bills.saving", "Saving...") : t("bills.saveBill", "Save Bill")}</span>
                </button>
              </div>

              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(true)}
                  disabled={isSaving}
                  style={{ width: "100%", marginTop: "0.65rem", padding: "0.45rem", background: "transparent", border: "none", color: "#ef4444", fontSize: "0.82rem", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem" }}
                >
                  <RotateCcw size={13} /> {t("common.reset", "Reset Table")}
                </button>
              )}
            </div>
          </div>

          {/* Tip Card directly below Bill Summary */}
          <div className="nb-tip-card">
            <Lightbulb size={20} className="nb-tip-icon" />
            <div className="nb-tip-content">
              <h4 className="nb-tip-title">{t("bills.tipTitle", "Tip")}</h4>
              <p className="nb-tip-desc">
                {t("bills.tipDesc", "Search and add items from your menu. Adjust quantity using + / - buttons.")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <TableResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleConfirmReset}
        tableName={table.name || `Table ${table.table_number}`}
      />

      {/* Barcode Camera Scanner */}
      <CameraScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScanSuccess={(scanned) => {
          handleBarcodeDetected(scanned)
          setIsCameraScannerOpen(false)
        }}
      />
    </div>
  )
}
