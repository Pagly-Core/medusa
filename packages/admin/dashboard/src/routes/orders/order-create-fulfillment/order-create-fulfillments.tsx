import { useParams, useSearchParams } from "react-router-dom"

import { RouteFocusModal } from "../../../components/modals"
import { useOrder } from "../../../hooks/api/orders"
import { getFulfillableQuantity } from "../../../lib/order-item"
import { OrderCreateFulfillmentForm } from "./components/order-create-fulfillment-form"

export function OrderCreateFulfillment() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const asked = searchParams.get("requires_shipping")

  const { order, isLoading, isError, error } = useOrder(id!, {
    fields:
      "currency_code,*items,*items.variant,+items.variant.product.shipping_profile.id,*shipping_address,+shipping_methods.shipping_option_id,no_notification",
  })

  if (isError) {
    throw error
  }

  const ready = !isLoading && order
  // Pagly: opened by its address alone, the form fulfils what is left to ship,
  // else the rest; it read a missing parameter as "no shipping" and showed no
  // items for an order of shipped goods (Pagly-Core/pagly-app#254).
  const requiresShipping =
    asked === null
      ? !!order?.items?.some(
          (item) => item.requires_shipping && getFulfillableQuantity(item) > 0
        )
      : asked === "true"

  return (
    <RouteFocusModal>
      {ready && (
        <OrderCreateFulfillmentForm
          order={order}
          requiresShipping={requiresShipping}
        />
      )}
    </RouteFocusModal>
  )
}
