import { useEffect, useState, useMemo } from "react"
import { 
  Receipt, ArrowRight, Search, X, Check, Sparkles, Printer, Eye,
  Crown, Wand2, FileText, Layers
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useDbTranslation } from "../lib/translator"
import { call, getCachedData } from "../lib/utils"
import { CardSkeleton } from "./common/Skeleton"
import { useToast } from "./common/Toast"
import { MiniReceiptPreview } from "./MiniReceiptPreview"
import { RealisticReceiptView } from "./RealisticReceiptView"

export const BUILTIN_TEMPLATES = [
  {
    id: "classic",
    templateId: "1",
    name: "Classic Receipt",
    category: "Standard",
    badge: "STANDARD",
    badgeClass: "badge-standard-blue",
    width: "58mm",
    paperSize: "58mm Thermal",
    topBarColor: "#0284c7",
    accentColor: "#0284c7",
    btnClass: "template-btn-blue",
    description: "Clean and professional receipt template with itemized table, clear rates, and totals.",
    features: [
      "Shop logo header",
      "Itemized list with quantity",
      "Receipt summary & totals",
      "Payment mode badge"
    ],
    is_builtin: true,
    is_default: true
  },
  {
    id: "minimal",
    templateId: "2",
    name: "Minimal Clean Bill",
    category: "Minimal",
    badge: "MOST POPULAR",
    hasCrown: true,
    badgeClass: "badge-popular-cyan",
    width: "58mm",
    paperSize: "58mm Thermal",
    topBarColor: "#0ea5e9",
    accentColor: "#0284c7",
    btnClass: "template-btn-cyan",
    description: "Streamlined layout engineered to reduce paper roll consumption while maintaining clarity.",
    features: [
      "Compact receipt layout",
      "Large legible totals",
      "Zero-waste spacing",
      "Thermal optimized"
    ],
    is_builtin: true
  },
  {
    id: "pro",
    templateId: "3",
    name: "Shop Pro",
    category: "Business",
    badge: "RETAIL CHOICE",
    badgeClass: "badge-retail-purple",
    width: "80mm",
    paperSize: "80mm POS",
    topBarColor: "#4f46e5",
    accentColor: "#4f46e5",
    btnClass: "template-btn-purple",
    description: "Professional high-volume retail template with loyalty points display, item discounts, and payment QR code.",
    features: [
      "Brand accent header",
      "Discount highlight tags",
      "Loyalty rewards counter",
      "Dynamic UPI QR code"
    ],
    is_builtin: true
  },
  {
    id: "eco",
    templateId: "4",
    name: "Eco Print",
    category: "Thermal",
    badge: "PAPER SAVER",
    badgeClass: "badge-eco-green",
    width: "58mm",
    paperSize: "58mm Ultra Compact",
    topBarColor: "#059669",
    accentColor: "#059669",
    btnClass: "template-btn-green",
    description: "Ultra-compact monospace thermal bill layout engineered specifically to maximize speed and save paper.",
    features: [
      "Fast thermal printing",
      "Monospace font alignment",
      "High-density item lines",
      "Less paper usage"
    ],
    is_builtin: true
  },
  {
    id: "modern",
    templateId: "5",
    name: "Modern Shop",
    category: "Modern",
    badge: "TRENDY",
    badgeClass: "badge-trendy-orange",
    width: "58mm",
    paperSize: "58mm Thermal",
    topBarColor: "#ea580c",
    accentColor: "#ea580c",
    btnClass: "template-btn-orange",
    description: "Contemporary aesthetic for boutiques, cafes, and salons with pill badges, stylish spacing, and Instagram-style layout.",
    features: [
      "Modern typography",
      "Category pill badges",
      "Social media footer",
      "Clean spacing"
    ],
    is_builtin: true
  },
  {
    id: "elite",
    templateId: "6",
    name: "Business Elite",
    category: "Business",
    badge: "PREMIUM",
    badgeClass: "badge-premium-indigo",
    width: "80mm",
    paperSize: "80mm Standard / A4",
    topBarColor: "#6366f1",
    accentColor: "#4f46e5",
    btnClass: "template-btn-indigo",
    description: "Formal business invoice template designed for retail and services with clear totals, signatory, and terms.",
    features: [
      "Formal invoice header",
      "Itemized table with rates",
      "Authorized signatory box",
      "Terms & conditions"
    ],
    is_builtin: true
  }
]

/**
 * Templates Showcase & Selection Component
 * Manages thermal receipt templates, search filtering, and realistic preview modal.
 */
