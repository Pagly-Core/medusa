// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useDataGridErrorHighlighting } from "../use-data-grid-error-highlighting"

// The inventory create grid: one row per location, its cell at `locations.<id>`.
const matrix = {
  rowAccessors: ["locations.sloc_1", "locations.sloc_2"],
  columnAccessors: [null, "locations"],
  getFieldsInRow: (row: number) => [`locations.sloc_${row + 1}`],
} as any

const grid = {
  getRowModel: () => ({ flatRows: [{}, {}] }),
  getAllFlatColumns: () => [{ id: "location" }, { id: "in-stock" }],
} as any

const countFor = (errors: Record<string, unknown>) =>
  renderHook(() => useDataGridErrorHighlighting(matrix, grid, errors as any))
    .result.current.errorCount

// Pagly-Core/pagly-app#356: inventory create's Availability grid said
// "1 error" for the Title on the step before, and clicking it showed nothing.
describe("the data grid's error count", () => {
  it("leaves out errors of fields outside the grid", () => {
    expect(countFor({ title: { type: "too_small", message: "Obligatorio" } })).toBe(0)
  })

  it("counts the grid's own errors", () => {
    expect(
      countFor({
        title: { type: "too_small", message: "Obligatorio" },
        locations: { sloc_2: { type: "custom", message: "El valor debe ser un número positivo." } },
      })
    ).toBe(1)
  })
})

// A shipping option's prices: one row whose cells share no prefix, so the row
// has no accessor.
const pricesMatrix = {
  rowAccessors: [null],
  columnAccessors: ["currency_prices.uyu", "region_prices.reg_1"],
  getFieldsInRow: () => ["currency_prices.uyu", "region_prices.reg_1"],
} as any

const pricesGrid = {
  getRowModel: () => ({ flatRows: [{}] }),
  getAllFlatColumns: () => [{ id: "uyu" }, { id: "reg_1" }],
} as any

describe("the data grid's error count, one row without an accessor", () => {
  it("counts the errors of its cells", () => {
    const errors = {
      name: { type: "too_small", message: "Obligatorio" },
      currency_prices: { uyu: { type: "custom", message: "Ingresá un precio" } },
    }
    expect(
      renderHook(() => useDataGridErrorHighlighting(pricesMatrix, pricesGrid, errors as any))
        .result.current.errorCount
    ).toBe(1)
  })
})
