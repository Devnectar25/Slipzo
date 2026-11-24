// Product filter groups: every shop type has 4-5 groups, and every product (catalog or the shop's own) falls into
// exactly one of them. The chips on the Menu page, New Bill, table billing and the first-time setup use these
// instead of the many raw categories.
//
// A product is placed by its category first; categories that say nothing about the product ("General",
// "Small Business / Cafe & Tea", ...) and custom categories that match no group are placed by the product's name.
// Anything still unmatched goes to the shop type's last group ("... & Others").
//
// A category the shop owner typed themselves ("Add Your Item") is a group of its own, with its own chip.

// Categories that describe the shop, not the product: ignored, the name decides instead
const VAGUE_CATEGORIES = [
  "general",
  "others",
  "other",
  "small business / cafe & tea",
  "kirana / grocery shop",
  "hotel or food restaurant",
  "cloth & garments shop",
  "clothing & garments shop",
]

// keywords are matched as whole words or word starts ("snack" matches "Snacks"), case-insensitive.
// Groups are tried in the listed order, so more specific groups come first (e.g. "vada pav" is Street Food
// before "vada" makes it South Indian). The last group of each list is also the fallback.
const GROUPS = {
  kirana: [
    { id: "staples", label: "Atta, Rice & Dal", icon: "🌾", words: ["atta", "flour", "maida", "besan", "suji", "sooji", "rava", "rice", "basmati", "dal", "pulse", "rajma", "chana", "moong", "poha"] },
    { id: "oil", label: "Oil, Salt & Sugar", icon: "🫒", words: ["oil", "ghee", "salt", "sugar", "jaggery", "gur", "vanaspati"] },
    { id: "snacks", label: "Snacks & Drinks", icon: "🍪", words: ["biscuit", "cookie", "snack", "namkeen", "chips", "noodle", "maggi", "pasta", "tea", "coffee", "drink", "beverage", "juice", "chocolate", "rusk", "bhujia", "wafer"] },
    { id: "spices", label: "Spices & Masala", icon: "🌶️", words: ["spice", "masala", "mirch", "chilli", "chili", "haldi", "turmeric", "jeera", "cumin", "dhaniya", "coriander", "pepper", "hing", "garam"] },
    { id: "home", label: "Home & Others", icon: "🧴", words: ["soap", "detergent", "dishwash", "vim", "shampoo", "toothpaste", "colgate", "cleaner", "household", "personal"] },
  ],
  clothing: [
    { id: "kids", label: "Kids Wear", icon: "🧸", words: ["kid", "kids", "boy", "boys", "girl", "girls", "baby", "child", "children", "infant", "frock", "toddler"] },
    { id: "winter", label: "Winter & Jackets", icon: "🧥", words: ["jacket", "winter", "winterwear", "sweater", "hoodie", "sweatshirt", "coat", "blazer", "shawl", "thermal", "pullover"] },
    { id: "essentials", label: "Essentials & More", icon: "🧦", words: ["essential", "active", "sock", "socks", "vest", "banyan", "boxer", "brief", "innerwear", "track", "jogger", "sport", "gym", "lounge"] },
    { id: "women", label: "Women's Wear", icon: "👗", words: ["women", "womens", "ladies", "lady", "saree", "sari", "kurti", "lehenga", "dupatta", "salwar", "anarkali", "blouse", "leggings"] },
    { id: "men", label: "Men's Wear", icon: "👔", words: ["men", "mens", "gents", "shirt", "trouser", "jeans", "chino", "polo", "kurta", "dhoti"] },
  ],
  hotel: [
    { id: "desserts", label: "Desserts & Drinks", icon: "🍨", words: ["dessert", "sweet", "drink", "juice", "lassi", "tea", "chai", "coffee", "ice cream", "kulfi", "gulab", "halwa", "shake", "beverage", "mocktail", "soda"] },
    { id: "breads", label: "Breads & Rice", icon: "🫓", words: ["bread", "tandoor", "roti", "naan", "paratha", "kulcha", "rice", "biryani", "pulao", "jeera rice", "fried rice"] },
    { id: "starters", label: "Starters", icon: "🍢", words: ["starter", "appetizer", "tikka", "kebab", "kabab", "soup", "manchurian", "lollipop", "65", "chilli", "crispy", "spring roll"] },
    { id: "breakfast", label: "Breakfast & Snacks", icon: "🍳", words: ["breakfast", "omlette", "omelette", "egg", "poha", "upma", "sandwich", "toast", "snack", "maggi", "idli", "dosa", "pav bhaji"] },
    { id: "main", label: "Main Course & Thalis", icon: "🍛", words: ["main", "course", "curry", "thali", "meal", "paneer", "dal", "sabzi", "gravy", "kofta", "korma", "chicken", "mutton"] },
  ],
  cafe: [
    { id: "street", label: "Street Food & Chaat", icon: "🌯", words: ["street", "chaat", "pav", "pani puri", "panipuri", "golgappa", "bhel", "sev puri", "dahi puri", "dabeli", "roll", "frankie", "momo", "momos"] },
    { id: "tea", label: "Tea & Coffee", icon: "☕", words: ["tea", "chai", "tapri", "coffee", "cafe", "latte", "cappuccino", "espresso", "milk", "lassi", "juice", "shake", "cold drink", "drink"] },
    { id: "snacks", label: "Snacks & Bakery", icon: "🥐", words: ["snack", "pakora", "pakoda", "bhaji", "bhajji", "samosa", "kachori", "sabudana", "brownie", "cake", "pastry", "puff", "cookie", "pizza", "burger", "sandwich", "fries", "toast"] },
    { id: "south", label: "South Indian", icon: "🫓", words: ["south", "tiffin", "dosa", "idli", "vada", "uttapam", "utappa", "uthappam", "upma", "sambar", "appam", "pongal"] },
    { id: "others", label: "Others", icon: "🛍️", words: [] },
  ],
}

