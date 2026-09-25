import { useState, useEffect } from "react"
import {
  Package, Plus, Search, Filter, Edit, Trash2, Tag, DollarSign,
  AlertCircle, CheckCircle2, ShoppingBag, ArrowRight, Sparkles,
  RefreshCw, Layers, Printer, Zap, Store, ChevronRight, X,
  Truck, CreditCard, Check, Mic, LayoutGrid, FileText, Cpu,
  Heart, Crown, Box
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useDbTranslation } from "../lib/translator"
import { call, getCachedData } from "../lib/utils"
import { useToast } from "./common/Toast"

const DEFAULT_HARDWARE_PRODUCTS = [
  {
    id: "p1",
    name: "Printer Roll",
    price: 300,
    category: "Hardware",
    sku: "ROLL-SUPERMAX",
    stock: 100,
    image: "/products/hansol_rolls.jpg",
    description: "High quality thermal paper roll for smooth printing.",
    product_link: "https://slipzo.in/products"
  },
  {
    id: "p2",
    name: "80mm POS Thermal Paper Rolls (10 Rolls)",
    price: 450,
    category: "Hardware",
    sku: "ROLL-80MM-10",
    stock: 85,
    image: "/products/paper_rolls.jpg",
    description: "ATPOS premium smooth thermal paper rolls, jam-free dark printing for POS terminals.",
    product_link: "https://slipzo.in/products"
  },
  {
    id: "p3",
    name: "Bluetooth POS Receipt Printer (80mm)",
    price: 2850,
    category: "Hardware",
    sku: "POS-BT200",
    stock: 12,
    image: "/products/pos_printer.jpg",
    description: "Portable 58mm wireless thermal printer for Android & iOS with rechargeable battery.",
    product_link: "https://slipzo.in/products"
  },
  {
    id: "p4",
    name: "NIYAMA Portable Bluetooth POS Printer (58mm)",
    price: 2699,
    category: "Hardware",
    sku: "NIYAMA-58BT",
    stock: 18,
    image: "/products/niyama_printer.jpg",
    description: "Rechargeable 58mm Bluetooth handheld mobile thermal printer with battery indicator and high-speed receipt printing",
    product_link: "https://slipzo.in/products"
  }
]

