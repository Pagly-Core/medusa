import { HttpTypes } from "@medusajs/types"
import { useTranslation } from "react-i18next"
import { StatusCell } from "../../common/status-cell"

type EmailSubscriptionCellProps = {
  metadata?: HttpTypes.AdminCustomer["metadata"]
}

/**
 * Pagly: @pagly/storefront keeps a customer's email marketing consent in
 * `metadata.email_marketing`, whose `state` is "subscribed" or
 * "unsubscribed". A customer never asked has none, and is not subscribed.
 */
const isSubscribed = (metadata: EmailSubscriptionCellProps["metadata"]) => {
  const consent = metadata?.email_marketing

  return (
    !!consent &&
    typeof consent === "object" &&
    (consent as Record<string, unknown>).state === "subscribed"
  )
}

export const EmailSubscriptionCell = ({
  metadata,
}: EmailSubscriptionCellProps) => {
  const { t } = useTranslation()

  const subscribed = isSubscribed(metadata)
  const color = subscribed ? "green" : ("grey" as const)
  const text = subscribed
    ? t("customers.emailSubscription.subscribed")
    : t("customers.emailSubscription.notSubscribed")

  return <StatusCell color={color}>{text}</StatusCell>
}

export const EmailSubscriptionHeader = () => {
  const { t } = useTranslation()

  return (
    <div className="flex h-full w-full items-center">
      <span className="truncate">{t("customers.emailSubscription.label")}</span>
    </div>
  )
}