// The order the chips are shown in (the lists above are in matching order, which is not always the natural one)
const DISPLAY_ORDER = {
  kirana: ["staples", "oil", "spices", "snacks", "home"],
  clothing: ["men", "women", "kids", "winter", "essentials"],
  hotel: ["starters", "main", "breads", "breakfast", "desserts"],
  cafe: ["tea", "south", "street", "snacks", "others"],
}

// "kirana" | "clothing" | "hotel" | "cafe" from a shop's business type (or category name)
export function shopKindOf(businessType) {
  const t = String(businessType || "").toLowerCase()
  if (t.includes("kirana") || t.includes("grocery")) return "kirana"
  if (t.includes("cloth") || t.includes("garment")) return "clothing"
  if (t.includes("hotel") || t.includes("restaurant") || t.includes("food")) return "hotel"
  return "cafe"
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
// whole word or word start, so "snack" matches "Snacks" but "men" does not match "women"
const matcherCache = new Map()
const matcherFor = (group) => {
  if (!matcherCache.has(group)) {
    matcherCache.set(group, group.words.length
      ? new RegExp(`(^|[^a-z0-9])(${group.words.map(escapeRe).join("|")})`, "i")
      : null)
  }
  return matcherCache.get(group)
}

const matchGroup = (groups, text) => {
  if (!text) return null
  const clean = String(text).toLowerCase().replace(/['’]/g, "")
  return groups.find((g) => {
    const re = matcherFor(g)
    return re ? re.test(clean) : false
  }) || null
}

// The category the owner typed for this item, or "" when it belongs to the shop type's groups.
// own_category comes from the server; menus kept on the phone from before it existed are recognised by the
// barcode the server gives to custom items (CUST-...) and a category that matches no group.
const ownCategoryOf = (item, groups) => {
  const category = String(item?.category || "").trim()
  const key = category.toLowerCase()
  if (!category || VAGUE_CATEGORIES.includes(key)) return ""
  if (groups.some((g) => g.label.toLowerCase() === key)) return ""
  const isOwn = item.own_category === undefined
    ? /^CUST-/i.test(item.barcode || "") && !matchGroup(groups, category)
    : item.own_category === true
  return isOwn ? category : ""
}
const ownGroupId = (category) => `own:${category.toLowerCase()}`

// The group a product belongs to: one of the shop type's groups, or the owner's own category ("own:...")
export function productGroupOf(item, businessType) {
  const groups = GROUPS[shopKindOf(businessType)]
  const own = ownCategoryOf(item, groups)
  if (own) return ownGroupId(own)
  const category = String(item?.category || "").trim()
  const isVague = !category || VAGUE_CATEGORIES.includes(category.toLowerCase())
  const byCategory = isVague ? null : matchGroup(groups, category)
  const group = byCategory || matchGroup(groups, item?.name) || groups[groups.length - 1]
  return group.id
}

// All groups of a shop type: [{ id, label, icon }]
export function productGroupsFor(businessType) {
  const kind = shopKindOf(businessType)
  const byId = Object.fromEntries(GROUPS[kind].map((g) => [g.id, g]))
  return DISPLAY_ORDER[kind].map((id) => ({ id, label: byId[id].label, icon: byId[id].icon }))
}

// Filter chips for a list of products: only the groups that have products in this list, then the owner's own categories
export function productGroupChips(items, businessType) {
  const groups = GROUPS[shopKindOf(businessType)]
  const used = new Set()
  const own = new Map()
  ;(items || []).forEach((it) => {
    used.add(productGroupOf(it, businessType))
    const category = ownCategoryOf(it, groups)
    if (category && !own.has(ownGroupId(category))) own.set(ownGroupId(category), { id: ownGroupId(category), label: category, icon: "🏷️", own: true })
  })
  return [
    ...productGroupsFor(businessType).filter((g) => used.has(g.id)),
    ...[...own.values()].sort((a, b) => a.label.localeCompare(b.label))
  ]
}

// A chip's text: groups are translated, the owner's own category is shown as it was typed
export const productGroupLabel = (t, businessType, group) =>
  group.own ? group.label : t(productGroupLabelKey(businessType, group.id), group.label)

// The translation key of a group's label
export const productGroupLabelKey = (businessType, groupId) => `productGroups.${shopKindOf(businessType)}.${groupId}`
