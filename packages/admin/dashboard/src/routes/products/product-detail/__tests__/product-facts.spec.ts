import { describe, expect, it } from "vitest"

import {
  getBlockers,
  getSummary,
  groupVariants,
  groupsStartOpen,
  isOutOfStock,
  priceRange,
  salePrices,
  variantName,
  variantPrice,
  type FactProduct,
  type FactVariant,
} from "../product-facts"

const COLOR = { id: "opt_color", title: "Color", values: [{ value: "Negro" }, { value: "Crudo" }] }
const SIZE = { id: "opt_size", title: "Talle", values: [{ value: "M" }, { value: "XL" }] }
const DEFAULT = { id: "opt_default", title: "Default option", values: [{ value: "Default option value" }] }

const product = (over: Partial<FactProduct> = {}): FactProduct => ({
  id: "prod_1",
  title: "Remera lino",
  status: "published",
  thumbnail: "a.png",
  images: [{ id: "img_1", url: "a.png" }],
  options: [COLOR, SIZE],
  sales_channels: [{ id: "sc_1" }],
  ...over,
})

const variant = (
  color: string | null,
  size: string | null,
  over: Partial<FactVariant> = {}
): FactVariant => ({
  id: `variant_${color}_${size}`,
  title: [color, size].filter(Boolean).join(" / "),
  sku: null,
  manage_inventory: true,
  allow_backorder: false,
  inventory_quantity: 5,
  prices: [{ amount: 1290, currency_code: "uyu", rules: {} }],
  options: [
    ...(size ? [{ option_id: "opt_size", value: size }] : []),
    ...(color ? [{ option_id: "opt_color", value: color }] : []),
  ],
  ...over,
})

describe("variant facts", () => {
  it("reads the price in the store's currency, ignoring prices with rules", () => {
    const v = variant("Negro", "M", {
      prices: [
        { amount: 40, currency_code: "usd", rules: {} },
        { amount: 990, currency_code: "uyu", rules: { region_id: "reg_1" } },
        { amount: 1290, currency_code: "uyu", rules: {} },
      ],
    })
    expect(variantPrice(v, "uyu")).toBe(1290)
    expect(variantPrice(variant("Negro", "M", { prices: [] }), "uyu")).toBeNull()
  })

  it("names a variant by its option values in the product's option order", () => {
    expect(variantName(product(), variant("Negro", "XL"))).toBe("Negro · XL")
  })

  it("names a product's one version after the product", () => {
    const one = product({ options: [DEFAULT] })
    const v = variant(null, null, { title: "Default variant", options: [{ option_id: "opt_default", value: "Default option value" }] })
    expect(variantName(one, v)).toBe("Remera lino")
  })

  it("counts a variant as out of stock only when the store tracks it and it can't sell without units", () => {
    expect(isOutOfStock(variant("Negro", "M", { inventory_quantity: 0 }))).toBe(true)
    expect(isOutOfStock(variant("Negro", "M", { inventory_quantity: 0, manage_inventory: false }))).toBe(false)
    expect(isOutOfStock(variant("Negro", "M", { inventory_quantity: 0, allow_backorder: true }))).toBe(false)
    expect(isOutOfStock(variant("Negro", "M", { inventory_quantity: 3 }))).toBe(false)
  })

  it("gives one price or a range, skipping variants with no price", () => {
    expect(priceRange([1290, 1290])).toEqual({ min: 1290, max: 1290 })
    expect(priceRange([1390, null, 1290])).toEqual({ min: 1290, max: 1390 })
    expect(priceRange([null])).toBeNull()
  })
})

describe("variant groups", () => {
  it("groups by the first option's value when there are two options or more", () => {
    const vs = [variant("Negro", "M"), variant("Crudo", "M"), variant("Negro", "XL")]
    const groups = groupVariants(product(), vs)
    expect(groups?.map((g) => g.value)).toEqual(["Negro", "Crudo"])
    expect(groups?.[0].variants.map((v) => v.id)).toEqual(["variant_Negro_M", "variant_Negro_XL"])
  })

  it("lists the rows flat with one option, or with the default option", () => {
    expect(groupVariants(product({ options: [SIZE] }), [variant(null, "M")])).toBeNull()
    expect(groupVariants(product({ options: [DEFAULT, SIZE] }), [variant(null, "M")])).toBeNull()
  })

  it("opens the groups up to 8 variants and folds them above that", () => {
    expect(groupsStartOpen(Array.from({ length: 8 }, (_, i) => variant("Negro", `${i}`)))).toBe(true)
    expect(groupsStartOpen(Array.from({ length: 9 }, (_, i) => variant("Negro", `${i}`)))).toBe(false)
  })
})

