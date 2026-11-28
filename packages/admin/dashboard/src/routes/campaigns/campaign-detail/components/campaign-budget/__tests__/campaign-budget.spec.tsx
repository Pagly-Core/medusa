// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  Trans: ({ values }: { values: { amount: unknown } }) => <span data-testid="total">{String(values.amount)}</span>,
}))

vi.mock("../../../../../../components/common/action-menu", () => ({ ActionMenu: () => null }))

import { CampaignBudget } from "../campaign-budget"

afterEach(cleanup)

// Pagly-Core/pagly-app#356: a campaign without a limit said "no limit" in
// English whatever the admin's language.
describe("a campaign's budget", () => {
  it("says it has no limit in the admin's words", () => {
    render(<CampaignBudget campaign={{ id: "camp_1", budget: { type: "usage", limit: null, used: 0 } } as any} />)

    expect(screen.getByTestId("total").textContent).toBe("campaigns.budget.noLimit")
  })

  it("shows its limit", () => {
    render(<CampaignBudget campaign={{ id: "camp_1", budget: { type: "usage", limit: 50, used: 0 } } as any} />)

    expect(screen.getByTestId("total").textContent).toBe("50")
  })
})
