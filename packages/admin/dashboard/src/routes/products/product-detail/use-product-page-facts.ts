import { HttpTypes } from "@medusajs/types"

import { FactVariant, SalePrice } from "./product-facts"

/** Pagly: what the product page's cards share, loaded once for the page. */
export type ProductPageFacts = {
  variants: FactVariant[]
  /** The store's default currency. */
  currency: string
  /** How many stock locations the store has. */
  places: number
  /** Each variant's price in a running offer. */
  sales: Map<string, SalePrice>
  cover: import("./product-facts").StockCover
  isPending: boolean
}

export const useProductPageFacts = (
  _product: HttpTypes.AdminProduct,
  cover: ProductPageFacts["cover"]
): ProductPageFacts => ({
  variants: [],
  currency: "",
  places: 1,
  sales: new Map(),
  cover,
  isPending: false,
})
