import { useTranslation } from "react-i18next"

import { ConfigurableDataTable } from "../../../../../components/table/configurable-data-table"
import { usePriceListTableAdapter } from "./price-list-table-adapter"

export const ConfigurablePriceListListTable = () => {
  const { t } = useTranslation()
  const adapter = usePriceListTableAdapter()

  return (
    <ConfigurableDataTable
      adapter={adapter}
      heading={t("priceLists.domain")}
      subHeading={t("priceLists.subtitle")}
      actions={[{ label: t("actions.create"), to: "create" }]}
    />
  )
}
