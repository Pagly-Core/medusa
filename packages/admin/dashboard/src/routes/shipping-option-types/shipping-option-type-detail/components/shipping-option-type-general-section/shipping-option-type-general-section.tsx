import { HttpTypes } from "@medusajs/types"
import { Container, Heading, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

type ShippingOptionTypeGeneralSectionProps = {
  shippingOptionType: HttpTypes.AdminShippingOptionType
}

export const ShippingOptionTypeGeneralSection = ({
  shippingOptionType,
}: ShippingOptionTypeGeneralSectionProps) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between  px-6 py-4">
        {/* Pagly: no edit or delete; a store only reads the platform's types
            (Pagly-Core/pagly-app#252). */}
        <Heading>{shippingOptionType.label}</Heading>
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 items-start px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("fields.code")}
        </Text>
        <Text size="small" leading="compact">
          {shippingOptionType.code}
        </Text>
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 items-start px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("fields.description")}
        </Text>
        <Text size="small" leading="compact">
          {shippingOptionType.description || "-"}
        </Text>
      </div>
    </Container>
  )
}
