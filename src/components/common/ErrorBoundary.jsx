import React from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import i18n from "../../i18n/i18n"

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="error-boundary-container fade-in">
          <div className="error-boundary-card">
            <div className="error-icon-wrapper">
              <AlertTriangle size={36} />
            </div>
            <h2>{i18n.t("errorBoundary.title", "Something went wrong")}</h2>
            <p className="error-desc">
              {i18n.t("errorBoundary.body", "We encountered an unexpected problem in this view. Don't worry, your data is safe.")}
            </p>
            {this.state.error?.message && (
              <div className="error-details-box">
                <code>{this.state.error.message}</code>
              </div>
            )}
            <div className="error-boundary-actions">
              <button
                className="primary-button"
                onClick={this.handleReset}
              >
                <RefreshCw size={16} /> {i18n.t("errorBoundary.retry", "Try Again")}
              </button>
              <button
                className="secondary-button"
                onClick={this.handleReload}
              >
                {i18n.t("errorBoundary.reload", "Reload App")}
              </button>
              {this.props.onGoHome && (
                <button
                  className="ghost-button"
                  onClick={this.props.onGoHome}
                >
                  <Home size={16} /> {i18n.t("errorBoundary.home", "Return to Home")}
                </button>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
