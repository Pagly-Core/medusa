import { describe, expect, it } from "vitest"

import { buildDisplayEntries } from "../entries"

const entry = (widgetId: string, naturalSection: string) => ({
  widgetId,
  render: () => null,
  naturalSection,
})

const EMPTY = { widgets: {} } as never

// Pagly: a widget for a section the page's layout doesn't have (a side
// widget on a one-column page) renders in the main section, not nowhere.
describe("placing entries in a layout's sections", () => {
  it("keeps an entry in its own section when the layout has it", () => {
    const result = buildDisplayEntries([entry("a", "side")], EMPTY, new Set(["main", "side"]))
    expect(Object.keys(result)).toEqual(["side"])
  })

  it("puts an entry for a section the layout lacks in main", () => {
    const result = buildDisplayEntries([entry("a", "main"), entry("b", "side")], EMPTY, new Set(["main"]))
    expect(result.main.map((one) => one.widgetId)).toEqual(["a", "b"])
    expect(result.side).toBeUndefined()
  })
})