describe("what stops the product from selling", () => {
  const ids = (input: Parameters<typeof getBlockers>[0]) => getBlockers(input).map((b) => b.id)

  it("says nothing when the product sells", () => {
    expect(ids({ product: product(), variants: [variant("Negro", "M")], currency: "uyu", cover: null })).toEqual([])
  })

  it("lists a new product's blockers in the order they're fixed", () => {
    const draft = product({ status: "draft", images: [], thumbnail: null })
    const vs = [variant(null, "S", { prices: [], inventory_quantity: 0 }), variant(null, "M", { prices: [], inventory_quantity: 0 })]
    const blockers = getBlockers({ product: draft, variants: vs, currency: "uyu", cover: null })
    expect(blockers.map((b) => b.id)).toEqual(["noPrice", "noPhotos", "noStock", "draft"])
    expect(blockers[0].count).toBe(2)
  })

  it("names the variants that are out when only some are", () => {
    const vs = [variant("Negro", "M"), variant("Negro", "XL", { inventory_quantity: 0 })]
    expect(getBlockers({ product: product(), variants: vs, currency: "uyu", cover: null })).toEqual([
      { id: "someOut", count: 1, names: ["Negro · XL"] },
    ])
  })

  it("drops the stock blockers while a plugin part sells without stock", () => {
    const vs = [variant(null, "M", { inventory_quantity: 0 })]
    const cover = { row: "En preventa", summary: "En preventa, llega 15 dic" }
    expect(ids({ product: product({ options: [SIZE] }), variants: vs, currency: "uyu", cover })).toEqual([])
  })

  it("says when a published product isn't in the online store", () => {
    expect(ids({ product: product({ sales_channels: [] }), variants: [variant("Negro", "M")], currency: "uyu", cover: null })).toEqual(["noChannel"])
    expect(ids({ product: product({ sales_channels: undefined }), variants: [variant("Negro", "M")], currency: "uyu", cover: null })).toEqual([])
  })

  it("doesn't count photos while the thumbnail is the only picture", () => {
    expect(ids({ product: product({ images: [] }), variants: [variant("Negro", "M")], currency: "uyu", cover: null })).toEqual([])
  })
})

describe("the header's line", () => {
  it("gives the price range, how many variants, and the stock with its places", () => {
    const vs = [variant("Negro", "M", { inventory_quantity: 6 }), variant("Negro", "XL", { prices: [{ amount: 1390, currency_code: "uyu" }], inventory_quantity: 0 })]
    expect(getSummary({ product: product(), variants: vs, currency: "uyu", cover: null, places: 2 })).toEqual({
      price: { min: 1290, max: 1390 },
      variants: 2,
      stock: { kind: "count", count: 6, places: 2 },
    })
  })

  it("leaves out what a blocker says: no price, no stock", () => {
    const vs = [variant(null, "M", { prices: [], inventory_quantity: 0 })]
    expect(getSummary({ product: product({ options: [SIZE] }), variants: vs, currency: "uyu", cover: null, places: 1 })).toEqual({
      price: null,
      variants: null,
      stock: null,
    })
  })

  it("says what the cover says instead of the stock", () => {
    const vs = [variant(null, "M", { inventory_quantity: 0 }), variant(null, "L", { inventory_quantity: 0 })]
    const cover = { row: "En preventa", summary: "En preventa, llega 15 dic" }
    expect(getSummary({ product: product({ options: [SIZE] }), variants: vs, currency: "uyu", cover, places: 1 }).stock).toEqual({
      kind: "cover",
      text: "En preventa, llega 15 dic",
    })
  })

  it("prices by what the shopper pays during an offer", () => {
    const vs = [variant("Negro", "M")]
    const sales = new Map([["variant_Negro_M", { amount: 1032, offer: "Black Week", ends_at: null }]])
    expect(getSummary({ product: product(), variants: vs, currency: "uyu", cover: null, places: 1, sales }).price).toEqual({ min: 1032, max: 1032 })
  })

  it("says nothing about stock when the store doesn't count it", () => {
    const vs = [variant("Negro", "M", { manage_inventory: false, inventory_quantity: 0 })]
    expect(getSummary({ product: product(), variants: vs, currency: "uyu", cover: null, places: 1 }).stock).toBeNull()
  })
})

describe("offer prices", () => {
  it("keeps each variant's lowest price in the store's currency, with its offer", () => {
    const sales = salePrices(
      [
        { title: "Black Week", ends_at: "2026-11-30T23:59:00Z", prices: [{ variant_id: "v1", amount: 990, currency_code: "uyu" }, { variant_id: "v1", amount: 30, currency_code: "usd" }] },
        { title: "Socios", ends_at: null, prices: [{ variant_id: "v1", amount: 1100, currency_code: "uyu" }, { variant_id: "v2", amount: 500, currency_code: "uyu" }] },
      ],
      "uyu"
    )
    expect(sales.get("v1")).toEqual({ amount: 990, offer: "Black Week", ends_at: "2026-11-30T23:59:00Z" })
    expect(sales.get("v2")).toEqual({ amount: 500, offer: "Socios", ends_at: null })
  })
})
