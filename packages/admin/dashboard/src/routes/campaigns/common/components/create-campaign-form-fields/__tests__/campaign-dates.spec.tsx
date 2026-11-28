// @vitest-environment jsdom
import { TooltipProvider } from "@medusajs/ui"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FormProvider, useForm } from "react-hook-form"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.hoisted(() => {
  const g = global as any
  g.__BACKEND_URL__ = "http://localhost:9000"
  g.__AUTH_TYPE__ = "session"
  g.__JWT_TOKEN_STORAGE_KEY__ = ""
})

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock("../../../../../../hooks/api/store", () => ({
  useStore: () => ({ store: { supported_currencies: [{ currency_code: "uyu", is_default: true }] } }),
}))
vi.mock("../../../../../../components/inputs/combobox", () => ({ Combobox: () => null }))

import { CreateCampaignFormFields } from "../create-campaign-form-fields"

afterEach(cleanup)

const values: { current?: Record<string, unknown> } = {}

const Fields = () => {
  const form = useForm<any>({
    defaultValues: { name: "", campaign_identifier: "", description: "", starts_at: null, ends_at: null, budget: { type: "usage", limit: null, currency_code: null } },
  })
  values.current = form.watch()
  return (
    <TooltipProvider>
      <FormProvider {...form}>
        <CreateCampaignFormFields form={form} />
      </FormProvider>
    </TooltipProvider>
  )
}

// Pagly-Core/pagly-app#261: a start date picked with no time never reached the
// form, so the campaign saved with starts_at null and showed as active.
describe("a campaign's dates", () => {
  it("keeps a start date picked without a time", async () => {
    const user = userEvent.setup()
    render(<Fields />)

    // The start date comes first; its picker opens on its calendar button.
    const [startPicker] = screen.getAllByRole("button")
    await user.click(startPicker)
    await screen.findByRole("grid")
    await user.click((await screen.findAllByRole("button", { name: /15/ }))[0])

    await waitFor(() => expect(values.current?.starts_at).toBeInstanceOf(Date))
  })
})
