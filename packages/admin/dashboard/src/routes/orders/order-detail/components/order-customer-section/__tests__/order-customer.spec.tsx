// @vitest-environment jsdom
import { TooltipProvider } from "@medusajs/ui"
import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { makeOrder } from "../../../__fixtures__/order"
import { OrderCustomerSection } from "../order-customer-section"

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

beforeEach(() => {
  zones.current = {}
})

afterEach(() => {
  cleanup()
})

const renderCustomer = (order = makeOrder()) =>
  render(
    <MemoryRouter>
      <TooltipProvider>
        <OrderCustomerSection order={order} />
      </TooltipProvider>
    </MemoryRouter>
  )

describe("OrderCustomerSection as Cliente", () => {
  it("leaves the shipping address to Envío", () => {
    renderCustomer()
    expect(screen.queryByText(/Av\. 18 de Julio/)).toBeNull()
  })

  it("says the invoice goes like the shipping when there is no billing address", () => {
    renderCustomer()
    expect(screen.getByText("orders.customer.billing")).toBeTruthy()
    expect(
      screen.getByText("orders.customer.billingSameAsShipping")
    ).toBeTruthy()
  })

  it("shows a billing address of its own", () => {
    renderCustomer(
      makeOrder({
        billing_address: {
          id: "addr_bill",
          first_name: "Estudio",
          last_name: "Lino SRL",
          address_1: "Colonia 1020",
          city: "Montevideo",
          postal_code: "11100",
          country_code: "uy",
        },
      })
    )
    expect(screen.getByText(/Colonia 1020/)).toBeTruthy()
  })

  it("puts plugin customer parts inside the card, with the order", () => {
    const seen: string[] = []
    const Checkout = ({ data }: any) => {
      seen.push(data.id)
      return <div data-testid="checkout-answers" />
    }
    zones.current = { "order.details.customer": [Checkout] }

    renderCustomer()

    expect(screen.getByTestId("checkout-answers")).toBeTruthy()
    expect(seen[0]).toBe("order_1")
  })
})
