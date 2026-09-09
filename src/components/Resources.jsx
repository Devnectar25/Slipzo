import { ArrowRight, BookOpen, Video, FileText, Users, MessageSquare, Zap } from "lucide-react"

export function Resources({ setView, setShowAuth }) {
  const resources = [
    {
      icon: <BookOpen size={24} />,
      title: "Getting Started Guide",
      description: "Learn the basics of Slipzo in 5 minutes. Create your first receipt.",
      type: "Guide",
      time: "5 min read"
    },
    {
      icon: <Video size={24} />,
      title: "Video Tutorials",
      description: "Watch step-by-step tutorials on how to use Slipzo effectively.",
      type: "Video",
      time: "10 min watch"
    },
    {
      icon: <FileText size={24} />,
      title: "Documentation",
      description: "Comprehensive documentation covering all features and settings.",
      type: "Docs",
      time: "Full reference"
    },
    {
      icon: <Users size={24} />,
      title: "Community Forum",
      description: "Join our community of shop owners. Share tips and get help.",
      type: "Community",
      time: "Active"
    },
    {
      icon: <MessageSquare size={24} />,
      title: "Blog",
      description: "Read articles about billing, shop management, and business tips.",
      type: "Blog",
      time: "Weekly posts"
    },
    {
      icon: <Zap size={24} />,
      title: "Tips & Tricks",
      description: "Discover pro tips to make your billing even faster and easier.",
      type: "Tips",
      time: "Quick read"
    }
  ]

  return (
    <div className="resources-page">
      {/* Header */}
      <section className="resources-header">
        <div className="resources-header-content">
          <p className="eyebrow">RESOURCES</p>
          <h1>Learn everything about<br />Slipzo</h1>
          <p className="header-description">
            Guides, tutorials, and resources to help you make the most of Slipzo.
            From first receipt to pro user.
          </p>
        </div>
      </section>

      {/* Resources Grid */}
      <section className="resources-grid-section">
        <div className="resources-grid">
          {resources.map((resource, index) => (
            <div className="resource-card" key={index}>
              <div className="resource-icon">{resource.icon}</div>
              <div className="resource-content">
                <div className="resource-meta">
                  <span className="resource-type">{resource.type}</span>
                  <span className="resource-time">{resource.time}</span>
                </div>
                <h3>{resource.title}</h3>
                <p>{resource.description}</p>
                <button className="resource-link">
                  Learn more <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Help Section */}
      <section className="resources-help">
        <div className="help-content">
          <h2>Need more help?</h2>
          <p>Our support team is here to help you with any questions.</p>
          <button className="cta-button secondary" onClick={() => setView("support")}>
            Visit Support <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </div>
  )
}