import { useEffect, useMemo, useRef, useState } from "react"
import { TrendingUp, TrendingDown, IndianRupee, UserPlus, Receipt, Store, Percent, Wallet, Gift, BarChart3 } from "lucide-react"
import { call } from "../../lib/utils"
import "../../styles/AdminAnalytics.css"

const PERIODS = [
  { days: 7, label: "7D" },
  { days: 30, label: "30D" },
  { days: 90, label: "90D" },
  { days: 365, label: "12M" }
]
const METRICS = [
  { key: "revenue", label: "Plan revenue", money: true, color: "#0284c7" },
  { key: "newUsers", label: "New users", color: "#7c3aed" },
  { key: "bills", label: "Bills generated", color: "#0d9488" },
  { key: "billValue", label: "Bill value", money: true, color: "#ea580c" }
]
const SLICE_COLORS = ["#0284c7", "#7c3aed", "#0d9488", "#ea580c", "#db2777", "#64748b"]

const inr = (n) => "₹" + Math.round(n || 0).toLocaleString("en-IN")
const short = (n, money) => {
  const v = Math.round(n || 0)
  const s = v >= 10000000 ? (v / 10000000).toFixed(1).replace(/\.0$/, "") + "Cr"
    : v >= 100000 ? (v / 100000).toFixed(1).replace(/\.0$/, "") + "L"
      : v >= 1000 ? (v / 1000).toFixed(1).replace(/\.0$/, "") + "K" : String(v)
  return (money ? "₹" : "") + s
}
const fmtVal = (n, money) => (money ? inr(n) : Math.round(n || 0).toLocaleString("en-IN"))
const bucketLabel = (date, bucket, long) => {
  const d = new Date(bucket === "month" ? date + "-01T00:00:00" : date + "T00:00:00")
  if (bucket === "month") return d.toLocaleDateString("en-IN", { month: "short", ...(long ? { year: "numeric" } : {}) })
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(long ? { weekday: "short" } : {}) })
}
const change = (now, before) => {
  if (!before) return now ? null : 0 // nothing to compare with
  return Math.round(((now - before) / before) * 100)
}
const headers = () => {
  const token = localStorage.getItem("slipzo_admin_token") || localStorage.getItem("slipzo_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** A rounded scale top: 0–1–2–5 steps so the grid lines land on readable numbers */
function niceMax(v) {
  if (v <= 0) return 4
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  const f = v / p
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p
}

function Sparkline({ values, color }) {
  if (!values || values.length === 0) return null
  const max = Math.max(...values, 1)
  const w = 100, h = 28
  const pts = values.map((v, i) => [values.length > 1 ? (i / (values.length - 1)) * w : w / 2, h - 2 - (v / max) * (h - 4)])
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("")
  return (
    <svg className="aa-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={`${line}L${w},${h}L0,${h}Z`} fill={color} opacity="0.12" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  )
}

function Kpi({ icon: Icon, label, value, delta, hint, color, spark }) {
  return (
    <div className="aa-kpi">
      <div className="aa-kpi-top">
        <span className="aa-kpi-icon" style={{ color, background: color + "14" }}><Icon size={17} /></span>
        <span className="aa-kpi-label">{label}</span>
      </div>
      <div className="aa-kpi-value">{value}</div>
      <div className="aa-kpi-foot">
        {delta === null || delta === undefined
          ? <span className="aa-delta flat">{hint || "New this period"}</span>
          : <span className={`aa-delta ${delta > 0 ? "up" : delta < 0 ? "down" : "flat"}`}>
            {delta > 0 ? <TrendingUp size={13} /> : delta < 0 ? <TrendingDown size={13} /> : null}
            {delta > 0 ? "+" : ""}{delta}% <em>vs previous</em>
          </span>}
      </div>
      {spark && <Sparkline values={spark} color={color} />}
    </div>
  )
}

/** The main trend chart: area + line, grid, axis labels and a hover readout */
function TrendChart({ series, bucket, metric }) {
  const wrap = useRef(null)
  const [width, setWidth] = useState(800)
  const [hover, setHover] = useState(null)
  useEffect(() => {
    if (!wrap.current) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.round(e.contentRect.width))))
    ro.observe(wrap.current)
    return () => ro.disconnect()
  }, [])
  const h = 260, padL = 52, padR = 16, padT = 16, padB = 30
  const values = series.map((s) => s[metric.key])
  const top = niceMax(Math.max(...values, 0))
  const n = series.length
  const x = (i) => padL + (n > 1 ? (i / (n - 1)) * (width - padL - padR) : (width - padL - padR) / 2)
  const y = (v) => padT + (1 - v / top) * (h - padT - padB)
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("")
  const area = `${line}L${x(n - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * top)
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((width - padL) / 70))))
  const gid = `aa-grad-${metric.key}`

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - r.left
    const i = n > 1 ? Math.round(((px - padL) / (width - padL - padR)) * (n - 1)) : 0
    setHover(Math.max(0, Math.min(n - 1, i)))
  }
  const hv = hover !== null ? series[hover] : null

  return (
    <div className="aa-trend" ref={wrap}>
      <svg width={width} height={h} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label={`${metric.label} over time`}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={metric.color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={metric.color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} className="aa-grid" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" className="aa-axis">{short(t, metric.money)}</text>
          </g>
        ))}
        {series.map((s, i) => (i % labelEvery === 0 || i === n - 1) && (i === n - 1 || n - 1 - i >= labelEvery) ? (
          <text key={s.date} x={x(i)} y={h - 8} textAnchor={i === n - 1 ? "end" : i === 0 ? "start" : "middle"} className="aa-axis">{bucketLabel(s.date, bucket)}</text>
        ) : null)}
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={metric.color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        {hv && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={h - padB} stroke={metric.color} strokeDasharray="3 3" opacity="0.6" />
            <circle cx={x(hover)} cy={y(values[hover])} r="5" fill="#fff" stroke={metric.color} strokeWidth="2.5" />
          </g>
        )}
      </svg>
      {hv && (
        <div className="aa-tip" style={{ left: Math.min(Math.max(x(hover), 90), width - 90) }}>
          <b>{bucketLabel(hv.date, bucket, true)}</b>
          <span><i style={{ background: metric.color }} />{metric.label}: <strong>{fmtVal(hv[metric.key], metric.money)}</strong></span>
          {metric.key === "revenue" && <span className="aa-tip-sub">{hv.purchases} plan purchase{hv.purchases === 1 ? "" : "s"}</span>}
          {metric.key === "bills" && <span className="aa-tip-sub">Worth {inr(hv.billValue)}</span>}
        </div>
      )}
    </div>
  )
}

function Donut({ items, valueKey, money, centerLabel }) {
  const total = items.reduce((a, x) => a + x[valueKey], 0)
  const R = 54, C = 2 * Math.PI * R
  let acc = 0
  return (
    <div className="aa-donut-wrap">
      <svg viewBox="0 0 140 140" className="aa-donut" role="img" aria-label={centerLabel}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="#f1f5f9" strokeWidth="18" />
        {total > 0 && items.map((it, i) => {
          const len = (it[valueKey] / total) * C
          const el = (
            <circle key={it.name} cx="70" cy="70" r={R} fill="none" stroke={SLICE_COLORS[i % SLICE_COLORS.length]} strokeWidth="18"
              strokeDasharray={`${Math.max(0, len - (items.length > 1 ? 2 : 0))} ${C}`} strokeDashoffset={-acc} transform="rotate(-90 70 70)">
              <title>{`${it.name}: ${fmtVal(it[valueKey], money)}`}</title>
            </circle>
          )
          acc += len
          return el
        })}
        <text x="70" y="67" textAnchor="middle" className="aa-donut-num">{short(total, money)}</text>
        <text x="70" y="85" textAnchor="middle" className="aa-donut-cap">{centerLabel}</text>
      </svg>
      <ul className="aa-legend">
        {items.map((it, i) => (
          <li key={it.name}>
            <i style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }} />
            <span className="aa-legend-name" title={it.name}>{it.name}</span>
            <span className="aa-legend-val">{fmtVal(it[valueKey], money)}</span>
            <span className="aa-legend-pct">{total ? Math.round((it[valueKey] / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Empty({ text }) {
  return <div className="aa-empty"><BarChart3 size={22} /><span>{text}</span></div>
}

/** Overview analytics: revenue, growth, usage, activation funnel and the busiest shops */
export function AdminAnalytics() {
  const [days, setDays] = useState(30)
  const [metricKey, setMetricKey] = useState("revenue")
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let live = true
    setLoading(true)
    call(`/admin/analytics?days=${days}`, { headers: headers(), noCache: true })
      .then((res) => {
        if (!live) return
        // an older or partial answer must not break the page: every list defaults to empty
        const arr = (v) => (Array.isArray(v) ? v : [])
        setData({ ...res, series: arr(res?.series), plans: arr(res?.plans), paymentModes: arr(res?.paymentModes), topShops: arr(res?.topShops) })
        setError("")
      })
      .catch((err) => { if (live) setError(err?.message || "Could not load analytics.") })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [days])

  const metric = METRICS.find((m) => m.key === metricKey)
  const spark = useMemo(() => {
    const s = data?.series || []
    return Object.fromEntries(METRICS.map((m) => [m.key, s.map((x) => x[m.key])]))
  }, [data])

  const cur = data?.current || {}
  const prev = data?.previous || {}
  const life = data?.lifetime || {}
  const funnel = data?.funnel
  const periodWord = days === 365 ? "12 months" : `${days} days`
  const conversion = life.users ? ((life.payers / life.users) * 100) : 0

  return (
    <section className="aa" aria-labelledby="aa-title" data-testid="admin-analytics">
      <div className="aa-head">
        <div>
          <h3 id="aa-title">Platform Analytics</h3>
          <p>Growth, usage and plan revenue for the last {periodWord}, compared with the {periodWord} before.</p>
        </div>
        <div className="aa-periods" role="tablist" aria-label="Period">
          {PERIODS.map((p) => (
            <button key={p.days} type="button" role="tab" aria-selected={days === p.days} className={days === p.days ? "on" : ""} onClick={() => setDays(p.days)}>{p.label}</button>
          ))}
        </div>
      </div>

      {error && !data && <p className="aa-error" role="alert">{error}</p>}

      <div className={`aa-body ${loading ? "is-loading" : ""}`}>
        <div className="aa-kpis">
          <Kpi icon={IndianRupee} label="Plan revenue" value={inr(cur.revenue)} delta={change(cur.revenue, prev.revenue)} color="#0284c7" spark={spark.revenue} />
          <Kpi icon={UserPlus} label="New users" value={fmtVal(cur.newUsers)} delta={change(cur.newUsers, prev.newUsers)} color="#7c3aed" spark={spark.newUsers} />
          <Kpi icon={Receipt} label="Bills generated" value={fmtVal(cur.bills)} delta={change(cur.bills, prev.bills)} color="#0d9488" spark={spark.bills} />
          <Kpi icon={Wallet} label="Bill value processed" value={short(cur.billValue, true)} delta={change(cur.billValue, prev.billValue)} color="#ea580c" spark={spark.billValue} />
          <Kpi icon={Store} label="Active shops" value={fmtVal(cur.activeShops)} delta={change(cur.activeShops, prev.activeShops)} color="#db2777" />
          <Kpi icon={Percent} label="Paid conversion" value={`${conversion.toFixed(conversion && conversion < 10 ? 1 : 0)}%`} delta={null} hint={`${fmtVal(life.payers)} of ${fmtVal(life.users)} users have paid`} color="#16a34a" />
        </div>

        <div className="aa-card aa-trend-card">
          <div className="aa-card-head">
            <div>
              <h4>{metric.label} trend</h4>
              <p>
                <strong>{fmtVal(cur[metric.key], metric.money)}</strong> in the last {periodWord}
                {metric.key === "revenue" && <> · {cur.purchases || 0} purchases · lifetime {inr(life.revenue)}</>}
              </p>
            </div>
            <div className="aa-metric-tabs" role="tablist" aria-label="Chart">
              {METRICS.map((m) => (
                <button key={m.key} type="button" role="tab" aria-selected={metricKey === m.key} className={metricKey === m.key ? "on" : ""} style={metricKey === m.key ? { color: m.color, borderColor: m.color + "55", background: m.color + "10" } : undefined} onClick={() => setMetricKey(m.key)}>
                  <i style={{ background: m.color }} />{m.label}
                </button>
              ))}
            </div>
          </div>
          {data?.series?.length ? <TrendChart series={data.series} bucket={data.bucket} metric={metric} /> : <div className="aa-trend-skel" />}
        </div>

        <div className="aa-grid3">
          <div className="aa-card">
            <div className="aa-card-head"><div><h4>Activation funnel</h4><p>All time: how far shops get</p></div></div>
            {funnel ? (
              <div className="aa-funnel">
                {[
                  { label: "Registered", v: funnel.registered, c: "#0284c7" },
                  { label: "Set up a shop", v: funnel.shopSetup, c: "#7c3aed" },
                  { label: "Made a bill", v: funnel.madeBill, c: "#0d9488" },
                  { label: "Bought a plan", v: funnel.paid, c: "#16a34a" }
                ].map((s, i, arr) => {
                  const pct = funnel.registered ? (s.v / funnel.registered) * 100 : 0
                  const step = i && arr[i - 1].v ? Math.round((s.v / arr[i - 1].v) * 100) : null
                  return (
                    <div className="aa-fstep" key={s.label}>
                      <div className="aa-fline">
                        <span>{s.label}</span>
                        <b>{fmtVal(s.v)}</b>
                      </div>
                      <div className="aa-fbar"><span style={{ width: `${Math.max(pct, s.v ? 2 : 0)}%`, background: s.c }} /></div>
                      <small>{Math.round(pct)}% of sign-ups{step !== null && ` · ${step}% of the step before`}</small>
                    </div>
                  )
                })}
              </div>
            ) : <div className="aa-skel" />}
          </div>

          <div className="aa-card">
            <div className="aa-card-head"><div><h4>Revenue by plan</h4><p>Last {periodWord}</p></div></div>
            {data && (data.plans.length ? <Donut items={data.plans} valueKey="revenue" money centerLabel="revenue" /> : <Empty text="No plans bought in this period." />)}
            {!data && <div className="aa-skel" />}
          </div>

          <div className="aa-card">
            <div className="aa-card-head"><div><h4>How customers pay</h4><p>Bills by payment mode, last {periodWord}</p></div></div>
            {data && (data.paymentModes.length ? <Donut items={data.paymentModes} valueKey="count" centerLabel="bills" /> : <Empty text="No bills in this period." />)}
            {!data && <div className="aa-skel" />}
          </div>
        </div>

        <div className="aa-grid2">
          <div className="aa-card">
            <div className="aa-card-head"><div><h4>Most active shops</h4><p>By bills generated, last {periodWord}</p></div></div>
            {data && (data.topShops.length ? (
              <ol className="aa-top">
                {data.topShops.map((s, i) => (
                  <li key={s.id || i}>
                    <span className="aa-rank">{i + 1}</span>
                    <div className="aa-top-main">
                      <div className="aa-top-line"><b title={s.name}>{s.name}</b><span>{fmtVal(s.bills)} bills · {inr(s.amount)}</span></div>
                      <div className="aa-fbar thin"><span style={{ width: `${(s.bills / data.topShops[0].bills) * 100}%` }} /></div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : <Empty text="No bills in this period." />)}
            {!data && <div className="aa-skel" />}
          </div>

          <div className="aa-card aa-facts">
            <div className="aa-card-head"><div><h4>At a glance</h4><p>Useful numbers for this period</p></div></div>
            <dl>
              <div><dt>Average bill value</dt><dd>{inr(cur.bills ? cur.billValue / cur.bills : 0)}</dd></div>
              <div><dt>Bills per active shop</dt><dd>{cur.activeShops ? (cur.bills / cur.activeShops).toFixed(1) : "0"}</dd></div>
              <div><dt>Average plan purchase</dt><dd>{inr(cur.purchases ? cur.revenue / cur.purchases : 0)}</dd></div>
              <div><dt>Revenue per paying user (lifetime)</dt><dd>{inr(life.payers ? life.revenue / life.payers : 0)}</dd></div>
              <div><dt>Lifetime plan revenue</dt><dd>{inr(life.revenue)} <small>({fmtVal(life.purchases)} purchases)</small></dd></div>
              <div><dt><Gift size={13} /> Free credits given by admins</dt><dd>{fmtVal(data?.grants?.prints)} prints <small>({fmtVal(data?.grants?.count)} times)</small></dd></div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AdminAnalytics
