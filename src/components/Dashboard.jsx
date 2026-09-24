import { useEffect, useState, useMemo } from "react"
import {
  Search,
  SlidersHorizontal,
  FileText,
  Package,
  ShoppingCart,
  LayoutTemplate,
  Store,
  Crown,
  ChevronRight,
  Printer,
  Receipt,
  Plus,
  ArrowRight,
  X
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useDbTranslation } from "../lib/translator"
import { call, money, getCachedData } from "../lib/utils"

export function Dashboard({ setView, setSelectedBillId, requireAuth, user }) {
  const { t } = useTranslation()
  const { tDb, formatNum, lang } = useDbTranslation()
  const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000

  const filter10Days = (list) => {
    if (!Array.isArray(list)) return []
    const cutoff = Date.now() - TEN_DAYS_MS
    return list.filter((b) => b && b.created_at && new Date(b.created_at).getTime() >= cutoff)
  }

  const sortNewestFirst = (list) => {
    if (!Array.isArray(list)) return []
    return [...list].sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    )
  }

  const cachedData = getCachedData("/bills?page=1&limit=10&days_limit=10")

  const [bills, setBills] = useState(() => {
    if (cachedData?.bills && Array.isArray(cachedData.bills)) {
      return sortNewestFirst(filter10Days(cachedData.bills))
    }
    if (Array.isArray(cachedData)) {
      return sortNewestFirst(filter10Days(cachedData))
    }
    return []
  })

  const [loading, setLoading] = useState(() => !cachedData)
  const [search, setSearch] = useState("")

  const loadRecentBills = async () => {
    try {
      if (!Array.isArray(bills) || bills.length === 0) {
        setLoading(true)
      }
      const data = await call("/bills?page=1&limit=10&days_limit=10")
      let rawList = []
      if (data && typeof data === "object" && !Array.isArray(data) && Array.isArray(data.bills)) {
        rawList = data.bills
      } else if (Array.isArray(data)) {
        rawList = data
      }
      const filtered = sortNewestFirst(filter10Days(rawList))
      setBills(filtered)
    } catch (err) {
      console.error("Failed to load recent bills on Home:", err)
    } finally {
      setLoading(false)
    }
  }

  const fallbackBills = [
    { id: "1", billNumber: "INV-001", dateStr: "17 Sep 2026", timeStr: "02:30 PM", amount: 1250, status: "Paid" },
    { id: "2", billNumber: "INV-002", dateStr: "16 Sep 2026", timeStr: "11:20 AM", amount: 850, status: "Pending" },
    { id: "3", billNumber: "INV-003", dateStr: "15 Sep 2026", timeStr: "05:45 PM", amount: 2400, status: "Paid" },
    { id: "4", billNumber: "INV-004", dateStr: "14 Sep 2026", timeStr: "01:15 PM", amount: 1780, status: "Draft" },
    { id: "5", billNumber: "INV-005", dateStr: "13 Sep 2026", timeStr: "10:10 AM", amount: 3200, status: "Overdue" }
  ]

  useEffect(() => {
    loadRecentBills()

    const handleBillSaved = () => {
      loadRecentBills()
    }
    window.addEventListener("slipzo_bill_saved", handleBillSaved)
    return () => {
      window.removeEventListener("slipzo_bill_saved", handleBillSaved)
    }
  }, [user?.id])

  const handleReprint = (billId) => {
    setSelectedBillId?.(billId)
    sessionStorage.setItem("slipzo-reprint-id", billId)
    sessionStorage.setItem("slipzo-print-origin", "dashboard")
    setView("reprint")
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ""
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ""
    return formatNum(
      d.toLocaleDateString(lang === "mr" ? "mr-IN" : lang === "hi" ? "hi-IN" : "en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      })
    )
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return ""
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ""
    return formatNum(
      d.toLocaleTimeString(lang === "mr" ? "mr-IN" : lang === "hi" ? "hi-IN" : "en-IN", {
        hour: "2-digit",
        minute: "2-digit"
      })
    )
  }

  const getStatusBadge = (bill) => {
    const rawStatus = (bill.status || (bill.payment_mode === "Credit" ? "Pending" : "Paid")).toLowerCase()

    if (rawStatus.includes("pend") || rawStatus.includes("credit")) {
      return {
        label: t("home.pending", "Pending"),
        className: "status-pill status-pill-pending"
      }
    }
    if (rawStatus.includes("draft")) {
      return {
        label: t("home.draft", "Draft"),
        className: "status-pill status-pill-draft"
      }
    }
    if (rawStatus.includes("overdue")) {
      return {
        label: t("home.overdue", "Overdue"),
        className: "status-pill status-pill-overdue"
      }
    }
    return {
      label: t("home.paid", "Paid"),
      className: "status-pill status-pill-paid"
    }
  }

  const filteredBills = useMemo(() => {
    if (!search.trim()) return bills.slice(0, 5)
    const q = search.trim().toLowerCase()
    return bills
      .filter((b) => {
        const num = String(b.number || "").toLowerCase()
        const cust = String(b.customer_name || "").toLowerCase()
        const tot = String(b.total || "").toLowerCase()
        const mode = String(b.payment_mode || "").toLowerCase()
        return num.includes(q) || cust.includes(q) || tot.includes(q) || mode.includes(q)
      })
      .slice(0, 5)
  }, [bills, search])

  const quickActionCards = [
    {
      id: "new-bill",
      title: t("home.newBill", "New Bill"),
      subtitle: t("home.createInvoice", "Create invoice"),
      icon: FileText,
      targetView: "bills"
    },
    {
      id: "new-product",
      title: t("home.newProduct", "New Product"),
      subtitle: t("home.addToInventory", "Add to inventory"),
      icon: Package,
      targetView: "products"
    },
    {
      id: "add-item",
      title: t("home.addItem", "Add Item"),
      subtitle: t("home.quickAddItem", "Quick add item"),
      icon: ShoppingCart,
      targetView: "menu"
    },
    {
      id: "templates",
      title: t("home.templates", "Templates"),
      subtitle: t("home.useReadyFormats", "Use ready formats"),
      icon: LayoutTemplate,
      targetView: "templates"
    },
    {
      id: "shop-profile",
      title: t("home.shopProfile", "Shop Profile"),
      subtitle: t("home.manageYourShop", "Manage your shop"),
      icon: Store,
      targetView: "shop"
    },
    {
      id: "pricing",
      title: t("home.pricing", "Pricing"),
      subtitle: t("home.viewPlans", "View plans"),
      icon: Crown,
      targetView: "pricing"
    }
  ]

  return (
    <div className="home-screen-root fade-in">
      <style>{`
        .home-screen-root {
          width: 100%;
          max-width: 100%;
          margin: 0;
          padding: 0 0 32px;
          box-sizing: border-box;
        }

        /* Top Search Bar */
        .home-search-bar {
          display: flex;
          align-items: center;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 10px 14px;
          gap: 10px;
          box-shadow: 0 1px 4px rgba(15, 23, 42, 0.03);
          margin-bottom: 20px;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
          width: 100%;
        }

        .home-search-bar:focus-within {
          border-color: #0284c7;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.14);
        }

        .home-search-input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.92rem;
          color: #0f172a;
          min-width: 0;
        }

        .home-search-input::placeholder {
          color: #94a3b8;
          font-size: 0.88rem;
        }

        .home-search-icon {
          color: #64748b;
          flex-shrink: 0;
        }

        .home-search-clear {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2px;
          border-radius: 50%;
        }

        .home-search-clear:hover {
          color: #0f172a;
        }

        .home-search-filter-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 9px;
          background: #f0f9ff;
          color: #0284c7;
          border: 1px solid #bae6fd;
          flex-shrink: 0;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }

        .home-search-filter-badge:hover {
          background: #e0f2fe;
          border-color: #7dd3fc;
        }

        /* Quick Action Cards Grid */
        .home-cards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
          box-sizing: border-box;
          width: 100%;
        }

        .home-action-card {
          position: relative;
          background: linear-gradient(145deg, #ffffff 65%, #f0f9ff 100%);
          border: 1px solid #f1f5f9;
          border-radius: 16px;
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 6px rgba(15, 23, 42, 0.03);
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
          text-align: left;
          user-select: none;
          box-sizing: border-box;
          min-width: 0;
          overflow: hidden;
        }

        .home-action-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(2, 132, 199, 0.1);
          border-color: #bae6fd;
        }

        .home-action-card:active {
          transform: scale(0.98);
        }

        .home-card-icon-wrapper {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          box-shadow: 0 3px 10px rgba(2, 132, 199, 0.22);
          margin-bottom: 14px;
          flex-shrink: 0;
        }

        .home-card-text-group {
          min-width: 0;
          padding-right: 32px;
          box-sizing: border-box;
        }

        .home-card-title {
          font-size: 1.02rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 3px;
          line-height: 1.25;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .home-card-subtitle {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 500;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .home-card-chevron-btn {
          position: absolute;
          right: 14px;
          bottom: 16px;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #ffffff;
          border: 1px solid #bae6fd;
          color: #0284c7;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 4px rgba(2, 132, 199, 0.08);
          flex-shrink: 0;
          transition: transform 0.15s, background 0.15s;
          pointer-events: none;
        }

        .home-action-card:hover .home-card-chevron-btn {
          background: #f0f9ff;
          transform: translateX(2px);
          border-color: #7dd3fc;
        }

        /* Recent Bills Section */
        .home-recent-section {
          margin-top: 18px;
          box-sizing: border-box;
          width: 100%;
        }

        .home-recent-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .home-recent-title {
          font-size: 1.08rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .home-recent-view-all {
          font-size: 0.84rem;
          font-weight: 600;
          color: #0284c7;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          cursor: pointer;
          background: none;
          border: none;
          padding: 2px 4px;
          border-radius: 6px;
          transition: opacity 0.15s, transform 0.15s;
        }

        .home-recent-view-all:hover {
          opacity: 0.82;
          transform: translateX(2px);
        }

        .home-bills-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          box-sizing: border-box;
          width: 100%;
        }

        .home-bill-row {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #f1f5f9;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          box-shadow: 0 1px 4px rgba(15, 23, 42, 0.02);
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
          min-width: 0;
          width: 100%;
        }

        .home-bill-row:hover {
          border-color: #e2e8f0;
          box-shadow: 0 3px 10px rgba(15, 23, 42, 0.04);
        }

        .home-bill-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex: 1;
        }

        .home-bill-badge {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: #f0f9ff;
          border: 1px solid #e0f2fe;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0284c7;
          flex-shrink: 0;
        }

        .home-bill-info {
          min-width: 0;
          flex: 1;
        }

        .home-bill-number {
          font-size: 0.88rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.25;
        }

        .home-bill-date {
          font-size: 0.72rem;
          color: #64748b;
          margin: 2px 0 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
        }

        .home-bill-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .home-bill-financials {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .home-bill-amount {
          font-size: 0.94rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
          line-height: 1.2;
        }

        .status-pill {
          font-size: 0.68rem;
          font-weight: 600;
          padding: 1px 6px;
          border-radius: 5px;
          display: inline-block;
          line-height: 1.3;
        }

        .status-pill-paid {
          background: #dcfce7;
          color: #15803d;
        }

        .status-pill-pending {
          background: #fef3c7;
          color: #b45309;
        }

        .status-pill-draft {
          background: #e0f2fe;
          color: #0284c7;
        }

        .status-pill-overdue {
          background: #fee2e2;
          color: #b91c1c;
        }

        .home-bill-print-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
          flex-shrink: 0;
        }

        .home-bill-print-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #0f172a;
        }

        /* Empty State */
        .home-empty-state {
          background: #ffffff;
          border-radius: 14px;
          border: 1px dashed #e2e8f0;
          padding: 30px 16px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }

        .home-empty-icon-wrap {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0284c7;
          margin-bottom: 10px;
        }

        .home-empty-title {
          font-size: 0.98rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 3px;
        }

        .home-empty-desc {
          font-size: 0.8rem;
          color: #64748b;
          margin: 0 0 14px;
          max-width: 280px;
        }

        .home-empty-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
          color: #ffffff;
          border: none;
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 0.84rem;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 3px 10px rgba(2, 132, 199, 0.22);
          transition: opacity 0.15s;
        }

        .home-empty-btn:hover {
          opacity: 0.92;
        }

        /* Skeleton Loading */
        .home-skeleton-row {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #f1f5f9;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          animation: pulse 1.5s infinite ease-in-out;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* STRICT MOBILE VIEW: PERFECTLY COMPACT, EXACTLY 2 CARDS PER ROW, ZERO OVERFLOW */
        @media (max-width: 680px) {
          .home-screen-root {
            padding: 8px 10px max(75px, calc(68px + env(safe-area-inset-bottom, 12px)));
          }

          .home-search-bar {
            padding: 7px 10px;
            margin-bottom: 12px;
            border-radius: 10px;
          }

          .home-search-input {
            font-size: 0.82rem;
          }

          .home-cards-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8px;
            margin-bottom: 18px;
          }

          .home-action-card {
            padding: 10px 8px;
            border-radius: 12px;
            min-height: 96px;
          }

          .home-card-icon-wrapper {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            margin-bottom: 8px;
          }

          .home-card-icon-wrapper svg {
            width: 18px;
            height: 18px;
          }

          .home-card-text-group {
            padding-right: 22px;
          }

          .home-card-title {
            font-size: 0.85rem;
            margin-bottom: 1px;
          }

          .home-card-subtitle {
            font-size: 0.68rem;
          }

          .home-card-chevron-btn {
            width: 20px;
            height: 20px;
            right: 8px;
            bottom: 10px;
          }

          .home-card-chevron-btn svg {
            width: 11px;
            height: 11px;
          }

          .home-recent-section {
            margin-top: 14px;
          }

          .home-recent-header {
            margin-bottom: 10px;
          }

          .home-recent-title {
            font-size: 0.98rem;
          }

          .home-recent-view-all {
            font-size: 0.78rem;
          }

          .home-bill-row {
            padding: 8px 10px;
            gap: 8px;
          }

          .home-bill-badge {
            width: 32px;
            height: 32px;
            border-radius: 8px;
          }

          .home-bill-badge svg {
            width: 16px;
            height: 16px;
          }

          .home-bill-number {
            font-size: 0.82rem;
          }

          .home-bill-date {
            font-size: 0.68rem;
          }

          .home-bill-amount {
            font-size: 0.86rem;
          }

          .home-bill-print-btn {
            width: 28px;
            height: 28px;
            border-radius: 7px;
          }

          .home-bill-print-btn svg {
            width: 14px;
            height: 14px;
          }
        }
      `}</style>

      {/* 1. TOP SEARCH SECTION */}
      <div className="home-search-bar" role="search">
        <Search size={16} className="home-search-icon" />
        <input
          type="text"
          className="home-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("home.searchPlaceholder", "Search bills, products, templates, customers...")}
          aria-label="Search"
        />
        {search.trim() && (
          <button
            type="button"
            className="home-search-clear"
            onClick={() => setSearch("")}
            title={t("home.clearSearch", "Clear search")}
          >
            <X size={14} />
          </button>
        )}
        <div
          className="home-search-filter-badge"
          title="Filter"
          onClick={() => setView("history")}
        >
          <SlidersHorizontal size={14} />
        </div>
      </div>

      {/* 2. SIX QUICK-ACTION CARDS */}
      <div className="home-cards-grid">
        {quickActionCards.map((card) => {
          const IconComp = card.icon
          return (
            <div
              key={card.id}
              data-testid={`home-action-${card.id}`}
              className="home-action-card"
              onClick={() => setView(card.targetView)}
            >
              <div className="home-card-icon-wrapper">
                <IconComp size={22} />
              </div>

              <div className="home-card-text-group">
                <h3 className="home-card-title">{card.title}</h3>
                <p className="home-card-subtitle">{card.subtitle}</p>
              </div>

              <div className="home-card-chevron-btn" aria-hidden="true">
                <ChevronRight size={13} />
              </div>
            </div>
          )
        })}
      </div>

      {/* 3. RECENT BILLS SECTION */}
      <div className="home-recent-section">
        <div className="home-recent-header">
          <h2 className="home-recent-title">{t("home.recentBills", "Recent Bills")}</h2>
          <button
            type="button"
            data-testid="home-view-all-bills"
            className="home-recent-view-all"
            onClick={() => setView("history")}
          >
            <span>{t("home.viewAll", "View All →")}</span>
          </button>
        </div>

        {loading ? (
          <div className="home-bills-list">
            {[1, 2, 3].map((i) => (
              <div key={i} className="home-skeleton-row">
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: "#f1f5f9"
                    }}
                  />
                  <div>
                    <div
                      style={{
                        width: "75px",
                        height: "12px",
                        background: "#f1f5f9",
                        borderRadius: "4px",
                        marginBottom: "4px"
                      }}
                    />
                    <div
                      style={{
                        width: "110px",
                        height: "9px",
                        background: "#f1f5f9",
                        borderRadius: "4px"
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <div
                    style={{
                      width: "50px",
                      height: "14px",
                      background: "#f1f5f9",
                      borderRadius: "4px"
                    }}
                  />
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "8px",
                      background: "#f1f5f9"
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : filteredBills.length > 0 ? (
          <div className="home-bills-list">
            {filteredBills.map((bill) => {
              const statusInfo = getStatusBadge(bill)
              const billNumberDisplay = bill.number
                ? bill.number.startsWith("#")
                  ? bill.number
                  : `#${bill.number}`
                : "#INV-001"

              return (
                <div
                  key={bill.id}
                  data-testid={`home-recent-bill-${bill.id}`}
                  className="home-bill-row"
                >
                  <div className="home-bill-left">
                    <div className="home-bill-badge">
                      <Receipt size={18} />
                    </div>
                    <div className="home-bill-info">
                      <p className="home-bill-number">{formatNum(billNumberDisplay)}</p>
                      <p className="home-bill-date">
                        {formatDate(bill.created_at)}
                        {bill.created_at && " • "}
                        {formatTime(bill.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="home-bill-right">
                    <div className="home-bill-financials">
                      <p className="home-bill-amount">{money(bill.total)}</p>
                      <span className={statusInfo.className}>{statusInfo.label}</span>
                    </div>

                    <button
                      type="button"
                      data-testid={`home-reprint-${bill.id}`}
                      className="home-bill-print-btn"
                      title={t("common.print", "Print")}
                      onClick={() => handleReprint(bill.id)}
                    >
                      <Printer size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : search.trim() ? (
          <div className="home-empty-state">
            <p className="home-empty-title">
              {t("home.noMatchingBills", "No matching bills found")}
            </p>
            <p className="home-empty-desc">
              {t("history.noReceiptsFoundDesc", "No receipts matched your search filters. Try clearing the search.")}
            </p>
            <button
              type="button"
              className="home-empty-btn"
              onClick={() => setSearch("")}
            >
              {t("home.clearSearch", "Clear search")}
            </button>
          </div>
        ) : (
          <div className="home-empty-state">
            <div className="home-empty-icon-wrap">
              <Receipt size={24} />
            </div>
            <p className="home-empty-title">
              {t("home.noRecentBills", "No recent bills yet")}
            </p>
            <p className="home-empty-desc">
              {t("home.createFirstBill", "Create your first bill to see it here.")}
            </p>
            <button
              type="button"
              data-testid="home-empty-create-bill"
              className="home-empty-btn"
              onClick={() => setView("bills")}
            >
              <Plus size={15} />
              <span>{t("home.createBill", "Create Bill")}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}