import { useEffect, useState, useMemo } from "react"
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  MapPin,
  FileText,
  Edit2,
  Trash2,
  Receipt,
  ArrowRight,
  X,
  Plus,
  IndianRupee,
  Clock,
  Building2,
  ExternalLink
} from "lucide-react"
import { call, money } from "../lib/utils"
import { TableSkeleton, MetricSkeleton, ButtonLoader } from "./common/Skeleton"
import { useToast } from "./common/Toast"

export function Customers({ setView, requireAuth, onSelectCustomerForBill }) {
  const [customers, setCustomers] = useState([])
  const [stats, setStats] = useState({ totalCustomers: 0, activeCustomers: 0, totalRevenue: 0 })
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [search, setSearch] = useState("")

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)

  // Detail Drawer state
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerBills, setCustomerBills] = useState([])
  const [billsLoading, setBillsLoading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    gstin: "",
    notes: ""
  })

  const { success, error: toastError } = useToast()

  const loadData = async (searchTerm = "") => {
    try {
      setLoading(true)
      const data = await call(`/customers${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ""}`)
      setCustomers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Failed to load customers:", err)
      toastError(err.message || "Failed to load customers")
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      setStatsLoading(true)
      const data = await call("/customers/stats")
      setStats(data || { totalCustomers: 0, activeCustomers: 0, totalRevenue: 0 })
    } catch (err) {
      console.error("Failed to load customer stats:", err)
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    loadStats()
  }, [])

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      loadData(search)
    }, 300)
    return () => clearTimeout(handler)
  }, [search])

  const openAddModal = () => {
    setEditingCustomer(null)
    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      gstin: "",
      notes: ""
    })
    setShowModal(true)
  }

  const openEditModal = (customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      gstin: customer.gstin || "",
      notes: customer.notes || ""
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toastError("Customer name is required")
      return
    }

    try {
      setModalLoading(true)
      if (editingCustomer) {
        await call(`/customers/${editingCustomer.id}`, {
          method: "PUT",
          body: JSON.stringify(formData)
        })
        success("Customer updated successfully")
      } else {
        await call("/customers", {
          method: "POST",
          body: JSON.stringify(formData)
        })
        success("Customer added successfully")
      }
      setShowModal(false)
      loadData(search)
      loadStats()
    } catch (err) {
      console.error("Failed to save customer:", err)
      toastError(err.message || "Failed to save customer")
    } finally {
      setModalLoading(false)
    }
  }

  const handleDelete = async (customer) => {
    if (!window.confirm(`Are you sure you want to delete ${customer.name}?`)) {
      return
    }

    try {
      await call(`/customers/${customer.id}`, { method: "DELETE" })
      success("Customer deleted successfully")
      if (selectedCustomer?.id === customer.id) {
        setSelectedCustomer(null)
      }
      loadData(search)
      loadStats()
    } catch (err) {
      console.error("Failed to delete customer:", err)
      toastError(err.message || "Failed to delete customer")
    }
  }

  const handleViewCustomer = async (customer) => {
    setSelectedCustomer(customer)
    setBillsLoading(true)
    try {
      const bills = await call(`/customers/${customer.id}/bills`)
      setCustomerBills(Array.isArray(bills) ? bills : [])
    } catch (err) {
      console.error("Failed to load customer bills:", err)
      setCustomerBills([])
    } finally {
      setBillsLoading(false)
    }
  }

  const handleCreateBillForCustomer = (customer) => {
    sessionStorage.setItem("slipzo-selected-customer", JSON.stringify({
      id: customer.id,
      name: customer.name,
      phone: customer.phone
    }))
    setView("bills")
  }

  return (
    <div className="page customers-page fade-in">
      {/* Header */}
      <div className="page-intro">
        <div>
          <p className="eyebrow accent">RELATIONSHIPS</p>
          <h2>Customer Directory</h2>
          <p className="subtle">Keep track of regular clients and their billing history.</p>
        </div>
        <button
          data-testid="add-customer-button"
          className="primary-button"
          onClick={openAddModal}
          style={{ whiteSpace: 'nowrap' }}
        >
          <UserPlus size={18} /> Add Customer
        </button>
      </div>

      {/* Metrics Banner */}
      {statsLoading ? (
        <MetricSkeleton count={3} />
      ) : (
        <div className="stats">
          <div className="stat">
            <span>Total Customers</span>
            <b>{stats.totalCustomers}</b>
            <small>Registered in your database</small>
          </div>
          <div className="stat">
            <span>Active (30 Days)</span>
            <b>{stats.activeCustomers}</b>
            <small>Clients with recent bills</small>
          </div>
          <div className="stat">
            <span>Customer Revenue</span>
            <b>{money(stats.totalRevenue)}</b>
            <small>Total spend across customers</small>
          </div>
        </div>
      )}

      {/* Search & Actions Bar */}
      <div className="table-controls-bar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            data-testid="customer-search-input"
            type="text"
            placeholder="Search by name, phone, or email..."
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
      </div>

      {/* Customers List / Table */}
      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : customers.length > 0 ? (
        <div className="customer-table-wrapper">
          {/* Desktop Table (hidden on mobile) */}
          <table className="customer-table desktop-only">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Bills</th>
                <th>Total Spent</th>
                <th>Last Active</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="customer-row">
                  <td>
                    <div className="customer-cell-main" onClick={() => handleViewCustomer(c)}>
                      <div className="avatar-chip">
                        {(c.name || "C")[0].toUpperCase()}
                      </div>
                      <div>
                        <strong className="customer-name-link">{c.name}</strong>
                        {c.gstin && <small className="customer-gstin">GST: {c.gstin}</small>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="contact-cell">
                      {c.phone && (
                        <a href={`tel:${c.phone}`} className="contact-link">
                          <Phone size={13} /> {c.phone}
                        </a>
                      )}
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="contact-link subtle-link">
                          <Mail size={13} /> {c.email}
                        </a>
                      )}
                      {!c.phone && !c.email && <span className="text-muted">—</span>}
                    </div>
                  </td>
                  <td>
                    <span className="badge-pill">
                      {c.total_bills} {c.total_bills === 1 ? "bill" : "bills"}
                    </span>
                  </td>
                  <td>
                    <strong>{money(c.total_spent)}</strong>
                  </td>
                  <td>
                    <span className="text-muted">
                      {c.last_bill_date
                        ? new Date(c.last_bill_date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })
                        : "No bills yet"}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions-cell">
                      <button
                        className="icon-button"
                        title="New bill for this customer"
                        onClick={() => handleCreateBillForCustomer(c)}
                      >
                        <Receipt size={16} />
                      </button>
                      <button
                        className="icon-button"
                        title="View profile & history"
                        onClick={() => handleViewCustomer(c)}
                      >
                        <ExternalLink size={16} />
                      </button>
                      <button
                        className="icon-button"
                        title="Edit customer"
                        onClick={() => openEditModal(c)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="icon-button danger"
                        title="Delete customer"
                        onClick={() => handleDelete(c)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Cards (shown on mobile only) */}
          <div className="customer-mobile-list mobile-only">
            {customers.map((c) => (
              <div className="customer-mobile-card" key={c.id}>
                <div className="customer-mobile-header" onClick={() => handleViewCustomer(c)}>
                  <div className="avatar-chip large">
                    {(c.name || "C")[0].toUpperCase()}
                  </div>
                  <div className="customer-mobile-info">
                    <strong className="customer-name-link">{c.name}</strong>
                    {c.gstin && <small>GST: {c.gstin}</small>}
                  </div>
                  <span className="badge-pill">
                    {c.total_bills} {c.total_bills === 1 ? "bill" : "bills"}
                  </span>
                </div>

                <div className="customer-mobile-details">
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="contact-link">
                      <Phone size={13} /> {c.phone}
                    </a>
                  )}
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="contact-link subtle-link">
                      <Mail size={13} /> {c.email}
                    </a>
                  )}
                  <span className="customer-mobile-spent">
                    <strong>{money(c.total_spent)}</strong>
                    <small>Total spent</small>
                  </span>
                </div>

                <div className="customer-mobile-actions">
                  <button
                    className="icon-button"
                    title="New bill for this customer"
                    onClick={() => handleCreateBillForCustomer(c)}
                  >
                    <Receipt size={16} />
                  </button>
                  <button
                    className="icon-button"
                    title="View profile & history"
                    onClick={() => handleViewCustomer(c)}
                  >
                    <ExternalLink size={16} />
                  </button>
                  <button
                    className="icon-button"
                    title="Edit customer"
                    onClick={() => openEditModal(c)}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="icon-button danger"
                    title="Delete customer"
                    onClick={() => handleDelete(c)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty fade-in">
          <Users size={36} />
          <h3>{search ? "No matching customers found" : "No customers added yet"}</h3>
          <p>
            {search
              ? `No customer matches "${search}". Try a different keyword.`
              : "Save client contact details to quickly assign them when creating bills."}
          </p>
          {!search && (
            <button className="primary-button" onClick={openAddModal} style={{ marginTop: "1rem" }}>
              <Plus size={16} /> Add First Customer
            </button>
          )}
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {showModal && (
        <div className="modal-backdrop fade-in" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCustomer ? "Edit Customer" : "Add New Customer"}</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>
                  Customer Name *
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Ramesh Kumar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </label>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    Phone Number
                    <input
                      type="tel"
                      placeholder="98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </label>
                </div>
                <div className="form-group">
                  <label>
                    Email Address
                    <input
                      type="email"
                      placeholder="ramesh@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>
                  Billing Address
                  <input
                    type="text"
                    placeholder="Shop #4, Main Market, City"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </label>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    GSTIN / Tax ID
                    <input
                      type="text"
                      placeholder="e.g. 27ABCDE1234F1Z5"
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    />
                  </label>
                </div>
                <div className="form-group">
                  <label>
                    Notes
                    <input
                      type="text"
                      placeholder="e.g. VIP wholesale client"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowModal(false)}
                  disabled={modalLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={modalLoading}
                >
                  {modalLoading ? <ButtonLoader text="Saving..." /> : editingCustomer ? "Update Customer" : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Details & History Modal */}
      {selectedCustomer && (
        <div className="modal-backdrop fade-in" onClick={() => setSelectedCustomer(null)}>
          <div className="modal-card modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="customer-detail-title">
                <div className="avatar-chip large">
                  {(selectedCustomer.name || "C")[0].toUpperCase()}
                </div>
                <div>
                  <h3>{selectedCustomer.name}</h3>
                  <p className="subtle">Customer since {new Date(selectedCustomer.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedCustomer(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Quick Customer Info Cards */}
            <div className="customer-info-grid">
              <div className="info-box">
                <span className="info-label"><Phone size={13} /> Phone</span>
                <strong>{selectedCustomer.phone || "Not specified"}</strong>
              </div>
              <div className="info-box">
                <span className="info-label"><Mail size={13} /> Email</span>
                <strong>{selectedCustomer.email || "Not specified"}</strong>
              </div>
              <div className="info-box">
                <span className="info-label"><Building2 size={13} /> GSTIN</span>
                <strong>{selectedCustomer.gstin || "N/A"}</strong>
              </div>
              <div className="info-box">
                <span className="info-label"><IndianRupee size={13} /> Lifetime Spend</span>
                <strong className="text-accent">{money(selectedCustomer.total_spent)}</strong>
              </div>
            </div>

            {selectedCustomer.address && (
              <div className="address-banner">
                <MapPin size={15} />
                <span>{selectedCustomer.address}</span>
              </div>
            )}

            {selectedCustomer.notes && (
              <div className="notes-banner">
                <FileText size={15} />
                <span>{selectedCustomer.notes}</span>
              </div>
            )}

            {/* Purchase History */}
            <div className="customer-history-section">
              <div className="section-subtitle-bar">
                <h4>Receipts History ({customerBills.length})</h4>
                <button
                  className="primary-button small"
                  onClick={() => handleCreateBillForCustomer(selectedCustomer)}
                >
                  <Plus size={14} /> New Bill
                </button>
              </div>

              {billsLoading ? (
                <TableSkeleton rows={3} cols={4} />
              ) : customerBills.length > 0 ? (
                <div className="customer-bills-list">
                  {customerBills.map((b) => (
                    <div key={b.id} className="history-row mini-row">
                      <div className="history-date">
                        <b>{new Date(b.created_at).toLocaleDateString()}</b>
                        <small>{new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                      </div>
                      <div>
                        <b>{b.number}</b>
                        <small>{b.items?.length || 0} items · {b.payment_mode}</small>
                      </div>
                      <strong>{money(b.total)}</strong>
                      <button
                        className="icon-button"
                        onClick={() => {
                          setSelectedCustomer(null)
                          setView("reprint")
                          sessionStorage.setItem("slipzo-reprint-id", b.id)
                        }}
                        title="Reprint Receipt"
                      >
                        <Receipt size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty compact">
                  <Receipt size={24} />
                  <p>No bills recorded for this customer yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Responsive Styles */}
      <style>{`
        /* Show mobile cards, hide desktop table on small screens */
        .desktop-only {
          display: none !important;
        }

        .mobile-only {
          display: block !important;
        }

        /* Mobile Card Styles */
        .customer-mobile-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 0.75rem;
        }

        .customer-mobile-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
          cursor: pointer;
        }

        .customer-mobile-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .customer-mobile-info strong {
          font-size: 1rem;
          color: #0f172a;
        }

        .customer-mobile-info small {
          font-size: 0.75rem;
          color: #64748b;
        }

        .customer-mobile-details {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.75rem 0;
          border-top: 1px solid #f1f5f9;
          border-bottom: 1px solid #f1f5f9;
          margin-bottom: 0.75rem;
        }

        .customer-mobile-spent {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.25rem;
        }

        .customer-mobile-spent strong {
          font-size: 1rem;
          color: #0f172a;
        }

        .customer-mobile-spent small {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .customer-mobile-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.25rem;
        }

        /* Responsive Breakpoints */
        @media (min-width: 768px) {
          .desktop-only {
            display: table !important;
          }

          .mobile-only {
            display: none !important;
          }
        }

        /* Override stats grid for small screens to prevent overlap */
        @media (max-width: 640px) {
          .stats {
            grid-template-columns: 1fr !important;
            gap: 0.75rem !important;
          }
          
          .stats .stat {
            min-width: 100% !important;
          }

          .page-intro {
            flex-direction: column;
            align-items: stretch;
          }

          .page-intro .primary-button {
            width: 100%;
            justify-content: center;
          }

          .table-controls-bar {
            flex-direction: column;
            align-items: stretch;
          }
          
          .search-input-wrapper {
            min-width: 100% !important;
          }

          .customer-table-wrapper {
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
          }
          
          .history-row {
            grid-template-columns: 1fr !important;
            gap: 0.5rem !important;
            padding: 0.75rem !important;
          }
          
          .history-row .history-date,
          .history-row > div {
            margin-bottom: 0.25rem;
          }
          
          .history-row .icon-button {
            justify-self: flex-end;
          }
        }
      `}</style>
    </div>
  )
}