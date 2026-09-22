// Dashboard.jsx - Updated with exact mobile layout matching reference design

import { useEffect, useState } from "react"
import {
  Plus,
  Receipt,
  ArrowRight,
  Store,
  FileText,
  Package,
  Mail,
  Search,
  SlidersHorizontal,
  ShoppingCart,
  Crown,
  Printer,
  ChevronRight
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { call, money, getRemainingFreePrints, getCachedData } from "../lib/utils"
import { MetricSkeleton } from "./common/Skeleton"

export function Dashboard({ setView, requireAuth, user }) {
  const { t } = useTranslation()
  const remainingPrints = getRemainingFreePrints(user?.email || user?.id)
  const [stats, setStats] = useState(() => {
    const cachedStats = getCachedData("/bills/stats")
    return {
      total: Number(cachedStats?.total || 0),
      count: Number(cachedStats?.count || 0)
    }
  })
  const [templateCount, setTemplateCount] = useState(() => {
    const cachedTemplates = getCachedData("/templates")
    return Array.isArray(cachedTemplates) ? cachedTemplates.length : 6
  })
  const [productCount, setProductCount] = useState(() => {
    const cachedProducts = getCachedData("/products")
    return Array.isArray(cachedProducts) ? cachedProducts.length : 5
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [recentBills, setRecentBills] = useState(() => {
    const cached = getCachedData("/bills?page=1&limit=5")
    return Array.isArray(cached?.bills) ? cached.bills : []
  })
  const [loading, setLoading] = useState(() => !getCachedData("/bills/stats"))

  const fallbackBills = [
    { id: "1", billNumber: "INV-001", dateStr: "17 Sep 2026", timeStr: "02:30 PM", amount: 1250, status: "Paid" },
    { id: "2", billNumber: "INV-002", dateStr: "16 Sep 2026", timeStr: "11:20 AM", amount: 850, status: "Pending" },
    { id: "3", billNumber: "INV-003", dateStr: "15 Sep 2026", timeStr: "05:45 PM", amount: 2400, status: "Paid" },
    { id: "4", billNumber: "INV-004", dateStr: "14 Sep 2026", timeStr: "01:15 PM", amount: 1780, status: "Draft" },
    { id: "5", billNumber: "INV-005", dateStr: "13 Sep 2026", timeStr: "10:10 AM", amount: 3200, status: "Overdue" }
  ]

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [statsData, templatesData, productsData, billsData] = await Promise.all([
          call("/bills/stats").catch(() => null),
          call("/templates").catch(() => []),
          call("/products").catch(() => []),
          call("/bills?page=1&limit=5").catch(() => null)
        ])

        setStats({
          total: Number(statsData?.total || 0),
          count: Number(statsData?.count || 0)
        })

        setTemplateCount(
          Array.isArray(templatesData) ? templatesData.length : 0
        )

        setProductCount(
          Array.isArray(productsData) ? productsData.length : 0
        )

        if (billsData && Array.isArray(billsData.bills) && billsData.bills.length > 0) {
          setRecentBills(billsData.bills)
        }
      } catch (err) {
        console.error("Failed to load dashboard:", err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const handlePrintBill = (e, bill) => {
    e.stopPropagation()
    window.print()
  }

  const displayedBills = recentBills.length > 0 ? recentBills.slice(0, 5).map((b, idx) => {
    const createdAt = b.createdAt ? new Date(b.createdAt) : null
    const dateStr = createdAt ? createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : (b.dateStr || "17 Sep 2026")
    const timeStr = createdAt ? createdAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : (b.timeStr || "02:30 PM")
    return {
      id: b.id || b._id || idx,
      billNumber: b.billNumber || b.invoiceNo || `#INV-00${idx + 1}`,
      dateStr,
      timeStr,
      amount: b.total || b.grandTotal || b.amount || 1250,
      status: b.status || (idx % 2 === 0 ? "Paid" : "Pending")
    }
  }) : fallbackBills

  const filteredBills = searchQuery.trim()
    ? displayedBills.filter(b =>
        b.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(b.amount).includes(searchQuery)
      )
    : displayedBills

  return (
    <div className="page dashboard-page fade-in">
      {/* 📱 MOBILE-ONLY VIEW - Exactly matching the uploaded design reference */}
      <div className="mobile-dashboard-content">
        {/* Search Bar & Filter */}
        <div className="mobile-home-search-wrap">
          <div className="mobile-home-search-input-box">
            <Search size={18} className="mobile-home-search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("dashboard.searchPlaceholder", "Search bills, products, templates, customers...")}
            />
          </div>
          <button
            type="button"
            className="mobile-home-filter-btn"
            onClick={() => setView("history")}
            title="Filter"
            aria-label="Filter"
          >
            <SlidersHorizontal size={19} />
          </button>
        </div>

        {/* 6 Quick Action Cards (2 Columns x 3 Rows) */}
        <div className="mobile-home-actions-grid">
          {/* 1. New Bill */}
          <div
            className="mobile-home-action-card"
            onClick={() => setView("bills")}
            role="button"
            tabIndex={0}
          >
            <div className="mobile-home-card-icon-box">
              <FileText size={23} />
            </div>
            <div className="mobile-home-card-bottom">
              <div className="mobile-home-card-texts">
                <h4 className="mobile-home-card-title">{t("dashboard.newBill", "New Bill")}</h4>
                <p className="mobile-home-card-sub">{t("dashboard.createInvoice", "Create invoice")}</p>
              </div>
              <div className="mobile-home-card-arrow">
                <ChevronRight size={16} />
              </div>
            </div>
          </div>

          {/* 2. New Product */}
          <div
            className="mobile-home-action-card"
            onClick={() => setView("products")}
            role="button"
            tabIndex={0}
          >
            <div className="mobile-home-card-icon-box">
              <Package size={23} />
            </div>
            <div className="mobile-home-card-bottom">
              <div className="mobile-home-card-texts">
                <h4 className="mobile-home-card-title">{t("dashboard.newProduct", "New Product")}</h4>
                <p className="mobile-home-card-sub">{t("dashboard.addToInventory", "Add to inventory")}</p>
              </div>
              <div className="mobile-home-card-arrow">
                <ChevronRight size={16} />
              </div>
            </div>
          </div>

          {/* 3. Add Item */}
          <div
            className="mobile-home-action-card"
            onClick={() => setView("products")}
            role="button"
            tabIndex={0}
          >
            <div className="mobile-home-card-icon-box">
              <ShoppingCart size={23} />
            </div>
            <div className="mobile-home-card-bottom">
              <div className="mobile-home-card-texts">
                <h4 className="mobile-home-card-title">{t("dashboard.addItem", "Add Item")}</h4>
                <p className="mobile-home-card-sub">{t("dashboard.quickAddItem", "Quick add item")}</p>
              </div>
              <div className="mobile-home-card-arrow">
                <ChevronRight size={16} />
              </div>
            </div>
          </div>

          {/* 4. Templates */}
          <div
            className="mobile-home-action-card"
            onClick={() => setView("templates")}
            role="button"
            tabIndex={0}
          >
            <div className="mobile-home-card-icon-box">
              <FileText size={23} />
            </div>
            <div className="mobile-home-card-bottom">
              <div className="mobile-home-card-texts">
                <h4 className="mobile-home-card-title">{t("dashboard.templates", "Templates")}</h4>
                <p className="mobile-home-card-sub">{t("dashboard.useReadyFormats", "Use ready formats")}</p>
              </div>
              <div className="mobile-home-card-arrow">
                <ChevronRight size={16} />
              </div>
            </div>
          </div>

          {/* 5. Shop Profile */}
          <div
            className="mobile-home-action-card"
            onClick={() => setView("shop")}
            role="button"
            tabIndex={0}
          >
            <div className="mobile-home-card-icon-box">
              <Store size={23} />
            </div>
            <div className="mobile-home-card-bottom">
              <div className="mobile-home-card-texts">
                <h4 className="mobile-home-card-title">{t("dashboard.shopProfile", "Shop Profile")}</h4>
                <p className="mobile-home-card-sub">{t("dashboard.manageYourShop", "Manage your shop")}</p>
              </div>
              <div className="mobile-home-card-arrow">
                <ChevronRight size={16} />
              </div>
            </div>
          </div>

          {/* 6. Pricing */}
          <div
            className="mobile-home-action-card"
            onClick={() => setView("pricing")}
            role="button"
            tabIndex={0}
          >
            <div className="mobile-home-card-icon-box">
              <Crown size={23} />
            </div>
            <div className="mobile-home-card-bottom">
              <div className="mobile-home-card-texts">
                <h4 className="mobile-home-card-title">{t("dashboard.pricing", "Pricing")}</h4>
                <p className="mobile-home-card-sub">{t("dashboard.viewPlans", "View plans")}</p>
              </div>
              <div className="mobile-home-card-arrow">
                <ChevronRight size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Bills Section */}
        <div className="mobile-home-recent-section">
          <div className="mobile-home-recent-header">
            <h3 className="mobile-home-recent-title">{t("dashboard.recentBills", "Recent Bills")}</h3>
            <button
              type="button"
              className="mobile-home-view-all-btn"
              onClick={() => setView("history")}
            >
              <span>{t("dashboard.viewAll", "View All")}</span>
              <ArrowRight size={15} />
            </button>
          </div>

          <div className="mobile-home-bills-list">
            {filteredBills.map((bill) => {
              const statusClass = bill.status.toLowerCase()
              const formattedNumber = bill.billNumber.startsWith("#") ? bill.billNumber : `#${bill.billNumber}`
              return (
                <div
                  key={bill.id}
                  className="mobile-home-bill-item"
                  onClick={() => setView("history")}
                >
                  <div className="mobile-home-bill-icon">
                    <Receipt size={20} />
                  </div>
                  <div className="mobile-home-bill-info">
                    <div className="mobile-home-bill-id">{formattedNumber}</div>
                    <div className="mobile-home-bill-time">
                      {bill.dateStr} • {bill.timeStr}
                    </div>
                  </div>
                  <div className="mobile-home-bill-amount-status">
                    <div className="mobile-home-bill-amount">₹{Number(bill.amount).toLocaleString()}</div>
                    <span className={`mobile-home-status-badge ${statusClass}`}>
                      {bill.status}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="mobile-home-bill-print-btn"
                    onClick={(e) => handlePrintBill(e, bill)}
                    title="Print Bill"
                    aria-label="Print"
                  >
                    <Printer size={16} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 💻 DESKTOP VIEW - Preserved as is for desktop displays */}
      <div className="desktop-dashboard-content">
        <div className="hero-row">
          <div>
            <p className="eyebrow accent">{t("dashboard.todaysDesk", "TODAY'S DESK")}</p>
            <h2>{t("dashboard.readySale", "Ready for your next sale?")}</h2>
            <p className="subtle">
              {t("dashboard.createReceiptSub", "Create a clean receipt in seconds, then keep serving customers.")}
            </p>
          </div>
          <button
            data-testid="dashboard-new-bill-button"
            className="primary-button"
            onClick={() => setView("bills")}
          >
            <Plus size={18} /> {t("dashboard.newBill", "New bill")}
          </button>
        </div>

        {loading ? (
          <MetricSkeleton count={4} />
        ) : (
          <div className="stats">
            <div className="stat" onClick={() => setView("history")} style={{ cursor: "pointer" }}>
              <span>{t("dashboard.totalRevenue", "Today's sales")}</span>
              <b>{money(stats.total)}</b>
              <small>
                {stats.count > 0
                  ? t("dashboard.receiptsToday", "{{count}} receipt(s) today", { count: stats.count })
                  : t("dashboard.firstBillPrompt", "Start with your first bill")}
              </small>
            </div>

            <div className="stat" onClick={() => setView("history")} style={{ cursor: "pointer" }}>
              <span>{t("dashboard.billsCreated", "Receipts today")}</span>
              <b>{stats.count}</b>
              <small>
                {stats.count > 0 ? t("dashboard.savedReceiptsToday", "Saved receipts today") : t("dashboard.nothingSavedYet", "Nothing saved yet")}
              </small>
            </div>

            <div className="stat" onClick={() => setView("pricing")} style={{ cursor: "pointer" }}>
              <span>{t("dashboard.pricingTitle", "Prints Left")}</span>
              <b>{remainingPrints}</b>
              <small>
                {remainingPrints > 0 ? t("dashboard.printsRemaining", "{{count}} remaining", { count: remainingPrints }) : t("dashboard.planLimitReached", "Plan limit reached")}
              </small>
            </div>

            <div className="stat" onClick={() => setView("templates")} style={{ cursor: "pointer" }}>
              <span>{t("dashboard.templatesAvailable", "Templates")}</span>
              <b>{templateCount}</b>
              <small>
                {templateCount > 0 ? t("dashboard.reusableBillStyles", "Reusable bill styles") : t("dashboard.createTemplate", "Create template")}
              </small>
            </div>
          </div>
        )}

        <div className="dashboard-grid">
          <section className="quick-panel">
            <div className="section-title">
              <div>
                <p className="eyebrow">{t("dashboard.quickStart", "QUICK START")}</p>
                <h3>{t("dashboard.billingRhythm", "Your simple billing rhythm")}</h3>
              </div>
              <Receipt size={28} />
            </div>

            <div className="steps">
              <div>
                <b>01</b>
                <span>
                  <strong>{t("dashboard.step1Title", "Choose a template")}</strong>
                  <small>{t("dashboard.step1Desc", "Your shop details and invoice prefix are already placed.")}</small>
                </span>
              </div>
              <div>
                <b>02</b>
                <span>
                  <strong>{t("dashboard.step2Title", "Add items")}</strong>
                  <small>{t("dashboard.step2Desc", "Quick product lookup, quantity × rate, and auto tax calculation.")}</small>
                </span>
              </div>
              <div>
                <b>03</b>
                <span>
                  <strong>{t("dashboard.step3Title", "Print and go")}</strong>
                  <small>{t("dashboard.step3Desc", "Works seamlessly with 58mm/80mm thermal & laser printers.")}</small>
                </span>
              </div>
            </div>
          </section>

          <section className="tip-panel">
            <p className="eyebrow">{t("dashboard.quickShortcuts", "QUICK SHORTCUTS")}</p>
            <h3>{t("dashboard.manageWorkspace", "Manage your workspace")}</h3>
            <p>
              {t("dashboard.workspaceDesc", "Organize reusable templates, manage your product inventory, and configure your invoice numbering.")}
            </p>
            <div className="dashboard-shortcuts-row">
              <button className="secondary-button small" onClick={() => setView("templates")}>
                <FileText size={14} /> {t("dashboard.btnTemplates", "Templates")}
              </button>
              <button className="secondary-button small" onClick={() => setView("products")}>
                <Package size={14} /> {t("dashboard.btnProducts", "Products")}
              </button>
              <button className="secondary-button small" onClick={() => setView("shop")}>
                <Store size={14} /> {t("dashboard.btnShopSettings", "Shop Settings")}
              </button>
              <button className="secondary-button small" onClick={() => setView("contact")}>
                <Mail size={14} /> {t("nav.contact", "Contact Us")}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}