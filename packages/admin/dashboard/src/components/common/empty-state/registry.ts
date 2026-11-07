// Pagly: empty list pages draw an example of what they hold.
import type { ComponentType } from "react"

import { Illustration as apiKeys } from "./kinds/api-keys"
import { Illustration as campaigns } from "./kinds/campaigns"
import { Illustration as categories } from "./kinds/categories"
import { Illustration as collections } from "./kinds/collections"
import { Illustration as customerGroups } from "./kinds/customer-groups"
import { Illustration as customers } from "./kinds/customers"
import { Illustration as draftOrders } from "./kinds/draft-orders"
import { Illustration as inventory } from "./kinds/inventory"
import { Illustration as locations } from "./kinds/locations"
import { Illustration as orders } from "./kinds/orders"
import { Illustration as priceLists } from "./kinds/price-lists"
import { Illustration as productOptions } from "./kinds/product-options"
import { Illustration as productTags } from "./kinds/product-tags"
import { Illustration as productTypes } from "./kinds/product-types"
import { Illustration as products } from "./kinds/products"
import { Illustration as promotions } from "./kinds/promotions"
import { Illustration as refundReasons } from "./kinds/refund-reasons"
import { Illustration as regions } from "./kinds/regions"
import { Illustration as reservations } from "./kinds/reservations"
import { Illustration as returnReasons } from "./kinds/return-reasons"
import { Illustration as salesChannels } from "./kinds/sales-channels"
import { Illustration as shippingOptionTypes } from "./kinds/shipping-option-types"
import { Illustration as shippingProfiles } from "./kinds/shipping-profiles"
import { Illustration as taxRegions } from "./kinds/tax-regions"
import { Illustration as workflows } from "./kinds/workflows"

export type EmptyStateDefinition = {
  /** The drawing: an example of what the page holds once it has records. */
  Illustration: ComponentType
}

/**
 * Every core list page that can be empty, by kind. Its copy lives in the
 * translations under `emptyStates.<kind>.title` / `.description` (and
 * `.action` when the page offers one). To add a page: draw
 * `kinds/<kind>.tsx` with the kit, register it here, add the copy to en, es
 * and the schema, and pass `kind` to the table's `noRecords`.
 */
export const EMPTY_STATES = {
  orders: { Illustration: orders },
  draftOrders: { Illustration: draftOrders },
  products: { Illustration: products },
  collections: { Illustration: collections },
  categories: { Illustration: categories },
  productOptions: { Illustration: productOptions },
  productTypes: { Illustration: productTypes },
  productTags: { Illustration: productTags },
  inventory: { Illustration: inventory },
  reservations: { Illustration: reservations },
  customers: { Illustration: customers },
  customerGroups: { Illustration: customerGroups },
  promotions: { Illustration: promotions },
  campaigns: { Illustration: campaigns },
  priceLists: { Illustration: priceLists },
  locations: { Illustration: locations },
  shippingProfiles: { Illustration: shippingProfiles },
  shippingOptionTypes: { Illustration: shippingOptionTypes },
  regions: { Illustration: regions },
  taxRegions: { Illustration: taxRegions },
  salesChannels: { Illustration: salesChannels },
  returnReasons: { Illustration: returnReasons },
  refundReasons: { Illustration: refundReasons },
  apiKeys: { Illustration: apiKeys },
  workflows: { Illustration: workflows },
} satisfies Record<string, EmptyStateDefinition>

export type EmptyStateKind = keyof typeof EMPTY_STATES

export const EMPTY_STATE_KINDS = Object.keys(EMPTY_STATES) as EmptyStateKind[]
