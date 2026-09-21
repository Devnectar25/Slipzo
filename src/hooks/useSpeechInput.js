import { useState, useEffect, useRef, useCallback } from "react"

/**
 * Helper to remove trailing punctuation (. ? ! , ; :) auto-appended by speech recognition engines
 */
export function cleanSpeechText(text) {
  if (!text || typeof text !== "string") return ""
  return text.trim().replace(/\s*[.,!?;:]+$/, "").trim()
}

/**
 * Helper to parse spoken text into Menu Item Name and Price
 * Examples:
 *  "Coffee 50 rupees" => { name: "Coffee", price: "50" }
 *  "Paneer Butter Masala price 220" => { name: "Paneer Butter Masala", price: "220" }
 *  "Tea 15" => { name: "Tea", price: "15" }
 */
export function parseMenuItemSpeech(transcript) {
  if (!transcript || typeof transcript !== "string") {
    return { name: "", price: "" }
  }

  const clean = cleanSpeechText(transcript)
  
  // Regex to capture trailing or embedded price: "price 150", "rs 150", "150 rupees", "150 rs", "for 150", or standalone number at end
  const priceRegex = /(?:price|cost|rs\.?|rupees|for)?\s*(\d+(?:\.\d{1,2})?)\s*(?:rupees|rs\.?|price)?/i
  const match = clean.match(priceRegex)

  if (match && match[1]) {
    const priceVal = match[1]
    // Remove the price matching segment to isolate item name
    let nameVal = clean.replace(match[0], "").trim()
    
    // Clean up trailing words like "price", "rs", "rupees", "for", "-"
    nameVal = nameVal.replace(/(?:price|cost|rs\.?|rupees|for)\s*$/i, "").trim()
    nameVal = nameVal.replace(/^[-:]\s*/, "").trim()
    nameVal = cleanSpeechText(nameVal)

    // Capitalize first letter of item name
    if (nameVal) {
      nameVal = nameVal.charAt(0).toUpperCase() + nameVal.slice(1)
    }

    return { name: nameVal || clean, price: priceVal }
  }

  // If no price digit was found, treat entire text as name
  const formattedName = clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : ""
  return { name: formattedName, price: "" }
}

/**
 * Helper to parse spoken text into Shop Profile fields (Name, Phone, Address)
 * Examples:
 *  "Shop name Golden Bakery phone 9876543210 address 12 MG Road"
 */
export function parseShopProfileSpeech(transcript) {
  if (!transcript || typeof transcript !== "string") {
    return { name: "", phone: "", address: "" }
  }

  const text = cleanSpeechText(transcript)
  let name = ""
  let phone = ""
  let address = ""

  // Extract phone number (10 digits)
  const phoneMatch = text.match(/(?:phone|mobile|call|number)?\s*(\+?[0-9\s-]{10,15})/i)
  if (phoneMatch && phoneMatch[1]) {
    const rawDigits = phoneMatch[1].replace(/[^0-9+]/g, "")
    if (rawDigits.length >= 10) {
      phone = rawDigits
    }
  }

  // Extract shop name keyword: "shop name X", "name X"
  const nameMatch = text.match(/(?:shop\s*name|store\s*name|name)\s*(?:is|=|:)?\s*([a-zA-Z0-9\s&'-]+?)(?=\s*(?:phone|mobile|address|location|$))/i)
  if (nameMatch && nameMatch[1]) {
    name = cleanSpeechText(nameMatch[1].trim())
  }

  // Extract address keyword: "address X", "location X"
  const addressMatch = text.match(/(?:address|location)\s*(?:is|=|:)?\s*(.+)$/i)
  if (addressMatch && addressMatch[1]) {
    address = cleanSpeechText(addressMatch[1].trim())
  }

  // If no keyword patterns matched, return entire text as shop name if no digits present
  if (!name && !phone && !address) {
    if (/^\d{10,12}$/.test(text.replace(/[^0-9]/g, ""))) {
      phone = text.replace(/[^0-9+]/g, "")
    } else {
      const cleaned = cleanSpeechText(text)
      name = cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : ""
    }
  }

  return { name, phone, address }
}

export function useSpeechInput() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [isMicrophoneAvailable, setIsMicrophoneAvailable] = useState(true)

  const recognitionRef = useRef(null)
  const isListeningRef = useRef(false)

  // Web Speech API check (standard and webkit prefixed for Chrome/Edge/Safari/Opera)
  const isWebSpeechSupported = typeof window !== "undefined" && Boolean(
    window.SpeechRecognition || window.webkitSpeechRecognition
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch (e) {}
        recognitionRef.current = null
      }
    }
  }, [])

  const stopListening = useCallback(() => {
    isListeningRef.current = false
    setIsListening(false)
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {}
    }
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript("")
    setInterimTranscript("")
    setErrorMsg("")
  }, [])

  const startListening = useCallback((options = {}) => {
    setErrorMsg("")
    setTranscript("")
    setInterimTranscript("")

    if (!isWebSpeechSupported) {
      setErrorMsg("Speech recognition is not supported in this browser.")
      return
    }

    // Stop existing recognition instance if any
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch (e) {}
      recognitionRef.current = null
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      setErrorMsg("Speech recognition is not supported in this browser.")
      return
    }

    const recognition = new SpeechRecognitionAPI()

    // Single-shot or continuous listening
    recognition.continuous = options.continuous ?? false
    recognition.interimResults = options.interimResults ?? true
    recognition.lang = options.language || (typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US") || "en-US"

    recognition.onstart = () => {
      isListeningRef.current = true
      setIsListening(true)
      setIsMicrophoneAvailable(true)
      setErrorMsg("")
    }

    recognition.onresult = (event) => {
      let finalStr = ""
      let interimStr = ""

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0]?.transcript || ""
        if (result.isFinal) {
          finalStr += (finalStr && !finalStr.endsWith(" ") ? " " : "") + text
        } else {
          interimStr += (interimStr && !interimStr.endsWith(" ") ? " " : "") + text
        }
      }

      const rawCombined = (finalStr + (interimStr ? (finalStr ? " " : "") + interimStr : "")).trim()
      const currentTranscript = cleanSpeechText(rawCombined)
      const currentInterim = cleanSpeechText(interimStr)

      setTranscript(currentTranscript)
      setInterimTranscript(currentInterim)

      if (options.onResult) {
        options.onResult(currentTranscript)
      }
    }

    recognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error)
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setErrorMsg("Microphone access denied. Please allow microphone permissions.")
        setIsMicrophoneAvailable(false)
      } else if (event.error === "network") {
        setErrorMsg("Network error: speech service temporarily unavailable.")
      } else if (event.error === "audio-capture") {
        setErrorMsg("No microphone was detected on your device.")
        setIsMicrophoneAvailable(false)
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setErrorMsg(`Speech recognition error: ${event.error}`)
      }
      isListeningRef.current = false
      setIsListening(false)
    }

    recognition.onend = () => {
      isListeningRef.current = false
      setIsListening(false)
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch (err) {
      console.warn("Speech recognition start failed:", err)
      if (err.name !== "InvalidStateError") {
        setErrorMsg("Could not start speech recognition.")
        setIsListening(false)
      }
    }
  }, [isWebSpeechSupported])

  return {
    isListening,
    transcript,
    interimTranscript,
    browserSupportsSpeech: isWebSpeechSupported,
    isMicrophoneAvailable,
    errorMsg,
    startListening,
    stopListening,
    resetTranscript
  }
}