export function Templates({ setView, user }) {
  const { t } = useTranslation()
  const { tDb, formatNum } = useDbTranslation()
  const [items, setItems] = useState(() => {
    const cached = getCachedData("/templates")
    return Array.isArray(cached) ? cached : []
  })
  const [initialLoading, setInitialLoading] = useState(() => {
    const cached = getCachedData("/templates")
    return !(Array.isArray(cached) && cached.length > 0)
  })
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

    const enrichedDbItems = dbItems.map(item => {
      const match = BUILTIN_TEMPLATES.find(b =>
        (b.name || "").toLowerCase() === (item.name || "").toLowerCase() ||
        String(b.templateId) === String(item.id) ||
        (b.id && item.preview && b.id === item.preview)
      )
      if (match) {
        return {
          ...match,
          ...item,
          builtin_id: match.id,
          preview: match.id,
          features: match.features || item.features,
          badge: match.badge || item.badge,
          badgeClass: match.badgeClass || item.badgeClass,
          topBarColor: match.topBarColor || item.accentColor,
          btnClass: match.btnClass,
          paperSize: match.paperSize || item.paperSize,
          is_builtin: false
        }
      }
      return {
        ...item,
        badge: item.badge || "CUSTOM",
        badgeClass: "badge-standard-blue",
        topBarColor: item.accentColor || "#0284c7",
        btnClass: "template-btn-blue",
        category: item.category || "Custom",
        paperSize: item.paperSize || `${item.width || "58mm"} Thermal`,
        features: item.features || [
          `${item.width || "58mm"} thermal print layout`,
          item.show_tax ? `GST / Tax (${item.tax_rate || 18}%) calculation` : "Zero tax / simple billing",
          item.footer || "Thank you for shopping with us!"
        ],
        description: item.description || `Custom ${item.width || "58mm"} receipt template created by you.`
      }
    })

    const extraBuiltins = BUILTIN_TEMPLATES.filter(
      b => !dbNames.has((b.name || "").toLowerCase())
    )

    return [...enrichedDbItems, ...extraBuiltins]
  }, [items])

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
    <div className="templates-page-root">
      {/* 1. Hero Section Banner */}
      <section className="templates-hero-banner">
        <div className="templates-hero-grid">
          <div className="templates-hero-left">
            <span className="templates-eyebrow">{t("templates.eyebrow", "REUSABLE RECEIPTS")}</span>
            <h1 className="templates-hero-heading">
              Templates that <span className="templates-hero-accent">save time.</span>
            </h1>
            <p className="templates-hero-subtext">
              {t("templates.subtitle", "Pick from our pre-designed receipt styles or create your own custom layout for your business.")}
            </p>
          </div>

          <div className="templates-hero-center-art">
            <img 
              src="https://apzabspkfpuszlduyoqv.supabase.co/storage/v1/object/public/UI_Images/templates_hero_illustration.jpg" 
              alt="Receipt Templates Artwork" 
              className="templates-hero-art-img" 
            />
          </div>

          <div className="templates-hero-badges-col">
            <div className="hero-feature-badge-card">
              <div className="feature-icon-circle feat-circle-green">
                <Sparkles size={16} />
              </div>
              <span className="feature-badge-label">Professional</span>
            </div>

            <div className="hero-feature-badge-card">
              <div className="feature-icon-circle feat-circle-purple">
                <Wand2 size={16} />
              </div>
              <span className="feature-badge-label">Customizable</span>
            </div>

            <div className="hero-feature-badge-card">
              <div className="feature-icon-circle feat-circle-blue">
                <Printer size={16} />
              </div>
              <span className="feature-badge-label">Print Ready</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Search Field */}
      <section className="templates-search-section">
        <div className="templates-search-bar">
          <Search size={18} className="templates-search-icon" />
          <input
            data-testid="template-search-input"
            type="text"
            placeholder={t("templates.searchPlaceholder", "Search templates by name, width, category, footer...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="templates-search-input-field"
          />
          {search && (
            <button className="templates-search-clear-btn" onClick={() => setSearch("")}>
              <X size={15} />
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
      </section>

      {/* 3. Filter Chips Bar */}
      <section className="templates-filter-section-bar">
        <div className="templates-chips-container">
          <button
            className={`templates-filter-pill ${activeFilter === "all" ? "pill-active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            <Layers size={14} />
            <span>{t("templates.filterAll", "All")} ({formatNum(allItems.length)})</span>
          </button>
          <button
            className={`templates-filter-pill ${activeFilter === "58mm" ? "pill-active" : ""}`}
            onClick={() => setActiveFilter("58mm")}
          >
            <Printer size={14} />
            <span>58mm Thermal</span>
          </button>
          <button
            className={`templates-filter-pill ${activeFilter === "80mm" ? "pill-active" : ""}`}
            onClick={() => setActiveFilter("80mm")}
          >
            <FileText size={14} />
            <span>80mm Standard</span>
          </button>
          <button
            className={`templates-filter-pill ${activeFilter === "default" ? "pill-active" : ""}`}
            onClick={() => setActiveFilter("default")}
          >
            <Crown size={14} />
            <span>{t("templates.filterDefault", "Default")}</span>
          </button>
        </div>
      </section>

      {/* 4. Templates Showcase Grid */}
      {initialLoading && filteredTemplates.length === 0 ? (
        <CardSkeleton count={6} />
      ) : filteredTemplates.length > 0 ? (
        <section className="templates-cards-grid-section">
          <div className="templates-cards-grid">
            {filteredTemplates.map((template) => {
              const topBarColor = template.topBarColor || "#0284c7"
              const accentColor = template.accentColor || "#0284c7"
              const btnClass = template.btnClass || "template-btn-blue"
              const badgeClass = template.badgeClass || "badge-standard-blue"
              const features = Array.isArray(template.features) ? template.features : [
                `${template.width || "58mm"} thermal print layout`,
                "Tax / GST calculation",
                "Payment mode badge",
                template.footer || "Thank you note included"
              ]

              return (
                <div
                  className="template-card-item"
                  key={template.id}
                  style={{ "--card-accent-color": topBarColor }}
                >
                  <div className="template-card-top-accent-bar" style={{ backgroundColor: topBarColor }} />

                  {/* Top Badges Row */}
                  <div className="template-card-badge-row">
                    <div className="template-left-badges">
                      <span className={`template-category-badge ${badgeClass}`}>
                        {template.hasCrown && <Crown size={11} className="badge-crown-icon" />}
                        {tDb(template.badge || "STANDARD")}
                      </span>
                      {template.is_default && (
                        <span className="template-default-badge">
                          Default
                        </span>
                      )}
                    </div>

                    <div className="template-right-paper-badge">
                      <Printer size={12} />
                      <span>{template.paperSize || `${template.width || "58mm"} Thermal`}</span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="template-card-title">{tDb(template.name)}</h3>
                  <p className="template-card-desc">
                    {tDb(template.description || "Clean and professional receipt template.")}
                  </p>

                  {/* Inner Split: Features on Left, Miniature Receipt on Right */}
                  <div className="template-card-inner-split">
                    <div className="template-features-column">
                      {features.slice(0, 4).map((feat, idx) => (
                        <div className="template-feature-row" key={idx}>
                          <Check size={14} style={{ color: topBarColor }} className="feat-check-icon" />
                          <span>{tDb(feat)}</span>
                        </div>
                      ))}
                    </div>

                    <div 
                      className="template-mini-receipt-column"
                      onClick={() => setPreviewTemplate(template)}
                      title="Click to zoom realistic receipt"
                    >
                      <MiniReceiptPreview template={template} />
                    </div>
                  </div>

                  {/* Card Action Buttons at Bottom */}
                  <div className="template-card-actions-bottom">
                    <button
                      data-testid={`use-template-${template.id}-button`}
                      className={`template-use-action-btn ${btnClass}`}
                      onClick={() => {
                        sessionStorage.setItem("slipzo-template", template.templateId || template.id)
                        setView("bills")
                      }}
                    >
                      <span>{t("templates.useTemplate", "Use template")}</span>
                      <ArrowRight size={14} />
                    </button>

                    <button
                      className="template-preview-action-btn"
                      onClick={() => setPreviewTemplate(template)}
                      title={t("templates.preview", "Preview Receipt")}
                    >
                      <Eye size={15} />
                      <span className="preview-btn-text">{t("templates.preview", "Preview")}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : (
        <div className="empty fade-in" style={{ padding: "3rem 1rem", textAlign: "center" }}>
          <Receipt size={36} color="#94a3b8" style={{ margin: "0 auto 1rem" }} />
          <h3 style={{ color: "#0f172a", fontSize: "1.2rem", fontWeight: 700 }}>{t("templates.noMatching", "No matching templates")}</h3>
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>{t("templates.noMatchingDesc", "Try adjusting your search query or filter chip.")}</p>
          <button
            className="secondary-button"
            onClick={() => {
              setSearch("")
              setActiveFilter("all")
            }}
            style={{ marginTop: "1rem" }}
          >
            {t("templates.clearFilters", "Clear filters")}
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
                <h3>{tDb(previewTemplate.name)}</h3>
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
                style={{ background: previewTemplate.topBarColor || previewTemplate.accentColor || "#0284c7" }}
                onClick={() => {
                  sessionStorage.setItem("slipzo-template", previewTemplate.templateId || previewTemplate.id)
                  setPreviewTemplate(null)
                  setView("bills")
                }}
              >
                {t("templates.useInBilling", "Use this template in billing")} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}