import { useTranslation } from "react-i18next"

import { ConfigurableDataTable } from "../../../../../components/table/configurable-data-table"
import { useShippingOptionTypeTableAdapter } from "./shipping-option-type-table-adapter"

export const ConfigurableShippingOptionTypeListTable = () => {
  const { t } = useTranslation()
  const adapter = useShippingOptionTypeTableAdapter()

  return (
    // Pagly: no Create; a store only reads the platform's types
    // (Pagly-Core/pagly-app#252).
    <ConfigurableDataTable
      adapter={adapter}
      heading={t("shippingOptionTypes.domain")}
      subHeading={t("shippingOptionTypes.subtitle")}
    />
  )
}
