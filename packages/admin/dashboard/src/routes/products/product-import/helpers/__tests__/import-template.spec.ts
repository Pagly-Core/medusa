import { describe, expect, it } from "vitest"

import { getProductImportCsvTemplate } from "../import-template"

const template = () => {
  const csv = decodeURI(getProductImportCsvTemplate()).replace(
    "data:text/csv;charset=utf-8,",
    ""
  )
  const [header, ...rows] = csv.split("\n")
  // The sample descriptions are quoted and hold commas: split outside quotes.
  const cells = (line: string) =>
    (line.match(/("[^"]*"|[^,]*)(,|$)/g) ?? []).map((cell) =>
      cell.replace(/,$/, "")
    )
  const columns = cells(header)
  return rows.map((row) => {
    const values = cells(row)
    return Object.fromEntries(columns.map((column, i) => [column, values[i]]))
  })
}

// Pagly-Core/pagly-app#354: the template priced in EUR and USD and published
// its samples on import, though a Pagly store sells in UYU and USD only.
describe("the product import template", () => {
  it("prices in the currencies a store sells in, UYU and USD", () => {
    const columns = Object.keys(template()[0]).filter((column) =>
      column.startsWith("Variant Price")
    )
    expect(columns).toEqual(["Variant Price UYU", "Variant Price USD"])
  })

  it("gives every sample variant a price in pesos", () => {
    for (const row of template()) {
      expect(Number(row["Variant Price UYU"])).toBeGreaterThan(0)
    }
  })

  it("imports its samples as drafts", () => {
    expect(new Set(template().map((row) => row["Product Status"]))).toEqual(
      new Set(["draft"])
    )
  })
})
