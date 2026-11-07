import {
  ArchiveBox,
  Buildings,
  Channels,
  CurrencyDollar,
  Map,
  PencilSquare,
  Plus,
  Trash,
} from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import {
  Container,
  Heading,
  Switch,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { TFunction } from "i18next"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"

import { ActionMenu } from "../../../../../components/common/action-menu"
import {
  useDeleteFulfillmentServiceZone,
  useDeleteFulfillmentSet,
} from "../../../../../hooks/api/fulfillment-sets"
import { useDeleteShippingOption } from "../../../../../hooks/api/shipping-options"
import {
  useCreateStockLocationFulfillmentSet,
  useDeleteStockLocation,
} from "../../../../../hooks/api/stock-locations"
import { getFormattedAddress } from "../../../../../lib/addresses"
import { countries as staticCountries } from "../../../../../lib/data/countries"
import { formatProvider } from "../../../../../lib/format-provider"
import {
  isOptionEnabledInStore,
  isReturnOption,
} from "../../../../../lib/shipping-options"
import {
  FulfillmentSetType,
  ShippingOptionPriceType,
} from "../../../common/constants"
import { areaLabels } from "../../../common/utils/geo-zone-areas"

// Pagly: a location's shipping reads as a short list. A card per method
// (shipping, then pickup) with a switch; each zone is a line with what it
// covers, its rates as rows, and one "add" link; nothing empty is shown.
// Sales channels and fulfillment providers moved into the location's menu.
// See PAGLY-CORE-DIVERGENCE.md.

type LocationGeneralSectionProps = {
  location: HttpTypes.AdminStockLocation
}

export const LocationGeneralSection = ({
  location,
}: LocationGeneralSectionProps) => {
  return (
    <>
      <Container className="p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading>{location.name}</Heading>
            <Text className="text-ui-fg-subtle txt-small">
              {getFormattedAddress({
                address: location.address as
                  | HttpTypes.AdminOrderAddress
                  | undefined,
              }).join(", ")}
            </Text>
          </div>
          <Actions location={location} />
        </div>
      </Container>

      {[FulfillmentSetType.Shipping, FulfillmentSetType.Pickup].map((type) => (
        <FulfillmentSet
          key={type}
          locationId={location.id}
          locationName={location.name}
          type={type}
          fulfillmentSet={location.fulfillment_sets?.find(
            (f) => f.type === type
          )}
        />
      ))}
    </>
  )
}

/** The provider's name as the dashboard shows it (a carrier's own, "UES"). */
const providerName = (id: string) => {
  const looks = (globalThis as Record<string, unknown>).__paglyProviderLooks as
    | Record<string, { name?: string } | undefined>
    | undefined
  return looks?.[id]?.name ?? formatProvider(id)
}

/** What a rate charges: the carrier's rate, free, or its base price. */
const rateLabel = (option: HttpTypes.AdminShippingOption, t: TFunction) => {
  if (option.price_type === ShippingOptionPriceType.Calculated) {
    return t("stockLocations.shippingOptions.fields.carrierRate", {
      name: providerName(option.provider_id),
    })
  }

  const prices = option.prices ?? []
  // The base price; one with rules (free over an amount) is a variation of it.
  const base =
    prices.find((price) => !(price as { price_rules?: unknown[] }).price_rules?.length) ??
    prices[0]

  if (!base) {
    return ""
  }

  const amount = Number(base.amount)
  if (amount === 0) {
    return t("stockLocations.shippingOptions.fields.free")
  }

  // Whole amounts read without cents ("$ 290"), others with them.
  return new Intl.NumberFormat([], {
    style: "currency",
    currencyDisplay: "narrowSymbol",
    currency: base.currency_code,
    ...(Number.isInteger(amount) ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}),
  }).format(amount)
}

type RateRowProps = {
  option: HttpTypes.AdminShippingOption
  fulfillmentSetId: string
  locationId: string
}

function RateRow({ option, fulfillmentSetId, locationId }: RateRowProps) {
  const prompt = usePrompt()
  const { t } = useTranslation()

  const { mutateAsync } = useDeleteShippingOption(option.id)

  const handleDelete = async () => {
    const res = await prompt({
      title: t("general.areYouSure"),
      description: t("stockLocations.shippingOptions.delete.confirmation", {
        name: option.name,
      }),
      verificationInstruction: t("general.typeToConfirm"),
      verificationText: option.name,
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    })

    if (!res) {
      return
    }

    await mutateAsync(undefined, {
      onSuccess: () => {
        toast.success(
          t("stockLocations.shippingOptions.delete.successToast", {
            name: option.name,
          })
        )
      },
      onError: (e) => {
        toast.error(e.message)
      },
    })
  }

  const base = `/settings/locations/${locationId}/fulfillment-set/${fulfillmentSetId}/service-zone/${option.service_zone_id}/shipping-option/${option.id}`
  const calculated = option.price_type === ShippingOptionPriceType.Calculated

  return (
    <div data-rate className="flex items-center gap-x-3 py-2">
      <Text size="small" leading="compact" className="flex-1 truncate">
        {option.name}
      </Text>
      {!isOptionEnabledInStore(option) && (
        <Text size="small" leading="compact" className="text-ui-fg-muted">
          {t("stockLocations.shippingOptions.fields.hiddenInStore")}
        </Text>
      )}
      <Text
        size="small"
        leading="compact"
        className={calculated ? "text-ui-fg-subtle" : undefined}
      >
        {rateLabel(option, t)}
      </Text>
      <ActionMenu
        groups={[
          {
            actions: [
              {
                icon: <PencilSquare />,
                label: t("stockLocations.shippingOptions.edit.action"),
                to: `${base}/edit`,
              },
              {
                label: t("stockLocations.shippingOptions.pricing.action"),
                icon: <CurrencyDollar />,
                disabled: calculated,
                to: `${base}/pricing`,
              },
            ],
          },
          {
            actions: [
              {
                label: t("actions.delete"),
                icon: <Trash />,
                onClick: handleDelete,
              },
            ],
          },
        ]}
      />
    </div>
  )
}

