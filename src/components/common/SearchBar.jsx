import React from "react"
import { Search, X } from "lucide-react"
import VoiceInputButton from "./VoiceInputButton"
import "./SearchBar.css"

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  onVoiceResult,
  onClear,
  className = "",
  style = {},
  autoFocus = false,
  dataTestId,
  id,
  showVoice = true
}) {
  const handleClear = () => {
    if (onClear) {
      onClear()
    } else if (onChange) {
      onChange("")
    }
  }

  return (
    <div className={`slipzo-search-bar ${className}`} style={style}>
      <Search size={18} className="slipzo-search-icon" />
      <input
        type="text"
        id={id}
        data-testid={dataTestId}
        className="slipzo-search-input"
        placeholder={placeholder}
        value={value || ""}
        onChange={(e) => onChange && onChange(e.target.value)}
        autoFocus={autoFocus}
      />
      {value ? (
        <button
          type="button"
          className="slipzo-search-clear-btn"
          onClick={handleClear}
          title="Clear search"
          aria-label="Clear search"
        >
          <X size={15} />
        </button>
      ) : null}
      {showVoice && onVoiceResult ? (
        <VoiceInputButton
          onSpeechResult={onVoiceResult}
          variant="icon-only"
          placeholder={placeholder}
        />
      ) : null}
    </div>
  )
}
