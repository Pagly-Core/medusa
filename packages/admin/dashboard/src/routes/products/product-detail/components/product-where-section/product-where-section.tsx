import { Channels } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Container, clx } from "@medusajs/ui"
import { ComponentType } from "react"
import { useTranslation } from "react-i18next"

import { ActionMenu } from "../../../../../components/common/action-menu"
import { useExtension } from "../../../../../providers/extension-provider"
import { CardHeading, CardRow } from "../card-parts"
import { isInStore } from "../product-header/product-header"

/** What a plugin part in `product.details.where` receives: it renders rows. */
type WherePartProps = { data: HttpTypes.AdminProduct }

/**
 * Pagly: Dónde se vende. Whether the online store shows it, then the plugin
 * rows about where else it sells (agents, favourites). Sales channels are in
 * the menu: their names are the engine's, never shown.
 */
export const ProductWhereSection = ({
  product,
}: {
  product: HttpTypes.AdminProduct
}) => {
  const { t } = useTranslation()
  const { getWidgets } = useExtension()
  const parts = getWidgets(
    "product.details.where" as any
  ) as ComponentType<WherePartProps>[]

  const inStore = isInStore(product)
  const state =
    product.status !== "published"
      ? t(`products.productStatus.${product.status}`)
      : inStore
      ? t("products.productStatus.published")
      : t("products.page.where.notInStore")

  return (
    <Container className="divide-y p-0">
      <CardHeading
        title={t("products.page.where.title")}
        tools={
          <ActionMenu
            groups={[
              {
                actions: [
                  {
                    label: t("products.page.where.channels"),
                    to: "sales-channels",
                    icon: <Channels />,
                  },
                ],
              },
            ]}
          />
        }
      />
      <CardRow label={t("products.page.where.store")}>
        <span className="inline-flex items-center gap-x-1.5">
          <span
            aria-hidden
            className={clx(
              "size-1.5 rounded-sm",
              inStore
                ? "bg-ui-tag-green-icon"
                : product.status === "published"
                ? "bg-ui-tag-orange-icon"
                : "bg-ui-tag-neutral-icon"
            )}
          />
          {state}
        </span>
      </CardRow>
      {parts.map((Part, index) => (
        <Part key={index} data={product} />
      ))}
    </Container>
  )
}
