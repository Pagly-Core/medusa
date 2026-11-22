// @vitest-environment jsdom
import { TooltipProvider } from "@medusajs/ui"
import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

import { OrderFulfillmentSection } from "../order-fulfillment-section"

vi.mock("../../../../../../providers/extension-provider", () => ({
  useExtension: () => ({ getWidgets: () => [] }),
}))

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock("../../../../../../hooks/api/orders", () => ({
  useCancelOrderFulfillment: () => ({ mutateAsync: vi.fn() }),
  useMarkOrderFulfillmentAsDelivered: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock("../../../../../../hooks/api/stock-locations", () => ({
  useStockLocation: () => ({ stock_location: undefined, isError: false }),
}))

afterEach(() => {
  cleanup()
})

const lineItem = (
  id: string,
  productTitle: string,
  variantTitle: string,
  optionValues: string[]
) => ({
  id,
  title: productTitle,
  product_title: productTitle,
  variant_title: variantTitle,
  variant_sku: null,
  thumbnail: null,
  quantity: 2,
  unit_price: 1200,
  subtotal: 2400,
  requires_shipping: true,
  detail: { fulfilled_quantity: 1 },
  variant: {
    title: variantTitle,
    options: optionValues.map((value) => ({ id: `optval_${value}`, value })),
  },
})

const order = {
  id: "order_1",
  status: "pending",
  currency_code: "uyu",
  no_notification: false,
  items: [
    lineItem("item_keychain", "Llavero de cuero", "Default variant", [
      "Default option value",
    ]),
    lineItem("item_shirt", "Remera", "M / Negro", ["M", "Negro"]),
  ],
  fulfillments: [
    {
      id: "ful_1",
      location_id: null,
      provider_id: "manual_manual",
      requires_shipping: true,
      created_at: "2026-10-20T12:00:00.000Z",
      shipped_at: "2026-10-20T13:00:00.000Z",
      canceled_at: null,
      delivered_at: null,
      labels: [],
      items: [
        {
          line_item_id: "item_keychain",
          title: "Default variant",
          quantity: 1,
        },
        { line_item_id: "item_shirt", title: "M / Negro", quantity: 1 },
      ],
    },
  ],
} as any

const renderSection = () =>
  render(
    <MemoryRouter>
      <TooltipProvider>
        <OrderFulfillmentSection order={order} />
      </TooltipProvider>
    </MemoryRouter>
  )

describe("OrderFulfillmentSection", () => {
  it("lists a product's one variant in a fulfillment by the product's title", () => {
    renderSection()

    expect(screen.getByText("1x Llavero de cuero")).toBeTruthy()
    expect(screen.queryByText(/Default variant/)).toBeNull()
  })

  it("keeps a variant's own title in a fulfillment", () => {
    renderSection()

    expect(screen.getByText("1x M / Negro")).toBeTruthy()
  })

  // Pagly: the unfulfilled card is gone (each line says where it stands on Productos).
})
