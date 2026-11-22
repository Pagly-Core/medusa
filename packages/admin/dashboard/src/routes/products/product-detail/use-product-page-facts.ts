import { HttpTypes } from "@medusajs/types"
import { keepPreviousData } from "@tanstack/react-query"
import { useMemo } from "react"

import { usePriceLists } from "../../../hooks/api/price-lists"
import { useProductVariants } from "../../../hooks/api/products"
import { useStockLocations } from "../../../hooks/api/stock-locations"
import { useStore } from "../../../hooks/api/store"
import { FactVariant, SalePrice, StockCover, salePrices } from "./product-facts"

/** Pagly: what the product page's cards share, loaded once for the page. */
export type ProductPageFacts = {
  variants: FactVariant[]
  /** The store's default currency. */
  currency: string
  /** How many stock locations the store has. */
  places: number
  /** Each variant's price in a running offer. */
  sales: Map<string, SalePrice>
  /** What a part selling without stock says instead of "Sin stock". */
  cover: StockCover
  isPending: boolean
}

/** Every variant at once: the page groups and counts them all. */
const VARIANT_LIMIT = 500

const VARIANT_FIELDS =
  "title,sku,thumbnail,variant_rank,*options,*prices,manage_inventory,allow_backorder,inventory_quantity,*inventory_items.inventory.location_levels"

/** Running offers for everyone: no customer group rule, started, not ended. */
const isRunningForEveryone = (
  list: HttpTypes.AdminPriceList,
  now: number
): boolean =>
  !Object.keys(list.rules ?? {}).length &&
  (!list.starts_at || new Date(list.starts_at).getTime() <= now) &&
  (!list.ends_at || new Date(list.ends_at).getTime() > now)

export const useProductPageFacts = (
  product: HttpTypes.AdminProduct,
  cover: StockCover
): ProductPageFacts => {
  const { variants, isPending } = useProductVariants(
    product.id,
    { limit: VARIANT_LIMIT, order: "variant_rank", fields: VARIANT_FIELDS },
    { placeholderData: keepPreviousData }
  )

  const { store } = useStore()
  const currency =
    store?.supported_currencies?.find((c) => c.is_default)?.currency_code ??
    store?.supported_currencies?.[0]?.currency_code ??
    ""

  const { count: locationCount } = useStockLocations({ limit: 1, fields: "id" })

  const { price_lists } = usePriceLists({
    // The engine's own status word, not a label.
    status: [
      "active",
    ] as unknown as HttpTypes.AdminPriceListListParams["status"],
    limit: 50,
    fields: "id,title,starts_at,ends_at,rules,*prices",
  } as HttpTypes.AdminPriceListListParams)

  const sales = useMemo(() => {
    const now = Date.now()
    const running = (price_lists ?? []).filter((list) =>
      isRunningForEveryone(list, now)
    )

    return salePrices(
      running.map((list) => ({
        title: list.title,
        ends_at: list.ends_at,
        prices: (list.prices ?? []) as {
          variant_id?: string | null
          amount: number
          currency_code: string
        }[],
      })),
      currency
    )
  }, [price_lists, currency])

  return {
    variants: (variants ?? []) as FactVariant[],
    currency,
    places: Math.max(1, locationCount ?? 1),
    sales,
    cover,
    isPending,
  }
}
