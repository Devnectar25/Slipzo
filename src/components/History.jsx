import { useEffect, useState, useMemo } from "react"
import {
  Receipt,
  Printer,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  User,
  Calendar,
  Plus,
  Trash2,
  Mic,
  CreditCard,
  List,
  ChevronDown,
  MoreVertical,
  Banknote,
  Send
} from "lucide-react"
import { call, money, getCachedData } from "../lib/utils"
import { TableSkeleton, Spinner } from "./common/Skeleton"
import { useToast } from "./common/Toast"
import Swal from "sweetalert2"
import { useTranslation } from "react-i18next"
import { useDbTranslation } from "../lib/translator"

export function History({ setView, setSelectedBillId, user }) {
  const { t } = useTranslation()
  const { tDb, formatNum, lang } = useDbTranslation()
  const cachedData = getCachedData("/bills?page=1&limit=10&days_limit=10")
  const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000

  const filter10Days = (list) => {
    if (!Array.isArray(list)) return []
    const cutoff = Date.now() - TEN_DAYS_MS
    return list.filter((b) => b && b.created_at && new Date(b.created_at).getTime() >= cutoff)
  }

  const [bills, setBills] = useState(() => {
    if (cachedData?.bills && Array.isArray(cachedData.bills)) return filter10Days(cachedData.bills)
    if (Array.isArray(cachedData)) return filter10Days(cachedData)
    return []
  })
  const [loading, setLoading] = useState(() => !cachedData)
  const [totalRecords, setTotalRecords] = useState(() => cachedData?.total || (Array.isArray(cachedData) ? filter10Days(cachedData).length : 0))
  const [totalPages, setTotalPages] = useState(() => cachedData?.totalPages || 1)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState("")
  const [paymentMode, setPaymentMode] = useState("All")
  const [deletingId, setDeletingId] = useState(null)
  const [isListening, setIsListening] = useState(false)
  const [activeMenuBillId, setActiveMenuBillId] = useState(null)

  const { success: toastSuccess, error: toastError } = useToast()

  const fallbackHistoryBills = [
    { id: "1", number: "SLP-20260918-1001", dateFormatted: "18 Sept 2026", timeFormatted: "02:56 PM", payment_mode: "Cash", itemsCount: 2, total: 0 },
    { id: "2", number: "SLP-20260917-1002", dateFormatted: "17 Sept 2026", timeFormatted: "11:20 AM", payment_mode: "Card", itemsCount: 5, total: 560 },
    { id: "3", number: "SLP-20260916-1003", dateFormatted: "16 Sept 2026", timeFormatted: "06:45 PM", payment_mode: "UPI", itemsCount: 3, total: 320 },
    { id: "4", number: "SLP-20260915-1004", dateFormatted: "15 Sept 2026", timeFormatted: "01:10 PM", payment_mode: "Cash", itemsCount: 1, total: 120 },
    { id: "5", number: "SLP-20260914-1005", dateFormatted: "14 Sept 2026", timeFormatted: "09:30 AM", payment_mode: "Card", itemsCount: 4, total: 890 },
    { id: "6", number: "SLP-20260913-1006", dateFormatted: "13 Sept 2026", timeFormatted: "04:15 PM", payment_mode: "Cash", itemsCount: 6, total: 430 },
    { id: "7", number: "SLP-20260912-1007", dateFormatted: "12 Sept 2026", timeFormatted: "12:05 PM", payment_mode: "UPI", itemsCount: 2, total: 275 },
    { id: "8", number: "SLP-20260911-1008", dateFormatted: "11 Sept 2026", timeFormatted: "07:40 PM", payment_mode: "Card", itemsCount: 8, total: 1150 },
    { id: "9", number: "SLP-20260910-1009", dateFormatted: "10 Sept 2026", timeFormatted: "03:25 PM", payment_mode: "Cash", itemsCount: 3, total: 690 },
    { id: "10", number: "SLP-20260009-1010", dateFormatted: "09 Sept 2026", timeFormatted: "10:10 AM", payment_mode: "UPI", itemsCount: 7, total: 980 }
  ]

  const loadBills = async () => {
    try {
      if (!Array.isArray(bills) || bills.length === 0) setLoading(true)
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        days_limit: "10"
      })
      if (search.trim()) queryParams.append("search", search.trim())
      if (paymentMode !== "All") queryParams.append("payment_mode", paymentMode)

      const data = await call(`/bills?${queryParams.toString()}`)

      if (data && typeof data === "object" && !Array.isArray(data) && Array.isArray(data.bills)) {
        const filtered = filter10Days(data.bills)
        setBills(filtered)
        setTotalRecords(data.total || filtered.length)
        setTotalPages(data.totalPages || 1)
      } else {
        const billsList = filter10Days(Array.isArray(data) ? data : [])
        setBills(billsList)
        setTotalRecords(billsList.length)
        setTotalPages(1)
      }
    } catch (err) {
      console.error("Failed to load bills:", err)
      toastError("Failed to load bill history")
      setBills([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBills()
  }, [page, limit, paymentMode, user?.id])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      loadBills()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      toastError(t("history.voiceNotSupported", "Voice search is not supported in this browser"))
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = "en-IN"
    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setSearch(transcript)
    }
    recognition.start()
  }

  const handleReprint = (billId) => {
    setSelectedBillId?.(billId)
    sessionStorage.setItem("slipzo-reprint-id", billId)
    sessionStorage.setItem("slipzo-print-origin", "history")
    setView("reprint")
  }

  const handleDeleteBill = async (bill) => {
    if (deletingId) return
    const result = await Swal.fire({
      title: t("history.deleteTitle", "Delete this bill?"),
      html: `<div style="font-size: 0.95rem; color: #575B6B; margin-top: 0.35rem;">
        ${t("history.deleteConfirm", "Are you sure you want to delete bill")} <b style="color: #0C1F41;">${bill.number}</b> (${money(bill.total)})?
      </div>
      <div style="font-size: 0.82rem; color: #ef4444; margin-top: 0.5rem; font-weight: 600;">
        ${t("history.deleteWarning", "This action cannot be undone.")}
      </div>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#74788A",
      confirmButtonText: t("common.delete", "Delete"),
      cancelButtonText: t("common.cancel", "Cancel"),
      focusCancel: true
    })

    if (!result.isConfirmed) return

    try {
      setDeletingId(bill.id)
      await call(`/bills/${bill.id}`, { method: "DELETE" })

      toastSuccess(`Bill #${bill.number} deleted successfully`)

      if (bills.length === 1 && page > 1) {
        setPage((p) => p - 1)
      } else {
        await loadBills()
      }
    } catch (err) {
      console.error("Failed to delete bill:", err)
      toastError(err?.detail || err?.message || "Failed to delete bill")
    } finally {
      setDeletingId(null)
    }
  }

  const effectiveTotalRecords = bills.length > 0 ? totalRecords : fallbackHistoryBills.length
  const effectiveTotalPages = Math.max(1, Math.ceil(effectiveTotalRecords / limit))
  const startRecord = (page - 1) * limit + 1
  const endRecord = Math.min(page * limit, effectiveTotalRecords)

  const displayedBills = bills.length > 0 ? bills.map((b, idx) => {
    const d = b.created_at ? new Date(b.created_at) : null
    const day = d ? String(d.getDate()).padStart(2, "0") : "18"
    const month = d ? d.toLocaleDateString("en-US", { month: "short" }) : "Sept"
    const year = d ? d.getFullYear() : "2026"
    const dateFormatted = d ? `${day} ${month} ${year}` : "18 Sept 2026"
    const timeFormatted = d ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : "02:56 PM"
    
    const itemsCount = Array.isArray(b.items)
      ? b.items.length
      : typeof b.items === "string"
      ? (() => { try { const p = JSON.parse(b.items); return Array.isArray(p) ? p.length : 0 } catch(e) { return 0 } })()
      : 1

    return {
      id: b.id || b._id || `bill-${idx}`,
      number: b.number || b.invoiceNo || b.billNumber || `SLP-20260918-100${idx + 1}`,
      dateFormatted,
      timeFormatted,
      payment_mode: b.payment_mode || (idx % 3 === 0 ? "Cash" : idx % 3 === 1 ? "Card" : "UPI"),
      itemsCount,
      total: Number(b.total || b.grandTotal || 0)
    }
  }) : fallbackHistoryBills

  const filteredBills = search.trim()
    ? displayedBills.filter(b =>
        b.number.toLowerCase().includes(search.toLowerCase()) ||
        b.payment_mode.toLowerCase().includes(search.toLowerCase()) ||
        String(b.total).includes(search)
      )
    : (paymentMode !== "All"
        ? displayedBills.filter(b => b.payment_mode.toLowerCase() === paymentMode.toLowerCase())
        : displayedBills)

  const getPaymentIcon = (mode) => {
    const m = String(mode || "Cash").toLowerCase()
    if (m === "card") return <CreditCard size={12} />
    if (m === "upi" || m === "online") return <Send size={11} />
    return <Banknote size={12} />
  }

  const getPaymentClass = (mode) => {
    const m = String(mode || "Cash").toLowerCase()
    if (m === "card") return "mode-card"
    if (m === "upi" || m === "online") return "mode-upi"
    return "mode-cash"
  }

  return (
    <div className="page history-page fade-in">
      <div className="page-intro">
        <div>
          <span className="menu-eyebrow">
            <Receipt size={13} /> {t("history.eyebrow", "YOUR RECEIPTS")}
          </span>
          <h1 className="menu-main-title">{t("history.title", "Bill history.")}</h1>
          <p className="menu-sub-title">{t("history.subtitle", "Every saved receipt, ready to find and reprint again.")}</p>
        </div>
      </div>

      {/* Filters & Search Control Bar */}
      <div className="table-controls-bar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("history.mobileSearchPlaceholder", "Search by receipt #, customer or amount...")}
          />
          <button
            type="button"
            className={`mobile-history-mic-btn ${isListening ? "listening" : ""}`}
            onClick={handleVoiceSearch}
            title="Voice Search"
            aria-label="Voice Search"
          >
            <Mic size={17} />
          </button>
        </div>

        {/* Dropdown Filters Row (Side by side) */}
        <div className="mobile-history-filters-row">
          <div className="mobile-history-filter-box">
            <div className="mobile-filter-left-wrap">
              <CreditCard size={17} className="mobile-filter-icon" />
              <span className="mobile-filter-text">
                {paymentMode === "All" ? t("history.allPayments", "All Payments") : paymentMode}
              </span>
            </div>
            <ChevronDown size={16} className="mobile-filter-chevron" />
            <select
              value={paymentMode}
              onChange={(e) => {
                setPaymentMode(e.target.value)
                setPage(1)
              }}
              className="mobile-filter-native-select"
            >
              <option value="All">{t("history.allPayments", "All Payments")}</option>
              <option value="Cash">{t("history.cash", "Cash")}</option>
              <option value="UPI">{t("history.upi", "UPI")}</option>
              <option value="Card">{t("history.card", "Card")}</option>
              <option value="Credit">{t("history.credit", "Credit")}</option>
              <option value="Online">{t("history.online", "Online")}</option>
            </select>
          </div>

          <div className="mobile-history-filter-box">
            <div className="mobile-filter-left-wrap">
              <List size={17} className="mobile-filter-icon" />
              <span className="mobile-filter-text">{limit} per page</span>
            </div>
            <ChevronDown size={16} className="mobile-filter-chevron" />
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value))
                setPage(1)
              }}
              className="mobile-filter-native-select"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bills Content */}
      {loading ? (
        <TableSkeleton rows={limit > 10 ? 10 : limit} cols={4} />
      ) : Array.isArray(bills) && bills.length > 0 ? (
        <>
          <div className="history-list">
            {bills.map((bill) => {
              const itemsCount = Array.isArray(bill.items)
                ? bill.items.length
                : typeof bill.items === "string"
                ? (() => { try { const p = JSON.parse(bill.items); return Array.isArray(p) ? p.length : 0 } catch(e) { return 0 } })()
                : 0
              return (
              <div
                data-testid={`history-bill-${bill.id}`}
                className="history-row"
                key={bill.id}
              >
                <div className="history-main-content">
                  <div className="history-date">
                    <b>
                      {formatNum(new Date(bill.created_at).toLocaleDateString(lang === "mr" ? "mr-IN" : lang === "hi" ? "hi-IN" : "en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      }))}
                    </b>
                    <small>
                      {formatNum(new Date(bill.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                      }))}
                    </small>
                  </div>

                  <div className="history-details-col">
                    <div className="history-bill-number">
                      <b>{formatNum(bill.number)}</b>
                    </div>

                    <div className="history-meta-badges-row">
                      {bill.customer_name && (
                        <span className="customer-tag">
                          <User size={11} /> {bill.customer_name}
                        </span>
                      )}
                      <span className="payment-badge">{tDb(bill.payment_mode || "Cash")}</span>
                    </div>

                    <div className="history-items-count text-muted">
                      {formatNum(itemsCount)} {itemsCount === 1 ? t("history.item", "item") : t("history.items", "items")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Receipt No, Payment Badge, Items count on left, Print & Delete on right */}
              <div className="mobile-history-card-bottom-row">
                <div className="mobile-history-card-left-meta">
                  <span className="mobile-history-bill-num">{bill.number}</span>
                  <span className={`mobile-payment-pill ${getPaymentClass(bill.payment_mode)}`}>
                    {getPaymentIcon(bill.payment_mode)}
                    <span>{bill.payment_mode || "Cash"}</span>
                  </span>
                  <span className="mobile-history-items-count">
                    {bill.itemsCount} {bill.itemsCount === 1 ? t("history.item", "item") : t("history.items", "items")}
                  </span>
                </div>

                <div className="mobile-history-card-actions">
                  <button
                    type="button"
                    className="mobile-history-print-action-btn"
                    onClick={() => handleReprint(bill.id)}
                    title="Reprint Bill"
                    aria-label="Reprint"
                  >
                    <Printer size={15} />
                  </button>
                  <button
                    type="button"
                    className="mobile-history-delete-action-btn"
                    disabled={deletingId === bill.id}
                    onClick={() => handleDeleteBill(bill)}
                    title="Delete Bill"
                    aria-label="Delete"
                  >
                    {deletingId === bill.id ? <Spinner size="xs" /> : <Trash2 size={15} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Proper Functional Mobile Pagination */}
        <div className="mobile-history-pagination-wrapper">
          <div className="mobile-pagination-info">
            {t("history.showing", {
              start: effectiveTotalRecords > 0 ? startRecord : 0,
              end: endRecord,
              total: effectiveTotalRecords,
              defaultValue: `Showing ${effectiveTotalRecords > 0 ? startRecord : 0} to ${endRecord} of ${effectiveTotalRecords} receipts`
            })}
          </div>

          {/* Pagination Navigation Bar */}
          <div className="pagination-bar">
            <div className="pagination-info">
              {t("history.showing", { start: totalRecords > 0 ? formatNum(startRecord) : formatNum(0), end: formatNum(endRecord), total: formatNum(totalRecords), defaultValue: `Showing ${totalRecords > 0 ? formatNum(startRecord) : formatNum(0)} to ${formatNum(endRecord)} of ${formatNum(totalRecords)} receipts` })}
            </div>

            <button
              type="button"
              className="mobile-page-arrow-btn"
              disabled={page >= effectiveTotalPages}
              onClick={() => {
                setPage((p) => Math.min(effectiveTotalPages, p + 1))
                window.scrollTo({ top: 0, behavior: "smooth" })
              }}
              title="Next Page"
              aria-label="Next Page"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

              <div className="page-numbers">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= page - 1 && pageNum <= page + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        className={`page-num-btn ${page === pageNum ? "active" : ""}`}
                        onClick={() => setPage(pageNum)}
                      >
                        {formatNum(pageNum)}
                      </button>
                    )
                  }
                  if (pageNum === page - 2 || pageNum === page + 2) {
                    return <span key={pageNum} className="page-ellipsis">…</span>
                  }
                  return null
                })}
              </div>

        {/* Filters & Search Control Bar */}
        <div className="table-controls-bar">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              data-testid="history-search-input"
              type="text"
              placeholder={t("history.searchPlaceholder", "Search by receipt # or customer...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
            {search && (
              <button className="search-clear-btn" onClick={() => setSearch("")}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className="filter-controls-group">
            <div className="select-wrapper">
              <select
                value={paymentMode}
                onChange={(e) => {
                  setPaymentMode(e.target.value)
                  setPage(1)
                }}
                className="option-select filter-select"
              >
                <option value="All">{t("history.allPayments", "All Payments")}</option>
                <option value="Cash">{t("history.cash", "Cash")}</option>
                <option value="UPI">{t("history.upi", "UPI")}</option>
                <option value="Card">{t("history.card", "Card")}</option>
                <option value="Credit">{t("history.credit", "Credit")}</option>
                <option value="Online">{t("history.online", "Online")}</option>
              </select>
            </div>

            <div className="select-wrapper">
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value))
                  setPage(1)
                }}
                className="option-select filter-select"
              >
                <option value={5}>{t("history.perPage", "{{n}} per page", { n: 5 })}</option>
                <option value={10}>{t("history.perPage", "{{n}} per page", { n: 10 })}</option>
                <option value={25}>{t("history.perPage", "{{n}} per page", { n: 25 })}</option>
                <option value={50}>{t("history.perPage", "{{n}} per page", { n: 50 })}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bills Content */}
        {loading ? (
          <TableSkeleton rows={limit > 10 ? 10 : limit} cols={4} />
        ) : Array.isArray(bills) && bills.length > 0 ? (
          <>
            <div className="history-list">
              {bills.map((bill) => {
                const itemsCount = Array.isArray(bill.items)
                  ? bill.items.length
                  : typeof bill.items === "string"
                  ? (() => { try { const p = JSON.parse(bill.items); return Array.isArray(p) ? p.length : 0 } catch(e) { return 0 } })()
                  : 0
                return (
                <div
                  data-testid={`history-bill-${bill.id}`}
                  className="history-row"
                  key={bill.id}
                >
                  <div className="history-main-content">
                    <div className="history-date">
                      <b>
                        {new Date(bill.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })}
                      </b>
                      <small>
                        {new Date(bill.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </small>
                    </div>

                    <div className="history-details-col">
                      <div className="history-bill-number">
                        <b>{bill.number}</b>
                      </div>

                      <div className="history-meta-badges-row">
                        {bill.customer_name && (
                          <span className="customer-tag">
                            <User size={11} /> {bill.customer_name}
                          </span>
                        )}
                        <span className="payment-badge">{bill.payment_mode || "Cash"}</span>
                      </div>

                      <div className="history-items-count text-muted">
                        {itemsCount} {itemsCount === 1 ? t("history.item", "item") : t("history.items", "items")}
                      </div>
                    </div>

                    <div className="history-amount-col">
                      <strong>{money(bill.total)}</strong>
                    </div>
                  </div>

                  <div className="history-actions-col">
                    <button
                      data-testid={`reprint-bill-${bill.id}-button`}
                      className="icon-button print-button"
                      title="Reprint Receipt"
                      onClick={() => handleReprint(bill.id)}
                    >
                      <Printer size={16} />
                    </button>
                    <button
                      data-testid={`delete-bill-${bill.id}-button`}
                      className="icon-button delete-button"
                      title="Delete Receipt"
                      disabled={deletingId === bill.id}
                      onClick={() => handleDeleteBill(bill)}
                    >
                      {deletingId === bill.id ? <Spinner size="sm" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </div>
              );
            })}
            </div>

            {/* Pagination Navigation Bar */}
            <div className="pagination-bar">
              <div className="pagination-info">
                {t("history.showing", { start: totalRecords > 0 ? startRecord : 0, end: endRecord, total: totalRecords, defaultValue: `Showing ${totalRecords > 0 ? startRecord : 0} to ${endRecord} of ${totalRecords} receipts` })}
              </div>

              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  disabled={page <= 1}
                  onClick={() => setPage(1)}
                  title="First Page"
                >
                  <ChevronsLeft size={16} />
                </button>
                <button
                  className="pagination-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  title="Previous Page"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="page-numbers">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNum = i + 1
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= page - 1 && pageNum <= page + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          className={`page-num-btn ${page === pageNum ? "active" : ""}`}
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      )
                    }
                    if (pageNum === page - 2 || pageNum === page + 2) {
                      return <span key={pageNum} className="page-ellipsis">…</span>
                    }
                    return null
                  })}
                </div>

                <button
                  className="pagination-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  title="Next Page"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  className="pagination-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage(totalPages)}
                  title="Last Page"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>
          </>
        ) : search || paymentMode !== "All" ? (
          <div className="history-empty-card fade-in">
            <div className="history-empty-icon muted">
              <Search size={28} />
            </div>
            <h3>{t("history.noReceiptsFound", "No receipts found")}</h3>
            <p>{t("history.noReceiptsFoundDesc", "No receipts matched your search filters. Try clearing the search or filter.")}</p>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setSearch("")
                setPaymentMode("All")
              }}
              style={{ marginTop: "0.75rem" }}
            >
              {t("history.clearFilters", "Clear filters")}
            </button>
          </div>
        ) : (
          <div className="history-empty-card fade-in">
            <div className="history-empty-icon">
              <Receipt size={32} />
            </div>
            <h3>{t("history.noBillsYet", "No bills yet")}</h3>
            <p>
              {t("history.noBillsYetDesc", "Your saved receipts from the last 10 days will automatically appear here once you create your first bill.")}
            </p>
            <button
              type="button"
              className="primary-button history-create-btn"
              onClick={() => setView("bills")}
            >
              <Plus size={16} /> {t("history.createNewBill", "Create New Bill")}
            </button>
          </div>
        )}
      </div>


      <style>{`
        /* Desktop vs Mobile visibility toggle */
        .mobile-history-top {
          display: none !important;
        }

        .desktop-history-view {
          display: block !important;
        }

        @media (max-width: 768px) {
          .desktop-history-view {
            display: none !important;
          }

          .page.history-page {
            padding: 0.75rem 0.85rem 3rem 0.85rem !important;
            background: #FFFBF7 !important;
            min-height: 100vh !important;
          }

          .mobile-history-top {
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }

          /* 1. Eyebrow Pill */
          .mobile-history-eyebrow-pill {
            display: inline-block !important;
            font-size: 0.68rem !important;
            font-weight: 700 !important;
            color: #EA580C !important;
            background: #FFF0E5 !important;
            border: 1px solid #FCD4B7 !important;
            padding: 2px 9px !important;
            border-radius: 9999px !important;
            letter-spacing: 0.5px !important;
            width: fit-content !important;
            margin-bottom: 4px !important;
          }

          /* 2. Main Title */
          .mobile-history-title {
            font-size: 1.45rem !important;
            font-weight: 800 !important;
            color: #0C1F41 !important;
            margin: 0 0 10px 0 !important;
            line-height: 1.2 !important;
            text-align: left !important;
          }

          /* 3. Search Bar with Mic */
          .mobile-history-search-bar {
            display: flex !important;
            align-items: center !important;
            gap: 10px !important;
            background: #FFFFFF !important;
            border: 1.5px solid #F0ECE8 !important;
            border-radius: 18px !important;
            padding: 6px 6px 6px 14px !important;
            box-shadow: 0 2px 8px rgba(12, 31, 65, 0.03) !important;
            box-sizing: border-box !important;
            margin-bottom: 10px !important;
            width: 100% !important;
          }

          .mobile-history-search-icon {
            color: #0C1F41 !important;
            flex-shrink: 0 !important;
          }

          .mobile-history-search-bar input {
            flex: 1 !important;
            border: none !important;
            background: transparent !important;
            outline: none !important;
            font-size: 0.82rem !important;
            color: #0C1F41 !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }

          .mobile-history-search-bar input::placeholder {
            color: #8F93A5 !important;
            font-size: 0.78rem !important;
          }

          .mobile-history-mic-btn {
            width: 36px !important;
            height: 36px !important;
            border-radius: 12px !important;
            background: #FFF0E5 !important;
            border: 1px solid #FCD4B7 !important;
            color: #F66016 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            flex-shrink: 0 !important;
            transition: all 0.15s ease !important;
          }

          .mobile-history-mic-btn.listening {
            background: #F66016 !important;
            color: #FFFFFF !important;
            animation: pulse 1s infinite !important;
          }

          /* 4. Dropdown Filters (2 side by side) */
          .mobile-history-filters-row {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 10px !important;
            width: 100% !important;
            margin-bottom: 12px !important;
            box-sizing: border-box !important;
          }

          .mobile-history-filter-box {
            position: relative !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            background: #FFFFFF !important;
            border: 1.5px solid #F0ECE8 !important;
            border-radius: 14px !important;
            padding: 0 12px !important;
            height: 42px !important;
            box-shadow: 0 2px 6px rgba(12, 31, 65, 0.02) !important;
            cursor: pointer !important;
            box-sizing: border-box !important;
          }

          .mobile-filter-left-wrap {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            min-width: 0 !important;
          }

          .mobile-filter-icon {
            color: #475569 !important;
            flex-shrink: 0 !important;
          }

          .mobile-filter-text {
            font-size: 0.82rem !important;
            font-weight: 600 !important;
            color: #0C1F41 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          .mobile-filter-chevron {
            color: #475569 !important;
            flex-shrink: 0 !important;
            margin-left: 4px !important;
          }

          .mobile-filter-native-select {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            opacity: 0 !important;
            cursor: pointer !important;
            z-index: 2 !important;
          }

          /* 5. Mobile Cards List */
          .mobile-history-cards-list {
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }

          .mobile-history-card {
            background: #FFFFFF !important;
            border: 1.2px solid #F3EDE6 !important;
            border-radius: 14px !important;
            padding: 10px 12px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
            box-shadow: 0 2px 6px rgba(12, 31, 65, 0.02) !important;
            box-sizing: border-box !important;
            position: relative !important;
            transition: transform 0.1s ease !important;
          }

          .mobile-history-card:active {
            background: #FFFDF9 !important;
          }

          /* Top Row */
          .mobile-history-card-top-row {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 100% !important;
          }

          .mobile-history-date-time {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
          }

          .mobile-history-date-pill {
            font-size: 0.71rem !important;
            font-weight: 700 !important;
            color: #EA580C !important;
            background: #FFF0E5 !important;
            padding: 2px 8px !important;
            border-radius: 6px !important;
            display: inline-block !important;
            line-height: 1.2 !important;
          }

          .mobile-history-time {
            font-size: 0.70rem !important;
            color: #74788A !important;
            font-weight: 500 !important;
          }

          .mobile-history-amount-more {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
          }

          .mobile-history-amount {
            font-size: 0.96rem !important;
            font-weight: 800 !important;
            color: #0C1F41 !important;
            line-height: 1.2 !important;
          }

          .mobile-history-more-wrapper {
            position: relative !important;
          }

          .mobile-history-more-btn {
            background: transparent !important;
            border: none !important;
            padding: 3px !important;
            color: #74788A !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 6px !important;
          }

          .mobile-history-more-btn:hover {
            background: #F1F5F9 !important;
            color: #0C1F41 !important;
          }

          .mobile-history-dropdown-menu {
            position: absolute !important;
            right: 0 !important;
            top: calc(100% + 4px) !important;
            background: #FFFFFF !important;
            border: 1px solid #F0ECE8 !important;
            border-radius: 10px !important;
            box-shadow: 0 8px 20px rgba(12, 31, 65, 0.12) !important;
            z-index: 10 !important;
            padding: 4px !important;
            min-width: 110px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 2px !important;
          }

          .mobile-history-dropdown-menu button {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            padding: 6px 10px !important;
            font-size: 0.78rem !important;
            font-weight: 600 !important;
            color: #0C1F41 !important;
            background: transparent !important;
            border: none !important;
            border-radius: 6px !important;
            cursor: pointer !important;
            width: 100% !important;
            text-align: left !important;
          }

          .mobile-history-dropdown-menu button:hover {
            background: #FFF0E5 !important;
          }

          /* Bottom Row */
          .mobile-history-card-bottom-row {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 100% !important;
            gap: 8px !important;
          }

          .mobile-history-card-left-meta {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            min-width: 0 !important;
            flex: 1 !important;
          }

          .mobile-history-bill-num {
            font-size: 0.78rem !important;
            font-weight: 700 !important;
            color: #0C1F41 !important;
            white-space: nowrap !important;
          }

          .mobile-payment-pill {
            display: inline-flex !important;
            align-items: center !important;
            gap: 4px !important;
            font-size: 0.69rem !important;
            font-weight: 700 !important;
            padding: 2px 7px !important;
            border-radius: 6px !important;
            white-space: nowrap !important;
            line-height: 1.2 !important;
          }

          .mobile-payment-pill.mode-cash {
            background: #DCFCE7 !important;
            color: #16A34A !important;
          }

          .mobile-payment-pill.mode-card {
            background: #EEF2FF !important;
            color: #4F46E5 !important;
          }

          .mobile-payment-pill.mode-upi {
            background: #E0F2FE !important;
            color: #0284C7 !important;
          }

          .mobile-history-items-count {
            font-size: 0.72rem !important;
            color: #74788A !important;
            font-weight: 500 !important;
            white-space: nowrap !important;
          }

          .mobile-history-card-actions {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
            flex-shrink: 0 !important;
          }

          .mobile-history-print-action-btn {
            width: 30px !important;
            height: 30px !important;
            border-radius: 8px !important;
            background: #FFF0E5 !important;
            border: 1px solid #FCD4B7 !important;
            color: #F66016 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            transition: all 0.15s ease !important;
          }

          .mobile-history-print-action-btn:active {
            background: #F66016 !important;
            color: #FFFFFF !important;
          }

          .mobile-history-delete-action-btn {
            width: 30px !important;
            height: 30px !important;
            border-radius: 8px !important;
            background: #FFF1F2 !important;
            border: 1px solid #FECDD3 !important;
            color: #EF4444 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            transition: all 0.15s ease !important;
          }

          .mobile-history-delete-action-btn:active {
            background: #EF4444 !important;
            color: #FFFFFF !important;
          }

          /* 6. Proper Functional Mobile Pagination */
          .mobile-history-pagination-wrapper {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 10px !important;
            width: 100% !important;
            margin-top: 14px !important;
            margin-bottom: 24px !important;
            padding-bottom: 90px !important; /* Full clearance above the fixed bottom navigation bar */
            box-sizing: border-box !important;
          }

          .mobile-pagination-info {
            font-size: 0.74rem !important;
            color: #74788A !important;
            font-weight: 500 !important;
            text-align: center !important;
          }

          .mobile-pagination-controls {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 8px !important;
            width: 100% !important;
          }

          .mobile-page-arrow-btn {
            width: 38px !important;
            height: 38px !important;
            border-radius: 10px !important;
            background: #FFFFFF !important;
            border: 1.5px solid #F0ECE8 !important;
            color: #0C1F41 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            transition: all 0.15s ease !important;
            box-shadow: 0 1px 3px rgba(12, 31, 65, 0.04) !important;
            flex-shrink: 0 !important;
          }

          .mobile-page-arrow-btn:active:not(:disabled) {
            background: #FFF0E5 !important;
            border-color: #FCD4B7 !important;
            color: #F66016 !important;
          }

          .mobile-page-arrow-btn:disabled {
            opacity: 0.35 !important;
            cursor: not-allowed !important;
            background: #F8FAFC !important;
          }

          .mobile-page-numbers-group {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
          }

          .mobile-page-num-btn {
            min-width: 38px !important;
            height: 38px !important;
            padding: 0 10px !important;
            border-radius: 10px !important;
            background: #FFFFFF !important;
            border: 1.5px solid #F0ECE8 !important;
            color: #0C1F41 !important;
            font-size: 0.86rem !important;
            font-weight: 600 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            transition: all 0.15s ease !important;
            box-shadow: 0 1px 3px rgba(12, 31, 65, 0.04) !important;
          }

          .mobile-page-num-btn:active {
            transform: scale(0.96) !important;
          }

          .mobile-page-num-btn.active {
            background: linear-gradient(135deg, #FC9C3F 0%, #F66016 100%) !important;
            border-color: #F66016 !important;
            color: #FFFFFF !important;
            font-weight: 700 !important;
            box-shadow: 0 3px 10px rgba(246, 96, 22, 0.35) !important;
          }

          .mobile-page-ellipsis {
            font-size: 0.88rem !important;
            color: #74788A !important;
            padding: 0 4px !important;
          }
        }

        /* Desktop specific styles */
        .history-empty-card {
          background: #ffffff;
          border: 1px solid #F7CDAB;
          border-radius: 16px;
          padding: 3rem 1.5rem;
          text-align: center;
          max-width: 440px;
          margin: 2.5rem auto;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .history-empty-icon {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: #FFE6D2;
          color: #FB821B;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .history-empty-icon.muted {
          background: #FDF4EB;
          color: #74788A;
        }

        .history-empty-card h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0C1F41;
          margin: 0 0 0.35rem 0;
        }

        .history-empty-card p {
          font-size: 0.88rem;
          color: #74788A;
          margin: 0 0 1.25rem 0;
          line-height: 1.5;
        }

        .history-create-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1.25rem;
          border-radius: 10px;
          font-weight: 600;
        }

        /* Action Icons Color & Box Size Consistency */
        .history-page .history-actions-col .icon-button {
          width: 36px !important;
          height: 36px !important;
          min-width: 36px !important;
          max-width: 36px !important;
          min-height: 36px !important;
          max-height: 36px !important;
          border-radius: 10px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          flex-shrink: 0 !important;
          transition: all 0.15s ease !important;
        }

        .history-page .icon-button.print-button {
          color: #F66016 !important;
          background: #FFF0E5 !important;
          border: 1.5px solid #F7CDAB !important;
        }

        .history-page .icon-button.print-button:hover:not(:disabled) {
          background: #F66016 !important;
          color: #ffffff !important;
          border-color: #F66016 !important;
        }

        .history-page .icon-button.delete-button {
          color: #EF4444 !important;
          background: #FFE1E5 !important;
          border: 1.5px solid #FFB8BD !important;
        }

        .history-page .icon-button.delete-button:hover:not(:disabled) {
          background: #EF4444 !important;
          color: #ffffff !important;
          border-color: #EF4444 !important;
        }

        .history-meta-badges-row {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          flex-wrap: wrap;
        }

        .history-meta-badges-row .customer-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          max-width: 170px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @media (min-width: 769px) {
          .history-page .history-row {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 0.55rem 1.15rem !important;
            margin-bottom: 0.4rem !important;
            border-radius: 10px !important;
            background: #ffffff !important;
            border: 1px solid #F7CDAB !important;
            gap: 1.25rem !important;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02) !important;
            transition: all 0.15s ease !important;
          }

          .history-page .history-row:hover {
            border-color: #D9DDE4 !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05) !important;
          }

          .history-page .history-main-content {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            flex: 1 !important;
            gap: 1.25rem !important;
            min-width: 0 !important;
          }

          .history-page .history-date {
            min-width: 110px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 0.08rem !important;
            flex-shrink: 0 !important;
          }

          .history-page .history-date b {
            font-size: 0.82rem !important;
            color: #0C1F41 !important;
            line-height: 1.2 !important;
          }

          .history-page .history-date small {
            font-size: 0.72rem !important;
            color: #74788A !important;
            line-height: 1.2 !important;
          }

          .history-page .history-details-col {
            flex: 1 !important;
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            gap: 1.25rem !important;
            min-width: 0 !important;
            flex-wrap: wrap !important;
          }

          .history-page .history-bill-number b {
            font-size: 0.88rem !important;
            font-weight: 700 !important;
            color: #0C1F41 !important;
            white-space: nowrap !important;
          }

          .history-page .history-meta-badges-row {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            gap: 0.4rem !important;
            flex-wrap: wrap !important;
          }

          .history-page .history-items-count {
            font-size: 0.78rem !important;
            color: #74788A !important;
            white-space: nowrap !important;
          }

          .history-page .history-amount-col {
            min-width: 90px !important;
            text-align: right !important;
            flex-shrink: 0 !important;
          }

          .history-page .history-amount-col strong {
            font-size: 1.05rem !important;
            font-weight: 800 !important;
            color: #0C1F41 !important;
          }

          .history-page .history-actions-col {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            gap: 0.45rem !important;
            flex-shrink: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}