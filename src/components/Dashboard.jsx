import { useEffect, useState, useMemo } from "react"
import { filterToday, msUntilMidnight, todayBillsUrl } from "../lib/todayBills"
import {
  Printer,
  Receipt,
  Plus,
  Utensils,
  Pencil
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useDbTranslation } from "../lib/translator"
import { TodayAnalytics } from "./TodayAnalytics"
import { call, money, getCachedData, isHotelRestaurant, getTableDisplayName } from "../lib/utils"

export function Dashboard({ setView, setSelectedBillId, requireAuth, user }) {
  const { t } = useTranslation()
  const { tDb, formatNum, lang } = useDbTranslation()

  const [shop, setShop] = useState(() => getCachedData("/shop") || {})
  const isHotel = isHotelRestaurant(shop)

  useEffect(() => {
    setShop(getCachedData("/shop") || {})
  }, [user?.id, user?.staff_of?.shop_name])

  useEffect(() => {
    const handleShopUpdate = (e) => {
      if (e?.detail) setShop(e.detail)
    }
    window.addEventListener("slipzo_shop_updated", handleShopUpdate)
    return () => window.removeEventListener("slipzo_shop_updated", handleShopUpdate)
  }, [])


  const filterSavedBills = (list) => {
    if (!Array.isArray(list)) return []
    return list.filter((b) => {
      if (!b) return false
      // Strictly include ONLY saved bills, never print bills
      const isExplicitPrint = b.is_saved === 0 || b.is_saved === false || b.is_saved === "0" || b.is_saved === "false"
      if (isExplicitPrint) return false
      return b.is_saved === true || b.is_saved === 1 || b.is_saved === "1" || b.is_saved === "true"
    })
  }

  const sortNewestFirst = (list) => {
    if (!Array.isArray(list)) return []
    return [...list].sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    )
  }

  const cachedData = getCachedData(todayBillsUrl({ isSaved: true }))

  const [bills, setBills] = useState(() => {
    if (cachedData?.bills && Array.isArray(cachedData.bills)) {
      return sortNewestFirst(filterToday(filterSavedBills(cachedData.bills)))
    }
    if (Array.isArray(cachedData)) {
      return sortNewestFirst(filterToday(filterSavedBills(cachedData)))
    }
    return []
  })

  const [loading, setLoading] = useState(() => !cachedData)

  const loadRecentBills = async (forceRefresh = false) => {
    try {
      if (!Array.isArray(bills) || bills.length === 0) {
        setLoading(true)
      }
      const fetchOpts = forceRefresh ? { noCache: true } : {}

      // Strictly query ONLY saved bills from database, made today
      const data = await call(todayBillsUrl({ isSaved: true }), fetchOpts)
      let rawList = []
      if (data && typeof data === "object" && !Array.isArray(data) && Array.isArray(data.bills)) {
        rawList = data.bills
      } else if (Array.isArray(data)) {
        rawList = data
      }

      const filtered = sortNewestFirst(filterToday(filterSavedBills(rawList)))
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
    loadRecentBills(true)

    const handleBillSaved = (e) => {
      const savedBill = e?.detail
      // Strictly accept only saved bills, reject print-only bills
      const isExplicitPrint = savedBill?.is_saved === 0 || savedBill?.is_saved === false || savedBill?.is_saved === "0" || savedBill?.is_saved === "false"
      if (savedBill && savedBill.id && !isExplicitPrint) {
        setBills((prev) => {
          const list = Array.isArray(prev) ? prev : []
          if (!list.some((b) => String(b.id) === String(savedBill.id))) {
            return sortNewestFirst([savedBill, ...list])
          }
          return list
        })
      }
      loadRecentBills(true)
    }

    const handleBillPrinted = (e) => {
      const printedId = e?.detail?.id || e?.detail?.billId
      const tableNum = e?.detail?.table_number
      setBills((prev) => {
        if (!Array.isArray(prev)) return []
        return prev.filter((b) => {
          if (printedId && String(b.id) === String(printedId)) return false
          if (tableNum && b.table_number && String(b.table_number).trim().toLowerCase() === String(tableNum).trim().toLowerCase()) return false
          return true
        })
      })
      loadRecentBills(true)
    }

    const handleVisibleSync = () => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        loadRecentBills(true)
      }
    }

    // Yesterday's bills leave the list when the day changes, even if the app stays open overnight
    let midnightTimer = null
    const scheduleMidnight = () => {
      midnightTimer = setTimeout(() => {
        loadRecentBills(true)
        scheduleMidnight()
      }, msUntilMidnight() + 1000)
    }
    scheduleMidnight()

    window.addEventListener("slipzo_bill_saved", handleBillSaved)
    window.addEventListener("slipzo_bill_printed", handleBillPrinted)
    window.addEventListener("slipzo_staff_changed", handleVisibleSync)
    window.addEventListener("focus", handleVisibleSync)
    document.addEventListener("visibilitychange", handleVisibleSync)
    return () => {
      clearTimeout(midnightTimer)
      window.removeEventListener("slipzo_bill_saved", handleBillSaved)
      window.removeEventListener("slipzo_bill_printed", handleBillPrinted)
      window.removeEventListener("slipzo_staff_changed", handleVisibleSync)
      window.removeEventListener("focus", handleVisibleSync)
      document.removeEventListener("visibilitychange", handleVisibleSync)
    }
  }, [user?.id, user?.staff_of?.shop_name])

  const handleReprint = (billId) => {
    setSelectedBillId?.(billId)
    sessionStorage.setItem("slipzo-reprint-id", billId)
    sessionStorage.setItem("slipzo-print-origin", "dashboard")
    setView("reprint")
  }

  const handleEditBill = (bill) => {
    sessionStorage.setItem("slipzo_edit_bill", JSON.stringify(bill))
    if (bill.table_number) {
      sessionStorage.setItem("slipzo_edit_table", bill.table_number)
      setView("tables")
    } else {
      setView("bills")
    }
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
    // Saved bills are open orders pending final print - do NOT display Paid status!
    const isSaved = bill.is_saved === true || bill.is_saved === 1 || bill.is_saved === "1" || bill.is_saved === "true"
    if (isSaved) {
      return null
    }

    const rawStatus = (bill.status || (bill.payment_mode === "Credit" ? "Pending" : "")).toLowerCase()

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

  const filteredBills = useMemo(() => bills.slice(0, 5), [bills])

  const hourNow = new Date().getHours()
  const greeting = hourNow < 12
    ? t("home.goodMorning", "Good morning")
    : hourNow < 17
      ? t("home.goodAfternoon", "Good afternoon")
      : t("home.goodEvening", "Good evening")
  const shopName = String(shop?.name || user?.staff_of?.shop_name || "").trim()

  return (
    <div className="home-screen-root fade-in">
      <style>{`
        .home-screen-root {
          width: 100%;
          max-width: 100%;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        /* Greeting */
        .home-greeting {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin: 4px 0 22px;
        }
        .home-greeting-text { min-width: 0; }
        .home-greeting-title {
          margin: 0;
          font-size: 2.1rem;
          line-height: 1.15;
          font-weight: 800;
          color: #0c1f41;
          letter-spacing: -0.02em;
        }
        .home-greeting-title span { color: #0284c7; }
        .home-greeting-sub { margin: 6px 0 0; font-size: 1.05rem; font-weight: 500; color: #64748b; }
        .home-greeting-cta {
          flex: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 18px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
          color: #ffffff;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 6px 16px rgba(2, 132, 199, 0.25);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .home-greeting-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(2, 132, 199, 0.32); }
        .home-greeting-cta:active { transform: translateY(0); }

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

        .home-bill-edit-pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
          color: #ffffff;
          border: 1px solid #0284c7;
          padding: 5px 12px;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(2, 132, 199, 0.22);
          transition: all 0.15s ease;
          height: 32px;
          box-sizing: border-box;
          white-space: nowrap;
        }

        .home-bill-edit-pill-btn:hover {
          background: linear-gradient(135deg, #0369a1 0%, #075985 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(2, 132, 199, 0.32);
        }

        .home-bill-edit-pill-btn:active {
          transform: scale(0.97);
        }

        .home-bill-edit-pill-btn svg {
          color: #ffffff;
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
            padding: 8px 10px 0;
          }

          .home-greeting { margin: 0 0 14px; gap: 10px; }
          .home-greeting-title { font-size: 1.5rem; }
          .home-greeting-sub { font-size: 0.9rem; margin-top: 4px; }
          .home-greeting-cta { padding: 9px 12px; font-size: 0.82rem; }

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

          /* two lines: bill number and date, then the amount and the buttons */
          .home-bill-row {
            flex-wrap: wrap;
            padding: 10px 12px;
            gap: 8px;
          }

          .home-bill-left {
            flex: 1 1 100%;
          }

          .home-bill-right {
            flex: 1 1 100%;
            flex-wrap: wrap;
            justify-content: space-between;
            gap: 8px;
            padding-top: 8px;
            border-top: 1px dashed #eef2f7;
          }

          .home-bill-financials {
            align-items: flex-start;
          }

          .home-bill-number,
          .home-bill-date {
            white-space: normal;
            overflow: visible;
            overflow-wrap: anywhere;
          }

          .home-bill-edit-pill-btn {
            height: 36px;
            min-height: 36px !important;
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
            font-size: 1rem;
          }

          .home-bill-print-btn {
            width: 36px;
            height: 36px;
            min-height: 36px !important;
            border-radius: 8px;
          }

          .home-bill-print-btn svg {
            width: 14px;
            height: 14px;
          }
        }
      `}</style>

      {/* 1. GREETING */}
      <div className="home-greeting">
        <div className="home-greeting-text">
          <h1 className="home-greeting-title">
            {greeting}{shopName ? <>, <span>{shopName}</span></> : null}
          </h1>
          <p className="home-greeting-sub">{t("home.greetingSub", "Here is how your shop is doing today.")}</p>
        </div>
        <button
          type="button"
          data-testid="home-start-billing"
          className="home-greeting-cta"
          onClick={() => setView(isHotel ? "tables" : "bills")}
        >
          {isHotel ? <Utensils size={16} /> : <Plus size={16} />}
          <span>{isHotel ? t("home.openTables", "Open tables") : t("home.newBill", "New Bill")}</span>
        </button>
      </div>

      {/* 2. TODAY'S ANALYTICS */}
      {user && <TodayAnalytics user={user} variant="full" isRestaurant={isHotel} onNavigate={setView} />}

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
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2px 6px" }}>
                        <p className="home-bill-number">{formatNum(billNumberDisplay)}</p>
                        {bill.table_number && (
                          <span style={{ fontSize: "0.68rem", fontWeight: "600", padding: "1px 5px", borderRadius: "4px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", whiteSpace: "nowrap" }}>
                            {getTableDisplayName(bill.table_number, t, formatNum)}
                          </span>
                        )}
                      </div>
                      <p className="home-bill-date">
                        {formatDate(bill.created_at)}
                        {bill.created_at && " • "}
                        {formatTime(bill.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="home-bill-right">
                    <div className="home-bill-financials">
                      <p className="home-bill-amount">{money(bill.total ?? bill.total_amount ?? bill.amount)}</p>
                      {statusInfo && (
                        <span className={statusInfo.className}>{statusInfo.label}</span>
                      )}
                    </div>

                    <div className="home-bill-actions" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        type="button"
                        data-testid={`home-edit-${bill.id}`}
                        className="home-bill-edit-pill-btn"
                        title={t("history.editBill", "Edit Bill")}
                        onClick={() => handleEditBill(bill)}
                      >
                        <Pencil size={13} />
                        <span>{t("common.edit", "Edit")}</span>
                      </button>

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
                </div>
              )
            })}
          </div>
        ) : (
          <div className="home-empty-state">
            <div className="home-empty-icon-wrap">
              <Receipt size={24} />
            </div>
            <p className="home-empty-title">
              {t("home.noRecentBills", "No bills yet today")}
            </p>
            <p className="home-empty-desc">
              {t("home.createFirstBill", "Bills you save today will show here.")}
            </p>
            <button
              type="button"
              data-testid="home-empty-create-bill"
              className="home-empty-btn"
              onClick={() => setView(isHotel ? "tables" : "bills")}
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