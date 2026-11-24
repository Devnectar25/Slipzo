import { useEffect, useMemo, useRef, useState } from "react"
import { IndianRupee, ReceiptText, Calculator, Package, TrendingUp, TrendingDown, RefreshCw, Clock, BarChart3, Trophy, Hourglass, Printer, Utensils, Boxes, ChevronRight, Plus, Sun, LineChart, History, Landmark } from "lucide-react"
import { useTranslation } from "react-i18next"
import { call, money, saneAmount, getActivePlanDetails, getCurrentUserKey, getCachedData, getStoredMenuItems } from "../lib/utils"
import "../styles/TodayAnalytics.css"
import { localMidnight, fetchTodayAnalytics, takePrefetchedAnalytics, readSavedAnalytics } from "../lib/todayAnalytics"
import { shopUsesGst } from "../lib/gst"


const hourLabel = (h) => {
  const suffix = h < 12 ? "am" : "pm"
  const n = h % 12 === 0 ? 12 : h % 12
  return `${n}${suffix}`
}

/**
 * Hour labels under the bars. The real width of the chart and of a label (which follows the phone's text size) are
 * measured, and only as many hours are labelled as fit: every hour, every 2nd, 3rd, 4th or 6th. Each label is centred
 * under its bar and kept inside the chart.
 */
function HourAxis({ hours }) {
  const axisRef = useRef(null)
  const sampleRef = useRef(null)
  const [size, setSize] = useState({ width: 0, gap: 0, label: 0 })

  useEffect(() => {
    const axis = axisRef.current
    if (!axis) return undefined
    const measure = () => {
      const next = {
        width: axis.clientWidth,
        gap: parseFloat(getComputedStyle(axis).columnGap) || 0,
        label: Math.ceil(sampleRef.current?.getBoundingClientRect().width || 32)
      }
      setSize((prev) => (prev.width === next.width && prev.gap === next.gap && prev.label === next.label ? prev : next))
    }
    measure()
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure)
      return () => window.removeEventListener("resize", measure)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(axis)
    if (sampleRef.current) observer.observe(sampleRef.current)
    return () => observer.disconnect()
  }, [])

  const { width, gap, label } = size
  const pitch = hours.length ? (width + gap) / hours.length : 0 // from one bar to the next
  const half = label / 2
  const shift = Math.max(0, half - (pitch - gap) / 2) // how far the end labels are moved in to stay inside the chart
  const every = [1, 2, 3, 4, 6].find((n) => n * pitch - shift >= label + 8) || 8

  return (
    <div className="ta-xaxis" ref={axisRef} aria-hidden="true">
      <span className="ta-xaxis-sample" ref={sampleRef}>12pm</span>
      {width > 0 && hours.map((h, i) => {
        if (i % every !== 0) return null
        const centre = i * pitch + (pitch - gap) / 2
        return <span key={h.h} style={{ left: Math.max(half, Math.min(width - half, centre)) }}>{hourLabel(h.h)}</span>
      })}
    </div>
  )
}

/**
 * Today's sales. Everything counts from the shop's local midnight, so the numbers start again from zero every day.
 *
 * variant="compact" (History page): the four headline boxes.
 * variant="full" (Home page): the boxes plus sales by hour, "today at a glance" and top items.
 * isRestaurant: also show how many tables are open. onNavigate(view): rows in "at a glance" open the matching page.
 */
