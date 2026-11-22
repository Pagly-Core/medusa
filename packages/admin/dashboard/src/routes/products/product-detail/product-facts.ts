import { HttpTypes } from "@medusajs/types"

import {
  getOptionValues,
  getVariantTitle,
  isDefaultOption,
} from "../../../lib/default-names"

/**
 * Pagly: the product page's facts, worked out once from the product and its
 * variants: prices, stock, the variant groups and what stops it from selling.
 * The cards only draw them.
 */

export type FactVariant = Pick<
  HttpTypes.AdminProductVariant,
  "id" | "title" | "sku" | "manage_inventory" | "allow_backorder"
> & {
  prices?:
    | {
        amount: number
        currency_code: string
        rules?: Record<string, unknown> | null
      }[]
    | null
  options?: { option_id?: string | null; value?: string | null }[] | null
  inventory_quantity?: number | null
}

export type FactProduct = Pick<
  HttpTypes.AdminProduct,
  "id" | "title" | "status" | "thumbnail"
> & {
  images?: { id: string; url: string }[] | null
  options?:
    | {
        id: string
        title: string
        values?: { value?: string | null }[] | null
      }[]
    | null
  sales_channels?: { id: string }[] | null
}

/**
 * What a plugin part in `product.details.selling` says when it sells the
 * product without stock (a running preorder): the words for a variant with no
 * units, and for the header line; `variant_ids` when only some variants are
 * sold that way (all of them without it).
 */
export type StockCover = {
  row: string
  summary: string
  variant_ids?: string[]
} | null

/** Whether a part sells this variant without stock. */
export const isCovered = (variant: FactVariant, cover: StockCover): boolean =>
  !!cover && (!cover.variant_ids || cover.variant_ids.includes(variant.id))

/** A variant's sale price from a running offer (price list). */
export type SalePrice = {
  amount: number
  offer: string
  ends_at: string | null
}

export type BlockerId =
  | "noPrice"
  | "noPhotos"
  | "noStock"
  | "someOut"
  | "draft"
  | "noChannel"

export type Blocker = {
  id: BlockerId
  /** How many variants it is about (noPrice, someOut). */
  count?: number
  /** Which variants (someOut), by their option values. */
  names?: string[]
}

/** Up to this many variants, the groups start open. */
const OPEN_GROUPS_UP_TO = 8

/** A variant's own price in the store's currency: none from a rule (region, quantity). */
export const variantPrice = (
  variant: FactVariant,
  currency: string
): number | null => {
  const price = variant.prices?.find(
    (p) =>
      p.currency_code?.toLowerCase() === currency.toLowerCase() &&
      !Object.keys(p.rules ?? {}).length
  )

  return price ? price.amount : null
}

/** The product's own options, without the create form's default one. */
export const realOptions = (product: FactProduct) =>
  (product.options ?? []).filter((option) => !isDefaultOption(option))

/** A variant's option values in the product's option order: "Negro · XL"; the product's name for its one version. */
export const variantName = (
  product: FactProduct,
  variant: FactVariant
): string => {
  const order = (product.options ?? []).map((option) => option.id)
  const sorted = [...(variant.options ?? [])].sort(
    (a, b) =>
      order.indexOf(a.option_id ?? "") - order.indexOf(b.option_id ?? "")
  )
  const values = getOptionValues(sorted)

  return (
    values.join(" · ") ||
    getVariantTitle(variant.title, product.title) ||
    product.title
  )
}

/** Whether the store counts this variant's units. */
export const isTracked = (variant: FactVariant): boolean =>
  !!variant.manage_inventory

/** A counted variant with no units that can't be sold without them. */
export const isOutOfStock = (variant: FactVariant): boolean =>
  isTracked(variant) &&
  !variant.allow_backorder &&
  (variant.inventory_quantity ?? 0) <= 0

export const priceRange = (
  amounts: (number | null)[]
): { min: number; max: number } | null => {
  const known = amounts.filter((a): a is number => typeof a === "number")

  if (!known.length) {
    return null
  }

  return { min: Math.min(...known), max: Math.max(...known) }
}

export type VariantGroup = { value: string; variants: FactVariant[] }

