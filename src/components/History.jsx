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
  Trash2
} from "lucide-react"
import { call, money, getCachedData } from "../lib/utils"
import { TableSkeleton, Spinner } from "./common/Skeleton"
import { useToast } from "./common/Toast"
import Swal from "sweetalert2"

export function History({ setView, setSelectedBillId }) {
  const cachedData = getCachedData("/bills?page=1&limit=10&days_limit=10")
  const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000

  const filter10Days = (list) => {
    if (!Array.isArray(list)) return []
    const cutoff = Date.now() - TEN_DAYS_MS
    return list.filter((b) => b && b.created_at && new Date(b.created_at).getTime() >= cutoff)
  }

  const [bills, setBills] = useState(() => {
    if (cachedData?.bills) return filter10Days(cachedData.bills)
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

  const { success: toastSuccess, error: toastError } = useToast()

  const loadBills = async () => {
    try {
      if (bills.length === 0) setLoading(true)
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        days_limit: "10"
      })
      if (search.trim()) queryParams.append("search", search.trim())
      if (paymentMode !== "All") queryParams.append("payment_mode", paymentMode)

      const data = await call(`/bills?${queryParams.toString()}`)

      if (data && typeof data === "object" && !Array.isArray(data) && data.bills) {
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

  const handleDeleteBill = async (bill) => {
    if (deletingId) return
    const result = await Swal.fire({
      title: "Delete this bill?",
      html: `<div style="font-size: 0.95rem; color: #475569; margin-top: 0.35rem;">
        Are you sure you want to delete bill <b style="color: #0f172a;">${bill.number}</b> (${money(bill.total)})?
      </div>
      <div style="font-size: 0.82rem; color: #ef4444; margin-top: 0.5rem; font-weight: 600;">
        This action cannot be undone.
      </div>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
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

                <div className="history-actions-col">
                  <button
                    data-testid={`reprint-bill-${bill.id}-button`}
                    className="icon-button"
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
      ) : search || paymentMode !== "All" ? (
        <div className="history-empty-card fade-in">
          <div className="history-empty-icon muted">
            <Search size={28} />
          </div>
          <h3>No receipts found</h3>
          <p>No receipts matched your search filters. Try clearing the search or filter.</p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setSearch("")
              setPaymentMode("All")
            }}
            style={{ marginTop: "0.75rem" }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="history-empty-card fade-in">
          <div className="history-empty-icon">
            <Receipt size={32} />
          </div>
          <h3>No bills yet</h3>
          <p>
            Your saved receipts from the last 10 days will automatically appear here once you create your first bill.
          </p>
          <button
            type="button"
            className="primary-button history-create-btn"
            onClick={() => setView("bills")}
          >
            <Plus size={16} /> Create New Bill
          </button>
        </div>
      )}

      <style>{`
        .history-empty-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
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
          color: #0ea5e9;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .history-empty-icon.muted {
          background: #f1f5f9;
          color: #64748b;
        }

        .history-empty-card h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 0.35rem 0;
        }

        .history-empty-card p {
          font-size: 0.88rem;
          color: #64748b;
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

        @media (max-width: 640px) {
          .history-empty-card {
            padding: 2rem 1.25rem !important;
            margin: 1.5rem auto !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }

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

          .history-actions-col {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .history-page .history-row .delete-button {
            color: #ef4444;
            background: #fef2f2;
          }

          .history-page .history-row .delete-button:hover:not(:disabled) {
            background: #fee2e2;
            color: #dc2626;
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

          .history-page .history-actions-col {
            position: absolute;
            top: 0.75rem;
            right: 0.75rem;
            display: flex;
            align-items: center;
            gap: 0.35rem;
          }

          .history-page .history-actions-col .icon-button {
            min-width: 38px;
            min-height: 38px;
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