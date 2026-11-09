import { useEffect, useState } from "react"
import { getCachedData } from "../lib/utils"

// Cafe / tea / small business and hotel / restaurant shops bill by name, not by scanning,
// so every barcode option (scan button, barcode fields, labels) is hidden for them.
// Kirana / grocery and cloth shops keep all barcode features.
export function shopUsesBarcode(shopOrCategory) {
  const raw = typeof shopOrCategory === "string"
    ? shopOrCategory
    : (shopOrCategory && (shopOrCategory.business_type || shopOrCategory.category)) || ""
  // A shop that has not picked a category yet is treated as the default "small business"
  const type = String(raw).trim().toLowerCase() || "small_business"
  const nameOnly = ["small_business", "small business", "hotel_food", "hotel or food restaurant"]
  if (nameOnly.includes(type)) return false
  return !(
    type.includes("hotel") ||
    type.includes("restaurant") ||
    type.includes("cafe") ||
    type.includes("tea") ||
    type.includes("snack") ||
    type.includes("small")
  )
}

// source (optional): the shop object or category the screen already has. Without it the saved shop is used.
export function useShowBarcode(source) {
  const read = () => shopUsesBarcode(source || getCachedData("/shop"))
  const [show, setShow] = useState(read)

  useEffect(() => {
    setShow(read())
    const onShop = (e) => setShow(shopUsesBarcode(e?.detail || source || getCachedData("/shop")))
    window.addEventListener("slipzo_shop_updated", onShop)
    return () => window.removeEventListener("slipzo_shop_updated", onShop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeof source === "string" ? source : source?.business_type])

  return show
}
