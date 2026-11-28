// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useDataGridErrorHighlighting } from "../use-data-grid-error-highlighting"

// The inventory create grid: one row per location, its cell at `locations.<id>`.
const matrix = {
  rowAccessors: ["locations.sloc_1", "locations.sloc_2"],
  columnAccessors: [null, "locations"],
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
