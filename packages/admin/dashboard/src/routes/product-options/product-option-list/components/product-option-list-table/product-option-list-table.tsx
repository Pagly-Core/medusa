import { Button, Container, createDataTableColumnHelper } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { keepPreviousData } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useState } from "react"
import { HttpTypes } from "@medusajs/types"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

import { EmptyState } from "../../../../../components/common/empty-state"
import { useProductOptions } from "../../../../../hooks/api/product-options"
import { useProductOptionTableColumns } from "../../../../../hooks/table/columns/use-product-option-table-columns"
import { useProductOptionTableQuery } from "../../../../../hooks/table/query/use-product-option-table-query"
import { useProductOptionTableFilters } from "../../../../../hooks/table/filters"
import { DataTable } from "../../../../../components/data-table"
import { ProductOptionListTableActions } from "./product-option-list-table-actions"

const PAGE_SIZE = 20
const DEFAULT_IS_EXCLUSIVE_FILTER = JSON.stringify("false")

export const ProductOptionListTable = () => {
  const { t } = useTranslation()
  const [urlSearchParams, setUrlSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const hasExclusiveFilter = urlSearchParams.has("is_exclusive")
  const [hasInitialized, setHasInitialized] = useState(hasExclusiveFilter)

  useEffect(() => {
    if (hasInitialized) {
      return
    }

    if (hasExclusiveFilter) {
      setHasInitialized(true)
      return
    }

    const nextParams = new URLSearchParams(urlSearchParams)
    nextParams.set("is_exclusive", DEFAULT_IS_EXCLUSIVE_FILTER)
    setUrlSearchParams(nextParams, { replace: true })
  }, [hasInitialized, hasExclusiveFilter, urlSearchParams, setUrlSearchParams])

  const { searchParams } = useProductOptionTableQuery({
    pageSize: PAGE_SIZE,
  })

  const { product_options, count, isError, error, isLoading } =
    useProductOptions(searchParams, {
      placeholderData: keepPreviousData,
      enabled: hasInitialized,
    })

  const filters = useProductOptionTableFilters()
  const columns = useColumns()
  const handleCreate = useCallback(() => {
    const params = urlSearchParams.toString()
    navigate("create", {
      state: params ? { restore_params: params } : undefined,
    })
  }, [navigate, urlSearchParams])

  if (isError) {
    throw error
  }

  // Pagly: the page always sets is_exclusive, so the table counts itself as
  // filtered. With nothing else set, an empty list is a store with no options.
  const onlyDefaultFilter = [...urlSearchParams.keys()].every(
    (key) => key === "is_exclusive"
  )
  const empty = {
    custom: (
      <EmptyState
        kind="productOptions"
        action={
          <Button size="small" variant="secondary" asChild>
            <Link to="create">{t("emptyStates.productOptions.action")}</Link>
          </Button>
        }
      />
    ),
  }

  return (
    <Container className="divide-y p-0">
      <DataTable
        data={product_options}
        columns={columns}
        filters={filters}
        rowCount={count}
        pageSize={PAGE_SIZE}
        getRowId={(row) => row.id}
        heading={t("productOptions.domain")}
        emptyState={{
          empty,
          filtered: onlyDefaultFilter
            ? empty
            : {
                heading: t("general.noRecordsMessage"),
                description: t("general.noRecordsMessageFiltered"),
              },
        }}
        actions={[
          {
            label: t("actions.create"),
            onClick: handleCreate,
          },
        ]}
        isLoading={isLoading}
        enableSearch={true}
        rowHref={(row) => `/product-options/${row.id}`}
      />
    </Container>
  )
}

const columnHelper = createDataTableColumnHelper<HttpTypes.AdminProductOption>()

const useColumns = () => {
  const base = useProductOptionTableColumns()

  return useMemo(
    () => [
      ...base,
      columnHelper.display({
        id: "action",
        cell: ({ row }) => (
          <ProductOptionListTableActions productOption={row.original} />
        ),
      }),
    ],
    [base]
  )
}
