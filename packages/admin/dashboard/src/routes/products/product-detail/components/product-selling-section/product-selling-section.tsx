import { HttpTypes } from "@medusajs/types"
import { Container, Switch, Text, toast } from "@medusajs/ui"
import { ComponentType } from "react"
import { useTranslation } from "react-i18next"

import { useUpdateProduct } from "../../../../../hooks/api/products"
import { useExtension } from "../../../../../providers/extension-provider"
import { StockCover } from "../../product-facts"
import { CardHeading, CardRow } from "../card-parts"

/**
 * What a plugin part in `product.details.selling` receives: it renders rows,
 * and calls `coverStock` with what to say while it sells the product without
 * stock (a running preorder), or null when it stops.
 */
export type SellingPartProps = {
  data: HttpTypes.AdminProduct
  coverStock: (cover: StockCover) => void
}

/**
 * Pagly: Venta. The plugin rows (preorder, personalization), then whether
 * discounts apply, as a switch: it's yes or no.
 */
export const ProductSellingSection = ({
  product,
  onCoverStock,
}: {
  product: HttpTypes.AdminProduct
  onCoverStock: (cover: StockCover) => void
}) => {
  const { t } = useTranslation()
  const { getWidgets } = useExtension()
  const parts = getWidgets(
    "product.details.selling" as any
  ) as ComponentType<SellingPartProps>[]
  const { mutateAsync, isPending } = useUpdateProduct(product.id)

  return (
    <Container className="divide-y p-0">
      <CardHeading title={t("products.page.selling.title")} />
      {parts.map((Part, index) => (
        <Part key={index} data={product} coverStock={onCoverStock} />
      ))}
      <CardRow
        label={t("products.page.selling.discounts")}
        action={
          <Switch
            // Pagly: on reads in the text colour, never the interactive blue.
            className="data-[state=checked]:bg-ui-fg-base"
            aria-label={t("products.page.selling.discountsLabel")}
            checked={!!product.discountable}
            disabled={isPending}
            onCheckedChange={(discountable) =>
              mutateAsync(
                { discountable },
                { onError: (e) => toast.error(e.message) }
              )
            }
          />
        }
      >
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {t("products.page.selling.discountsHint")}
        </Text>
      </CardRow>
    </Container>
  )
}
