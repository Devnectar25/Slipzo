import { ShoppingBag, Utensils, Shirt, Plus, Lightbulb } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useDbTranslation } from "../../lib/translator"
import { isMenuCategory } from "../../lib/utils"
import "../../styles/NewBillFlow.css"

/**
 * Empty menu/items notice and step-by-step quick guide shown in billing screens
 * when a new shop owner has not added any items/menu yet.
 */
export function EmptyMenuGuide({ businessType = "", onAddItems }) {
  const { t } = useTranslation()
  const { formatNum } = useDbTranslation()

  const normalizedType = (businessType || "").toLowerCase()
  const isMenu = isMenuCategory(businessType)
  const Icon =
    normalizedType.includes("clothing") || normalizedType.includes("garment")
      ? Shirt
      : normalizedType.includes("hotel") || normalizedType.includes("food")
        ? Utensils
        : ShoppingBag

  const steps = isMenu
    ? [
        t("bills.guideStep1Menu", "Go to the Menu tab and tap Add Menu (or create a Custom Menu)"),
        t("bills.guideStep2Menu", "Pick your menu items, set your selling price, and save them to My Menu"),
        t("bills.guideStep3", "Come back to New Bill and tap + Add (or search) to add items to the bill"),
        t("bills.guideStep4", "Adjust quantities or payment mode, then tap Print or Save Bill")
      ]
    : [
        t("bills.guideStep1", "Go to the Item tab and tap Add Item (or create a Custom Item)"),
        t("bills.guideStep2", "Pick your items, set your selling price, and save them to My Items"),
        t("bills.guideStep3", "Come back to New Bill and tap + Add (or search) to add items to the bill"),
        t("bills.guideStep4", "Adjust quantities or payment mode, then tap Print or Save Bill")
      ]

  return (
    <div className="nb-empty-menu-card">
      <div className="nb-empty-icon">
        <Icon size={28} />
      </div>
      <h4 className="nb-empty-title">
        {isMenu ? t("bills.menuEmpty", "Your Menu is Empty") : t("bills.itemsListEmpty", "Your Item List is Empty")}
      </h4>
      <p className="nb-empty-desc">
        {isMenu
          ? t("bills.menuEmptyText", "You haven't added anything yet. First add dishes to your Menu so they appear here for fast billing.")
          : t("bills.itemsEmptyText", "You haven't added any items yet. First add items so they appear here for fast billing.")}
      </p>

      <div className="nb-empty-guide-box">
        <div className="nb-empty-guide-header">
          <Lightbulb size={15} />
          <span>{t("bills.quickGuide", "Quick Guide for New Users")}</span>
        </div>
        <ul className="nb-empty-guide-steps">
          {steps.map((stepText, idx) => (
            <li key={idx}>
              <span className="nb-empty-step-num">{formatNum(idx + 1)}</span>
              <span>{stepText}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="nb-empty-actions">
        <button
          type="button"
          className="nb-add-btn nb-empty-primary-cta"
          onClick={onAddItems}
        >
          <Plus size={16} />
          <span>{isMenu ? t("menu.addMenu", "Add Menu") : t("menu.addItem", "Add Item")}</span>
        </button>
      </div>
    </div>
  )
}

