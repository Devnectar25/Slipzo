import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Building2, CreditCard, Globe, Lock, Percent, ReceiptText, Store } from "lucide-react"
import { call, getCachedData, setCachedData, findTemplateMatch, isHotelRestaurant } from "../lib/utils"
import { parsePaymentModes, shopPaymentModes, shopDefaultPaymentMode } from "../lib/paymentModes"
import { shopUsesGst, shopShowsGstOnBill } from "../lib/gst"
import { useDbTranslation } from "../lib/translator"
import { SUPPORTED_LANGUAGES, changeAppLanguage } from "../i18n/i18n"
import { BUILTIN_TEMPLATES } from "./Templates"
import { getBusinessCategories } from "./common/ChangeCategoryModal"
import { Skeleton } from "./common/Skeleton"
import "../styles/StaffShopProfile.css"

function Section({ icon, title, children, ...rest }) {
  const Icon = icon
  return (
    <section className="ssp-card" {...rest}>
      <h3 className="ssp-card-title"><Icon size={18} /> <span>{title}</span></h3>
      {children}
    </section>
  )
}

function Row({ label, value, empty }) {
  return (
    <div className="ssp-row">
      <dt>{label}</dt>
      <dd className={value ? "" : "ssp-empty"}>{value || empty}</dd>
    </div>
  )
}

/**
 * The shop's profile as its workers see it: everything can be read, nothing can be changed (the server refuses it too).
 * Only the app language is theirs: it is kept on their own phone.
 */
