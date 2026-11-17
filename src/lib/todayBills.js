// Bill lists (History, Home's Recent Bills) show today's bills only, counted from the shop's local midnight.

export const localMidnight = () => {
  const m = new Date()
  m.setHours(0, 0, 0, 0)
  return m
}

// Milliseconds until the next local midnight, for lists that should start again when the day changes
export const msUntilMidnight = () => localMidnight().getTime() + 24 * 60 * 60 * 1000 - Date.now()

export const filterToday = (list) => {
  if (!Array.isArray(list)) return []
  const cutoff = localMidnight().getTime()
  return list.filter((b) => b && b.created_at && new Date(b.created_at).getTime() >= cutoff)
}

// days_limit=1 keeps an older server (one that does not know `from` yet) close to today; lists are also trimmed with
// filterToday on the phone.
export const todayBillsUrl = ({ isSaved, page = 1, limit = 10 }) =>
  `/bills?page=${page}&limit=${limit}&days_limit=1&from=${encodeURIComponent(localMidnight().toISOString())}&is_saved=${isSaved ? "true" : "false"}`