export function TodayAnalytics({ user, variant = "compact", isRestaurant = false, onNavigate }) {
  const { t, i18n } = useTranslation()
  const full = variant === "full"
  const [data, setData] = useState(() => readSavedAnalytics())
  const [loading, setLoading] = useState(() => !data)
  const [refreshing, setRefreshing] = useState(false)
  const [failed, setFailed] = useState(false)
  const [hoverHour, setHoverHour] = useState(null)
  const [plan, setPlan] = useState(() => getActivePlanDetails(getCurrentUserKey(user)))
  const [tables, setTables] = useState(null)
  const [menuItems, setMenuItems] = useState(() => {
    const stored = getStoredMenuItems(user)
    if (Array.isArray(stored) && stored.length > 0) return stored
    const cached = getCachedData("/menu")
    return Array.isArray(cached) ? cached : null
  })
  const dayRef = useRef(localMidnight().getTime())

  const load = async ({ manual = false, fresh = false } = {}) => {
    if (manual) setRefreshing(true)
    const from = localMidnight()
    dayRef.current = from.getTime()
    try {
      // the first load after sign in reuses the request sign in already started (no second wait)
      const early = manual || fresh ? null : takePrefetchedAnalytics()
      const res = (early && await early) || await fetchTodayAnalytics({ noCache: manual || fresh })
      if (full && isRestaurant) {
        call("/restaurant/tables", manual ? { noCache: true } : {})
          .then((list) => { if (Array.isArray(list)) setTables(list) })
          .catch(() => { })
      }
      if (full) {
        call("/menu", { noCache: true })
          .then((list) => { if (Array.isArray(list)) setMenuItems(list) })
          .catch(() => { })
      }
      if (res && typeof res === "object") {
        setData(res)
        setFailed(false)
      }
    } catch (_) {
      setFailed(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!user) return undefined
    load()
    // a new bill: always fetch fresh, so the start card turns into the analytics right away
    const onBill = () => load({ fresh: true })
    const onQuota = () => setPlan(getActivePlanDetails(getCurrentUserKey(user)))
    const onStockOrMenu = (e) => {
      if (Array.isArray(e?.detail?.items) && e.detail.items.length > 0) {
        setMenuItems(e.detail.items)
      } else if (e?.detail?.id !== undefined) {
        setMenuItems((prev) => {
          if (!Array.isArray(prev)) return prev
          return prev.map((it) => (it.id === e.detail.id ? { ...it, ...e.detail } : it))
        })
      } else {
        const stored = getStoredMenuItems(user)
        if (Array.isArray(stored) && stored.length > 0) {
          setMenuItems(stored)
        } else {
          call("/menu", { noCache: true }).then((list) => {
            if (Array.isArray(list)) setMenuItems(list)
          }).catch(() => { })
        }
      }
    }
    window.addEventListener("slipzo_bill_saved", onBill)
    window.addEventListener("slipzo_bill_printed", onBill)
    window.addEventListener("slipzo-quota-update", onQuota)
    window.addEventListener("storage", onQuota)
    window.addEventListener("slipzo-menu-update", onStockOrMenu)
    window.addEventListener("slipzo-stock-updated", onStockOrMenu)
    // every minute: new bills from other devices, and a fresh day after midnight
    const tick = setInterval(() => {
      if (document.visibilityState !== "visible") return
      load()
    }, 60000)
    // exactly at midnight the day starts again
    const next = localMidnight(new Date(Date.now() + 24 * 60 * 60 * 1000)).getTime() - Date.now()
    const midnight = setTimeout(() => load(), next + 1000)
    return () => {
      window.removeEventListener("slipzo_bill_saved", onBill)
      window.removeEventListener("slipzo_bill_printed", onBill)
      window.removeEventListener("slipzo-quota-update", onQuota)
      window.removeEventListener("storage", onQuota)
      window.removeEventListener("slipzo-menu-update", onStockOrMenu)
      window.removeEventListener("slipzo-stock-updated", onStockOrMenu)
      clearInterval(tick)
      clearTimeout(midnight)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Home only: no bill yet today → a "start your day" card instead of a page of zeros.
  // The analytics appear as soon as today's first bill is saved.
  const noBillsYet = full && Boolean(data) && Number(data?.bill_count || 0) === 0 && !(data?.bills || []).length

  // sales per local hour, from the first sale (or 8am) to now
  const hours = useMemo(() => {
    const buckets = new Array(24).fill(null).map((_, h) => ({ h, total: 0, count: 0 }))
    for (const b of data?.bills || []) {
      const d = new Date(b.created_at)
      if (Number.isNaN(d.getTime())) continue
      const bucket = buckets[d.getHours()]
      bucket.total += Number(b.total || 0)
      bucket.count += 1
    }
    const used = buckets.filter((b) => b.count > 0).map((b) => b.h)
    const nowH = new Date().getHours()
    const start = Math.min(8, ...(used.length ? used : [8]))
    const end = Math.max(Math.min(23, Math.max(nowH, start + 5)), ...(used.length ? used : [0]))
    return buckets.slice(start, end + 1)
  }, [data])
  const bestHour = hours.reduce((best, h) => (h.total > (best?.total || 0) ? h : best), null)
  const maxHour = Math.max(0, ...hours.map((h) => h.total))

  const today = new Date()
  const dateText = today.toLocaleDateString(i18n.language === "en" ? "en-IN" : `${i18n.language}-IN`, { weekday: "short", day: "numeric", month: "short" })

  const sales = Number(data?.total_sales || 0)
  const ySales = Number(data?.yesterday?.total_sales || 0)
  const yBills = Number(data?.yesterday?.bill_count || 0)
  const change = ySales > 0 ? Math.round(((sales - ySales) / ySales) * 100) : null
  const billCount = Number(data?.bill_count || 0)
  const topItems = Array.isArray(data?.top_items) ? data.top_items : []
  const topMax = Math.max(0, ...topItems.map((it) => Number(it.amount || 0)))
  const billsText = (n) => (n === 1 ? t("todayStats.billOne", "1 bill") : t("todayStats.billsN", "{{n}} bills", { n }))

  // ---- "Today at a glance": what needs attention
  const savedCount = Number(data?.saved?.count || 0)
  const printedCount = Number(data?.printed?.count || 0)
  const creditsLeft = Number(plan?.printsRemaining || 0)
  const creditsTotal = Number(plan?.totalPrints || 0)
  const creditsLow = creditsLeft <= Math.max(10, Math.round(creditsTotal * 0.1))
  const openTables = Array.isArray(tables)
    ? tables.filter((tb) => String(tb.status).toUpperCase() === "OCCUPIED" || (Array.isArray(tb.current_items) && tb.current_items.length > 0))
    : null
  const openTablesTotal = (openTables || []).reduce((sum, tb) => sum + saneAmount(tb.total_amount), 0)
  const lastBillAt = (data?.bills || []).reduce((latest, b) => {
    const ms = new Date(b.created_at).getTime()
    return Number.isFinite(ms) && ms > latest ? ms : latest
  }, 0)
  const lastBillText = (() => {
    if (!lastBillAt) return t("todayStats.noBillYet", "No bill yet")
    const mins = Math.max(0, Math.round((Date.now() - lastBillAt) / 60000))
    if (mins < 1) return t("todayStats.justNow", "Just now")
    if (mins < 60) return t("todayStats.minsAgo", "{{n}} min ago", { n: mins })
    return new Date(lastBillAt).toLocaleTimeString(i18n.language === "en" ? "en-IN" : `${i18n.language}-IN`, { hour: "numeric", minute: "2-digit" })
  })()

  // stock: items that track stock and are at or below their alert level
  const trackedItems = Array.isArray(menuItems)
    ? menuItems.filter((it) => (it?.track_stock === true || it?.track_stock === 1 || it?.track_stock === "1") && it?.stock_qty !== null && it?.stock_qty !== undefined)
    : []
  const stockTracked = trackedItems.length
  const lowStock = trackedItems
    .filter((it) => Number(it.stock_qty) <= Number(it.low_stock_alert ?? 5))
    .sort((a, b) => Number(a.stock_qty) - Number(b.stock_qty))
  const outOfStock = lowStock.filter((it) => Number(it.stock_qty) <= 0).length

  // GST collected in today's bills (what the shop owes for the day). Always shown; with GST off in the shop
  // profile it says so and opens the profile.
  const gstToday = data?.gst || null
  const gstTotal = Number(gstToday?.total || 0)
  const gstOn = shopUsesGst(getCachedData("/shop")) || gstTotal > 0
  const gstRatesText = (gstToday?.by_rate || []).map((g) => `${g.rate}%`).join(", ")

  const glance = [
    {
      key: "waiting",
      icon: Hourglass,
      label: t("todayStats.waitingToPrint", "Waiting to print"),
      value: billsText(savedCount),
      sub: savedCount > 0 ? money(data?.saved?.total || 0) : t("todayStats.allPrinted", "All printed"),
      tone: savedCount > 0 ? "warn" : "ok",
      view: "history"
    },
    isRestaurant && openTables && {
      key: "tables",
      icon: Utensils,
      label: t("todayStats.openTables", "Open tables"),
      value: t("todayStats.tablesOf", "{{n}} of {{total}}", { n: openTables.length, total: tables.length }),
      sub: openTables.length > 0 ? money(openTablesTotal) : t("todayStats.allFree", "All free"),
      view: "tables"
    },
    {
      key: "printed",
      icon: ReceiptText,
      label: t("todayStats.printedBills", "Printed bills"),
      value: billsText(printedCount),
      sub: money(data?.printed?.total || 0)
    },
    {
      key: "gst",
      icon: Landmark,
      label: t("todayStats.gstToPay", "GST to pay today"),
      value: money(gstTotal),
      sub: gstTotal > 0
        ? t("todayStats.gstSplit", "CGST {{c}} · SGST {{s}}", { c: money(gstToday.cgst || 0), s: money(gstToday.sgst || 0) }) + (gstRatesText ? ` · ${gstRatesText}` : "")
        : (gstOn ? t("todayStats.gstNone", "No GST in today's bills") : t("todayStats.gstOff", "Turn on GST in Shop profile")),
      view: gstOn ? undefined : "shop",
      title: gstTotal > 0
        ? t("todayStats.gstTitle", "On taxable sales of {{v}}. Add up each day for your GST return.", { v: money(gstToday.taxable || 0) })
        : undefined,
      tone: null
    },
    {
      key: "credits",
      icon: Printer,
      label: t("todayStats.creditsLeft", "Print credits left"),
      value: String(creditsLeft),
      sub: creditsLow ? t("todayStats.creditsLow", "Running low · buy more") : t("todayStats.creditsOk", "Enough for now"),
      tone: creditsLow ? "warn" : null,
      view: "pricing"
    },
    // restaurants do not track stock (and have "Open tables" instead)
    !isRestaurant && {
      key: "stock",
      icon: Boxes,
      label: t("todayStats.lowStock", "Low stock"),
      value: stockTracked === 0
        ? t("todayStats.stockOff", "Not tracked")
        : (lowStock.length === 0 ? t("todayStats.allStocked", "All stocked") : t("todayStats.itemsN", "{{n}} items", { n: lowStock.length })),
      sub: stockTracked === 0
        ? t("todayStats.stockSetup", "Set up stock in Menu")
        : (outOfStock > 0
          ? t("todayStats.outOfStock", "{{n}} out of stock", { n: outOfStock })
          : (lowStock.length > 0 ? lowStock.slice(0, 2).map((it) => it.name).join(", ") : t("todayStats.stockOk", "Nothing running low"))),
      tone: stockTracked === 0 ? null : (lowStock.length > 0 ? "warn" : "ok"),
      view: "menu"
    },
    {
      key: "last",
      icon: Clock,
      label: t("todayStats.lastBill", "Last bill"),
      value: lastBillText
    }
  ]
    .filter(Boolean)
    // before the first bill, "0 bills / No bill yet" tiles add nothing; keep credits, stock and tables
    .filter((row) => !noBillsYet || !["waiting", "printed", "last"].includes(row.key))

  if (loading && !data) {
    if (!full) {
      return (
        <section className="ta-wrap" aria-busy="true">
          <div className="ta-stats">
            {[0, 1, 2, 3].map((i) => <div key={i} className="ta-stat ta-skel" />)}
          </div>
        </section>
      )
    }
    return (
      <section className="ta-full" aria-busy="true">
        <div className="ta-kpis">
          {[0, 1, 2, 3].map((i) => <div key={i} className={`ta-kpi ta-skel ${i === 0 ? "ta-kpi-hero" : ""}`} />)}
        </div>
        <div className="ta-grid">
          <div className="ta-card ta-skel" style={{ minHeight: 320 }} />
          <div className="ta-card ta-skel" style={{ minHeight: 320 }} />
        </div>
      </section>
    )
  }

  const hovered = hoverHour !== null ? hours.find((h) => h.h === hoverHour) : null

  const refreshButton = (
    <button type="button" className={`ta-refresh ${refreshing ? "spinning" : ""}`} onClick={() => load({ manual: true })} aria-label={t("todayStats.refresh", "Refresh")} title={t("todayStats.refresh", "Refresh")}>
      <RefreshCw size={15} />
    </button>
  )
  const errorBox = failed && !data
    ? <div className="ta-error">{t("todayStats.failed", "Could not load today's sales. Tap refresh to try again.")}</div>
    : null
  // compared with yesterday only when yesterday had sales; otherwise nothing is shown
  const changeLine = change === null
    ? null
    : (
      <span className={`ta-change ${change >= 0 ? "up" : "down"}`}>
        {change >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
        {t("todayStats.vsYesterday", "{{p}}% vs yesterday", { p: `${change >= 0 ? "+" : ""}${change}` })}
      </span>
    )
  const printedSavedText = t("todayStats.printedSaved", "{{p}} printed · {{s}} saved", { p: data?.printed?.count || 0, s: data?.saved?.count || 0 })
  const avgSubText = Number(data?.discount_total || 0) > 0
    ? t("todayStats.discounts", "{{v}} discount given", { v: money(data.discount_total) })
    : t("todayStats.perBill", "per bill today")
  const itemsSubText = bestHour && bestHour.total > 0
    ? t("todayStats.busiest", "Busiest at {{h}}", { h: hourLabel(bestHour.h) })
    : t("todayStats.noSalesYet", "No sales yet")

  // ---------------- History page: the four boxes ----------------
  if (!full) {
    return (
      <section className="ta-wrap" aria-label={t("todayStats.title", "Today's analytics")}>
        <div className="ta-head">
          <div className="ta-head-text">
            <h2 className="ta-title">{t("todayStats.title", "Today's analytics")}</h2>
            <span className="ta-date">{dateText}</span>
            <span className="ta-reset"><Clock size={12} /> {t("todayStats.resets", "Starts again at midnight")}</span>
          </div>
          {refreshButton}
        </div>
        {errorBox}
        <div className="ta-stats">
          <div className="ta-stat ta-stat-hero">
            <span className="ta-stat-icon"><IndianRupee size={16} /></span>
            <span className="ta-stat-label">{t("todayStats.sales", "Today's sales")}</span>
            <strong className="ta-stat-value">{money(sales)}</strong>
            {changeLine && <span className="ta-stat-sub">{changeLine}</span>}
          </div>
          <div className="ta-stat">
            <span className="ta-stat-icon"><ReceiptText size={16} /></span>
            <span className="ta-stat-label">{t("todayStats.bills", "Bills")}</span>
            <strong className="ta-stat-value">{billCount}</strong>
            <span className="ta-stat-sub">{printedSavedText}</span>
          </div>
          <div className="ta-stat">
            <span className="ta-stat-icon"><Calculator size={16} /></span>
            <span className="ta-stat-label">{t("todayStats.avgBill", "Average bill")}</span>
            <strong className="ta-stat-value">{money(data?.avg_bill || 0)}</strong>
            <span className="ta-stat-sub">{avgSubText}</span>
          </div>
          <div className="ta-stat">
            <span className="ta-stat-icon"><Package size={16} /></span>
            <span className="ta-stat-label">{t("todayStats.itemsSold", "Items sold")}</span>
            <strong className="ta-stat-value">{Number(data?.items_sold || 0)}</strong>
            <span className="ta-stat-sub">{itemsSubText}</span>
          </div>
        </div>
      </section>
    )
  }

  // ---------------- Home page: the full dashboard ----------------
  // a round scale for the chart (₹0, half, top) so the bars can be read, not just compared
  const niceMax = (() => {
    if (maxHour <= 0) return 0
    const pow = Math.pow(10, Math.floor(Math.log10(maxHour)))
    const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= maxHour) || 10
    return step * pow
  })()
  const shortMoney = (n) => {
    const v = Number(n || 0)
    if (v >= 100000) return `₹${(v / 100000).toFixed(v >= 1000000 ? 0 : 1).replace(/\.0$/, "")}L`
    if (v >= 1000) return `₹${(v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`
    return `₹${Math.round(v)}`
  }

  // how today's sales built up, hour by hour, for the line inside the sales card (up to the current hour)
  const nowH = new Date().getHours()
  const spark = (() => {
    const upto = hours.filter((h) => h.h <= nowH)
    if (sales <= 0 || upto.length < 2) return null
    let cum = 0
    const pts = upto.map((h, i) => {
      cum += h.total
      return [(i / (upto.length - 1)) * 100, 38 - (cum / sales) * 34]
    })
    const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ")
    return { line, area: `${line} L100,40 L0,40 Z` }
  })()

  const topTotal = topItems.reduce((s, it) => s + Number(it.amount || 0), 0)

  return (
    <section className="ta-full" aria-label={t("todayStats.title", "Today's analytics")}>
      <div className="ta-head">
        <div className="ta-head-text">
          <h2 className="ta-title">{t("todayStats.title", "Today's analytics")}</h2>
          <span className="ta-date">{dateText}</span>
          <span className="ta-reset"><Clock size={12} /> {t("todayStats.resets", "Starts again at midnight")}</span>
        </div>
        {refreshButton}
      </div>
      {errorBox}

      {/* before today's first bill: a start card in place of the analytics */}
      {noBillsYet && (
        <div className="ta-start">
          <div className="ta-start-main">
            <span className="ta-start-icon"><Sun size={24} /></span>
            <h3 className="ta-start-title">{t("todayStats.startTitle", "Ready for a new day")}</h3>
            <p className="ta-start-sub">
              {t("todayStats.startSub", "No bills yet today. Make your first bill and today's sales, bills and best sellers will show up here, live.")}
            </p>
            {onNavigate && (
              <button type="button" className="ta-start-cta" onClick={() => onNavigate(isRestaurant ? "tables" : "bills")}>
                {isRestaurant ? <Utensils size={17} /> : <Plus size={17} />}
                <span>{isRestaurant ? t("todayStats.previewCtaTables", "Open tables") : t("todayStats.previewCta", "Create first bill")}</span>
              </button>
            )}
          </div>
          <div className="ta-start-side">
            {yBills > 0 ? (
              <div className="ta-start-yday">
                <span className="ta-start-side-label"><History size={14} /> {t("todayStats.yesterdayTitle", "Yesterday")}</span>
                <strong className="ta-start-yday-value">{money(ySales)}</strong>
                <span className="ta-start-yday-meta">
                  {billsText(yBills)} · {t("todayStats.avgShort", "avg {{v}}", { v: money(data?.yesterday?.avg_bill || 0) })}
                </span>
                <span className="ta-start-yday-goal">{t("todayStats.beatYesterday", "Let's beat it today")}</span>
              </div>
            ) : null}
            <div className="ta-start-list">
              <span className="ta-start-side-label">{t("todayStats.startListTitle", "After your first bill you will see")}</span>
              <ul>
                <li><span><IndianRupee size={15} /></span>{t("todayStats.startList1", "Today's sales, bill count and average bill")}</li>
                <li><span><LineChart size={15} /></span>{t("todayStats.startList2", "Hour-by-hour sales chart & peak business time")}</li>
                <li><span><Trophy size={15} /></span>{t("todayStats.startList3", "Your best-selling items")}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 1. headline numbers: sales leads, the rest support it */}
      {!noBillsYet && (
      <div className="ta-kpis">
        <div className="ta-kpi ta-kpi-hero">
          <div className="ta-kpi-top">
            <span className="ta-kpi-icon"><IndianRupee size={18} /></span>
            <span className="ta-kpi-label">{t("todayStats.sales", "Today's sales")}</span>
          </div>
          <strong className="ta-kpi-value">{money(sales)}</strong>
          {changeLine && <span className="ta-kpi-sub">{changeLine}</span>}
          {spark && (
            <svg className="ta-spark" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
              <path d={spark.area} className="ta-spark-area" />
              <path d={spark.line} className="ta-spark-line" vectorEffect="non-scaling-stroke" />
            </svg>
          )}
        </div>
        <div className="ta-kpi tint-indigo">
          <div className="ta-kpi-top">
            <span className="ta-kpi-icon"><ReceiptText size={18} /></span>
            <span className="ta-kpi-label">{t("todayStats.bills", "Bills")}</span>
          </div>
          <strong className="ta-kpi-value">{billCount}</strong>
          <span className="ta-kpi-sub">{printedSavedText}</span>
        </div>
        <div className="ta-kpi tint-teal">
          <div className="ta-kpi-top">
            <span className="ta-kpi-icon"><Calculator size={18} /></span>
            <span className="ta-kpi-label">{t("todayStats.avgBill", "Average bill")}</span>
          </div>
          <strong className="ta-kpi-value">{money(data?.avg_bill || 0)}</strong>
          <span className="ta-kpi-sub">{avgSubText}</span>
        </div>
        <div className="ta-kpi tint-amber">
          <div className="ta-kpi-top">
            <span className="ta-kpi-icon"><Package size={18} /></span>
            <span className="ta-kpi-label">{t("todayStats.itemsSold", "Items sold")}</span>
          </div>
          <strong className="ta-kpi-value">{Number(data?.items_sold || 0)}</strong>
          <span className="ta-kpi-sub">{itemsSubText}</span>
        </div>
      </div>
      )}

      {/* 2. today at a glance: what needs attention, as one row of tiles */}
      <div className="ta-glance" role="list" aria-label={t("todayStats.glance", "Today at a glance")}>
        {glance.map((row) => {
          const Icon = row.icon
          const clickable = Boolean(row.view && onNavigate)
          const body = (
            <>
              <span className={`ta-glance-icon ${row.tone ? `tone-${row.tone}` : ""}`}><Icon size={16} /></span>
              <span className="ta-glance-text">
                <span className="ta-glance-label">{row.label}</span>
                <span className="ta-glance-value">{row.value}</span>
                {row.sub && <span className={`ta-glance-sub ${row.tone === "warn" ? "warn" : ""}`}>{row.sub}</span>}
              </span>
              {clickable && <ChevronRight size={15} className="ta-glance-go" aria-hidden="true" />}
            </>
          )
          return clickable ? (
            <button key={row.key} type="button" role="listitem" className="ta-glance-tile clickable" title={row.title} onClick={() => onNavigate(row.view)}>{body}</button>
          ) : (
            <div key={row.key} role="listitem" className="ta-glance-tile" title={row.title}>{body}</div>
          )
        })}
      </div>

      {/* 3. sales by hour + top items */}
      {!noBillsYet && (
      <div className="ta-grid">
        <div className="ta-card ta-card-chart">
          <div className="ta-card-head">
            <div>
              <h3 className="ta-card-title"><BarChart3 size={16} /> {t("todayStats.byHour", "Sales by hour")}</h3>
              <p className="ta-card-sub">
                {bestHour && bestHour.total > 0
                  ? <>{t("todayStats.bestHour", "Best hour")} <strong>{hourLabel(bestHour.h)}</strong> · {money(bestHour.total)}</>
                  : t("todayStats.noSalesYet", "No sales yet")}
              </p>
            </div>
            <span className="ta-card-total">{money(sales)}</span>
          </div>

          {maxHour > 0 ? (
            <div className="ta-hchart" onMouseLeave={() => setHoverHour(null)}>
              <div className="ta-yaxis" aria-hidden="true">
                <span>{shortMoney(niceMax)}</span>
                <span>{shortMoney(niceMax / 2)}</span>
                <span>₹0</span>
              </div>
              <div className="ta-plot">
                <div className="ta-gridlines" aria-hidden="true"><i /><i /><i /></div>
                <div className="ta-cols" role="img" aria-label={t("todayStats.byHour", "Sales by hour")}>
                  {hours.map((h, i) => {
                    // the amount and the details box of the outer bars open inwards, so they stay inside the chart
                    const edge = (i + 0.5) / hours.length < 0.12 ? "edge-left" : (i + 0.5) / hours.length > 0.88 ? "edge-right" : ""
                    const pct = h.total > 0 ? Math.max(2, (h.total / niceMax) * 100) : 0
                    const isBest = bestHour && h.h === bestHour.h && h.total > 0
                    const isHover = hoverHour === h.h
                    return (
                      <div
                        key={h.h}
                        className={`ta-col ${isHover ? "hover" : ""} ${isBest ? "best" : ""} ${edge}`}
                        onMouseEnter={() => setHoverHour(h.h)}
                        onClick={() => setHoverHour(isHover ? null : h.h)}
                      >
                        <div className="ta-col-track">
                          {h.total > 0 && (
                            <div className="ta-col-bar" style={{ height: `${pct}%` }}>
                              {(isBest && !hovered) && <span className="ta-col-label">{shortMoney(h.total)}</span>}
                            </div>
                          )}
                        </div>
                        {isHover && h.count > 0 && (
                          <div className="ta-tip" role="tooltip">
                            <strong>{hourLabel(h.h)}</strong>
                            <span>{money(h.total)}</span>
                            <em>{billsText(h.count)}</em>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <HourAxis hours={hours} />
              </div>
            </div>
          ) : (
            <div className="ta-empty">{t("todayStats.emptyChart", "Bills you make today will show up here, hour by hour.")}</div>
          )}
        </div>

        <div className="ta-card">
          <div className="ta-card-head">
            <div>
              <h3 className="ta-card-title"><Trophy size={16} /> {t("todayStats.topItems", "Top items")}</h3>
              <p className="ta-card-sub">{t("todayStats.topItemsSub", "Best sellers by amount")}</p>
            </div>
          </div>
          {topItems.length > 0 ? (
            <ol className="ta-rank">
              {topItems.map((it, i) => {
                const amt = Number(it.amount || 0)
                const share = topTotal > 0 ? Math.round((amt / topTotal) * 100) : 0
                return (
                  <li key={`${it.name}-${i}`} className={`ta-rank-row ${i === 0 ? "first" : ""}`}>
                    <span className="ta-rank-no">{i + 1}</span>
                    <div className="ta-rank-main">
                      <div className="ta-rank-line">
                        <span className="ta-rank-name" title={it.name}>{it.name}</span>
                        <span className="ta-rank-amt">{money(amt)}</span>
                      </div>
                      <div className="ta-rank-bar"><i style={{ width: `${topMax > 0 ? Math.max(3, (amt / topMax) * 100) : 0}%` }} /></div>
                      <div className="ta-rank-meta">
                        <span>{t("todayStats.qtySold", "{{n}} sold", { n: Number(it.qty || 0) })}</span>
                        <span>{share}%</span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          ) : (
            <div className="ta-empty">{t("todayStats.emptyTopItems", "Your best-selling items today will show here.")}</div>
          )}
        </div>
      </div>
      )}
    </section>
  )
}

export default TodayAnalytics