/** With two options or more, the variants grouped by the first one's value; otherwise null. */
export const groupVariants = (
  product: FactProduct,
  variants: FactVariant[]
): VariantGroup[] | null => {
  const options = realOptions(product)

  if (options.length < 2) {
    return null
  }

  const first = options[0].id
  const groups = new Map<string, FactVariant[]>()

  for (const variant of variants) {
    const value =
      variant.options?.find((o) => o.option_id === first)?.value ?? ""
    groups.set(value, [...(groups.get(value) ?? []), variant])
  }

  return [...groups].map(([value, list]) => ({ value, variants: list }))
}

/** Whether the groups start open: up to 8 variants. */
export const groupsStartOpen = (variants: FactVariant[]): boolean =>
  variants.length <= OPEN_GROUPS_UP_TO

const hasPhotos = (product: FactProduct) =>
  !!product.images?.length || !!product.thumbnail

/**
 * What stops the product from selling, in the order it's fixed: a price,
 * photos, stock, publishing, the store's channel. A part that sells without
 * stock (`cover`) takes the stock ones away.
 */
export const getBlockers = ({
  product,
  variants,
  currency,
  cover,
}: {
  product: FactProduct
  variants: FactVariant[]
  currency: string
  cover: StockCover
}): Blocker[] => {
  const blockers: Blocker[] = []

  const unpriced = variants.filter((v) => variantPrice(v, currency) === null)
  if (unpriced.length) {
    blockers.push({ id: "noPrice", count: unpriced.length })
  }

  if (!hasPhotos(product)) {
    blockers.push({ id: "noPhotos" })
  }

  if (variants.length) {
    const out = variants.filter((v) => isOutOfStock(v) && !isCovered(v, cover))

    if (out.length && out.length === variants.length) {
      blockers.push({ id: "noStock" })
    } else if (out.length) {
      blockers.push({
        id: "someOut",
        count: out.length,
        names: out.map((v) => variantName(product, v)),
      })
    }
  }

  if (product.status !== "published") {
    blockers.push({ id: "draft" })
  } else if (
    Array.isArray(product.sales_channels) &&
    !product.sales_channels.length
  ) {
    blockers.push({ id: "noChannel" })
  }

  return blockers
}

export type Summary = {
  price: { min: number; max: number } | null
  variants: number | null
  stock:
    | { kind: "count"; count: number; places: number }
    | { kind: "cover"; text: string }
    | null
}

/** The header's line. A fact a blocker already says (no price, no stock) is left out. */
export const getSummary = ({
  product,
  variants,
  currency,
  cover,
  places,
  sales,
}: {
  product: FactProduct
  variants: FactVariant[]
  currency: string
  cover: StockCover
  places: number
  sales?: Map<string, SalePrice>
}): Summary => {
  const price = priceRange(
    variants.map((v) => sales?.get(v.id)?.amount ?? variantPrice(v, currency))
  )

  const tracked = variants.filter(isTracked)
  const count = tracked.reduce(
    (sum, v) => sum + Math.max(0, v.inventory_quantity ?? 0),
    0
  )

  let stock: Summary["stock"] = null
  if (cover) {
    stock = { kind: "cover", text: cover.summary }
  } else if (tracked.length && count > 0) {
    stock = { kind: "count", count, places }
  }

  return {
    price,
    variants:
      realOptions(product).length && variants.length > 1
        ? variants.length
        : null,
    stock,
  }
}

/** Each variant's lowest price in a running offer, in the store's currency. */
export const salePrices = (
  lists: {
    title: string
    ends_at?: string | null
    prices?:
      | { variant_id?: string | null; amount: number; currency_code: string }[]
      | null
  }[],
  currency: string
): Map<string, SalePrice> => {
  const sales = new Map<string, SalePrice>()

  for (const list of lists) {
    for (const price of list.prices ?? []) {
      if (
        !price.variant_id ||
        price.currency_code?.toLowerCase() !== currency.toLowerCase()
      ) {
        continue
      }

      const known = sales.get(price.variant_id)
      if (!known || price.amount < known.amount) {
        sales.set(price.variant_id, {
          amount: price.amount,
          offer: list.title,
          ends_at: list.ends_at ?? null,
        })
      }
    }
  }

  return sales
}
