// @vitest-environment jsdom
import { TooltipProvider } from "@medusajs/ui"
import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.hoisted(() => {
  const g = global as any
  g.__BACKEND_URL__ = "http://localhost:9000"
  g.__AUTH_TYPE__ = "session"
  g.__JWT_TOKEN_STORAGE_KEY__ = ""
})

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock("../../../../../../lib/promotions", () => ({ getPromotionStatus: () => ["green", "statuses.active"] }))
vi.mock("../../../../../../hooks/api/promotions", () => ({ useDeletePromotion: () => ({ mutateAsync: vi.fn() }) }))

import { PromotionGeneralSection } from "../promotion-general-section"

afterEach(cleanup)

// Pagly-Core/pagly-app#356: the row labelled "Campaign" showed how the
// promotion applies (by code, automatic); the campaign has its own section.
describe("a promotion's general section", () => {
  it("names the method row as the method", () => {
    render(
      <MemoryRouter>
        <TooltipProvider>
          <PromotionGeneralSection
            promotion={{ id: "promo_1", code: "VERANO", is_automatic: false, status: "active", type: "standard", application_method: { type: "percentage", value: 10, target_type: "order", allocation: "across" }, campaign: null } as any}
          />
        </TooltipProvider>
      </MemoryRouter>
    )

    const method = screen.getByText("promotions.form.method.code.title")
    expect(method.parentElement?.textContent).toContain("promotions.fields.method")
    expect(method.parentElement?.textContent).not.toContain("promotions.fields.campaign")
  })
})
