import {
  ArrowDownMini,
  ArrowUpRightOnBox,
  GlobeEurope,
  Photo,
  Trash,
} from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import {
  Button,
  Container,
  Heading,
  StatusBadge,
  Text,
  Tooltip,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { ComponentType, Fragment, ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { ActionMenu } from "../../../../../components/common/action-menu"
import {
  useDeleteProduct,
  useUpdateProduct,
} from "../../../../../hooks/api/products"
import { getLocaleAmount } from "../../../../../lib/money-amount-helpers"
import { useStorefrontHref } from "../../../../../lib/storefront"
import { useExtension } from "../../../../../providers/extension-provider"
import { useFeatureFlag } from "../../../../../providers/feature-flag-provider"
import { getSummary } from "../../product-facts"
import { ProductPageFacts } from "../../use-product-page-facts"

/** What a plugin part in `product.details.header` receives. */
type HeaderPartProps = { data: HttpTypes.AdminProduct }

const statusColor = (status: string) =>
  status === "published"
    ? "green"
    : status === "proposed"
    ? "orange"
    : status === "rejected"
    ? "red"
    : "grey"

/**
 * Pagly: the store only shows published products that are in a sales channel.
 * A product fetched without its channels is given the benefit of the doubt.
 */
export const isInStore = (
  product: Pick<HttpTypes.AdminProduct, "status" | "sales_channels">
) =>
  product.status === "published" &&
  (product.sales_channels === undefined ||
    product.sales_channels === null ||
    product.sales_channels.length > 0)

/**
 * Pagly: the product page's header. Its photo, name and state, one line with
 * the price, the variants and the stock, the plugin parts (asking the catalog
 * agent), the store link and a menu for the rest.
 */
export const ProductHeader = ({
  product,
  facts,
}: {
  product: HttpTypes.AdminProduct
  facts: ProductPageFacts
}) => {
  const { t } = useTranslation()
  const { getWidgets } = useExtension()
  const parts = getWidgets(
    "product.details.header" as any
  ) as ComponentType<HeaderPartProps>[]

  const summary = getSummary({
    product,
    variants: facts.variants,
    currency: facts.currency,
    cover: facts.cover,
    places: facts.places,
    sales: facts.sales,
  })

  const money = (amount: number) =>
    getLocaleAmount(amount, facts.currency, { wholeWithoutCents: true })

  const line: ReactNode[] = []
  if (summary.price && facts.currency) {
    line.push(
      summary.price.min === summary.price.max
        ? money(summary.price.min)
        : t("products.page.summary.range", {
            min: money(summary.price.min),
            max: money(summary.price.max),
          })
    )
  }
  if (summary.variants) {
    line.push(t("products.page.summary.variants", { count: summary.variants }))
  }
  if (summary.stock?.kind === "count") {
    line.push(
      summary.stock.places > 1
        ? t("products.page.summary.stockPlaces", {
            count: summary.stock.count,
            places: summary.stock.places,
          })
        : t("products.page.summary.stock", { count: summary.stock.count })
    )
  } else if (summary.stock?.kind === "cover") {
    line.push(summary.stock.text)
  }

  return (
    <Container className="flex flex-wrap items-center gap-4 px-6 py-4">
      <div className="bg-ui-bg-component shadow-borders-base flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md">
        {product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <Photo className="text-ui-fg-muted" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Heading>{product.title}</Heading>
          <StatusBadge color={statusColor(product.status)}>
            {t(`products.productStatus.${product.status}`)}
          </StatusBadge>
        </div>
        {line.length > 0 && (
          <Text size="small" className="text-ui-fg-subtle tabular-nums">
            {line.map((fact, index) => (
              <Fragment key={index}>
                {index > 0 && (
                  <span aria-hidden className="text-ui-fg-disabled px-1.5">
                    ·
                  </span>
                )}
                <span>{fact}</span>
              </Fragment>
            ))}
          </Text>
        )}
      </div>
      <div className="flex items-center gap-x-2">
        {parts.map((Part, index) => (
          <Part key={index} data={product} />
        ))}
        <StoreLink product={product} />
        <HeaderMenu product={product} />
      </div>
    </Container>
  )
}

const StoreLink = ({ product }: { product: HttpTypes.AdminProduct }) => {
  const { t } = useTranslation()
  const href = useStorefrontHref()(
    `/products/${encodeURIComponent(product.handle)}`
  )

  if (!href) {
    return null
  }

  if (!isInStore(product)) {
    return (
      <Tooltip
        content={
          product.status === "published"
            ? t("onlineStore.unavailable.noSalesChannel")
            : t("onlineStore.unavailable.product")
        }
      >
        <span tabIndex={0}>
          <Button size="small" variant="secondary" disabled>
            <ArrowUpRightOnBox />
            {t("onlineStore.view")}
          </Button>
        </span>
      </Tooltip>
    )
  }

  return (
    <Button size="small" variant="secondary" asChild>
      <a href={href} target="_blank" rel="noopener noreferrer">
        <ArrowUpRightOnBox />
        {t("onlineStore.view")}
      </a>
    </Button>
  )
}

const HeaderMenu = ({ product }: { product: HttpTypes.AdminProduct }) => {
  const { t } = useTranslation()
  const prompt = usePrompt()
  const navigate = useNavigate()
  const isTranslationsEnabled = useFeatureFlag("translation")
  const { mutateAsync: remove } = useDeleteProduct(product.id)
  const { mutateAsync: update } = useUpdateProduct(product.id)

  const handleDelete = async () => {
    const res = await prompt({
      title: t("general.areYouSure"),
      description: t("products.deleteWarning", { title: product.title }),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    })

    if (!res) {
      return
    }

    await remove(undefined, {
      onSuccess: () => navigate(".."),
      onError: (e) =>
        toast.error(t("products.toasts.delete.error.header"), {
          description: e.message,
        }),
    })
  }

  const unpublish = () =>
    update({ status: "draft" }, { onError: (e) => toast.error(e.message) })

  return (
    <ActionMenu
      groups={[
        {
          actions: [
            ...(product.status === "published"
              ? [
                  {
                    label: t("products.page.header.unpublish"),
                    onClick: unpublish,
                    icon: <ArrowDownMini />,
                  },
                ]
              : []),
            ...(isTranslationsEnabled
              ? [
                  {
                    label: t("translations.actions.manage"),
                    to: `/settings/translations/edit?reference=product&reference_id=${product.id}`,
                    icon: <GlobeEurope />,
                  },
                ]
              : []),
          ],
        },
        {
          actions: [
            {
              label: t("actions.delete"),
              onClick: handleDelete,
              icon: <Trash />,
            },
          ],
        },
      ]}
    />
  )
}
