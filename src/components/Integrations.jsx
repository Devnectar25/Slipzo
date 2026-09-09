
import { ArrowRight, Smartphone, Printer, ShoppingCart, Database, Cloud, Zap } from "lucide-react"

export function Integrations({ setView, setShowAuth }) {
  const integrations = [
    {
      icon: <Printer size={32} />,
      name: "Printers",
      description: "Compatible with thermal printers, laser printers, and standard A4 printers.",
      devices: ["58mm thermal", "80mm receipt", "A4 laser", "Label printers"]
    },
    {
      icon: <Smartphone size={32} />,
      name: "Mobile Devices",
      description: "Works on all modern smartphones and tablets. Bill from anywhere in your shop.",
      devices: ["iOS", "Android", "iPad", "Tablets"]
    },
    {
      icon: <ShoppingCart size={32} />,
      name: "Payment Systems",
      description: "Integrate with popular payment systems for seamless checkout.",
      devices: ["Paytm", "PhonePe", "Google Pay", "Razorpay"]
    },
    {
      icon: <Database size={32} />,
      name: "Accounting Software",
      description: "Export your receipts to popular accounting software for easy bookkeeping.",
      devices: ["Excel", "Google Sheets", "QuickBooks", "Tally"]
    },
    {
      icon: <Cloud size={32} />,
      name: "Cloud Storage",
      description: "Automatically backup your receipts to cloud storage services.",
      devices: ["Google Drive", "Dropbox", "OneDrive"]
    },
    {
      icon: <Zap size={32} />,
      name: "API Access",
      description: "Build custom integrations with our developer-friendly API.",
      devices: ["REST API", "Webhooks", "OAuth 2.0"]
    }
  ]

  return (
    <div className="integrations-page">
      {/* Header */}
      <section className="integrations-header">
        <div className="integrations-header-content">
          <p className="eyebrow">INTEGRATIONS</p>
          <h1>Works with your<br />existing tools</h1>
          <p className="header-description">
            Slipzo integrates with your hardware and software. No replacement needed. 
            Just plug and play.
          </p>
        </div>
      </section>

      {/* Integrations Grid */}
      <section className="integrations-grid-section">
        <div className="integrations-grid">
          {integrations.map((integration, index) => (
            <div className="integration-card" key={index}>
              <div className="integration-icon">{integration.icon}</div>
              <h3>{integration.name}</h3>
              <p>{integration.description}</p>
              <div className="integration-devices">
                {integration.devices.map((device, idx) => (
                  <span className="device-tag" key={idx}>{device}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="integrations-cta">
        <div className="cta-content">
          <h2>Ready to integrate?</h2>
          <p>Start using Slipzo with your existing setup today.</p>
          <button className="cta-button primary large" onClick={() => setShowAuth(true)}>
            Get Started Free <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </div>
  )
}