export function StaffShopProfile({ user, children }) {
  const { t, i18n } = useTranslation()
  const { formatNum } = useDbTranslation()
  const [shop, setShop] = useState(() => getCachedData("/shop"))
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    const load = () => call("/shop", { noCache: true })
      .then((data) => {
        if (!alive || !data || typeof data !== "object") return
        setShop(data)
        setCachedData("/shop", data)
        setFailed(false)
      })
      .catch(() => { if (alive) setFailed(true) })
    load()
    // the owner may have changed something meanwhile
    const onVisible = () => { if (document.visibilityState === "visible") load() }
    document.addEventListener("visibilitychange", onVisible)
    return () => { alive = false; document.removeEventListener("visibilitychange", onVisible) }
  }, [user?.staff_of?.shop_id])

  // "Edit" beside the language in the menu brings people here
  useEffect(() => {
    let target = ""
    try {
      target = sessionStorage.getItem("slipzo_scroll_to") || ""
      sessionStorage.removeItem("slipzo_scroll_to")
    } catch (_) { /* storage unavailable */ }
    const go = () => document.getElementById("app-settings-section")?.scrollIntoView({ behavior: "smooth", block: "center" })
    const timer = target ? setTimeout(go, 400) : null
    window.addEventListener("slipzo-scroll-to-app-settings", go)
    return () => { clearTimeout(timer); window.removeEventListener("slipzo-scroll-to-app-settings", go) }
  }, [])

  const category = useMemo(() => getBusinessCategories(t).find((c) => c.id === shop?.business_type), [shop?.business_type, t])
  const template = shop ? findTemplateMatch(getCachedData("/templates") || BUILTIN_TEMPLATES, shop.default_template_id) : null
  const none = t("staffShop.notAdded", "Not added")
  const yesNo = (on) => (on ? t("staffShop.on", "On") : t("staffShop.off", "Off"))
  const defaultMode = shop ? shopDefaultPaymentMode(shop) : ""
  const name = shop?.name || user?.staff_of?.shop_name || ""
  const formats = {
    "PREFIX-DATE-SEQ": t("profile.formatPrefixDateSeq", "Prefix + Date + Number"),
    "PREFIX-SHORTDATE-SEQ": t("profile.formatPrefixYearSeq", "Prefix + Short Date + Number"),
    "PREFIX-SEQ": t("profile.formatPrefixSeq", "Prefix + Number"),
    SEQ: t("profile.formatSeqOnly", "Number only")
  }

  return (
    <div className="page shop-page ssp-page fade-in" data-testid="staff-member-view">
      <header className="ssp-head">
        <span className="ssp-logo">
          {shop?.logo_url ? <img src={shop.logo_url} alt="" /> : <Store size={28} />}
        </span>
        <div className="ssp-head-text">
          <h1>{name}</h1>
          {category && <p>{category.label}</p>}
        </div>
      </header>

      <p className="ssp-note" data-testid="staff-view-only">
        <Lock size={16} />
        <span>{t("staffShop.viewOnly", "You can view the shop profile. Only the owner can change it.")}</span>
      </p>

      {!shop ? (
        failed
          ? <p className="ssp-failed">{t("staffShop.failed", "The shop profile could not be loaded. Check your internet connection.")}</p>
          : <><Skeleton width="100%" height="150px" borderRadius="16px" /><Skeleton width="100%" height="150px" borderRadius="16px" /></>
      ) : (
        <>
          <Section icon={Building2} title={t("profile.businessDetails", "Business Information")}>
            <dl>
              <Row label={t("profile.shopName", "Shop Name")} value={shop.name} empty={none} />
              <Row label={t("profile.phone", "Contact Phone Number")} value={shop.phone} empty={none} />
              <Row label={t("profile.address", "Store Address")} value={shop.address} empty={none} />
              {isHotelRestaurant(shop) && <Row label={t("staffShop.tables", "Tables")} value={formatNum(shop.table_count)} empty={none} />}
            </dl>
          </Section>

          <Section icon={CreditCard} title={t("profile.paymentModesTitle", "Payment Modes")}>
            <ul className="ssp-modes">
              {shopPaymentModes(shop).map((m) => (
                <li key={m.id}>
                  {t(m.labelKey, m.label)}
                  {m.id === defaultMode && <span>{t("profile.paymentDefault", "Default")}</span>}
                </li>
              ))}
            </ul>
            {parsePaymentModes(shop.payment_modes).includes("UPI") && (
              <dl><Row label={t("staffShop.upi", "UPI ID")} value={shop.upi_id} empty={none} /></dl>
            )}
          </Section>

          <Section icon={Percent} title={t("profile.gstSettingsTitle", "GST & Tax Settings")}>
            <dl>
              <Row label={t("staffShop.gst", "GST on products")} value={yesNo(shopUsesGst(shop))} />
              {shopUsesGst(shop) && <Row label={t("staffShop.gstOnBill", "GST shown on bills")} value={yesNo(shopShowsGstOnBill(shop))} />}
              <Row label={t("profile.gstin", "Shop GSTIN Number")} value={shop.gstin} empty={none} />
            </dl>
          </Section>

          <Section icon={ReceiptText} title={t("profile.receiptDefaults", "Receipt Settings")}>
            <dl>
              <Row label={t("profile.receiptTemplate", "Receipt Template")} value={template?.name} empty={t("staffShop.standard", "Standard")} />
              <Row label={t("profile.invoicePrefix", "Invoice Prefix")} value={shop.invoice_prefix} empty={none} />
              <Row label={t("profile.numberFormat", "Numbering Format")} value={formats[shop.invoice_format] || shop.invoice_format} empty={none} />
            </dl>
          </Section>
        </>
      )}

      <Section icon={Globe} title={t("profile.languageTitle", "App Language")} id="app-settings-section">
        <div className="ssp-langs" role="group" aria-label={t("profile.languageTitle", "App Language")}>
          {SUPPORTED_LANGUAGES.map((l) => {
            const active = String(i18n.language || "en").slice(0, 2) === l.code
            return (
              <button key={l.code} type="button" className={active ? "active" : ""} aria-pressed={active} onClick={() => changeAppLanguage(l.code)}>
                {l.nativeName}
              </button>
            )
          })}
        </div>
        <p className="ssp-help">{t("staffShop.language", "Changes the language on this phone only.")}</p>
      </Section>

      {children}
    </div>
  )
}

export default StaffShopProfile