type ServiceZoneProps = {
  zone: HttpTypes.AdminServiceZone
  locationId: string
  fulfillmentSetId: string
}

function ServiceZone({ zone, locationId, fulfillmentSetId }: ServiceZoneProps) {
  const { t } = useTranslation()
  const prompt = usePrompt()

  const { mutateAsync: deleteZone } = useDeleteFulfillmentServiceZone(
    fulfillmentSetId,
    zone.id
  )

  const handleDelete = async () => {
    const res = await prompt({
      title: t("general.areYouSure"),
      description: t("stockLocations.serviceZones.delete.confirmation", {
        name: zone.name,
      }),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    })

    if (!res) {
      return
    }

    await deleteZone(undefined, {
      onError: (e) => {
        toast.error(e.message)
      },
      onSuccess: () => {
        toast.success(
          t("stockLocations.serviceZones.delete.successToast", {
            name: zone.name,
          })
        )
      },
    })
  }

  // What the zone covers: "Uruguay · Maldonado, Rocha", or "Uruguay · 16 de 19".
  const areas = useMemo(
    () =>
      areaLabels(
        zone.geo_zones.filter((g) => g.type === "country" || g.type === "province"),
        (iso2) =>
          staticCountries.find((c) => c.iso_2 === iso2)?.display_name ??
          iso2.toUpperCase(),
        (count, total) => t("stockLocations.serviceZones.manageAreas.someOfAll", { count, total })
      )
        .sort((a, b) => a.localeCompare(b))
        .join(", "),
    [zone.geo_zones, t]
  )

  const rates = zone.shipping_options.filter((o) => !isReturnOption(o))
  const returns = zone.shipping_options.filter(isReturnOption)
  const zonePath = `/settings/locations/${locationId}/fulfillment-set/${fulfillmentSetId}/service-zone/${zone.id}`

  return (
    <div className="flex flex-col px-6 py-4">
      <div className="flex items-center gap-x-2">
        <div className="flex min-w-0 flex-1 items-baseline gap-x-2">
          <Text size="small" leading="compact" weight="plus" className="shrink-0">
            {zone.name}
          </Text>
          {areas && (
            <>
              <span aria-hidden className="text-ui-fg-muted txt-compact-small">
                ·
              </span>
              <Text size="small" leading="compact" className="text-ui-fg-subtle truncate">
                {areas}
              </Text>
            </>
          )}
        </div>
        <ActionMenu
          groups={[
            {
              actions: [
                {
                  label: t("actions.edit"),
                  icon: <PencilSquare />,
                  to: `${zonePath}/edit`,
                },
                {
                  label: t("stockLocations.serviceZones.manageAreas.action"),
                  icon: <Map />,
                  to: `${zonePath}/areas`,
                },
                {
                  label: t("stockLocations.shippingOptions.create.addReturn"),
                  icon: <Plus />,
                  to: `${zonePath}/shipping-option/create?is_return`,
                },
              ],
            },
            {
              actions: [
                {
                  label: t("actions.delete"),
                  icon: <Trash />,
                  onClick: handleDelete,
                },
              ],
            },
          ]}
        />
      </div>

      {rates.length > 0 && (
        <div className="mt-1 flex flex-col divide-y divide-dashed">
          {rates.map((o) => (
            <RateRow
              key={o.id}
              option={o}
              locationId={locationId}
              fulfillmentSetId={fulfillmentSetId}
            />
          ))}
        </div>
      )}

      {returns.length > 0 && (
        <div className="mt-2 flex flex-col">
          <Text size="xsmall" leading="compact" className="text-ui-fg-muted pt-1">
            {t("stockLocations.shippingOptions.create.returns.label")}
          </Text>
          <div className="flex flex-col divide-y divide-dashed">
            {returns.map((o) => (
              <RateRow
                key={o.id}
                option={o}
                locationId={locationId}
                fulfillmentSetId={fulfillmentSetId}
              />
            ))}
          </div>
        </div>
      )}

      <AddLink to={`${zonePath}/shipping-option/create`}>
        {t("stockLocations.shippingOptions.create.addRate")}
      </AddLink>
    </div>
  )
}

