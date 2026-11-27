import { HttpTypes } from "@medusajs/types"
import { useTranslation } from "react-i18next"
import { seededName } from "../../../../../lib/seeded-names"

export const SalesChannelCell = ({
  channel,
}: {
  channel?: HttpTypes.AdminSalesChannel | null
}) => {
  const { t } = useTranslation()

  if (!channel) {
    return <span className="text-ui-fg-muted">-</span>
  }

  const name = seededName(t, channel.name)

  return (
    <div className="flex h-full w-full items-center overflow-hidden">
      <span className="truncate">{name}</span>
    </div>
  )
}

export const SalesChannelHeader = () => {
  const { t } = useTranslation()

  return (
    <div className="flex h-full w-full items-center">
      <span className="truncate">{t("fields.salesChannel")}</span>
    </div>
  )
}
