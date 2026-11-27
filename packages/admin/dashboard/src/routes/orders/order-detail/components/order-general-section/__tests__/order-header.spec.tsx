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

  // Pagly: each store numbers its own orders from 1001 (custom_display_id); Medusa's display_id is
  // shared by every store.
  it("heads the order with the store's own number, and copies that one", () => {
    renderHeader(makeOrder({ display_id: 4562, custom_display_id: "1001" } as never))

    expect(screen.getByRole("heading", { name: "#1001" })).toBeTruthy()
    expect(screen.queryByText("#4562")).toBeNull()
  })

  it("lets the badges wrap below the date on a narrow screen", () => {
    const { container } = renderHeader()
    expect(container.firstElementChild?.className).toContain("flex-wrap")
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
