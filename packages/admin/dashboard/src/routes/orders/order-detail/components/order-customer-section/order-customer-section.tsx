import { ArrowPath, CurrencyDollar, Envelope } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Container, Heading, Text } from "@medusajs/ui"
import { ComponentType } from "react"
import { useTranslation } from "react-i18next"
import { ActionMenu } from "../../../../../components/common/action-menu"
import { CustomerInfo } from "../../../../../components/common/customer-info"
import { getFormattedAddress, isSameAddress } from "../../../../../lib/addresses"
import { useExtension } from "../../../../../providers/extension-provider"

type OrderCustomerSectionProps = {
  order: HttpTypes.AdminOrder
}

/** What a plugin part in `order.details.customer` receives. */
type CustomerPartProps = { data: HttpTypes.AdminOrder }

/**
 * Pagly: who bought and how to reach them, who the invoice goes to, and the
 * plugin parts about them (what they left at checkout). The shipping address
 * lives in Envío.
 */
export const OrderCustomerSection = ({ order }: OrderCustomerSectionProps) => {
  const { getWidgets } = useExtension()
  const parts = getWidgets(
    "order.details.customer" as any
  ) as ComponentType<CustomerPartProps>[]

  return (
    <Container className="divide-y p-0">
      <Header />
      <CustomerInfo.ID data={order} />
      <CustomerInfo.Contact data={order} />
      <CustomerInfo.Company data={order} />
      <Billing order={order} />
      {parts.map((Part, index) => (
        <Part key={index} data={order} />
      ))}
    </Container>
  )
}

const Billing = ({ order }: { order: HttpTypes.AdminOrder }) => {
  const { t } = useTranslation()
  const own =
    !!order.billing_address &&
    !isSameAddress(order.shipping_address, order.billing_address)

  return (
    <div className="text-ui-fg-subtle grid grid-cols-2 items-start px-6 py-4">
      <Text size="small" leading="compact" weight="plus">
        {t("orders.customer.billing")}
      </Text>
      {own ? (
        <Text size="small" leading="compact">
          {getFormattedAddress({ address: order.billing_address }).map(
            (line, i) => (
              <span key={i} className="break-words">
                {line}
                <br />
              </span>
            )
          )}
        </Text>
      ) : (
        <Text size="small" leading="compact" className="text-ui-fg-muted">
          {t("orders.customer.billingSameAsShipping")}
        </Text>
      )}
    </div>
  )
}

const Header = () => {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <Heading level="h2">{t("fields.customer")}</Heading>
      <ActionMenu
        groups={[
          {
            actions: [
              {
                label: t("transferOwnership.label"),
                to: `transfer`,
                icon: <ArrowPath />,
              },
            ],
          },
          {
            actions: [
              {
                label: t("addresses.billingAddress.editLabel"),
                to: "billing-address",
                icon: <CurrencyDollar />,
              },
              {
                label: t("email.editLabel"),
                to: `email`,
                icon: <Envelope />,
              },
            ],
          },
        ]}
      />
    </div>
  )
}
