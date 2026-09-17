import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

let customApi = typeof window !== 'undefined' ? localStorage.getItem('slipzo_custom_api_url') : null
let envApi = (import.meta.env.VITE_API_URL || '').trim()

// Detect if running inside Capacitor Android/iOS Native Webview
export const isNativeApp = typeof window !== 'undefined' && (
  Boolean(window.Capacitor?.isNativePlatform?.()) ||
  window.location.protocol === 'capacitor:' ||
  (window.location.protocol === 'http:' && window.location.hostname === 'localhost' && !window.location.port)
)

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (isNativeApp) {
    document.body?.classList?.add('is-native-app')
  }
}

let rawApi = customApi || envApi

if (isNativeApp) {
  // If a full HTTP(S) URL is explicitly provided, use it
  if (rawApi && rawApi.startsWith('http')) {
    // use configured rawApi
  } else {
    // Default to the live Vercel production backend API connected to Supabase PostgreSQL database
    rawApi = 'https://slipzo-api.vercel.app/api'
  }
} else {
  // Running in web browser
  if (!rawApi || rawApi === '/api') {
    rawApi = '/api'
  }
}

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
    const sKeys = Object.keys(sessionStorage)
    for (const k of sKeys) {
      if (k.startsWith('slipzo_cache_')) sessionStorage.removeItem(k)
    }
    const lKeys = Object.keys(localStorage)
    for (const k of lKeys) {
      if (k.startsWith('slipzo_cache_')) localStorage.removeItem(k)
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
    const sKeys = Object.keys(sessionStorage)
    for (const k of sKeys) {
      if (k.startsWith('slipzo_cache_') && (!pattern || k.includes(pattern))) {
        sessionStorage.removeItem(k)
      }
    }
    const lKeys = Object.keys(localStorage)
    for (const k of lKeys) {
      if (k.startsWith('slipzo_cache_') && (!pattern || k.includes(pattern))) {
        localStorage.removeItem(k)
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
    const raw = sessionStorage.getItem(`slipzo_cache_${cleanPath}`) || localStorage.getItem(`slipzo_cache_${cleanPath}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      // Allow up to 30 minutes stale window for instant initial render while revalidating
      if (Date.now() - parsed.timestamp < CACHE_STALE_MS * 6) {
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
    else if (cleanPath.startsWith('/products') || cleanPath.startsWith('/admin/products') || cleanPath.startsWith('/menu')) {
      invalidateApiCache('/products')
      invalidateApiCache('/admin/products')
      invalidateApiCache('/menu')
    }
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

  try {
    return await executeFetch(cleanPath, options)
  } catch (err) {
    throw err
  }
}

const revalidateInBackground = async (cleanPath, options) => {
  try {
    await executeFetch(cleanPath, { ...options, isRevalidation: true })
  } catch (e) {
    if (cleanPath.startsWith('/menu')) {
      try {
        const fallbackPath = cleanPath.replace('/menu', '/products')
        await executeFetch(fallbackPath, { ...options, isRevalidation: true })
      } catch (e2) {}
    }
  }
}

const executeFetch = async (cleanPath, options = {}) => {
  const url = `${API}${cleanPath}`
  const method = (options.method || 'GET').toUpperCase()
  const isGet = method === 'GET'
  
  const token = typeof window !== 'undefined' 
    ? (localStorage.getItem('slipzo_admin_token') || localStorage.getItem('slipzo_token')) 
    : null

  const { headers: customHeaders, ...restOptions } = options

  const defaultHeaders = {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...(customHeaders || {})
  }

  try {
    const response = await fetch(url, {
      credentials: "include",
      method,
      ...restOptions,
      headers: defaultHeaders
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
      
      if (response.status === 401) {
        try {
          localStorage.removeItem('slipzo_token')
          localStorage.removeItem('slipzo_user_info')
          localStorage.removeItem('slipzo_admin_token')
          sessionStorage.clear()
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('slipzo_auth_unauthorized'))
          }
        } catch (e) {}
      }

      throw new Error(errorMsg)
    }

    if (data && data.token) {
      try {
        localStorage.setItem('slipzo_token', data.token)
      } catch (e) {}
    }

    // Store successful GET responses in cache
    if (isGet && !options.noCache && response.ok) {
      const cacheItem = { data, timestamp: Date.now() }
      memoryCache.set(cleanPath, cacheItem)
      try {
        sessionStorage.setItem(`slipzo_cache_${cleanPath}`, JSON.stringify(cacheItem))
      } catch (e) {}
    }
    
    return data
  } catch (err) {
    if (err.message === 'Failed to fetch') {
      throw new Error(`Failed to connect to backend server (${API}). Please verify network connection.`)
    }
    throw err
  }
}

export const money = (n) => `₹${Number(n || 0).toFixed(2)}`

export const now = () => new Date().toISOString()

export const getCurrentUserKey = (user) => {
  if (typeof user === 'string' && user.trim()) return user.trim().toLowerCase()
  if (user && typeof user === 'object') {
    if (user.email) return String(user.email).trim().toLowerCase()
    if (user.id) return String(user.id).trim().toLowerCase()
  }
  try {
    const userRaw = typeof window !== 'undefined' ? localStorage.getItem('slipzo_user_info') : null
    if (userRaw) {
      const u = JSON.parse(userRaw)
      if (u?.email) return String(u.email).trim().toLowerCase()
      if (u?.id) return String(u.id).trim().toLowerCase()
    }
  } catch (e) {}
  return "guest"
}

export const getStoredMenuItems = (user) => {
  const key = getCurrentUserKey(user)
  try {
    const raw = localStorage.getItem(`slipzo_menu_items_${key}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (e) {}
  return []
}

export const saveStoredMenuItems = (items, user) => {
  const key = getCurrentUserKey(user)
  try {
    localStorage.setItem(`slipzo_menu_items_${key}`, JSON.stringify(items || []))
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("slipzo-menu-update", { detail: { userKey: key } }))
    }
  } catch (e) {}
}

export const getActivePlanDetails = (userKey) => {
  const key = getCurrentUserKey(userKey)
  try {
    const raw = localStorage.getItem(`slipzo_active_plan_${key}`)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch (e) {}

  const freeUsed = getFreePrintCount(key)
  const remaining = Math.max(0, 10 - freeUsed)
  return {
    name: "Free Starter Tier",
    printsRemaining: remaining,
    totalPrints: 10,
    usedPrints: freeUsed,
    isFreeTier: true
  }
}

export const activatePlan = (planName, printCount, userKey) => {
  const key = getCurrentUserKey(userKey)
  try {
    const planData = {
      name: planName,
      printsRemaining: printCount,
      totalPrints: printCount,
      usedPrints: 0,
      isFreeTier: false,
      activatedAt: new Date().toISOString()
    }
    localStorage.setItem(`slipzo_active_plan_${key}`, JSON.stringify(planData))
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("slipzo-quota-update"))
    }
    return planData
  } catch (e) {
    console.error("Failed to activate plan:", e)
  }
}

