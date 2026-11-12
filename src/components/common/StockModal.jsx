import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { X, Plus, Minus, PackagePlus, PackageMinus, ClipboardCheck, History, Boxes, AlertTriangle } from "lucide-react"
import { useTranslation } from "react-i18next"
import { call, invalidateApiCache, stockInfo, formatQty } from "../../lib/utils"
import { ButtonLoader, Spinner } from "./Skeleton"
import "../../styles/Stock.css"

const MODES = {
  add: { reasons: ["restock", "sale_return"], icon: PackagePlus },
  remove: { reasons: ["damage", "adjust"], icon: PackageMinus },
  set: { reasons: ["correction"], icon: ClipboardCheck }
}

const fmtDate = (iso) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

/**
 * Stock popup for one menu item: current stock, add / remove / set the count, low-stock alert and history.
 * onSaved({ id, stock_qty, track_stock, low_stock_alert }) is called after a change is saved.
 */
export function StockModal({ item, isOpen, onClose, onSaved }) {
  const { t } = useTranslation()
  const info = stockInfo(item)
  const [mode, setMode] = useState("add")
  const [qty, setQty] = useState("")
  const [reason, setReason] = useState("restock")
  const [note, setNote] = useState("")
  const [alertQty, setAlertQty] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const reasonLabel = (r) => ({
    opening: t("stock.reasonOpening", "Opening stock"),
    restock: t("stock.reasonRestock", "New stock arrived"),
    sale: t("stock.reasonSale", "Sold"),
    sale_return: t("stock.reasonReturn", "Customer return"),
    damage: t("stock.reasonDamage", "Damaged / expired"),
    correction: t("stock.reasonCorrection", "Stock count"),
    adjust: t("stock.reasonAdjust", "Other")
  }[r] || r)

  const loadHistory = async () => {
    if (!item?.id) return
    setHistoryLoading(true)
    try {
      const data = await call(`/menu/${item.id}/stock?limit=30`, { noCache: true })
      setHistory(Array.isArray(data?.movements) ? data.movements : [])
    } catch (_) {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen || !item) return
    const fresh = stockInfo(item)
    setMode(fresh.tracked ? "add" : "set")
    setReason(fresh.tracked ? "restock" : "correction")
    setQty("")
    setNote("")
    setError("")
    setAlertQty(String(fresh.alert))
    setHistory([])
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, item?.id])

  useEffect(() => {
    if (!isOpen) return undefined
    const onKey = (e) => { if (e.key === "Escape" && !saving) onClose?.() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isOpen, saving, onClose])

  const pickMode = (m) => {
    setMode(m)
    setReason(MODES[m].reasons[0])
    setError("")
  }

  const amount = qty === "" ? null : Number(qty)
  const current = info.tracked ? info.qty : 0
  const preview = useMemo(() => {
    if (amount === null || !Number.isFinite(amount)) return null
    if (mode === "add") return current + amount
    if (mode === "remove") return current - amount
    return amount
  }, [amount, mode, current])

  const bump = (d) => {
    const next = Math.max(0, (Number(qty) || 0) + d)
    setQty(formatQty(next))
    setError("")
  }

  const handleSave = async (e) => {
    e?.preventDefault()
    if (saving || !item) return
    const alertNum = alertQty === "" ? info.alert : Number(alertQty)
    const alertChanged = Number.isFinite(alertNum) && alertNum >= 0 && alertNum !== info.alert
    if (!Number.isFinite(alertNum) || alertNum < 0) {
      setError(t("stock.errAlert", "Low-stock alert must be 0 or more."))
      return
    }

    const hasQty = qty !== ""
    if (!hasQty && !alertChanged) {
      setError(mode === "set" ? t("stock.errSet", "Enter the stock count.") : t("stock.errQty", "Enter how many pieces."))
      return
    }
    if (hasQty) {
      if (!Number.isFinite(amount) || amount < 0 || (mode !== "set" && amount === 0)) {
        setError(t("stock.errQty", "Enter how many pieces."))
        return
      }
      if (mode === "remove" && amount > current) {
        setError(t("stock.errTooMany", "Only {{n}} in stock.", { n: formatQty(current) }))
        return
      }
    }

    setSaving(true)
    setError("")
    try {
      let result = { id: item.id, stock_qty: info.qty, track_stock: info.tracked, low_stock_alert: info.alert }
      if (alertChanged) {
        await call(`/menu/${item.id}`, { method: "PUT", body: JSON.stringify({ low_stock_alert: alertNum }) })
        result.low_stock_alert = alertNum
      }
      if (hasQty) {
        const body = mode === "set"
          ? { set: amount, reason, note: note.trim() || undefined }
          : { change: mode === "add" ? amount : -amount, reason, note: note.trim() || undefined }
        const res = await call(`/menu/${item.id}/stock`, { method: "POST", body: JSON.stringify(body) })
        result = { ...result, stock_qty: Number(res?.stock_qty ?? preview), track_stock: true }
      }
      invalidateApiCache("/menu")
      onSaved?.(result)
      onClose?.()
    } catch (err) {
      setError(err?.message || t("stock.errSave", "Could not save the stock. Please try again."))
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !item) return null

  const levelText = {
    none: t("stock.notTracked", "Stock not tracked"),
    ok: t("stock.inStock", "In stock"),
    low: t("stock.lowStock", "Low stock"),
    out: t("stock.outOfStock", "Out of stock")
  }[info.level]

  return createPortal(
    <div className="stock-modal-backdrop" onClick={() => !saving && onClose?.()}>
      <div className="stock-modal" role="dialog" aria-modal="true" aria-label={t("stock.title", "Manage stock")} onClick={(e) => e.stopPropagation()}>
        <div className="stock-modal-head">
          <div className="stock-modal-head-text">
            <span className="stock-modal-eyebrow"><Boxes size={13} /> {t("stock.title", "Manage stock")}</span>
            <h3 className="stock-modal-name" title={item.name}>{item.name}</h3>
          </div>
          <button type="button" className="stock-modal-close" onClick={onClose} disabled={saving} aria-label={t("common.close", "Close")}>
            <X size={18} />
          </button>
        </div>

        <form className="stock-modal-body" onSubmit={handleSave}>
          <div className={`stock-now stock-now-${info.level}`}>
            <div>
              <span className="stock-now-label">{t("stock.currentStock", "Current stock")}</span>
              <strong className="stock-now-qty">{info.tracked ? formatQty(info.qty) : "—"}</strong>
            </div>
            <span className={`stock-chip stock-chip-${info.level}`}>
              {info.level === "low" || info.level === "out" ? <AlertTriangle size={12} /> : null}
              {levelText}
            </span>
          </div>

          {!info.tracked && (
            <p className="stock-hint">{t("stock.startHint", "Enter how many pieces you have now. Every bill will then take sold pieces out of stock automatically.")}</p>
          )}

          <div className="stock-modes" role="tablist">
            {Object.entries(MODES).map(([key, m]) => {
              const Icon = m.icon
              const label = key === "add" ? t("stock.modeAdd", "Add stock") : key === "remove" ? t("stock.modeRemove", "Remove") : t("stock.modeSet", "Set count")
              const disabled = !info.tracked && key !== "set"
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={mode === key}
                  className={`stock-mode stock-mode-${key} ${mode === key ? "active" : ""}`}
                  onClick={() => pickMode(key)}
                  disabled={disabled || saving}
                >
                  <Icon size={15} /> <span>{label}</span>
                </button>
              )
            })}
          </div>

          <label className="stock-label" htmlFor="stock-qty">
            {mode === "set" ? t("stock.countLabel", "Pieces you have now") : mode === "add" ? t("stock.addLabel", "Pieces to add") : t("stock.removeLabel", "Pieces to remove")}
          </label>
          <div className="stock-qty-row">
            <button type="button" className="stock-step" onClick={() => bump(-1)} disabled={saving} aria-label="-1"><Minus size={16} /></button>
            <input
              id="stock-qty"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              className="stock-qty-input"
              placeholder="0"
              value={qty}
              onChange={(e) => { setQty(e.target.value); setError("") }}
              autoFocus
            />
            <button type="button" className="stock-step" onClick={() => bump(1)} disabled={saving} aria-label="+1"><Plus size={16} /></button>
          </div>
          {mode !== "set" && (
            <div className="stock-quick">
              {[5, 10, 25, 50].map((n) => (
                <button key={n} type="button" className="stock-quick-btn" onClick={() => bump(n)} disabled={saving}>+{n}</button>
              ))}
            </div>
          )}

          {preview !== null && (
            <div className={`stock-preview ${preview < 0 ? "neg" : ""}`}>
              <span>{t("stock.newStock", "New stock")}</span>
              <strong>{formatQty(current)} → {formatQty(preview)}</strong>
            </div>
          )}

          <div className="stock-grid">
            <div className="stock-field">
              <label className="stock-label" htmlFor="stock-reason">{t("stock.reason", "Reason")}</label>
              <select id="stock-reason" className="stock-input" value={reason} onChange={(e) => setReason(e.target.value)} disabled={saving}>
                {MODES[mode].reasons.map((r) => <option key={r} value={r}>{reasonLabel(r)}</option>)}
              </select>
            </div>
            <div className="stock-field">
              <label className="stock-label" htmlFor="stock-alert">{t("stock.alertLabel", "Low-stock alert at")}</label>
              <input
                id="stock-alert"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                className="stock-input"
                value={alertQty}
                onChange={(e) => { setAlertQty(e.target.value); setError("") }}
                disabled={saving}
              />
            </div>
          </div>

          <div className="stock-field">
            <label className="stock-label" htmlFor="stock-note">{t("stock.note", "Note (optional)")}</label>
            <input
              id="stock-note"
              type="text"
              maxLength={200}
              className="stock-input"
              placeholder={t("stock.notePlaceholder", "e.g. Supplier invoice 1042")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={saving}
            />
          </div>

          {error && <div className="stock-error">{error}</div>}

          <div className="stock-history">
            <div className="stock-history-head"><History size={14} /> {t("stock.history", "Stock history")}</div>
            {historyLoading ? (
              <div className="stock-history-empty"><Spinner size={18} /></div>
            ) : history.length === 0 ? (
              <div className="stock-history-empty">{t("stock.noHistory", "No stock changes yet.")}</div>
            ) : (
              <ul className="stock-history-list">
                {history.map((h) => (
                  <li key={h.id} className="stock-history-row">
                    <div className="stock-history-main">
                      <span className="stock-history-reason">{reasonLabel(h.reason)}</span>
                      <span className="stock-history-meta">{fmtDate(h.created_at)}{h.note ? ` · ${h.note}` : ""}</span>
                    </div>
                    <div className="stock-history-nums">
                      <span className={`stock-history-change ${h.change < 0 ? "neg" : "pos"}`}>{h.change > 0 ? "+" : ""}{formatQty(h.change)}</span>
                      {h.balance_after !== null && h.balance_after !== undefined && (
                        <span className="stock-history-bal">= {formatQty(h.balance_after)}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="stock-modal-foot">
            <button type="button" className="stock-btn stock-btn-ghost" onClick={onClose} disabled={saving}>{t("common.cancel", "Cancel")}</button>
            <button type="submit" className="stock-btn stock-btn-primary" disabled={saving}>
              {saving ? <ButtonLoader text={t("stock.saving", "Saving...")} /> : t("stock.save", "Save stock")}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

/** Small "12 in stock" / "Low: 3" / "Out of stock" pill for an item card */
export function StockBadge({ item, compact = false, onClick }) {
  const { t } = useTranslation()
  const info = stockInfo(item)
  const text = info.level === "none"
    ? t("stock.setStock", "Set stock")
    : info.level === "out"
      ? t("stock.outOfStock", "Out of stock")
      : info.level === "low"
        ? t("stock.lowCount", "Low: {{n}} left", { n: formatQty(info.qty) })
        : compact ? t("stock.countShort", "{{n}} in stock", { n: formatQty(info.qty) }) : t("stock.countShort", "{{n}} in stock", { n: formatQty(info.qty) })
  const Tag = onClick ? "button" : "span"
  return (
    <Tag
      {...(onClick ? { type: "button", onClick } : {})}
      className={`stock-badge stock-badge-${info.level} ${onClick ? "clickable" : ""}`}
      title={onClick ? t("stock.title", "Manage stock") : undefined}
    >
      <Boxes size={12} /> {text}
    </Tag>
  )
}

/** Inventory totals strip; filter = "all" | "low" | "out" | "untracked" */
export function InventorySummary({ items, filter, onFilter, formatMoney }) {
  const { t } = useTranslation()
  const sum = useMemo(() => {
    let tracked = 0, low = 0, out = 0, untracked = 0, value = 0
    for (const it of items || []) {
      const s = stockInfo(it)
      if (!s.tracked) { untracked++; continue }
      tracked++
      if (s.level === "out") out++
      else if (s.level === "low") low++
      value += Math.max(0, s.qty) * Number(it.price ?? it.custom_price ?? 0)
    }
    return { tracked, low, out, untracked, value }
  }, [items])

  const tiles = [
    { key: "all", label: t("stock.tileTracked", "Items in stock list"), value: sum.tracked, tone: "blue" },
    { key: "low", label: t("stock.tileLow", "Low stock"), value: sum.low, tone: "amber" },
    { key: "out", label: t("stock.tileOut", "Out of stock"), value: sum.out, tone: "red" },
    { key: "untracked", label: t("stock.tileUntracked", "Stock not set"), value: sum.untracked, tone: "slate" }
  ]

  return (
    <div className="inv-summary">
      {tiles.map((tile) => (
        <button
          key={tile.key}
          type="button"
          className={`inv-tile inv-tile-${tile.tone} ${filter === tile.key && tile.key !== "all" ? "active" : ""}`}
          onClick={() => onFilter?.(filter === tile.key ? "all" : tile.key)}
        >
          <span className="inv-tile-value">{tile.value}</span>
          <span className="inv-tile-label">{tile.label}</span>
        </button>
      ))}
      <div className="inv-tile inv-tile-value-box">
        <span className="inv-tile-value">{formatMoney ? formatMoney(sum.value) : sum.value}</span>
        <span className="inv-tile-label">{t("stock.tileValue", "Stock value")}</span>
      </div>
    </div>
  )
}

export default StockModal
