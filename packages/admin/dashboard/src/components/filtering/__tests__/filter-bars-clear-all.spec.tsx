// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { createInstance } from "i18next"
import { ReactNode } from "react"
import { I18nextProvider } from "react-i18next"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"

import en from "../../../i18n/translations/en.json"
import es from "../../../i18n/translations/es.json"
import { DataTableFilter } from "../../table/data-table/data-table-filter"
import { FilterGroup } from "../filter-group"

/**
 * Pagly: the filter bars said "Clear all" in English on every filtered list of
 * the Spanish admin. They take the words from `actions.clearAll`, like the
 * newer DataTable.
 */

afterEach(() => {
  cleanup()
})

const renderIn = async (lng: string, ui: ReactNode) => {
  const i18n = createInstance()

  await i18n.init({
    lng,
    resources: { en: { translation: en }, es: { translation: es } },
  })

  return render(
    // i18next ships separate ESM and CJS types for the same instance
    <I18nextProvider i18n={i18n as never}>
      <MemoryRouter initialEntries={["/?status=draft"]}>{ui}</MemoryRouter>
    </I18nextProvider>
  )
}

const filter = {
  key: "status",
  label: "Status",
  type: "select" as const,
  options: [{ label: "Draft", value: "draft" }],
}

describe.each([
  ["es", "Borrar todo"],
  ["en", "Clear all"],
])("clearing the filters in %s", (lng, label) => {
  it("DataTableFilter says it in the admin's language", async () => {
    await renderIn(lng, <DataTableFilter filters={[filter]} />)

    expect(screen.getByRole("button", { name: label })).toBeTruthy()
  })

  it("FilterGroup says it in the admin's language", async () => {
    await renderIn(lng, <FilterGroup filters={{ status: "Status" }} />)

    expect(screen.getByRole("button", { name: label })).toBeTruthy()
  })
})
