import { useState, useEffect } from "react"
import {
  Package, Plus, Search, Filter, Edit, Trash2, Tag, DollarSign,
  AlertCircle, CheckCircle2, ShoppingBag, ArrowRight, Sparkles,
  RefreshCw, Layers, Printer, Zap, Store, ChevronRight, X,
  Truck, CreditCard, Check
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
  
  // Add/Edit Product Modal State
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  
  // Buyer Order Checkout Modal State
  const [buyProduct, setBuyProduct] = useState(null)
  const [buyQty, setBuyQty] = useState(1)
  const [buyerName, setBuyerName] = useState(user?.name || "")
  const [buyerPhone, setBuyerPhone] = useState(user?.shop_phone || "")
  const [buyerAddress, setBuyerAddress] = useState(user?.address || "")
  const [paymentMethod, setPaymentMethod] = useState("UPI")
  const [orderPlaced, setOrderPlaced] = useState(null)
  const [placingOrder, setPlacingOrder] = useState(false)

  const toast = useToast()

  // Form State for Add/Edit Product
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [category, setCategory] = useState("Hardware")
  const [sku, setSku] = useState("")
  const [taxRate, setTaxRate] = useState("18")
  const [stock, setStock] = useState("100")
  const [image, setImage] = useState("")
  const [description, setDescription] = useState("")

  const categories = ["Hardware", "Stationery", "Groceries", "Electronics", "Apparel", "Services", "General"]

  const defaultProducts = [
    { 
      id: "p1", 
      name: "Bluetooth POS Receipt Printer (58mm)", 
      price: 2850, 
      category: "Hardware", 
      sku: "POS-BT200", 
      tax_rate: 18, 
      stock: 12, 
      image: "/products/pos_printer.jpg",
      description: "Portable 58mm wireless thermal printer for Android & iOS with rechargeable battery" 
    },
    { 
      id: "p2", 
      name: "80mm POS Thermal Paper Rolls (10 Rolls)", 
      price: 450, 
      category: "Hardware", 
      sku: "ROLL-80MM-10", 
      tax_rate: 18, 
      stock: 85, 
      image: "/products/paper_rolls.jpg",
      description: "ATPOS premium smooth thermal paper rolls, jam-free dark printing for POS terminals" 
    },
    { 
      id: "p3", 
      name: "58mm Thermal Receipt Paper (10 Rolls)", 
      price: 250, 
      category: "Hardware", 
      sku: "ROLL-58MM-10", 
      tax_rate: 18, 
      stock: 120, 
      image: "/products/paper_rolls.jpg",
      description: "BPA-free high sensitivity 58mm thermal paper rolls for handheld printers" 
    },
    { 
      id: "p4", 
      name: "Customer Bill Folder & Stand", 
      price: 180, 
      category: "Stationery", 
      sku: "STAT-FLD", 
      tax_rate: 12, 
      stock: 40, 
      image: "",
      description: "Leatherette receipt holder for retail billing counters" 
    }
  ]

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const data = await call("/products")
      if (Array.isArray(data) && data.length > 0) {
        setProducts(data)
        const catSet = new Set(data.map(p => p.category || 'General'))
        const lowStock = data.filter(p => (p.stock || 0) < 10).length
        setStats({
          totalProducts: data.length,
          totalCategories: catSet.size,
          lowStockProducts: lowStock
        })
      } else {
        setProducts(defaultProducts)
        setStats({ totalProducts: defaultProducts.length, totalCategories: 2, lowStockProducts: 0 })
      }
    } catch (err) {
      console.warn("⚠️ Error fetching products, using defaults:", err.message)
      setProducts(defaultProducts)
      setStats({ totalProducts: defaultProducts.length, totalCategories: 2, lowStockProducts: 0 })
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
    setCategory("Hardware")
    setSku("")
    setTaxRate("18")
    setStock("100")
    setImage("")
    setDescription("")
    setShowModal(true)
  }

  const handleOpenEdit = (product) => {
    setEditingProduct(product)
    setName(product.name || "")
    setPrice(product.price !== undefined ? product.price.toString() : "")
    setCategory(product.category || "Hardware")
    setSku(product.sku || "")
    setTaxRate(product.tax_rate !== undefined ? product.tax_rate.toString() : "18")
    setStock(product.stock !== undefined ? product.stock.toString() : "100")
    setImage(product.image || "")
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
        image: image.trim(),
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
        toast?.show("New product added to catalog", "success")
      }

      setShowModal(false)
      fetchProducts()
    } catch (err) {
      console.error("Save product error:", err)
      const newProduct = {
        id: editingProduct ? editingProduct.id : `p_${Date.now()}`,
        name: name.trim(),
        price: parseFloat(price) || 0,
        category: category || "General",
        sku: sku.trim(),
        tax_rate: parseFloat(taxRate) || 0,
        stock: parseInt(stock) || 0,
        image: image.trim(),
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
      toast?.show("Product removed from list", "info")
    }
  }

  // Quick Add Item to New Bill Draft
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

  // Open Buy Product Modal
  const handleOpenBuy = (product) => {
    setBuyProduct(product)
    setBuyQty(1)
    setBuyerName(user?.name || "")
    setBuyerPhone(user?.shop_phone || "")
    setBuyerAddress(user?.address || "")
    setPaymentMethod("UPI")
    setOrderPlaced(null)
  }

  // Handle Buyer Placing Product Order
  const handlePlaceOrder = (e) => {
    e.preventDefault()
    if (!buyerName.trim() || !buyerPhone.trim()) {
      toast?.show("Please enter your name and phone number for delivery", "error")
      return
    }

    setPlacingOrder(true)
    setTimeout(() => {
      const orderId = `ORD-SLP-${Math.floor(100000 + Math.random() * 900000)}`
      const basePrice = buyProduct.price * buyQty
      const taxAmount = (basePrice * (buyProduct.tax_rate || 0)) / 100
      const totalAmount = basePrice + taxAmount

      const orderDetails = {
        orderId,
        productName: buyProduct.name,
        quantity: buyQty,
        unitPrice: buyProduct.price,
        totalAmount: Math.round(totalAmount),
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim(),
        buyerAddress: buyerAddress.trim(),
        paymentMethod
      }

      setOrderPlaced(orderDetails)
      setPlacingOrder(false)
      
      // Update local product stock
      setProducts(prev => prev.map(p => p.id === buyProduct.id ? { ...p, stock: Math.max(0, (p.stock || 0) - buyQty) } : p))
      toast?.show(`🎉 Order placed successfully! Order #${orderId}`, "success")
    }, 600)
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
    <div className="products-view fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '2rem' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: '#e0f2fe', color: '#0ea5e9', padding: '0.45rem', borderRadius: '10px', display: 'flex' }}>
              <Package size={22} />
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Hardware & Products Store
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0.2rem 0 0 0' }}>
            Buy thermal receipt printers, paper rolls & accessories, or add custom products for billing.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'center' }}>
          <button
            onClick={handleOpenAdd}
            className="primary-button"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600 }}
          >
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1.25rem', gap: '1.5rem' }}>
        <button
          onClick={() => setActiveTab("catalog")}
          style={{
            padding: '0.65rem 0.2rem',
            border: 'none',
            background: 'none',
            color: activeTab === "catalog" ? '#0ea5e9' : '#64748b',
            borderBottom: activeTab === "catalog" ? '2.5px solid #0ea5e9' : '2.5px solid transparent',
            fontWeight: activeTab === "catalog" ? 700 : 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Layers size={16} /> Products Catalog ({products.length})
        </button>
        <button
          onClick={() => setActiveTab("features")}
          style={{
            padding: '0.65rem 0.2rem',
            border: 'none',
            background: 'none',
            color: activeTab === "features" ? '#0ea5e9' : '#64748b',
            borderBottom: activeTab === "features" ? '2.5px solid #0ea5e9' : '2.5px solid transparent',
            fontWeight: activeTab === "features" ? 700 : 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Sparkles size={16} /> Printer Compatibility & Specs
        </button>
      </div>

      {activeTab === "catalog" ? (
        <>
          {/* Search and Filters Bar */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search products by name, SKU, or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.85rem 0.55rem 2.4rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  outline: 'none',
                  background: '#ffffff'
                }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                  <X size={14} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
              <button
                onClick={() => setSelectedCategory("all")}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '20px',
                  border: '1px solid #e2e8f0',
                  background: selectedCategory === "all" ? '#0f172a' : '#ffffff',
                  color: selectedCategory === "all" ? '#ffffff' : '#475569',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0',
                    background: selectedCategory === cat ? '#0f172a' : '#ffffff',
                    color: selectedCategory === cat ? '#ffffff' : '#475569',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem' }} />
              <p>Loading products catalog...</p>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '1rem' }}>
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                  }}
                  className="product-card-hover"
                >
                  <div>
                    {/* Product Image */}
                    {product.image ? (
                      <div style={{
                        width: '100%',
                        height: '160px',
                        background: '#f8fafc',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '0.75rem',
                        border: '1px solid #f1f5f9'
                      }}>
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: '0.4rem' }} 
                        />
                      </div>
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '110px',
                        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '0.75rem',
                        color: '#94a3b8'
                      }}>
                        <Package size={36} />
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#e0f2fe', color: '#0369a1', padding: '0.15rem 0.5rem', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        {product.category || "Hardware"}
                      </span>
                      {product.sku && (
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                          #{product.sku}
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.3rem 0', lineHeight: 1.3 }}>
                      {product.name}
                    </h3>

                    {product.description && (
                      <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 0.6rem 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.35 }}>
                        {product.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', margin: '0.4rem 0' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                        ₹{product.price}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        +{product.tax_rate || 18}% GST
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: (product.stock || 0) < 10 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: (product.stock || 0) < 10 ? '#ef4444' : '#10b981', display: 'inline-block' }}></span>
                      {product.stock || 0} units in stock
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      onClick={() => handleOpenBuy(product)}
                      style={{
                        width: '100%',
                        background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 2px 6px rgba(14, 165, 233, 0.25)',
                        transition: 'all 0.15s'
                      }}
                    >
                      <ShoppingBag size={14} /> Buy Now
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        onClick={() => handleQuickAddToBill(product)}
                        style={{
                          flex: 1,
                          background: '#f8fafc',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          padding: '0.35rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem'
                        }}
                        title="Add as line item in bill draft"
                      >
                        <Plus size={12} /> Add to Bill
                      </button>

                      <button
                        onClick={() => handleOpenEdit(product)}
                        style={{
                          background: '#ffffff',
                          color: '#475569',
                          border: '1px solid #e2e8f0',
                          width: '30px',
                          height: '30px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        title="Edit Product"
                      >
                        <Edit size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        style={{
                          background: '#ffffff',
                          color: '#ef4444',
                          border: '1px solid #fee2e2',
                          width: '30px',
                          height: '30px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        title="Delete Product"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
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
        /* Features Showcase Tab */
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ textAlign: 'center', maxWidth: '650px', margin: '0 auto 2rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0ea5e9', background: '#e0f2fe', padding: '0.25rem 0.75rem', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Hardware & POS Supplies
            </span>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
              Tested & Certified for Slipzo
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.92rem' }}>
              All thermal receipt printers and paper rolls sold on Slipzo are pre-tested for plug-and-play speed with our thermal engine.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div style={{ padding: '1.25rem', border: '1px solid #f1f5f9', borderRadius: '12px', background: '#f8fafc' }}>
              <div style={{ background: '#e0f2fe', color: '#0ea5e9', width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.85rem' }}>
                <Zap size={22} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>Instant Bluetooth Connectivity</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                Pair portable 58mm/80mm Bluetooth printers in seconds directly from mobile or desktop browsers.
              </p>
            </div>

            <div style={{ padding: '1.25rem', border: '1px solid #f1f5f9', borderRadius: '12px', background: '#f8fafc' }}>
              <div style={{ background: '#fef3c7', color: '#f59e0b', width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.85rem' }}>
                <Printer size={22} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>ATPOS Dark Crisp Thermal Paper</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                High-density BPA-free thermal rolls designed for crisp text, QR codes, and long-lasting receipts without fading.
              </p>
            </div>

            <div style={{ padding: '1.25rem', border: '1px solid #f1f5f9', borderRadius: '12px', background: '#f8fafc' }}>
              <div style={{ background: '#dcfce7', color: '#10b981', width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.85rem' }}>
                <Truck size={22} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>Fast Express Delivery</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                Delivered across all Indian pincodes with GST invoices and full replacement warranty.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Buy Product Checkout Modal */}
      {buyProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingBag size={18} style={{ color: '#0ea5e9' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Buy Product / Hardware
                </h3>
              </div>
              <button onClick={() => setBuyProduct(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            {orderPlaced ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <CheckCircle2 size={32} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem 0' }}>Order Placed Successfully!</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1rem 0' }}>
                  Order ID: <strong style={{ color: '#0ea5e9' }}>#{orderPlaced.orderId}</strong>
                </p>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem', textAlign: 'left', fontSize: '0.8rem', color: '#334155', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span>Product:</span>
                    <strong>{orderPlaced.productName} (x{orderPlaced.quantity})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span>Total Amount:</span>
                    <strong>₹{orderPlaced.totalAmount}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span>Delivery Contact:</span>
                    <strong>{orderPlaced.buyerName} ({orderPlaced.buyerPhone})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Payment Mode:</span>
                    <strong>{orderPlaced.paymentMethod}</strong>
                  </div>
                </div>

                <button
                  onClick={() => setBuyProduct(null)}
                  className="primary-button"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {/* Product Summary Box */}
                <div style={{ display: 'flex', gap: '0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem', alignItems: 'center' }}>
                  {buyProduct.image ? (
                    <img src={buyProduct.image} alt={buyProduct.name} style={{ width: '56px', height: '56px', objectFit: 'contain', background: '#fff', borderRadius: '6px', padding: '0.2rem', border: '1px solid #e2e8f0' }} />
                  ) : (
                    <div style={{ width: '56px', height: '56px', background: '#e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                      <Package size={24} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ display: 'block', fontSize: '0.88rem', color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{buyProduct.name}</b>
                    <small style={{ color: '#64748b', fontSize: '0.78rem' }}>₹{buyProduct.price} + {buyProduct.tax_rate || 18}% GST</small>
                  </div>
                </div>

                {/* Quantity Selector */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>Quantity</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <button
                      type="button"
                      onClick={() => setBuyQty(Math.max(1, buyQty - 1))}
                      style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f1f5f9', fontWeight: 700, cursor: 'pointer' }}
                    >
                      -
                    </button>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', minWidth: '20px', textAlign: 'center' }}>{buyQty}</span>
                    <button
                      type="button"
                      onClick={() => setBuyQty(buyQty + 1)}
                      style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f1f5f9', fontWeight: 700, cursor: 'pointer' }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Buyer Details */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>Your Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>Phone Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="+91 98765 43210"
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>Payment Mode</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff', outline: 'none' }}
                    >
                      <option value="UPI">UPI / QR Code</option>
                      <option value="Cash on Delivery">Cash on Delivery (COD)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>Delivery Address</label>
                  <textarea
                    rows="2"
                    placeholder="Enter shop address for shipping..."
                    value={buyerAddress}
                    onChange={(e) => setBuyerAddress(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
                  />
                </div>

                {/* Price Total Banner */}
                {(() => {
                  const base = buyProduct.price * buyQty
                  const tax = (base * (buyProduct.tax_rate || 18)) / 100
                  const total = Math.round(base + tax)
                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.65rem 0.85rem' }}>
                      <span style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 600 }}>Total Amount (incl. GST):</span>
                      <span style={{ fontSize: '1.15rem', color: '#15803d', fontWeight: 800 }}>₹{total}</span>
                    </div>
                  )
                })()}

                <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={() => setBuyProduct(null)}
                    style={{ flex: 1, padding: '0.55rem', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={placingOrder}
                    className="primary-button"
                    style={{ flex: 2, justifyContent: 'center', background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' }}
                  >
                    {placingOrder ? "Placing Order..." : "Place Order Now"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '500px', width: '100%', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {editingProduct ? "Edit Product" : "Add New Product"}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bluetooth POS Receipt Printer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', background: '#fff', outline: 'none' }}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Image Input & Presets */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>Product Image URL</label>
                <input
                  type="text"
                  placeholder="/products/pos_printer.jpg or https://..."
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', marginBottom: '0.35rem' }}
                />
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                  <small style={{ fontSize: '0.7rem', color: '#64748b' }}>Quick presets:</small>
                  <button
                    type="button"
                    onClick={() => setImage("/products/pos_printer.jpg")}
                    style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f1f5f9', cursor: 'pointer' }}
                  >
                    POS Printer
                  </button>
                  <button
                    type="button"
                    onClick={() => setImage("/products/paper_rolls.jpg")}
                    style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f1f5f9', cursor: 'pointer' }}
                  >
                    Paper Rolls
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.65rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>SKU Code</label>
                  <input
                    type="text"
                    placeholder="POS-101"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>GST Tax (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="18"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>Stock Units</label>
                  <input
                    type="number"
                    placeholder="100"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>Description</label>
                <textarea
                  rows="2"
                  placeholder="Product specs or delivery details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '0.55rem', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
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
