import { HttpTypes } from "@medusajs/types"
import {
  Button,
  Container,
  Heading,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { ComponentType, ReactNode, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { useMarkOrderFulfillmentAsDelivered } from "../../../../../hooks/api/orders"
import { useMarkPaymentCollectionAsPaid } from "../../../../../hooks/api/payment-collections"
import { useReturns } from "../../../../../hooks/api/returns"
import { useDate } from "../../../../../hooks/use-date"
import { formatCurrency } from "../../../../../lib/format-currency"
import { isAmountLessThenRoundingError } from "../../../../../lib/money-amount-helpers"
import { useExtension } from "../../../../../providers/extension-provider"
import { ExtendedOrder, ExtendedOrderFulfillment } from "../../constants"
import { ActiveOrderClaimSection } from "../active-order-claim-section"
import { ActiveOrderExchangeSection } from "../active-order-exchange-section"
import { ActiveOrderReturnSection } from "../active-order-return-section"
import { CopyPaymentLink } from "../copy-payment-link/copy-payment-link"
import { OrderActiveEditSection } from "../order-active-edit-section"

type OrderNextStepProps = {
  order: HttpTypes.AdminOrder
  orderPreview?: HttpTypes.AdminOrderPreview
}

/** What a plugin part in `order.details.next` receives. */
type NextStepPartProps = {
  data: HttpTypes.AdminOrder
  claim: (active: boolean) => void
}

const OPEN_CHANGE = new Set(["pending", "requested"])

/**
 * Pagly: the one thing the order waits on, right under its number. A plugin
 * part (a customer's request) claims the slot while it has something to ask;
 * otherwise the order's own step shows, in this order: an open edit, return,
 * exchange or claim; a return to receive; the payment; preparing; marking it
 * delivered. Nothing once there is nothing left to do.
 */
export const OrderNextStep = ({ order, orderPreview }: OrderNextStepProps) => {
  const { getWidgets } = useExtension()
  const parts = getWidgets("order.details.next" as any) as ComponentType<NextStepPartProps>[]
  const [claims, setClaims] = useState<Record<number, boolean>>({})

  const claimers = useMemo(
    () =>
      parts.map((_, index) => (active: boolean) =>
        setClaims((current) =>
          current[index] === active ? current : { ...current, [index]: active }
        )
      ),
    // One stable claim per part for the life of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parts.length]
  )

  const claimed = Object.values(claims).some(Boolean)

  return (
    <>
      {parts.map((Part, index) => (
        <Part key={index} data={order} claim={claimers[index]} />
      ))}
      {!claimed && <OwnStep order={order} orderPreview={orderPreview} />}
    </>
  )
}

const OwnStep = ({ order, orderPreview }: OrderNextStepProps) => {
  const { returns = [] } = useReturns({
    status: "requested",
    order_id: order.id,
    fields: "+received_at",
  })

  if (order.status === "canceled") {
    return null
  }

  const change = orderPreview?.order_change
  if (change && OPEN_CHANGE.has(change.status as string)) {
    return (
      <>
        <OrderActiveEditSection order={order} />
        <ActiveOrderClaimSection orderPreview={orderPreview!} />
        <ActiveOrderExchangeSection orderPreview={orderPreview!} />
        <ActiveOrderReturnSection orderPreview={orderPreview!} />
      </>
    )
  }

  const receivable = returns.filter((r) => !r.canceled_at)
  if (receivable.length) {
    return <ReceiveStep order={order} returnId={receivable[0].id} />
  }

  const unpaid = order.payment_collections?.find(
    (collection) => collection.status === "not_paid"
  )
  const pending = order.summary?.pending_difference || 0
  if (
    unpaid &&
    pending > 0 &&
    !isAmountLessThenRoundingError(pending, order.currency_code)
  ) {
    return <UnpaidStep order={order} collection={unpaid} />
  }

  const toPrepare = order.items.filter(
    (item) =>
      item.requires_shipping && item.detail.fulfilled_quantity < item.quantity
  )
  if (toPrepare.length) {
    return <PrepareStep order={order} items={toPrepare} />
  }

  const onItsWay = (order.fulfillments ?? []).find(
    (fulfillment) =>
      fulfillment.shipped_at &&
      !fulfillment.delivered_at &&
      !fulfillment.canceled_at
  )
  if (onItsWay) {
    return (
      <ShippedStep
        order={order as ExtendedOrder}
        fulfillment={onItsWay as ExtendedOrderFulfillment}
      />
    )
  }

  return null
}

const Step = ({
  title,
  detail,
  action,
}: {
  title: string
  detail?: ReactNode
  action: ReactNode
}) => (
  <Container
    className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
    data-testid="order-next-step"
  >
    <div>
      <Heading level="h2">{title}</Heading>
      {detail && (
        <Text size="small" className="text-ui-fg-subtle">
          {detail}
        </Text>
      )}
    </div>
    <div className="flex gap-x-2 [&>*]:flex-1 sm:[&>*]:flex-none">{action}</div>
  </Container>
)

const PrepareStep = ({
  order,
  items,
}: {
  order: HttpTypes.AdminOrder
  items: HttpTypes.AdminOrderLineItem[]
}) => {
  const { t } = useTranslation()
  const count = items.reduce(
    (sum, item) => sum + item.quantity - item.detail.fulfilled_quantity,
    0
  )
  const method = order.shipping_methods?.find(
    (shippingMethod) => !shippingMethod.detail?.return_id
  )?.name

  return (
    <Step
      title={t("orders.nextStep.prepare.title")}
      detail={
        method
          ? t("orders.nextStep.prepare.detail", { count, method })
          : undefined
      }
      action={
        <Button size="small" asChild>
          <Link to={`/orders/${order.id}/fulfillment?requires_shipping=true`}>
            {t("orders.nextStep.prepare.action")}
          </Link>
        </Button>
      }
    />
  )
}

const ShippedStep = ({
  order,
  fulfillment,
}: {
  order: ExtendedOrder
  fulfillment: ExtendedOrderFulfillment
}) => {
  const { t } = useTranslation()
  const { getRelativeDate } = useDate()
  const prompt = usePrompt()
  const { mutateAsync: markAsDelivered } = useMarkOrderFulfillmentAsDelivered(
    order.id,
    fulfillment.id
  )
  const tracking = fulfillment.labels?.find((label) => label.tracking_number)
    ?.tracking_number

  const onDelivered = useCallback(async () => {
    const confirmed = await prompt({
      title: t("general.areYouSure"),
      description: t("orders.fulfillment.markAsDeliveredWarning"),
      confirmText: t("actions.continue"),
      cancelText: t("actions.cancel"),
      variant: "confirmation",
    })
    if (!confirmed) {
      return
    }
    await markAsDelivered(
      { no_notification: !!order.no_notification },
      {
        onSuccess: () =>
          toast.success(t("orders.fulfillment.toast.fulfillmentDelivered")),
        onError: (error) => toast.error(error.message),
      }
    )
  }, [prompt, t, markAsDelivered, order.no_notification])

  return (
    <Step
      title={t("orders.nextStep.shipped.title")}
      detail={[
        t("orders.nextStep.shipped.detail", {
          date: getRelativeDate(fulfillment.shipped_at!),
        }),
        tracking,
      ]
        .filter(Boolean)
        .join(" · ")}
      action={
        <Button size="small" variant="secondary" onClick={onDelivered}>
          {t("orders.nextStep.shipped.action")}
        </Button>
      }
    />
  )
}

const ReceiveStep = ({
  order,
  returnId,
}: {
  order: HttpTypes.AdminOrder
  returnId: string
}) => {
  const { t } = useTranslation()

  return (
    <Step
      title={t("orders.nextStep.receive.title")}
      detail={t("orders.nextStep.receive.detail")}
      action={
        <Button size="small" asChild>
          <Link to={`/orders/${order.id}/returns/${returnId}/receive`}>
            {t("orders.returns.receive.action")}
          </Link>
        </Button>
      }
    />
  )
}

const UnpaidStep = ({
  order,
  collection,
}: {
  order: HttpTypes.AdminOrder
  collection: HttpTypes.AdminPaymentCollection
}) => {
  const { t } = useTranslation()
  const prompt = usePrompt()
  const { mutateAsync: markAsPaid } = useMarkPaymentCollectionAsPaid(
    order.id,
    collection.id
  )
  const amount = formatCurrency(
    collection.amount as number,
    order.currency_code
  )

  const onPaid = async () => {
    const confirmed = await prompt({
      title: t("orders.payment.markAsPaid"),
      description: t("orders.payment.markAsPaidPayment", { amount }),
      confirmText: t("actions.confirm"),
      cancelText: t("actions.cancel"),
      variant: "confirmation",
    })
    if (!confirmed) {
      return
    }
    await markAsPaid(
      { order_id: order.id },
      {
        onSuccess: () =>
          toast.success(
            t("orders.payment.markAsPaidPaymentSuccess", { amount })
          ),
        onError: (error) => toast.error(error.message),
      }
    )
  }

  return (
    <Step
      title={t("orders.nextStep.unpaid.title")}
      detail={t("orders.nextStep.unpaid.detail", { amount })}
      action={
        <>
          <CopyPaymentLink paymentCollection={collection} order={order} />
          <Button size="small" onClick={onPaid}>
            {t("orders.payment.markAsPaid")}
          </Button>
        </>
      }
    />
  )
}
