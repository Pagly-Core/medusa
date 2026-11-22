import { HttpTypes } from "@medusajs/types"
import { useQueries } from "@tanstack/react-query"
import { useMemo } from "react"

import { usePriceLists } from "../../../hooks/api/price-lists"
import { useProductVariants } from "../../../hooks/api/products"
import { useStore } from "../../../hooks/api/store"
import { sdk } from "../../../lib/client"
import {
  FactVariant,
  SalePrice,
  StockCover,
  salePrices,
  stockPlaces,
} from "./product-facts"

/** Pagly: what the product page's cards share, loaded once for the page. */
export type ProductPageFacts = {
  variants: FactVariant[]
  /** The store's default currency. */
  currency: string
  /** How many stock locations hold this product's units. */
  places: number
  /** Each variant's price in a running offer. */
  sales: Map<string, SalePrice>
  /** What a part selling without stock says instead of "Sin stock". */
  cover: StockCover
  /** Until the variants and the store's currency are known. */
  isPending: boolean
}

/** Every variant at once: the page groups and counts them all. */
const VARIANT_LIMIT = 500

/** A running offer's prices read at once, per list. */
const OFFER_PRICE_LIMIT = 1000

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

type OfferPrice = {
  amount: number
  currency_code: string
  price_set?: { variant?: { id?: string | null } | null } | null
}

export const useProductPageFacts = (
  product: HttpTypes.AdminProduct,
  cover: StockCover
): ProductPageFacts => {
  // No placeholder: another product's variants must never stand in for
  // this one's while they load.
  const { variants, isPending: variantsPending } = useProductVariants(
    product.id,
    { limit: VARIANT_LIMIT, order: "variant_rank", fields: VARIANT_FIELDS }
  )

  const { store, isPending: storePending } = useStore()
  const currency =
    store?.supported_currencies?.find((c) => c.is_default)?.currency_code ??
    store?.supported_currencies?.[0]?.currency_code ??
    ""

  // The running lists first, light; then each one's prices with the variant
  // they belong to (a price-list price carries its price set, not a variant).
  const { price_lists } = usePriceLists({
    // The engine's own status word, not a label.
    status: [
      "active",
    ] as unknown as HttpTypes.AdminPriceListListParams["status"],
    limit: 100,
    fields: "id,title,type,starts_at,ends_at,rules",
  } as HttpTypes.AdminPriceListListParams)

  const running = useMemo(() => {
    const now = Date.now()
    return (price_lists ?? []).filter((list) => isRunningForEveryone(list, now))
  }, [price_lists])

  const offerPrices = useQueries({
    queries: running.map((list) => ({
      queryFn: () =>
        sdk.admin.priceList.prices(list.id, {
          fields: "amount,currency_code,price_set.variant.id",
          limit: OFFER_PRICE_LIMIT,
        } as HttpTypes.AdminPriceListPriceListParams),
      queryKey: ["pagly", "product-page", "offer-prices", list.id],
    })),
  })

  const offerData = offerPrices.map((query) => query.data)

  // Cheap to rebuild: a few lists' prices for this product's variants.
  const sales = salePrices(
    running.map((list, index) => ({
      title: list.title,
      type: list.type,
      ends_at: list.ends_at,
      prices: (
        (offerData[index] as { prices?: OfferPrice[] } | undefined)?.prices ??
        []
      ).map((price) => ({
        amount: price.amount,
        currency_code: price.currency_code,
        variant_id: price.price_set?.variant?.id ?? null,
      })),
    })),
    currency
  )

  const list = (variants ?? []) as FactVariant[]

  return {
    variants: list,
    currency,
    places: stockPlaces(list),
    sales,
    cover,
    isPending: variantsPending || storePending,
  }
}
