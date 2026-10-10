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
  Utensils,
  Banknote,
  Bookmark,
  Pencil,
  Check,
  Clock
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

  const [activeTab, setActiveTab] = useState("saved") // "saved" | "printed"
  const [savedCount, setSavedCount] = useState(0)
  const [printedCount, setPrintedCount] = useState(0)

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

  const dateLocale = lang === "mr" ? "mr-IN" : lang === "hi" ? "hi-IN" : "en-IN"

  const formatDateLocale = (dateVal) => {
    if (!dateVal) return ""
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return String(dateVal)
    return d.toLocaleDateString(dateLocale, { day: "2-digit", month: "short", year: "numeric" })
  }

  const formatTimeLocale = (dateVal) => {
    if (!dateVal) return ""
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return String(dateVal)
    return d.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", hour12: true })
  }

  const fallbackHistoryBills = [
    { id: "1", number: "SLP-20260918-1001", created_at: "2026-09-18T14:56:00Z", payment_mode: "Cash", itemsCount: 2, total: 0 },
    { id: "2", number: "SLP-20260917-1002", created_at: "2026-09-17T11:20:00Z", payment_mode: "Card", itemsCount: 5, total: 560 },
    { id: "3", number: "SLP-20260916-1003", created_at: "2026-09-16T18:45:00Z", payment_mode: "UPI", itemsCount: 3, total: 320 },
    { id: "4", number: "SLP-20260915-1004", created_at: "2026-09-15T13:10:00Z", payment_mode: "Cash", itemsCount: 1, total: 120 },
    { id: "5", number: "SLP-20260914-1005", created_at: "2026-09-14T09:30:00Z", payment_mode: "Card", itemsCount: 4, total: 890 },
    { id: "6", number: "SLP-20260913-1006", created_at: "2026-09-13T16:15:00Z", payment_mode: "Cash", itemsCount: 6, total: 430 },
    { id: "7", number: "SLP-20260912-1007", created_at: "2026-09-12T12:05:00Z", payment_mode: "UPI", itemsCount: 2, total: 275 },
    { id: "8", number: "SLP-20260911-1008", created_at: "2026-09-11T19:40:00Z", payment_mode: "Card", itemsCount: 8, total: 1150 },
    { id: "9", number: "SLP-20260910-1009", created_at: "2026-09-10T15:25:00Z", payment_mode: "Cash", itemsCount: 3, total: 690 },
    { id: "10", number: "SLP-20260009-1010", created_at: "2026-09-09T10:10:00Z", payment_mode: "UPI", itemsCount: 7, total: 980 }
  ]

  const loadBills = async () => {
    try {
      if (!Array.isArray(bills) || bills.length === 0) setLoading(true)
      const isSavedVal = activeTab === "saved" ? "true" : "false"
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        days_limit: "10",
        is_saved: isSavedVal
      })
      if (search.trim()) queryParams.append("search", search.trim())
      if (paymentMode !== "All") queryParams.append("payment_mode", paymentMode)

      const oppositeIsSaved = activeTab === "saved" ? "false" : "true"
      const [data, oppositeData] = await Promise.all([
        call(`/bills?${queryParams.toString()}`),
        call(`/bills?page=1&limit=1&days_limit=10&is_saved=${oppositeIsSaved}`).catch(() => ({}))
      ])

      const curTotal = (data && typeof data === "object" && data.total !== undefined)
        ? Number(data.total)
        : (Array.isArray(data?.bills) ? data.bills.length : (Array.isArray(data) ? data.length : 0))

      const otherTotal = (oppositeData && typeof oppositeData === "object" && oppositeData.total !== undefined)
        ? Number(oppositeData.total)
        : 0

      if (activeTab === "saved") {
        setSavedCount(curTotal)
        setPrintedCount(otherTotal)
      } else {
        setPrintedCount(curTotal)
        setSavedCount(otherTotal)
      }

      if (data && typeof data === "object" && !Array.isArray(data) && Array.isArray(data.bills)) {
        const filtered = filter10Days(data.bills)
        setBills(filtered)
        setTotalRecords(data.total !== undefined ? data.total : filtered.length)
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
  }, [page, limit, paymentMode, activeTab, user?.id])

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

  const handleEditBill = (bill) => {
    const billToEdit = bill?.rawBill || bill
    sessionStorage.setItem("slipzo_edit_bill", JSON.stringify(billToEdit))
    if (billToEdit.table_number) {
      sessionStorage.setItem("slipzo_edit_table", billToEdit.table_number)
      setView("tables")
    } else {
      setView("bills")
    }
  }

  const handleDeleteBill = async (bill) => {
    if (deletingId) return
    const result = await Swal.fire({
      title: t("history.deleteTitle", "Delete this bill?"),
      html: `<div style="font-size: 0.95rem; color: #575B6B; margin-top: 0.35rem;">
        ${t("history.deleteConfirm", "Are you sure you want to delete bill")} <b style="color: #0C1F41;">${bill.number}</b> (${money(bill.total ?? bill.total_amount ?? bill.amount)})?
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

  const effectiveTotalRecords = bills.length > 0 ? totalRecords : (user ? 0 : fallbackHistoryBills.length)
  const effectiveTotalPages = Math.max(1, Math.ceil(effectiveTotalRecords / limit))
  const startRecord = (page - 1) * limit + 1
  const endRecord = Math.min(page * limit, effectiveTotalRecords)

  const displayedBills = bills.length > 0 ? bills.map((b, idx) => {
    const rawDate = b.created_at || b.date
    const dateFormatted = rawDate ? formatDateLocale(rawDate) : (b.dateFormatted ? b.dateFormatted : formatDateLocale("2026-09-18T14:56:00Z"))
    const timeFormatted = rawDate ? formatTimeLocale(rawDate) : (b.timeFormatted ? b.timeFormatted : formatTimeLocale("2026-09-18T14:56:00Z"))
    
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
      total: Number(b.total !== undefined && b.total !== null ? b.total : (b.total_amount !== undefined && b.total_amount !== null ? b.total_amount : (b.amount || 0))),
      table_number: b.table_number,
      customer_name: b.customer_name,
      customer_phone: b.customer_phone,
      items: b.items,
      discount: b.discount,
      tax_rate: b.tax_rate,
      rawBill: b
    }
  }) : (user ? [] : fallbackHistoryBills)

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
            <Banknote size={13} /> {t("history.eyebrow", "YOUR RECEIPTS")}
          </span>
          <h1 className="menu-main-title">{t("history.title", "Bill history.")}</h1>
          <p className="menu-sub-title">{t("history.subtitle", "Every saved receipt, ready to find and reprint again.")}</p>
        </div>
      </div>

      {/* 2-Part Tab Switcher: Saved Bills & Print Bills */}
      <div className="history-tab-switcher-wrapper">
        <div className="history-tab-switcher" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "saved"}
            data-testid="history-tab-saved"
            className={`history-tab-btn ${activeTab === "saved" ? "active" : ""}`}
            onClick={() => {
              if (activeTab !== "saved") {
                setActiveTab("saved")
                setPage(1)
              }
            }}
          >
            <Bookmark size={15} />
            <span className="history-tab-text">{t("history.savedBills", tDb("Saved Bills"))}</span>
            <span className="history-tab-badge">{formatNum(savedCount)}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "printed"}
            data-testid="history-tab-printed"
            className={`history-tab-btn ${activeTab === "printed" ? "active" : ""}`}
            onClick={() => {
              if (activeTab !== "printed") {
                setActiveTab("printed")
                setPage(1)
              }
            }}
          >
            <Printer size={15} />
            <span className="history-tab-text">{t("history.printBills", tDb("Print Bills"))}</span>
            <span className="history-tab-badge">{formatNum(printedCount)}</span>
          </button>
        </div>
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
        ) : Array.isArray(filteredBills) && filteredBills.length > 0 ? (
          <>
            <div className="history-list">
              {filteredBills.map((bill) => {
                const rawDate = bill.created_at || bill.rawBill?.created_at
                const dateStr = rawDate ? formatDateLocale(rawDate) : (bill.dateFormatted || "18 Sept 2026")
                const timeStr = rawDate ? formatTimeLocale(rawDate) : (bill.timeFormatted || "02:56 PM")

                const itemsCount = typeof bill.itemsCount === "number" ? bill.itemsCount : (
                  Array.isArray(bill.items)
                    ? bill.items.length
                    : typeof bill.items === "string"
                    ? (() => { try { const p = JSON.parse(bill.items); return Array.isArray(p) ? p.length : 0 } catch(e) { return 0 } })()
                    : 1
                )

                const itemsLabel = itemsCount === 1 ? "1 item" : `${itemsCount} items`
                const invoiceNum = bill.number || bill.invoiceNo || bill.billNumber || `SLP-${bill.id}`

                return (
                  <div
                    data-testid={`history-bill-${bill.id}`}
                    className="history-row-card"
                    key={bill.id}
                  >
                    <div className="history-card-top-group">
                      <div className="history-main-info-group">
                        {/* 2. Invoice No. */}
                        <div className="history-col-invoice">
                          <span className="history-invoice-num">{invoiceNum}</span>
                          {(bill.customer_name || bill.table_number) && (
                            <div className="history-sub-meta-row">
                              {bill.customer_name && (
                                <span className="history-sub-meta">
                                  <User size={11} /> {bill.customer_name}
                                </span>
                              )}
                              {bill.table_number && (
                                <span className="history-sub-meta">
                                  <Utensils size={10} /> {bill.table_number}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 1. Date & Time */}
                        <div className="history-col-date">
                          <span className="history-date-main">{dateStr}</span>
                          <span className="history-time-sub">{timeStr}</span>
                        </div>
                      </div>

                      {/* Total Amount for Mobile Top Row */}
                      <div className="history-col-total mobile-only-total">
                        <strong>{money(bill.total ?? bill.total_amount ?? bill.amount)}</strong>
                      </div>
                    </div>

                    <div className="history-card-bottom-group">
                      {/* 3. Payment Mode & Status */}
                      <div className="history-col-payment">
                        <span className={`history-payment-badge ${getPaymentClass(bill.payment_mode)}`}>
                          {tDb(bill.payment_mode || "Cash")}
                        </span>
                        {activeTab === "printed" && (
                          ((bill.payment_mode || "").toLowerCase() === "credit" || (bill.status || "").toLowerCase() === "pending") ? (
                            <span className="history-status-badge-pending">
                              <Clock size={11} strokeWidth={2.5} />
                              <span>{t("common.pending", "Pending")}</span>
                            </span>
                          ) : (
                            <span className="history-status-badge-paid">
                              <Check size={11} strokeWidth={2.5} />
                              <span>{t("common.paid", "Paid")}</span>
                            </span>
                          )
                        )}
                      </div>

                      {/* 4. Items Count */}
                      <div className="history-col-items">
                        <span>{itemsLabel}</span>
                      </div>

                      {/* 5. Total Amount (Desktop Grid Column) */}
                      <div className="history-col-total desktop-only-total">
                        <strong>{money(bill.total ?? bill.total_amount ?? bill.amount)}</strong>
                      </div>

                      {/* 6. Actions */}
                      <div className="history-col-actions">
                        {activeTab === "saved" && (
                          <button
                            data-testid={`edit-bill-${bill.id}-button`}
                            className="history-edit-bill-btn"
                            title={t("history.editBill", "Edit Bill")}
                            onClick={() => handleEditBill(bill.rawBill || bill)}
                          >
                            <Pencil size={13} />
                            <span>{t("common.edit", "Edit")}</span>
                          </button>
                        )}
                        <button
                          data-testid={`reprint-bill-${bill.id}-button`}
                          className="history-action-btn print"
                          title={activeTab === "saved" ? t("history.printBill", "Print Bill") : t("history.reprint", "Reprint Receipt")}
                          onClick={() => handleReprint(bill.id)}
                        >
                          <Printer size={15} />
                        </button>
                        <button
                          data-testid={`delete-bill-${bill.id}-button`}
                          className="history-action-btn delete"
                          title={t("history.delete", "Delete Receipt")}
                          disabled={deletingId === bill.id}
                          onClick={() => handleDeleteBill(bill.rawBill || bill)}
                        >
                          {deletingId === bill.id ? <Spinner size="sm" /> : <Trash2 size={15} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )
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
              {activeTab === "saved" ? <Bookmark size={32} /> : <Receipt size={32} />}
            </div>
            <h3>
              {activeTab === "saved"
                ? t("history.noSavedBillsYet", "No saved bills yet")
                : t("history.noPrintedBillsYet", "No printed bills yet")}
            </h3>
            <p>
              {activeTab === "saved"
                ? t("history.noSavedBillsDesc", "Saved bills and orders from the last 10 days will automatically appear here. You can reopen, edit items, and finalize them anytime.")
                : t("history.noPrintedBillsDesc", "Printed thermal receipts from the last 10 days will appear here, ready to find and reprint.")}
            </p>
            {activeTab === "saved" && (
              <button
                type="button"
                className="primary-button history-create-btn"
                onClick={() => setView("bills")}
              >
                <Plus size={16} /> {t("history.createNewBill", "Create New Bill")}
              </button>
            )}
          </div>
        )}

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
            color: #0284c7 !important;
            background: #e0f2fe !important;
            border: 1px solid #bae6fd !important;
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
            background: #e0f2fe !important;
            border: 1px solid #bae6fd !important;
            color: #0284c7 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            flex-shrink: 0 !important;
            transition: all 0.15s ease !important;
          }

          .mobile-history-mic-btn.listening {
            background: #0284c7 !important;
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
            color: #0284c7 !important;
            background: #f0f9ff !important;
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
            background: #f0f9ff !important;
            color: #0284c7 !important;
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
            background: #f0f9ff !important;
            border: 1px solid #bae6fd !important;
            color: #0284c7 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            transition: all 0.15s ease !important;
          }

          .mobile-history-print-action-btn:active {
            background: #0284c7 !important;
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
            background: #f0f9ff !important;
            border-color: #bae6fd !important;
            color: #0284c7 !important;
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
            background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%) !important;
            border-color: #0284c7 !important;
            color: #FFFFFF !important;
            font-weight: 700 !important;
            box-shadow: 0 3px 10px rgba(2, 132, 199, 0.35) !important;
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
          border: 1px solid #bae6fd;
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
          background: #e0f2fe;
          color: #0284c7;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .history-empty-icon.muted {
          background: #f0f9ff;
          color: #0284c7;
          border: 1px solid #bae6fd;
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

        /* Desktop Controls Row */
        .page.history-page .table-controls-bar {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 0.75rem !important;
          margin: 1.25rem 0 1.25rem 0 !important;
          flex-wrap: nowrap !important;
          width: 100% !important;
        }

        .page.history-page .search-input-wrapper {
          flex: 1 !important;
          min-width: 280px !important;
          height: 48px !important;
          background: #ffffff !important;
          border: 1px solid #d5e0eb !important;
          border-radius: 12px !important;
        }

        .page.history-page .filter-controls-group {
          display: flex !important;
          align-items: center !important;
          gap: 0.65rem !important;
          flex-shrink: 0 !important;
        }

        .page.history-page .filter-select {
          height: 48px !important;
          background: #ffffff !important;
          border: 1px solid #d5e0eb !important;
          border-radius: 12px !important;
          padding: 0 2rem 0 0.9rem !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          color: #0C1F41 !important;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04) !important;
          outline: none !important;
          cursor: pointer !important;
          transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
        }

        .page.history-page .filter-select:focus {
          border-color: #0284c7 !important;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15) !important;
        }

        /* History Row Card - Clean Responsive Slipzo Design */
        .history-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          width: 100%;
        }

        .history-row-card {
          display: grid !important;
          grid-template-columns: 105px 170px 145px 95px 1fr auto !important;
          align-items: center !important;
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 10px !important;
          padding: 0.45rem 1rem !important;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02) !important;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease !important;
          min-height: 48px !important;
          box-sizing: border-box !important;
          gap: 0.75rem !important;
          width: 100% !important;
        }

        .history-card-top-group,
        .history-main-info-group,
        .history-card-bottom-group {
          display: contents !important;
        }

        .mobile-only-total {
          display: none !important;
        }

        .desktop-only-total {
          display: block !important;
        }

        .history-row-card:hover {
          border-color: #0284c7 !important;
          box-shadow: 0 3px 8px rgba(15, 23, 42, 0.05) !important;
          transform: translateY(-1px) !important;
        }

        .history-col-date {
          display: flex;
          flex-direction: column;
          min-width: 100px;
          flex-shrink: 0;
          order: 1 !important;
        }

        .history-date-main {
          font-size: 0.83rem;
          font-weight: 700;
          color: #0C1F41;
          line-height: 1.15;
        }

        .history-time-sub {
          font-size: 0.70rem;
          color: #64748b;
          margin-top: 1px;
          line-height: 1.15;
        }

        .history-col-invoice {
          display: flex;
          flex-direction: column;
          flex: 1.5;
          min-width: 140px;
          order: 2 !important;
        }

        .history-invoice-num {
          font-size: 0.88rem;
          font-weight: 700;
          color: #0C1F41;
          letter-spacing: -0.2px;
          white-space: nowrap;
        }

        .history-sub-meta-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex-wrap: wrap;
          margin-top: 1px;
        }

        .history-sub-meta {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 0.72rem;
          color: #64748b;
        }

        .history-col-payment {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-width: 75px;
          flex-shrink: 0;
          order: 3 !important;
        }

        .history-status-badge-paid {
          display: inline-flex;
          align-items: center;
          gap: 3.5px;
          padding: 0.15rem 0.55rem;
          background: #dcfce7 !important;
          border: 1px solid #bbf7d0 !important;
          border-radius: 6px !important;
          font-size: 0.75rem !important;
          font-weight: 700 !important;
          color: #15803d !important;
          white-space: nowrap !important;
          line-height: 1.25;
        }

        .history-status-badge-pending {
          display: inline-flex;
          align-items: center;
          gap: 3.5px;
          padding: 0.15rem 0.55rem;
          background: #fef3c7 !important;
          border: 1px solid #fde68a !important;
          border-radius: 6px !important;
          font-size: 0.75rem !important;
          font-weight: 700 !important;
          color: #b45309 !important;
          white-space: nowrap !important;
          line-height: 1.25;
        }

        .history-payment-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.15rem 0.55rem;
          background: #f1f5f9 !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 6px !important;
          font-size: 0.78rem !important;
          font-weight: 600 !important;
          color: #475569 !important;
          text-transform: capitalize;
        }

        .history-payment-badge.mode-card,
        .history-payment-badge.mode-cash,
        .history-payment-badge.mode-upi {
          background: #f1f5f9 !important;
          border-color: #e2e8f0 !important;
          color: #475569 !important;
        }

        .history-col-items {
          min-width: 75px;
          font-size: 0.82rem;
          color: #64748b;
          font-weight: 500;
          flex-shrink: 0;
          order: 4 !important;
        }

        .history-col-total {
          min-width: 100px;
          text-align: right;
          flex-shrink: 0;
          order: 5 !important;
          padding-right: 0.75rem;
        }

        .history-col-total strong {
          font-size: 0.98rem;
          font-weight: 800;
          color: #0C1F41;
        }

        .history-col-actions {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          flex-shrink: 0;
          order: 6 !important;
          margin-left: 0.75rem;
        }

        .history-action-btn {
          width: 34px !important;
          height: 34px !important;
          min-width: 34px !important;
          min-height: 34px !important;
          border-radius: 8px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          transition: all 0.15s ease !important;
          box-sizing: border-box !important;
        }

        /* 2-Part Tab Switcher */
        .history-tab-switcher-wrapper {
          display: flex;
          align-items: center;
          margin-bottom: 1.25rem;
          width: 100%;
        }

        .history-tab-switcher {
          display: inline-flex;
          align-items: center;
          background: #f1f5f9;
          border: 1.5px solid #e2e8f0;
          border-radius: 14px;
          padding: 4px;
          gap: 4px;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.03);
        }

        .history-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 18px;
          border-radius: 10px;
          font-size: 0.88rem;
          font-weight: 600;
          border: none;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          transition: all 0.18s ease;
          user-select: none;
        }

        .history-tab-btn:hover:not(.active) {
          background: #e2e8f0;
          color: #0f172a;
        }

        .history-tab-btn.active {
          background: #0284c7;
          color: #ffffff;
          box-shadow: 0 3px 10px rgba(2, 132, 199, 0.28);
        }

        .history-tab-btn.active svg {
          color: #ffffff;
        }

        .history-tab-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 999px;
          line-height: 1;
        }

        .history-tab-btn.active .history-tab-badge {
          background: rgba(255, 255, 255, 0.25);
          color: #ffffff;
        }

        .history-tab-btn:not(.active) .history-tab-badge {
          background: #e2e8f0;
          color: #475569;
        }

        .history-edit-bill-btn {
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%) !important;
          color: #ffffff !important;
          border: 1px solid #0284c7 !important;
          padding: 6px 14px !important;
          border-radius: 9px !important;
          font-size: 0.82rem !important;
          font-weight: 700 !important;
          cursor: pointer !important;
          box-shadow: 0 2px 8px rgba(2, 132, 199, 0.25) !important;
          transition: all 0.18s ease !important;
          white-space: nowrap !important;
          height: 34px !important;
          box-sizing: border-box !important;
        }

        .history-edit-bill-btn:hover {
          background: linear-gradient(135deg, #0369a1 0%, #075985 100%) !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35) !important;
        }

        .history-edit-bill-btn:active {
          transform: scale(0.97) !important;
        }

        .history-edit-bill-btn svg {
          color: #ffffff !important;
        }

        .history-action-btn.print {
          background: #f0f9ff !important;
          border: 1px solid #bae6fd !important;
          color: #0284c7 !important;
        }

        .history-action-btn.print:hover:not(:disabled) {
          background: #0284c7 !important;
          color: #ffffff !important;
          border-color: #0284c7 !important;
        }

        .history-action-btn.delete {
          background: #fef2f2 !important;
          border: 1px solid #fca5a5 !important;
          color: #ef4444 !important;
        }

        .history-action-btn.delete:hover:not(:disabled) {
          background: #ef4444 !important;
          color: #ffffff !important;
          border-color: #ef4444 !important;
        }

        /* --------------------------------------------------------
           MOBILE RESPONSIVE BILL CARDS (<= 768px down to 320px)
           -------------------------------------------------------- */
        @media (max-width: 768px) {
          .history-list {
            gap: 0.65rem !important;
          }

          .history-row-card {
            display: flex !important;
            flex-direction: column !important;
            gap: 0.5rem !important;
            padding: 0.85rem 0.95rem !important;
            border-radius: 14px !important;
            min-height: unset !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }

          .history-card-top-group {
            display: flex !important;
            align-items: flex-start !important;
            justify-content: space-between !important;
            width: 100% !important;
            gap: 0.5rem !important;
          }

          .history-main-info-group {
            display: flex !important;
            flex-direction: column !important;
            gap: 2px !important;
            flex: 1 !important;
            min-width: 0 !important;
          }

          .history-col-invoice {
            order: 1 !important;
            min-width: 0 !important;
            width: 100% !important;
          }

          .history-invoice-num {
            font-size: 0.88rem !important;
            font-weight: 700 !important;
            color: #0284c7 !important;
            white-space: nowrap !important;
            display: block !important;
            letter-spacing: -0.2px !important;
          }

          .history-col-date {
            order: 2 !important;
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            gap: 6px !important;
            margin-top: 1px !important;
            min-width: unset !important;
          }

          .history-date-main {
            font-size: 0.74rem !important;
            font-weight: 600 !important;
            color: #475569 !important;
            white-space: nowrap !important;
          }

          .history-time-sub {
            font-size: 0.70rem !important;
            color: #94a3b8 !important;
            white-space: nowrap !important;
            margin-top: 0 !important;
          }

          .mobile-only-total {
            display: block !important;
            text-align: right !important;
            margin-left: auto !important;
            flex-shrink: 0 !important;
            min-width: unset !important;
            white-space: nowrap !important;
          }

          .mobile-only-total strong {
            font-size: 1.05rem !important;
            font-weight: 800 !important;
            color: #0C1F41 !important;
            white-space: nowrap !important;
          }

          .history-card-bottom-group {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 100% !important;
            gap: 0.5rem !important;
            padding-top: 0.45rem !important;
            border-top: 1px dashed #f1f5f9 !important;
          }

          .desktop-only-total {
            display: none !important;
          }

          .history-col-payment {
            display: inline-flex !important;
            align-items: center !important;
            gap: 4px !important;
            min-width: unset !important;
            flex-shrink: 0 !important;
          }

          .history-payment-badge {
            font-size: 0.72rem !important;
            padding: 0.12rem 0.45rem !important;
            font-weight: 600 !important;
            white-space: nowrap !important;
          }

          .history-status-badge-paid,
          .history-status-badge-pending {
            font-size: 0.70rem !important;
            padding: 0.12rem 0.45rem !important;
            border-radius: 5px !important;
          }

          .history-col-items {
            min-width: unset !important;
            flex-shrink: 0 !important;
            font-size: 0.76rem !important;
            color: #64748b !important;
            white-space: nowrap !important;
          }

          .history-col-actions {
            display: flex !important;
            align-items: center !important;
            gap: 0.6rem !important;
            margin-left: auto !important;
            flex-shrink: 0 !important;
          }

          .history-tab-switcher-wrapper {
            margin-bottom: 0.85rem !important;
          }

          .history-tab-switcher {
            width: 100% !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            box-sizing: border-box !important;
          }

          .history-tab-btn {
            justify-content: center !important;
            padding: 8px 10px !important;
            font-size: 0.82rem !important;
            gap: 6px !important;
          }

          .history-edit-bill-btn {
            height: 32px !important;
            padding: 5px 10px !important;
            font-size: 0.78rem !important;
            border-radius: 8px !important;
            gap: 4px !important;
          }

          .history-action-btn {
            width: 32px !important;
            height: 32px !important;
            min-width: 32px !important;
            min-height: 32px !important;
            border-radius: 8px !important;
          }
        }
      `}</style>
    </div>
  )
}