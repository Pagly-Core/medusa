// @vitest-environment jsdom
import { TooltipProvider } from "@medusajs/ui"
import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { makeOrder } from "../../../__fixtures__/order"
import { OrderPaymentSection } from "../order-payment-section"

const zones = vi.hoisted(() => ({ current: {} as Record<string, any[]> }))

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "es" },
  }),
}))

vi.mock("../../../../../../providers/extension-provider", () => ({
  useExtension: () => ({
    getWidgets: (zone: string) => zones.current[zone] ?? [],
  }),
}))

vi.mock("../../../../../../hooks/api", () => ({
  useCapturePayment: () => ({ mutateAsync: vi.fn() }),
  useAuthorizePaymentSession: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock("../../../../../../hooks/use-date", () => ({
  useDate: () => ({
    getRelativeDate: () => "",
    getFullDate: () => "20 nov 2026, 10:19",
  }),
}))

beforeEach(() => {
  zones.current = {}
})

afterEach(() => {
  cleanup()
})

const renderPayment = (order = makeOrder()) =>
  render(
    <MemoryRouter>
      <TooltipProvider>
        <OrderPaymentSection order={order} plugins={[]} />
      </TooltipProvider>
    </MemoryRouter>
  )

describe("OrderPaymentSection as Pago", () => {
  it("is titled Pago", () => {
    renderPayment()
    expect(
      screen.getByRole("heading", { name: "orders.payment.title" })
    ).toBeTruthy()
  })

  it("names the manual payment in words, never by its provider id", () => {
    renderPayment()
    expect(screen.getByText("orders.payment.manualProvider")).toBeTruthy()
    expect(screen.queryByText(/System/)).toBeNull()
  })

  it("leaves the paid total to Productos", () => {
    renderPayment()
    expect(screen.queryByText("orders.payment.totalPaidByCustomer")).toBeNull()
  })

  it("puts plugin payment parts inside the card, with the order", () => {
    const seen: string[] = []
    const Receipts = ({ data }: any) => {
      seen.push(data.id)
      return <div data-testid="receipts" />
    }
    zones.current = { "order.details.payment": [Receipts] }

    renderPayment()

    expect(screen.getByTestId("receipts")).toBeTruthy()
    expect(seen[0]).toBe("order_1")
  })
})
