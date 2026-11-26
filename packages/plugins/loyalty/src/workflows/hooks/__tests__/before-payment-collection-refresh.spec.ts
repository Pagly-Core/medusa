jest.mock("@medusajs/medusa/core-flows", () => ({
  refreshCartItemsWorkflow: {
    hooks: { beforeRefreshingPaymentCollection: jest.fn() },
  },
}))

jest.mock("../../carts/workflows/refresh-cart-gift-cards", () => ({
  refreshCartGiftCardsWorkflow: Object.assign(jest.fn(), {
    run: jest.fn(async () => ({ result: [{ id: "cacl_1" }] })),
  }),
}))

import { refreshCartGiftCardsWorkflow } from "../../carts/workflows/refresh-cart-gift-cards"
import { refreshLoyaltyCreditLines } from "../before-payment-collection-refresh"

const run = refreshCartGiftCardsWorkflow.run as unknown as jest.Mock

/** A step context whose query answers the cart given, or none. */
const contextWith = (cart: Record<string, unknown> | undefined) => {
  const graph = jest.fn(async () => ({ data: cart ? [cart] : [] }))
  return {
    graph,
    context: {
      container: { resolve: () => ({ graph }) },
      transactionId: "trx_refresh",
    },
  }
}

const refresh = (cart: Record<string, unknown> | undefined) => {
  const { graph, context } = contextWith(cart)
  return refreshLoyaltyCreditLines({ input: { cart_id: "cart_1" } }, context).then(
    (response) => ({ response, graph })
  )
}

describe("refreshing a cart's gift cards and saldo before its payment collection", () => {
  beforeEach(() => run.mockClear())

  it("skips the rebuild for a cart with no gift card and no credit line", async () => {
    const { response } = await refresh({ id: "cart_1", gift_cards: [], credit_lines: [] })

    expect(run).not.toHaveBeenCalled()
    // Nothing ran, so nothing is cancelled if the refresh fails later on.
    expect(response.compensateInput).toBeFalsy()
  })

  it("skips the rebuild when the only credit lines are not a gift card or saldo", async () => {
    await refresh({
      id: "cart_1",
      gift_cards: [],
      credit_lines: [{ id: "cacl_1", reference: "refund" }],
    })

    expect(run).not.toHaveBeenCalled()
  })

  it("rebuilds a cart that holds a gift card", async () => {
    const { response } = await refresh({
      id: "cart_1",
      gift_cards: [{ id: "gc_1" }],
      credit_lines: [{ id: "cacl_1", reference: "gift-card" }],
    })

    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({ input: { cart_id: "cart_1" } })
    )
    expect(response.compensateInput).toBe("trx_refresh")
  })

  it("rebuilds a cart holding a gift card without a credit line, so a spent or expired one is dropped", async () => {
    await refresh({ id: "cart_1", gift_cards: [{ id: "gc_1" }], credit_lines: [] })

    expect(run).toHaveBeenCalledTimes(1)
  })

  it("rebuilds a cart paying with saldo", async () => {
    await refresh({
      id: "cart_1",
      gift_cards: [],
      credit_lines: [{ id: "cacl_1", reference: "store-credit" }],
    })

    expect(run).toHaveBeenCalledTimes(1)
  })

  it("rebuilds a gift card credit line whose card is no longer linked", async () => {
    await refresh({
      id: "cart_1",
      gift_cards: [],
      credit_lines: [{ id: "cacl_1", reference: "gift-card" }],
    })

    expect(run).toHaveBeenCalledTimes(1)
  })

  it("leaves a refresh with no cart id to the rebuild, without reading any cart", async () => {
    const { graph, context } = contextWith({ id: "cart_other", gift_cards: [], credit_lines: [] })

    await refreshLoyaltyCreditLines({ input: {} }, context)

    expect(graph).not.toHaveBeenCalled()
    expect(run).toHaveBeenCalledTimes(1)
  })

  it("leaves a cart it cannot read to the rebuild, which says it was not found", async () => {
    await refresh(undefined)

    expect(run).toHaveBeenCalledTimes(1)
  })
})
