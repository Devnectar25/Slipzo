import { useEffect, useState, useMemo } from "react"
import { Plus, Receipt, Copy, Trash2, ArrowRight, Search, X, Edit, SlidersHorizontal, Check, Sparkles, Printer, Eye } from "lucide-react"
import { call, getCachedData } from "../lib/utils"
import { CardSkeleton, ButtonLoader, Spinner } from "./common/Skeleton"
import { useToast } from "./common/Toast"
import { MiniReceiptPreview } from "./MiniReceiptPreview"
import { RealisticReceiptView } from "./RealisticReceiptView"
import { VoiceInputButton } from "./common/VoiceInputButton"

export const BUILTIN_TEMPLATES = [
  {
    id: "classic",
    templateId: "1",
    name: "Classic Receipt",
    category: "Standard",
    badge: "Standard",
    width: "58mm",
    paperSize: "58mm Thermal",
    show_tax: true,
    tax_rate: 18,
    footer: "Thank you for shopping with us! Please come again.",
    description: "Clean and professional receipt template with itemized table and clear totals.",
    gradient: "linear-gradient(135deg, #FC9B3E 0%, #F66016 100%)",
    accentColor: "#F66016",
    features: ["Shop header & info", "Subtotal & grand totals", "Itemized table (Qty, Rate, Total)", "Payment mode & barcode"],
    previewData: {
      shopName: "CLASSIC MART & GROCERY",
      address: "Shop 14, Main Market, Connaught Place, New Delhi",
      phone: "+91 11 2341 5678",
      gst: "07AAAA000A1Z5",
      invoiceNo: "CM-2026-8821",
      date: "09 Mar 2026, 01:15 PM",
      items: [
        { name: "Basmati Rice 1kg", qty: 2, rate: 120, total: 240 },
        { name: "Refined Sunflower Oil 1L", qty: 1, rate: 195, total: 195 }
      ],
      subtotal: 435,
      tax: 78.30,
      discount: 0,
      total: 513.30,
      payment: "Cash",
      footer: "Thank you for shopping with us! Please come again."
    },
    is_builtin: true,
    is_default: true
  },
  {
    id: "minimal",
    templateId: "2",
    name: "Minimal Clean Bill",
    category: "Minimal",
    badge: "Most Popular",
    width: "58mm",
    paperSize: "58mm Thermal",
    show_tax: false,
    tax_rate: 0,
    footer: "Thank you for visiting! Please come again.",
    description: "Streamlined layout engineered to reduce paper roll consumption while maintaining crystal clear readability.",
    gradient: "linear-gradient(135deg, #FB821B 0%, #F66016 100%)",
    accentColor: "#FB821B",
    features: ["Compact receipt layout", "Zero-waste spacing", "Large legible totals", "Thermal optimized"],
    is_default: true,
    previewData: {
      shopName: "MINIMAL CAFE & BAKERY",
      address: "MG Road, Indiranagar, Bengaluru",
      phone: "+91 98765 43210",
      gst: "",
      invoiceNo: "MC-INV-102",
      date: "09 Mar 2026, 02:45 PM",
      items: [
        { name: "Espresso Single Shot", qty: 1, rate: 120, total: 120 },
        { name: "Butter Croissant", qty: 1, rate: 100, total: 100 }
      ],
      subtotal: 220,
      tax: 0,
      discount: 0,
      total: 220,
      payment: "UPI / PhonePe",
      footer: "Thank you for visiting! Please come again."
    },
    is_builtin: true
  },
  {
    id: "pro",
    templateId: "3",
    name: "Shop Pro",
    category: "Business",
    badge: "Retail Choice",
    width: "80mm",
    paperSize: "80mm POS",
    show_tax: true,
    tax_rate: 18,
    footer: "Thank you for shopping with us! Please come again.",
    description: "Professional high-volume retail POS receipt with clean column headers, item discounts, and net totals.",
    gradient: "linear-gradient(135deg, #60a5fa 0%, #1d4ed8 100%)",
    accentColor: "#2563eb",
    features: ["Retail store header", "Itemized table with quantity", "Tax / GST calculation", "Editable footer note"],
    previewData: {
      shopName: "URBAN FASHION PRO",
      address: "Level 2, Phoenix Marketcity, Mumbai",
      phone: "+91 22 6789 0011",
      gst: "27AAACU1234M1Z2",
      invoiceNo: "UFP-INV-4401",
      date: "09 Mar 2026, 04:30 PM",
      items: [
        { name: "Pure Linen Casual Shirt", qty: 1, rate: 1499, total: 1499 },
        { name: "Slim Fit Chino Trousers", qty: 1, rate: 1899, total: 1899 }
      ],
      subtotal: 3398,
      tax: 0,
      discount: 300,
      total: 3098,
      payment: "Credit / Debit Card",
      footer: "Thank you for shopping with us! Please come again."
    },
    is_builtin: true
  },
  {
    id: "eco",
    templateId: "4",
    name: "Eco Print",
    category: "Thermal",
    badge: "Paper Saver",
    width: "58mm",
    paperSize: "58mm Ultra Compact",
    show_tax: false,
    tax_rate: 0,
    footer: "Save paper, save trees! Thank you.",
    description: "Ultra-compact monospace thermal bill layout engineered specifically to maximize speed and minimize roll paper consumption.",
    gradient: "linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)",
    accentColor: "#0d9488",
    features: ["58mm compact layout", "Monospace font alignment", "High-density item lines", "Paper saving spacing"],
    previewData: {
      shopName: "KRISHNA JUICE & SHAKES",
      address: "Near Metro Station Gate 2, Hyderabad",
      phone: "+91 40 5544 3322",
      gst: "",
      invoiceNo: "KJ-7734",
      date: "09 Mar 2026, 11:30 AM",
      items: [
        { name: "Fresh Pomegranate Juice", qty: 2, rate: 80, total: 160 },
        { name: "Special Fruit Salad Bowl", qty: 1, rate: 120, total: 120 }
      ],
      subtotal: 280,
      tax: 0,
      discount: 0,
      total: 280,
      payment: "UPI QR",
      footer: "Save paper, save trees! Thank you."
    },
    is_builtin: true
  },
  {
    id: "modern",
    templateId: "5",
    name: "Modern Shop",
    category: "Modern",
    badge: "Trendy",
    width: "58mm",
    paperSize: "58mm Thermal",
    show_tax: false,
    tax_rate: 0,
    footer: "Thank you for your visit! Please come again.",
    description: "Contemporary aesthetic for boutiques, cafes, and modern shops with clean typography and spacing.",
    gradient: "linear-gradient(135deg, #FB821B 0%, #FA4406 100%)",
    accentColor: "#FB821B",
    features: ["Modern typography", "Clean item list with rates", "Clear amount due card", "Custom footer note"],
    previewData: {
      shopName: "LUMINA BEAUTY & SPA",
      address: "3rd Block, Koramangala, Bengaluru",
      phone: "+91 80 9988 7766",
      gst: "29AABCL5544R1Z8",
      invoiceNo: "LUM-2026-55",
      date: "09 Mar 2026, 05:15 PM",
      items: [
        { name: "Organic Rose Water Toner 100ml", qty: 1, rate: 450, total: 450 },
        { name: "Hydrating Facial Serum 50ml", qty: 1, rate: 890, total: 890 }
      ],
      subtotal: 1340,
      tax: 0,
      discount: 0,
      total: 1340,
      payment: "UPI / Card",
      footer: "Thank you for your visit! Please come again."
    },
    is_builtin: true
  },
  {
    id: "elite",
    templateId: "6",
    name: "Business Elite",
    category: "Business",
    badge: "Premium",
    width: "80mm",
    paperSize: "80mm Standard / A4",
    show_tax: true,
    tax_rate: 18,
    footer: "Thank you for your business. Terms & conditions apply.",
    description: "Formal tax invoice template designed for businesses requiring full GST details, itemized totals, and formal terms.",
    gradient: "linear-gradient(135deg, #FC9B3E 0%, #FA4406 100%)",
    accentColor: "#F66016",
    features: ["Formal Tax Invoice header", "GSTIN & seller details", "Itemized table with rates", "Tax breakdown & totals"],
    previewData: {
      shopName: "TECHNO COMPUTERS & PERIPHERALS",
      address: "Plot 88, Electronic City Phase 1, Bengaluru",
      phone: "+91 80 4123 9900",
      gst: "29AABCT9981K1ZT",
      invoiceNo: "TC-INV-2026-904",
      date: "09 Mar 2026, 03:00 PM",
      items: [
        { name: "Wireless Ergonomic Mouse", qty: 1, rate: 850, total: 850 },
        { name: "Mechanical RGB Keyboard", qty: 1, rate: 2400, total: 2400 }
      ],
      subtotal: 3250,
      tax: 585,
      discount: 0,
      total: 3835,
      payment: "Bank / Online",
      footer: "Thank you for your business. Terms & conditions apply."
    },
    is_builtin: true
  }
]

