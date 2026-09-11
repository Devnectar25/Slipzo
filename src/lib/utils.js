import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

let rawApi = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://slipzo-api.vercel.app/api' : 'http://localhost:8000/api')).trim()

// Strip trailing slash
if (rawApi.endsWith('/')) {
  rawApi = rawApi.slice(0, -1)
}

// Ensure /api is at the end of external domain URLs if missing
if (rawApi.startsWith('http') && !rawApi.endsWith('/api') && !rawApi.includes('/api/')) {
  rawApi = `${rawApi}/api`
}

export const API = rawApi

// ============ HIGH-PERFORMANCE API CLIENT-SIDE CACHE ============
const memoryCache = new Map()
const CACHE_FRESH_MS = 30 * 1000 // 30 seconds fresh
const CACHE_STALE_MS = 5 * 60 * 1000 // 5 minutes stale (can serve while revalidating)

export const clearApiCache = () => {
  memoryCache.clear()
  try {
    const keys = Object.keys(sessionStorage)
    for (const k of keys) {
      if (k.startsWith('slipzo_cache_')) {
        sessionStorage.removeItem(k)
      }
    }
  } catch (e) {}
}

export const invalidateApiCache = (pattern) => {
  for (const key of memoryCache.keys()) {
    if (!pattern || key.includes(pattern)) {
      memoryCache.delete(key)
    }
  }
  try {
    const keys = Object.keys(sessionStorage)
    for (const k of keys) {
      if (k.startsWith('slipzo_cache_') && (!pattern || k.includes(pattern))) {
        sessionStorage.removeItem(k)
      }
    }
  } catch (e) {}
}

export const getCachedData = (path) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const mem = memoryCache.get(cleanPath)
  if (mem && (Date.now() - mem.timestamp < CACHE_STALE_MS)) {
    return mem.data
  }
  try {
    const raw = sessionStorage.getItem(`slipzo_cache_${cleanPath}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Date.now() - parsed.timestamp < CACHE_STALE_MS) {
        memoryCache.set(cleanPath, parsed)
        return parsed.data
      }
    }
  } catch (e) {}
  return null
}

export const call = async (path, options = {}) => {
  // Ensure path starts with slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  
  // Strip duplicate /api prefix if path already includes it
  let cleanPath = normalizedPath
  if (API.endsWith('/api') && cleanPath.startsWith('/api/')) {
    cleanPath = cleanPath.substring(4)
  }
  
  const method = (options.method || 'GET').toUpperCase()
  const isGet = method === 'GET'
  const cacheKey = cleanPath

  // Invalidate cache on mutations
  if (!isGet) {
    if (cleanPath.startsWith('/templates')) invalidateApiCache('/templates')
    else if (cleanPath.startsWith('/bills')) {
      invalidateApiCache('/bills')
      invalidateApiCache('/bills/stats')
    }
    else if (cleanPath.startsWith('/products')) invalidateApiCache('/products')
    else if (cleanPath.startsWith('/shop')) invalidateApiCache('/shop')
    else if (cleanPath.startsWith('/customers')) invalidateApiCache('/customers')
    else if (cleanPath.startsWith('/auth/logout')) clearApiCache()
  }

  // SWR: Check cache for GET requests
  if (isGet && !options.noCache) {
    let cached = memoryCache.get(cacheKey)
    if (!cached) {
      try {
        const raw = sessionStorage.getItem(`slipzo_cache_${cacheKey}`)
        if (raw) {
          cached = JSON.parse(raw)
          memoryCache.set(cacheKey, cached)
        }
      } catch (e) {}
    }

    if (cached) {
      const age = Date.now() - cached.timestamp
      // If data is still completely fresh (< 30s), return immediately
      if (age < CACHE_FRESH_MS) {
        return cached.data
      }

      // If data is stale (< 5 mins), return stale data immediately and revalidate in background
      if (age < CACHE_STALE_MS) {
        // Trigger background revalidation without blocking caller
        revalidateInBackground(cleanPath, options)
        return cached.data
      }
    }
  }

  return executeFetch(cleanPath, options)
}

const revalidateInBackground = async (cleanPath, options) => {
  try {
    await executeFetch(cleanPath, { ...options, isRevalidation: true })
  } catch (e) {
    // Ignore background revalidation errors
  }
}

const executeFetch = async (cleanPath, options = {}) => {
  const url = `${API}${cleanPath}`
  const method = (options.method || 'GET').toUpperCase()
  const isGet = method === 'GET'
  
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

    // Store successful GET responses in cache
    if (isGet && !options.noCache) {
      const cacheItem = { data, timestamp: Date.now() }
      memoryCache.set(cleanPath, cacheItem)
      try {
        sessionStorage.setItem(`slipzo_cache_${cleanPath}`, JSON.stringify(cacheItem))
      } catch (e) {}
    }
    
    return data
  } catch (err) {
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