import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

const defaultApiUrl = import.meta.env.PROD 
  ? 'https://slipzo-api.vercel.app/api'
  : 'http://localhost:8000/api'

export const API = import.meta.env.VITE_API_URL || defaultApiUrl

export const call = async (path, options = {}) => {
  // Ensure path starts with slash if not full URL
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = API.startsWith('http') ? `${API}${normalizedPath}` : `${API}${normalizedPath}`
  console.log(`📡 API Call: ${options.method || 'GET'} ${url}`)
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('slipzo_token') : null

  try {
    const response = await fetch(url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        ...(options.headers || {})
      },
      ...options
    })
    
    console.log(`📡 Response status: ${response.status}`)
    
    // Check if server returned HTML (e.g. Vercel SPA index.html fallback) instead of JSON
    const contentType = response.headers.get("content-type") || ""
    if (contentType.includes("text/html")) {
      console.warn(`⚠️ API returned HTML instead of JSON for ${url}`)
      throw new Error("Unable to connect to Slipzo backend API server. Please check deployment URL.")
    }

    // Handle empty responses
    let data
    const text = await response.text()
    if (text) {
      try {
        data = JSON.parse(text)
      } catch (e) {
        data = { message: text }
      }
    } else {
      data = {}
    }
    
    if (!response.ok) {
      const errorMsg = Array.isArray(data.detail) ? data.detail[0]?.msg : data.detail || data.message || "Something went wrong"
      console.error(`❌ API Error (${response.status}):`, errorMsg)
      throw new Error(errorMsg)
    }

    if (data && data.token) {
      try {
        localStorage.setItem('slipzo_token', data.token)
      } catch (e) {}
    }
    
    console.log(`✅ API Success:`, data)
    return data
  } catch (err) {
    console.error(`❌ API Call Failed:`, err)
    if (err.message === 'Failed to fetch') {
      throw new Error("Failed to connect to backend server. Please verify https://slipzo-api.vercel.app is online.")
    }
    throw err
  }
}

export const money = (n) => `₹${Number(n || 0).toFixed(2)}`

export const now = () => new Date().toISOString()

// ============ TEMPLATE & GUEST PRINT USAGE TRACKING ============
// Track total guest free prints in localStorage (10 free prints limit)

export const getFreePrintCount = () => {
  try {
    const val = localStorage.getItem("slipzo_free_print_count")
    return val ? parseInt(val, 10) || 0 : 0
  } catch {
    return 0
  }
}

export const incrementFreePrintCount = () => {
  try {
    const current = getFreePrintCount()
    const next = current + 1
    localStorage.setItem("slipzo_free_print_count", String(next))
    return next
  } catch {
    return 1
  }
}

export const getRemainingFreePrints = () => {
  const used = getFreePrintCount()
  return Math.max(0, 10 - used)
}

export const canPrintFree = () => {
  return getFreePrintCount() < 10
}

export const getTemplateUsage = (templateId) => {
  const key = `template_usage_${templateId}`
  const data = localStorage.getItem(key)
  if (data) {
    try {
      return JSON.parse(data)
    } catch {
      return { edits: 0, prints: getFreePrintCount() }
    }
  }
  return { edits: 0, prints: getFreePrintCount() }
}

export const incrementTemplateEdit = (templateId) => {
  const usage = getTemplateUsage(templateId)
  usage.edits += 1
  localStorage.setItem(`template_usage_${templateId}`, JSON.stringify(usage))
  return usage
}

export const incrementTemplatePrint = (templateId) => {
  incrementFreePrintCount()
  const usage = getTemplateUsage(templateId)
  usage.prints = getFreePrintCount()
  localStorage.setItem(`template_usage_${templateId}`, JSON.stringify(usage))
  return usage
}

export const canEditTemplate = (templateId) => {
  const usage = getTemplateUsage(templateId)
  return usage.edits < 2
}

export const canPrintTemplate = (templateId) => {
  return canPrintFree()
}

export const getRemainingEdits = (templateId) => {
  const usage = getTemplateUsage(templateId)
  return Math.max(0, 2 - usage.edits)
}

export const getRemainingPrints = (templateId) => {
  return getRemainingFreePrints()
}

export const getTemplateUsageStatus = (templateId) => {
  const usage = getTemplateUsage(templateId)
  return {
    edits: usage.edits,
    prints: getFreePrintCount(),
    remainingEdits: Math.max(0, 2 - usage.edits),
    remainingPrints: getRemainingFreePrints(),
    canEdit: usage.edits < 2,
    canPrint: canPrintFree()
  }
}