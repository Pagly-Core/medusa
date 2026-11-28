// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

import { PromotionConditionsSection } from "../promotion-conditions-section"

afterEach(cleanup)

const emptyText = (ruleType: string, applicationMethodTargetType?: any) => {
  render(
    <MemoryRouter>
      <PromotionConditionsSection
        rules={[]}
        ruleType={ruleType}
        applicationMethodTargetType={applicationMethodTargetType}
      />
    </MemoryRouter>
  )
  return screen.getByText(/^promotions\.conditions\.list\./).textContent
}

// Pagly-Core/pagly-app#356: under "Who can use this code?" the empty text
// talked about items, as it did for every kind of condition.
describe("a promotion's empty conditions", () => {
  it("talk about who can use it, for the usage conditions", () => {
    expect(emptyText("rules")).toBe("promotions.conditions.list.noRecordsRulesMessage")
  })

  it("talk about shipping methods, for a shipping promotion's targets", () => {
    expect(emptyText("target-rules", "shipping_methods")).toBe(
      "promotions.conditions.list.noRecordsShippingMessage"
    )
  })

  it("talk about the cart, for a buy X get Y's buy rules", () => {
    expect(emptyText("buy-rules", "items")).toBe("promotions.conditions.list.noRecordsBuyMessage")
  })

  it("talk about items, for an item promotion's targets", () => {
    expect(emptyText("target-rules", "items")).toBe("promotions.conditions.list.noRecordsMessage")
  })
})
