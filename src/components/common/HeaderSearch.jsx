import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Search, X, CornerDownLeft, FileText, Utensils, ReceiptText, Loader2 } from "lucide-react"
import { call, money, getCachedData, getStoredMenuItems } from "../../lib/utils"
import "../../styles/HeaderSearch.css"

/**
 * The header's search: a round icon that opens into a short pill (click, "/" or Ctrl+K), with grouped results for
 * pages, menu items and bills. Picking a result opens it. Esc, the ✕ or a click outside closes it.
 *
 * pages: [{ id, label }] the pages this person can open. onNavigate(view): open a page.
 */
export function HeaderSearch({ pages = [], onNavigate, user, onOpenChange }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [menuItems, setMenuItems] = useState(() => {
    const stored = getStoredMenuItems(user)
    if (Array.isArray(stored) && stored.length > 0) return stored
    const cached = getCachedData("/menu")
    return Array.isArray(cached) ? cached : []
  })
  const [bills, setBills] = useState([])
  const [billsLoading, setBillsLoading] = useState(false)
  const [active, setActive] = useState(0)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const billReqRef = useRef(0)

  const q = query.trim().toLowerCase()

  useEffect(() => {
    onOpenChange?.(open)
  }, [open, onOpenChange])

  const close = () => {
    setOpen(false)
    setQuery("")
    setBills([])
    setActive(0)
  }

  // "/" or Ctrl/Cmd+K opens it from anywhere (not while typing in another field)
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase()
      const typing = tag === "input" || tag === "textarea" || tag === "select" || e.target?.isContentEditable
      if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // focus the field when it opens; close on a click outside
  useEffect(() => {
    if (!open) return undefined
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 30)
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) close()
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("touchstart", onDown, { passive: true })
    return () => {
      clearTimeout(focusTimer)
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("touchstart", onDown)
    }
  }, [open])

  // menu items: the cached list right away, refreshed once each time the search opens
  useEffect(() => {
    if (!open || !user) return
    call("/menu", { noCache: true }).then((res) => { if (Array.isArray(res)) setMenuItems(res) }).catch(() => {})
  }, [open, user])

  useEffect(() => {
    const onMenuUpdate = (e) => {
      if (Array.isArray(e?.detail?.items) && e.detail.items.length > 0) {
        setMenuItems(e.detail.items)
      } else if (e?.detail?.updatedItem) {
        const { id, stock_qty, track_stock, low_stock_alert } = e.detail.updatedItem
        setMenuItems((prev) => prev.map((it) => (it.id === id ? { ...it, stock_qty, track_stock, low_stock_alert } : it)))
      }
    }
    const onStockUpdated = (e) => {
      const { id, stock_qty, track_stock, low_stock_alert } = e?.detail || {}
      if (!id) return
      setMenuItems((prev) => prev.map((it) => (it.id === id ? { ...it, stock_qty, track_stock, low_stock_alert } : it)))
    }
    window.addEventListener("slipzo-menu-update", onMenuUpdate)
    window.addEventListener("slipzo-stock-updated", onStockUpdated)
    return () => {
      window.removeEventListener("slipzo-menu-update", onMenuUpdate)
      window.removeEventListener("slipzo-stock-updated", onStockUpdated)
    }
  }, [])

  // bills: searched on the server (all dates, saved and printed), a moment after typing stops
  useEffect(() => {
    if (!open || !user || q.length < 2) {
      setBills([])
      setBillsLoading(false)
      return undefined
    }
    const id = ++billReqRef.current
    setBillsLoading(true)
    const timer = setTimeout(() => {
      call(`/bills?page=1&limit=5&search=${encodeURIComponent(query.trim())}`)
        .then((res) => {
          if (id !== billReqRef.current) return
          const list = Array.isArray(res?.bills) ? res.bills : (Array.isArray(res) ? res : [])
          setBills(list.slice(0, 5))
        })
        .catch(() => { if (id === billReqRef.current) setBills([]) })
        .finally(() => { if (id === billReqRef.current) setBillsLoading(false) })
    }, 280)
    return () => clearTimeout(timer)
  }, [open, user, q])

  const results = useMemo(() => {
    if (!q) return []
    const pageHits = pages
      .filter((p) => String(p.label || "").toLowerCase().includes(q))
      .slice(0, 4)
      .map((p) => ({ type: "page", key: `page-${p.id}`, title: p.label, view: p.id }))
    const itemHits = menuItems
      .filter((it) => String(it?.name || "").toLowerCase().includes(q) || String(it?.category || "").toLowerCase().includes(q))
      .slice(0, 5)
      .map((it) => ({
        type: "item",
        key: `item-${it.id || it.menu_item_id || it.name}`,
        title: it.name,
        sub: it.category || "",
        value: money(it.custom_price ?? it.price ?? 0),
        image: it.image_url || ""
      }))
    const billHits = bills.map((b) => ({
      type: "bill",
      key: `bill-${b.id}`,
      title: `#${b.number || b.id}`,
      sub: [b.customer_name, b.table_number ? `${t("search.table", "Table")} ${b.table_number}` : "", b.created_at ? new Date(b.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : ""].filter(Boolean).join(" · "),
      value: money(b.total || 0),
      id: b.id
    }))
    return [...pageHits, ...itemHits, ...billHits]
  }, [q, pages, menuItems, bills, t])

  useEffect(() => { setActive(0) }, [q])

  const choose = (r) => {
    if (!r) return
    if (r.type === "page") {
      onNavigate?.(r.view)
    } else if (r.type === "item") {
      // the Menu page picks this up and shows the item already searched
      try { sessionStorage.setItem("slipzo_menu_search", r.title) } catch (_) {}
      onNavigate?.("menu")
      window.dispatchEvent(new CustomEvent("slipzo_menu_search", { detail: r.title }))
    } else if (r.type === "bill") {
      try {
        sessionStorage.setItem("slipzo-reprint-id", r.id)
        sessionStorage.setItem("slipzo-print-origin", "history")
      } catch (_) {}
      onNavigate?.("reprint")
    }
    close()
  }

  const onInputKey = (e) => {
    if (e.key === "Escape") { e.preventDefault(); close(); return }
    if (!results.length) return
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % results.length) }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + results.length) % results.length) }
    if (e.key === "Enter") { e.preventDefault(); choose(results[active]) }
  }

  const groups = [
    { type: "page", label: t("search.pages", "Pages"), icon: FileText },
    { type: "item", label: t("search.items", "Menu items"), icon: Utensils },
    { type: "bill", label: t("search.bills", "Bills"), icon: ReceiptText }
  ]
  const showPanel = open && q.length > 0
  let flatIndex = -1

  return (
    <>
      {open && <div className="hs-backdrop" onClick={close} aria-hidden="true" />}
      <div className={`hs ${open ? "open" : ""}`} ref={wrapRef}>
        {!open ? (
          <button
            type="button"
            className="hs-toggle"
            data-testid="header-search-open"
            onClick={() => setOpen(true)}
            aria-label={t("search.open", "Search")}
            title={`${t("search.open", "Search")}  ( / )`}
          >
            <Search size={19} />
          </button>
        ) : (
          <div className="hs-pop">
          <div className="hs-field" role="combobox" aria-expanded={showPanel} aria-haspopup="listbox">
            <Search size={17} className="hs-field-icon" aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              enterKeyHint="search"
              className="hs-input"
              data-testid="header-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKey}
              placeholder={t("search.placeholder", "Search ..")}
              aria-label={t("search.open", "Search")}
              aria-autocomplete="list"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              className="hs-clear"
              onClick={() => (query ? (setQuery(""), inputRef.current?.focus()) : close())}
              aria-label={query ? t("search.clear", "Clear") : t("search.close", "Close search")}
            >
              <X size={16} />
            </button>
          </div>

        {showPanel && (
          <div className="hs-panel" role="listbox">
            {results.length === 0 && !billsLoading ? (
              <div className="hs-empty">{t("search.noResults", "Nothing found for “{{q}}”", { q: query.trim() })}</div>
            ) : (
              groups.map((g) => {
                const rows = results.filter((r) => r.type === g.type)
                const loadingBills = g.type === "bill" && billsLoading
                if (!rows.length && !loadingBills) return null
                const GroupIcon = g.icon
                return (
                  <div key={g.type} className="hs-group">
                    <div className="hs-group-label">
                      {g.label}
                      {loadingBills && <Loader2 size={12} className="hs-spin" />}
                    </div>
                    {rows.map((r) => {
                      flatIndex += 1
                      const idx = flatIndex
                      return (
                        <button
                          key={r.key}
                          type="button"
                          role="option"
                          aria-selected={idx === active}
                          className={`hs-row ${idx === active ? "active" : ""}`}
                          onMouseEnter={() => setActive(idx)}
                          onClick={() => choose(r)}
                        >
                          {r.image ? (
                            <img src={r.image} alt="" className="hs-row-img" loading="lazy" />
                          ) : (
                            <span className="hs-row-icon"><GroupIcon size={15} /></span>
                          )}
                          <span className="hs-row-text">
                            <span className="hs-row-title">{r.title}</span>
                            {r.sub && <span className="hs-row-sub">{r.sub}</span>}
                          </span>
                          {r.value && <span className="hs-row-value">{r.value}</span>}
                          {idx === active && <CornerDownLeft size={14} className="hs-row-enter" aria-hidden="true" />}
                        </button>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>
        )}
          </div>
        )}
      </div>
    </>
  )
}

export default HeaderSearch
