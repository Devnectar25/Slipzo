// Addresses and labels of the three policy pages: Terms & Conditions, Privacy Policy and Cookie Policy.
// Kept small because footers on every page use it; the full text is in policyContent.js.

export const POLICY_DOCS = [
  {
    id: "terms",
    view: "policy_terms",
    path: "/terms-and-conditions",
    aliases: ["/terms", "/terms-of-service", "/policies", "/legal"],
    navLabel: "Terms & Conditions"
  },
  {
    id: "privacy",
    view: "policy_privacy",
    path: "/privacy-policy",
    aliases: ["/privacy"],
    navLabel: "Privacy Policy"
  },
  {
    id: "cookies",
    view: "policy_cookies",
    path: "/cookie-policy",
    aliases: ["/cookies"],
    navLabel: "Cookie Policy"
  }
]

export const policyDocById = (id) => POLICY_DOCS.find((d) => d.id === id) || null
export const policyDocByView = (view) => POLICY_DOCS.find((d) => d.view === view) || null
export const policyDocByPath = (pathname) => {
  const clean = String(pathname || "").toLowerCase().replace(/\/+$/, "")
  return POLICY_DOCS.find((d) => d.path === clean || d.aliases.includes(clean)) || null
}
