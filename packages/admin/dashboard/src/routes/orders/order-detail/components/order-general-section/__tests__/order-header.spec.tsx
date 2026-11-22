// @vitest-environment jsdom
import { TooltipProvider } from "@medusajs/ui"
import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

import { makeOrder } from "../../../__fixtures__/order"
import { OrderGeneralSection } from "../order-general-section"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key} ${JSON.stringify(values)}` : key,
  }),
}))

vi.mock("../../../../../../hooks/api/orders", () => ({
  useCancelOrder: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock("../../../../../../hooks/use-date", () => ({
  useDate: () => ({ getFullDate: () => "20 nov 2026, 10:19" }),
}))

afterEach(() => {
  cleanup()
})

const renderHeader = (order = makeOrder()) =>
  render(
    <MemoryRouter>
      <TooltipProvider>
        <OrderGeneralSection order={order} />
      </TooltipProvider>
    </MemoryRouter>
  )

describe("OrderGeneralSection as the header", () => {
  it("says when, where and who in one line", () => {
    renderHeader()
    expect(
      screen.getByText(
        'orders.headerMeta {"date":"20 nov 2026, 10:19","channel":"Tienda online","customer":"Ana Pérez"}'
      )
    ).toBeTruthy()
  })

  it("leaves the customer out when the order has none", () => {
    renderHeader(makeOrder({ customer: null, email: null }))
    expect(
      screen.getByText(
        'orders.onDateFromSalesChannel {"date":"20 nov 2026, 10:19","salesChannel":"Tienda online"}'
      )
    ).toBeTruthy()
  })
})
