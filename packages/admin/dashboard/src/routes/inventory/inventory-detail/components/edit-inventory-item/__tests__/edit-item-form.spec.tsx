// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ update: vi.fn() }))

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock("../../../../../../components/modals", async () => {
  const { FormProvider } = await import("react-hook-form")
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>

  return {
    RouteDrawer: Object.assign(Pass, {
      Form: ({ form, children }: { form: any; children?: ReactNode }) => (
        <FormProvider {...form}>{children}</FormProvider>
      ),
      Body: Pass,
      Footer: Pass,
      Close: Pass,
    }),
    useRouteModal: () => ({ handleSuccess: vi.fn() }),
  }
})

vi.mock("../../../../../../hooks/api/inventory", () => ({
  useUpdateInventoryItem: () => ({ mutateAsync: mocks.update, isPending: false }),
}))

import { EditInventoryItemForm } from "../components/edit-item-form"

afterEach(() => {
  cleanup()
  mocks.update.mockReset()
})

const item = (sku: string | null) =>
  ({ id: "iitem_1", title: "Taza de cerámica", sku } as any)

const saveWithTitle = async (title: string) => {
  fireEvent.change(screen.getByDisplayValue("Taza de cerámica"), { target: { value: title } })
  fireEvent.click(screen.getByRole("button", { name: "actions.save" }))
}

// Pagly-Core/pagly-app#355: the form required a SKU, so an item created
// without one (as create allows) could not be saved at all.
describe("editing an inventory item", () => {
  it("saves an item that has no SKU, keeping it without one", async () => {
    render(<EditInventoryItemForm item={item(null)} />)

    await saveWithTitle("Taza azul")

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    // Never an empty SKU: two of them would clash on the unique SKU index.
    expect(mocks.update.mock.calls[0][0]).toEqual({ title: "Taza azul", sku: null })
  })

  it("keeps the SKU an item has", async () => {
    render(<EditInventoryItemForm item={item("TAZA-01")} />)

    await saveWithTitle("Taza azul")

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update.mock.calls[0][0]).toEqual({ title: "Taza azul", sku: "TAZA-01" })
  })
})
