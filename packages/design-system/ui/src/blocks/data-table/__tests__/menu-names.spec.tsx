import { render, screen } from "@testing-library/react"
import * as React from "react"

import { TooltipProvider } from "@/components/tooltip"
import { DataTable } from "../data-table"
import { useDataTable } from "../use-data-table"
import { createDataTableColumnHelper } from "../utils/create-data-table-column-helper"
import { createDataTableFilterHelper } from "../utils/create-data-table-filter-helper"

type Row = { id: string; status: string }

const columnHelper = createDataTableColumnHelper<Row>()
const filterHelper = createDataTableFilterHelper<Row>()

const Table = () => {
  const [filtering, setFiltering] = React.useState({})
  const [sorting, setSorting] = React.useState<any>(null)
  const table = useDataTable({
    data: [{ id: "1", status: "draft" }],
    columns: [columnHelper.accessor("status", { header: "Status", enableSorting: true })],
    filters: [
      filterHelper.accessor("status", {
        label: "Status",
        type: "select",
        options: [{ label: "Draft", value: "draft" }],
      }),
    ],
    rowCount: 1,
    getRowId: (row) => row.id,
    filtering: { state: filtering, onFilteringChange: setFiltering },
    sorting: { state: sorting, onSortingChange: setSorting },
  })

  return (
    <TooltipProvider>
      <DataTable instance={table}>
        <DataTable.Toolbar>
          <DataTable.FilterMenu tooltip="Filtrar" />
          <DataTable.SortingMenu tooltip="Ordenar" />
        </DataTable.Toolbar>
      </DataTable>
    </TooltipProvider>
  )
}

// Pagly-Core/pagly-app#354: the filter and sort icon buttons had no
// accessible name; their tooltip names them only on hover, for sighted users.
describe("DataTable's filter and sorting menus", () => {
  it("are named by their tooltip", () => {
    render(<Table />)

    expect(screen.getByRole("button", { name: "Filtrar" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Ordenar" })).toBeInTheDocument()
  })
})
