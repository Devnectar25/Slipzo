import { useEffect, useState, useMemo } from "react"
import { Plus, Receipt, Copy, Trash2, ArrowRight, Search, X, Edit, SlidersHorizontal, Check } from "lucide-react"
import { call, getTemplateUsageStatus } from "../lib/utils"
import { CardSkeleton, ButtonLoader, Spinner } from "./common/Skeleton"
import { useToast } from "./common/Toast"

export function Templates({ setView, user }) {
  const [items, setItems] = useState([])
  const [name, setName] = useState("")
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState("all") // "all" | "58mm" | "80mm" | "default"

  const { success, error: toastError } = useToast()

  const load = async () => {
    try {
      const data = await call("/templates")
      setItems(Array.isArray(data) ? data : [])
      
      // Check if we're in edit mode from session
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
      toastError("Failed to load templates")
      setItems([])
    } finally {
      setInitialLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const create = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      if (editMode && editingTemplate) {
        await call(`/templates/${editingTemplate.id}`, {
          method: "PUT",
          body: JSON.stringify({ name: name.trim() })
        })
        success("Template updated successfully")
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

  const duplicate = async (id) => {
    try {
      setActionLoadingId(id)
      await call(`/templates/${id}/duplicate`, { method: "POST" })
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

  // Filtered and searched templates
  const filteredTemplates = useMemo(() => {
    if (!Array.isArray(items)) return []
    return items.filter((t) => {
      // Search filter
      const matchesSearch =
        !search.trim() ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.width && t.width.toLowerCase().includes(search.toLowerCase())) ||
        (t.footer && t.footer.toLowerCase().includes(search.toLowerCase()))

      // Category tab filter
      if (!matchesSearch) return false
      if (activeFilter === "58mm") return t.width === "58mm"
      if (activeFilter === "80mm") return t.width === "80mm"
      if (activeFilter === "default") return Boolean(t.is_default)
      return true
    })
  }, [items, search, activeFilter])

  // Render usage info for non-logged-in users
  const renderUsageInfo = (templateId) => {
    if (user) return null
    
    const status = getTemplateUsageStatus(templateId)
    const hasRemaining = status.remainingEdits > 0 || status.remainingPrints > 0
    
    return (
      <div className="template-usage-info" style={{
        fontSize: '0.65rem',
        color: hasRemaining ? '#64748b' : '#ef4444',
        padding: '0.25rem 0.5rem',
        background: hasRemaining ? '#f8fafc' : '#fef2f2',
        borderRadius: '6px',
        marginTop: '0.5rem',
        display: 'flex',
        gap: '1rem',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <span>✏️ {status.remainingEdits} edits left</span>
        <span>🖨️ {status.remainingPrints} prints left</span>
        {!hasRemaining && (
          <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.6rem' }}>
            ⚡ Sign up for unlimited
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="page templates-page fade-in">
      <div className="page-intro">
        <div>
          <p className="eyebrow accent">REUSABLE RECEIPTS</p>
          <h2>Templates that save time.</h2>
          <p className="subtle">
            Your receipt structure stays steady while the sale changes.
          </p>
        </div>
        <button
          data-testid="create-template-button"
          className="primary-button"
          onClick={() => {
            setEditMode(false)
            setEditingTemplate(null)
            setName("")
            setShow(true)
          }}
        >
          <Plus size={18} /> New template
        </button>
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
          <Search size={16} className="search-icon" />
          <input
            data-testid="template-search-input"
            type="text"
            placeholder="Search templates by name, width, footer..."
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

        <div className="filter-chips">
          <button
            className={`filter-chip ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            All ({items.length})
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

      {/* Templates Grid */}
      {initialLoading ? (
        <CardSkeleton count={3} />
      ) : filteredTemplates.length > 0 ? (
        <div className="template-list">
          {filteredTemplates.map((template) => (
            <article className="template-card-item" key={template.id}>
              <div className="template-icon">
                <Receipt size={23} />
              </div>
              <div className="template-copy">
                <div className="template-name">
                  <h3>{template.name}</h3>
                  {template.is_default && <span className="default-badge">DEFAULT</span>}
                </div>
                <p>
                  <span className="width-tag">{template.width}</span> ·{" "}
                  {template.show_tax ? `${template.tax_rate}% tax · ` : "No tax · "}
                  {template.footer || "Thank you for shopping!"}
                </p>
                <small className="text-muted">
                  {template.created_at ? new Date(template.created_at).toLocaleDateString() : "Ready to use"}
                </small>
                {renderUsageInfo(template.id)}
              </div>
              <div className="template-actions">
                <button
                  data-testid={`use-template-${template.id}-button`}
                  className="primary-button small"
                  onClick={() => {
                    sessionStorage.setItem("slipzo-template", template.id)
                    setView("bills")
                  }}
                >
                  Use template <ArrowRight size={15} />
                </button>
                <button
                  data-testid={`edit-template-${template.id}-button`}
                  className="secondary-button small"
                  onClick={() => {
                    setEditingTemplate(template)
                    setName(template.name)
                    setEditMode(true)
                    setShow(true)
                  }}
                >
                  <Edit size={14} /> Edit
                </button>
                <button
                  data-testid={`duplicate-template-${template.id}-button`}
                  className="icon-button"
                  title="Duplicate template"
                  onClick={() => duplicate(template.id)}
                  disabled={actionLoadingId === template.id}
                >
                  {actionLoadingId === template.id ? <Spinner size={14} /> : <Copy size={16} />}
                </button>
                <button
                  data-testid={`delete-template-${template.id}-button`}
                  className="icon-button danger"
                  title="Delete template"
                  onClick={() => remove(template.id)}
                  disabled={actionLoadingId === template.id}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty fade-in">
          <Receipt size={32} />
          <h3>{search || activeFilter !== "all" ? "No matching templates" : "No templates yet"}</h3>
          <p>
            {search || activeFilter !== "all"
              ? "Try adjusting your search query or filter chip."
              : "Create your first reusable receipt template to get started."}
          </p>
          {search || activeFilter !== "all" ? (
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
          ) : (
            <button
              className="primary-button"
              onClick={() => setShow(true)}
              style={{ marginTop: "1rem" }}
            >
              <Plus size={16} /> Create Template
            </button>
          )}
        </div>
      )}
    </div>
  )
}