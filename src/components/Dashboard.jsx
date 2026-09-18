// Dashboard.jsx - Updated (removed bottom action buttons)

import { useEffect, useState } from "react"
import { Plus, Receipt, ArrowRight, Store, FileText, Package, Mail } from "lucide-react"
import { useTranslation } from "react-i18next"
import { call, money, getRemainingFreePrints, getCachedData } from "../lib/utils"
import { MetricSkeleton } from "./common/Skeleton"

export function Dashboard({ setView, requireAuth, user }) {
  const { t } = useTranslation()
  const remainingPrints = getRemainingFreePrints(user?.email || user?.id)
  const [stats, setStats] = useState(() => {
    const cachedStats = getCachedData("/bills/stats")
    return {
      total: Number(cachedStats?.total || 0),
      count: Number(cachedStats?.count || 0)
    }
  })
  const [templateCount, setTemplateCount] = useState(() => {
    const cachedTemplates = getCachedData("/templates")
    return Array.isArray(cachedTemplates) ? cachedTemplates.length : 6
  })
  const [productCount, setProductCount] = useState(() => {
    const cachedProducts = getCachedData("/products")
    return Array.isArray(cachedProducts) ? cachedProducts.length : 5
  })
  const [loading, setLoading] = useState(() => !getCachedData("/bills/stats"))

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [statsData, templatesData, productsData] = await Promise.all([
          call("/bills/stats").catch(() => null),
          call("/templates").catch(() => []),
          call("/products").catch(() => [])
        ])

        setStats({
          total: Number(statsData?.total || 0),
          count: Number(statsData?.count || 0)
        })

        setTemplateCount(
          Array.isArray(templatesData) ? templatesData.length : 0
        )

        setProductCount(
          Array.isArray(productsData) ? productsData.length : 0
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
          <p className="eyebrow accent">{t("dashboard.todaysDesk", "TODAY'S DESK")}</p>
          <h2>{t("dashboard.readySale", "Ready for your next sale?")}</h2>
          <p className="subtle">
            {t("dashboard.createReceiptSub", "Create a clean receipt in seconds, then keep serving customers.")}
          </p>
        </div>
        <button
          data-testid="dashboard-new-bill-button"
          className="primary-button"
          onClick={() => setView("bills")}
        >
          <Plus size={18} /> {t("dashboard.newBill", "New bill")}
        </button>
      </div>

      {loading ? (
        <MetricSkeleton count={4} />
      ) : (
        <div className="stats">
          <div className="stat" onClick={() => setView("history")} style={{ cursor: "pointer" }}>
            <span>{t("dashboard.totalRevenue", "Today's sales")}</span>
            <b>{money(stats.total)}</b>
            <small>
              {stats.count > 0
                ? t("dashboard.receiptsToday", "{{count}} receipt(s) today", { count: stats.count })
                : t("dashboard.firstBillPrompt", "Start with your first bill")}
            </small>
          </div>

          <div className="stat" onClick={() => setView("history")} style={{ cursor: "pointer" }}>
            <span>{t("dashboard.billsCreated", "Receipts today")}</span>
            <b>{stats.count}</b>
            <small>
              {stats.count > 0 ? t("dashboard.savedReceiptsToday", "Saved receipts today") : t("dashboard.nothingSavedYet", "Nothing saved yet")}
            </small>
          </div>

          <div className="stat" onClick={() => setView("pricing")} style={{ cursor: "pointer" }}>
            <span>{t("dashboard.pricingTitle", "Prints Left")}</span>
            <b>{remainingPrints}</b>
            <small>
              {remainingPrints > 0 ? t("dashboard.printsRemaining", "{{count}} remaining", { count: remainingPrints }) : t("dashboard.planLimitReached", "Plan limit reached")}
            </small>
          </div>

          <div className="stat" onClick={() => setView("templates")} style={{ cursor: "pointer" }}>
            <span>{t("dashboard.templatesAvailable", "Templates")}</span>
            <b>{templateCount}</b>
            <small>
              {templateCount > 0 ? t("dashboard.reusableBillStyles", "Reusable bill styles") : t("dashboard.createTemplate", "Create template")}
            </small>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        <section className="quick-panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">{t("dashboard.quickStart", "QUICK START")}</p>
              <h3>{t("dashboard.billingRhythm", "Your simple billing rhythm")}</h3>
            </div>
            <Receipt size={28} />
          </div>

          <div className="steps">
            <div>
              <b>01</b>
              <span>
                <strong>{t("dashboard.step1Title", "Choose a template")}</strong>
                <small>{t("dashboard.step1Desc", "Your shop details and invoice prefix are already placed.")}</small>
              </span>
            </div>
            <div>
              <b>02</b>
              <span>
                <strong>{t("dashboard.step2Title", "Add items")}</strong>
                <small>{t("dashboard.step2Desc", "Quick product lookup, quantity × rate, and auto tax calculation.")}</small>
              </span>
            </div>
            <div>
              <b>03</b>
              <span>
                <strong>{t("dashboard.step3Title", "Print and go")}</strong>
                <small>{t("dashboard.step3Desc", "Works seamlessly with 58mm/80mm thermal & laser printers.")}</small>
              </span>
            </div>
          </div>
        </section>

        <section className="tip-panel">
          <p className="eyebrow">{t("dashboard.quickShortcuts", "QUICK SHORTCUTS")}</p>
          <h3>{t("dashboard.manageWorkspace", "Manage your workspace")}</h3>
          <p>
            {t("dashboard.workspaceDesc", "Organize reusable templates, manage your product inventory, and configure your invoice numbering.")}
          </p>
          <div className="dashboard-shortcuts-row">
            <button className="secondary-button small" onClick={() => setView("templates")}>
              <FileText size={14} /> {t("dashboard.btnTemplates", "Templates")}
            </button>
            <button className="secondary-button small" onClick={() => setView("products")}>
              <Package size={14} /> {t("dashboard.btnProducts", "Products")}
            </button>
            <button className="secondary-button small" onClick={() => setView("shop")}>
              <Store size={14} /> {t("dashboard.btnShopSettings", "Shop Settings")}
            </button>
            <button className="secondary-button small" onClick={() => setView("contact")}>
              <Mail size={14} /> {t("nav.contact", "Contact Us")}
            </button>
          </div>
        </section>
      </div>

      {/* Remove the bottom action buttons section - they are now in Shell.jsx as mobile bottom nav */}
    </div>
  )
}