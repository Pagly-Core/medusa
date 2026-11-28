// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any

const mocks = vi.hoisted(() => ({ create: vi.fn() }))

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock("../../../../../../components/modals", async () => {
  const { FormProvider } = await import("react-hook-form")
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>
  return {
    RouteFocusModal: Object.assign(Pass, {
      Form: ({ form, children }: { form: any; children?: ReactNode }) => <FormProvider {...form}>{children}</FormProvider>,
      Header: Pass,
      Body: Pass,
      Footer: Pass,
      Close: Pass,
    }),
    useRouteModal: () => ({ handleSuccess: vi.fn() }),
  }
})
vi.mock("../../../../../../hooks/api/sales-channels", () => ({
  useCreateSalesChannel: () => ({ mutateAsync: mocks.create, isPending: false }),
}))

import { CreateSalesChannelForm } from "../create-sales-channel-form"

afterEach(cleanup)

// Pagly-Core/pagly-app#267: create required a description, which the API and
// the edit form don't.
describe("creating a sales channel", () => {
  it("takes a channel with a name and no description", async () => {
    render(<CreateSalesChannelForm />)

    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "Instagram" } })
    fireEvent.click(screen.getByRole("button", { name: "actions.save" }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ name: "Instagram" })
  })
})
