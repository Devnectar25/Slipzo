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
  Calendar
} from "lucide-react"
import { call, money } from "../lib/utils"
import { TableSkeleton } from "./common/Skeleton"
import { useToast } from "./common/Toast"

export function History({ setView, setSelectedBillId }) {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalRecords, setTotalRecords] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState("")
  const [paymentMode, setPaymentMode] = useState("All")

  const { error: toastError } = useToast()

  const loadBills = async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(limit)
      })
      if (search.trim()) queryParams.append("search", search.trim())
      if (paymentMode !== "All") queryParams.append("payment_mode", paymentMode)

      const data = await call(`/bills?${queryParams.toString()}`)
      
      if (data && typeof data === "object" && !Array.isArray(data) && data.bills) {
        setBills(data.bills)
        setTotalRecords(data.total || 0)
        setTotalPages(data.totalPages || 1)
      } else {
        // Fallback for non-paginated format
        const billsList = Array.isArray(data) ? data : []
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
  }, [page, limit, paymentMode])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      loadBills()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const handleReprint = (billId) => {
    setSelectedBillId(billId)
    sessionStorage.setItem("slipzo-reprint-id", billId)
    setView("reprint")
  }

  const startRecord = (page - 1) * limit + 1
  const endRecord = Math.min(page * limit, totalRecords)

  return (
    <div className="page history-page fade-in">
      <div className="page-intro">
        <div>
          <p className="eyebrow accent">YOUR RECEIPTS</p>
          <h2>Bill history.</h2>
          <p className="subtle">Every saved receipt, ready to find and reprint again.</p>
        </div>
      </div>

      {/* Filters & Search Control Bar */}
      <div className="table-controls-bar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            data-testid="history-search-input"
            type="text"
            placeholder="Search by receipt # or customer..."
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
              <option value="All">All Payments</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="Credit">Credit</option>
              <option value="Online">Online</option>
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
      ) : bills.length > 0 ? (
        <>
          <div className="history-list">
            {bills.map((bill) => (
              <div
                data-testid={`history-bill-${bill.id}`}
                className="history-row"
                key={bill.id}
              >
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
                    {bill.customer_name && (
                      <span className="customer-tag">
                        <User size={11} /> {bill.customer_name}
                      </span>
                    )}
                  </div>
                  <small className="text-muted">
                    {bill.items?.length || 0} {bill.items?.length === 1 ? "item" : "items"} ·{" "}
                    <span className="payment-badge">{bill.payment_mode || "Cash"}</span>
                  </small>
                </div>

                <div className="history-amount-col">
                  <strong>{money(bill.total)}</strong>
                </div>

                <button
                  data-testid={`reprint-bill-${bill.id}-button`}
                  className="icon-button"
                  title="Reprint Receipt"
                  onClick={() => handleReprint(bill.id)}
                >
                  <Printer size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Pagination Navigation Bar */}
          <div className="pagination-bar">
            <div className="pagination-info">
              Showing <span>{totalRecords > 0 ? startRecord : 0}</span> to{" "}
              <span>{endRecord}</span> of <span>{totalRecords}</span> receipts
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
      ) : (
        <div className="empty fade-in">
          <Receipt size={32} />
          <h3>{search || paymentMode !== "All" ? "No receipts found" : "No receipts yet"}</h3>
          <p>
            {search || paymentMode !== "All"
              ? "No receipts matched your search filters. Try clearing the search."
              : "Your saved receipts will automatically show up here."}
          </p>
          {(search || paymentMode !== "All") && (
            <button
              className="secondary-button"
              onClick={() => {
                setSearch("")
                setPaymentMode("All")
              }}
              style={{ marginTop: "1rem" }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .history-page .table-controls-bar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.5rem !important;
          }

          .history-page .filter-controls-group {
            flex-direction: column !important;
            width: 100% !important;
            gap: 0.5rem !important;
          }

          .history-page .select-wrapper,
          .history-page .filter-select {
            width: 100% !important;
            min-height: 44px !important;
          }

          .history-page .history-row {
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0.5rem !important;
            position: relative;
            padding: 0.85rem !important;
          }

          .history-page .history-amount-col {
            margin-top: 0.2rem;
          }

          .history-page .history-row .icon-button {
            position: absolute;
            top: 0.75rem;
            right: 0.75rem;
            min-width: 44px;
            min-height: 44px;
          }

          .history-page .pagination-bar {
            flex-direction: column !important;
            gap: 0.75rem !important;
            align-items: center !important;
            text-align: center;
          }

          .history-page .pagination-controls {
            flex-wrap: wrap !important;
            justify-content: center !important;
            gap: 0.35rem !important;
          }

          .history-page .pagination-btn,
          .history-page .page-num-btn {
            min-width: 38px;
            min-height: 38px;
          }
        }
      `}</style>
    </div>
  )
}