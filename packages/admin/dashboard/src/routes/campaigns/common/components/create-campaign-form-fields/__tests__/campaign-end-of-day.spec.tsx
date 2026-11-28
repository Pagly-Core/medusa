// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import { TooltipProvider } from "@medusajs/ui"
import { FormProvider, useForm } from "react-hook-form"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.hoisted(() => {
  const g = global as any
  g.__BACKEND_URL__ = "http://localhost:9000"
  g.__AUTH_TYPE__ = "session"
  g.__JWT_TOKEN_STORAGE_KEY__ = ""
})

const pickers = vi.hoisted(() => [] as Record<string, unknown>[])

vi.mock("@medusajs/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@medusajs/ui")>()
  return {
    ...actual,
    DatePicker: (props: Record<string, unknown>) => {
      pickers.push(props)
      return null
    },
  }
})
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock("../../../../../../hooks/api/store", () => ({
  useStore: () => ({ store: { supported_currencies: [{ currency_code: "uyu", is_default: true }] } }),
}))
vi.mock("../../../../../../components/inputs/combobox", () => ({ Combobox: () => null }))

import { CreateCampaignFormFields } from "../create-campaign-form-fields"

afterEach(() => {
  cleanup()
  pickers.length = 0
})

const Fields = () => {
  const form = useForm<any>({
    defaultValues: { name: "", campaign_identifier: "", description: "", starts_at: null, ends_at: null, budget: { type: "usage", limit: null, currency_code: null } },
  })
  return (
    <TooltipProvider>
      <FormProvider {...form}>
        <CreateCampaignFormFields form={form} />
      </FormProvider>
    </TooltipProvider>
  )
}

// Pagly-Core/pagly-app#261: an end date of "31/12" with no time meant 00:00
// that day, so the campaign ended a day early.
describe("a campaign's end date", () => {
  it("defaults to the end of the day when no time is set", () => {
    render(<Fields />)

    const [start, end] = pickers.slice(-2)
    const placeholder = end.placeholderValue as Date | undefined
    expect(placeholder).toBeInstanceOf(Date)
    expect([placeholder!.getHours(), placeholder!.getMinutes()]).toEqual([23, 59])
    expect(start.placeholderValue).toBeUndefined()
  })
})
