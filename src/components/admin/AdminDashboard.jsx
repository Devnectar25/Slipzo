import { useState, useEffect, useLayoutEffect, useRef } from "react"
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
  Sparkles,
  ExternalLink,
  Utensils,
  CreditCard,
  Bell,
  UserCog,
  UserCircle,
  Bug
} from "lucide-react"
import { call, invalidateApiCache } from "../../lib/utils"
import Swal from "sweetalert2"
import { ButtonLoader, MetricSkeleton, TableSkeleton } from "../common/Skeleton"
import "../../styles/Admin.css"
import { AdminMenuManagement } from "./AdminMenuManagement"
import { AdminPushNotifications } from "./AdminPushNotifications"
import { AdminSubAdmins } from "./AdminSubAdmins"
import { AdminAnalytics } from "./AdminAnalytics"
import { AdminErrors } from "./AdminErrors"
import { AdminProfile } from "./AdminProfile"
import { scrollPageToTop } from "../../lib/scrollTop"

const getInitialAdminTab = () => {
  if (typeof window === "undefined") return "overview"
  const cleanPath = (window.location.pathname || "").toLowerCase().trim()
  if (cleanPath.includes("/admin/menu") || cleanPath.includes("/admin/menu-catalog")) return "menu"
  if (cleanPath.includes("/admin/products") || cleanPath.includes("/admin/product-catalog")) return "products"
  if (cleanPath.includes("/admin/pricing-plans") || cleanPath.includes("/admin/plans")) return "plans"
  if (cleanPath.includes("/admin/plan-buyers")) return "plan_buyers"
  if (cleanPath.includes("/admin/templates")) return "templates"
  if (cleanPath.includes("/admin/bill-history") || cleanPath.includes("/admin/bills")) return "bills"
  if (cleanPath.includes("/admin/support") || cleanPath.includes("/admin/contacts")) return "contacts"
  if (cleanPath.includes("/admin/notifications")) return "notifications"
  if (cleanPath.includes("/admin/sub-admins")) return "sub_admins"
  if (cleanPath.includes("/admin/profile")) return "profile"
  if (cleanPath.includes("/admin/users")) return "users"
  if (cleanPath.includes("/admin/errors") || cleanPath.includes("/admin/system") || cleanPath.includes("/admin/health")) return "errors"
  return "overview"
}

const getAdminTabPath = (tab) => {
  switch (tab) {
    case "overview": return "/admin/overview"
    case "menu": return "/admin/menu"
    case "products": return "/admin/products"
    case "plan_buyers": return "/admin/plan-buyers"
    case "plans": return "/admin/plans"
    case "templates": return "/admin/templates"
    case "bills": return "/admin/bill-history"
    case "contacts": return "/admin/support"
    case "notifications": return "/admin/notifications"
    case "users": return "/admin/users"
    case "errors": return "/admin/errors"
    case "sub_admins": return "/admin/sub-admins"
    case "profile": return "/admin/profile"
    default: return "/admin/overview"
  }
}

const ALL_ADMIN_PAGES = ["overview", "users", "grant_credits", "plan_buyers", "plans", "products", "menu", "templates", "bills", "contacts", "notifications", "errors"]

