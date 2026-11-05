import { useTranslation } from "react-i18next"

import { ConfigurableDataTable } from "../../../../../components/table/configurable-data-table"
import { useCustomerGroupTableAdapter } from "./customer-group-table-adapter"

export const ConfigurableCustomerGroupListTable = () => {
  const { t } = useTranslation()
  const adapter = useCustomerGroupTableAdapter()

  return (
    <>
      <ConfigurableDataTable
        adapter={adapter}
        heading={t("customerGroups.domain")}
        actions={[{ label: t("actions.create"), to: "create" }]}
      />
    </>
  )
}
