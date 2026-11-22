import { HttpTypes } from "@medusajs/types"

/**
 * Pagly: the product page's facts, worked out once from the product and its
 * variants: prices, stock, the variant groups and what stops it from selling.
 * The cards only draw them.
 */

export type FactVariant = Pick<
  HttpTypes.AdminProductVariant,
  "id" | "title" | "sku" | "manage_inventory" | "allow_backorder"
> & {
  prices?: { amount: number; currency_code: string; rules?: Record<string, unknown> | null }[] | null
  options?: { option_id?: string | null; value?: string | null }[] | null
  inventory_quantity?: number | null
}

export type FactProduct = Pick<HttpTypes.AdminProduct, "id" | "title" | "status" | "thumbnail"> & {
  images?: { id: string; url: string }[] | null
  options?: { id: string; title: string; values?: { value?: string | null }[] | null }[] | null
  sales_channels?: { id: string }[] | null
}

/**
 * What a plugin part in `product.details.selling` says when it sells the
 * product without stock (a running preorder): the words for a variant with no
 * units, and for the header line.
 */
export type StockCover = { row: string; summary: string } | null

/** A variant's sale price from a running offer (price list). */
export type SalePrice = { amount: number; offer: string; ends_at: string | null }

export type BlockerId = "noPrice" | "noPhotos" | "noStock" | "someOut" | "draft" | "noChannel"

export type Blocker = {
  id: BlockerId
  /** How many variants it is about (noPrice, someOut). */
  count?: number
  /** Which variants (someOut), by their option values. */
  names?: string[]
}

export const variantPrice = (_variant: FactVariant, _currency: string): number | null => null

export const variantName = (_product: FactProduct, _variant: FactVariant): string => ""

/** Whether the store counts this variant's units. */
export const isTracked = (_variant: FactVariant): boolean => false

/** A counted variant with no units that can't be sold without them. */
export const isOutOfStock = (_variant: FactVariant): boolean => false

export const priceRange = (_amounts: (number | null)[]): { min: number; max: number } | null => null

/** The product's own options, without the create form's default one. */
export const realOptions = (_product: FactProduct) => [] as NonNullable<FactProduct["options"]>

export type VariantGroup = { value: string; variants: FactVariant[] }

/** With two options or more, the variants grouped by the first one's value; otherwise null. */
export const groupVariants = (_product: FactProduct, _variants: FactVariant[]): VariantGroup[] | null => null

/** Whether the groups start open: up to 8 variants. */
export const groupsStartOpen = (_variants: FactVariant[]): boolean => false

export const getBlockers = (_input: {
  product: FactProduct
  variants: FactVariant[]
  currency: string
  cover: StockCover
}): Blocker[] => []

export type Summary = {
  price: { min: number; max: number } | null
  variants: number | null
  stock: { kind: "count"; count: number; places: number } | { kind: "cover"; text: string } | null
}

/** The header's line. A fact a blocker already says (no price, no stock) is left out. */
export const getSummary = (_input: {
  product: FactProduct
  variants: FactVariant[]
  currency: string
  cover: StockCover
  places: number
  sales?: Map<string, SalePrice>
}): Summary => ({ price: null, variants: null, stock: null })

/** Each variant's lowest price in a running offer, in the store's currency. */
export const salePrices = (
  _lists: { title: string; ends_at?: string | null; prices?: { variant_id?: string | null; amount: number; currency_code: string }[] | null }[],
  _currency: string
): Map<string, SalePrice> => new Map()
