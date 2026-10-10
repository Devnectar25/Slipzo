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

const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
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
} else if (isLocalhost) {
  // Running in local browser (localhost:3000) - use Vite proxy /api to communicate with backend on port 8000
  if (!customApi || customApi.includes('vercel.app')) {
    rawApi = '/api'
    try {
      if (customApi?.includes('vercel.app')) {
        localStorage.removeItem('slipzo_custom_api_url')
      }
    } catch (e) {}
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

export const setCachedData = (path, data) => {
  if (!path || !data) return
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const cacheItem = { data, timestamp: Date.now() }
  memoryCache.set(cleanPath, cacheItem)
  try {
    sessionStorage.setItem(`slipzo_cache_${cleanPath}`, JSON.stringify(cacheItem))
  } catch (e) {}
  try {
    localStorage.setItem(`slipzo_cache_${cleanPath}`, JSON.stringify(cacheItem))
  } catch (e) {}
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
    else if (cleanPath.startsWith('/restaurant') || cleanPath.startsWith('/tables')) {
      invalidateApiCache('/restaurant')
      invalidateApiCache('/tables')
    }
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

const DEVANAGARI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९']

export const toDevanagariNumerals = (val) => {
  if (val === undefined || val === null) return ""
  return String(val).replace(/[0-9]/g, (d) => DEVANAGARI_DIGITS[Number(d)])
}

export const getAppLanguage = () => {
  if (typeof window === "undefined") return "en"
  try {
    return (localStorage.getItem("slipzo_language") || localStorage.getItem("i18nextLng") || "en").toLowerCase()
  } catch (_) {
    return "en"
  }
}

export const formatNumberByLang = (val, customLang) => {
  const lang = (customLang || getAppLanguage()).toLowerCase()
  if (lang.startsWith("mr") || lang.startsWith("hi")) {
    return toDevanagariNumerals(val)
  }
  return String(val ?? "")
}

export const getItemRate = (item) => {
  if (!item) return 0
  if (item.rate !== undefined && item.rate !== null && Number(item.rate) > 0) return Number(item.rate)
  if (item.custom_price !== undefined && item.custom_price !== null && Number(item.custom_price) > 0) return Number(item.custom_price)
  if (item.price !== undefined && item.price !== null && Number(item.price) > 0) return Number(item.price)
  const val = Number(item.rate ?? item.custom_price ?? item.price ?? 0)
  return isNaN(val) ? 0 : val
}

export const money = (n, customLang) => {
  const formatted = Number(n || 0).toFixed(2)
  const lang = (customLang || getAppLanguage()).toLowerCase()
  if (lang.startsWith("mr") || lang.startsWith("hi")) {
    return `₹${toDevanagariNumerals(formatted)}`
  }
  return `₹${formatted}`
}

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

export const DEFAULT_SHOP_MENU_ITEMS = [
  {
    id: "menu_croissant",
    name: "Butter Croissant",
    category: "Bakery",
    price: 70.00,
    image_url: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=400&q=80",
    is_active: true
  },
  {
    id: "menu_badam_milk",
    name: "Badam Milk",
    category: "Beverages",
    price: 60.00,
    image_url: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80",
    is_active: true
  },
  {
    id: "menu_cappuccino",
    name: "Cappuccino",
    category: "Beverages",
    price: 90.00,
    image_url: "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=400&q=80",
    is_active: true
  },
  {
    id: "menu_club_sandwich",
    name: "Club Sandwich",
    category: "Snacks",
    price: 110.00,
    image_url: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=400&q=80",
    is_active: true
  },
  {
    id: "menu_chocolate_muffin",
    name: "Chocolate Muffin",
    category: "Bakery",
    price: 80.00,
    image_url: "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&w=400&q=80",
    is_active: true
  },
  {
    id: "menu_fresh_orange_juice",
    name: "Fresh Orange Juice",
    category: "Beverages",
    price: 100.00,
    image_url: "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=400&q=80",
    is_active: true
  }
]

export const DEFAULT_KIRANA_MENU_ITEMS = [
  {
    id: "kirana_001_aashirvaad-superior-mp-atta-5kg",
    name: "Aashirvaad Superior MP Atta (5kg)",
    category: "Atta & Flour",
    price: 245.00,
    image_url: "https://apzabspkfpuszlduyoqv.supabase.co/storage/v1/object/public/menu-item-images/items/aashirvaad-superior-mp-atta-5kg.jpg?v=kirana_1",
    is_veg: true,
    barcode: "8901058852317",
    is_active: true
  },
  {
    id: "kirana_006_india-gate-basmati-rice-5kg",
    name: "India Gate Basmati Rice Feast Rozzana (5kg)",
    category: "Rice",
    price: 420.00,
    image_url: "https://apzabspkfpuszlduyoqv.supabase.co/storage/v1/object/public/menu-item-images/items/india-gate-basmati-rice-5kg.jpg?v=kirana_6",
    is_veg: true,
    barcode: "8901194200021",
    is_active: true
  },
  {
    id: "kirana_012_tata-sampann-toor-dal-1kg",
    name: "Tata Sampann Unpolished Toor Dal (1kg)",
    category: "Dal & Pulses",
    price: 185.00,
    image_url: "https://apzabspkfpuszlduyoqv.supabase.co/storage/v1/object/public/menu-item-images/items/tata-sampann-toor-dal-1kg.jpg?v=kirana_12",
    is_veg: true,
    barcode: "8901058001128",
    is_active: true
  },
  {
    id: "kirana_019_fortune-sunflower-oil-1l",
    name: "Fortune Sunlite Refined Sunflower Oil (1L)",
    category: "Oil & Ghee",
    price: 145.00,
    image_url: "https://apzabspkfpuszlduyoqv.supabase.co/storage/v1/object/public/menu-item-images/items/fortune-sunflower-oil-1l.jpg?v=kirana_19",
    is_veg: true,
    barcode: "8906007280014",
    is_active: true
  },
  {
    id: "kirana_025_mdh-deggi-mirch-100g",
    name: "MDH Deggi Mirch Powder (100g)",
    category: "Spices & Masala",
    price: 82.00,
    image_url: "https://apzabspkfpuszlduyoqv.supabase.co/storage/v1/object/public/menu-item-images/items/mdh-deggi-mirch-100g.jpg?v=kirana_25",
    is_veg: true,
    barcode: "8901648000122",
    is_active: true
  },
  {
    id: "kirana_033_tata-salt-iodized-1kg",
    name: "Tata Salt Vacuum Evaporated Iodized Salt (1kg)",
    category: "Salt & Sugar",
    price: 28.00,
    image_url: "https://apzabspkfpuszlduyoqv.supabase.co/storage/v1/object/public/menu-item-images/items/tata-salt-iodized-1kg.jpg?v=kirana_33",
    is_veg: true,
    barcode: "8901058000107",
    is_active: true
  },
  {
    id: "kirana_037_parle-g-glucose-biscuits-250g",
    name: "Parle-G Original Glucose Biscuits (250g)",
    category: "Biscuits & Cookies",
    price: 25.00,
    image_url: "https://apzabspkfpuszlduyoqv.supabase.co/storage/v1/object/public/menu-item-images/items/parle-g-glucose-biscuits-250g.jpg?v=kirana_37",
    is_veg: true,
    barcode: "8901030000019",
    is_active: true
  },
  {
    id: "kirana_052_tata-tea-premium-500g",
    name: "Tata Tea Premium Leaf Tea (500g)",
    category: "Tea & Coffee",
    price: 240.00,
    image_url: "https://apzabspkfpuszlduyoqv.supabase.co/storage/v1/object/public/menu-item-images/items/tata-tea-premium-500g.jpg?v=kirana_52",
    is_veg: true,
    barcode: "8901058002019",
    is_active: true
  },
  {
    id: "kirana_073_maggi-2-minute-masala-noodles-4pack",
    name: "Maggi 2-Minute Masala Noodles (Pack of 4)",
    category: "Instant Food",
    price: 56.00,
    image_url: "https://apzabspkfpuszlduyoqv.supabase.co/storage/v1/object/public/menu-item-images/items/maggi-2-minute-masala-noodles-4pack.jpg?v=kirana_73",
    is_veg: true,
    barcode: "8901058850023",
    is_active: true
  },
  {
    id: "kirana_095_vim-dishwash-bar-lemon-300g",
    name: "Vim Dishwash Bar with Lemon (300g)",
    category: "Cleaning & Household",
    price: 35.00,
    image_url: "https://apzabspkfpuszlduyoqv.supabase.co/storage/v1/object/public/menu-item-images/items/vim-dishwash-bar-lemon-300g.jpg?v=kirana_95",
    is_veg: true,
    barcode: "8901030029010",
    is_active: true
  }
]

export const DEFAULT_CLOTHING_MENU_ITEMS = [
  { id: "cloth_001", name: "Men's Cotton Casual Shirt", category: "Men's Wear", price: 699.00, is_active: true },
  { id: "cloth_002", name: "Men's Denim Jeans", category: "Men's Wear", price: 1199.00, is_active: true },
  { id: "cloth_003", name: "Women's Designer Saree", category: "Women's Wear", price: 1499.00, is_active: true },
  { id: "cloth_004", name: "Women's Kurti Set", category: "Women's Wear", price: 899.00, is_active: true },
  { id: "cloth_005", name: "Kids T-Shirt & Shorts Combo", category: "Kids Wear", price: 499.00, is_active: true }
]

export const DEFAULT_HOTEL_MENU_ITEMS = [
  { id: "hotel_001", name: "Special Veg Thali", category: "Thali & Meals", price: 160.00, is_active: true },
  { id: "hotel_002", name: "Paneer Butter Masala", category: "Main Course", price: 220.00, is_active: true },
  { id: "hotel_003", name: "Butter Naan", category: "Breads", price: 40.00, is_active: true },
  { id: "hotel_004", name: "Chicken Biryani", category: "Biryani & Rice", price: 240.00, is_active: true },
  { id: "hotel_005", name: "Gulab Jamun (2 pcs)", category: "Desserts", price: 60.00, is_active: true }
]

export const getFallbackCatalogForCategory = (businessType) => {
  const type = String(businessType || "").toLowerCase()
  if (type.includes("kirana") || type.includes("grocery")) {
    return DEFAULT_KIRANA_MENU_ITEMS
  }
  if (type.includes("clothing") || type.includes("garment")) {
    return DEFAULT_CLOTHING_MENU_ITEMS
  }
  if (type.includes("hotel") || type.includes("restaurant") || type.includes("food")) {
    return DEFAULT_HOTEL_MENU_ITEMS
  }
  return DEFAULT_SHOP_MENU_ITEMS
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
      window.dispatchEvent(new CustomEvent("slipzo-menu-update", { detail: { userKey: key, items: items || [] } }))
    }
  } catch (e) {}
}

export const clearStoredMenuItems = (user) => {
  const key = getCurrentUserKey(user)
  try {
    localStorage.removeItem(`slipzo_menu_items_${key}`)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("slipzo-menu-update", { detail: { userKey: key, items: [] } }))
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
  let matched = templatesList.find(t => 
    String(t.id || "").toLowerCase() === targetStr || 
    String(t.templateId || "").toLowerCase() === targetStr
  )
  if (matched) return matched

  // 2. Name exact match
  matched = templatesList.find(t => (t.name || "").trim().toLowerCase() === targetStr)
  if (matched) return matched

  // 3. Known aliases / key mappings between builtin template keys & DB template names/IDs/UUIDs
  const aliasGroups = [
    {
      key: "classic",
      aliases: ["classic", "1", "classic receipt", "0442d846-0a89-4d90-800a-48278ec089d7"]
    },
    {
      key: "minimal",
      aliases: ["minimal", "2", "minimal clean bill", "minimal bill", "bcaa2c28-0aeb-468e-8789-d5edfd2eee0c"]
    },
    {
      key: "pro",
      aliases: ["pro", "3", "shop pro", "shop pro (80mm)", "b55d6642-d218-43c3-b8a8-918e87d9712d"]
    },
    {
      key: "eco",
      aliases: ["eco", "4", "eco print", "eco thermal", "cc510d5f-07bf-4ce4-8c50-6ec1995c85f4"]
    },
    {
      key: "modern",
      aliases: ["modern", "5", "modern shop", "modern store", "4638c377-7094-4325-bf15-eb7c6de54ff6"]
    },
    {
      key: "elite",
      aliases: ["elite", "6", "business elite", "elite retail", "ee17a09d-5b86-47bc-b862-2fc6bbcba2b9"]
    }
  ]

  // Direct alias match
  const matchedGroup = aliasGroups.find(g => 
    g.aliases.some(a => a === targetStr || targetStr.includes(a) || a.includes(targetStr))
  )

  if (matchedGroup) {
    matched = templatesList.find(t => {
      const tId = String(t.id || "").toLowerCase()
      const tTplId = String(t.templateId || "").toLowerCase()
      const tName = String(t.name || "").toLowerCase()
      return matchedGroup.aliases.some(a => tId === a || tTplId === a || tName === a || tName.includes(a))
    })
    if (matched) return matched
  }

  // 4. Partial name match
  matched = templatesList.find(t => 
    (t.name || "").toLowerCase().includes(targetStr) || 
    targetStr.includes((t.name || "").toLowerCase())
  )
  if (matched) return matched

  return null
}

// ============ RESTAURANT / HOTEL HELPERS ============
export const isHotelRestaurant = (shopOrCategory) => {
  if (!shopOrCategory) return false
  const cat = typeof shopOrCategory === "string"
    ? shopOrCategory
    : (shopOrCategory.business_type || shopOrCategory.category || "")
  const clean = String(cat).trim().toLowerCase()
  return clean === "hotel_food" ||
         clean === "hotel or food restaurant" ||
         clean.includes("hotel") ||
         clean.includes("restaurant")
}

export const getStoredTables = (user) => {
  const userKey = getCurrentUserKey(user)
  try {
    const raw = localStorage.getItem(`slipzo_tables_${userKey}`)
    if (raw) return JSON.parse(raw)
  } catch (e) {}
  return null
}

export const saveStoredTables = (user, tables) => {
  const userKey = getCurrentUserKey(user)
  try {
    localStorage.setItem(`slipzo_tables_${userKey}`, JSON.stringify(tables))
  } catch (e) {}
}
