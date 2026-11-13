import { Check, ScanBarcode, ChefHat, Wifi } from "lucide-react"
import "../../styles/FeatureArt.css"

// Small drawn pictures for the six feature cards on the landing page (no words inside, so they work in every language)

function PrintArt() {
  return (
    <div className="fa-scene fa-print">
      <div className="fa-printer">
        <div className="fa-printer-slot" />
        <div className="fa-paper">
          <span className="fa-paper-head" />
          <span /><span /><span className="short" />
          <span className="fa-paper-total" />
        </div>
        <div className="fa-printer-body"><i className="fa-led" /></div>
      </div>
      <div className="fa-chat">
        <span className="fa-chat-doc" />
        <b>₹330</b>
        <span className="fa-chat-ticks"><Check size={10} strokeWidth={3} /><Check size={10} strokeWidth={3} /></span>
      </div>
    </div>
  )
}

function BarcodeArt() {
  return (
    <div className="fa-scene fa-barcode">
      <div className="fa-pack">
        <span className="fa-pack-label" />
        <div className="fa-bars">
          {[3, 1, 2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1].map((w, i) => <i key={i} style={{ width: `${w + 1}px` }} />)}
        </div>
        <span className="fa-laser" />
      </div>
      <div className="fa-scan-btn"><ScanBarcode size={16} /></div>
      <div className="fa-low"><i />3</div>
    </div>
  )
}

function TablesArt() {
  const tables = [["T1", "busy"], ["T2", "free"], ["T3", "bill"], ["T4", "free"], ["T5", "busy"], ["T6", "busy"]]
  return (
    <div className="fa-scene fa-tables">
      <div className="fa-table-grid">
        {tables.map(([n, s]) => <span key={n} className={`fa-table ${s}`}>{n}</span>)}
      </div>
      <div className="fa-kot">
        <span className="fa-kot-head"><ChefHat size={11} /> KOT</span>
        <span /><span className="short" /><span />
      </div>
    </div>
  )
}

function SalesArt() {
  const bars = [28, 42, 35, 64, 88, 72, 50, 38]
  return (
    <div className="fa-scene fa-sales">
      <div className="fa-chart">
        {bars.map((h, i) => <i key={i} style={{ height: `${h}%`, animationDelay: `${i * 70}ms` }} className={i === 4 ? "peak" : ""} />)}
      </div>
      <div className="fa-donut">
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r="14" className="fa-donut-track" />
          <circle cx="18" cy="18" r="14" className="fa-donut-upi" strokeDasharray="56 88" />
        </svg>
        <span>UPI</span>
      </div>
    </div>
  )
}

function StaffArt() {
  return (
    <div className="fa-scene fa-staff">
      <div className="fa-people">
        <span className="fa-person owner">RK</span>
        <span className="fa-person a">AM</span>
        <span className="fa-person b">PS</span>
        <span className="fa-person add">+</span>
      </div>
      <div className="fa-code">
        {["7", "K", "4", "Q"].map((c) => <b key={c}>{c}</b>)}
      </div>
    </div>
  )
}

function DeviceArt() {
  return (
    <div className="fa-scene fa-device">
      <div className="fa-phone">
        <span className="fa-phone-notch" />
        <span className="fa-phone-row" /><span className="fa-phone-row" /><span className="fa-phone-row short" />
        <span className="fa-phone-btn" />
      </div>
      <div className="fa-link"><Wifi size={14} /></div>
      <div className="fa-mini-printer">
        <span className="fa-mini-paper" />
        <span className="fa-mini-body" />
      </div>
    </div>
  )
}

const ARTS = { print: PrintArt, barcode: BarcodeArt, tables: TablesArt, sales: SalesArt, staff: StaffArt, device: DeviceArt }

export function FeatureArt({ kind }) {
  const Art = ARTS[kind]
  return Art ? <div className="fa-art" aria-hidden="true"><Art /></div> : null
}

export default FeatureArt
