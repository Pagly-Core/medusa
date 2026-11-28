import { useState } from "react"
import { useTranslation } from "react-i18next"

import { CurrencyDollar } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Button, Container, Heading } from "@medusajs/ui"

import { ActionMenu } from "../../../../../components/common/action-menu"
import { NoRecords } from "../../../../../components/common/empty-table-content"
import { useRegions } from "../../../../../hooks/api/regions"
import { getLocaleAmount } from "../../../../../lib/money-amount-helpers"

type VariantPricesSectionProps = {
  variant: Omit<HttpTypes.AdminProductVariant, "prices"> & {
    prices?: (HttpTypes.AdminPrice & {
      rules?: Record<string, unknown>
    })[]
  }
}

export function VariantPricesSection({ variant }: VariantPricesSectionProps) {
  const { t } = useTranslation()
  // Pagly: a region's price shows too, named by its region: the section
  // dropped every price with rules (Pagly-Core/pagly-app#260).
  const { regions = [] } = useRegions({ fields: "id,name", limit: 999 })
  const regionOf = (price: { rules?: Record<string, unknown> }) => {
    const keys = Object.keys(price.rules || {})
    return keys.length === 1 && keys[0] === "region_id" ? String(price.rules!.region_id) : null
  }
  const prices = variant.prices
    ?.filter((p) => !Object.keys(p.rules || {}).length || regionOf(p))
    .sort(
      (p1, p2) =>
        Number(!!regionOf(p1)) - Number(!!regionOf(p2)) ||
        p1.currency_code?.localeCompare(p2.currency_code)
    )
  const labelOf = (price: NonNullable<typeof prices>[number]) => {
    const regionId = regionOf(price)
    return regionId
      ? regions.find((region) => region.id === regionId)?.name ?? regionId
      : price.currency_code.toUpperCase()
  }

  const hasPrices = !!prices?.length
  const [pageSize, setPageSize] = useState(3)
  const displayPrices = prices?.slice(0, pageSize)

  const onShowMore = () => {
    setPageSize(pageSize + 3)
  }

  return (
    <Container className="flex flex-col divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("labels.prices")}</Heading>
        <ActionMenu
          groups={[
            {
              actions: [
                {
                  label: t("actions.edit"),
                  to: `/products/${variant.product_id}/variants/${variant.id}/prices`,
                  icon: <CurrencyDollar />,
                },
              ],
            },
          ]}
        />
      </div>
      {!hasPrices && <NoRecords className="h-60" />}
      {displayPrices?.map((price) => {
        return (
          <div
            key={price.id}
            className="txt-small text-ui-fg-subtle flex justify-between px-6 py-4"
          >
            <span className="font-medium">{labelOf(price)}</span>
            <span>{getLocaleAmount(price.amount, price.currency_code)}</span>
          </div>
        )
      })}
      {hasPrices && (
        <div className="txt-small text-ui-fg-subtle flex items-center justify-between px-6 py-4">
          <span className="font-medium">
            {t("products.variant.pricesPagination", {
              total: prices.length,
              current: Math.min(pageSize, prices.length),
            })}
          </span>
          <Button
            onClick={onShowMore}
            disabled={pageSize >= prices.length}
            className="-mr-3 text-blue-500"
            variant="transparent"
          >
            {t("actions.showMore")}
          </Button>
        </div>
      )}
    </Container>
  )
}