export function Templates({ setView, user }) {
  const [items, setItems] = useState(() => {
    const cached = getCachedData("/templates")
    return Array.isArray(cached) ? cached : []
  })
  const [name, setName] = useState("")
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(() => {
    const cached = getCachedData("/templates")
    return !(Array.isArray(cached) && cached.length > 0)
  })
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState("all") // "all" | "58mm" | "80mm" | "default"
  const [previewTemplate, setPreviewTemplate] = useState(null)

  // Lock background scroll when preview template modal is open
  useEffect(() => {
    if (previewTemplate) {
      const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0
      const scrollX = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || 0

      const originalBodyOverflow = document.body.style.overflow
      const originalBodyPosition = document.body.style.position
      const originalBodyTop = document.body.style.top
      const originalBodyLeft = document.body.style.left
      const originalBodyWidth = document.body.style.width
      const originalDocOverflow = document.documentElement.style.overflow

      document.body.style.overflow = "hidden"
      document.body.style.position = "fixed"
      document.body.style.top = `-${scrollY}px`
      document.body.style.left = `-${scrollX}px`
      document.body.style.width = "100%"
      document.documentElement.style.overflow = "hidden"

      const elementsToLock = document.querySelectorAll(".shell-content, .shell-main, .app, .public-layout, .main-content")
      elementsToLock.forEach(el => {
        el.dataset.origOverflow = el.style.overflow
        el.style.overflow = "hidden"
      })

      return () => {
        document.body.style.overflow = originalBodyOverflow
        document.body.style.position = originalBodyPosition
        document.body.style.top = originalBodyTop
        document.body.style.left = originalBodyLeft
        document.body.style.width = originalBodyWidth
        document.documentElement.style.overflow = originalDocOverflow
        elementsToLock.forEach(el => {
          el.style.overflow = el.dataset.origOverflow || ""
        })
        window.scrollTo(scrollX, scrollY)
      }
    }
  }, [previewTemplate])

  const { success, error: toastError } = useToast()

  const load = async () => {
    try {
      const data = await call("/templates")
      setItems(Array.isArray(data) ? data : [])

      const editTemplateId = sessionStorage.getItem("slipzo-edit-template")
      if (editTemplateId) {
        const template = Array.isArray(data) ? data.find(t => t.id === editTemplateId) : null
        if (template) {
          setEditingTemplate(template)
          setName(template.name)
          setShow(true)
          setEditMode(true)
          sessionStorage.removeItem("slipzo-edit-template")
        }
      }
    } catch (err) {
      console.error("Failed to load templates:", err)
      if (!getCachedData("/templates")) {
        toastError("Failed to load templates")
      }
      setItems([])
    } finally {
      setInitialLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // Combined list of database items + built-in home page templates
  const allItems = useMemo(() => {
    const dbItems = Array.isArray(items) ? items : []
    const dbNames = new Set(dbItems.map(i => (i.name || "").toLowerCase()))

    // Enrich DB items with template presentation defaults
    const enrichedDbItems = dbItems.map(item => {
      const match = BUILTIN_TEMPLATES.find(b =>
        (b.name || "").toLowerCase() === (item.name || "").toLowerCase() ||
        String(b.templateId) === String(item.id) ||
        (item.name || "").toLowerCase().includes((b.name || "").toLowerCase()) ||
        (b.name || "").toLowerCase().includes((item.name || "").toLowerCase())
      )
      if (match) {
        return {
          ...match,
          ...item,
          preview: match.id,
          badge: match.badge,
          description: match.description,
          features: match.features,
          paperSize: match.paperSize,
          previewData: match.previewData,
          is_builtin: false
        }
      }
      return {
        ...item,
        badge: item.badge || "Custom",
        category: item.category || "Custom",
        paperSize: item.paperSize || `${item.width || "58mm"} Thermal`,
        gradient: item.gradient || "linear-gradient(135deg, #FB821B 0%, #F66016 100%)",
        accentColor: item.accentColor || "#FB821B",
        features: item.features || [
          `${item.width || "58mm"} thermal print layout`,
          item.show_tax ? `GST / Tax (${item.tax_rate || 18}%) calculation` : "Zero tax / simple billing",
          item.footer || "Thank you for shopping with us!"
        ],
        description: item.description || `Custom ${item.width || "58mm"} receipt template created by you.`,
        previewData: {
          shopName: user?.shop_name || "YOUR SHOP NAME",
          address: user?.shop_address || "Main Market, Commercial Street",
          phone: user?.shop_phone || "+91 98765 43210",
          gst: user?.shop_gst || "",
          invoiceNo: "INV-2026-001",
          date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
          items: [
            { name: "Sample Item 1", qty: 2, rate: 150, total: 300 },
            { name: "Sample Item 2", qty: 1, rate: 250, total: 250 }
          ],
          subtotal: 550,
          tax: item.show_tax ? (550 * (item.tax_rate || 18)) / 100 : 0,
          discount: 0,
          total: 550 + (item.show_tax ? (550 * (item.tax_rate || 18)) / 100 : 0),
          payment: "Cash / UPI",
          footer: item.footer || "Thank you for shopping with us!"
        }
      }
    })

    // Filter built-ins so we don't show duplicates if DB has same name
    const extraBuiltins = BUILTIN_TEMPLATES.filter(
      b => !dbNames.has((b.name || "").toLowerCase())
    )

    return [...enrichedDbItems, ...extraBuiltins]
  }, [items, user])

  const create = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      if (editMode && editingTemplate) {
        if (!editingTemplate.is_builtin) {
          await call(`/templates/${editingTemplate.id}`, {
            method: "PUT",
            body: JSON.stringify({ name: name.trim() })
          })
          success("Template updated successfully")
        } else {
          await call("/templates", {
            method: "POST",
            body: JSON.stringify({
              name: name.trim(),
              width: editingTemplate.width || "58mm",
              show_tax: editingTemplate.show_tax !== undefined ? editingTemplate.show_tax : true,
              tax_rate: editingTemplate.tax_rate || 18,
              footer: editingTemplate.footer || "Thank you for shopping!"
            })
          })
          success("Template created from " + editingTemplate.name)
        }
      } else {
        await call("/templates", {
          method: "POST",
          body: JSON.stringify({ name: name.trim() })
        })
        success("Template created successfully")
      }
      setName("")
      setShow(false)
      setEditMode(false)
      setEditingTemplate(null)
      await load()
    } catch (err) {
      console.error("Failed to save template:", err)
      toastError(err.message || "Failed to save template")
    } finally {
      setLoading(false)
    }
  }

  const duplicate = async (template) => {
    try {
      setActionLoadingId(template.id)
      if (template.is_builtin) {
        await call("/templates", {
          method: "POST",
          body: JSON.stringify({
            name: `${template.name} (Copy)`,
            width: template.width || "58mm",
            show_tax: template.show_tax !== undefined ? template.show_tax : true,
            tax_rate: template.tax_rate || 18,
            footer: template.footer || "Thank you for shopping!"
          })
        })
      } else {
        await call(`/templates/${template.id}/duplicate`, { method: "POST" })
      }
      success("Template duplicated")
      await load()
    } catch (err) {
      console.error("Failed to duplicate template:", err)
      toastError("Failed to duplicate template")
    } finally {
      setActionLoadingId(null)
    }
  }

  const remove = async (id) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return
    try {
      setActionLoadingId(id)
      await call(`/templates/${id}`, { method: "DELETE" })
      success("Template deleted")
      await load()
    } catch (err) {
      console.error("Failed to delete template:", err)
      toastError("Failed to delete template")
    } finally {
      setActionLoadingId(null)
    }
  }

  const cancelEdit = () => {
    setName("")
    setShow(false)
    setEditMode(false)
    setEditingTemplate(null)
  }

  // Filtered templates based on search & category chip
  const filteredTemplates = useMemo(() => {
    return allItems.filter((t) => {
      const matchesSearch =
        !search.trim() ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.width && t.width.toLowerCase().includes(search.toLowerCase())) ||
        (t.badge && t.badge.toLowerCase().includes(search.toLowerCase())) ||
        (t.category && t.category.toLowerCase().includes(search.toLowerCase())) ||
        (t.footer && t.footer.toLowerCase().includes(search.toLowerCase()))

      if (!matchesSearch) return false
      if (activeFilter === "58mm") return t.width === "58mm"
      if (activeFilter === "80mm") return t.width === "80mm"
      if (activeFilter === "default") return Boolean(t.is_default)
      return true
    })
  }, [allItems, search, activeFilter])

  return (
    <div className="page templates-page fade-in">
      <div className="page-intro">
        <div>
          <div className="eyebrow-pill-wrap">
            <span className="eyebrow-pill">REUSABLE RECEIPTS</span>
          </div>
          <h2 className="templates-mobile-title">
            Templates that<br />save time
          </h2>
          <p className="subtle templates-subtitle">
            Pick from our pre-designed receipt styles or create your own custom layout.
          </p>
        </div>
      </div>

      {show && (
        <div className="inline-form slide-up">
          <input
            data-testid="template-name-input"
            autoFocus
            placeholder="Template name, e.g. Everyday receipt"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") create()
              if (e.key === "Escape") cancelEdit()
            }}
          />
          <button
            data-testid="save-template-button"
            className="primary-button"
            onClick={create}
            disabled={loading}
          >
            {loading ? <ButtonLoader text="Saving..." /> : editMode ? "Update template" : "Save template"}
          </button>
          <button
            data-testid="cancel-template-button"
            className="secondary-button"
            onClick={cancelEdit}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="templates-filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            data-testid="template-search-input"
            type="text"
            placeholder="Search templates by name, width, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          {search ? (
            <button className="search-clear-btn" onClick={() => setSearch("")}>
              <X size={14} />
            </button>
          ) : (
            <div className="search-voice-wrap">
              <VoiceInputButton
                mode="raw"
                variant="icon-only"
                size="sm"
                onSpeechResult={(text) => setSearch(text)}
                className="search-voice-btn"
              />
            </div>
          )}
        </div>

        <div className="filter-chips">
          <button
            className={`filter-chip ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            All ({allItems.length})
          </button>
          <button
            className={`filter-chip ${activeFilter === "58mm" ? "active" : ""}`}
            onClick={() => setActiveFilter("58mm")}
          >
            58mm Thermal
          </button>
          <button
            className={`filter-chip ${activeFilter === "80mm" ? "active" : ""}`}
            onClick={() => setActiveFilter("80mm")}
          >
            80mm Standard
          </button>
          <button
            className={`filter-chip ${activeFilter === "default" ? "active" : ""}`}
            onClick={() => setActiveFilter("default")}
          >
            Default
          </button>
        </div>
      </div>

      {/* Templates Showcase Grid */}
      {initialLoading && filteredTemplates.length === 0 ? (
        <CardSkeleton count={4} />
      ) : filteredTemplates.length > 0 ? (
        <div className="dashboard-templates-grid">
          {filteredTemplates.map((template) => {
            const cardGradient = template.gradient || "linear-gradient(135deg, #FB821B 0%, #F66016 100%)"
            const accentColor = template.accentColor || "#FB821B"
            const features = Array.isArray(template.features) ? template.features : [
              `${template.width || "58mm"} thermal print layout`,
              template.show_tax ? `GST / Tax (${template.tax_rate || 18}%) calculation` : "Zero tax / simple layout",
              template.footer || "Thank you note included"
            ]

            return (
              <div
                className={`template-showcase-card dashboard-card ${template.is_default ? "is-default-card" : ""}`}
                key={template.id}
                style={{
                  "--card-gradient": cardGradient,
                  "--accent-color": accentColor
                }}
              >
                <div className="card-top-bar" style={{ background: cardGradient }} />

                <div className="template-card-top">
                  <div className="template-badge-row">
                    <div className="template-badge-left">
                      <span className="template-badge">
                        {template.badge || (template.is_default ? "Standard" : "Custom")}
                      </span>
                      {(template.is_default || template.id === "classic" || template.id === "minimal") && (
                        <span className="default-pill-indicator">DEFAULT</span>
                      )}
                    </div>
                    <span className="template-paper-tag">
                      <Printer size={13} /> {template.paperSize || `${template.width || "58mm"} Thermal`}
                    </span>
                  </div>

                  <h3>{template.name}</h3>
                  <p className="template-desc">{template.description || `Custom ${template.width || "58mm"} thermal receipt template.`}</p>
                </div>

                {/* Live Mini Receipt Preview Box with decorative peach background */}
                <div
                  className="template-receipt-preview"
                  onClick={() => setPreviewTemplate(template)}
                  title="Click to zoom realistic receipt"
                >
                  <div className="preview-bubble bubble-1" />
                  <div className="preview-bubble bubble-2" />
                  <div className="preview-bubble bubble-3" />
                  <div className="preview-bubble bubble-4" />
                  <MiniReceiptPreview template={template} />
                  <div className="mock-receipt-view-overlay">
                    <span><Eye size={15} /> Click to preview receipt</span>
                  </div>
                </div>

                {/* Features list (2x2 grid matching mobile design) */}
                <div className="template-features-list">
                  {(Array.isArray(features) ? features : []).map((feat, idx) => (
                    <div className="template-feat-item" key={idx}>
                      <span className="feat-check-icon">
                        <Check size={10} strokeWidth={3.5} />
                      </span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                {/* Card Action Buttons - Matching Mobile Design */}
                <div className="dashboard-template-actions">
                  <div className="actions-main-row">
                    <button
                      data-testid={`use-template-${template.id}-button`}
                      className="template-use-btn"
                      onClick={() => {
                        sessionStorage.setItem("slipzo-template", template.templateId || template.id)
                        setView("bills")
                      }}
                    >
                      <Check size={16} strokeWidth={3} /> Use template
                    </button>
                    <button
                      className="template-preview-btn-full"
                      onClick={() => setPreviewTemplate(template)}
                      title="View Realistic Receipt"
                    >
                      <Eye size={16} /> Preview
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="empty fade-in">
          <Receipt size={32} />
          <h3>No matching templates</h3>
          <p>Try adjusting your search query or filter chip.</p>
          <button
            className="secondary-button"
            onClick={() => {
              setSearch("")
              setActiveFilter("all")
            }}
            style={{ marginTop: "1rem" }}
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Realistic Receipt Preview Modal */}
      {previewTemplate && (
        <div
          className="template-modal-overlay"
          onClick={() => setPreviewTemplate(null)}
          onWheel={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault()
              e.stopPropagation()
            }
          }}
        >
          <div className="template-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="template-modal-header">
              <div>
                <h3>{previewTemplate.name}</h3>
                <span className="modal-paper-tag"><Printer size={12} /> {previewTemplate.paperSize || previewTemplate.width}</span>
              </div>
              <button className="modal-close-btn" onClick={() => setPreviewTemplate(null)}>✕</button>
            </div>

            <div className="template-modal-receipt-wrapper">
              <RealisticReceiptView template={previewTemplate} />
            </div>

            <div className="template-modal-footer">
              <button
                className="modal-use-btn"
                style={{ background: previewTemplate.gradient || "linear-gradient(135deg, #FB821B 0%, #F66016 100%)" }}
                onClick={() => {
                  sessionStorage.setItem("slipzo-template", previewTemplate.templateId || previewTemplate.id)
                  setPreviewTemplate(null)
                  setView("bills")
                }}
              >
                Use this template in billing <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}