import { HttpTypes } from "@medusajs/types"
import { Button, Container, createDataTableColumnHelper } from "@medusajs/ui"
import { keepPreviousData } from "@tanstack/react-query"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { EmptyState } from "../../../../../components/common/empty-state"
import { DataTable } from "../../../../../components/data-table"
import { useRefundReasons } from "../../../../../hooks/api"
import { useRefundReasonTableColumns } from "../../../../../hooks/table/columns"
import { useRefundReasonTableQuery } from "../../../../../hooks/table/query"
import { RefundReasonListTableActions } from "./refund-reason-list-table-actions"

const PAGE_SIZE = 20

export const RefundReasonListTable = () => {
  const { t } = useTranslation()
  const { searchParams } = useRefundReasonTableQuery({
    pageSize: PAGE_SIZE,
  })

  const { refund_reasons, count, isLoading, isError, error } = useRefundReasons(
    searchParams,
    {
      placeholderData: keepPreviousData,
    }
  )

  const columns = useColumns()

  if (isError) {
    throw error
  }

  return (
    <Container className="divide-y px-0 py-0">
      <DataTable
        data={refund_reasons}
        columns={columns}
        rowCount={count}
        pageSize={PAGE_SIZE}
        getRowId={(row) => row.id}
        heading={t("refundReasons.domain")}
        emptyState={{
          empty: {
            custom: (
              <EmptyState
                kind="refundReasons"
                action={
                  <Button size="small" variant="secondary" asChild>
                    <Link to="create">
                      {t("emptyStates.refundReasons.action")}
                    </Link>
                  </Button>
                }
              />
            ),
          },
          filtered: {
            heading: t("general.noRecordsMessage"),
            description: t("general.noRecordsMessageFiltered"),
          },
        }}
        actions={[
          {
            label: t("actions.create"),
            to: "create",
          },
        ]}
        isLoading={isLoading}
        enableSearch={true}
      />
    </Container>
  )
}

const columnHelper = createDataTableColumnHelper<HttpTypes.AdminRefundReason>()

const useColumns = () => {
  const base = useRefundReasonTableColumns()

  return useMemo(
    () => [
      ...base,
      columnHelper.display({
        id: "action",
        cell: ({ row }) => (
          <RefundReasonListTableActions refundReason={row.original} />
        ),
      }),
    ],
    [base]
  )
}