export const syncUserQuota = (quotaData, userKey) => {
  if (!quotaData) return null
  const key = getCurrentUserKey(userKey)
  try {
    const current = getActivePlanDetails(key)
    const totalPrints = quotaData.totalPrints !== undefined ? Number(quotaData.totalPrints) : (current?.totalPrints ?? 10)
    const usedPrints = quotaData.usedPrints !== undefined ? Number(quotaData.usedPrints) : (current?.usedPrints ?? 0)
    const printsRemaining = quotaData.printsRemaining !== undefined
      ? Number(quotaData.printsRemaining)
      : Math.max(0, totalPrints - usedPrints)
    const planName = quotaData.activePlanName || quotaData.planName || current?.name || (totalPrints > 10 ? "Purchased Plan" : "Free Starter Tier")

    const updatedPlan = {
      name: planName,
      printsRemaining,
      totalPrints,
      usedPrints,
      isFreeTier: totalPrints <= 10,
      onboardingRewardClaimed: quotaData.onboardingRewardClaimed,
      updatedAt: new Date().toISOString()
    }
    localStorage.setItem(`slipzo_active_plan_${key}`, JSON.stringify(updatedPlan))
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("slipzo-quota-update"))
    }
    return updatedPlan
  } catch (e) {
    console.error("Failed to sync user quota:", e)
  }
}


