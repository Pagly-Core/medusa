import { Buildings, FlyingBox, XCircle } from "@medusajs/icons"
import {
  Button,
  Container,
  Copy,
  Heading,
  Label,
  Prompt,
  StatusBadge,
  Switch,
  Text,
  Tooltip,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { format } from "date-fns"
import { ComponentType, ReactNode, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"
import { ActionMenu } from "../../../../../components/common/action-menu"
import { Skeleton } from "../../../../../components/common/skeleton"
import {
  useCancelOrderFulfillment,
  useMarkOrderFulfillmentAsDelivered,
} from "../../../../../hooks/api/orders"
import { useStockLocation } from "../../../../../hooks/api/stock-locations"
import { getFormattedAddress } from "../../../../../lib/addresses"
import { getVariantTitle } from "../../../../../lib/default-names"
import { formatProvider } from "../../../../../lib/format-provider"
import { useExtension } from "../../../../../providers/extension-provider"
import { FulfillmentSetType } from "../../../../locations/common/constants"
import { ExtendedOrderFulfillment, ExtendedOrder } from "../../constants"

type OrderFulfillmentSectionProps = {
  order: ExtendedOrder
}

/** What a plugin part in `order.details.shipping` receives. */
type ShippingPartProps = { data: ExtendedOrder }

/**
 * Pagly: one Envío card for how the order ships, where to, and each shipment,
 * numbered when there are several. The products aren't listed again: each
 * line on Productos says where it stands, and preparing is the next step.
 * Plugin parts (a carrier's labels) sit inside it.
 */
export const OrderFulfillmentSection = ({
  order,
}: OrderFulfillmentSectionProps) => {
  const { t } = useTranslation()
  const { getWidgets } = useExtension()
  const parts = getWidgets(
    "order.details.shipping" as any
  ) as ComponentType<ShippingPartProps>[]

  const fulfillments = order.fulfillments || []
  const method = order.shipping_methods?.find(
    (shippingMethod) => !shippingMethod.detail?.return_id
  )
  const address = getFormattedAddress({ address: order.shipping_address })
  const open = order.status !== "canceled"
  const toPrepare = (requiresShipping: boolean) =>
    open &&
    order.items.some(
      (item) =>
        !!item.requires_shipping === requiresShipping &&
        item.detail.fulfilled_quantity < item.quantity
    )

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("orders.shipping.title")}</Heading>
        <ActionMenu
          groups={[
            {
              actions: [
                ...(toPrepare(true)
                  ? [
                      {
                        label: t("orders.fulfillment.fulfillItems"),
                        icon: <Buildings />,
                        to: `/orders/${order.id}/fulfillment?requires_shipping=true`,
                      },
                    ]
                  : []),
                ...(toPrepare(false)
                  ? [
                      {
                        label: t("orders.fulfillment.fulfillItems"),
                        icon: <Buildings />,
                        to: `/orders/${order.id}/fulfillment?requires_shipping=false`,
                      },
                    ]
                  : []),
                {
                  label: t("addresses.shippingAddress.editLabel"),
                  icon: <FlyingBox />,
                  to: "shipping-address",
                },
              ],
            },
          ]}
        />
      </div>

      {method && (
        <ShippingRow label={t("orders.shipping.method")}>
          <Text size="small" leading="compact">
            {method.name}
          </Text>
        </ShippingRow>
      )}

      {!!address.length && (
        <ShippingRow label={t("orders.shipping.recipient")}>
          <div className="flex items-start justify-between gap-x-2">
            <Text size="small" leading="compact">
              {address.map((line, i) => (
                <span key={i} className="break-words">
                  {line}
                  <br />
                </span>
              ))}
            </Text>
            <Copy content={address.join("\n")} className="text-ui-fg-muted" />
          </div>
        </ShippingRow>
      )}

      {fulfillments.map((f, index) => (
        <Fulfillment
          key={f.id}
          index={index}
          total={fulfillments.length}
          fulfillment={f}
          order={order}
        />
      ))}

      {parts.map((Part, index) => (
        <Part key={index} data={order} />
      ))}
    </Container>
  )
}

