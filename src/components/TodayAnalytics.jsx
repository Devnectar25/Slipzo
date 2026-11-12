import { useEffect, useMemo, useRef, useState } from "react"
import { IndianRupee, ReceiptText, Calculator, Package, TrendingUp, TrendingDown, RefreshCw, Clock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { call, money } from "../lib/utils"
import "../styles/TodayAnalytics.css"

const localMidnight = (d = new Date()) => {
  const m = new Date(d)
  m.setHours(0, 0, 0, 0)
  return m
}

const hourLabel = (h) => {
  const suffix = h < 12 ? "am" : "pm"
  const n = h % 12 === 0 ? 12 : h % 12
  return `${n}${suffix}`
}

/**
 * Today's sales on the History page. Everything counts from the shop's local midnight,
 * so the boxes start again from zero every day (older bills stay in the list below).
 */
export function TodayAnalytics({ user }) {
  const { t, i18n } = useTranslation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [failed, setFailed] = useState(false)
  const dayRef = useRef(localMidnight().getTime())

  const load = async ({ manual = false } = {}) => {
    if (manual) setRefreshing(true)
    const from = localMidnight()
    dayRef.current = from.getTime()
    try {
      const res = await call(`/bills/analytics/today?from=${encodeURIComponent(from.toISOString())}`, { noCache: true })
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
    const onBill = () => load()
    window.addEventListener("slipzo_bill_saved", onBill)
    window.addEventListener("slipzo_bill_printed", onBill)
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
      clearInterval(tick)
      clearTimeout(midnight)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

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

  const today = new Date()
  const dateText = today.toLocaleDateString(i18n.language === "en" ? "en-IN" : `${i18n.language}-IN`, { weekday: "short", day: "numeric", month: "short" })

  const sales = Number(data?.total_sales || 0)
  const ySales = Number(data?.yesterday?.total_sales || 0)
  const change = ySales > 0 ? Math.round(((sales - ySales) / ySales) * 100) : null
  const billCount = Number(data?.bill_count || 0)

  if (loading && !data) {
    return (
      <section className="ta-wrap" aria-busy="true">
        <div className="ta-stats">
          {[0, 1, 2, 3].map((i) => <div key={i} className="ta-stat ta-skel" />)}
        </div>
      </section>
    )
  }

  return (
    <section className="ta-wrap" aria-label={t("todayStats.title", "Today's analytics")}>
      <div className="ta-head">
        <div className="ta-head-text">
          <h2 className="ta-title">{t("todayStats.title", "Today's analytics")}</h2>
          <span className="ta-date">{dateText}</span>
          <span className="ta-reset"><Clock size={12} /> {t("todayStats.resets", "Starts again at midnight")}</span>
        </div>
        <button type="button" className={`ta-refresh ${refreshing ? "spinning" : ""}`} onClick={() => load({ manual: true })} aria-label={t("todayStats.refresh", "Refresh")} title={t("todayStats.refresh", "Refresh")}>
          <RefreshCw size={15} />
        </button>
      </div>

      {failed && !data && <div className="ta-error">{t("todayStats.failed", "Could not load today's sales. Tap refresh to try again.")}</div>}

      <div className="ta-stats">
        <div className="ta-stat ta-stat-hero">
          <span className="ta-stat-icon"><IndianRupee size={16} /></span>
          <span className="ta-stat-label">{t("todayStats.sales", "Today's sales")}</span>
          <strong className="ta-stat-value">{money(sales)}</strong>
          <span className="ta-stat-sub">
            {change === null
              ? (ySales === 0 && sales > 0 ? t("todayStats.noYesterday", "No sales yesterday") : t("todayStats.yesterday", "Yesterday {{v}}", { v: money(ySales) }))
              : (
                <span className={`ta-change ${change >= 0 ? "up" : "down"}`}>
                  {change >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {t("todayStats.vsYesterday", "{{p}}% vs yesterday", { p: `${change >= 0 ? "+" : ""}${change}` })}
                </span>
              )}
          </span>
        </div>
        <div className="ta-stat">
          <span className="ta-stat-icon"><ReceiptText size={16} /></span>
          <span className="ta-stat-label">{t("todayStats.bills", "Bills")}</span>
          <strong className="ta-stat-value">{billCount}</strong>
          <span className="ta-stat-sub">
            {t("todayStats.printedSaved", "{{p}} printed · {{s}} saved", { p: data?.printed?.count || 0, s: data?.saved?.count || 0 })}
          </span>
        </div>
        <div className="ta-stat">
          <span className="ta-stat-icon"><Calculator size={16} /></span>
          <span className="ta-stat-label">{t("todayStats.avgBill", "Average bill")}</span>
          <strong className="ta-stat-value">{money(data?.avg_bill || 0)}</strong>
          <span className="ta-stat-sub">
            {Number(data?.discount_total || 0) > 0
              ? t("todayStats.discounts", "{{v}} discount given", { v: money(data.discount_total) })
              : t("todayStats.perBill", "per bill today")}
          </span>
        </div>
        <div className="ta-stat">
          <span className="ta-stat-icon"><Package size={16} /></span>
          <span className="ta-stat-label">{t("todayStats.itemsSold", "Items sold")}</span>
          <strong className="ta-stat-value">{Number(data?.items_sold || 0)}</strong>
          <span className="ta-stat-sub">
            {bestHour && bestHour.total > 0
              ? t("todayStats.busiest", "Busiest at {{h}}", { h: hourLabel(bestHour.h) })
              : t("todayStats.noSalesYet", "No sales yet")}
          </span>
        </div>
      </div>
    </section>
  )
}

export default TodayAnalytics
