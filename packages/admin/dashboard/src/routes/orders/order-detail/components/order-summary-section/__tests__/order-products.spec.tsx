// @vitest-environment jsdom
import { TooltipProvider } from "@medusajs/ui"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { makeOrder } from "../../../__fixtures__/order"
import { OrderSummarySection } from "../order-summary-section"

const fetch = vi.hoisted(() => vi.fn())
const zones = vi.hoisted(() => ({ current: {} as Record<string, any[]> }))

vi.mock("../../../../../../lib/client", () => ({
  sdk: { client: { fetch } },
}))

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

vi.mock("../../../../../../hooks/api/reservations", () => ({
  useReservationItems: () => ({ reservations: [] }),
}))
vi.mock("../../../../../../hooks/api/orders", () => ({
  useOrderPreview: () => ({ order: undefined }),
}))
vi.mock("../../../../../../hooks/api/returns", () => ({
  useReturns: () => ({ returns: [] }),
}))
vi.mock("../../../../../../hooks/api/claims", () => ({
  useClaims: () => ({ claims: [] }),
}))
vi.mock("../../../../../../hooks/api/exchanges", () => ({
  useExchanges: () => ({ exchanges: [] }),
}))
vi.mock("../../../../../../hooks/api/payment-collections", () => ({
  useMarkPaymentCollectionAsPaid: () => ({ mutateAsync: vi.fn() }),
}))
vi.mock("../../../../../../hooks/use-date", () => ({
  useDate: () => ({ getRelativeDate: () => "", getFullDate: () => "" }),
}))

beforeEach(() => {
  zones.current = {}
  fetch.mockReset()
  fetch.mockResolvedValue({ labels: [] })
})

afterEach(() => {
  cleanup()
})

const renderProducts = (order = makeOrder()) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <TooltipProvider>
          <OrderSummarySection order={order} plugins={[]} />
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )

describe("OrderSummarySection as Productos", () => {
  it("is titled Productos", () => {
    renderProducts()
    expect(
      screen.getByRole("heading", { name: "orders.products.title" })
    ).toBeTruthy()
  })

  it("says each line's state on the line", () => {
    renderProducts()
    expect(screen.getAllByText("orders.lineState.toPrepare")).toHaveLength(2)
  })

  it("puts each plugin line part under its line, with the order and the line", () => {
    const seen: [string, string][] = []
    const Part = ({ data, item }: any) => {
      seen.push([data.id, item.id])
      return <span data-testid={`part-${item.id}`} />
    }
    zones.current = { "order.details.line": [Part] }

    renderProducts()

    expect(screen.getByTestId("part-item_mug")).toBeTruthy()
    expect(screen.getByTestId("part-item_apron")).toBeTruthy()
    expect(seen).toContainEqual(["order_1", "item_apron"])
  })

  it("reads the money in order: subtotal, discount, shipping, total, tax included, paid", () => {
    const { container } = renderProducts()
    const text = container.textContent ?? ""
    const at = (key: string) => {
      const index = text.indexOf(key)
      expect(index, key).toBeGreaterThan(-1)
      return index
    }

    const order = [
      at("orders.summary.subtotal"),
      at("orders.summary.discountTotal"),
      at("orders.summary.shipping"),
      at("fields.total"),
      at("orders.summary.taxIncluded"),
      at("fields.paidTotal"),
    ]
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it("drops the totals that said the same thing twice", () => {
    renderProducts()
    expect(screen.queryByText("orders.summary.totalAfterDiscount")).toBeNull()
    expect(screen.queryByText("orders.summary.itemSubtotal")).toBeNull()
  })

  it("says nothing is pending when nothing is", () => {
    renderProducts()
    expect(screen.queryByText("orders.returns.outstandingAmount")).toBeNull()
  })

  it("puts tax before the total when prices don't include it", () => {
    const order = makeOrder()
    order.items = order.items.map((item: any) => ({
      ...item,
      is_tax_inclusive: false,
    }))
    const { container } = renderProducts(order)
    const text = container.textContent ?? ""

    expect(text.indexOf("orders.summary.taxTotal")).toBeGreaterThan(-1)
    expect(text.indexOf("orders.summary.taxTotal")).toBeLessThan(
      text.indexOf("fields.total")
    )
    expect(screen.queryByText("orders.summary.taxIncluded")).toBeNull()
  })

  it("moves payment steps out to the next step", () => {
    renderProducts(
      makeOrder({
        summary: { pending_difference: 2833 },
        payment_collections: [
          { id: "paycol_1", status: "not_paid", amount: 2833, payments: [] },
        ],
      })
    )
    expect(
      screen.queryByRole("button", { name: "orders.payment.markAsPaid" })
    ).toBeNull()
  })
})
