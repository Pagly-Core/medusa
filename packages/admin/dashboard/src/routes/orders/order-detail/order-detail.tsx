import { useLoaderData, useParams } from "react-router-dom"

import { TwoColumnPageSkeleton } from "../../../components/common/skeleton"
import { TwoColumnPage } from "../../../components/layout/pages"
import { useOrder, useOrderPreview } from "../../../hooks/api/orders"
import { usePlugins } from "../../../hooks/api/plugins"
import { OrderActivitySection } from "./components/order-activity-section"
import { OrderCustomerSection } from "./components/order-customer-section"
import { OrderFulfillmentSection } from "./components/order-fulfillment-section"
import { OrderGeneralSection } from "./components/order-general-section"
import { OrderNextStep } from "./components/order-next-step"
import { OrderPaymentSection } from "./components/order-payment-section"
import { OrderSummarySection } from "./components/order-summary-section"
import { DEFAULT_FIELDS, ExtendedOrder } from "./constants"
import { orderLoader } from "./loader"

export const OrderDetail = () => {
  const initialData = useLoaderData() as Awaited<ReturnType<typeof orderLoader>>

  const { id } = useParams()
  const { plugins = [] } = usePlugins()

  const { order, isLoading, isError, error } = useOrder(
    id!,
    {
      fields: DEFAULT_FIELDS,
    },
    {
      initialData,
    }
  )

  // TODO: Retrieve endpoints don't have an order ability, so a JS sort until this is available
  if (order) {
    order.items = order.items.sort((itemA: any, itemB: any) => {
      if (itemA.created_at > itemB.created_at) {
        return 1
      }

      if (itemA.created_at < itemB.created_at) {
        return -1
      }

      return 0
    })
  }

  const { order: orderPreview, isLoading: isPreviewLoading } = useOrderPreview(
    id!
  )

  if (isLoading || !order || isPreviewLoading) {
    return (
      <TwoColumnPageSkeleton mainSections={4} sidebarSections={2} showJSON />
    )
  }

  if (isError) {
    throw error
  }

  // Pagly: a fixed page instead of the drag-and-drop layout: what the order
  // waits on first, then the order told once. Plugin parts go in the five
  // order zones (next, line, shipping, payment, customer), never at the end.
  // Below 1280px the side column follows the main one, so a phone reads the
  // next step first.
  return (
    <TwoColumnPage
      widgets={NO_PAGE_WIDGETS}
      data={order}
      showJSON
      hasOutlet
    >
      <TwoColumnPage.Main>
        <OrderGeneralSection order={order as ExtendedOrder} />
        <OrderNextStep order={order} orderPreview={orderPreview} />
        <OrderSummarySection order={order} plugins={plugins} />
        <OrderFulfillmentSection order={order as ExtendedOrder} />
        <OrderPaymentSection order={order as ExtendedOrder} plugins={plugins} />
      </TwoColumnPage.Main>
      <TwoColumnPage.Sidebar>
        <OrderCustomerSection order={order} />
        <OrderActivitySection order={order as ExtendedOrder} />
      </TwoColumnPage.Sidebar>
    </TwoColumnPage>
  )
}

const NO_PAGE_WIDGETS = { before: [], after: [], sideBefore: [], sideAfter: [] }

