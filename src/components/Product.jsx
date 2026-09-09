import { useState } from "react"
import { 
  ArrowRight, Zap, Printer, Smartphone, ShoppingCart, Database, Cloud, 
  Store, Shield, Sparkles, Users, BarChart3, CreditCard, RefreshCw, 
  CheckCircle2, FileText, Check, ChevronRight, Layers, Sliders, Laptop
} from "lucide-react"

export function Product({ setView, setShowAuth }) {
  const [activeTab, setActiveTab] = useState("features")

  const coreFeatures = [
    {
      icon: <Zap size={24} />,
      color: "#0ea5e9",
      title: "Sub-10s Rapid Billing",
      description: "Designed specifically for peak rush hours. Add items, apply discounts, select payment mode, and generate receipts with zero lag."
    },
    {
      icon: <Printer size={24} />,
      color: "#8b5cf6",
      title: "Universal Thermal Printer Support",
      description: "Plug-and-play compatibility with 58mm thermal rolls, 80mm POS receipt printers, Bluetooth handheld devices, and standard A4 laser printers."
    },
    {
      icon: <Store size={24} />,
      color: "#f59e0b",
      title: "Branded Receipts & Logo",
      description: "Reinforce customer trust by showcasing your shop logo, GSTIN, custom terms & conditions, address, and personalized thank-you messages."
    },
    {
      icon: <BarChart3 size={24} />,
      color: "#10b981",
      title: "Daily Sales & Analytics",
      description: "Track your revenue, total receipts printed, best-selling items, and digital vs cash collections with real-time visual summaries."
    },
    {
      icon: <Users size={24} />,
      color: "#6366f1",
      title: "Customer Directory & History",
      description: "Keep records of your regular shoppers, their contact details, purchase frequency, and outstanding balances."
    },
    {
      icon: <RefreshCw size={24} />,
      color: "#ec4899",
      title: "Instant Search & Reprints",
      description: "Customer lost their receipt? Easily look up past transactions by date, customer, or invoice number and reprint in one click."
    },
    {
      icon: <Cloud size={24} />,
      color: "#14b8a6",
      title: "Secure Cloud Sync",
      description: "All bills, customer details, and templates are encrypted and automatically backed up to the cloud. Never lose shop data."
    },
    {
      icon: <CreditCard size={24} />,
      color: "#f43f5e",
      title: "Dynamic UPI QR Payments",
      description: "Print dynamic or static UPI QR codes right on the thermal receipt for instant customer scans via PhonePe, GPay, or Paytm."
    }
  ]

  const integrations = [
    {
      icon: <Printer size={32} />,
      name: "Receipt & Thermal Printers",
      description: "Compatible with USB, Bluetooth, Wi-Fi, and Ethernet POS thermal printers.",
      devices: ["58mm thermal", "80mm POS roll", "Bluetooth portable", "A4 Laser & DeskJet"]
    },
    {
      icon: <Smartphone size={32} />,
      name: "Mobile & Handheld Devices",
      description: "Responsive interface that turns any smartphone or tablet into a billing terminal.",
      devices: ["Android POS", "iOS / iPhone", "iPad / Tablets", "Windows Desktops"]
    },
    {
      icon: <ShoppingCart size={32} />,
      name: "Payment Gateways & UPI",
      description: "Integrated scan-to-pay QR codes and tracking for modern digital payment methods.",
      devices: ["UPI QR", "PhonePe", "Google Pay", "Paytm", "Card POS"]
    },
    {
      icon: <Database size={32} />,
      name: "Accounting & Export Tools",
      description: "Export full transaction ledgers and reports for seamless bookkeeping.",
      devices: ["Microsoft Excel", "Google Sheets", "CSV Export", "Tally Ready"]
    },
    {
      icon: <Cloud size={32} />,
      name: "Cloud Storage & Backup",
      description: "Automatic real-time data persistence and synchronization across multiple counters.",
      devices: ["Encrypted Cloud", "Google Drive", "Automated Daily Backups"]
    },
    {
      icon: <Zap size={32} />,
      name: "Developer API & Webhooks",
      description: "Connect Slipzo with your custom inventory software, CRM, or eCommerce store.",
      devices: ["REST API", "Webhooks", "JSON Payloads", "OAuth 2.0"]
    }
  ]

  const workflowSteps = [
    {
      number: "01",
      title: "Configure Shop Profile",
      desc: "Add your store name, address, GSTIN, logo, and preferred receipt dimensions in under two minutes."
    },
    {
      number: "02",
      title: "Add Items & Create Bill",
      desc: "Select items from your catalog or key them in on the fly. Auto-calculate taxes, discounts, and payment methods."
    },
    {
      number: "03",
      title: "Print or Share Instantly",
      desc: "One click sends the receipt directly to your thermal printer with zero setup friction, or share via WhatsApp."
    }
  ]

  return (
    <div className="product-page">
      {/* Product Hero */}
      <section className="product-hero">
        <div className="product-hero-content">
          <p className="eyebrow">SLIPZO PRODUCT</p>
          <h1>The All-in-One Billing Platform<br />Built for Retail & Small Shops</h1>
          <p className="header-description">
            Slipzo brings enterprise-grade thermal billing, custom receipt templates, sales tracking,
            and universal printer compatibility into an intuitive tool any shopkeeper can master.
          </p>
          <div className="product-hero-actions">
            <button className="cta-button primary large" onClick={() => setShowAuth(true)}>
              Start billing free <ArrowRight size={18} />
            </button>
            <button className="cta-button secondary" onClick={() => setView("templates")}>
              Explore templates
            </button>
          </div>
        </div>
      </section>

      {/* Navigation Switcher */}
      <section className="product-nav-tabs">
        <div className="tabs-container">
          <button 
            className={`tab-btn ${activeTab === "features" ? "active" : ""}`}
            onClick={() => setActiveTab("features")}
          >
            <Layers size={16} /> Core Capabilities
          </button>
          <button 
            className={`tab-btn ${activeTab === "integrations" ? "active" : ""}`}
            onClick={() => setActiveTab("integrations")}
          >
            <Printer size={16} /> Hardware & Integrations
          </button>
          <button 
            className={`tab-btn ${activeTab === "workflow" ? "active" : ""}`}
            onClick={() => setActiveTab("workflow")}
          >
            <Zap size={16} /> How It Works
          </button>
        </div>
      </section>

      {/* Core Capabilities */}
      {(activeTab === "features" || activeTab === "all") && (
        <section className="product-features-section">
          <div className="section-header">
            <p className="eyebrow">POWERFUL & SIMPLE</p>
            <h2>Engineered to keep checkout lines moving</h2>
            <p>Every feature is focused on speed, reliability, and eliminating billing errors.</p>
          </div>
          <div className="product-features-grid">
            {coreFeatures.map((feat, index) => (
              <div className="product-feature-card" key={index}>
                <div className="product-feat-icon" style={{ backgroundColor: `${feat.color}15`, color: feat.color }}>
                  {feat.icon}
                </div>
                <h3>{feat.title}</h3>
                <p>{feat.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Hardware & Integrations */}
      {(activeTab === "integrations" || activeTab === "all") && (
        <section className="product-integrations-section">
          <div className="section-header">
            <p className="eyebrow">ECOSYSTEM & HARDWARE</p>
            <h2>Works with your existing printer & devices</h2>
            <p>No expensive proprietary hardware needed. Slipzo works with standard thermal printers out of the box.</p>
          </div>
          <div className="product-integrations-grid">
            {integrations.map((item, index) => (
              <div className="product-integration-card" key={index}>
                <div className="product-integration-icon">{item.icon}</div>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <div className="device-tags-list">
                  {item.devices.map((device, idx) => (
                    <span className="device-tag" key={idx}>{device}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Workflow: How it Works */}
      {(activeTab === "workflow" || activeTab === "all") && (
        <section className="product-workflow-section">
          <div className="section-header">
            <p className="eyebrow">SIMPLE 3-STEP SETUP</p>
            <h2>How Slipzo simplifies your billing counter</h2>
            <p>Go from zero to printing professional receipts in less than two minutes.</p>
          </div>
          <div className="workflow-grid">
            {workflowSteps.map((step, idx) => (
              <div className="workflow-card" key={idx}>
                <div className="workflow-step-badge">{step.number}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Product Banner / CTA */}
      <section className="product-cta-section">
        <div className="product-cta-box">
          <div className="cta-left">
            <h2>Ready to transform your billing experience?</h2>
            <p>Join thousands of shopkeepers saving time and printing better receipts every day.</p>
          </div>
          <div className="cta-right">
            <button className="cta-button primary large" onClick={() => setShowAuth(true)}>
              Get Started for Free <ArrowRight size={18} />
            </button>
            <button className="cta-button secondary" onClick={() => setView("pricing")}>
              Compare Plans
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
