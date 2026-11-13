/**
 * High-performance Fuzzy Search Utility for Menu Items & Products
 * 
 * Specifically designed for retail, grocery, and restaurant items with support for:
 * - Speech-to-text / voice search phonetic misrecognitions
 * - Indian transliteration variants (e.g. Utappa <-> Uttapam <-> Uttappa <-> Utapam)
 * - Minor spelling mistakes, typos, and repeated letters
 * - Multi-lingual support (English, Hindi, Marathi with Devanagari Unicode marks)
 * - Multiterm / word-reordering matching
 */

// Common phonetically equivalent or regional culinary aliases
const FOOD_SYNONYMS = {
  tea: ['chai', 'chay', 'cha'],
  chai: ['tea', 'chay', 'cha'],
  coffee: ['cafe', 'cofi', 'kafi', 'kapi', 'coffy'],
  uttapam: ['utappa', 'uttappa', 'utapa', 'uthappam', 'uthappa', 'utappam'],
  utappa: ['uttapam', 'uttappa', 'utapa', 'uthappam', 'uthappa', 'utappam'],
  uttappa: ['utappa', 'uttapam', 'utapa', 'uthappam', 'uthappa'],
  poori: ['puri'],
  puri: ['poori'],
  paneer: ['panir', 'panner', 'paner'],
  panir: ['paneer', 'panner', 'paner'],
  pattice: ['patice', 'patties', 'patty', 'petis'],
  vada: ['wada', 'bada'],
  wada: ['vada', 'bada'],
  dosa: ['dhosa', 'dose'],
  dhosa: ['dosa'],
  kachori: ['kachauri', 'kachodi'],
  bhel: ['bhelpuri', 'bhelpoori'],
  sandwich: ['sandwhich', 'sandwitch'],
  shawarma: ['shwarma', 'shaverma', 'shawrma'],
  biryani: ['biriyani', 'biryany'],
  kebab: ['kabab', 'kabob'],
  paratha: ['parantha', 'parota', 'parotha'],
  idli: ['idly'],
  idly: ['idli'],
  poha: ['pohe'],
  misal: ['missal'],
  maggi: ['magi', 'noodles'],
  bhaji: ['bhajiya', 'baji', 'bhajji'],
  fries: ['fry'],
  fry: ['fries']
}

/**
 * Remove duplicate consecutive characters for phonetic normalization
 * (e.g. "uttappa" -> "utapa", "coffee" -> "cofe", "paneer" -> "paner")
 */
export function collapseRepeats(s) {
  return String(s || '').toLowerCase().replace(/(.)\1+/g, (m, c) => c)
}

/**
 * Clean voice recognition results:
 * Strips speech engine trailing/leading punctuation (. , ! ? ; :) and extra spaces
 */
export function cleanVoiceQuery(text) {
  if (!text) return ''
  return String(text)
    .trim()
    .replace(/^[\s.,!?;:"]+|[\s.,!?;:"]+$/g, '')
    .trim()
}

/**
 * Levenshtein distance with early-exit bounds
 */
export function levenshteinDistance(s1, s2) {
  if (s1 === s2) return 0
  if (!s1) return s2.length
  if (!s2) return s1.length

  const m = s1.length
  const n = s2.length
  const prev = new Array(n + 1)
  const curr = new Array(n + 1)

  for (let j = 0; j <= n; j++) prev[j] = j

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    const c1 = s1[i - 1]
    for (let j = 1; j <= n; j++) {
      const cost = c1 === s2[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j]
  }
  return prev[n]
}

/**
 * Tokenize string into lowercase words while preserving Unicode letters and marks (matras)
 */