const ShippingRow = ({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) => (
  <div className="text-ui-fg-subtle grid grid-cols-2 items-start px-6 py-4">
    <Text size="small" leading="compact" weight="plus">
      {label}
    </Text>
    {children}
  </div>
)

const LINK =
  "text-ui-fg-base underline decoration-ui-border-strong underline-offset-2 transition-fg hover:decoration-current"

const Fulfillment = ({
  fulfillment,
  order,
  index,
  total,
}: {
  fulfillment: ExtendedOrderFulfillment
  order: ExtendedOrder
  index: number
  total: number
}) => {
  const { t } = useTranslation()
  const prompt = usePrompt()
  const navigate = useNavigate()

  const showLocation = !!fulfillment.location_id

  const isPickUpFulfillment =
    fulfillment.shipping_option?.service_zone?.fulfillment_set?.type ===
    FulfillmentSetType.Pickup

  const { stock_location, isError } = useStockLocation(
    fulfillment.location_id!,
    undefined,
    {
      enabled: showLocation,
    }
  )

  let statusText = fulfillment.requires_shipping
    ? isPickUpFulfillment
      ? t("orders.fulfillment.status.awaitingPickup")
      : t("orders.fulfillment.status.awaitingShipping")
    : t("orders.fulfillment.status.awaitingDelivery")
  let statusColor: "blue" | "green" | "red" = "blue"
  let statusTimestamp = fulfillment.created_at

  if (fulfillment.canceled_at) {
    statusText = t("orders.fulfillment.status.canceled")
    statusColor = "red"
    statusTimestamp = fulfillment.canceled_at
  } else if (fulfillment.delivered_at) {
    statusText = t("orders.fulfillment.status.delivered")
    statusColor = "green"
    statusTimestamp = fulfillment.delivered_at
  } else if (fulfillment.shipped_at) {
    statusText = t("orders.fulfillment.status.shipped")
    statusColor = "green"
    statusTimestamp = fulfillment.shipped_at
  }

  const { mutateAsync } = useCancelOrderFulfillment(order.id, fulfillment.id)
  const { mutateAsync: markAsDelivered } = useMarkOrderFulfillmentAsDelivered(
    order.id,
    fulfillment.id
  )

  const showShippingButton =
    !fulfillment.canceled_at &&
    !fulfillment.shipped_at &&
    !fulfillment.delivered_at &&
    fulfillment.requires_shipping &&
    !isPickUpFulfillment

  const showDeliveryButton =
    !fulfillment.canceled_at && !fulfillment.delivered_at

  const [sendNotification, setSendNotification] = useState(
    !order.no_notification
  )
  const [showDeliveredPrompt, setShowDeliveredPrompt] = useState(false)

  const handleMarkAsDelivered = () => {
    setShowDeliveredPrompt(true)
  }

  const handleCancelDeliveredPrompt = () => {
    setShowDeliveredPrompt(false)
  }

  const handleConfirmDelivered = async () => {
    setShowDeliveredPrompt(false)
    await markAsDelivered(
      { no_notification: !sendNotification },
      {
        onSuccess: () => {
          toast.success(
            t(
              isPickUpFulfillment
                ? "orders.fulfillment.toast.fulfillmentPickedUp"
                : "orders.fulfillment.toast.fulfillmentDelivered"
            )
          )
        },
        onError: (e) => {
          toast.error(e.message)
        },
      }
    )
  }

  const handleCancel = async () => {
    if (fulfillment.shipped_at) {
      toast.warning(t("orders.fulfillment.toast.fulfillmentShipped"))
      return
    }

    const res = await prompt({
      title: t("general.areYouSure"),
      description: t("orders.fulfillment.cancelWarning"),
      confirmText: t("actions.continue"),
      cancelText: t("actions.cancel"),
    })

    if (res) {
      await mutateAsync(undefined, {
        onSuccess: () => {
          toast.success(t("orders.fulfillment.toast.canceled"))
        },
        onError: (e) => {
          toast.error(e.message)
        },
      })
    }
  }

  const isValidUrl = (url?: string) => {
    if (!url || url.length === 0 || url === "#") {
      return false
    }
    try {
      const parsed = new URL(url)
      return parsed.protocol === "http:" || parsed.protocol === "https:"
    } catch {
      return false
    }
  }

  return (
    <div className="divide-y">
      <div className="flex items-center justify-between px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {total > 1
            ? t("orders.shipping.shipmentOf", { n: index + 1, total })
            : null}
        </Text>
        <div className="flex items-center gap-x-4">
          <Tooltip
            content={format(
              new Date(statusTimestamp),
              "dd MMM, yyyy, HH:mm:ss"
            )}
          >
            <StatusBadge color={statusColor} className="text-nowrap">
              {statusText}
            </StatusBadge>
          </Tooltip>
          <ActionMenu
            groups={[
              {
                actions: [
                  {
                    label: t("actions.cancel"),
                    icon: <XCircle />,
                    onClick: handleCancel,
                    disabled:
                      !!fulfillment.canceled_at ||
                      !!fulfillment.shipped_at ||
                      !!fulfillment.delivered_at,
                  },
                ],
              },
            ]}
          />
        </div>
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 items-start px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("orders.fulfillment.itemsLabel")}
        </Text>
        <ul>
          {fulfillment.items.map((f_item) => (
            <li key={f_item.line_item_id}>
              <Text size="small" leading="compact">
                {/* Pagly: the item copies the variant's title, so a one-version product shows its own. */}
                {f_item.quantity}x{" "}
                {getVariantTitle(
                  f_item.title,
                  order.items?.find((i) => i.id === f_item.line_item_id)
                    ?.product_title
                )}
              </Text>
            </li>
          ))}
        </ul>
      </div>
      {showLocation && (
        <div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
          <Text size="small" leading="compact" weight="plus">
            {t("orders.fulfillment.shippingFromLabel")}
          </Text>
          {isError ? (
            <Text size="small" leading="compact">
              {t("orders.fulfillment.locationUnavailable")}
            </Text>
          ) : stock_location ? (
            <Link
              to={`/settings/locations/${stock_location.id}`}
              className={LINK}
            >
              <Text size="small" leading="compact">
                {stock_location.name}
              </Text>
            </Link>
          ) : (
            <Skeleton className="w-16" />
          )}
        </div>
      )}
      {fulfillment.provider_id !== "manual_manual" && (
      <div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("fields.provider")}
        </Text>

        <Text size="small" leading="compact">
          {formatProvider(fulfillment.provider_id)}
        </Text>
      </div>
      )}
      {!!fulfillment.labels?.length && (
      <div className="text-ui-fg-subtle grid grid-cols-2 items-start px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("orders.fulfillment.trackingLabel")}
        </Text>
        <div>
          {fulfillment.labels && fulfillment.labels.length > 0 ? (
            <ul>
              {fulfillment.labels.map((tlink) => {
                const hasTrackingUrl = isValidUrl(tlink.tracking_url)
                const hasLabelUrl = isValidUrl(tlink.label_url)

                if (hasTrackingUrl || hasLabelUrl) {
                  return (
                    <li key={tlink.tracking_number}>
                      {hasTrackingUrl && (
                        <a
                          href={tlink.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={LINK}
                        >
                          <Text size="small" leading="compact" as="span">
                            {tlink.tracking_number}
                          </Text>
                        </a>
                      )}
                      {hasTrackingUrl && hasLabelUrl && " - "}
                      {hasLabelUrl && (
                        <a
                          href={tlink.label_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={LINK}
                        >
                          <Text size="small" leading="compact" as="span">
                            Label
                          </Text>
                        </a>
                      )}
                    </li>
                  )
                }

                return (
                  <li key={tlink.tracking_number}>
                    <Text size="small" leading="compact">
                      {tlink.tracking_number}
                    </Text>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>
      </div>
      )}

      {(showShippingButton || showDeliveryButton) && (
        <div className="flex items-center justify-end gap-x-2 px-6 py-4">
          {showDeliveryButton && (
            <Button onClick={handleMarkAsDelivered} variant="secondary">
              {t(
                isPickUpFulfillment
                  ? "orders.fulfillment.markAsPickedUp"
                  : "orders.fulfillment.markAsDelivered"
              )}
            </Button>
          )}

          {showShippingButton && (
            <Button
              onClick={() => navigate(`./${fulfillment.id}/create-shipment`)}
              variant="secondary"
            >
              {t("orders.fulfillment.markAsShipped")}
            </Button>
          )}
        </div>
      )}

      <Prompt open={showDeliveredPrompt} variant="confirmation">
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>{t("general.areYouSure")}</Prompt.Title>
            <Prompt.Description>
              {t("orders.fulfillment.markAsDeliveredWarning")}
            </Prompt.Description>
          </Prompt.Header>
          <div className="border-ui-border-base mt-6 flex items-center justify-between border-y border-dotted p-6">
            <Label
              htmlFor={`send-notification-${fulfillment.id}`}
              className="txt-compact-small text-ui-fg-subtle"
            >
              {t("orders.returns.sendNotification")}
            </Label>
            <Switch
              id={`send-notification-${fulfillment.id}`}
              dir="ltr"
              className="rtl:rotate-180"
              checked={sendNotification}
              onCheckedChange={setSendNotification}
            />
          </div>
          <Prompt.Footer>
            <Prompt.Cancel onClick={handleCancelDeliveredPrompt}>
              {t("actions.cancel")}
            </Prompt.Cancel>
            <Prompt.Action onClick={handleConfirmDelivered}>
              {t("actions.continue")}
            </Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>
    </div>
  )
}
