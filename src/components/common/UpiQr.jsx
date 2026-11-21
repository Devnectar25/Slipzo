import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import QRCode from "qrcode"
import { X, Maximize2, QrCode as QrIcon, AlertCircle } from "lucide-react"
import { money } from "../../lib/utils"
import { buildUpiLink, isValidUpiId, normalizeUpiId } from "../../lib/upi"
import "../../styles/UpiQr.css"

/** The QR picture for a UPI link (made in the browser, nothing is sent anywhere) */
export function UpiQrImage({ upiId, payeeName, amount, note, size = 200, className = "" }) {
  const [src, setSrc] = useState("")
  const valid = isValidUpiId(upiId)

  useEffect(() => {
    let alive = true
    if (!valid) { setSrc(""); return undefined }
    const link = buildUpiLink({ upiId, payeeName, amount, note })
    QRCode.toDataURL(link, { margin: 1, width: size * 2, errorCorrectionLevel: "M", color: { dark: "#0c1f41", light: "#ffffff" } })
      .then((url) => { if (alive) setSrc(url) })
      .catch(() => { if (alive) setSrc("") })
    return () => { alive = false }
  }, [upiId, payeeName, amount, note, size, valid])

  if (!valid) return null
  return src
    ? <img src={src} alt="UPI QR code" width={size} height={size} className={`upi-qr-img ${className}`} data-testid="upi-qr-img" />
    : <div className={`upi-qr-img upi-qr-loading ${className}`} style={{ width: size, height: size }} />
}

/**
 * The payment QR shown on a bill when UPI is the payment mode: scan and pay the exact amount.
 * Without a UPI ID it asks the owner to add one in the Shop profile.
 */
export function UpiPayCard({ upiId, payeeName, amount, note, onAddUpiId }) {
  const { t } = useTranslation()
  const [big, setBig] = useState(false)
  const valid = isValidUpiId(upiId)
  const amt = Number(amount) || 0

  useEffect(() => {
    if (!big) return undefined
    const onKey = (e) => { if (e.key === "Escape") setBig(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [big])

  if (!valid) {
    return (
      <div className="upi-pay-card upi-pay-missing" data-testid="upi-pay-missing">
        <AlertCircle size={18} />
        <div>
          <strong>{t("upi.noIdTitle", "Add your UPI ID to show a payment QR")}</strong>
          <span>{t("upi.noIdText", "Customers can then scan and pay the exact bill amount.")}</span>
        </div>
        {onAddUpiId && (
          <button type="button" onClick={onAddUpiId}>{t("upi.addId", "Add UPI ID")}</button>
        )}
      </div>
    )
  }

  if (amt <= 0) {
    return (
      <div className="upi-pay-card upi-pay-empty">
        <QrIcon size={18} />
        <span>{t("upi.addItemsFirst", "Add items to show the UPI payment QR")}</span>
      </div>
    )
  }

  return (
    <>
      <div className="upi-pay-card" data-testid="upi-pay-card">
        <button type="button" className="upi-pay-qr-btn" onClick={() => setBig(true)} title={t("upi.showCustomer", "Show to customer")}>
          <UpiQrImage upiId={upiId} payeeName={payeeName} amount={amt} note={note} size={112} />
        </button>
        <div className="upi-pay-info">
          <span className="upi-pay-label">{t("upi.scanToPay", "Scan to pay")}</span>
          <strong className="upi-pay-amount">{money(amt)}</strong>
          <span className="upi-pay-id">{normalizeUpiId(upiId)}</span>
          <button type="button" className="upi-pay-enlarge" onClick={() => setBig(true)}>
            <Maximize2 size={13} /> {t("upi.showCustomer", "Show to customer")}
          </button>
        </div>
      </div>

      {big && (
        <div className="upi-big-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setBig(false) }}>
          <div className="upi-big" role="dialog" aria-modal="true" data-testid="upi-big">
            <button type="button" className="upi-big-close" onClick={() => setBig(false)} aria-label={t("common.close", "Close")}>
              <X size={20} />
            </button>
            {payeeName && <h3 className="upi-big-shop">{payeeName}</h3>}
            <span className="upi-big-label">{t("upi.scanToPayAmount", "Scan with any UPI app to pay")}</span>
            <strong className="upi-big-amount">{money(amt)}</strong>
            <UpiQrImage upiId={upiId} payeeName={payeeName} amount={amt} note={note} size={260} className="upi-big-img" />
            <span className="upi-big-id">{normalizeUpiId(upiId)}</span>
            <span className="upi-big-apps">GPay · PhonePe · Paytm · BHIM</span>
          </div>
        </div>
      )}
    </>
  )
}

export default UpiPayCard
