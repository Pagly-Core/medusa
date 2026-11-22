// @vitest-environment jsdom
import { TooltipProvider } from "@medusajs/ui"
import { cleanup, render, screen } from "@testing-library/react"
import { useEffect } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  fulfillment,
  makeOrder,
  orderItem,
} from "../../../__fixtures__/order"
import { OrderNextStep } from "../order-next-step"

const zones = vi.hoisted(() => ({ current: {} as Record<string, any[]> }))
const returns = vi.hoisted(() => ({ current: [] as any[] }))

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

vi.mock("../../../../../../hooks/api/orders", () => ({
  useMarkOrderFulfillmentAsDelivered: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock("../../../../../../hooks/api/returns", () => ({
  useReturns: () => ({ returns: returns.current }),
}))

vi.mock("../../../../../../hooks/api/payment-collections", () => ({
  useMarkPaymentCollectionAsPaid: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock("../../../../../../hooks/use-date", () => ({
  useDate: () => ({
    getRelativeDate: () => "ayer",
    getFullDate: () => "21 nov 2026",
  }),
}))

vi.mock("../../active-order-return-section", () => ({
  ActiveOrderReturnSection: () => <div data-testid="active-return" />,
}))
vi.mock("../../active-order-exchange-section", () => ({
  ActiveOrderExchangeSection: () => null,
}))
vi.mock("../../active-order-claim-section", () => ({
  ActiveOrderClaimSection: () => null,
}))
vi.mock("../../order-active-edit-section", () => ({
  OrderActiveEditSection: () => null,
}))

beforeEach(() => {
  zones.current = {}
  returns.current = []
})

afterEach(() => {
  cleanup()
})

const renderStep = (order: any, orderPreview: any = { id: order.id }) =>
  render(
    <MemoryRouter>
      <TooltipProvider>
        <OrderNextStep order={order} orderPreview={orderPreview} />
      </TooltipProvider>
    </MemoryRouter>
  )

const shipped = (over: Record<string, unknown> = {}) =>
  makeOrder({
    fulfillment_status: "shipped",
    items: [
      orderItem("item_mug", {
        detail: { fulfilled_quantity: 2, shipped_quantity: 2 },
      }),
    ],
    fulfillments: [
      fulfillment("ful_1", {
        shipped_at: "2026-11-21T10:00:00.000Z",
        items: [{ line_item_id: "item_mug", quantity: 2 }],
        labels: [{ tracking_number: "2209 4471 03", tracking_url: null }],
      }),
    ],
    ...over,
  })

describe("OrderNextStep", () => {
  it("offers to prepare an order with items still to send", () => {
    renderStep(makeOrder())

    expect(screen.getByText("orders.nextStep.prepare.title")).toBeTruthy()
    const action = screen.getByRole("link", {
      name: "orders.nextStep.prepare.action",
    })
    expect(action.getAttribute("href")).toBe(
      "/orders/order_1/fulfillment?requires_shipping=true"
    )
  })

  it("gives a plugin's next step the order and a claim, and hides its own step while it is claimed", () => {
    const seen: any[] = []
    const Request = ({ data, claim }: any) => {
      seen.push(data)
      useEffect(() => claim(true), [claim])
      return <div data-testid="customer-request" />
    }
    zones.current = { "order.details.next": [Request] }

    renderStep(makeOrder())

    expect(screen.getByTestId("customer-request")).toBeTruthy()
    expect(seen[0].id).toBe("order_1")
    expect(screen.queryByText("orders.nextStep.prepare.title")).toBeNull()
  })

  it("keeps its own step when a plugin part has nothing to ask", () => {
    const Quiet = ({ claim }: any) => {
      useEffect(() => claim(false), [claim])
      return null
    }
    zones.current = { "order.details.next": [Quiet] }

    renderStep(makeOrder())

    expect(screen.getByText("orders.nextStep.prepare.title")).toBeTruthy()
  })

  it("shows an order on its way with a way to mark it delivered", () => {
    renderStep(shipped())

    expect(screen.getByText("orders.nextStep.shipped.title")).toBeTruthy()
    expect(
      screen.getByRole("button", { name: "orders.nextStep.shipped.action" })
    ).toBeTruthy()
    expect(screen.queryByText("orders.nextStep.prepare.title")).toBeNull()
  })

  it("shows nothing once everything was delivered", () => {
    const order = shipped({
      fulfillment_status: "delivered",
      items: [
        orderItem("item_mug", {
          detail: {
            fulfilled_quantity: 2,
            shipped_quantity: 2,
            delivered_quantity: 2,
          },
        }),
      ],
      fulfillments: [
        fulfillment("ful_1", {
          shipped_at: "2026-11-21T10:00:00.000Z",
          delivered_at: "2026-11-22T15:40:00.000Z",
        }),
      ],
    })

    const { container } = renderStep(order)

    expect(container.textContent).toBe("")
  })

  it("shows nothing on a canceled order", () => {
    const { container } = renderStep(
      makeOrder({ status: "canceled", canceled_at: "2026-11-21T10:00:00.000Z" })
    )

    expect(container.textContent).toBe("")
  })

  it("puts an open return, exchange, claim or edit first", () => {
    renderStep(makeOrder(), {
      id: "order_1",
      order_change: {
        id: "ordch_1",
        change_type: "return_request",
        status: "requested",
        return_id: "ret_1",
      },
    })

    expect(screen.getByTestId("active-return")).toBeTruthy()
    expect(screen.queryByText("orders.nextStep.prepare.title")).toBeNull()
  })

  it("asks to receive a return that is on its way back", () => {
    returns.current = [{ id: "ret_1", canceled_at: null }]

    renderStep(shipped())

    const action = screen.getByRole("link", {
      name: "orders.returns.receive.action",
    })
    expect(action.getAttribute("href")).toBe(
      "/orders/order_1/returns/ret_1/receive"
    )
    expect(screen.queryByText("orders.nextStep.shipped.title")).toBeNull()
  })

  it("asks for the payment when the order still owes it", () => {
    const order = makeOrder({
      payment_status: "not_paid",
      summary: { pending_difference: 2833 },
      payment_collections: [
        {
          id: "paycol_1",
          status: "not_paid",
          amount: 2833,
          currency_code: "uyu",
          payments: [],
        },
      ],
    })

    renderStep(order)

    expect(screen.getByText("orders.nextStep.unpaid.title")).toBeTruthy()
    expect(
      screen.getByRole("button", { name: "orders.payment.markAsPaid" })
    ).toBeTruthy()
    expect(screen.queryByText("orders.nextStep.prepare.title")).toBeNull()
  })
})
