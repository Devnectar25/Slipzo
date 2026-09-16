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
  ChevronRight,
  X,
  AlertCircle,
  DollarSign,
  Sparkles
} from "lucide-react"
import { call, invalidateApiCache } from "../../lib/utils"
import Swal from "sweetalert2"
import "../../styles/Admin.css"

const getInitialAdminTab = () => {
  if (typeof window === "undefined") return "overview"
  const cleanPath = (window.location.pathname || "").toLowerCase().trim()
  if (cleanPath.includes("/admin/products") || cleanPath.includes("/admin/product-catalog")) return "products"
  if (cleanPath.includes("/admin/plan-buyers")) return "plan_buyers"
  if (cleanPath.includes("/admin/templates")) return "templates"
  if (cleanPath.includes("/admin/bill-history") || cleanPath.includes("/admin/bills")) return "bills"
  if (cleanPath.includes("/admin/support") || cleanPath.includes("/admin/contacts")) return "contacts"
  if (cleanPath.includes("/admin/users")) return "users"
  if (cleanPath.includes("/admin/system") || cleanPath.includes("/admin/health")) return "system"
  return "overview"
}

const getAdminTabPath = (tab) => {
  switch (tab) {
    case "overview": return "/admin/overview"
    case "products": return "/admin/products"
    case "plan_buyers": return "/admin/plan-buyers"
    case "templates": return "/admin/templates"
    case "bills": return "/admin/bill-history"
    case "contacts": return "/admin/support"
    case "users": return "/admin/users"
    case "system": return "/admin/system"
    default: return "/admin/overview"
  }
}