export function Products({ setView, requireAuth, user }) {
  const { t } = useTranslation()
  const { tDb, formatNum } = useDbTranslation()
  const [products, setProducts] = useState(() => {
    const cached = getCachedData("/products")
    if (Array.isArray(cached) && cached.length > 0) return cached
    return DEFAULT_HARDWARE_PRODUCTS
  })
  const [stats, setStats] = useState(() => {
    const cached = getCachedData("/products")
    const initial = Array.isArray(cached) && cached.length > 0 ? cached : DEFAULT_HARDWARE_PRODUCTS
    const catSet = new Set(initial.map(p => p.category || 'General'))
    const lowStock = initial.filter(p => (p.stock || 0) < 10).length
    return { totalProducts: initial.length, totalCategories: catSet.size, lowStockProducts: lowStock }
  })
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [activeTab, setActiveTab] = useState("catalog") // "catalog" | "features"
  const [wishlist, setWishlist] = useState(() => new Set())

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
  const [productLink, setProductLink] = useState("")
  const [stock, setStock] = useState("100")
  const [image, setImage] = useState("")
  const [description, setDescription] = useState("")

  const categoryTabs = [
    { id: "all", label: t("products.all", "All"), icon: LayoutGrid },
    { id: "Hardware", label: t("products.hardware", "Hardware"), icon: Printer },
    { id: "Stationery", label: t("products.stationery", "Stationery"), icon: FileText },
    { id: "Electronics", label: t("products.electronics", "Electronics"), icon: Cpu }
  ]

  const categories = ["Hardware", "Stationery", "Electronics"]

  const toggleWishlist = (id, e) => {
    e?.stopPropagation?.()
    setWishlist(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast?.show("Voice search is not supported in this browser.", "info")
      return
    }
    try {
      const recognition = new SpeechRecognition()
      recognition.lang = "en-IN"
      recognition.interimResults = false
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || ""
        if (transcript) {
          setSearch(transcript)
          toast?.show(`Searching for "${transcript}"`, "info")
        }
      }
      recognition.onerror = () => {
        toast?.show("Could not recognize voice input.", "info")
      }
      recognition.start()
      toast?.show("Listening...", "info")
    } catch (_) {
      toast?.show("Microphone access unavailable.", "info")
    }
  }

  const fetchProducts = async () => {
    try {
      if (products.length === 0) setLoading(true)
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
      } else if (products.length === 0) {
        setProducts(DEFAULT_HARDWARE_PRODUCTS)
      }
    } catch (err) {
      console.warn("⚠️ Error fetching products from database:", err.message)
      if (products.length === 0) setProducts(DEFAULT_HARDWARE_PRODUCTS)
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
    setProductLink("")
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
    setProductLink(product.product_link || "")
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
        product_link: productLink.trim(),
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
        tax_rate: 0,
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
      tax_rate: 0
    }))
    setView("bills")
    toast?.show(`Added "${product.name}" to New Bill`, "success")
  }

  // Buy Now - Open saved product_link directly in a new tab or trigger purchase
  const handleBuyNow = (product) => {
    if (!product) return

    const rawLink = product.product_link ? String(product.product_link).trim() : ""
    if (rawLink && rawLink !== "https://slipzo.in/products") {
      try {
        const parsedUrl = new URL(rawLink)
        if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
          window.open(rawLink, "_blank", "noopener,noreferrer")
          return
        }
      } catch (_) {
        if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(rawLink)) {
          window.open(`https://${rawLink}`, "_blank", "noopener,noreferrer")
          return
        }
      }
    }
    handleOpenBuy(product)
  }

  // Open Buy Product Modal
  const handleOpenBuy = (product) => {
    setBuyProduct(product)
    setBuyQty(1)
    setBuyerName(user?.name || "")
    setBuyerPhone(user?.shop_phone || "")
    setBuyerAddress(user?.address || "")
    setPaymentMethod("Razorpay")
    setOrderPlaced(null)
  }

  // Handle Buyer Placing Product Order with Razorpay Integration
  const handlePlaceOrder = async (e) => {
    e.preventDefault()
    if (!buyerName.trim() || !buyerPhone.trim()) {
      toast?.show("Please enter your name and phone number for delivery", "error")
      return
    }

    const basePrice = buyProduct.price * buyQty
    const totalAmount = Math.round(basePrice)
    const orderId = `ORD-SLP-${Math.floor(100000 + Math.random() * 900000)}`

    if (paymentMethod === "Razorpay" || paymentMethod === "UPI") {
      setPlacingOrder(true)
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_SIPp9QznVVM48W'

      const loadRazorpay = () => {
        return new Promise((resolve) => {
          if (window.Razorpay) return resolve(true)
          const script = document.createElement("script")
          script.src = "https://checkout.razorpay.com/v1/checkout.js"
          script.onload = () => resolve(true)
          script.onerror = () => resolve(false)
          document.body.appendChild(script)
        })
      }

      const isLoaded = await loadRazorpay()
      if (!isLoaded) {
        toast?.show("Razorpay SDK failed to load. Please check your network.", "error")
        setPlacingOrder(false)
        return
      }

      const options = {
        key: razorpayKey,
        amount: totalAmount * 100, // Amount in paise
        currency: "INR",
        name: "Slipzo Receipts & POS Store",
        description: `${buyProduct.name} (Qty: ${buyQty})`,
        image: "/logo.png",
        prefill: {
          name: buyerName.trim(),
          email: user?.email || "customer@slipzo.in",
          contact: buyerPhone.trim()
        },
        notes: {
          product_id: buyProduct.id,
          product_name: buyProduct.name,
          address: buyerAddress.trim()
        },
        theme: {
          color: "#0f172a"
        },
        handler: function (response) {
          console.log("💳 Razorpay Payment Success:", response.razorpay_payment_id)
          const orderDetails = {
            orderId,
            paymentId: response.razorpay_payment_id,
            productName: buyProduct.name,
            quantity: buyQty,
            unitPrice: buyProduct.price,
            totalAmount,
            buyerName: buyerName.trim(),
            buyerPhone: buyerPhone.trim(),
            buyerAddress: buyerAddress.trim(),
            paymentMethod: "Razorpay Online (UPI / Card / NetBanking)"
          }

          setOrderPlaced(orderDetails)
          setPlacingOrder(false)
          setProducts(prev => prev.map(p => p.id === buyProduct.id ? { ...p, stock: Math.max(0, (p.stock || 0) - buyQty) } : p))
          toast?.show(`Payment successful! ID: ${response.razorpay_payment_id}`, "success")
        },
        modal: {
          ondismiss: function () {
            setPlacingOrder(false)
            toast?.show("Razorpay payment modal closed", "info")
          }
        }
      }

      try {
        const rzp = new window.Razorpay(options)
        rzp.on('payment.failed', function (response) {
          setPlacingOrder(false)
          toast?.show(`Payment failed: ${response.error?.description || 'Transaction declined'}`, "error")
        })
        rzp.open()
      } catch (err) {
        setPlacingOrder(false)
        console.error("Razorpay launcher error:", err)
        toast?.show(`Razorpay launch error: ${err.message}`, "error")
      }
    } else {
      // Cash on Delivery
      setPlacingOrder(true)
      setTimeout(() => {
        const orderDetails = {
          orderId,
          paymentId: `COD-${Date.now().toString().slice(-8)}`,
          productName: buyProduct.name,
          quantity: buyQty,
          unitPrice: buyProduct.price,
          totalAmount,
          buyerName: buyerName.trim(),
          buyerPhone: buyerPhone.trim(),
          buyerAddress: buyerAddress.trim(),
          paymentMethod: "Cash on Delivery (COD)"
        }

        setOrderPlaced(orderDetails)
        setPlacingOrder(false)
        setProducts(prev => prev.map(p => p.id === buyProduct.id ? { ...p, stock: Math.max(0, (p.stock || 0) - buyQty) } : p))
        toast?.show("Order placed successfully with Cash on Delivery!", "success")
      }, 800)
    }
  }

  const safeProducts = Array.isArray(products) && products.length > 0 ? products : DEFAULT_HARDWARE_PRODUCTS
  const filteredProducts = safeProducts.filter(p => {
    const status = (p.status || 'active').toString().toLowerCase().trim()
    if (status === 'inactive') return false

    const matchesSearch = search.trim() === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(search.toLowerCase())) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))

    const matchesCategory = selectedCategory === "all" || (p.category || "").toLowerCase() === selectedCategory.toLowerCase()
    return matchesSearch && matchesCategory
  })

  return (
    <div className="page products-page products-view fade-in">
      {/* ========================================================
          DESKTOP VIEW (Visible on Desktop Screen min-width: 769px)
          ======================================================== */}
      <div className="products-desktop-layout">
        {/* 1. Header Bar */}
        <div className="products-header-bar">
          <div className="products-title-col">
            <div className="products-title-row">
              <div className="products-title-icon">
                <Package size={22} />
              </div>
              <h1 className="products-title">
                {t("products.storeTitle", "Hardware & Products Store")}
              </h1>
            </div>
            <p className="products-description">
              {t("products.storeSubtitle", "Buy thermal receipt printers, paper rolls & accessories, or add custom products for billing.")}
            </p>
          </div>
        </div>

        {/* 2. Navigation Tabs */}
        <div className="products-nav-tabs">
          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className={`products-tab-btn ${activeTab === "catalog" ? 'active' : ''}`}
          >
            <Layers size={16} /> {t("products.catalogTab", "Products Catalog")} ({safeProducts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("features")}
            className={`products-tab-btn ${activeTab === "features" ? 'active' : ''}`}
          >
            <Sparkles size={16} /> {t("products.specsTab", "Printer Compatibility & Specs")}
          </button>
        </div>

        {activeTab === "catalog" ? (
          <>
            {/* 3. Controls Bar: Search & Category Filter Pills */}
            <div className="products-controls-bar">
              <div className="products-search-box">
                <Search size={16} className="products-search-icon" />
                <input
                  type="text"
                  placeholder={t("products.searchPlaceholder", "Search products by name, SKU, or category...")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="products-search-input"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="products-search-clear"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="products-category-filters">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className={`products-cat-btn ${selectedCategory.toLowerCase() === "all" ? 'active' : ''}`}
                >
                  {t("products.all", "All")}
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`products-cat-btn ${selectedCategory.toLowerCase() === cat.toLowerCase() ? 'active' : ''}`}
                  >
                    {cat === "Hardware" ? t("products.hardware", "Hardware") : cat === "Stationery" ? t("products.stationery", "Stationery") : cat === "Electronics" ? t("products.electronics", "Electronics") : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Products Cards Grid */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem' }} />
                <p>{t("products.loading", "Loading products catalog...")}</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="products-cards-grid">
                {filteredProducts.map(product => {
                  const numPrice = Number(product.price) || 0
                  const formattedPrice = numPrice.toFixed(2)

                  return (
                    <div
                      key={product.id}
                      className="product-card product-card-hover"
                    >
                      <div>
                        {/* Product Image */}
                        {product.image ? (
                          <div className="product-image-box">
                            <img
                              src={product.image}
                              alt={product.name}
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="product-image-box placeholder">
                            <Package size={36} />
                          </div>
                        )}

                        <div className="product-card-meta">
                          <span className="product-category-tag">
                            {tDb(product.category || "HARDWARE")}
                          </span>
                        </div>

                        <h3 className="product-card-title" title={tDb(product.name)}>
                          {tDb(product.name)}
                        </h3>

                        {product.description && (
                          <p className="product-card-desc" title={tDb(product.description)}>
                            {tDb(product.description)}
                          </p>
                        )}

                        <div className="product-card-price-row">
                          <span className="product-price-val">
                            ₹{formattedPrice}
                          </span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="product-card-actions">
                        <button
                          type="button"
                          onClick={() => handleBuyNow(product)}
                          className="product-buy-now-btn"
                        >
                          <ShoppingBag size={14} /> {t("products.buyNow", "Buy Now")}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '3rem 1.5rem', textAlign: 'center' }}>
                <Package size={40} style={{ color: '#cbd5e1', margin: '0 auto 0.75rem' }} />
                <h3 style={{ fontSize: '1.1rem', color: '#0f172a', margin: '0 0 0.25rem 0' }}>{t("products.noProducts", "No products found")}</h3>
                <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>
                  {search || selectedCategory !== "all" ? "Try adjusting your search or category filter" : "No products available in the catalog"}
                </p>
              </div>
            )}
          </>
        ) : (
          /* Features Showcase Tab */
          <div className="products-features-box">
            <div className="products-features-header">
              <span className="products-features-badge">
                Hardware & POS Supplies
              </span>
              <h2>
                Tested & Certified for Slipzo
              </h2>
              <p>
                All thermal receipt printers and paper rolls sold on Slipzo are pre-tested for plug-and-play speed with our thermal engine.
              </p>
            </div>

            <div className="products-features-grid">
              <div className="feature-item-card">
                <div className="feature-item-icon blue">
                  <Zap size={22} />
                </div>
                <h3>Instant Bluetooth Connectivity</h3>
                <p>Seamless 1-click Bluetooth pairing with ESC/POS standard support for lightning fast receipts.</p>
              </div>

              <div className="feature-item-card">
                <div className="feature-item-icon amber">
                  <Sparkles size={22} />
                </div>
                <h3>Jam-Free Thermal Paper</h3>
                <p>High-density BPA-free thermal rolls designed to prevent cutter jams and ensure crisp printing.</p>
              </div>

              <div className="feature-item-card">
                <div className="feature-item-icon green">
                  <Printer size={22} />
                </div>
                <h3>Zero Ink & Maintenance</h3>
                <p>Direct thermal printing means no expensive ink ribbons, cartridges, or toner refills ever.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          MOBILE VIEW (Visible on Mobile Screens max-width: 768px)
          Current Mobile View UI 100% Unchanged
          ======================================================== */}
      <div className="products-mobile-layout">
        {/* 1. Header Card Banner */}
        <div className="products-hero-card">
          <div className="products-hero-icon-box">
            <Package size={24} className="products-hero-icon" />
          </div>
          <div className="products-hero-text">
            <h1 className="products-hero-title">
              {t("products.storeTitle", "Hardware & Products Store")}
            </h1>
            <p className="products-hero-subtitle">
              {t("products.storeSubtitle", "Buy thermal receipt printers, paper rolls & accessories, or add custom products for billing.")}
            </p>
          </div>
        </div>

        {/* 2. Search & Voice Input Bar */}
        <div className="products-search-bar-row">
          <div className="products-search-input-wrap">
            <Search size={18} className="products-search-magnifier" />
            <input
              type="text"
              placeholder={t("products.searchPlaceholder", "Search products by name, SKU, or category...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="products-search-input-field"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="products-search-clear-btn"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="products-search-divider"></div>
          <button
            type="button"
            onClick={handleVoiceSearch}
            className="products-mic-btn"
            title="Voice search"
            aria-label="Voice search"
          >
            <Mic size={18} />
          </button>
        </div>

        {/* 3. Category Filter Pills */}
        <div className="products-categories-scroll">
          {categoryTabs.map((cat) => {
            const IconComponent = cat.icon
            const isActive = selectedCategory.toLowerCase() === cat.id.toLowerCase()
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`products-cat-pill ${isActive ? "active" : ""}`}
              >
                <IconComponent size={16} />
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>

        {/* 4. Products Cards Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem' }} />
            <p>{t("products.loading", "Loading products catalog...")}</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="products-cards-grid">
            {filteredProducts.map((product, idx) => {
              const isWish = wishlist.has(product.id)
              const isBestSeller = idx === 0 || product.sku?.includes("SMAX") || product.name?.toLowerCase().includes("supermax") || (product.name?.toLowerCase().includes("printer roll") && !product.name?.toLowerCase().includes("bluetooth"))
              const numPrice = Number(product.price) || 0
              const formattedPrice = numPrice.toFixed(2)

              return (
                <div key={product.id} className="product-mobile-card">
                  {/* Left Column: Image & Best Seller Badge */}
                  <div className="product-mobile-image-col">
                    {isBestSeller && (
                      <div className="product-bestseller-badge">
                        <Crown size={11} className="bestseller-crown" />
                        <span className="badge-line-1">BEST</span>
                        <span className="badge-line-2">SELLER</span>
                      </div>
                    )}
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="product-mobile-img"
                        loading="lazy"
                      />
                    ) : (
                      <div className="product-mobile-img-placeholder">
                        <Package size={36} />
                      </div>
                    )}
                  </div>

                  {/* Right Column: Info, Price, Actions */}
                  <div className="product-mobile-info-col">
                    <div className="product-mobile-top-row">
                      <span className="product-cat-pill-tag">
                        {tDb(product.category || "HARDWARE")}
                      </span>
                      <button
                        type="button"
                        className={`product-heart-btn ${isWish ? "active" : ""}`}
                        onClick={(e) => toggleWishlist(product.id, e)}
                        aria-label="Wishlist"
                        title="Add to Wishlist"
                      >
                        <Heart
                          size={18}
                          fill={isWish ? "#ef4444" : "none"}
                          color={isWish ? "#ef4444" : "#0f172a"}
                        />
                      </button>
                    </div>

                    <h3 className="product-mobile-title" title={tDb(product.name)}>
                      {tDb(product.name)}
                    </h3>

                    {product.description && (
                      <p className="product-mobile-desc" title={tDb(product.description)}>
                        {tDb(product.description)}
                      </p>
                    )}

                    <div className="product-mobile-price">
                      ₹{formattedPrice}
                    </div>

                    <div className="product-mobile-meta-row">
                      <span className="product-in-stock-tag">
                        <CheckCircle2 size={13} className="in-stock-icon" />
                        <span>{t("products.inStock", "In Stock")}</span>
                      </span>
                      <span className="product-meta-sep">|</span>
                      <span className="product-free-delivery-tag">
                        <Truck size={13} className="truck-icon" />
                        <span>{t("products.freeDelivery", "Free Delivery")}</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleBuyNow(product)}
                      className="product-mobile-buy-btn"
                    >
                      <ShoppingBag size={15} />
                      <span>{t("products.buyNow", "Buy Now")}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '3rem 1.5rem', textAlign: 'center' }}>
            <Package size={40} style={{ color: '#cbd5e1', margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1.1rem', color: '#0f172a', margin: '0 0 0.25rem 0' }}>{t("products.noProducts", "No products found")}</h3>
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>
              {search || selectedCategory !== "all" ? "Try adjusting your search or category filter" : "No products available in the catalog"}
            </p>
          </div>
        )}
      </div>

      {/* Buy Product Checkout Modal */}
      {buyProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
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
                    <small style={{ color: '#64748b', fontSize: '0.78rem' }}>₹{buyProduct.price}</small>
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
                      <option value="Razorpay">💳 Razorpay Online Gateway (UPI, Cards, NetBanking)</option>
                      <option value="UPI">📱 UPI Direct / GPay / PhonePe</option>
                      <option value="Cash on Delivery">📦 Cash on Delivery (COD)</option>
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
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '500px', width: '100%', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
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
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>Product Link</label>
                  <input
                    type="url"
                    placeholder="https://example.com/product"
                    value={productLink}
                    onChange={(e) => setProductLink(e.target.value)}
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
