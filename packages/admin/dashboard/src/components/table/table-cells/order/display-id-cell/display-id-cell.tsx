import { useTranslation } from "react-i18next"
import { orderNumber } from "../../../../../lib/order-number"
import { PlaceholderCell } from "../../common/placeholder-cell"

// Pagly: the store's own number (custom_display_id) when the order has one.
export const DisplayIdCell = ({
  displayId,
  customDisplayId,
}: {
  displayId?: number | null
  customDisplayId?: string | null
}) => {
  const number = orderNumber({ display_id: displayId || null, custom_display_id: customDisplayId })
  if (!number) {
    return <PlaceholderCell />
  }

  return (
    <div className="text-ui-fg-subtle txt-compact-small flex h-full w-full items-center overflow-hidden">
      <span className="truncate">{number}</span>
    </div>
  )
}

export const DisplayIdHeader = () => {
  const { t } = useTranslation()

  return (
    <div className="flex h-full w-full items-center">
      <span className="truncate">{t("fields.order")}</span>
    </div>
  )
}