export const getFreePrintCount = (userKey) => {
  const key = userKey || getCurrentUserKey()
  try {
    const val = localStorage.getItem(`slipzo_free_print_count_${key}`)
    return val ? parseInt(val, 10) || 0 : 0
  } catch {
    return 0
  }
}

export const incrementFreePrintCount = (userKey) => {
  const key = userKey || getCurrentUserKey()
  try {
    const current = getActivePlanDetails(key)
    if (current.isFreeTier) {
      const freeUsed = getFreePrintCount(key)
      const next = freeUsed + 1
      localStorage.setItem(`slipzo_free_print_count_${key}`, String(next))
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("slipzo-quota-update"))
      }
      return next
    } else {
      const updatedRemaining = Math.max(0, current.printsRemaining - 1)
      const updatedUsed = (current.usedPrints || 0) + 1
      const updatedPlan = {
        ...current,
        printsRemaining: updatedRemaining,
        usedPrints: updatedUsed
      }
      localStorage.setItem(`slipzo_active_plan_${key}`, JSON.stringify(updatedPlan))
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("slipzo-quota-update"))
      }
      return updatedRemaining
    }
  } catch {
    return 1
  }
}

export const getRemainingFreePrints = (userKey) => {
  const plan = getActivePlanDetails(userKey)
  return plan.printsRemaining
}

export const canPrintFree = (userKey) => {
  return getRemainingFreePrints(userKey) > 0
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

export function cleanTextLines(text) {
  if (!text) return []
  return String(text)
    .split(/\r?\n/)
    .map(line => {
      let cleaned = line.trim()
      // Remove leading commas or symbols e.g. ", CHOPDA" -> "CHOPDA"
      cleaned = cleaned.replace(/^[\s,]+/, '')
      // Remove trailing commas
      cleaned = cleaned.replace(/[\s,]+$/, '')
      // Clean spaces before commas: "Shop no:12 , Hated" -> "Shop no:12, Hated"
      cleaned = cleaned.replace(/\s+,/g, ', ')
      // Fix multiple spaces
      cleaned = cleaned.replace(/\s{2,}/g, ' ')
      return cleaned
    })
    .filter(Boolean)
}

export function cleanTextString(text) {
  return cleanTextLines(text).join(', ')
}

export function findTemplateMatch(templatesList, targetId) {
  if (!Array.isArray(templatesList) || templatesList.length === 0 || !targetId) return null
  const targetStr = String(targetId).trim().toLowerCase()

  // 1. Direct ID match or templateId match
  let matched = templatesList.find(t => t.id === targetId || String(t.templateId) === String(targetId))
  if (matched) return matched

  // 2. Name exact match
  matched = templatesList.find(t => (t.name || "").trim().toLowerCase() === targetStr)
  if (matched) return matched

  // 3. Known aliases / key mappings between builtin template keys & DB template names/IDs
  const aliasMap = {
    "classic": ["classic", "1", "classic receipt"],
    "1": ["classic", "1", "classic receipt"],
    "minimal": ["minimal", "2", "minimal clean bill"],
    "2": ["minimal", "2", "minimal clean bill"],
    "pro": ["pro", "3", "shop pro"],
    "3": ["pro", "3", "shop pro"],
    "eco": ["eco", "4", "eco print"],
    "4": ["eco", "4", "eco print"],
    "modern": ["modern", "5", "modern shop"],
    "5": ["modern", "5", "modern shop"],
    "elite": ["elite", "6", "business elite"],
    "6": ["elite", "6", "business elite"]
  }

  const aliases = aliasMap[targetStr]
  if (aliases) {
    matched = templatesList.find(t => {
      const tId = String(t.id || "").toLowerCase()
      const tTplId = String(t.templateId || "").toLowerCase()
      const tName = String(t.name || "").toLowerCase()
      return aliases.some(a => tId === a || tTplId === a || tName.includes(a))
    })
    if (matched) return matched
  }

  // 4. Partial name match
  matched = templatesList.find(t => (t.name || "").toLowerCase().includes(targetStr))
  if (matched) return matched

  return null
}