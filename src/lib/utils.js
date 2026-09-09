import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const API = import.meta.env.VITE_API_URL || '/api'

export const call = async (path, options = {}) => {
  // Ensure path starts with slash if not full URL
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = API.startsWith('http') ? `${API}${normalizedPath}` : `${API}${normalizedPath}`
  console.log(`📡 API Call: ${options.method || 'GET'} ${url}`)
  
  try {
    const response = await fetch(url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      ...options
    })
    
    console.log(`📡 Response status: ${response.status}`)
    
    // Check if server returned HTML (e.g. Vercel SPA index.html fallback) instead of JSON
    const contentType = response.headers.get("content-type") || ""
    if (contentType.includes("text/html")) {
      console.warn(`⚠️ API returned HTML instead of JSON for ${url}`)
      throw new Error("API endpoint unavailable")
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
    
    console.log(`✅ API Success:`, data)
    return data
  } catch (err) {
    console.error(`❌ API Call Failed:`, err)
    throw err
  }
}

export const money = (n) => `₹${Number(n || 0).toFixed(2)}`

export const now = () => new Date().toISOString()

// ============ TEMPLATE USAGE TRACKING ============
// Track template usage in localStorage for non-logged-in users

export const getTemplateUsage = (templateId) => {
  const key = `template_usage_${templateId}`
  const data = localStorage.getItem(key)
  if (data) {
    try {
      return JSON.parse(data)
    } catch {
      return { edits: 0, prints: 0 }
    }
  }
  return { edits: 0, prints: 0 }
}

export const incrementTemplateEdit = (templateId) => {
  const usage = getTemplateUsage(templateId)
  usage.edits += 1
  localStorage.setItem(`template_usage_${templateId}`, JSON.stringify(usage))
  return usage
}

export const incrementTemplatePrint = (templateId) => {
  const usage = getTemplateUsage(templateId)
  usage.prints += 1
  localStorage.setItem(`template_usage_${templateId}`, JSON.stringify(usage))
  return usage
}

export const canEditTemplate = (templateId) => {
  const usage = getTemplateUsage(templateId)
  return usage.edits < 2
}

export const canPrintTemplate = (templateId) => {
  const usage = getTemplateUsage(templateId)
  return usage.prints < 10
}

export const getRemainingEdits = (templateId) => {
  const usage = getTemplateUsage(templateId)
  return Math.max(0, 2 - usage.edits)
}

export const getRemainingPrints = (templateId) => {
  const usage = getTemplateUsage(templateId)
  return Math.max(0, 10 - usage.prints)
}

export const getTemplateUsageStatus = (templateId) => {
  const usage = getTemplateUsage(templateId)
  return {
    edits: usage.edits,
    prints: usage.prints,
    remainingEdits: Math.max(0, 2 - usage.edits),
    remainingPrints: Math.max(0, 10 - usage.prints),
    canEdit: usage.edits < 2,
    canPrint: usage.prints < 10
  }
}