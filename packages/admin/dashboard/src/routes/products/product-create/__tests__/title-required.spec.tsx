// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { useEffect } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { TooltipProvider } from "@medusajs/ui"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.hoisted(() => {
  const g = global as any
  g.__BACKEND_URL__ = "http://localhost:9000"
  g.__AUTH_TYPE__ = "session"
  g.__JWT_TOKEN_STORAGE_KEY__ = ""
})

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock("../../../../components/inputs/handle-input", () => ({ HandleInput: () => null }))
vi.mock("../../../../components/inputs/rich-text-input", () => ({ RichTextInput: () => null }))

import { ProductCreateSchema } from "../constants"
import { ProductCreateGeneralSection } from "../components/product-create-details-form/components/product-create-details-general-section"

afterEach(cleanup)

const titleIssues = () => {
  const result = ProductCreateSchema.safeParse({ title: "" })
  return result.success ? [] : result.error.issues.filter((issue) => issue.path.join(".") === "title")
}

// Pagly-Core/pagly-app#356: a product saved without a title only turned the
// field red, with no word of what was wrong.
describe("a product's title", () => {
  it("is required, in the admin's words", () => {
    expect(titleIssues().map((issue) => issue.message)).toEqual(["validation.required"])
  })

  it("says under the field what is wrong", async () => {
    const Section = () => {
      const form = useForm<any>({ defaultValues: { title: "" } })
      useEffect(() => {
        form.setError("title", { message: "validation.required" })
      }, [form])
      return (
        <FormProvider {...form}>
          <ProductCreateGeneralSection form={form} />
        </FormProvider>
      )
    }

    render(
      <TooltipProvider>
        <Section />
      </TooltipProvider>
    )

    await waitFor(() => expect(screen.getByText("validation.required")).toBeTruthy())
  })
})
