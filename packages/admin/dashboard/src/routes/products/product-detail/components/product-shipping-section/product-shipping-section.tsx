import { ShoppingBag } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Container } from "@medusajs/ui"
import { ComponentType } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { ActionMenu } from "../../../../../components/common/action-menu"
import { getFormattedCountry } from "../../../../../lib/addresses"
import { useExtension } from "../../../../../providers/extension-provider"
import { ExtendedProduct } from "../../constants"
import { CardHeading, CardNote, CardRow } from "../card-parts"

/** What a plugin part in `product.details.shipping` receives: it renders rows. */
type ShippingPartProps = { data: HttpTypes.AdminProduct }

/**
 * Pagly: Envío. The weight (stored in grams) in kilos, the sides in
 * centimetres, customs codes and a shipping profile only when they say
 * something, and the plugin rows (its own box). One pencil edits the
 * measures and customs codes.
 */
export const ProductShippingSection = ({
  product,
}: {
  product: HttpTypes.AdminProduct
}) => {
  const { t, i18n } = useTranslation()
  const { getWidgets, getDisplays } = useExtension()
  const parts = getWidgets(
    "product.details.shipping" as any
  ) as ComponentType<ShippingPartProps>[]
  const displays = getDisplays("product", "attributes")

  const number = (value: number) =>
    new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 }).format(
      value
    )
  const kilos = (grams: number) =>
    new Intl.NumberFormat(i18n.language, {
      style: "unit",
      unit: "kilogram",
      maximumFractionDigits: 3,
    }).format(grams / 1000)

  const { weight, length, width, height } = product
  const hasSides = !!length && !!width && !!height
  const profile = (product as ExtendedProduct).shipping_profile
  const customs = [
    { label: t("fields.hsCode"), value: product.hs_code },
    { label: t("fields.midCode"), value: product.mid_code },
    {
      label: t("fields.countryOfOrigin"),
      value: product.origin_country
        ? getFormattedCountry(product.origin_country)
        : null,
    },
  ].filter((row) => !!row.value)

  return (
    <Container className="divide-y p-0">
      <CardHeading
        title={t("products.page.shipping.title")}
        editTo="attributes"
        editLabel={t("products.page.shipping.edit")}
        tools={
          <ActionMenu
            groups={[
              {
                actions: [
                  {
                    label: t("products.shippingProfile.header"),
                    to: "shipping-profile",
                    icon: <ShoppingBag />,
                  },
                ],
              },
            ]}
          />
        }
      />
      {weight ? (
        <CardRow label={t("products.page.shipping.weight")}>
          <span className="tabular-nums">{kilos(weight)}</span>
        </CardRow>
      ) : null}
      {hasSides ? (
        <CardRow label={t("products.page.shipping.sizes")}>
          <span className="tabular-nums">
            {t("products.page.shipping.sizesValue", {
              length: number(length!),
              width: number(width!),
              height: number(height!),
            })}
          </span>
        </CardRow>
      ) : null}
      {!weight && !hasSides && (
        <CardNote>{t("products.page.shipping.empty")}</CardNote>
      )}
      {parts.map((Part, index) => (
        <Part key={index} data={product} />
      ))}
      {customs.map((row) => (
        <CardRow key={row.label} label={row.label}>
          {row.value}
        </CardRow>
      ))}
      {profile && profile.type !== "default" && (
        <CardRow label={t("products.page.shipping.profile")}>
          <Link to="shipping-profile" className="underline underline-offset-2">
            {profile.name}
          </Link>
        </CardRow>
      )}
      {displays.map((Display, index) => (
        <Display key={index} data={product} />
      ))}
    </Container>
  )
}
