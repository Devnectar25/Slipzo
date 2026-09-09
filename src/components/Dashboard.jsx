// Dashboard.jsx - Updated (removed bottom action buttons)

import { useEffect, useState } from "react"
import { Plus, Receipt, ArrowRight, Users, Store, FileText } from "lucide-react"
import { call, money } from "../lib/utils"
import { MetricSkeleton } from "./common/Skeleton"

export function Dashboard({ setView, requireAuth }) {
  const [stats, setStats] = useState({
    total: 0,
    count: 0
  })
  const [templateCount, setTemplateCount] = useState(0)
  const [customerCount, setCustomerCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [statsData, templatesData, customersData] = await Promise.all([
          call("/bills/stats"),
          call("/templates"),
          call("/customers").catch(() => [])
        ])

        setStats({
          total: Number(statsData?.total || 0),
          count: Number(statsData?.count || 0)
        })

        setTemplateCount(
          Array.isArray(templatesData) ? templatesData.length : 0
        )

        setCustomerCount(
          Array.isArray(customersData) ? customersData.length : 0
        )
      } catch (err) {
        console.error("Failed to load dashboard:", err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  return (
    <div className="page dashboard-page fade-in">
      <div className="hero-row">
        <div>
          <p className="eyebrow accent">TODAY'S DESK</p>
          <h2>Ready for your next sale?</h2>
          <p className="subtle">
            Create a clean receipt in seconds, then keep serving customers.
          </p>
        </div>
        <button
          data-testid="dashboard-new-bill-button"
          className="primary-button"
          onClick={() => setView("bills")}
        >
          <Plus size={18} /> New bill
        </button>
      </div>

      {loading ? (
        <MetricSkeleton count={4} />
      ) : (
        <div className="stats">
          <div className="stat" onClick={() => setView("history")} style={{ cursor: "pointer" }}>
            <span>Today's sales</span>
            <b>{money(stats.total)}</b>
            <small>
              {stats.count > 0
                ? `${stats.count} receipt${stats.count === 1 ? "" : "s"} today`
                : "Start with your first bill"}
            </small>
          </div>

          <div className="stat" onClick={() => setView("history")} style={{ cursor: "pointer" }}>
            <span>Receipts today</span>
            <b>{stats.count}</b>
            <small>
              {stats.count > 0 ? "Saved receipts today" : "Nothing saved yet"}
            </small>
          </div>

          <div className="stat" onClick={() => setView("customers")} style={{ cursor: "pointer" }}>
            <span>Customers</span>
            <b>{customerCount}</b>
            <small>
              {customerCount > 0 ? "Registered clients" : "Add first customer"}
            </small>
          </div>

          <div className="stat" onClick={() => setView("templates")} style={{ cursor: "pointer" }}>
            <span>Templates</span>
            <b>{templateCount}</b>
            <small>
              {templateCount > 0 ? "Reusable bill styles" : "Create template"}
            </small>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        <section className="quick-panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">QUICK START</p>
              <h3>Your simple billing rhythm</h3>
            </div>
            <Receipt size={28} />
          </div>

          <div className="steps">
            <div>
              <b>01</b>
              <span>
                <strong>Choose a template</strong>
                <small>Your shop details and invoice prefix are already placed.</small>
              </span>
            </div>
            <div>
              <b>02</b>
              <span>
                <strong>Add items or customer</strong>
                <small>Quantity × rate, auto tax, and customer linking instantly.</small>
              </span>
            </div>
            <div>
              <b>03</b>
              <span>
                <strong>Print and go</strong>
                <small>Works seamlessly with 58mm/80mm thermal & laser printers.</small>
              </span>
            </div>
          </div>
        </section>

        <section className="tip-panel">
          <p className="eyebrow">QUICK SHORTCUTS</p>
          <h3>Manage your workspace</h3>
          <p>
            Organize reusable templates, maintain your customer contact book, and configure your invoice numbering.
          </p>
          <div className="dashboard-shortcuts-row">
            <button
              className="secondary-button small"
              onClick={() => setView("templates")}
            >
              <FileText size={14} /> Templates
            </button>
            <button
              className="secondary-button small"
              onClick={() => setView("customers")}
            >
              <Users size={14} /> Customers
            </button>
            <button
              className="secondary-button small"
              onClick={() => setView("shop")}
            >
              <Store size={14} /> Shop Settings
            </button>
          </div>
        </section>
      </div>

      {/* Remove the bottom action buttons section - they are now in Shell.jsx as mobile bottom nav */}
    </div>
  )
}