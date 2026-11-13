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

// ---------------------------------------------------------------------------
// Devanagari -> Latin (rough, for matching only). With the app in Hindi/Marathi the speech engine writes
// "मसाला उत्तपा"; menu items are usually typed in English ("Masala Utappa"), so both sides are compared
// as Latin sounds.
// ---------------------------------------------------------------------------
const DEV_VOWELS = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ii', 'उ': 'u', 'ऊ': 'uu', 'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai',
  'ओ': 'o', 'औ': 'au', 'ऑ': 'o', 'ऍ': 'e'
}
const DEV_MATRAS = {
  'ा': 'aa', 'ि': 'i', 'ी': 'ii', 'ु': 'u', 'ू': 'uu', 'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
  'ॉ': 'o', 'ॅ': 'e'
}
const DEV_CONSONANTS = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'n', 'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'n',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n', 'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm', 'य': 'y', 'र': 'r', 'ल': 'l', 'ळ': 'l', 'व': 'v',
  'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h', 'क़': 'k', 'ख़': 'kh', 'ग़': 'g', 'ज़': 'z', 'ड़': 'd', 'ढ़': 'dh', 'फ़': 'f'
}
const DEV_DIGITS = '०१२३४५६७८९'

export function transliterateDevanagari(text) {
  const s = String(text || '')
  if (!/[ऀ-ॿ]/.test(s)) return s
  let out = ''
  const chars = Array.from(s.normalize('NFC'))
  for (let i = 0; i < chars.length; i++) {
    let ch = chars[i]
    if (chars[i + 1] === '़') { ch += '़'; i++ } // nukta
    if (DEV_CONSONANTS[ch] !== undefined) {
      out += DEV_CONSONANTS[ch]
      const next = chars[i + 1]
      if (next === '्') { i++; continue }            // virama: no vowel
      if (DEV_MATRAS[next] !== undefined) { out += DEV_MATRAS[next]; i++; continue }
      // inherent "a", dropped at the end of a word as Hindi/Marathi speakers do ("पनीर" -> "panir")
      if (next && /[ऀ-ॿ]/.test(next)) out += 'a'
      continue
    }
    if (DEV_VOWELS[ch] !== undefined) { out += DEV_VOWELS[ch]; continue }
    if (DEV_MATRAS[ch] !== undefined) { out += DEV_MATRAS[ch]; continue }
    if (ch === 'ं' || ch === 'ँ') { out += 'n'; continue } // anusvara / chandrabindu
    if (ch === 'ः') { out += 'h'; continue }                    // visarga
    const d = DEV_DIGITS.indexOf(ch)
    if (d >= 0) { out += String(d); continue }
    out += ch
  }
  return out
}

/**
 * Sound-alike key for one word, so spellings a speech engine or a person may use for the same word
 * end up equal: "uttapam" / "utappa" / "oothappa" -> "utapa", "paneer" / "panir" -> "panir",
 * "sandwhich" / "sandvich" -> "sandvic".
 */
const keyCache = new Map()
export function phoneticKey(word) {
  const w = String(word || '').toLowerCase()
  const hit = keyCache.get(w)
  if (hit !== undefined) return hit
  let k = transliterateDevanagari(w)
  k = k
    .replace(/ph/g, 'f')
    .replace(/sh/g, 's')
    .replace(/ck/g, 'k')
    .replace(/q/g, 'k')
    .replace(/x/g, 'ks')
    .replace(/z/g, 'j')
    .replace(/w/g, 'v')
    .replace(/([kgcjtdpbr])h/g, '$1')  // aspirated sounds: th -> t, bh -> b, chh -> c
    .replace(/ee|ii|ie|ea/g, 'i')
    .replace(/oo|uu|ou/g, 'u')
    .replace(/y$/, 'i')
  k = collapseRepeats(k)
  k = k.replace(/am$/, 'a')            // uttapam -> utapa, dosam -> dosa
  if (keyCache.size > 5000) keyCache.clear()
  keyCache.set(w, k)
  return k
}

