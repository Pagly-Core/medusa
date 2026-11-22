import { HttpTypes } from "@medusajs/types"
import { Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { useUpdateProduct } from "../../../../../hooks/api/products"
import { Blocker, BlockerId, getBlockers } from "../../product-facts"
import { ProductPageFacts } from "../../use-product-page-facts"

/** Where each blocker's fix opens; publishing happens here. */
const FIX_ROUTES: Record<
  Exclude<BlockerId, "draft" | "unpublished">,
  string
> = {
  noPrice: "prices",
  noPhotos: "media?view=edit",
  noStock: "stock",
  someOut: "stock",
  noChannel: "sales-channels",
}

/** Each blocker's words; noPrice and someOut count their variants. */
const COPY = {
  noPrice: {
    title: "products.page.blockers.noPrice.title",
    detail: "products.page.blockers.noPrice.detail",
    action: "products.page.blockers.noPrice.action",
  },
  noPhotos: {
    title: "products.page.blockers.noPhotos.title",
    detail: "products.page.blockers.noPhotos.detail",
    action: "products.page.blockers.noPhotos.action",
  },
  noStock: {
    title: "products.page.blockers.noStock.title",
    detail: "products.page.blockers.noStock.detail",
    action: "products.page.blockers.noStock.action",
  },
  someOut: {
    title: "products.page.blockers.someOut.title",
    detail: "products.page.blockers.someOut.detail",
    action: "products.page.blockers.someOut.action",
  },
  draft: {
    title: "products.page.blockers.draft.title",
    detail: "products.page.blockers.draft.detail",
    action: "products.page.blockers.draft.action",
  },
  unpublished: {
    title: "products.page.blockers.unpublished.title",
    detail: "products.page.blockers.unpublished.detail",
    action: "products.page.blockers.unpublished.action",
  },
  noChannel: {
    title: "products.page.blockers.noChannel.title",
    detail: "products.page.blockers.noChannel.detail",
    action: "products.page.blockers.noChannel.action",
  },
} as const satisfies Record<
  BlockerId,
  { title: string; detail: string; action: string }
>

/** "Negro · XL y Crudo · M": the variants' names in the admin's language. */
const listNames = (language: string, names: string[]) => {
  const { ListFormat } = Intl as unknown as {
    ListFormat: new (locale: string, options: { type: "conjunction" }) => {
      format: (items: string[]) => string
    }
  }

  return new ListFormat(language, { type: "conjunction" }).format(names)
}

/**
 * Pagly: what stops the product from selling, right under the header, each
 * with the button that fixes it. Not there when nothing does; one blocker is
 * a row, more are listed under "Para empezar a vender".
 */
export const ProductBlockers = ({
  product,
  facts,
}: {
  product: HttpTypes.AdminProduct
  facts: ProductPageFacts
}) => {
  const { t } = useTranslation()

  if (facts.isPending) {
    return null
  }

  const blockers = getBlockers({
    product,
    variants: facts.variants,
    currency: facts.currency,
    cover: facts.cover,
  })

  if (!blockers.length) {
    return null
  }

  const rows = blockers.map((blocker, index) => (
    <BlockerRow
      key={blocker.id}
      product={product}
      blocker={blocker}
      primary={blockers.length > 1 && index === 0}
    />
  ))

  return (
    <Container className="border-ui-tag-orange-border divide-y border p-0 shadow-none">
      {blockers.length > 1 && (
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">{t("products.page.blockers.title")}</Heading>
          <Text size="small" className="text-ui-fg-muted">
            {t("products.page.blockers.count", { count: blockers.length })}
          </Text>
        </div>
      )}
      {rows}
    </Container>
  )
}

const BlockerRow = ({
  product,
  blocker,
  primary,
}: {
  product: HttpTypes.AdminProduct
  blocker: Blocker
  primary: boolean
}) => {
  const { t, i18n } = useTranslation()
  const { mutateAsync, isPending } = useUpdateProduct(product.id)
  const copy = COPY[blocker.id]
  const variant = primary ? "primary" : "secondary"

  const title: string =
    blocker.id === "someOut"
      ? t(copy.title, {
          count: blocker.count,
          names: listNames(i18n.language, blocker.names ?? []),
        })
      : t(copy.title)
  const detail: string =
    blocker.id === "noPrice" || blocker.id === "someOut"
      ? t(copy.detail, { count: blocker.count })
      : t(copy.detail)

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-6 py-3">
      <span
        aria-hidden
        className="bg-ui-tag-orange-icon size-1.5 shrink-0 rounded-sm"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Text size="small" leading="compact" weight="plus">
          {title}
        </Text>
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {detail}
        </Text>
      </div>
      {blocker.id === "draft" || blocker.id === "unpublished" ? (
        <Button
          size="small"
          variant={variant}
          isLoading={isPending}
          onClick={() =>
            mutateAsync(
              { status: "published" },
              { onError: (e) => toast.error(e.message) }
            )
          }
        >
          {t(copy.action)}
        </Button>
      ) : (
        <Button size="small" variant={variant} asChild>
          <Link to={FIX_ROUTES[blocker.id]}>{t(copy.action)}</Link>
        </Button>
      )}
    </div>
  )
}
