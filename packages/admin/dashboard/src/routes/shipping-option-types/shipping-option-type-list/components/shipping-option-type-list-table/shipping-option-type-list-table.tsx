import { Container, Heading } from "@medusajs/ui"
import { keepPreviousData } from "@tanstack/react-query"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { _DataTable } from "../../../../../components/table/data-table"
import { useShippingOptionTypes } from "../../../../../hooks/api"
import { useShippingOptionTypeTableColumns } from "../../../../../hooks/table/columns/use-shipping-option-type-table-columns"
import { useShippingOptionTypeTableFilters } from "../../../../../hooks/table/filters/use-shipping-option-type-table-filters"
import { useShippingOptionTypeTableQuery } from "../../../../../hooks/table/query/use-shipping-option-type-table-query"
import { useDataTable } from "../../../../../hooks/use-data-table"

const PAGE_SIZE = 20

export const ShippingOptionTypeListTable = () => {
  const { t } = useTranslation()

  const { searchParams, raw } = useShippingOptionTypeTableQuery({
    pageSize: PAGE_SIZE,
  })
  const { shipping_option_types, count, isLoading, isError, error } =
    useShippingOptionTypes(searchParams, {
      placeholderData: keepPreviousData,
    })

  const filters = useShippingOptionTypeTableFilters()
  const columns = useColumns()

  const { table } = useDataTable({
    columns,
    data: shipping_option_types,
    count,
    getRowId: (row) => row.id,
    pageSize: PAGE_SIZE,
  })

  if (isError) {
    throw error
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          {/* Pagly: no Create, edit or delete; a store only reads the
              platform's types (Pagly-Core/pagly-app#252). */}
          <Heading>{t("shippingOptionTypes.domain")}</Heading>
        </div>
      </div>
      <_DataTable
        noRecords={{
          kind: "shippingOptionTypes",
        }}
        table={table}
        filters={filters}
        isLoading={isLoading}
        columns={columns}
        pageSize={PAGE_SIZE}
        count={count}
        orderBy={[
          { key: "label", label: t("fields.label") },
          { key: "code", label: t("fields.code") },
          { key: "description", label: t("fields.description") },
          { key: "created_at", label: t("fields.createdAt") },
          { key: "updated_at", label: t("fields.updatedAt") },
        ]}
        navigateTo={({ original }) => original.id}
        queryObject={raw}
        pagination
        search
      />
    </Container>
  )
}

const useColumns = () => {
  const base = useShippingOptionTypeTableColumns()

  return useMemo(() => [...base], [base])
}
