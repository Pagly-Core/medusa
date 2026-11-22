// @vitest-environment jsdom
import { TooltipProvider } from "@medusajs/ui"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { OrderSummarySection } from "../order-summary-section"

const fetch = vi.hoisted(() => vi.fn())

vi.mock("../../../../../../providers/extension-provider", () => ({
  useExtension: () => ({ getWidgets: () => [] }),
}))

vi.mock("../../../../../../lib/client", () => ({
  sdk: { client: { fetch } },
}))

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
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

const BUNDLE = "OFFER-OFFER-01K8ZQ4A2B3C4D5E6F7G8H9J0K"
const TIER = "OFFER-OFFER-01K8ZQ3V6N2W4XJ5Y7A9B1C3D5-3"

const adjustment = (code: string, amount: number) => ({
  id: `adj_${code}_${amount}`,
  code,
  amount,
})

const lineItem = (
  id: string,
  title: string,
  quantity: number,
  unitPrice: number,
  adjustments: ReturnType<typeof adjustment>[]
) => ({
  id,
  title,
  product_title: title,
  variant_title: null,
  variant_sku: null,
  thumbnail: null,
  quantity,
  unit_price: unitPrice,
  subtotal: quantity * unitPrice,
  total: quantity * unitPrice,
  original_total: quantity * unitPrice,
  refundable_total: 0,
  requires_shipping: true,
  adjustments,
  detail: {
    fulfilled_quantity: 0,
    return_requested_quantity: 0,
    return_received_quantity: 0,
  },
  variant: { manage_inventory: false, options: [] },
})

// The demo's order: the shoe in the bundle, three laces on the volume tier,
// and Santander's 25% at payment.
const order = {
  id: "order_1",
  status: "pending",
  display_id: 1,
  currency_code: "usd",
  payment_collections: [],
  credit_lines: [],
  summary: { pending_difference: 0 },
  items: [
    lineItem("item_shoe", "Air Jordan 1 Low", 1, 100, [
      adjustment(BUNDLE, 15),
      adjustment("SANTANDER25", 21.25),
    ]),
    lineItem("item_laces", "Red laces", 3, 10, [
      adjustment(TIER, 6),
      adjustment(BUNDLE, 1.5),
      adjustment("SANTANDER25", 5.63),
    ]),
  ],
  shipping_methods: [
    {
      id: "sm_1",
      name: "Standard",
      amount: 5,
      total: 0,
      adjustments: [adjustment("FREESHIP-BF", 5)],
    },
  ],
  item_total: 130,
  item_subtotal: 130,
  item_tax_total: 0,
  item_discount_total: 49.38,
  shipping_total: 0,
  shipping_subtotal: 5,
  shipping_tax_total: 0,
  shipping_discount_total: 5,
  discount_total: 54.38,
  tax_total: 0,
  original_total: 135,
  total: 80.62,
  credit_line_total: 0,
  paid_total: 0,
  refunded_total: 0,
}

const discounts = [
  { label: "Air Jordan 1 Low + laces bundle", kind: "offer", amount: 16.5, code: BUNDLE },
  { label: "Shoelaces volume discount · 3+", kind: "offer", amount: 6, code: TIER },
  { label: "Black Friday", kind: "promotion", amount: 5, code: "FREESHIP-BF" },
  { label: "Santander 25%", kind: "bank", amount: 26.88, code: "SANTANDER25" },
]

const renderSummary = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <TooltipProvider>
          <OrderSummarySection order={order as any} plugins={[]} />
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )

// Pagly: the order page redesign keeps the discounts open; nothing to click.
const openDiscounts = () => {
  expect(screen.getByText("orders.summary.discount")).toBeTruthy()
}

beforeEach(() => {
  fetch.mockReset()
})

afterEach(() => {
  cleanup()
})

describe("the order's discounts", () => {
  it("reads each discount by its name, with what it took off", async () => {
    fetch.mockResolvedValue({ discounts })

    renderSummary()
    openDiscounts()

    await screen.findByText("Air Jordan 1 Low + laces bundle")
    expect(fetch).toHaveBeenCalledWith("/admin/orders/order_1/discounts")

    // The amounts follow the machine's number format.
    const rows = screen.getAllByTestId("order-discount-row")
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^Air Jordan 1 Low \+ laces bundle.*16[.,]50/),
      expect.stringMatching(/^Shoelaces volume discount · 3\+.*6[.,]00/),
      expect.stringMatching(/^Black Friday.*5[.,]00/),
      expect.stringMatching(/^Santander 25%.*26[.,]88/),
    ])
  })

  // As upstream's "Shipping (CODE)" row did, a discount on shipping alone says so.
  it("says which discounts applied to shipping", async () => {
    fetch.mockResolvedValue({ discounts })

    renderSummary()
    openDiscounts()

    await screen.findByText("Black Friday")
    const rows = screen.getAllByTestId("order-discount-row").map((row) => row.textContent)
    expect(rows[2]).toMatch(/^Black Friday\(fields\.shipping\)/)
    expect(rows.filter((row) => row?.includes("fields.shipping"))).toHaveLength(1)
  })

  it("never shows an offer's internal code once the names are in", async () => {
    fetch.mockResolvedValue({ discounts })

    const { container } = renderSummary()
    openDiscounts()

    await screen.findByText("Santander 25%")
    expect(container.textContent).not.toContain("OFFER-")
    expect(container.textContent).not.toContain("SANTANDER25")
  })

  it("names the discounts on each item by their labels", async () => {
    fetch.mockResolvedValue({ discounts })

    renderSummary()

    await waitFor(() =>
      expect(
        screen
          .getAllByTestId("order-item-discounts")
          .map((icon) => icon.getAttribute("aria-label"))
      ).toEqual([
        "Air Jordan 1 Low + laces bundle, Santander 25%",
        "Shoelaces volume discount · 3+, Air Jordan 1 Low + laces bundle, Santander 25%",
      ])
    )
  })

  it("falls back to the codes when the store cannot name them", async () => {
    fetch.mockRejectedValue(Object.assign(new Error("Not found"), { status: 404 }))

    renderSummary()
    openDiscounts()

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    // As upstream lists them: sorted, once each.
    await screen.findByText(`(${TIER}, ${BUNDLE}, SANTANDER25)`)
    expect(screen.getByText("(FREESHIP-BF)")).toBeTruthy()
    expect(
      screen
        .getAllByTestId("order-item-discounts")
        .map((icon) => icon.getAttribute("aria-label"))
    ).toEqual([`${BUNDLE}, SANTANDER25`, `${TIER}, ${BUNDLE}, SANTANDER25`])
  })
})
