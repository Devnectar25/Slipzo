import { useEffect, useState, useRef } from "react"
import { Mic, Sparkles, Volume2, AlertCircle } from "lucide-react"
import { useSpeechInput, parseMenuItemSpeech, parseShopProfileSpeech } from "../../hooks/useSpeechInput"

export function VoiceInputButton({
  onSpeechResult,
  onParsedResult,
  mode = "raw", // "raw" | "menu" | "shop"
  label = "",
  placeholder = "Click & Speak",
  size = "md", // "sm" | "md" | "lg"
  variant = "icon-only", // "icon-only" | "button" | "pill"
  style = {},
  className = ""
}) {
  const {
    isListening,
    transcript,
    browserSupportsSpeech,
    errorMsg,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechInput()

  const [showTooltip, setShowTooltip] = useState(false)
  const prevListeningRef = useRef(false)
  const onSpeechResultRef = useRef(onSpeechResult)
  const onParsedResultRef = useRef(onParsedResult)

  useEffect(() => {
    onSpeechResultRef.current = onSpeechResult
    onParsedResultRef.current = onParsedResult
  })

  // Manage tooltip visibility: show while listening, keep visible briefly after stopping
  useEffect(() => {
    if (isListening) {
      setShowTooltip(true)
      prevListeningRef.current = true
    } else if (prevListeningRef.current) {
      prevListeningRef.current = false
      const timer = setTimeout(() => {
        setShowTooltip(false)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [isListening])

  // Deliver live and final transcript to callbacks as speech arrives
  useEffect(() => {
    if (transcript && transcript.trim()) {
      if (onSpeechResultRef.current) {
        onSpeechResultRef.current(transcript)
      }

      if (onParsedResultRef.current) {
        if (mode === "menu") {
          const parsed = parseMenuItemSpeech(transcript)
          onParsedResultRef.current(parsed)
        } else if (mode === "shop") {
          const parsed = parseShopProfileSpeech(transcript)
          onParsedResultRef.current(parsed)
        }
      }
    }
  }, [transcript, mode])

  const toggleListen = (e) => {
    e?.preventDefault()
    e?.stopPropagation()

    if (!browserSupportsSpeech) {
      alert("Speech Recognition is not supported in your current browser. Please try Google Chrome, Microsoft Edge, or Safari.")
      return
    }

    if (isListening) {
      stopListening()
    } else {
      resetTranscript()
      startListening()
    }
  }

  // Sizing definitions
  const sizeStyles = {
    sm: { height: "28px", padding: "0 8px", fontSize: "0.75rem", iconSize: 13 },
    md: { height: "34px", padding: "0 10px", fontSize: "0.82rem", iconSize: 15 },
    lg: { height: "42px", padding: "0 14px", fontSize: "0.9rem", iconSize: 18 }
  }
  const currentSize = sizeStyles[size] || sizeStyles.md

  if (variant === "button" || variant === "pill") {
    return (
      <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
        <button
          type="button"
          onClick={toggleListen}
          title={isListening ? "Listening... Click to stop" : (placeholder || "Click & Speak")}
          className={`voice-input-btn ${isListening ? "listening" : ""} ${className}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.45rem",
            height: currentSize.height,
            padding: currentSize.padding,
            fontSize: currentSize.fontSize,
            fontWeight: "600",
            borderRadius: variant === "pill" ? "50px" : "8px",
            border: isListening ? "1px solid #ef4444" : "1px solid #cbd5e1",
            background: isListening ? "#fef2f2" : "#ffffff",
            color: isListening ? "#dc2626" : "#334155",
            cursor: "pointer",
            outline: "none",
            transition: "all 0.2s ease",
            boxShadow: isListening ? "0 0 0 3px rgba(239, 68, 68, 0.2)" : "0 1px 2px rgba(0,0,0,0.05)",
            ...style
          }}
        >
          {isListening ? (
            <>
              <span className="speech-pulse-dot" />
              <Volume2 size={currentSize.iconSize} className="speech-icon-anim" />
              <span>Listening...</span>
            </>
          ) : (
            <>
              <Mic size={currentSize.iconSize} style={{ color: "#0284c7" }} />
              {label ? <span>{label}</span> : <span>Voice Input</span>}
            </>
          )}
        </button>

        {/* Live speech transcript preview overlay */}
        {showTooltip && (transcript || isListening) && (
          <div className="speech-transcript-tooltip">
            <Sparkles size={13} style={{ color: "#38bdf8", flexShrink: 0 }} />
            <span style={{ fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {transcript ? `"${transcript}"` : "Listening... speak now"}
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="speech-error-tooltip">
            <AlertCircle size={12} style={{ color: "#f87171", flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <style>{`
          .speech-pulse-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: #ef4444;
            animation: pulse-ring 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          @keyframes pulse-ring {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(1.3); }
          }
          .speech-icon-anim {
            animation: bounce-wave 0.8s ease-in-out infinite alternate;
          }
          @keyframes bounce-wave {
            0% { transform: translateY(0); }
            100% { transform: translateY(-2px); }
          }
          .speech-transcript-tooltip {
            position: absolute;
            bottom: calc(100% + 6px);
            left: 50%;
            transform: translateX(-50%);
            background: #0f172a;
            color: #ffffff;
            font-size: 0.76rem;
            padding: 4px 10px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            display: flex;
            align-items: center;
            gap: 6px;
            z-index: 100;
            max-width: 250px;
            pointer-events: none;
          }
          .speech-error-tooltip {
            position: absolute;
            top: calc(100% + 6px);
            left: 50%;
            transform: translateX(-50%);
            background: #450a0a;
            color: #fecaca;
            border: 1px solid #f87171;
            font-size: 0.72rem;
            padding: 3px 8px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 4px;
            z-index: 100;
            white-space: nowrap;
          }
        `}</style>
      </div>
    )
  }

  // Default: Icon-only variant for embedding inside or next to input fields
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        type="button"
        onClick={toggleListen}
        title={isListening ? "Listening... Click to stop" : (placeholder || "Click to speak")}
        className={`voice-mic-icon-btn ${isListening ? "active listening" : ""} ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: currentSize.height,
          height: currentSize.height,
          borderRadius: "8px",
          border: isListening ? "1.5px solid #ef4444" : "1.5px solid transparent",
          background: isListening ? "#fef2f2" : "transparent",
          color: isListening ? "#dc2626" : "#0284c7",
          cursor: "pointer",
          outline: "none",
          transition: "all 0.2s ease",
          boxShadow: isListening ? "0 0 0 2px rgba(239, 68, 68, 0.2)" : "none",
          ...style
        }}
      >
        {isListening ? (
          <Volume2 size={currentSize.iconSize} className="speech-icon-anim" style={{ color: "#ef4444" }} />
        ) : (
          <Mic size={currentSize.iconSize} style={{ color: "#0284c7" }} />
        )}
      </button>

      {/* Floating transcript tooltip */}
      {showTooltip && (transcript || isListening) && (
        <div className="speech-transcript-tooltip">
          <Sparkles size={12} style={{ color: "#38bdf8", flexShrink: 0 }} />
          <span style={{ fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {transcript ? `"${transcript}"` : "Listening..."}
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="speech-error-tooltip">
          <AlertCircle size={12} style={{ color: "#f87171", flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      <style>{`
        .voice-mic-icon-btn:hover {
          background: rgba(2, 132, 199, 0.08) !important;
        }
        .voice-mic-icon-btn:focus-visible {
          outline: 2px solid #0284c7;
          outline-offset: 1px;
        }
        .speech-icon-anim {
          animation: bounce-wave 0.8s ease-in-out infinite alternate;
        }
        @keyframes bounce-wave {
          0% { transform: translateY(0); }
          100% { transform: translateY(-2px); }
        }
        .speech-transcript-tooltip {
          position: absolute;
          bottom: calc(100% + 6px);
          right: 0;
          background: #0f172a;
          color: #ffffff;
          font-size: 0.75rem;
          padding: 4px 8px;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          gap: 6px;
          z-index: 100;
          max-width: 220px;
          pointer-events: none;
        }
        .speech-error-tooltip {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          background: #450a0a;
          color: #fecaca;
          border: 1px solid #f87171;
          font-size: 0.72rem;
          padding: 3px 6px;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          gap: 4px;
          z-index: 100;
          white-space: nowrap;
        }
      `}</style>
    </div>
  )
}