export function tokenizeText(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

/**
 * Check if single query word matches target word with exact, prefix, synonym, or fuzzy rules
 */
export function isWordFuzzyMatch(w1, w2) {
  if (!w1 || !w2) return false
  if (w1 === w2) return true

  // Direct prefix / substring (e.g. "utap" matches "utappa", "chai" matches "chaivala")
  if (w1.length >= 3 && (w2.startsWith(w1) || w1.startsWith(w2))) return true

  // Synonym dictionary check
  if (FOOD_SYNONYMS[w1]?.includes(w2) || FOOD_SYNONYMS[w2]?.includes(w1)) return true

  // Collapsed consonant & vowel skeleton check
  const c1 = collapseRepeats(w1)
  const c2 = collapseRepeats(w2)
  if (c1 === c2) return true
  if (c1.length >= 3 && (c2.startsWith(c1) || c1.startsWith(c2))) return true
  if (FOOD_SYNONYMS[c1]?.includes(c2) || FOOD_SYNONYMS[c2]?.includes(c1)) return true

  // Levenshtein edit distance check on normalized skeletons
  const maxLen = Math.max(c1.length, c2.length)
  if (maxLen <= 3) return false // short words must match directly

  const allowedDistance = maxLen <= 5 ? 1 : maxLen <= 8 ? 2 : 3
  const dist = levenshteinDistance(c1, c2)
  return dist <= allowedDistance && (dist / maxLen) <= 0.38
}

/**
 * Evaluates whether an item matches the search query.
 * Checks item.name, translated name, item.category, translated category, and barcode.
 * 
 * @param {Object} item - Menu item or product
 * @param {string} query - User search string (typed or voice)
 * @param {Object} [options]
 * @param {string} [options.lang] - Current UI language ('hi', 'mr', 'en')
 * @param {string} [options.translatedName] - Precomputed translated name if available
 * @returns {boolean} True if the item is a relevant match
 */
export function matchesItemFuzzy(item, query, options = {}) {
  if (!query || !query.trim()) return true
  const cleanQ = cleanVoiceQuery(query).toLowerCase()
  if (!cleanQ) return true

  const itemName = String(item?.name || '').trim().toLowerCase()
  const itemCategory = String(item?.category || '').trim().toLowerCase()
  const itemBarcode = String(item?.barcode || '').trim().toLowerCase()
  const translatedName = String(options.translatedName || (options.tDb ? options.tDb(item?.name) : '') || '').trim().toLowerCase()
  const translatedCategory = String(options.translatedCategory || (options.tDb ? options.tDb(item?.category) : '') || '').trim().toLowerCase()

  const candidateStrings = [
    itemName,
    translatedName,
    itemCategory,
    translatedCategory,
    itemBarcode
  ].filter((c) => Boolean(c && c.length > 0))

  // 1. Direct substring check across any candidate field
  for (const candidate of candidateStrings) {
    if (candidate.includes(cleanQ)) {
      return true
    }
  }

  // 2. Tokenize query and compare word-by-word
  const qWords = tokenizeText(cleanQ)
  if (qWords.length === 0) return true

  // Combine item name + category + translations into target token set
  const allTargetWords = []
  for (const candidate of candidateStrings) {
    allTargetWords.push(...tokenizeText(candidate))
  }

  // Every word in the query should match at least one word in the item
  const allQueryWordsMatched = qWords.every((qw) =>
    allTargetWords.some((tw) => isWordFuzzyMatch(qw, tw))
  )

  if (allQueryWordsMatched) {
    return true
  }

  // 3. Whole phrase collapsed match (for queries like "masalautappa" without spaces)
  const collapsedQ = collapseRepeats(cleanQ.replace(/\s+/g, ''))
  if (collapsedQ.length >= 4) {
    for (const candidate of [itemName, translatedName].filter(Boolean)) {
      const collapsedTarget = collapseRepeats(candidate.replace(/\s+/g, ''))
      if (collapsedTarget.includes(collapsedQ)) {
        return true
      }
      const dist = levenshteinDistance(collapsedQ, collapsedTarget)
      const maxLen = Math.max(collapsedQ.length, collapsedTarget.length)
      if (maxLen >= 5 && dist <= 2 && (dist / maxLen) <= 0.3) {
        return true
      }
    }
  }

  return false
}

/**
 * Filters an array of items using matchesItemFuzzy and ranks exact matches first.
 */
export function filterItemsFuzzy(items, query, options = {}) {
  if (!Array.isArray(items)) return []
  if (!query || !query.trim()) return items

  const cleanQ = cleanVoiceQuery(query).toLowerCase()
  const qWords = tokenizeText(cleanQ)

  const matchesWithRank = []

  for (const it of items) {
    if (matchesItemFuzzy(it, cleanQ, options)) {
      const name = String(it.name || '').toLowerCase()
      let rank = 0

      // Highest priority: exact name match
      if (name === cleanQ) rank = 100
      // Next: name starts with query
      else if (name.startsWith(cleanQ)) rank = 80
      // Next: name contains query substring
      else if (name.includes(cleanQ)) rank = 60
      // Next: all query words exact match
      else if (qWords.every((w) => name.includes(w))) rank = 40
      // Fuzzy match
      else rank = 20

      matchesWithRank.push({ item: it, rank })
    }
  }

  // Stable sort preserving original order for equal ranks
  matchesWithRank.sort((a, b) => b.rank - a.rank)
  return matchesWithRank.map((m) => m.item)
}