/** A quiet "+ Add …" link. */
const AddLink = ({ to, children }: { to: string; children: string }) => (
  <Link
    to={to}
    className="txt-compact-small text-ui-fg-subtle hover:text-ui-fg-base focus-visible:shadow-borders-focus mt-2 inline-flex w-fit items-center gap-x-1.5 rounded-md outline-none transition-fg"
  >
    <Plus className="text-ui-fg-muted" />
    {children}
  </Link>
)

type FulfillmentSetProps = {
  fulfillmentSet?: HttpTypes.AdminFulfillmentSet
  locationName: string
  locationId: string
  type: FulfillmentSetType
}

function FulfillmentSet(props: FulfillmentSetProps) {
  const { t } = useTranslation()
  const prompt = usePrompt()

  const { fulfillmentSet, locationName, locationId, type } = props

  const { mutateAsync: createFulfillmentSet, isPending: isCreating } =
    useCreateStockLocationFulfillmentSet(locationId)

  const { mutateAsync: deleteFulfillmentSet, isPending: isDeleting } =
    useDeleteFulfillmentSet(fulfillmentSet?.id!)

  const handleCreate = async () => {
    await createFulfillmentSet(
      {
        name: `${locationName} ${
          type === FulfillmentSetType.Pickup ? "pick up" : type
        }`,
        type,
      },
      {
        onSuccess: () => {
          toast.success(t(`stockLocations.fulfillmentSets.enable.${type}`))
        },
        onError: (e) => {
          toast.error(e.message)
        },
      }
    )
  }

  const handleDelete = async () => {
    const res = await prompt({
      title: t("general.areYouSure"),
      description: t(`stockLocations.fulfillmentSets.disable.confirmation`, {
        name: fulfillmentSet?.name,
      }),
      confirmText: t("actions.disable"),
      cancelText: t("actions.cancel"),
    })

    if (!res) {
      return
    }

    await deleteFulfillmentSet(undefined, {
      onSuccess: () => {
        toast.success(t(`stockLocations.fulfillmentSets.disable.${type}`))
      },
      onError: (e) => {
        toast.error(e.message)
      },
    })
  }

  const header = t(`stockLocations.fulfillmentSets.${type}.header`)

  return (
    <Container className="divide-y p-0" data-fulfillment-set={type}>
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{header}</Heading>
        <Switch
          aria-label={header}
          checked={!!fulfillmentSet}
          disabled={isCreating || isDeleting}
          onCheckedChange={(on) => (on ? handleCreate() : handleDelete())}
        />
      </div>

      {fulfillmentSet && (
        <>
          {fulfillmentSet.service_zones.map((zone) => (
            <ServiceZone
              zone={zone}
              key={zone.id}
              locationId={locationId}
              fulfillmentSetId={fulfillmentSet.id}
            />
          ))}
          <div className="px-6 pb-4 pt-2">
            <AddLink
              to={`/settings/locations/${locationId}/fulfillment-set/${fulfillmentSet.id}/service-zones/create`}
            >
              {t("stockLocations.serviceZones.create.action")}
            </AddLink>
          </div>
        </>
      )}
    </Container>
  )
}

const Actions = ({ location }: { location: HttpTypes.AdminStockLocation }) => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { mutateAsync } = useDeleteStockLocation(location.id)
  const prompt = usePrompt()

  const handleDelete = async () => {
    const res = await prompt({
      title: t("general.areYouSure"),
      description: t("stockLocations.delete.confirmation", {
        name: location.name,
      }),
      verificationText: location.name,
      verificationInstruction: t("general.typeToConfirm"),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    })

    if (!res) {
      return
    }

    await mutateAsync(undefined, {
      onSuccess: () => {
        toast.success(
          t("stockLocations.create.successToast", {
            name: location.name,
          })
        )
        navigate("/settings/locations", { replace: true })
      },
      onError: (e) => {
        toast.error(e.message)
      },
    })
  }

  return (
    <ActionMenu
      groups={[
        {
          actions: [
            {
              icon: <PencilSquare />,
              label: t("actions.edit"),
              to: `edit`,
            },
            {
              icon: <ArchiveBox />,
              label: t("stockLocations.edit.viewInventory"),
              to: `/inventory?location_id=${location.id}`,
            },
          ],
        },
        {
          // Pagly: the side cards these were on are gone from the page.
          actions: [
            {
              icon: <Channels />,
              label: t("stockLocations.salesChannels.header"),
              to: "sales-channels",
            },
            {
              icon: <Buildings />,
              label: t("stockLocations.fulfillmentProviders.header"),
              to: "fulfillment-providers",
            },
          ],
        },
        {
          actions: [
            {
              icon: <Trash />,
              label: t("actions.delete"),
              onClick: handleDelete,
            },
          ],
        },
      ]}
    />
  )
}