// Words people say around an item name ("2 masala utappa please", "एक प्लेट पोहा") that are not part of it
const FILLER_WORDS = new Set([
  'please', 'plz', 'pls', 'one', 'two', 'three', 'four', 'five', 'plate', 'plates', 'piece', 'pieces', 'pcs',
  'order', 'add', 'give', 'me', 'a', 'an', 'the', 'and', 'with', 'of', 'search', 'find', 'show', 'want',
  'ek', 'do', 'teen', 'char', 'paanch', 'aur', 'chahiye', 'dena', 'de', 'lao',
  'एक', 'दो', 'तीन', 'चार', 'पांच', 'पाँच', 'प्लेट', 'और', 'चाहिए', 'दीजिए', 'दे', 'लाओ', 'हवे', 'पाहिजे'
])

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

  // Sound-alike keys (also turns Devanagari into Latin, so "उत्तपा" meets "utappa")
  const k1 = phoneticKey(w1)
  const k2 = phoneticKey(w2)
  if (k1 && k1 === k2) return true
  if (k1.length >= 3 && k2.length >= 3 && (k2.startsWith(k1) || k1.startsWith(k2))) return true
  const synonymSounds = (w) => (FOOD_SYNONYMS[w] || FOOD_SYNONYMS[c1 === w ? c1 : collapseRepeats(w)] || [])
  if (synonymSounds(w1).some((s) => phoneticKey(s) === k2) || synonymSounds(w2).some((s) => phoneticKey(s) === k1)) return true

  // Levenshtein edit distance on the skeletons and on the sound-alike keys
  const editOk = (a, b) => {
    const maxLen = Math.max(a.length, b.length)
    if (maxLen <= 3) return false // short words must match directly
    const allowedDistance = maxLen <= 5 ? 1 : maxLen <= 8 ? 2 : 3
    const dist = levenshteinDistance(a, b)
    return dist <= allowedDistance && (dist / maxLen) <= 0.38
  }
  return editOk(c1, c2) || editOk(k1, k2)
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
  const rawWords = tokenizeText(cleanQ)
  if (rawWords.length === 0) return true
  // Drop spoken quantities and filler ("2", "plate", "please", "एक") when real words remain
  const meaningful = rawWords.filter((w) => !FILLER_WORDS.has(w) && !/^\d+$/.test(w))
  const qWords = meaningful.length ? meaningful : rawWords

  // Combine item name + category + translations into target token set
  const allTargetWords = []
  for (const candidate of candidateStrings) {
    allTargetWords.push(...tokenizeText(candidate))
  }

  // Every word in the query should match a word in the item. In a longer spoken phrase one word may be
  // misheard beyond repair ("masala utappa plate" -> "masala utappa blade"), so one miss is allowed there.
  const matchedCount = qWords.filter((qw) => allTargetWords.some((tw) => isWordFuzzyMatch(qw, tw))).length
  if (matchedCount === qWords.length) return true
  if (qWords.length >= 3 && matchedCount >= qWords.length - 1) return true

  // 3. Whole phrase match without spaces ("masalautappa", or a name split differently: "masala uth appa")
  const joinedQ = qWords.join('')
  const phrases = [collapseRepeats(joinedQ), phoneticKey(joinedQ)]
  for (const candidate of [itemName, translatedName].filter(Boolean)) {
    const joinedT = tokenizeText(candidate).join('')
    const targets = [collapseRepeats(joinedT), phoneticKey(joinedT)]
    for (let i = 0; i < 2; i++) {
      const q = phrases[i]
      const target = targets[i]
      if (q.length < 4) continue
      if (target.includes(q)) return true
      const dist = levenshteinDistance(q, target)
      const maxLen = Math.max(q.length, target.length)
      if (maxLen >= 5 && dist <= 2 && (dist / maxLen) <= 0.3) return true
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
