import { useState, useEffect } from "react"
import {
  Package, Plus, Search, Filter, Edit, Trash2, Tag, DollarSign,
  AlertCircle, CheckCircle2, ShoppingBag, ArrowRight, Sparkles,
  RefreshCw, Layers, Printer, Zap, Store, ChevronRight, X
} from "lucide-react"
import { call } from "../lib/utils"
import { useToast } from "./common/Toast"

export function Products({ setView, requireAuth, user }) {
  const [products, setProducts] = useState([])
  const [stats, setStats] = useState({ totalProducts: 0, totalCategories: 0, lowStockProducts: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [activeTab, setActiveTab] = useState("catalog") // "catalog" | "features"
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()

  // Form State
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [category, setCategory] = useState("General")
  const [sku, setSku] = useState("")
  const [taxRate, setTaxRate] = useState("18")
  const [stock, setStock] = useState("100")
  const [description, setDescription] = useState("")

  const categories = ["General", "Groceries", "Electronics", "Apparel", "Services", "Hardware", "Stationery"]

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const data = await call("/products")
      setProducts(data || [])
      
      // Calculate stats
      const catSet = new Set((data || []).map(p => p.category || 'General'))
      const lowStock = (data || []).filter(p => (p.stock || 0) < 10).length
      setStats({
        totalProducts: (data || []).length,
        totalCategories: catSet.size,
        lowStockProducts: lowStock
      })
    } catch (err) {
      console.warn("⚠️ Error fetching products, using local fallback:", err.message)
      // Fallback demo data if backend database has no items yet
      const defaultProducts = [
        { id: "p1", name: "Thermal Receipt Paper 58mm", price: 45, category: "Hardware", sku: "SKU-58MM", tax_rate: 18, stock: 150, description: "BPA-free high sensitivity thermal paper rolls" },
        { id: "p2", name: "Bluetooth POS Receipt Printer", price: 2850, category: "Hardware", sku: "POS-BT200", tax_rate: 18, stock: 8, description: "Portable 58mm wireless thermal printer for Android & iOS" },
        { id: "p3", name: "Premium Coffee Beans (1kg)", price: 650, category: "Groceries", sku: "GROC-COFF", tax_rate: 5, stock: 45, description: "Dark roast arabica whole coffee beans" },
        { id: "p4", name: "Customer Bill Folder & Stand", price: 180, category: "Stationery", sku: "STAT-FLD", tax_rate: 12, stock: 60, description: "Leatherette receipt holder for retail counters" }
      ]
      setProducts(defaultProducts)
      setStats({ totalProducts: 4, totalCategories: 3, lowStockProducts: 1 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleOpenAdd = () => {
    setEditingProduct(null)
    setName("")
    setPrice("")
    setCategory("General")
    setSku("")
    setTaxRate("18")
    setStock("100")
    setDescription("")
    setShowModal(true)
  }

  const handleOpenEdit = (product) => {
    setEditingProduct(product)
    setName(product.name || "")
    setPrice(product.price !== undefined ? product.price.toString() : "")
    setCategory(product.category || "General")
    setSku(product.sku || "")
    setTaxRate(product.tax_rate !== undefined ? product.tax_rate.toString() : "18")
    setStock(product.stock !== undefined ? product.stock.toString() : "100")
    setDescription(product.description || "")
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      toast?.show("Please enter a product name", "error")
      return
    }

    try {
      setSubmitting(true)
      const payload = {
        name: name.trim(),
        price: parseFloat(price) || 0,
        category: category || "General",
        sku: sku.trim(),
        tax_rate: parseFloat(taxRate) || 0,
        stock: parseInt(stock) || 0,
        description: description.trim()
      }

      if (editingProduct) {
        await call(`/products/${editingProduct.id}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        })
        toast?.show("Product updated successfully", "success")
      } else {
        await call("/products", {
          method: "POST",
          body: JSON.stringify(payload)
        })
        toast?.show("New product added to inventory", "success")
      }

      setShowModal(false)
      fetchProducts()
    } catch (err) {
      console.error("Save product error:", err)
      // Local optimistic update if offline
      const newProduct = {
        id: editingProduct ? editingProduct.id : `p_${Date.now()}`,
        name: name.trim(),
        price: parseFloat(price) || 0,
        category: category || "General",
        sku: sku.trim(),
        tax_rate: parseFloat(taxRate) || 0,
        stock: parseInt(stock) || 0,
        description: description.trim()
      }
      if (editingProduct) {
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? newProduct : p))
      } else {
        setProducts(prev => [newProduct, ...prev])
      }
      setShowModal(false)
      toast?.show("Product saved locally", "success")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return

    try {
      await call(`/products/${id}`, { method: "DELETE" })
      toast?.show("Product deleted", "info")
      fetchProducts()
    } catch (err) {
      console.error("Delete product error:", err)
      setProducts(prev => prev.filter(p => p.id !== id))
      toast?.show("Product deleted from list", "info")
    }
  }

  const handleQuickAddToBill = (product) => {
    sessionStorage.setItem("slipzo-quick-item", JSON.stringify({
      name: product.name,
      rate: product.price,
      quantity: 1,
      tax_rate: product.tax_rate
    }))
    setView("bills")
    toast?.show(`Added "${product.name}" to New Bill`, "success")
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = search.trim() === "" || 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(search.toLowerCase())) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))

    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="products-view fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: '#e0f2fe', color: '#0ea5e9', padding: '0.45rem', borderRadius: '10px', display: 'flex' }}>
              <Package size={22} />
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Products & Inventory
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.2rem 0 0 0' }}>
            Manage your shop products, pricing, GST rates, and quick billing items.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Tab View Switcher */}
          <div style={{ background: '#f1f5f9', padding: '0.2rem', borderRadius: '10px', display: 'flex', gap: '0.2rem' }}>
            <button
              onClick={() => setActiveTab("catalog")}
              style={{
                padding: '0.45rem 0.85rem',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === "catalog" ? '#ffffff' : 'transparent',
                color: activeTab === "catalog" ? '#0f172a' : '#64748b',
                boxShadow: activeTab === "catalog" ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              Catalog Inventory
            </button>
            <button
              onClick={() => setActiveTab("features")}
              style={{
                padding: '0.45rem 0.85rem',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === "features" ? '#ffffff' : 'transparent',
                color: activeTab === "features" ? '#0f172a' : '#64748b',
                boxShadow: activeTab === "features" ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Sparkles size={14} style={{ color: '#0ea5e9' }} /> Slipzo Specs
            </button>
          </div>

          <button
            onClick={handleOpenAdd}
            className="primary-button"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600 }}
          >
            <Plus size={18} /> Add Product
          </button>
        </div>
      </div>

      {activeTab === "catalog" ? (
        <>
          {/* Stats Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Items</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>{stats.totalProducts}</div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Categories</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0ea5e9', marginTop: '0.2rem' }}>{stats.totalCategories}</div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Low Stock Alert</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stats.lowStockProducts > 0 ? '#ef4444' : '#10b981', marginTop: '0.2rem' }}>
                {stats.lowStockProducts} {stats.lowStockProducts > 0 && <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#ef4444' }}>(Action needed)</span>}
              </div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '1.5rem', display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
              <Search size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search products by name, category or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.85rem 0.5rem 2.3rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} style={{ color: '#64748b' }} />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  background: '#ffffff',
                  color: '#0f172a',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem' }} />
              <p>Loading catalog inventory...</p>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                  }}
                  className="product-card-hover"
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, background: '#f1f5f9', color: '#475569', padding: '0.2rem 0.55rem', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        {product.category || "General"}
                      </span>
                      {product.sku && (
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                          #{product.sku}
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.35rem 0', lineHeight: 1.3 }}>
                      {product.name}
                    </h3>

                    {product.description && (
                      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 0.75rem 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {product.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '0.5rem 0' }}>
                      <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                        ₹{product.price}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        +{product.tax_rate || 0}% tax
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: (product.stock || 0) < 10 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: (product.stock || 0) < 10 ? '#ef4444' : '#10b981', display: 'inline-block' }}></span>
                      {product.stock || 0} units in stock
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      onClick={() => handleQuickAddToBill(product)}
                      style={{
                        flex: 1,
                        background: '#0f172a',
                        color: '#ffffff',
                        border: 'none',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        transition: 'all 0.15s'
                      }}
                    >
                      <ShoppingBag size={14} /> Add to Bill
                    </button>
                    <button
                      onClick={() => handleOpenEdit(product)}
                      style={{
                        background: '#f1f5f9',
                        color: '#475569',
                        border: '1px solid #e2e8f0',
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      title="Edit Product"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      style={{
                        background: '#ffffff',
                        color: '#ef4444',
                        border: '1px solid #fee2e2',
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      title="Delete Product"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '3rem 1.5rem', textAlign: 'center' }}>
              <Package size={40} style={{ color: '#cbd5e1', margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '1.1rem', color: '#0f172a', margin: '0 0 0.25rem 0' }}>No products found</h3>
              <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 1.25rem 0' }}>
                {search || selectedCategory !== "all" ? "Try adjusting your search or category filter" : "Add your first shop product to quick-fill receipts!"}
              </p>
              <button onClick={handleOpenAdd} className="primary-button" style={{ margin: '0 auto' }}>
                <Plus size={16} /> Add Product
              </button>
            </div>
          )}
        </>
      ) : (
        /* Slipzo Product Features Showcase Tab */
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ textAlign: 'center', maxWidth: '650px', margin: '0 auto 2rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0ea5e9', background: '#e0f2fe', padding: '0.25rem 0.75rem', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Slipzo Engine Capabilities
            </span>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
              Built for Speed, Thermal Printers & Growth
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.92rem' }}>
              Slipzo gives retail stores, cafes, and service businesses an all-in-one POS receipt suite.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div style={{ padding: '1.25rem', border: '1px solid #f1f5f9', borderRadius: '12px', background: '#f8fafc' }}>
              <div style={{ background: '#e0f2fe', color: '#0ea5e9', width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.85rem' }}>
                <Zap size={22} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>Sub-10s Rapid Billing</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                Instant search, pre-filled products, automatic tax calculations, and one-click thermal print output.
              </p>
            </div>

            <div style={{ padding: '1.25rem', border: '1px solid #f1f5f9', borderRadius: '12px', background: '#f8fafc' }}>
              <div style={{ background: '#fef3c7', color: '#f59e0b', width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.85rem' }}>
                <Printer size={22} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>Universal Thermal Printer Support</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                Seamless integration with 58mm thermal rolls, 80mm POS receipt printers, and Bluetooth mobile devices.
              </p>
            </div>

            <div style={{ padding: '1.25rem', border: '1px solid #f1f5f9', borderRadius: '12px', background: '#f8fafc' }}>
              <div style={{ background: '#dcfce7', color: '#10b981', width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.85rem' }}>
                <Store size={22} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>Custom Branding & QR Code</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                Display shop logo, GSTIN details, custom footer messages, and payment UPI QR code right on the receipt.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '500px', width: '100%', padding: '1.75rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {editingProduct ? "Edit Product" : "Add New Product"}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Thermal Paper Roll 58mm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', background: '#fff', outline: 'none' }}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>SKU Code</label>
                  <input
                    type="text"
                    placeholder="SKU-101"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="18"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>Initial Stock</label>
                  <input
                    type="number"
                    placeholder="100"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>Description / Notes</label>
                <textarea
                  rows="2"
                  placeholder="Optional product details or specifications..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '0.6rem', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="primary-button"
                  style={{ flex: 2, justifyContent: 'center' }}
                >
                  {submitting ? "Saving..." : editingProduct ? "Update Product" : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
