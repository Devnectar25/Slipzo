import { useState, useMemo } from "react"
import { 
  BookOpen, Search, ArrowRight, CheckCircle2, 
  Receipt, Package, Utensils, Printer, LayoutTemplate, 
  BarChart3, HelpCircle, ChevronDown, ChevronUp, Sparkles,
  Zap, Smartphone, ShieldCheck, Mail, AlertCircle, FileText
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useDbTranslation } from "../lib/translator"
import "../styles/UserGuide.css"

export function UserGuide({ setView, user }) {
  const { t } = useTranslation()
  const { tDb } = useDbTranslation()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("bills")
  const [openFaqIndex, setOpenFaqIndex] = useState(null)

  const quickStartSteps = [
    {
      num: 1,
      title: "Set Up Shop Profile",
      desc: "Configure your business name, address, GSTIN, phone, and upload your shop logo.",
      actionLabel: "Configure Shop",
      targetView: "shop"
    },
    {
      num: 2,
      title: "Add Products & Inventory",
      desc: "Add your items with prices, stock levels, and barcodes, or bulk import via CSV.",
      actionLabel: "Manage Items",
      targetView: "products"
    },
    {
      num: 3,
      title: "Select Receipt Template",
      desc: "Choose between 58mm, 80mm thermal formats or full A4/A5 tax invoice layouts.",
      actionLabel: "View Templates",
      targetView: "templates"
    },
    {
      num: 4,
      title: "Create Your First Bill",
      desc: "Search items, apply discounts, choose payment method (Cash/UPI), and print in 1-click.",
      actionLabel: "New Bill Desk",
      targetView: "bills"
    }
  ]

  const topics = [
    {
      id: "bills",
      label: "Billing & Invoices",
      icon: Receipt,
      title: "How to Create & Print Bills",
      subtitle: "Lightning-fast billing with barcode scanner, custom tax, and instant thermal printing.",
      instructions: [
        {
          title: "Select or Scan Items",
          desc: "Type the product name in the search bar or scan its barcode using your camera or USB barcode gun. The item is instantly added to the bill cart."
        },
        {
          title: "Adjust Quantities & Discounts",
          desc: "Click '+' or '-' to change item quantity. You can also apply an overall percentage or flat rupee discount to the entire bill."
        },
        {
          title: "Choose Payment Method (Cash / UPI / Card / Udhar)",
          desc: "Select how the customer paid. If UPI is chosen, you can display a dynamic QR code for instant scanning and payment verification."
        },
        {
          title: "1-Click Print & WhatsApp Share",
          desc: "Hit 'Print Bill' to send directly to your 58mm or 80mm thermal printer. You can also send a digital PDF copy directly to the customer's WhatsApp."
        }
      ],
      proTip: "Use the keyboard shortcut 'Ctrl + Enter' on desktop to instantly complete and print the bill without touching your mouse!",
      actionText: "Open New Bill Desk",
      actionView: "bills"
    },
    {
      id: "inventory",
      label: "Products & Barcodes",
      icon: Package,
      title: "Managing Products, Prices & Stock",
      subtitle: "Organize categories, set low-stock thresholds, and track your inventory in real time.",
      instructions: [
        {
          title: "Add Single or Bulk Products",
          desc: "Click '+ Add Product' to specify name, selling price, MRP, purchase rate, and barcode. For large stores, use the CSV Import feature to load hundreds of items at once."
        },
        {
          title: "Barcode Generation & Scanning",
          desc: "If an item doesn't have a manufacturer barcode, Slipzen can auto-generate a unique barcode that you can print on stickers."
        },
        {
          title: "Low Stock Alerts",
          desc: "Set minimum threshold levels (e.g. 5 units). When stock runs low, Slipzen highlights the item with an amber badge so you can reorder in time."
        },
        {
          title: "Quick Price Updates",
          desc: "Update selling prices anytime from the Products desk. Changes take effect on the new bill desk immediately."
        }
      ],
      proTip: "Keep your barcode scanner in auto-sensing mode so you can simply wave products under the beam for frictionless counter billing.",
      actionText: "Manage Products Now",
      actionView: "products"
    },
    {
      id: "restaurant",
      label: "Dine-In Tables & KOT",
      icon: Utensils,
      title: "Restaurant Tables & Kitchen Tickets (KOT)",
      subtitle: "Manage dining floor tables, print kitchen orders, and merge bills effortlessly.",
      instructions: [
        {
          title: "View Floor Status at a Glance",
          desc: "See which tables are vacant (gray), occupied (green), or waiting for settlement (amber) on an interactive visual floor map."
        },
        {
          title: "Punch Orders & Print KOT",
          desc: "Select a table, add food items, and click 'Send KOT'. A Kitchen Order Ticket prints immediately on your kitchen printer without prices, letting chefs start cooking."
        },
        {
          title: "Add Running Orders",
          desc: "When customers order extra rotis, drinks, or desserts, open the active table and add items. A supplementary KOT prints for only the new items."
        },
        {
          title: "Merge Tables & Settle Bill",
          desc: "Easily merge two tables for large parties or transfer an order from Table 2 to Table 5 in one tap. Once done, print the final bill and clear the table."
        }
      ],
      proTip: "Waiters can use Slipzen directly from an Android mobile phone to take orders tableside, sending KOTs to the kitchen instantly!",
      actionText: "Go to Tables Management",
      actionView: "tables"
    },
    {
      id: "printers",
      label: "Thermal Printers",
      icon: Printer,
      title: "Connecting Bluetooth & USB Thermal Printers",
      subtitle: "Setup 58mm (2-inch) and 80mm (3-inch) ESC/POS thermal receipt printers.",
      instructions: [
        {
          title: "Bluetooth Mobile Printers (Android)",
          desc: "Turn on Bluetooth on your phone, pair with your printer (common PIN: 0000 or 1234). In Slipzen, select your paired Bluetooth printer for silent direct printing."
        },
        {
          title: "USB & LAN Printers (Desktop / Laptop)",
          desc: "Plug your thermal printer via USB. Install the manufacturer's POS driver. Slipzen automatically utilizes standard system printing dialogs formatted to 58mm or 80mm."
        },
        {
          title: "Thermal Paper Size Setting",
          desc: "Go to Shop Profile and select your printer width: 58mm (ideal for small receipts & mobile setups) or 80mm (spacious format for detailed bills)."
        },
        {
          title: "Print Without Margin Cuts",
          desc: "In your browser print dialog, set Margins to 'None' and disable 'Headers and Footers' to get crisp, edge-to-edge receipts without blank paper waste."
        }
      ],
      proTip: "Always test a sample print after pairing a new printer to ensure thermal alignment and auto-cutter function are properly enabled.",
      actionText: "Configure Printer Width",
      actionView: "shop"
    },
    {
      id: "templates",
      label: "Bill Templates",
      icon: LayoutTemplate,
      title: "Customizing Receipt Layouts & Logo",
      subtitle: "Make your invoices look professional with custom headers, QR codes, and footers.",
      instructions: [
        {
          title: "Choose From Multiple Layouts",
          desc: "Slipzen includes Classic Retail, Modern Minimal, Restaurant Dine-in, and Compact Thermal formats designed for high readability."
        },
        {
          title: "Upload Your Shop Logo",
          desc: "Upload a clean monochrome or color logo in Shop Profile. It prints cleanly at the top of your bills and appears on digital PDFs."
        },
        {
          title: "UPI QR Code for Instant Payments",
          desc: "Add your UPI ID (e.g. yourname@upi) in Shop Profile. Slipzen generates a scannable payment QR code directly on the printed receipt for customers to scan."
        },
        {
          title: "Custom Footer Greetings & Terms",
          desc: "Add custom return policies, warranty notes, or friendly messages like 'Thank you! Visit again!' at the bottom of every bill."
        }
      ],
      proTip: "Ensure your shop phone number and address are up to date on your template so customers can easily contact you for reorders.",
      actionText: "Browse All Templates",
      actionView: "templates"
    },
    {
      id: "analytics",
      label: "Reports & Udhar",
      icon: BarChart3,
      title: "Daily Sales, Bill History & Customer Credit",
      subtitle: "Track cash vs UPI collections, reprint past bills, and recover customer credit.",
      instructions: [
        {
          title: "View Today's Revenue & Payment Split",
          desc: "Check your dashboard for real-time sales numbers, including how much was collected via UPI vs Cash in hand."
        },
        {
          title: "Search Past Bills & 1-Click Reprint",
          desc: "Go to Bill History to search any past receipt by bill number, customer phone number, or date. Reprint duplicate receipts in seconds."
        },
        {
          title: "Customer Udhar (Khata / Credit Ledger)",
          desc: "Record pending payments against customer names and phone numbers. See who owes money at a glance and send WhatsApp payment reminders."
        },
        {
          title: "Audit & Cancel Bills",
          desc: "If a mistake is made, authorized staff can cancel a bill with a documented reason, keeping stock numbers and registers accurate."
        }
      ],
      proTip: "Review your daily sales summary at the end of each day before closing your cash drawer to ensure cash totals match your register.",
      actionText: "View Bill History",
      actionView: "history"
    }
  ]

  const faqs = [
    {
      q: "Can I use Slipzen when there is no internet connection?",
      a: "Yes! Slipzen has built-in offline resilience. You can create bills, lookup cached inventory, and print receipts even during internet drops. When the connection resumes, your data synchronizes automatically with the cloud."
    },
    {
      q: "How do I remove browser headers and footers from printed receipts?",
      a: "When the browser print dialog appears, expand 'More settings', uncheck 'Headers and footers', and set 'Margins' to 'None' or 'Minimum'. Your browser remembers this preference for future prints."
    },
    {
      q: "How do I print directly to a Bluetooth thermal printer on my phone?",
      a: "First, pair the Bluetooth printer in your phone's Android Bluetooth settings. Open Slipzen, create a bill, and tap 'Print'. Select your paired thermal printer from the available list."
    },
    {
      q: "How do I change the language of the application?",
      a: "Click on the globe / language selector icon in the top header or sidebar. Slipzen supports English, Hindi (हिन्दी), and Marathi (मराठी) across the entire interface."
    },
    {
      q: "Can I use a physical barcode scanner gun with Slipzen?",
      a: "Absolutely. Standard USB and wireless barcode scanners act as keyboard input. When you scan a product, Slipzen instantly detects the barcode number and adds the item to the bill."
    },
    {
      q: "How do I export my sales or customer data?",
      a: "In the Bill History and Products sections, look for the 'Export to CSV / Excel' button to download comprehensive spreadsheets for your accountant or tax filings."
    }
  ]

  // Filter topics or FAQs by search query
  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return topics
    const q = searchQuery.toLowerCase()
    return topics.filter(t => 
      t.title.toLowerCase().includes(q) ||
      t.subtitle.toLowerCase().includes(q) ||
      t.label.toLowerCase().includes(q) ||
      t.instructions.some(i => i.title.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q))
    )
  }, [searchQuery, topics])

  const currentTopic = useMemo(() => {
    return filteredTopics.find(t => t.id === activeTab) || filteredTopics[0] || topics[0]
  }, [filteredTopics, activeTab])

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs
    const q = searchQuery.toLowerCase()
    return faqs.filter(f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
  }, [searchQuery, faqs])

  return (
    <div className="user-guide-page">
      {/* Hero Banner */}
      <div className="guide-hero">
        <div className="guide-hero-content">
          <div className="guide-hero-badge">
            <Sparkles size={13} />
            <span>{tDb("SLIPZEN HELP CENTER & GUIDE")}</span>
          </div>
          <h1>{t("guide.welcome", "Welcome to Slipzen")}, {user?.name || "Business Owner"}!</h1>
          <p>
            {tDb("Everything you need to master fast billing, barcode inventory, dine-in tables, thermal printers, and daily sales tracking for your business.")}
          </p>

          <div className="guide-search-wrap">
            <Search size={18} className="guide-search-icon" />
            <input 
              type="text"
              placeholder="Search help topics (e.g. thermal print, barcode, tables, GST, Udhar)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="guide-search-input"
            />
          </div>
        </div>
      </div>

      {/* Quick Start Checklist */}
      {!searchQuery && (
        <section className="guide-quickstart-section">
          <div className="guide-section-header">
            <h2>
              <CheckCircle2 size={22} color="#0284c7" />
              <span>{tDb("4-Step Quick Launch Checklist")}</span>
            </h2>
            <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>
              {tDb("Get fully operational in under 3 minutes")}
            </span>
          </div>

          <div className="guide-steps-grid">
            {quickStartSteps.map((step) => (
              <div key={step.num} className="guide-step-card">
                <div>
                  <div className="guide-step-number">{step.num}</div>
                  <h3>{tDb(step.title)}</h3>
                  <p>{tDb(step.desc)}</p>
                </div>
                <button 
                  type="button" 
                  className="guide-step-btn"
                  onClick={() => setView(step.targetView)}
                >
                  <span>{tDb(step.actionLabel)}</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Category Tabs */}
      <div className="guide-tabs-row">
        {topics.map((tItem) => {
          const IconComp = tItem.icon
          const isActive = currentTopic?.id === tItem.id
          return (
            <button
              key={tItem.id}
              type="button"
              className={`guide-tab-btn ${isActive ? "active" : ""}`}
              onClick={() => setActiveTab(tItem.id)}
            >
              <IconComp size={16} />
              <span>{tDb(tItem.label)}</span>
            </button>
          )
        })}
      </div>

      {/* Active Topic Detailed Guide */}
      {currentTopic && (
        <div className="guide-topic-container">
          <div className="guide-detail-card">
            <div className="guide-detail-header">
              <div className="guide-detail-title-group">
                <div className="guide-detail-icon-box">
                  <currentTopic.icon size={26} />
                </div>
                <div>
                  <h3>{tDb(currentTopic.title)}</h3>
                  <p>{tDb(currentTopic.subtitle)}</p>
                </div>
              </div>

              {currentTopic.actionText && (
                <button 
                  type="button" 
                  className="guide-step-btn"
                  style={{ background: "#0f172a", color: "#ffffff", borderColor: "#0f172a" }}
                  onClick={() => setView(currentTopic.actionView)}
                >
                  <span>{tDb(currentTopic.actionText)}</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>

            <div className="guide-content-grid">
              <div className="guide-instructions-list">
                {currentTopic.instructions.map((inst, idx) => (
                  <div key={idx} className="guide-instruction-item">
                    <div className="guide-item-bullet">{idx + 1}</div>
                    <div className="guide-item-text">
                      <h4>{tDb(inst.title)}</h4>
                      <p>{tDb(inst.desc)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div className="guide-pro-tip">
                  <div className="guide-tip-header">
                    <Zap size={16} />
                    <span>{tDb("PRO TIP")}</span>
                  </div>
                  <p>{tDb(currentTopic.proTip)}</p>
                  {currentTopic.actionView && (
                    <button 
                      type="button" 
                      className="guide-tip-action-btn"
                      onClick={() => setView(currentTopic.actionView)}
                    >
                      <span>{tDb("Try it now")}</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Frequently Asked Questions (FAQ) */}
      <section className="guide-faq-section">
        <div className="guide-section-header">
          <h2>
            <HelpCircle size={22} color="#059669" />
            <span>{tDb("Frequently Asked Questions")}</span>
          </h2>
        </div>

        <div className="guide-faq-list">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx
            return (
              <div key={idx} className="guide-faq-item">
                <button
                  type="button"
                  className="guide-faq-question"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                >
                  <span>{tDb(faq.q)}</span>
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {isOpen && (
                  <div className="guide-faq-answer">
                    <p style={{ margin: 0 }}>{tDb(faq.a)}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Support Card Footer */}
      <div className="guide-footer-support">
        <div className="guide-footer-text">
          <h3>{tDb("Need more assistance or custom setup?")}</h3>
          <p>{tDb("Our dedicated support team is here to help you configure printers, barcodes, and floor layouts.")}</p>
        </div>
        <div className="guide-footer-actions">
          <button 
            type="button" 
            className="guide-support-btn"
            onClick={() => setView("contact")}
          >
            <Mail size={16} />
            <span>{tDb("Contact Support")}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