function PlanDescriptionCell({ plan }) {
  const [expanded, setExpanded] = useState(false)
  const [featuresOpen, setFeaturesOpen] = useState(false)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const descRef = useRef(null)

  const description = (plan?.description || "").trim()
  const features = Array.isArray(plan?.features) ? plan.features.filter(Boolean) : []

  useEffect(() => {
    const el = descRef.current
    if (!el || expanded || !description) return
    const check = () => {
      setIsOverflowing(el.scrollHeight > el.clientHeight + 1)
    }
    check()
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(check)
      ro.observe(el)
      return () => ro.disconnect()
    }
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [description, expanded])

  return (
    <div className="admin-plan-desc-cell">
      <div
        ref={descRef}
        className={`admin-plan-desc ${!expanded && description ? "clamped" : ""} ${!description ? "empty" : ""}`}
      >
        {description || "No description"}
      </div>

      {description && (isOverflowing || expanded) && (
        <button
          type="button"
          className="admin-plan-readmore-btn"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}

      {features.length > 0 && (
        <div>
          <button
            type="button"
            className="admin-plan-features-badge"
            onClick={() => setFeaturesOpen((v) => !v)}
            title={featuresOpen ? "Hide features" : "View included features"}
          >
            <span>{features.length} features included</span>
            <span aria-hidden="true">{featuresOpen ? "▴" : "▾"}</span>
          </button>
          {featuresOpen && (
            <ul className="admin-plan-features-list">
              {features.map((feat, idx) => (
                <li key={idx}>{feat}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export function AdminDashboard({ admin, onLogout, onAdminUpdated }) {
  const [activeAdmin, setActiveAdmin] = useState(admin)
  useEffect(() => {
    setActiveAdmin(admin)
  }, [admin])

  const handleProfileUpdated = (updatedAdmin, newToken) => {
    if (updatedAdmin) setActiveAdmin(updatedAdmin)
    onAdminUpdated?.(updatedAdmin, newToken)
  }

  // a sub-admin opens only the pages the super admin gave them (an older server sends no list: everything)
  const isSuper = activeAdmin?.isSuper !== false
  const allowedPages = Array.isArray(activeAdmin?.permissions) ? activeAdmin.permissions.map((p) => (p === "system" ? "errors" : p)) : ALL_ADMIN_PAGES
  const can = (page) => (page === "profile" ? true : page === "sub_admins" ? isSuper : isSuper || allowedPages.includes(page))
  const firstPage = ["overview", "users", "plan_buyers", "plans", "products", "menu", "templates", "bills", "contacts", "notifications", "errors"].find(can) || "none"
  const [activeTab, setActiveTabState] = useState(() => getInitialAdminTab())
  // every admin page opens at its top, not where the previous page was scrolled to
  useLayoutEffect(() => { scrollPageToTop() }, [activeTab])
  // a page this admin may not open (an old link, or access just taken away) shows their first page instead
  useEffect(() => {
    if (activeTab !== "none" && !can(activeTab)) setActiveTabState(firstPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, firstPage])

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
  const [plansList, setPlansList] = useState([])
  const [plansStats, setPlansStats] = useState(null)
  const [planFilterType, setPlanFilterType] = useState("all") // "all" | "time" | "print"
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [planForm, setPlanForm] = useState({
    name: "",
    plan_type: "time",
    duration_months: 1,
    duration_label: "1 Month Validity (30 Days)",
    prints_count: 0,
    price: "",
    original_price: "",
    description: "",
    features: "Unlimited prints for 30 days\nThermal & POS printer support\nCustom shop branding & logo\nWhatsApp receipt sharing\nEmail & chat support",
    is_popular: false,
    status: "active",
    sort_order: 10
  })
  const [planError, setPlanError] = useState("")
  const [planSubmitting, setPlanSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Add Product Modal State
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [prodForm, setProdForm] = useState({ name: "", category: "Hardware", price: "", product_link: "", description: "" })
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
      const skip = Promise.resolve(null)
      const statsRes = await (can("overview") ? call("/admin/stats", opts).catch(() => null) : skip)
      if (statsRes && (statsRes.stats || statsRes.totalUsers !== undefined)) {
        setStatsData(statsRes)
      }

      const usersRes = await (can("users") ? call("/admin/users", opts).catch(() => null) : skip)
      if (usersRes && (usersRes.users || Array.isArray(usersRes))) {
        setUsersList(usersRes.users || (Array.isArray(usersRes) ? usersRes : []))
      }

      const billsRes = await (can("bills") ? call("/admin/bills", opts).catch(() => null) : skip)
      if (billsRes && (billsRes.bills || Array.isArray(billsRes))) {
        setBillsList(billsRes.bills || (Array.isArray(billsRes) ? billsRes : []))
      }

      const contactsRes = await (can("contacts") ? call("/admin/contacts", opts).catch(() => null) : skip)
      if (contactsRes && (contactsRes.contacts || Array.isArray(contactsRes))) {
        setContactsList(contactsRes.contacts || (Array.isArray(contactsRes) ? contactsRes : []))
      }

      const templatesRes = await (can("templates") ? call("/admin/templates", opts).catch(() => null) : skip)
      if (templatesRes && (templatesRes.templates || Array.isArray(templatesRes))) {
        setTemplatesList(templatesRes.templates || (Array.isArray(templatesRes) ? templatesRes : []))
      }

      const productsRes = await (can("products") ? call("/admin/products", opts).catch(() => null) : skip)
      if (productsRes && (productsRes.products || Array.isArray(productsRes))) {
        setProductsList(productsRes.products || (Array.isArray(productsRes) ? productsRes : []))
      }

      const buyersRes = await (can("plan_buyers") ? call("/admin/plan-buyers", opts).catch(() => null) : skip)
      if (buyersRes && (buyersRes.planBuyers || Array.isArray(buyersRes))) {
        setPlanBuyersList(buyersRes.planBuyers || (Array.isArray(buyersRes) ? buyersRes : []))
      }

      const plansRes = await (can("plans") ? call("/admin/plans", opts).catch(() => null) : skip)
      if (plansRes && (plansRes.plans || Array.isArray(plansRes))) {
        setPlansList(plansRes.plans || (Array.isArray(plansRes) ? plansRes : []))
        if (plansRes.stats) {
          setPlansStats(plansRes.stats)
        }
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
      text: `Enter print credits to add for ${user.user_name || user.name || user.email}${user.prints_remaining !== undefined ? ` (currently ${Number(user.prints_remaining).toLocaleString('en-IN')} prints left)` : ''}:`,
      input: 'number',
      inputValue: 1000,
      showCancelButton: true,
      confirmButtonColor: '#0284c7',
      confirmButtonText: 'Grant Credits',
      inputValidator: (value) => {
        if (!value || parseInt(value) <= 0) {
          return 'Please enter a valid positive number'
        }
      }
    })

    if (printCount) {
      try {
        Swal.fire({
          title: 'Granting prints...',
          allowOutsideClick: false,
          showConfirmButton: false,
          didOpen: () => Swal.showLoading()
        })
        const res = await call(`/admin/users/${user.user_id || user.id}/grant-prints`, {
          method: 'POST',
          headers: getAdminHeaders(),
          body: JSON.stringify({ printsToGrant: parseInt(printCount) })
        })
        Swal.fire({
          title: 'Success!',
          text: res?.detail || `Granted ${printCount} prints successfully!`,
          icon: 'success',
          confirmButtonColor: '#0284c7'
        })
        loadAdminData(true)
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
          <label style="font-weight: 600; display: block; margin-bottom: 4px; color: #0C1F41;">Template Name</label>
          <input id="swal-template-name" class="swal2-input" placeholder="e.g. Premium Thermal Invoice" style="width: 100%; margin: 0 0 12px 0; box-sizing: border-box;" />
          
          <label style="font-weight: 600; display: block; margin-bottom: 4px; color: #0C1F41;">Category</label>
          <select id="swal-template-cat" class="swal2-input" style="width: 100%; margin: 0 0 12px 0; box-sizing: border-box;">
            <option value="Business">Business</option>
            <option value="Thermal">Thermal</option>
            <option value="Minimal">Minimal</option>
            <option value="Retail">Retail</option>
            <option value="Tax">Tax Invoice</option>
            <option value="Standard">Standard</option>
          </select>
          
          <label style="font-weight: 600; display: block; margin-bottom: 4px; color: #0C1F41;">Paper Width</label>
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
      confirmButtonColor: '#0284c7',
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
        Swal.fire({ title: 'Success!', text: 'New template created successfully', icon: 'success', confirmButtonColor: '#0284c7' });
        loadAdminData();
      } catch (err) {
        Swal.fire('Error', err?.detail || err?.message || 'Failed to create template', 'error');
      }
    }
  }

  const handleOpenAddProductModal = () => {
    setProdForm({ name: "", category: "Hardware", price: "", product_link: "", description: "" })
    setProdPhotos([])
    setProdError("")
    setShowAddProductModal(true)
  }

  const handleCloseAddProductModal = () => {
    setShowAddProductModal(false)
    setProdForm({ name: "", category: "Hardware", price: "", product_link: "", description: "" })
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
      if (updated.length < 1) {
        setProdError("Please upload at least 1 product photo.")
      } else if (updated.length <= 5) {
        setProdError("")
      }
      return updated
    })
  }

  const isValidUrl = (url) => {
    try {
      const parsed = new URL(url)
      return parsed.protocol === "http:" || parsed.protocol === "https:"
    } catch (_) {
      return false
    }
  }

  const handleSubmitAddProduct = async (e) => {
    e?.preventDefault()
    setProdError("")

    if (!prodForm.name || !prodForm.name.trim()) {
      setProdError("Product name is required")
      return
    }

    if (!prodForm.product_link || !prodForm.product_link.trim()) {
      setProdError("Product link is required")
      return
    }

    if (!isValidUrl(prodForm.product_link.trim())) {
      setProdError("Please enter a valid product link URL (e.g. https://example.com/product)")
      return
    }

    if (prodPhotos.length < 1) {
      setProdError("Please upload at least 1 product photo.")
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
        product_link: prodForm.product_link.trim(),
        description: (prodForm.description || "").trim(),
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
        confirmButtonColor: '#0284c7'
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
          <label style="font-weight: 600; display: block; margin-bottom: 4px; color: #0C1F41;">Template Name</label>
          <input id="swal-edit-template-name" class="swal2-input" value="${template.name || ''}" style="width: 100%; margin: 0 0 12px 0; box-sizing: border-box;" />
          
          <label style="font-weight: 600; display: block; margin-bottom: 4px; color: #0C1F41;">Category</label>
          <select id="swal-edit-template-cat" class="swal2-input" style="width: 100%; margin: 0 0 12px 0; box-sizing: border-box;">
            <option value="Business" ${template.category === 'Business' ? 'selected' : ''}>Business</option>
            <option value="Thermal" ${template.category === 'Thermal' ? 'selected' : ''}>Thermal</option>
            <option value="Minimal" ${template.category === 'Minimal' ? 'selected' : ''}>Minimal</option>
            <option value="Retail" ${template.category === 'Retail' ? 'selected' : ''}>Retail</option>
            <option value="Tax" ${template.category === 'Tax' ? 'selected' : ''}>Tax Invoice</option>
            <option value="Standard" ${template.category === 'Standard' ? 'selected' : ''}>Standard</option>
          </select>
          
          <label style="font-weight: 600; display: block; margin-bottom: 4px; color: #0C1F41;">Paper Width</label>
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
      confirmButtonColor: '#0284c7',
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
        Swal.fire({ title: 'Updated!', text: 'Template updated successfully', icon: 'success', confirmButtonColor: '#0284c7' });
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
        Swal.fire({ title: 'Deleted!', text: 'Template has been deleted', icon: 'success', confirmButtonColor: '#0284c7' });
        invalidateApiCache('/admin/templates');
        invalidateApiCache('/templates');
        loadAdminData();
      } catch (err) {
        Swal.fire('Error', err?.detail || err?.message || 'Failed to delete template', 'error');
      }
    }
  }

  const safeUsersList = Array.isArray(usersList) ? usersList : []
  const safePlanBuyersList = Array.isArray(planBuyersList) ? planBuyersList : []

  const filteredUsers = safeUsersList.filter(u => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.shop_name && u.shop_name.toLowerCase().includes(q)) ||
      (u.shop_phone && u.shop_phone.toLowerCase().includes(q))
    )
  })

  const filteredPlanBuyers = safePlanBuyersList.filter(b => {
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
  const validCompletedBuyers = safePlanBuyersList.filter(b => 
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
        Swal.fire({ title: 'Deleted!', text: 'Product removed successfully', icon: 'success', confirmButtonColor: '#0284c7' });
        loadAdminData();
      } catch (err) {
        setProductsList((prev) => prev.filter((p) => p.id !== product.id));
        Swal.fire({ title: 'Deleted!', text: 'Product removed from catalog', icon: 'success', confirmButtonColor: '#0284c7' });
      }
    }
  }

  const handleEditProduct = async (product) => {
    const { value: formValues } = await Swal.fire({
      title: 'Edit Product',
      html: `
        <div style="text-align: left; font-size: 0.875rem;">
          <label style="font-weight: 600; display: block; margin-bottom: 4px; color: #0C1F41;">Product Name</label>
          <input id="swal-edit-prod-name" class="swal2-input" value="${(product.name || '').replace(/"/g, '&quot;')}" placeholder="Product Name" style="width: 100%; margin: 0 0 12px 0; box-sizing: border-box;" />

          <label style="font-weight: 600; display: block; margin-bottom: 4px; color: #0C1F41;">Category</label>
          <input id="swal-edit-prod-cat" class="swal2-input" value="${(product.category || 'Hardware').replace(/"/g, '&quot;')}" placeholder="e.g. Hardware, POS Accessories" style="width: 100%; margin: 0 0 12px 0; box-sizing: border-box;" />

          <label style="font-weight: 600; display: block; margin-bottom: 4px; color: #0C1F41;">Price (₹)</label>
          <input id="swal-edit-prod-price" type="number" step="any" min="0" class="swal2-input" value="${product.price || 0}" placeholder="Price" style="width: 100%; margin: 0 0 12px 0; box-sizing: border-box;" />

          <label style="font-weight: 600; display: block; margin-bottom: 4px; color: #0C1F41;">Product Link (Buy Now URL)</label>
          <input id="swal-edit-prod-link" type="url" class="swal2-input" value="${(product.product_link || '').replace(/"/g, '&quot;')}" placeholder="https://example.com/product" style="width: 100%; margin: 0 0 12px 0; box-sizing: border-box;" />

          <label style="font-weight: 600; display: block; margin-bottom: 4px; color: #0C1F41;">Product Description</label>
          <textarea id="swal-edit-prod-desc" class="swal2-textarea" placeholder="e.g. ATPOS premium smooth thermal paper rolls, jam-free dark printing for POS terminals" style="width: 100%; margin: 0; box-sizing: border-box; font-size: 0.85rem; height: 75px; resize: vertical; padding: 0.5rem 0.75rem; border: 1px solid #d9dde4; border-radius: 8px;">${(product.description || '').replace(/"/g, '&quot;')}</textarea>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Save Changes',
      confirmButtonColor: '#0284c7',
      preConfirm: () => {
        const name = document.getElementById('swal-edit-prod-name')?.value;
        const category = document.getElementById('swal-edit-prod-cat')?.value;
        const price = document.getElementById('swal-edit-prod-price')?.value;
        const product_link = document.getElementById('swal-edit-prod-link')?.value;
        const description = document.getElementById('swal-edit-prod-desc')?.value;

        if (!name || !name.trim()) {
          Swal.showValidationMessage('Product name is required');
          return false;
        }
        if (!product_link || !product_link.trim()) {
          Swal.showValidationMessage('Product link is required');
          return false;
        }
        if (!isValidUrl(product_link.trim())) {
          Swal.showValidationMessage('Please enter a valid product link URL');
          return false;
        }
        return {
          name: name.trim(),
          category: category ? category.trim() : 'General',
          price: parseFloat(price) || 0,
          product_link: product_link.trim(),
          description: description !== undefined ? description.trim() : ''
        };
      }
    });

    if (formValues) {
      try {
        const res = await call(`/admin/products/${product.id}`, {
          method: 'PUT',
          headers: getAdminHeaders(),
          body: JSON.stringify(formValues)
        });
        const updated = res?.product || { ...product, ...formValues };
        setProductsList(prev => prev.map(p => p.id === product.id ? { ...p, ...updated } : p));
        Swal.fire({ title: 'Updated!', text: 'Product updated successfully', icon: 'success', confirmButtonColor: '#0284c7' });
        loadAdminData();
      } catch (err) {
        Swal.fire('Error', err?.detail || err?.message || 'Failed to update product', 'error');
      }
    }
  };

  // Pricing Plans Handlers
  const handleOpenAddPlanModal = () => {
    setEditingPlan(null)
    setPlanForm({
      name: "",
      plan_type: "time",
      duration_months: 1,
      duration_label: "1 Month Validity (30 Days)",
      prints_count: 0,
      price: "",
      original_price: "",
      description: "",
      features: "Unlimited prints for 30 days\nThermal & POS printer support\nCustom shop branding & logo\nWhatsApp receipt sharing\nEmail & chat support",
      is_popular: false,
      status: "active",
      sort_order: (plansList.length + 1) * 10
    })
    setPlanError("")
    setShowPlanModal(true)
  }

  const handleOpenEditPlanModal = (plan) => {
    setEditingPlan(plan)
    let featuresText = ""
    if (Array.isArray(plan.features)) {
      featuresText = plan.features.join("\n")
    } else if (typeof plan.features === "string") {
      try {
        const parsed = JSON.parse(plan.features)
        featuresText = Array.isArray(parsed) ? parsed.join("\n") : plan.features
      } catch (_) {
        featuresText = plan.features
      }
    }

    setPlanForm({
      name: plan.name || "",
      plan_type: plan.plan_type || "time",
      duration_months: plan.duration_months !== undefined ? plan.duration_months : (plan.plan_type === "time" ? 1 : 0),
      duration_label: plan.duration_label || "",
      prints_count: plan.prints_count || 0,
      price: plan.price !== undefined ? plan.price : "",
      original_price: plan.original_price || "",
      description: plan.description || "",
      features: featuresText,
      is_popular: Boolean(plan.is_popular),
      status: plan.status || "active",
      sort_order: plan.sort_order !== undefined ? plan.sort_order : 10
    })
    setPlanError("")
    setShowPlanModal(true)
  }

  const handleClosePlanModal = () => {
    setShowPlanModal(false)
    setEditingPlan(null)
    setPlanError("")
  }

  const handleSavePlan = async (e) => {
    if (e) e.preventDefault()
    if (!planForm.name || !planForm.name.trim()) {
      setPlanError("Plan name is required.")
      return
    }
    const priceNum = Number(planForm.price)
    if (isNaN(priceNum) || priceNum < 0) {
      setPlanError("Please enter a valid price (greater than or equal to 0).")
      return
    }

    setPlanSubmitting(true)
    setPlanError("")

    const featuresArray = (planForm.features || "")
      .split("\n")
      .map(s => s.trim())
      .filter(Boolean)

    const payload = {
      name: planForm.name.trim(),
      plan_type: planForm.plan_type,
      duration_months: planForm.plan_type === "time" ? Number(planForm.duration_months || 1) : 0,
      duration_label: planForm.plan_type === "time" ? (planForm.duration_label || `${planForm.duration_months} Months Validity`) : null,
      prints_count: planForm.plan_type === "print" ? Number(planForm.prints_count || 0) : 0,
      price: priceNum,
      original_price: planForm.original_price ? Number(planForm.original_price) : null,
      description: (planForm.description || "").trim(),
      features: featuresArray,
      is_popular: Boolean(planForm.is_popular),
      status: planForm.status || "active",
      sort_order: Number(planForm.sort_order || 0)
    }

    try {
      if (editingPlan) {
        await call(`/admin/plans/${editingPlan.id}`, {
          method: "PUT",
          headers: getAdminHeaders(),
          body: JSON.stringify(payload)
        })
        Swal.fire({
          icon: "success",
          title: "Plan Updated!",
          text: `Plan "${payload.name}" updated successfully.`,
          timer: 2000,
          showConfirmButton: false
        })
      } else {
        await call("/admin/plans", {
          method: "POST",
          headers: getAdminHeaders(),
          body: JSON.stringify(payload)
        })
        Swal.fire({
          icon: "success",
          title: "Plan Created!",
          text: `New plan "${payload.name}" created successfully.`,
          timer: 2000,
          showConfirmButton: false
        })
      }
      setShowPlanModal(false)
      setEditingPlan(null)
      loadAdminData(true)
    } catch (err) {
      console.error("Failed to save plan:", err)
      setPlanError(err?.detail || err?.message || "Failed to save plan.")
    } finally {
      setPlanSubmitting(false)
    }
  }

  const handleDeletePlan = async (plan) => {
    const result = await Swal.fire({
      title: "Delete Plan?",
      text: `Are you sure you want to delete "${plan.name}"? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, Delete Plan"
    })

    if (result.isConfirmed) {
      try {
        await call(`/admin/plans/${plan.id}`, {
          method: "DELETE",
          headers: getAdminHeaders()
        })
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: `Plan "${plan.name}" deleted.`,
          timer: 2000,
          showConfirmButton: false
        })
        loadAdminData(true)
      } catch (err) {
        Swal.fire("Error", err?.detail || err?.message || "Failed to delete plan", "error")
      }
    }
  }

  const handleTogglePlanStatus = async (plan) => {
    const newStatus = plan.status === "active" ? "inactive" : "active"
    try {
      await call(`/admin/plans/${plan.id}`, {
        method: "PUT",
        headers: getAdminHeaders(),
        body: JSON.stringify({ status: newStatus })
      })
      loadAdminData(true)
    } catch (err) {
      Swal.fire("Error", err?.detail || err?.message || "Failed to update plan status", "error")
    }
  }

  const safePlansList = Array.isArray(plansList) ? plansList : []
  const filteredPlans = safePlansList.filter(p => {
    if (planFilterType === "time" && p.plan_type !== "time") return false
    if (planFilterType === "print" && p.plan_type !== "print") return false
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.duration_label && p.duration_label.toLowerCase().includes(q))
    )
  })

  const safeProductsList = Array.isArray(productsList) ? productsList : []
  const safeTemplatesList = Array.isArray(templatesList) ? templatesList : []
  const safeBillsList = Array.isArray(billsList) ? billsList : []
  const safeContactsList = Array.isArray(contactsList) ? contactsList : []

  const filteredProducts = safeProductsList.filter(p => {
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
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.shop_name && p.shop_name.toLowerCase().includes(q)) ||
      (p.user_name && p.user_name.toLowerCase().includes(q))
    )
  })

  const filteredTemplates = safeTemplatesList.filter(t => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.category && t.category.toLowerCase().includes(q)) ||
      (t.shop_name && t.shop_name.toLowerCase().includes(q))
    )
  })

  const filteredBills = safeBillsList.filter(b => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (b.bill_number && b.bill_number.toLowerCase().includes(q)) ||
      (b.customer_name && b.customer_name.toLowerCase().includes(q)) ||
      (b.shop_name && b.shop_name.toLowerCase().includes(q)) ||
      (b.user_email && b.user_email.toLowerCase().includes(q))
    )
  })

  const filteredContacts = safeContactsList.filter(c => {
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
  const paginatedPlans = filteredPlans.slice((currentPage - 1) * pageSize, currentPage * pageSize)
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
          <div className="admin-sidebar-brand-row">
            <img src="/logo.png" alt="Slipzen Admin" className="admin-sidebar-logo" />
            <div className="admin-sidebar-badges">
              <div className="admin-role-badge">
                <span className={`admin-role-pill ${isSuper ? "super" : "sub"}`}>
                  <ShieldCheck size={12} /> {isSuper ? "Super Admin" : "Sub-admin"}
                </span>
              </div>
              <button
                type="button"
                className="admin-mobile-logout-btn"
                title="Logout Admin"
                aria-label="Logout Admin"
                onClick={async () => {
                  const answer = await Swal.fire({
                    title: "Log out of the admin panel?",
                    text: "You will need to log in again to continue.",
                    icon: "question",
                    showCancelButton: true,
                    confirmButtonText: "Logout",
                    cancelButtonText: "Cancel",
                    confirmButtonColor: "#ef4444",
                    reverseButtons: true,
                    focusCancel: true
                  })
                  if (answer.isConfirmed) onLogout()
                }}
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>

        <nav className="admin-nav">
          {(can("overview") || can("users") || can("plan_buyers")) && (
            <div className="admin-nav-section">Overview &amp; Growth</div>
          )}
          {can("overview") && (<button
            className={`admin-nav-item ${activeTab === "overview" ? "active" : ""}`}
            title="Overview Stats"
            onClick={() => { setActiveTab("overview"); setSearchQuery(""); }}
          >
            <Activity size={18} />
            <span>Overview Stats</span>
          </button>)}

          {can("users") && (<button
            className={`admin-nav-item ${activeTab === "users" ? "active" : ""}`}
            title="Users &amp; Shops"
            onClick={() => { setActiveTab("users"); setSearchQuery(""); }}
          >
            <Users size={18} />
            <span>Users & Shops</span>
          </button>)}

          {can("plan_buyers") && (<button
            className={`admin-nav-item ${activeTab === "plan_buyers" ? "active" : ""}`}
            title="Plan Buyer Users"
            onClick={() => { setActiveTab("plan_buyers"); setSearchQuery(""); }}
          >
            <Crown size={18} />
            <span>Plan Buyer Users</span>
          </button>)}

          {(can("plans") || can("products") || can("menu") || can("templates")) && (
            <div className="admin-nav-section">Catalog &amp; Pricing</div>
          )}
          {can("plans") && (<button
            className={`admin-nav-item ${activeTab === "plans" ? "active" : ""}`}
            title="Pricing Plans"
            onClick={() => { setActiveTab("plans"); setSearchQuery(""); }}
          >
            <CreditCard size={18} />
            <span>Pricing Plans</span>
          </button>)}

          {can("products") && (<button
            className={`admin-nav-item ${activeTab === "products" ? "active" : ""}`}
            title="Product Catalog"
            onClick={() => { setActiveTab("products"); setSearchQuery(""); }}
          >
            <Package size={18} />
            <span>Product Catalog</span>
          </button>)}

          {can("menu") && (<button
            className={`admin-nav-item ${activeTab === "menu" ? "active" : ""}`}
            title="Menu Catalog"
            onClick={() => { setActiveTab("menu"); setSearchQuery(""); }}
          >
            <Utensils size={18} />
            <span>Menu Catalog</span>
          </button>)}

          {can("templates") && (<button
            className={`admin-nav-item ${activeTab === "templates" ? "active" : ""}`}
            title="Manage Templates"
            onClick={() => { setActiveTab("templates"); setSearchQuery(""); }}
          >
            <LayoutTemplate size={18} />
            <span>Manage Templates</span>
          </button>)}

          {(can("bills") || can("contacts") || can("notifications") || can("errors") || isSuper) && (
            <div className="admin-nav-section">Operations &amp; System</div>
          )}
          {can("bills") && (<button
            className={`admin-nav-item ${activeTab === "bills" ? "active" : ""}`}
            title="Bill History"
            onClick={() => { setActiveTab("bills"); setSearchQuery(""); }}
          >
            <Receipt size={18} />
            <span>Bill History</span>
          </button>)}

          {can("contacts") && (<button
            className={`admin-nav-item ${activeTab === "contacts" ? "active" : ""}`}
            title="Support Messages"
            onClick={() => { setActiveTab("contacts"); setSearchQuery(""); }}
          >
            <Mail size={18} />
            <span>Support Messages</span>
          </button>)}

          {can("notifications") && (<button
            className={`admin-nav-item ${activeTab === "notifications" ? "active" : ""}`}
            title="Push Notifications"
            onClick={() => { setActiveTab("notifications"); setSearchQuery(""); }}
          >
            <Bell size={18} />
            <span>Push Notifications</span>
          </button>)}

          {can("errors") && (<button
            className={`admin-nav-item ${activeTab === "errors" ? "active" : ""}`}
            title="Error Monitor"
            onClick={() => { setActiveTab("errors"); setSearchQuery(""); }}
            data-testid="admin-nav-errors"
          >
            <Bug size={18} />
            <span>Error Monitor</span>
          </button>)}
          {isSuper && (
            <button
              className={`admin-nav-item ${activeTab === "sub_admins" ? "active" : ""}`}
              title="Sub-admins"
              onClick={() => { setActiveTab("sub_admins"); setSearchQuery(""); }}
              data-testid="admin-nav-sub-admins"
            >
              <UserCog size={18} />
              <span>Sub-admins</span>
            </button>
          )}
          <button
            className={`admin-nav-item ${activeTab === "profile" ? "active" : ""}`}
            title="My Profile"
            onClick={() => { setActiveTab("profile"); setSearchQuery(""); }}
            data-testid="admin-nav-profile"
          >
            <UserCircle size={18} />
            <span>My Profile</span>
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <button
            className="admin-logout-btn"
            title="Logout Admin"
            onClick={async () => {
              const answer = await Swal.fire({
                title: "Log out of the admin panel?",
                text: "You will need to log in again to continue.",
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "Logout",
                cancelButtonText: "Cancel",
                confirmButtonColor: "#ef4444",
                reverseButtons: true,
                focusCancel: true
              })
              if (answer.isConfirmed) onLogout()
            }}
          >
            <LogOut size={16} /> <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Admin Main Content */}
      <main className="admin-main-content">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <h2 className="admin-topbar-title">
              {activeTab === "overview" && "System Dashboard Overview"}
              {activeTab === "users" && "User & Shop Directory"}
              {activeTab === "plan_buyers" && "Plan Buyer Users & Print Quotas"}
              {activeTab === "plans" && "Pricing Plans Management"}
              {activeTab === "products" && "System Product Catalog"}
              {activeTab === "menu" && "Master Menu Catalog"}
              {activeTab === "templates" && "Manage Bill Templates"}
              {activeTab === "bills" && "System Bill Logs"}
              {activeTab === "contacts" && "Customer Support Inquiries"}
              {activeTab === "notifications" && "Push Notifications"}
              {activeTab === "errors" && "Error Monitor"}
              {activeTab === "sub_admins" && "Sub-admins & Page Access"}
              {activeTab === "profile" && "Admin Profile & Security"}
              {activeTab === "none" && "No pages yet"}
            </h2>
          </div>

          <div className="admin-topbar-actions">
            <button className="admin-refresh-btn" onClick={() => loadAdminData(true)} disabled={loading}>
              <RefreshCw size={14} className={loading ? "spin" : ""} /> <span>{loading ? "Refreshing..." : "Refresh"}</span>
            </button>
            <button
              type="button"
              className={`admin-user-chip ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => { setActiveTab("profile"); setSearchQuery(""); }}
              title="Open Admin Profile & Security"
            >
              <span className="admin-user-avatar">
                {(activeAdmin?.name || activeAdmin?.username || activeAdmin?.email || "A").trim().charAt(0).toUpperCase()}
              </span>
              <div className="admin-user-chip-info">
                <span className="admin-user-chip-name">{activeAdmin?.name || (isSuper ? "Super Admin" : "Sub-admin")}</span>
                <span className="admin-user-chip-email">{activeAdmin?.username ? `@${activeAdmin.username}` : (activeAdmin?.email || "admin@slipzo.com")}</span>
              </div>
            </button>
          </div>
        </header>

        <div className="admin-body">
          {activeTab === "profile" ? (
            <AdminProfile admin={activeAdmin} onAdminUpdated={handleProfileUpdated} />
          ) : loading && !statsData ? (
            <div role="status" aria-label="Loading dashboard">
              <MetricSkeleton count={4} />
              <div style={{ marginTop: "1.25rem" }}><TableSkeleton rows={6} cols={4} /></div>
            </div>
          ) : (
          <>
          {activeTab === "overview" && (
            <>
              <div className="admin-stats-grid">
                <div className="admin-stat-card">
                  <div className="admin-stat-icon tone-blue">
                    <Users size={22} />
                  </div>
                  <div>
                    <h3 className="admin-stat-val">{Number(statsData?.stats?.totalUsers || 0).toLocaleString("en-IN")}</h3>
                    <p className="admin-stat-lbl">Registered Users</p>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-icon tone-indigo">
                    <Store size={22} />
                  </div>
                  <div>
                    <h3 className="admin-stat-val">{Number(statsData?.stats?.totalShops || 0).toLocaleString("en-IN")}</h3>
                    <p className="admin-stat-lbl">Shops Setup</p>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-icon tone-emerald">
                    <Receipt size={22} />
                  </div>
                  <div>
                    <h3 className="admin-stat-val">{Number(statsData?.stats?.totalBills || 0).toLocaleString("en-IN")}</h3>
                    <p className="admin-stat-lbl">Total Bills Generated</p>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-icon tone-amber">
                    <Package size={22} />
                  </div>
                  <div>
                    <h3 className="admin-stat-val">{Number(statsData?.stats?.totalProducts || 0).toLocaleString("en-IN")}</h3>
                    <p className="admin-stat-lbl">Catalog Products</p>
                  </div>
                </div>
              </div>

              <AdminAnalytics />

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
                      <th>Phone / Email</th>
                      <th>Shop Name</th>
                      <th>Joined Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsData?.recentUsers?.map((u) => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 600, color: "#0C1F41" }}>{u.name}</td>
                        <td>{/@phone\.slipzo\.invalid$/i.test(u.email || "") ? `+91 ${u.email.split("@")[0]}` : u.email}</td>
                        <td>{u.shop_name || <span style={{ color: "#74788A" }}>No Shop Yet</span>}</td>
                        <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "N/A"}</td>
                      </tr>
                    ))}
                    {(!statsData?.recentUsers || statsData.recentUsers.length === 0) && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", color: "#74788A" }}>
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
                <table className="admin-table admin-users-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Shop</th>
                      <th>Credits</th>
                      <th>Bills</th>
                      <th>Products</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((u) => {
                      // accounts made with a mobile number carry an internal address: the number is shown instead
                      const realEmail = u.email && !/@phone\.slipzo\.invalid$/i.test(u.email) ? u.email : ""
                      const loginPhone = u.phone || (u.email && /@phone\.slipzo\.invalid$/i.test(u.email) ? u.email.split("@")[0] : "")
                      const logo = u.shop_profile || u.shop_logo_url
                      return (
                      <tr key={u.id}>
                        <td>
                          <div className="admin-user-cell">
                            <span className="admin-user-logo">
                              {logo ? (
                                <img
                                  src={logo}
                                  alt=""
                                  onError={(e) => { e.target.style.display = "none"; if (e.target.nextSibling) e.target.nextSibling.style.display = "flex" }}
                                />
                              ) : null}
                              <span style={{ display: logo ? "none" : "flex" }}>
                                {(u.shop_name || u.name || "?").trim().charAt(0).toUpperCase()}
                              </span>
                            </span>
                            <span className="admin-user-text">
                              <b title={u.name}>{u.name}</b>
                              {loginPhone && <small>+91 {loginPhone}</small>}
                              {realEmail && <small title={realEmail}>{realEmail}</small>}
                            </span>
                          </div>
                        </td>
                        <td>
                          {u.shop_name ? (
                            <span className="admin-tag admin-tag-blue admin-shop-tag" title={u.shop_name}>{u.shop_name}</span>
                          ) : (
                            <span style={{ color: "#74788A" }}>Pending</span>
                          )}
                          {u.shop_phone && u.shop_phone !== loginPhone && (
                            <div className="admin-sub-line">{u.shop_phone}</div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 800, color: Number(u.prints_remaining || 0) > 0 ? "#0284c7" : "#dc2626", whiteSpace: "nowrap" }}>
                            {Number(u.prints_remaining || 0).toLocaleString("en-IN")} left
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "#74788A", whiteSpace: "nowrap" }}>
                            {Number(u.prints_used || 0).toLocaleString("en-IN")} used of {Number(u.prints_total || 0).toLocaleString("en-IN")}
                          </div>
                        </td>
                        <td>
                          <span className="admin-tag admin-tag-green" style={{ whiteSpace: "nowrap" }}>{u.bill_count || 0} bills</span>
                        </td>
                        <td>{u.product_count || 0}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}</td>
                        <td>
                          {can("grant_credits") ? <button
                            className="admin-refresh-btn"
                            style={{ background: "#f0f9ff", color: "#0284c7", border: "1px solid #bae6fd", whiteSpace: "nowrap" }}
                            onClick={() => handleGrantCredits(u)}
                            title="Grant Print Credits"
                          >
                            <Plus size={13} /> Credits
                          </button> : <span className="admin-sub-line">View only</span>}
                        </td>
                      </tr>
                      )
                    })}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", color: "#74788A", padding: "2rem" }}>
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
                    <span style={{ fontSize: "0.725rem", color: "#74788A" }}>Successful payments</span>
                  </div>
                </div>

                {/* 2. Total Plan Buyers */}
                <div className="admin-stat-card">
                  <div className="admin-stat-icon" style={{ background: "#f0f9ff", color: "#0284c7" }}>
                    <Users size={24} />
                  </div>
                  <div>
                    <h3 className="admin-stat-val">{totalUniquePlanBuyers}</h3>
                    <p className="admin-stat-lbl">Total Plan Buyers</p>
                    <span style={{ fontSize: "0.725rem", color: "#74788A" }}>Unique buyers</span>
                  </div>
                </div>

                {/* 3. Starter Pack */}
                <div className="admin-stat-card">
                  <div className="admin-stat-icon" style={{ background: "#f0f9ff", color: "#0284c7" }}>
                    <Zap size={24} />
                  </div>
                  <div>
                    <h3 className="admin-stat-val">{starterPackCount}</h3>
                    <p className="admin-stat-lbl">Starter Pack</p>
                    <span style={{ fontSize: "0.725rem", color: "#74788A" }}>Starter plan sales</span>
                  </div>
                </div>

                {/* 4. Pro Growth */}
                <div className="admin-stat-card">
                  <div className="admin-stat-icon" style={{ background: "#f0f9ff", color: "#0284c7" }}>
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h3 className="admin-stat-val">{proGrowthCount}</h3>
                    <p className="admin-stat-lbl">Pro Growth</p>
                    <span style={{ fontSize: "0.725rem", color: "#74788A" }}>Pro plan sales</span>
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
                <table className="admin-table admin-users-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Shop</th>
                      <th>Plan</th>
                      <th>Amount</th>
                      <th>Payment ID</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPlanBuyers.map((b, idx) => {
                      // accounts made with a mobile number carry an internal address: the number is shown instead
                      const phoneLogin = b.user_email && /@phone\.slipzo\.invalid$/i.test(b.user_email) ? b.user_email.split("@")[0] : ""
                      const realEmail = b.user_email && !phoneLogin ? b.user_email : ""
                      return (
                      <tr key={b.subscription_id || b.user_id || idx}>
                        <td>
                          <span className="admin-user-text">
                            <b title={b.user_name}>{b.user_name}</b>
                            {phoneLogin && <small>+91 {phoneLogin}</small>}
                            {realEmail && <small title={realEmail}>{realEmail}</small>}
                          </span>
                        </td>
                        <td>
                          {b.shop_name
                            ? <span className="admin-cell-clip" title={b.shop_name}>{b.shop_name}</span>
                            : <span style={{ color: "#74788A" }}>Standard Shop</span>}
                        </td>
                        <td>
                          <span className="admin-tag admin-tag-purple admin-plan-tag" title={b.plan_name || "Pro Plan"}>
                            <Crown size={12} /> <span className="admin-plan-name">{b.plan_name || "Pro Plan"}</span>
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: "#0284c7", whiteSpace: "nowrap" }}>
                          ₹{b.amount ? Number(b.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                        </td>
                        <td>
                          <code className="admin-payment-id" title={b.payment_id || ""}>
                            {b.payment_id || "N/A"}
                          </code>
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>{b.created_at ? new Date(b.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Recently"}</td>
                        <td>
                          {can("grant_credits") ? <button
                            className="admin-refresh-btn"
                            style={{ background: "#f0f9ff", color: "#0284c7", border: "1px solid #bae6fd", whiteSpace: "nowrap" }}
                            onClick={() => handleGrantCredits(b)}
                            title="Grant Print Credits"
                          >
                            <Plus size={13} /> Credits
                          </button> : <span className="admin-sub-line">View only</span>}
                        </td>
                      </tr>
                      )
                    })}
                    {filteredPlanBuyers.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", color: "#74788A", padding: "2rem" }}>
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

          {activeTab === "plans" && (
            <>
              {/* Analytics Section for Plans */}
              <div className="admin-stats-grid">
                {/* 1. Total Plans */}
                <div className="admin-stat-card admin-stat-card--detail">
                  <div className="admin-stat-header">
                    <div>
                      <div className="admin-stat-title">Total Configured Plans</div>
                      <div className="admin-stat-val" style={{ color: "#0C1F41" }}>
                        {plansStats?.totalPlans ?? plansList.length}
                      </div>
                    </div>
                    <div className="admin-stat-icon-wrapper" style={{ background: "#f0f9ff", color: "#0284c7" }}>
                      <CreditCard size={22} />
                    </div>
                  </div>
                  <div className="admin-stat-footer" style={{ color: "#74788A" }}>
                    Active & Inactive across all types
                  </div>
                </div>

                {/* 2. Time-Based Plans */}
                <div className="admin-stat-card admin-stat-card--detail">
                  <div className="admin-stat-header">
                    <div>
                      <div className="admin-stat-title">Time-Based Plans</div>
                      <div className="admin-stat-val" style={{ color: "#0284c7" }}>
                        {plansStats?.timePlansCount ?? plansList.filter(p => p.plan_type === "time").length}
                      </div>
                    </div>
                    <div className="admin-stat-icon-wrapper" style={{ background: "#e0f2fe", color: "#0284c7" }}>
                      <Clock size={22} />
                    </div>
                  </div>
                  <div className="admin-stat-footer" style={{ color: "#0284c7" }}>
                    1 Month, 3 Months, 1 Year plans
                  </div>
                </div>

                {/* 3. Print-Based Plans */}
                <div className="admin-stat-card admin-stat-card--detail">
                  <div className="admin-stat-header">
                    <div>
                      <div className="admin-stat-title">Print-Based Packs</div>
                      <div className="admin-stat-val" style={{ color: "#7c3aed" }}>
                        {plansStats?.printPlansCount ?? plansList.filter(p => p.plan_type === "print").length}
                      </div>
                    </div>
                    <div className="admin-stat-icon-wrapper" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
                      <Package size={22} />
                    </div>
                  </div>
                  <div className="admin-stat-footer" style={{ color: "#7c3aed" }}>
                    Fixed quota & starter packs
                  </div>
                </div>

                {/* 4. Active Plans */}
                <div className="admin-stat-card admin-stat-card--detail">
                  <div className="admin-stat-header">
                    <div>
                      <div className="admin-stat-title">Live on Pricing Page</div>
                      <div className="admin-stat-val" style={{ color: "#16a34a" }}>
                        {plansStats?.activePlansCount ?? plansList.filter(p => p.status === "active").length}
                      </div>
                    </div>
                    <div className="admin-stat-icon-wrapper" style={{ background: "#ecfdf5", color: "#16a34a" }}>
                      <CheckCircle size={22} />
                    </div>
                  </div>
                  <div className="admin-stat-footer" style={{ color: "#16a34a" }}>
                    Active for public checkout
                  </div>
                </div>
              </div>

              {/* Plans Table Container */}
              <div className="admin-table-container">
                <div className="admin-table-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <h4 className="admin-table-title" style={{ margin: 0 }}>
                      Pricing Plans ({filteredPlans.length})
                    </h4>
                    {/* Filter Pills */}
                    <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '0.2rem', borderRadius: '8px', gap: '0.25rem' }}>
                      <button
                        type="button"
                        onClick={() => setPlanFilterType("all")}
                        className="admin-refresh-btn"
                        style={{
                          border: 'none',
                          padding: '0.25rem 0.65rem',
                          fontSize: '0.75rem',
                          background: planFilterType === "all" ? '#ffffff' : 'transparent',
                          color: planFilterType === "all" ? '#0284c7' : '#64748b',
                          boxShadow: planFilterType === "all" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                          fontWeight: planFilterType === "all" ? 700 : 500
                        }}
                      >
                        All ({plansList.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlanFilterType("time")}
                        className="admin-refresh-btn"
                        style={{
                          border: 'none',
                          padding: '0.25rem 0.65rem',
                          fontSize: '0.75rem',
                          background: planFilterType === "time" ? '#ffffff' : 'transparent',
                          color: planFilterType === "time" ? '#0284c7' : '#64748b',
                          boxShadow: planFilterType === "time" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                          fontWeight: planFilterType === "time" ? 700 : 500
                        }}
                      >
                        Time-Based ({plansList.filter(p => p.plan_type === "time").length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlanFilterType("print")}
                        className="admin-refresh-btn"
                        style={{
                          border: 'none',
                          padding: '0.25rem 0.65rem',
                          fontSize: '0.75rem',
                          background: planFilterType === "print" ? '#ffffff' : 'transparent',
                          color: planFilterType === "print" ? '#0284c7' : '#64748b',
                          boxShadow: planFilterType === "print" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                          fontWeight: planFilterType === "print" ? 700 : 500
                        }}
                      >
                        Print-Based ({plansList.filter(p => p.plan_type === "print").length})
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      className="admin-search-input"
                      placeholder="Search plan name, validity..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button
                      className="admin-refresh-btn"
                      style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '0.45rem 0.95rem' }}
                      onClick={handleOpenAddPlanModal}
                    >
                      <Plus size={14} /> Create New Plan
                    </button>
                  </div>
                </div>

                <div className="admin-product-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: "18%" }}>Plan Name</th>
                        <th style={{ width: "12%", textAlign: "center" }}>Type</th>
                        <th style={{ width: "16%" }}>Validity / Quota</th>
                        <th style={{ width: "12%", textAlign: "right" }}>Price</th>
                        <th style={{ width: "18%" }}>Description & Features</th>
                        <th style={{ width: "10%", textAlign: "center" }}>Status</th>
                        <th style={{ width: "6%", textAlign: "center" }}>Order</th>
                        <th style={{ width: "8%", textAlign: "center" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPlans.map((plan) => (
                        <tr key={plan.id}>
                          {/* 1. Name & Popular */}
                          <td>
                            <div style={{ fontWeight: 700, color: "#0C1F41", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                              {plan.name}
                              {plan.is_popular && (
                                <span className="admin-tag admin-tag-blue" style={{ fontSize: "0.68rem", padding: "0.1rem 0.35rem" }}>
                                  Popular
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>ID: {plan.id}</div>
                          </td>

                          {/* 2. Type */}
                          <td style={{ textAlign: "center" }}>
                            {plan.plan_type === "time" ? (
                              <span className="admin-tag admin-tag-blue" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                                <Clock size={11} /> Time-Based
                              </span>
                            ) : (
                              <span className="admin-tag" style={{ background: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                                <Package size={11} /> Print-Based
                              </span>
                            )}
                          </td>

                          {/* 3. Validity / Quota */}
                          <td>
                            {plan.plan_type === "time" ? (
                              <div>
                                <strong style={{ color: "#0C1F41" }}>{plan.duration_label || `${plan.duration_months} Months`}</strong>
                                <div style={{ fontSize: "0.75rem", color: "#16a34a" }}>Unlimited Prints</div>
                              </div>
                            ) : (
                              <div>
                                <strong style={{ color: "#0C1F41" }}>{Number(plan.prints_count || 0).toLocaleString("en-IN")} Prints</strong>
                                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Permanent Quota</div>
                              </div>
                            )}
                          </td>

                          {/* 4. Price */}
                          <td style={{ textAlign: "right" }}>
                            <div style={{ fontWeight: 800, color: "#0C1F41", fontSize: "0.95rem" }}>
                              ₹{Number(plan.price || 0).toLocaleString("en-IN")}
                            </div>
                            {plan.original_price && plan.original_price > plan.price && (
                              <div style={{ fontSize: "0.75rem", color: "#94a3b8", textDecoration: "line-through" }}>
                                ₹{Number(plan.original_price).toLocaleString("en-IN")}
                              </div>
                            )}
                          </td>

                          {/* 5. Description & Features */}
                          <td>
                            <PlanDescriptionCell plan={plan} />
                          </td>

                          {/* 6. Status Toggle */}
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleTogglePlanStatus(plan)}
                              className={`admin-tag ${plan.status === "active" ? "admin-tag-green" : "admin-tag-gray"}`}
                              style={{ cursor: "pointer", border: "none" }}
                              title="Click to toggle status"
                            >
                              {plan.status === "active" ? "Active" : "Inactive"}
                            </button>
                          </td>

                          {/* 7. Sort Order */}
                          <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>
                            {plan.sort_order ?? 0}
                          </td>

                          {/* 8. Actions */}
                          <td style={{ textAlign: "center" }}>
                            <div style={{ display: "inline-flex", gap: "0.35rem" }}>
                              <button
                                className="admin-action-btn edit-btn"
                                onClick={() => handleOpenEditPlanModal(plan)}
                                title="Edit Plan"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                className="admin-action-btn delete-btn"
                                onClick={() => handleDeletePlan(plan)}
                                title="Delete Plan"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredPlans.length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ textAlign: "center", color: "#74788A", padding: "2.5rem" }}>
                            No pricing plans found matching your criteria. Click "+ Create New Plan" to add one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {renderPagination(filteredPlans.length)}
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
                    style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '0.45rem 0.95rem' }}
                    onClick={handleOpenAddProductModal}
                  >
                    <Plus size={14} /> Add New Product
                  </button>
                </div>
              </div>
              <div className="admin-product-table-wrapper">
                <table className="admin-table admin-product-table">
                  <thead>
                    <tr>
                      <th style={{ width: "8%", textAlign: "center" }}>Product Photo</th>
                      <th style={{ width: "17%" }}>Product Name</th>
                      <th style={{ width: "9.5%", textAlign: "center" }}>Category</th>
                      <th style={{ width: "7.5%", textAlign: "center" }}>Price</th>
                      <th style={{ width: "8%", textAlign: "center" }}>Product Link</th>
                      <th style={{ width: "9%", textAlign: "center" }}>Status</th>
                      <th style={{ width: "16%" }}>Shop / User</th>
                      <th style={{ width: "9.5%", textAlign: "center", whiteSpace: "nowrap" }}>Created Date</th>
                      <th style={{ width: "8.5%", textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map((p) => (
                      <tr key={p.id}>
                        {/* 1. Product Photo */}
                        <td style={{ textAlign: "center", verticalAlign: "middle" }}>
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
                                style={{ width: '34px', height: '34px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #bae6fd', display: 'inline-block', verticalAlign: 'middle' }}
                              />
                            ) : (
                              <div style={{ width: '34px', height: '34px', borderRadius: '6px', background: '#f0f9ff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', border: '1px solid #bae6fd', margin: '0 auto', verticalAlign: 'middle' }}>
                                <Package size={16} />
                              </div>
                            )
                          })()}
                        </td>

                        {/* 2. Product Name & Description */}
                        <td style={{ fontWeight: 600, color: "#0C1F41", fontSize: "0.825rem", lineHeight: 1.3, wordBreak: "break-word" }}>
                          <div>{p.name}</div>
                          {p.description && (
                            <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 400, marginTop: "2px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }} title={p.description}>
                              {p.description}
                            </div>
                          )}
                        </td>

                        {/* 3. Category */}
                        <td style={{ textAlign: "center" }}>
                          <span className="admin-tag admin-tag-blue" style={{ fontSize: '0.72rem', padding: '0.18rem 0.45rem', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.category || "General"}
                          </span>
                        </td>

                        {/* 4. Price */}
                        <td style={{ fontWeight: 700, color: "#16a34a", fontSize: "0.825rem", whiteSpace: "nowrap", textAlign: "center" }}>
                          ₹{Number(p.price || 0).toLocaleString()}
                        </td>

                        {/* 5. Product Link */}
                        <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                          {p.product_link ? (
                            <a
                              href={p.product_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px',
                                color: '#0284c7',
                                fontSize: '0.775rem',
                                fontWeight: 600,
                                textDecoration: 'none'
                              }}
                              title={p.product_link}
                            >
                              <ExternalLink size={12} /> Link
                            </a>
                          ) : (
                            <span style={{ color: '#8F93A5', fontSize: '0.75rem' }}>No link</span>
                          )}
                        </td>

                        {/* 6. Status */}
                        <td style={{ textAlign: "center" }}>
                          <select
                            value={(p.status || 'active').toLowerCase() === 'active' ? 'active' : 'inactive'}
                            onChange={(e) => handleStatusChange(p, e.target.value)}
                            style={{
                              background: (p.status || 'active').toLowerCase() === 'active' ? '#dcfce7' : '#f8fafc',
                              color: (p.status || 'active').toLowerCase() === 'active' ? '#15803d' : '#74788A',
                              border: `1px solid ${(p.status || 'active').toLowerCase() === 'active' ? '#bbf7d0' : '#D9DDE4'}`,
                              padding: '0.2rem 0.35rem',
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              borderRadius: '16px',
                              cursor: 'pointer',
                              outline: 'none',
                              boxSizing: 'border-box',
                              display: 'inline-block',
                              maxWidth: '100%'
                            }}
                            title="Change Product Active / Inactive status"
                          >
                            <option value="active" style={{ background: '#ffffff', color: '#15803d', fontWeight: 600 }}>Active</option>
                            <option value="inactive" style={{ background: '#ffffff', color: '#74788A', fontWeight: 600 }}>Inactive</option>
                          </select>
                        </td>

                        {/* 7. Shop / User */}
                        <td style={{ lineHeight: 1.3 }}>
                          <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.shop_name || p.user_name || "Unknown"}>
                            {p.shop_name || p.user_name || "Unknown"}
                          </div>
                          <div style={{ fontSize: "0.7rem", color: "#74788A", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.user_email}>
                            {p.user_email}
                          </div>
                        </td>

                        {/* 8. Created Date */}
                        <td style={{ textAlign: "center", whiteSpace: "nowrap", color: '#74788A', fontSize: '0.775rem' }}>
                          {p.created_at ? new Date(p.created_at).toLocaleDateString() : "N/A"}
                        </td>

                        {/* 9. Actions */}
                        <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                          <div className="admin-actions-cell" style={{ justifyContent: 'center', gap: '5px' }}>
                            <button
                              type="button"
                              className="admin-action-btn admin-action-btn-edit"
                              onClick={() => handleEditProduct(p)}
                              title="Edit Product"
                              aria-label="Edit Product"
                              style={{ width: '30px', height: '30px' }}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              className="admin-action-btn admin-action-btn-delete"
                              onClick={() => handleDeleteProduct(p)}
                              title="Delete Product"
                              aria-label="Delete Product"
                              style={{ width: '30px', height: '30px' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={9} style={{ textAlign: "center", color: "#74788A", padding: "2rem" }}>
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

          {activeTab === "menu" && (
            <AdminMenuManagement getAdminHeaders={getAdminHeaders} />
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
                    style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '0.45rem 0.95rem' }}
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
                        <td style={{ fontWeight: 600, color: "#0C1F41" }}>{t.name}</td>
                        <td>
                          <span className="admin-tag admin-tag-purple">{t.category || "Receipt"}</span>
                        </td>
                        <td>
                          <span className="admin-tag admin-tag-blue">{t.width || "58mm Thermal"}</span>
                        </td>
                        <td>
                          <div>{t.shop_name || t.user_name || "System"}</div>
                          <div style={{ fontSize: "0.75rem", color: "#74788A" }}>{t.user_email}</div>
                        </td>
                        <td>{t.created_at ? new Date(t.created_at).toLocaleDateString() : "N/A"}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <button
                              className="admin-refresh-btn"
                              style={{ background: "#fee2e2", color: "#ef4444", border: "1px solid #FFB8BD", padding: "0.35rem 0.65rem" }}
                              onClick={() => handleDeleteTemplate(t)}
                              title="Delete Template"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredTemplates.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", color: "#74788A", padding: "2rem" }}>
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
                          <div style={{ fontSize: "0.75rem", color: "#74788A" }}>{b.user_email}</div>
                        </td>
                        <td>{b.customer_name || "Cash Customer"}</td>
                        <td style={{ fontWeight: 700, color: "#16a34a" }}>₹{Number(b.total || 0).toLocaleString()}</td>
                        <td>{b.created_at ? new Date(b.created_at).toLocaleString() : "N/A"}</td>
                      </tr>
                    ))}
                    {filteredBills.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", color: "#74788A", padding: "2rem" }}>
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

          {activeTab === "notifications" && <AdminPushNotifications />}
          {activeTab === "sub_admins" && isSuper && <AdminSubAdmins />}
          {activeTab === "none" && (
            <div className="admin-table-container" style={{ padding: "2.5rem 1.5rem", textAlign: "center", color: "#64748b" }}>
              No admin pages have been given to your account yet. Please ask the super admin.
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
                        <td style={{ fontWeight: 600, color: "#0C1F41" }}>{c.name}</td>
                        <td>
                          <div>{c.email}</div>
                          <div style={{ fontSize: "0.75rem", color: "#74788A" }}>{c.phone}</div>
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
                        <td colSpan={5} style={{ textAlign: "center", color: "#74788A", padding: "2rem" }}>
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

          {activeTab === "errors" && <AdminErrors />}
          </>
          )}
        </div>
      </main>

      {/* Plan Create / Edit Modal */}
      {showPlanModal && (
        <div
          className="admin-modal-overlay"
          onClick={handleClosePlanModal}
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
              maxWidth: '620px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #bae6fd'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0C1F41' }}>
                    {editingPlan ? `Edit Plan: ${editingPlan.name}` : "Create New Pricing Plan"}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                    Configure time-based or print-based plan displayed to users
                  </p>
                </div>
              </div>
              <button
                onClick={handleClosePlanModal}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSavePlan} style={{ padding: '1.5rem' }}>
              {planError && (
                <div className="admin-alert-error" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={16} />
                  <span>{planError}</span>
                </div>
              )}

              {/* Row 1: Plan Name & Plan Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0C1F41', marginBottom: '0.35rem' }}>
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1 Month Plan or Pro Growth"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    className="admin-search-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0C1F41', marginBottom: '0.35rem' }}>
                    Plan Category / Type *
                  </label>
                  <select
                    value={planForm.plan_type}
                    onChange={(e) => {
                      const newType = e.target.value
                      setPlanForm({
                        ...planForm,
                        plan_type: newType,
                        duration_label: newType === "time" ? `${planForm.duration_months || 1} Month Validity` : "",
                        prints_count: newType === "print" ? (planForm.prints_count || 1000) : 0
                      })
                    }}
                    className="admin-select-input"
                    style={{ width: '100%', boxSizing: 'border-box', height: '38px' }}
                  >
                    <option value="time">⏱️ Time-Based (Monthly / Yearly)</option>
                    <option value="print">🖨️ Print-Based (Fixed Print Quota)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Conditional on Type (Duration vs Prints) */}
              {planForm.plan_type === "time" ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem', background: '#f0f9ff', padding: '0.85rem', borderRadius: '10px', border: '1px solid #bae6fd' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0C1F41', marginBottom: '0.35rem' }}>
                      Duration (Months) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={planForm.duration_months}
                      onChange={(e) => {
                        const m = parseInt(e.target.value) || 1
                        const defaultLabel = m === 1 ? "1 Month Validity (30 Days)" : m === 3 ? "3 Months Validity (90 Days)" : m === 12 ? "1 Year Validity (365 Days)" : `${m} Months Validity`
                        setPlanForm({ ...planForm, duration_months: m, duration_label: defaultLabel })
                      }}
                      className="admin-search-input"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0C1F41', marginBottom: '0.35rem' }}>
                      Validity Label (Shown on card)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1 Month Validity (30 Days)"
                      value={planForm.duration_label}
                      onChange={(e) => setPlanForm({ ...planForm, duration_label: e.target.value })}
                      className="admin-search-input"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '1rem', background: '#f5f3ff', padding: '0.85rem', borderRadius: '10px', border: '1px solid #ddd6fe' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#5b21b6', marginBottom: '0.35rem' }}>
                    Prints Count (Quota added to shop balance) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 1000, 2000, 5000"
                    value={planForm.prints_count}
                    onChange={(e) => setPlanForm({ ...planForm, prints_count: parseInt(e.target.value) || 0 })}
                    className="admin-search-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              {/* Row 3: Price & Original Price */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0C1F41', marginBottom: '0.35rem' }}>
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 299"
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                    className="admin-search-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0C1F41', marginBottom: '0.35rem' }}>
                    Original Price (₹) (Optional strikethrough)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 399"
                    value={planForm.original_price}
                    onChange={(e) => setPlanForm({ ...planForm, original_price: e.target.value })}
                    className="admin-search-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Row 4: Description */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0C1F41', marginBottom: '0.35rem' }}>
                  Short Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Perfect for small shops and new merchants getting started with digital billing."
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="admin-search-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              {/* Row 5: Features (Multiline) */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0C1F41' }}>
                    Plan Features (One per line)
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {(planForm.features || '').split('\n').filter(s => s.trim()).length} lines
                  </span>
                </div>
                <textarea
                  rows={4}
                  placeholder="Unlimited prints for 30 days&#10;Thermal & POS printer support&#10;Custom shop branding & logo&#10;WhatsApp receipt sharing&#10;Email & chat support"
                  value={planForm.features}
                  onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
                  className="admin-search-input"
                  style={{ width: '100%', boxSizing: 'border-box', height: '100px', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.82rem', lineHeight: 1.4 }}
                />
              </div>

              {/* Row 6: Toggles & Order */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0C1F41', marginBottom: '0.35rem' }}>
                    Display Status
                  </label>
                  <select
                    value={planForm.status}
                    onChange={(e) => setPlanForm({ ...planForm, status: e.target.value })}
                    className="admin-select-input"
                    style={{ width: '100%', boxSizing: 'border-box', height: '38px' }}
                  >
                    <option value="active">Active (Visible)</option>
                    <option value="inactive">Inactive (Hidden)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0C1F41', marginBottom: '0.35rem' }}>
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={planForm.sort_order}
                    onChange={(e) => setPlanForm({ ...planForm, sort_order: parseInt(e.target.value) || 0 })}
                    className="admin-search-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ paddingTop: '1.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, color: '#0C1F41' }}>
                    <input
                      type="checkbox"
                      checked={planForm.is_popular}
                      onChange={(e) => setPlanForm({ ...planForm, is_popular: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#0284c7' }}
                    />
                    <span>Popular Plan Badge</span>
                  </label>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={handleClosePlanModal}
                  className="admin-refresh-btn"
                  style={{ padding: '0.55rem 1.25rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={planSubmitting}
                  className="admin-refresh-btn"
                  style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '0.55rem 1.5rem', fontWeight: 700 }}
                >
                  {planSubmitting ? <ButtonLoader text="Saving Plan..." /> : (editingPlan ? "Update Plan" : "Create Plan")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              maxWidth: '560px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #bae6fd',
              padding: '1.25rem 1.5rem',
              boxSizing: 'border-box'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', paddingBottom: '0.65rem', borderBottom: '1px solid #f0f9ff' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0C1F41', margin: 0 }}>
                Add New Product to Catalog
              </h3>
              <button
                type="button"
                onClick={handleCloseAddProductModal}
                style={{
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '8px',
                  color: '#0284c7',
                  cursor: 'pointer',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                title="Close"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitAddProduct} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {/* Row 1: Product Name (Full Width) */}
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px', fontSize: '0.825rem', color: '#0C1F41' }}>
                  Product Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Thermal Receipt Printer 80mm"
                  value={prodForm.name}
                  onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #D9DDE4', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Row 2: Category (Full Width) */}
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px', fontSize: '0.825rem', color: '#0C1F41' }}>
                  Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hardware, POS Accessories"
                  value={prodForm.category}
                  onChange={(e) => setProdForm({ ...prodForm, category: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #D9DDE4', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Row 3: Price (₹) & Product Link (Split Row: 135px 1fr) */}
              <div className="admin-modal-row-split">
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px', fontSize: '0.825rem', color: '#0C1F41' }}>
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 300"
                    value={prodForm.price}
                    onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #D9DDE4', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px', fontSize: '0.825rem', color: '#0C1F41' }}>
                    Product Link <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://example.com/product"
                    value={prodForm.product_link}
                    onChange={(e) => setProdForm({ ...prodForm, product_link: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #D9DDE4', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Row 4: Product Description (Full Width) */}
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px', fontSize: '0.825rem', color: '#0C1F41' }}>
                  Product Description
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. ATPOS premium smooth thermal paper rolls, jam-free dark printing for POS terminals"
                  value={prodForm.description}
                  onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #D9DDE4', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              {/* Row 5: Product Photos Section (MIN 1, MAX 5) */}
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '0.65rem 0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                  <div>
                    <label style={{ fontWeight: 700, fontSize: '0.825rem', color: '#0C1F41', display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
                      Product Photos <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <span style={{ fontSize: '0.725rem', color: '#74788A' }}>
                      Upload 1–5 photos (JPG, PNG, WEBP)
                    </span>
                  </div>

                  <span style={{
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '10px',
                    background: prodPhotos.length >= 1 && prodPhotos.length <= 5 ? '#dcfce7' : '#fee2e2',
                    color: prodPhotos.length >= 1 && prodPhotos.length <= 5 ? '#15803d' : '#b91c1c',
                    border: `1px solid ${prodPhotos.length >= 1 && prodPhotos.length <= 5 ? '#bbf7d0' : '#FFB8BD'}`
                  }}>
                    {prodPhotos.length} / 5 photos
                  </span>
                </div>

                {/* Upload Action & Thumbnails in unified inline flex row */}
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.45rem' }}>
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
                      gap: '0.35rem',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '7px',
                      background: prodPhotos.length >= 5 ? '#D9DDE4' : '#0284c7',
                      color: prodPhotos.length >= 5 ? '#74788A' : '#ffffff',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: prodPhotos.length >= 5 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                      flexShrink: 0
                    }}
                  >
                    <Plus size={14} /> Upload Photos
                  </label>

                  {/* Thumbnail Previews */}
                  {prodPhotos.map((photo, idx) => (
                    <div
                      key={photo.id || idx}
                      style={{
                        position: 'relative',
                        width: '42px',
                        height: '42px',
                        borderRadius: '7px',
                        overflow: 'hidden',
                        border: '1px solid #D9DDE4',
                        background: '#ffffff',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                        flexShrink: 0
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
                          top: '2px',
                          right: '2px',
                          width: '15px',
                          height: '15px',
                          borderRadius: '50%',
                          background: 'rgba(15, 23, 42, 0.8)',
                          color: '#ffffff',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          fontSize: '10px',
                          lineHeight: 1
                        }}
                      >
                        <X size={9} />
                      </button>
                      <span style={{
                        position: 'absolute',
                        bottom: '1px',
                        left: '1px',
                        fontSize: '0.55rem',
                        fontWeight: 700,
                        background: 'rgba(0,0,0,0.6)',
                        color: '#ffffff',
                        padding: '0 0.2rem',
                        borderRadius: '3px',
                        lineHeight: '1.2'
                      }}>
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error Banner */}
              {prodError && (
                <div style={{
                  background: '#FFE1E5',
                  border: '1px solid #FFB8BD',
                  color: '#b91c1c',
                  padding: '0.45rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  <AlertCircle size={15} />
                  <span>{prodError}</span>
                </div>
              )}

              {/* Footer Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '0.65rem',
                marginTop: '0.35rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid #f0f9ff'
              }}>
                <button
                  type="button"
                  onClick={handleCloseAddProductModal}
                  style={{
                    padding: '0.45rem 0.95rem',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    border: '1px solid #D9DDE4',
                    color: '#0C1F41',
                    fontWeight: 600,
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    height: '36px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={prodSubmitting}
                  style={{
                    padding: '0.45rem 1.15rem',
                    borderRadius: '8px',
                    background: '#0284c7',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.825rem',
                    cursor: prodSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)',
                    transition: 'all 0.15s ease',
                    height: '36px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {prodSubmitting ? <ButtonLoader text="Adding Product..." /> : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
