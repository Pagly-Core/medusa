// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>
  g.__BACKEND_URL__ = "http://localhost:9000"
  g.__AUTH_TYPE__ = "session"
  g.__JWT_TOKEN_STORAGE_KEY__ = ""
})

const state = vi.hoisted(() => ({
  variantOptions: [] as unknown[],
  store: { store: undefined as unknown, isPending: true },
  lists: [] as unknown[],
  listPrices: {} as Record<string, unknown[]>,
}))

vi.mock("../../../../hooks/api/products", () => ({
  useProductVariants: (_id: string, _query: unknown, options: unknown) => {
    state.variantOptions.push(options)
    return {
      variants: [
        {
          id: "v1",
          inventory_items: [
            { inventory: { location_levels: [{ location_id: "sloc_1" }] } },
          ],
        },
      ],
      isPending: false,
    }
  },
}))
vi.mock("../../../../hooks/api/store", () => ({ useStore: () => state.store }))
vi.mock("../../../../hooks/api/stock-locations", () => ({
  useStockLocations: () => ({ count: 2 }),
}))
vi.mock("../../../../hooks/api/price-lists", () => ({
  usePriceLists: () => ({ price_lists: state.lists }),
}))
vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useQueries: ({ queries }: { queries: { queryKey: unknown[] }[] }) =>
    queries.map((q) => ({
      data: { prices: state.listPrices[String(q.queryKey.at(-1))] ?? [] },
    })),
}))
vi.mock("../../../../lib/client", () => ({
  sdk: { admin: { priceList: { prices: vi.fn() } } },
}))

import { useProductPageFacts } from "../use-product-page-facts"

afterEach(() => {
  state.variantOptions = []
  state.store = { store: undefined, isPending: true }
  state.lists = []
  state.listPrices = {}
})

const STORE = {
  store: { supported_currencies: [{ currency_code: "uyu", is_default: true }] },
  isPending: false,
}

describe("useProductPageFacts", () => {
  it("never shows the previous product's variants while this one's load", () => {
    renderHook(() => useProductPageFacts({ id: "prod_1" } as any, null))
    expect(
      (state.variantOptions[0] as { placeholderData?: unknown } | undefined)
        ?.placeholderData
    ).toBeUndefined()
  })

  it("is pending until the store's currency is known", () => {
    const { result, rerender } = renderHook(() =>
      useProductPageFacts({ id: "prod_1" } as any, null)
    )
    expect(result.current.isPending).toBe(true)

    state.store = STORE
    rerender()
    expect(result.current.isPending).toBe(false)
    expect(result.current.currency).toBe("uyu")
  })

  it("counts the places this product is stocked in", () => {
    const { result } = renderHook(() =>
      useProductPageFacts({ id: "prod_1" } as any, null)
    )
    expect(result.current.places).toBe(1)
  })

  it("reads each running offer's prices by variant", () => {
    state.store = STORE
    state.lists = [
      {
        id: "plist_1",
        title: "Black Week",
        type: "sale",
        status: "active",
        ends_at: null,
        rules: {},
      },
    ]
    state.listPrices = {
      plist_1: [
        {
          amount: 990,
          currency_code: "uyu",
          price_set: { variant: { id: "v1" } },
        },
      ],
    }
    const { result } = renderHook(() =>
      useProductPageFacts({ id: "prod_1" } as any, null)
    )
    expect(result.current.sales.get("v1")).toEqual({
      amount: 990,
      offer: "Black Week",
      ends_at: null,
      type: "sale",
    })
  })
})