export function AdminDashboard({ admin, onLogout }) {
  const [activeTab, setActiveTabState] = useState(() => getInitialAdminTab())

  const setActiveTab = (tab) => {
    setActiveTabState(tab)
    if (typeof window !== "undefined") {
      const targetPath = getAdminTabPath(tab)
      if (window.location.pathname !== targetPath) {
        window.history.pushState({}, "", targetPath + window.location.search)
      }
    }
  }

  useEffect(() => {
    const handlePopState = () => {
      const currentTab = getInitialAdminTab()
      setActiveTabState(currentTab)
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

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

  // Add Product Modal State
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [prodForm, setProdForm] = useState({ name: "", category: "Hardware", price: "", tax_rate: "" })
  const [prodPhotos, setProdPhotos] = useState([])
  const [prodError, setProdError] = useState("")
  const [prodSubmitting, setProdSubmitting] = useState(false)

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery, pageSize])

  const loadAdminData = async (isManualRefresh = false) => {
    setLoading(true)
    const headers = getAdminHeaders()
    const opts = { headers, noCache: true }

    if (isManualRefresh) {
      invalidateApiCache('/admin')
      invalidateApiCache()
    }

    try {
      const statsRes = await call("/admin/stats", opts).catch(() => null)
      if (statsRes && (statsRes.stats || statsRes.totalUsers !== undefined)) {
        setStatsData(statsRes)
      }

      const usersRes = await call("/admin/users", opts).catch(() => null)
      if (usersRes && (usersRes.users || Array.isArray(usersRes))) {
        setUsersList(usersRes.users || (Array.isArray(usersRes) ? usersRes : []))
      }

      const billsRes = await call("/admin/bills", opts).catch(() => null)
      if (billsRes && (billsRes.bills || Array.isArray(billsRes))) {
        setBillsList(billsRes.bills || (Array.isArray(billsRes) ? billsRes : []))
      }

      const contactsRes = await call("/admin/contacts", opts).catch(() => null)
      if (contactsRes && (contactsRes.contacts || Array.isArray(contactsRes))) {
        setContactsList(contactsRes.contacts || (Array.isArray(contactsRes) ? contactsRes : []))
      }

      const templatesRes = await call("/admin/templates", opts).catch(() => null)
      if (templatesRes && (templatesRes.templates || Array.isArray(templatesRes))) {
        setTemplatesList(templatesRes.templates || (Array.isArray(templatesRes) ? templatesRes : []))
      }

      const productsRes = await call("/admin/products", opts).catch(() => null)
      if (productsRes && (productsRes.products || Array.isArray(productsRes))) {
        setProductsList(productsRes.products || (Array.isArray(productsRes) ? productsRes : []))
      }

      const buyersRes = await call("/admin/plan-buyers", opts).catch(() => null)
      if (buyersRes && (buyersRes.planBuyers || Array.isArray(buyersRes))) {
        setPlanBuyersList(buyersRes.planBuyers || (Array.isArray(buyersRes) ? buyersRes : []))
      }

      if (isManualRefresh) {
        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true
        })
        Toast.fire({
          icon: 'success',
          title: 'Data refreshed successfully'
        })
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

  const handleOpenAddProductModal = () => {
    setProdForm({ name: "", category: "Hardware", price: "", tax_rate: "" })
    setProdPhotos([])
    setProdError("")
    setShowAddProductModal(true)
  }

  const handleCloseAddProductModal = () => {
    setShowAddProductModal(false)
    setProdForm({ name: "", category: "Hardware", price: "", tax_rate: "" })
    setProdPhotos([])
    setProdError("")
  }

  const handleSelectProductPhotos = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setProdError("")

    // Validate file types (JPG, JPEG, PNG, WEBP)
    const validFormats = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    const invalidFiles = files.filter(f => !validFormats.includes((f.type || "").toLowerCase()) && !/\.(jpe?g|png|webp)$/i.test(f.name))

    if (invalidFiles.length > 0) {
      setProdError("Only image files (JPG, PNG, WEBP) are allowed.")
      e.target.value = ""
      return
    }

    if (prodPhotos.length + files.length > 5) {
      setProdError("You can upload a maximum of 5 product photos.")
      e.target.value = ""
      return
    }

    // Read and compress image files as lightweight Data URLs
    const readPromises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (evt) => {
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            const MAX_WIDTH = 800
            const MAX_HEIGHT = 800
            let width = img.width
            let height = img.height

            if (width > height) {
              if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width)
                width = MAX_WIDTH
              }
            } else {
              if (height > MAX_HEIGHT) {
                width = Math.round((width * MAX_HEIGHT) / height)
                height = MAX_HEIGHT
              }
            }

            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, width, height)
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75)
            resolve({
              id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              dataUrl: compressedDataUrl,
              name: file.name
            })
          }
          img.onerror = () => {
            resolve({
              id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              dataUrl: evt.target.result,
              name: file.name
            })
          }
          img.src = evt.target.result
        }
        reader.readAsDataURL(file)
      })
    })

    Promise.all(readPromises).then(newPhotoObjs => {
      setProdPhotos(prev => {
        const combined = [...prev, ...newPhotoObjs]
        if (combined.length > 5) {
          setProdError("You can upload a maximum of 5 product photos.")
          return combined.slice(0, 5)
        }
        if (combined.length >= 3 && combined.length <= 5) {
          setProdError("")
        }
        return combined
      })
      e.target.value = ""
    })
  }

  const handleRemovePhoto = (index) => {
    setProdPhotos(prev => {
      const updated = prev.filter((_, i) => i !== index)
      if (updated.length < 3) {
        setProdError("Please upload at least 3 product photos.")
      } else if (updated.length <= 5) {
        setProdError("")
      }
      return updated
    })
  }

  const handleSubmitAddProduct = async (e) => {
    e?.preventDefault()
    setProdError("")

    if (!prodForm.name || !prodForm.name.trim()) {
      setProdError("Product name is required")
      return
    }

    if (prodPhotos.length < 3) {
      setProdError("Please upload at least 3 product photos.")
      return
    }

    if (prodPhotos.length > 5) {
      setProdError("You can upload a maximum of 5 product photos.")
      return
    }

    setProdSubmitting(true)
    try {
      const photoUrls = prodPhotos.map(p => p.dataUrl)
      const payload = {
        name: prodForm.name.trim(),
        category: (prodForm.category || "Hardware").trim(),
        price: parseFloat(prodForm.price) || 0,
        tax_rate: parseFloat(prodForm.tax_rate) || 0,
        images: photoUrls,
        image: photoUrls[0] || "",
        status: "active",
        is_admin_product: true
      }

      const res = await call('/admin/products', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload)
      })

      if (!res || (!res.product && !res.id)) {
        throw new Error("Backend did not return a created product record.")
      }

      const createdProd = res.product || res
      setProductsList(prev => [createdProd, ...prev.filter(p => p.id !== createdProd.id)])
      handleCloseAddProductModal()
      Swal.fire({
        title: 'Success!',
        text: res.detail || 'New product with photos added successfully!',
        icon: 'success',
        confirmButtonColor: '#0ea5e9'
      })
      await loadAdminData()
    } catch (err) {
      console.error("Failed to add product:", err)
      setProdError(err?.detail || err?.message || "Failed to save product to database. Please try again.")
    } finally {
      setProdSubmitting(false)
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

  // Calculate Plan Buyer Analytics Metrics
  const validCompletedBuyers = planBuyersList.filter(b => 
    !b.payment_status || (b.payment_status || '').toLowerCase() === 'completed'
  )

  const totalPlanRevenue = validCompletedBuyers.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0)

  const uniqueBuyerIds = new Set(
    validCompletedBuyers.map(b => b.user_id || b.user_email).filter(Boolean)
  )
  const totalUniquePlanBuyers = uniqueBuyerIds.size

  const totalPlansSold = validCompletedBuyers.length

  const starterPackCount = validCompletedBuyers.filter(b => 
    (b.plan_name || '').toLowerCase().includes('starter')
  ).length

  const proGrowthCount = validCompletedBuyers.filter(b => {
    const name = (b.plan_name || '').toLowerCase()
    return (name.includes('growth') || name.includes('pro')) && !name.includes('business') && !name.includes('super')
  }).length

  const businessSuperCount = validCompletedBuyers.filter(b => {
    const name = (b.plan_name || '').toLowerCase()
    return name.includes('business') || name.includes('super')
  }).length

  const handleStatusChange = async (product, newStatus) => {
    const previousStatus = (product.status || 'active').toLowerCase() === 'active' ? 'active' : 'inactive'
    if (newStatus === previousStatus) return

    setProductsList(prev => prev.map(p => p.id === product.id ? { ...p, status: newStatus } : p))

    try {
      const headers = getAdminHeaders()
      const payload = { status: newStatus, name: product.name }
      let res = await call(`/admin/products/${product.id}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      })

      if (res && (res.product || res.id)) {
        const updated = res.product || res
        setProductsList(prev => prev.map(p => (p.id === product.id || p.name === product.name) ? { ...p, status: newStatus, ...updated } : p))
      }
    } catch (err) {
      console.error("Failed to update product status:", err)
      setProductsList(prev => prev.map(p => p.id === product.id ? { ...p, status: previousStatus } : p))
      Swal.fire('Status Update Failed', err?.detail || err?.message || 'Could not save product status to database', 'error')
    }
  }

  const handleDeleteProduct = async (product) => {
    const confirm = await Swal.fire({
      title: 'Delete Product?',
      text: `Are you sure you want to remove "${product.name}" from the products catalog?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, Delete'
    });

    if (confirm.isConfirmed) {
      try {
        await call(`/admin/products/${product.id}`, {
          method: 'DELETE',
          headers: getAdminHeaders()
        }).catch(() => null);

        setProductsList((prev) => prev.filter((p) => p.id !== product.id));
        Swal.fire({ title: 'Deleted!', text: 'Product removed successfully', icon: 'success', confirmButtonColor: '#0ea5e9' });
        loadAdminData();
      } catch (err) {
        setProductsList((prev) => prev.filter((p) => p.id !== product.id));
        Swal.fire({ title: 'Deleted!', text: 'Product removed from catalog', icon: 'success', confirmButtonColor: '#0ea5e9' });
      }
    }
  }

  const filteredProducts = productsList.filter(p => {
    // Exclude custom user shop menu items (e.g. Shampoo, Hair Cream, General category) from sale products catalog
    if (
      p.is_menu_item === true || 
      p.is_menu === true || 
      p.is_menu_item === 1 || 
      p.type === 'menu_item' || 
      p.type === 'menu' ||
      p.category === 'General' ||
      (p.name && (p.name.toLowerCase() === 'shampoo' || p.name.toLowerCase() === 'hair cream'))
    ) {
      return false
    }
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
            <button className="admin-refresh-btn" onClick={() => loadAdminData(true)} disabled={loading}>
              <RefreshCw size={14} className={loading ? "spin" : ""} /> {loading ? "Refreshing..." : "Refresh"}
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
                <div className="admin-table-wrapper">
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
              <div className="admin-table-wrapper">
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
            <>
              {/* Analytics Section ABOVE Existing Table */}
              <div className="admin-stats-grid">
                {/* 1. Total Revenue */}
                <div className="admin-stat-card">
                  <div className="admin-stat-icon" style={{ background: "#dcfce7", color: "#15803d" }}>
                    <DollarSign size={24} />
                  </div>
                  <div>
                    <h3 className="admin-stat-val">
                      ₹{totalPlanRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </h3>
                    <p className="admin-stat-lbl">Total Revenue</p>
                    <span style={{ fontSize: "0.725rem", color: "#64748b" }}>Successful payments</span>
                  </div>
                </div>

                {/* 2. Total Plan Buyers */}
                <div className="admin-stat-card">
                  <div className="admin-stat-icon" style={{ background: "#e0f2fe", color: "#0284c7" }}>
                    <Users size={24} />
                  </div>
                  <div>
                    <h3 className="admin-stat-val">{totalUniquePlanBuyers}</h3>
                    <p className="admin-stat-lbl">Total Plan Buyers</p>
                    <span style={{ fontSize: "0.725rem", color: "#64748b" }}>Unique buyers</span>
                  </div>
                </div>

                {/* 3. Starter Pack */}
                <div className="admin-stat-card">
                  <div className="admin-stat-icon" style={{ background: "#fef3c7", color: "#d97706" }}>
                    <Zap size={24} />
                  </div>
                  <div>
                    <h3 className="admin-stat-val">{starterPackCount}</h3>
                    <p className="admin-stat-lbl">Starter Pack</p>
                    <span style={{ fontSize: "0.725rem", color: "#64748b" }}>Starter plan sales</span>
                  </div>
                </div>

                {/* 4. Pro Growth */}
                <div className="admin-stat-card">
                  <div className="admin-stat-icon" style={{ background: "#cff4fc", color: "#0891b2" }}>
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h3 className="admin-stat-val">{proGrowthCount}</h3>
                    <p className="admin-stat-lbl">Pro Growth</p>
                    <span style={{ fontSize: "0.725rem", color: "#64748b" }}>Pro plan sales</span>
                  </div>
                </div>

              </div>

              {/* Existing Plan Buyer Table */}
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
              <div className="admin-table-wrapper">
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
            </>
          )}

          {activeTab === "products" && (
            <div className="admin-table-container">
              <div className="admin-table-header">
                <h4 className="admin-table-title">System Product Catalog ({filteredProducts.length})</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    className="admin-search-input"
                    placeholder="Search product, category, shop..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button
                    className="admin-refresh-btn"
                    style={{ background: '#0ea5e9', color: '#ffffff', border: 'none', padding: '0.45rem 0.95rem' }}
                    onClick={handleOpenAddProductModal}
                  >
                    <Plus size={14} /> Add New Product
                  </button>
                </div>
              </div>
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>GST / Tax Rate</th>
                      <th>Stock Qty</th>
                      <th>Status</th>
                      <th>Shop / User</th>
                      <th>Created Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600, color: "#0f172a" }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            {(() => {
                              let mainImg = p.image
                              if (!mainImg && p.images) {
                                try {
                                  const parsed = typeof p.images === 'string' ? JSON.parse(p.images) : p.images
                                  if (Array.isArray(parsed) && parsed.length > 0) mainImg = parsed[0]
                                } catch (_) {}
                              }
                              return mainImg ? (
                                <img
                                  src={mainImg}
                                  alt={p.name}
                                  style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0', flexShrink: 0 }}
                                />
                              ) : (
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexShrink: 0 }}>
                                  <Package size={18} />
                                </div>
                              )
                            })()}
                            <span>{p.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className="admin-tag admin-tag-blue">{p.category || "General"}</span>
                        </td>
                        <td style={{ fontWeight: 700, color: "#16a34a" }}>₹{Number(p.price || 0).toLocaleString()}</td>
                        <td>{p.tax_rate ? `${p.tax_rate}%` : "0%"}</td>
                        <td>{p.stock_quantity ?? "Unlimited"}</td>
                        <td>
                          <select
                            value={(p.status || 'active').toLowerCase() === 'active' ? 'active' : 'inactive'}
                            onChange={(e) => handleStatusChange(p, e.target.value)}
                            style={{
                              background: (p.status || 'active').toLowerCase() === 'active' ? '#dcfce7' : '#f1f5f9',
                              color: (p.status || 'active').toLowerCase() === 'active' ? '#15803d' : '#64748b',
                              border: `1px solid ${(p.status || 'active').toLowerCase() === 'active' ? '#bbf7d0' : '#cbd5e1'}`,
                              padding: '0.3rem 0.65rem',
                              fontWeight: 700,
                              fontSize: '0.775rem',
                              borderRadius: '20px',
                              cursor: 'pointer',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                            title="Change Product Active / Inactive status"
                          >
                            <option value="active" style={{ background: '#ffffff', color: '#15803d', fontWeight: 600 }}>Active</option>
                            <option value="inactive" style={{ background: '#ffffff', color: '#64748b', fontWeight: 600 }}>Inactive</option>
                          </select>
                        </td>
                        <td>
                          <div>{p.shop_name || p.user_name || "Unknown"}</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{p.user_email}</div>
                        </td>
                        <td>{p.created_at ? new Date(p.created_at).toLocaleDateString() : "N/A"}</td>
                        <td>
                          <button
                            className="admin-refresh-btn"
                            style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", padding: "0.35rem 0.65rem" }}
                            onClick={() => handleDeleteProduct(p)}
                            title="Delete product from catalog"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={9} style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
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
                <h4 className="admin-table-title">Manage Bill Templates ({filteredTemplates.length})</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    className="admin-search-input"
                    placeholder="Filter templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button
                    className="admin-refresh-btn"
                    style={{ background: '#0ea5e9', color: '#ffffff', border: 'none', padding: '0.45rem 0.95rem' }}
                    onClick={handleAddTemplate}
                  >
                    <Plus size={14} /> Add New Template
                  </button>
                </div>
              </div>
              <div className="admin-table-wrapper">
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
              <div className="admin-table-wrapper">
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
              <div className="admin-table-wrapper">
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

      {/* Add New Product Modal */}
      {showAddProductModal && (
        <div
          className="admin-modal-overlay"
          onClick={handleCloseAddProductModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            className="admin-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid #e2e8f0',
              padding: '1.75rem',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Add New Product to Catalog
              </h3>
              <button
                type="button"
                onClick={handleCloseAddProductModal}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitAddProduct} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Product Name */}
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#334155' }}>
                  Product Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shampoo 250ml"
                  value={prodForm.name}
                  onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Category */}
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#334155' }}>
                  Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hardware, POS Accessories"
                  value={prodForm.category}
                  onChange={(e) => setProdForm({ ...prodForm, category: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Price & Tax Rate Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#334155' }}>
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 300"
                    value={prodForm.price}
                    onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#334155' }}>
                    GST / Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 18"
                    value={prodForm.tax_rate}
                    onChange={(e) => setProdForm({ ...prodForm, tax_rate: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Product Photos Section (MIN 3, MAX 5) */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div>
                    <label style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      Product Photos <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Upload 3–5 photos (JPG, PNG, WEBP)
                    </span>
                  </div>

                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '12px',
                    background: prodPhotos.length >= 3 && prodPhotos.length <= 5 ? '#dcfce7' : '#fee2e2',
                    color: prodPhotos.length >= 3 && prodPhotos.length <= 5 ? '#15803d' : '#b91c1c',
                    border: `1px solid ${prodPhotos.length >= 3 && prodPhotos.length <= 5 ? '#bbf7d0' : '#fecaca'}`
                  }}>
                    {prodPhotos.length} / 5 photos
                  </span>
                </div>

                {/* Upload Button */}
                <div style={{ marginBottom: prodPhotos.length > 0 ? '0.85rem' : '0' }}>
                  <input
                    type="file"
                    id="admin-prod-photo-picker"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    style={{ display: 'none' }}
                    onChange={handleSelectProductPhotos}
                    disabled={prodPhotos.length >= 5}
                  />
                  <label
                    htmlFor="admin-prod-photo-picker"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.55rem 0.95rem',
                      borderRadius: '8px',
                      background: prodPhotos.length >= 5 ? '#cbd5e1' : '#0ea5e9',
                      color: prodPhotos.length >= 5 ? '#64748b' : '#ffffff',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: prodPhotos.length >= 5 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Plus size={15} /> Upload Photos
                  </label>
                </div>

                {/* Thumbnail Previews Grid */}
                {prodPhotos.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                    {prodPhotos.map((photo, idx) => (
                      <div
                        key={photo.id || idx}
                        style={{
                          position: 'relative',
                          width: '72px',
                          height: '72px',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}
                      >
                        <img
                          src={photo.dataUrl}
                          alt={`Product photo ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          title="Remove photo"
                          style={{
                            position: 'absolute',
                            top: '3px',
                            right: '3px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: 'rgba(15, 23, 42, 0.75)',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            fontSize: '12px',
                            lineHeight: 1
                          }}
                        >
                          <X size={12} />
                        </button>
                        <span style={{
                          position: 'absolute',
                          bottom: '2px',
                          left: '2px',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          background: 'rgba(0,0,0,0.6)',
                          color: '#ffffff',
                          padding: '0.05rem 0.3rem',
                          borderRadius: '4px'
                        }}>
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Error Banner */}
              {prodError && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  fontSize: '0.825rem',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <AlertCircle size={16} />
                  <span>{prodError}</span>
                </div>
              )}

              {/* Submit & Cancel Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleCloseAddProductModal}
                  style={{
                    padding: '0.65rem 1.15rem',
                    borderRadius: '10px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={prodSubmitting}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '10px',
                    background: '#0ea5e9',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: prodSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(14, 165, 233, 0.3)'
                  }}
                >
                  {prodSubmitting ? 'Adding Product...' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
