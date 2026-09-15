import { useState, useEffect } from "react"
import {
  ShieldCheck,
  Users,
  Store,
  Receipt,
  Mail,
  RefreshCw,
  LogOut,
  Search,
  Activity,
  Server,
  Package,
  Calendar,
  CheckCircle,
  Clock,
  ArrowUpRight,
  LayoutTemplate,
  Tag,
  Crown,
  Zap,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { call } from "../../lib/utils"
import Swal from "sweetalert2"
import "../../styles/Admin.css"

export function AdminDashboard({ admin, onLogout }) {
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(true)
  const [statsData, setStatsData] = useState(null)
  const [usersList, setUsersList] = useState([])
  const [billsList, setBillsList] = useState([])
  const [contactsList, setContactsList] = useState([])
  const [templatesList, setTemplatesList] = useState([])
  const [productsList, setProductsList] = useState([])
  const [planBuyersList, setPlanBuyersList] = useState([])
  const [searchQuery, setSearchQuery] = useState("")

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery, pageSize])

  const loadAdminData = async () => {
    setLoading(true)
    const headers = getAdminHeaders()
    try {
      const statsRes = await call("/admin/stats", { headers }).catch(() => null)
      if (statsRes && statsRes.stats) {
        setStatsData(statsRes)
      }

      const usersRes = await call("/admin/users", { headers }).catch(() => null)
      if (usersRes && usersRes.users) {
        setUsersList(usersRes.users)
      }

      const billsRes = await call("/admin/bills", { headers }).catch(() => null)
      if (billsRes && billsRes.bills) {
        setBillsList(billsRes.bills)
      }

      const contactsRes = await call("/admin/contacts", { headers }).catch(() => null)
      if (contactsRes && contactsRes.contacts) {
        setContactsList(contactsRes.contacts)
      }

      const templatesRes = await call("/admin/templates", { headers }).catch(() => null)
      if (templatesRes && templatesRes.templates) {
        setTemplatesList(templatesRes.templates)
      }

      const productsRes = await call("/admin/products", { headers }).catch(() => null)
      if (productsRes && productsRes.products) {
        setProductsList(productsRes.products)
      }

      const buyersRes = await call("/admin/plan-buyers", { headers }).catch(() => null)
      if (buyersRes && buyersRes.planBuyers) {
        setPlanBuyersList(buyersRes.planBuyers)
      }
    } catch (err) {
      console.error("Failed to load admin dashboard data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdminData()
  }, [])

  const getAdminHeaders = () => {
    const token = localStorage.getItem('slipzo_admin_token') || localStorage.getItem('slipzo_token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  const handleGrantCredits = async (user) => {
    const { value: printCount } = await Swal.fire({
      title: `Grant Print Credits`,
      text: `Enter print credits to add for ${user.user_name || user.name || user.email}:`,
      input: 'number',
      inputValue: 1000,
      showCancelButton: true,
      confirmButtonColor: '#0ea5e9',
      confirmButtonText: 'Grant Credits',
      inputValidator: (value) => {
        if (!value || parseInt(value) <= 0) {
          return 'Please enter a valid positive number'
        }
      }
    })

    if (printCount) {
      try {
        const res = await call(`/admin/users/${user.user_id || user.id}/grant-prints`, {
          method: 'POST',
          headers: getAdminHeaders(),
          body: JSON.stringify({ printsToGrant: parseInt(printCount) })
        })
        Swal.fire({
          title: 'Success!',
          text: res?.detail || `Granted ${printCount} prints successfully!`,
          icon: 'success',
          confirmButtonColor: '#0ea5e9'
        })
        loadAdminData()
      } catch (err) {
        Swal.fire('Error', err?.detail || err?.message || 'Failed to grant prints', 'error')
      }
    }
  }

  const handleAddTemplate = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Add New Bill Template',
      html: `
        <div style="text-align: left; font-size: 0.9rem;">
          <label style="font-weight: 600; display: block; margin-bottom: 4px; color: #334155;">Template Name</label>
          <input id="swal-template-name" class="swal2-input" placeholder="e.g. Premium Thermal Invoice" style="width: 100%; margin: 0 0 12px 0; box-sizing: border-box;" />
          
          <label style="font-weight: 600; display: block; margin-bottom: 4px; color: #334155;">Category</label>
          <select id="swal-template-cat" class="swal2-input" style="width: 100%; margin: 0 0 12px 0; box-sizing: border-box;">
            <option value="Business">Business</option>
            <option value="Thermal">Thermal</option>
            <option value="Minimal">Minimal</option>
            <option value="Retail">Retail</option>
            <option value="Tax">Tax Invoice</option>
            <option value="Standard">Standard</option>
          </select>
          
          <label style="font-weight: 600; display: block; margin-bottom: 4px; color: #334155;">Paper Width</label>
          <select id="swal-template-width" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box;">
            <option value="58mm">58mm (2-inch Thermal)</option>
            <option value="80mm">80mm (3-inch POS)</option>
            <option value="A4">A4 Full Sheet</option>
          </select>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Create Template',
      confirmButtonColor: '#0ea5e9',
      preConfirm: () => {
        const name = document.getElementById('swal-template-name').value;
        const category = document.getElementById('swal-template-cat').value;
        const width = document.getElementById('swal-template-width').value;
        if (!name || !name.trim()) {
          Swal.showValidationMessage('Template name is required');
          return false;
        }
        return { name, category, width };
      }
    });

    if (formValues) {
      try {
        await call('/admin/templates', {
          method: 'POST',
          headers: getAdminHeaders(),
          body: JSON.stringify(formValues)
        });
        Swal.fire({ title: 'Success!', text: 'New template created successfully', icon: 'success', confirmButtonColor: '#0ea5e9' });
        loadAdminData();
      } catch (err) {
        Swal.fire('Error', err?.detail || err?.message || 'Failed to create template', 'error');
      }
    }
  }

  const handleEditTemplate = async (template) => {
    const { value: formValues } = await Swal.fire({
      title: 'Edit Bill Template',
      html: `
        <div style="text-align: left; font-size: 0.9rem;">
          <label style="font-weight: 600; display: block; margin-bottom: 4px; color: #334155;">Template Name</label>
          <input id="swal-edit-template-name" class="swal2-input" value="${template.name || ''}" style="width: 100%; margin: 0 0 12px 0; box-sizing: border-box;" />
          
          <label style="font-weight: 600; display: block; margin-bottom: 4px; color: #334155;">Category</label>
          <select id="swal-edit-template-cat" class="swal2-input" style="width: 100%; margin: 0 0 12px 0; box-sizing: border-box;">
            <option value="Business" ${template.category === 'Business' ? 'selected' : ''}>Business</option>
            <option value="Thermal" ${template.category === 'Thermal' ? 'selected' : ''}>Thermal</option>
            <option value="Minimal" ${template.category === 'Minimal' ? 'selected' : ''}>Minimal</option>
            <option value="Retail" ${template.category === 'Retail' ? 'selected' : ''}>Retail</option>
            <option value="Tax" ${template.category === 'Tax' ? 'selected' : ''}>Tax Invoice</option>
            <option value="Standard" ${template.category === 'Standard' ? 'selected' : ''}>Standard</option>
          </select>
          
          <label style="font-weight: 600; display: block; margin-bottom: 4px; color: #334155;">Paper Width</label>
          <select id="swal-edit-template-width" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box;">
            <option value="58mm" ${template.width === '58mm' ? 'selected' : ''}>58mm (2-inch Thermal)</option>
            <option value="80mm" ${template.width === '80mm' ? 'selected' : ''}>80mm (3-inch POS)</option>
            <option value="A4" ${template.width === 'A4' ? 'selected' : ''}>A4 Full Sheet</option>
          </select>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Update Template',
      confirmButtonColor: '#0ea5e9',
      preConfirm: () => {
        const name = document.getElementById('swal-edit-template-name').value;
        const category = document.getElementById('swal-edit-template-cat').value;
        const width = document.getElementById('swal-edit-template-width').value;
        if (!name || !name.trim()) {
          Swal.showValidationMessage('Template name is required');
          return false;
        }
        return { name, category, width };
      }
    });

    if (formValues) {
      try {
        await call(`/admin/templates/${template.id}`, {
          method: 'PUT',
          headers: getAdminHeaders(),
          body: JSON.stringify(formValues)
        });
        Swal.fire({ title: 'Updated!', text: 'Template updated successfully', icon: 'success', confirmButtonColor: '#0ea5e9' });
        loadAdminData();
      } catch (err) {
        Swal.fire('Error', err?.detail || err?.message || 'Failed to update template', 'error');
      }
    }
  }

  const handleDeleteTemplate = async (template) => {
    const confirm = await Swal.fire({
      title: 'Delete Template?',
      text: `Are you sure you want to delete "${template.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, Delete'
    });

    if (confirm.isConfirmed) {
      try {
        await call(`/admin/templates/${template.id}`, {
          method: 'DELETE',
          headers: getAdminHeaders()
        });
        Swal.fire({ title: 'Deleted!', text: 'Template has been deleted', icon: 'success', confirmButtonColor: '#0ea5e9' });
        loadAdminData();
      } catch (err) {
        Swal.fire('Error', err?.detail || err?.message || 'Failed to delete template', 'error');
      }
    }
  }

  const filteredUsers = usersList.filter(u => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.shop_name && u.shop_name.toLowerCase().includes(q)) ||
      (u.shop_phone && u.shop_phone.toLowerCase().includes(q))
    )
  })

  const filteredPlanBuyers = planBuyersList.filter(b => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (b.user_name && b.user_name.toLowerCase().includes(q)) ||
      (b.user_email && b.user_email.toLowerCase().includes(q)) ||
      (b.plan_name && b.plan_name.toLowerCase().includes(q)) ||
      (b.shop_name && b.shop_name.toLowerCase().includes(q))
    )
  })

  const filteredProducts = productsList.filter(p => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.shop_name && p.shop_name.toLowerCase().includes(q)) ||
      (p.user_name && p.user_name.toLowerCase().includes(q))
    )
  })

  const filteredTemplates = templatesList.filter(t => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.category && t.category.toLowerCase().includes(q)) ||
      (t.shop_name && t.shop_name.toLowerCase().includes(q))
    )
  })

  const filteredBills = billsList.filter(b => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (b.bill_number && b.bill_number.toLowerCase().includes(q)) ||
      (b.customer_name && b.customer_name.toLowerCase().includes(q)) ||
      (b.shop_name && b.shop_name.toLowerCase().includes(q)) ||
      (b.user_email && b.user_email.toLowerCase().includes(q))
    )
  })

  const filteredContacts = contactsList.filter(c => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.topic && c.topic.toLowerCase().includes(q)) ||
      (c.message && c.message.toLowerCase().includes(q))
    )
  })

  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const paginatedPlanBuyers = filteredPlanBuyers.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const paginatedTemplates = filteredTemplates.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const paginatedBills = filteredBills.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const paginatedContacts = filteredContacts.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const renderPagination = (totalItems) => {
    if (!totalItems || totalItems === 0) return null
    const totalPages = Math.ceil(totalItems / pageSize) || 1
    const startItem = (currentPage - 1) * pageSize + 1
    const endItem = Math.min(currentPage * pageSize, totalItems)

    return (
      <div className="admin-pagination">
        <div className="admin-pagination-info">
          Showing <strong>{startItem}</strong> - <strong>{endItem}</strong> of <strong>{totalItems}</strong> entries
        </div>
        <div className="admin-pagination-controls">
          <div className="admin-pagination-size">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="admin-select-input"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="admin-pagination-nav">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="admin-page-btn"
            >
              <ChevronLeft size={15} /> Prev
            </button>
            <span className="admin-page-num">
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="admin-page-btn"
            >
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-dashboard-container">
      {/* Admin Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <img src="/logo.png" alt="Slipzo Admin" className="admin-sidebar-logo" />
          <div style={{ marginTop: "0.5rem" }}>
            <span className="admin-tag admin-tag-blue">
              <ShieldCheck size={12} /> Super Admin
            </span>
          </div>
        </div>

        <nav className="admin-nav">
          <button
            className={`admin-nav-item ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => { setActiveTab("overview"); setSearchQuery(""); }}
          >
            <Activity size={18} />
            <span>Overview Stats</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === "users" ? "active" : ""}`}
            onClick={() => { setActiveTab("users"); setSearchQuery(""); }}
          >
            <Users size={18} />
            <span>Users & Shops</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === "plan_buyers" ? "active" : ""}`}
            onClick={() => { setActiveTab("plan_buyers"); setSearchQuery(""); }}
          >
            <Crown size={18} />
            <span>Plan Buyer Users</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === "products" ? "active" : ""}`}
            onClick={() => { setActiveTab("products"); setSearchQuery(""); }}
          >
            <Package size={18} />
            <span>Product Catalog</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === "templates" ? "active" : ""}`}
            onClick={() => { setActiveTab("templates"); setSearchQuery(""); }}
          >
            <LayoutTemplate size={18} />
            <span>Manage Templates</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === "bills" ? "active" : ""}`}
            onClick={() => { setActiveTab("bills"); setSearchQuery(""); }}
          >
            <Receipt size={18} />
            <span>Bill History</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === "contacts" ? "active" : ""}`}
            onClick={() => { setActiveTab("contacts"); setSearchQuery(""); }}
          >
            <Mail size={18} />
            <span>Support Messages</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === "system" ? "active" : ""}`}
            onClick={() => { setActiveTab("system"); setSearchQuery(""); }}
          >
            <Server size={18} />
            <span>System Health</span>
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <button className="admin-logout-btn" onClick={onLogout}>
            <LogOut size={16} /> Logout Admin
          </button>
        </div>
      </aside>

      {/* Admin Main Content */}
      <main className="admin-main-content">
        <header className="admin-topbar">
          <h2 className="admin-topbar-title">
            {activeTab === "overview" && "System Dashboard Overview"}
            {activeTab === "users" && "User & Shop Directory"}
            {activeTab === "plan_buyers" && "Plan Buyer Users & Print Quotas"}
            {activeTab === "products" && "System Product Catalog Management"}
            {activeTab === "templates" && "Manage Bill Templates"}
            {activeTab === "bills" && "System Bill Logs"}
            {activeTab === "contacts" && "Customer Support Inquiries"}
            {activeTab === "system" && "Server Diagnostics & Environment"}
          </h2>

          <div className="admin-topbar-actions">
            <button className="admin-refresh-btn" onClick={loadAdminData} disabled={loading}>
              <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
            </button>
            <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
              {admin?.email || "admin@slipzo.com"}
            </span>
          </div>
        </header>

        <div className="admin-body">
          {activeTab === "overview" && (
            <>
              <div className="admin-stats-grid">
                <div className="admin-stat-card">
                  <div className="admin-stat-icon" style={{ background: "#e0f2fe", color: "#0284c7" }}>
                    <Users size={24} />
                  </div>
                  <div>
                    <h3 className="admin-stat-val">{statsData?.stats?.totalUsers || 0}</h3>
                    <p className="admin-stat-lbl">Registered Users</p>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-icon" style={{ background: "#f3e8ff", color: "#7e22ce" }}>
                    <Store size={24} />
                  </div>
                  <div>
                    <h3 className="admin-stat-val">{statsData?.stats?.totalShops || 0}</h3>
                    <p className="admin-stat-lbl">Shops Setup</p>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-icon" style={{ background: "#dcfce7", color: "#15803d" }}>
                    <Receipt size={24} />
                  </div>
                  <div>
                    <h3 className="admin-stat-val">{statsData?.stats?.totalBills || 0}</h3>
                    <p className="admin-stat-lbl">Total Bills Generated</p>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-icon" style={{ background: "#fef3c7", color: "#d97706" }}>
                    <Package size={24} />
                  </div>
                  <div>
                    <h3 className="admin-stat-val">{statsData?.stats?.totalProducts || 0}</h3>
                    <p className="admin-stat-lbl">Catalog Products</p>
                  </div>
                </div>
              </div>

              <div className="admin-table-container" style={{ marginBottom: "2rem" }}>
                <div className="admin-table-header">
                  <h4 className="admin-table-title">Recent User Registrations</h4>
                  <button className="admin-refresh-btn" onClick={() => setActiveTab("users")}>
                    View All Users <ArrowUpRight size={14} />
                  </button>
                </div>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User Name</th>
                      <th>Email</th>
                      <th>Shop Name</th>
                      <th>Joined Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsData?.recentUsers?.map((u) => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 600, color: "#0f172a" }}>{u.name}</td>
                        <td>{u.email}</td>
                        <td>{u.shop_name || <span style={{ color: "#64748b" }}>No Shop Yet</span>}</td>
                        <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "N/A"}</td>
                      </tr>
                    ))}
                    {(!statsData?.recentUsers || statsData.recentUsers.length === 0) && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", color: "#64748b" }}>
                          No users registered yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === "users" && (
            <div className="admin-table-container">
              <div className="admin-table-header">
                <h4 className="admin-table-title">Registered Accounts & Shops ({filteredUsers.length})</h4>
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Search user, shop, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Shop Name</th>
                      <th>Phone</th>
                      <th>Bills</th>
                      <th>Products</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: "#0f172a" }}>{u.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>@{u.username || "user"}</div>
                        </td>
                        <td>{u.email}</td>
                        <td>
                          {u.shop_name ? (
                            <span className="admin-tag admin-tag-blue">{u.shop_name}</span>
                          ) : (
                            <span style={{ color: "#64748b" }}>Pending</span>
                          )}
                        </td>
                        <td>{u.shop_phone || "N/A"}</td>
                        <td>
                          <span className="admin-tag admin-tag-green">{u.bill_count || 0} bills</span>
                        </td>
                        <td>{u.product_count || 0}</td>
                        <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "N/A"}</td>
                        <td>
                          <button
                            className="admin-refresh-btn"
                            style={{ background: "#e0f2fe", color: "#0284c7", border: "1px solid #bae6fd" }}
                            onClick={() => handleGrantCredits(u)}
                            title="Grant Print Credits"
                          >
                            <Plus size={13} /> Grant Credits
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
                          No matching users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {renderPagination(filteredUsers.length)}
            </div>
          )}

          {activeTab === "plan_buyers" && (
            <div className="admin-table-container">
              <div className="admin-table-header">
                <h4 className="admin-table-title">Plan Buyer Users & Active Print Subscriptions ({filteredPlanBuyers.length})</h4>
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Filter plan buyers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User Name</th>
                      <th>Email</th>
                      <th>Shop Name</th>
                      <th>Purchased Plan</th>
                      <th>Amount Paid</th>
                      <th>Payment ID</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPlanBuyers.map((b, idx) => (
                      <tr key={b.subscription_id || b.user_id || idx}>
                        <td style={{ fontWeight: 600, color: "#0f172a" }}>{b.user_name}</td>
                        <td>{b.user_email}</td>
                        <td>{b.shop_name || <span style={{ color: "#64748b" }}>Standard Shop</span>}</td>
                        <td>
                          <span className="admin-tag admin-tag-purple">
                            <Crown size={12} /> {b.plan_name || "Pro Plan"}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: "#0284c7" }}>
                          ₹{b.amount ? Number(b.amount).toFixed(2) : "0.00"}
                        </td>
                        <td>
                          <code style={{ fontSize: "0.75rem", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", color: "#475569" }}>
                            {b.payment_id || "N/A"}
                          </code>
                        </td>
                        <td>{b.created_at ? new Date(b.created_at).toLocaleDateString() : "Recently"}</td>
                        <td>
                          <button
                            className="admin-refresh-btn"
                            style={{ background: "#e0f2fe", color: "#0284c7", border: "1px solid #bae6fd" }}
                            onClick={() => handleGrantCredits(b)}
                          >
                            <Plus size={13} /> Grant Credits
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredPlanBuyers.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
                          No plan buyer records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {renderPagination(filteredPlanBuyers.length)}
            </div>
          )}

          {activeTab === "products" && (
            <div className="admin-table-container">
              <div className="admin-table-header">
                <h4 className="admin-table-title">System Product Catalog ({filteredProducts.length})</h4>
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Search product, category, shop..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>GST / Tax Rate</th>
                      <th>Stock Qty</th>
                      <th>Shop / User</th>
                      <th>Created Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600, color: "#0f172a" }}>{p.name}</td>
                        <td>
                          <span className="admin-tag admin-tag-blue">{p.category || "General"}</span>
                        </td>
                        <td style={{ fontWeight: 700, color: "#16a34a" }}>₹{Number(p.price || 0).toLocaleString()}</td>
                        <td>{p.tax_rate ? `${p.tax_rate}%` : "0%"}</td>
                        <td>{p.stock_quantity ?? "Unlimited"}</td>
                        <td>
                          <div>{p.shop_name || p.user_name || "Unknown"}</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{p.user_email}</div>
                        </td>
                        <td>{p.created_at ? new Date(p.created_at).toLocaleDateString() : "N/A"}</td>
                      </tr>
                    ))}
                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
                          No products found in system catalog.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {renderPagination(filteredProducts.length)}
            </div>
          )}

          {activeTab === "templates" && (
            <div className="admin-table-container">
              <div className="admin-table-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <h4 className="admin-table-title">Manage Bill Templates ({filteredTemplates.length})</h4>
                  <button
                    className="admin-refresh-btn"
                    style={{ background: '#0ea5e9', color: '#ffffff', border: 'none', padding: '0.45rem 0.95rem' }}
                    onClick={handleAddTemplate}
                  >
                    <Plus size={14} /> Add New Template
                  </button>
                </div>
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Filter templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Template Name</th>
                      <th>Category</th>
                      <th>Paper Width</th>
                      <th>Shop Owner</th>
                      <th>Created Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTemplates.map((t) => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 600, color: "#0f172a" }}>{t.name}</td>
                        <td>
                          <span className="admin-tag admin-tag-purple">{t.category || "Receipt"}</span>
                        </td>
                        <td>
                          <span className="admin-tag admin-tag-blue">{t.width || "58mm Thermal"}</span>
                        </td>
                        <td>
                          <div>{t.shop_name || t.user_name || "System"}</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{t.user_email}</div>
                        </td>
                        <td>{t.created_at ? new Date(t.created_at).toLocaleDateString() : "N/A"}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <button
                              className="admin-refresh-btn"
                              style={{ background: "#e0f2fe", color: "#0284c7", border: "1px solid #bae6fd", padding: "0.35rem 0.65rem" }}
                              onClick={() => handleEditTemplate(t)}
                              title="Edit Template"
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredTemplates.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
                          No custom templates registered yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {renderPagination(filteredTemplates.length)}
            </div>
          )}

          {activeTab === "bills" && (
            <div className="admin-table-container">
              <div className="admin-table-header">
                <h4 className="admin-table-title">System-Wide Invoice Log ({filteredBills.length})</h4>
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Filter bills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Bill #</th>
                      <th>Shop / User</th>
                      <th>Customer Name</th>
                      <th>Total Amount</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBills.map((b) => (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 700, color: "#0284c7" }}>{b.bill_number}</td>
                        <td>
                          <div>{b.shop_name || b.user_name || "Unknown Shop"}</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{b.user_email}</div>
                        </td>
                        <td>{b.customer_name || "Cash Customer"}</td>
                        <td style={{ fontWeight: 700, color: "#16a34a" }}>₹{Number(b.total || 0).toLocaleString()}</td>
                        <td>{b.created_at ? new Date(b.created_at).toLocaleString() : "N/A"}</td>
                      </tr>
                    ))}
                    {filteredBills.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
                          No bills generated yet across the system.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {renderPagination(filteredBills.length)}
            </div>
          )}

          {activeTab === "contacts" && (
            <div className="admin-table-container">
              <div className="admin-table-header">
                <h4 className="admin-table-title">Customer Support Submissions ({filteredContacts.length})</h4>
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Filter support messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email / Phone</th>
                      <th>Topic</th>
                      <th>Message</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedContacts.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600, color: "#0f172a" }}>{c.name}</td>
                        <td>
                          <div>{c.email}</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{c.phone}</div>
                        </td>
                        <td>
                          <span className="admin-tag admin-tag-purple">{c.topic}</span>
                        </td>
                        <td style={{ maxWidth: "300px", whiteSpace: "normal" }}>{c.message}</td>
                        <td>{c.created_at ? new Date(c.created_at).toLocaleString() : "N/A"}</td>
                      </tr>
                    ))}
                    {filteredContacts.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
                          No contact form submissions recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {renderPagination(filteredContacts.length)}
            </div>
          )}

          {activeTab === "system" && (
            <div style={{ display: "grid", gap: "1.5rem" }}>
              <div className="admin-table-container" style={{ padding: "1.5rem" }}>
                <h4 className="admin-table-title" style={{ marginBottom: "1rem" }}>
                  <Server size={18} style={{ verticalAlign: "middle", marginRight: "0.5rem" }} /> System Diagnostics
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "1rem", borderRadius: "10px" }}>
                    <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Server Status</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#16a34a", marginTop: "0.25rem" }}>
                      <CheckCircle size={16} style={{ verticalAlign: "middle", marginRight: "0.25rem" }} /> Online & Healthy
                    </div>
                  </div>

                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "1rem", borderRadius: "10px" }}>
                    <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Node Runtime</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0284c7", marginTop: "0.25rem" }}>
                      {statsData?.systemHealth?.nodeVersion || process.version || "v20.x"}
                    </div>
                  </div>

                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "1rem", borderRadius: "10px" }}>
                    <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Server Uptime</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#9333ea", marginTop: "0.25rem" }}>
                      {statsData?.systemHealth?.uptime ? `${Math.floor(statsData.systemHealth.uptime / 60)} mins` : "Active"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
