import {
  Buildings,
  Component,
  GlobeEurope,
  PencilSquare,
  Plus,
  Trash,
  TriangleRightMini,
} from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import {
  Button,
  Container,
  Heading,
  IconButton,
  Text,
  clx,
  usePrompt,
} from "@medusajs/ui"
import { ReactNode, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"

import { ActionMenu } from "../../../../../components/common/action-menu"
import { useDeleteVariantLazy } from "../../../../../hooks/api/products"
import { getVariantTitle } from "../../../../../lib/default-names"
import { getLocaleAmount } from "../../../../../lib/money-amount-helpers"
import { useFeatureFlag } from "../../../../../providers/feature-flag-provider"
import {
  FactVariant,
  groupVariants,
  groupsStartOpen,
  isCovered,
  isOutOfStock,
  isTracked,
  priceRange,
  realOptions,
  variantName,
  variantPrice,
} from "../../product-facts"
import { ProductPageFacts } from "../../use-product-page-facts"

type Props = {
  product: HttpTypes.AdminProduct
  facts: ProductPageFacts
}

/** A row's cells by area: one line on a wide screen, name/SKU over price/stock on a phone. */
const ROW =
  "grid items-center gap-x-3 px-6 py-2.5 grid-cols-[minmax(0,1fr)_auto_28px] [grid-template-areas:'name_price_act'_'sku_stock_act'] md:grid-cols-[minmax(0,1fr)_120px_140px_132px_28px] md:[grid-template-areas:'name_sku_price_stock_act']"

/**
 * Pagly: Variantes y precios. The options sit over the rows they make, each
 * row says its price and its stock, and with two options or more the rows
 * group by the first one. A product in one version shows its price, stock and
 * SKU as rows instead.
 */
export const ProductVariantSection = ({ product, facts }: Props) => {
  const { t } = useTranslation()
  const options = realOptions(product)

  if (!options.length && facts.variants.length <= 1) {
    return <OneVersion product={product} facts={facts} />
  }

  const groups = groupVariants(product, facts.variants)
  const sale = [...facts.sales.values()][0]

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-y-1 px-6 py-4">
        <div className="flex items-center justify-between gap-x-3">
          <Heading level="h2">{t("products.page.variants.title")}</Heading>
          <CardTools
            product={product}
            label={t("products.page.variants.editPrices")}
          />
        </div>
        <div className="text-ui-fg-subtle flex flex-wrap gap-x-4 gap-y-0.5">
          {options.map((option) => (
            <Text key={option.id} size="small" leading="compact" asChild>
              <span>
                <span className="text-ui-fg-base font-medium">{`${option.title}:`}</span>{" "}
                <span>
                  {(option.values ?? []).map((v) => v.value).join(", ")}
                </span>
              </span>
            </Text>
          ))}
        </div>
        {sale && <SaleNote name={sale.offer} endsAt={sale.ends_at} />}
      </div>
      <div className="divide-y">
        <div
          className={clx(
            ROW,
            "text-ui-fg-subtle bg-ui-bg-subtle hidden md:grid"
          )}
        >
          <HeadCell area="name">
            {t("products.page.variants.columns.variant")}
          </HeadCell>
          <HeadCell area="sku">
            {t("products.page.variants.columns.sku")}
          </HeadCell>
          <HeadCell area="price" end>
            {t("products.page.variants.columns.price")}
          </HeadCell>
          <HeadCell area="stock" end>
            {t("products.page.variants.columns.stock")}
          </HeadCell>
        </div>
        {groups
          ? groups.map((group) => (
              <VariantGroup
                key={group.value}
                product={product}
                facts={facts}
                value={group.value}
                variants={group.variants}
                startOpen={groupsStartOpen(facts.variants)}
              />
            ))
          : facts.variants.map((variant) => (
              <VariantRow
                key={variant.id}
                product={product}
                facts={facts}
                variant={variant}
              />
            ))}
      </div>
    </Container>
  )
}

const HeadCell = ({
  area,
  end,
  children,
}: {
  area: string
  end?: boolean
  children: ReactNode
}) => (
  <Text
    size="small"
    leading="compact"
    weight="plus"
    className={clx(end && "text-right")}
    style={{ gridArea: area }}
  >
    {children}
  </Text>
)

const Cell = ({
  area,
  end,
  className,
  children,
}: {
  area: string
  end?: boolean
  className?: string
  children: ReactNode
}) => (
  <div
    className={clx("min-w-0", end && "text-right", className)}
    style={{ gridArea: area }}
  >
    {children}
  </div>
)

const CardTools = ({
  product,
  label,
}: {
  product: HttpTypes.AdminProduct
  label: string
}) => {
  const { t } = useTranslation()
  const isTranslationsEnabled = useFeatureFlag("translation")

  return (
    <div className="flex items-center gap-x-1">
      <IconButton size="small" variant="transparent" asChild>
        <Link to="prices" aria-label={label}>
          <PencilSquare />
        </Link>
      </IconButton>
      <ActionMenu
        groups={[
          {
            actions: [
              {
                label: t("inventory.stock.action"),
                to: "stock",
                icon: <Buildings />,
              },
              {
                label: t("products.page.variants.addVariant"),
                to: "variants/create",
                icon: <Plus />,
              },
              {
                label: t("products.page.variants.editOptions"),
                to: "options/manage",
                icon: <Component />,
              },
              ...(isTranslationsEnabled
                ? [
                    {
                      label: t("translations.actions.manage"),
                      to: `/settings/translations/edit?reference=product_variant&reference_id=${product.id}`,
                      icon: <GlobeEurope />,
                    },
                  ]
                : []),
            ],
          },
        ]}
      />
    </div>
  )
}

const SaleNote = ({
  name,
  endsAt,
}: {
  name: string
  endsAt: string | null
}) => {
  const { t, i18n } = useTranslation()
  const date = endsAt
    ? new Intl.DateTimeFormat(i18n.language, {
        day: "numeric",
        month: "short",
      }).format(new Date(endsAt))
    : null

  return (
    <Text
      size="small"
      leading="compact"
      className="text-ui-fg-subtle flex flex-wrap items-center gap-x-1.5"
    >
      <span aria-hidden className="bg-ui-tag-green-icon size-1.5 rounded-sm" />
      <span>
        {date
          ? t("products.page.variants.saleUntil", { name, date })
          : t("products.page.variants.sale", { name })}
      </span>
      <Link
        to="/price-lists"
        className="text-ui-fg-base underline underline-offset-2"
      >
        {t("products.page.variants.seeOffers")}
      </Link>
    </Text>
  )
}

const usePrice = (facts: ProductPageFacts) => {
  const money = (amount: number) =>
    getLocaleAmount(amount, facts.currency, { wholeWithoutCents: true })

  return (variant: FactVariant): ReactNode => {
    const price = variantPrice(variant, facts.currency)
    const sale = facts.sales.get(variant.id)

    if (price === null || !facts.currency) {
      return null
    }

    if (sale && sale.amount < price) {
      return (
        <>
          <span>{money(sale.amount)}</span>{" "}
          <s className="text-ui-fg-muted">{money(price)}</s>
        </>
      )
    }

    return money(price)
  }
}

const StockText = ({
  facts,
  variant,
}: {
  facts: ProductPageFacts
  variant: FactVariant
}) => {
  const { t } = useTranslation()
  const quantity = variant.inventory_quantity ?? 0

  if (!isTracked(variant)) {
    return (
      <span className="text-ui-fg-muted">
        {t("products.page.variants.untracked")}
      </span>
    )
  }
  if (quantity > 0) {
    return (
      <span>{t("products.page.variants.inStock", { count: quantity })}</span>
    )
  }
  if (facts.cover && isCovered(variant, facts.cover)) {
    return <Dotted tone="green">{facts.cover.row}</Dotted>
  }
  if (variant.allow_backorder) {
    return (
      <span className="text-ui-fg-subtle">
        {t("products.page.variants.backorder")}
      </span>
    )
  }
  return <Dotted tone="orange">{t("products.page.variants.outOfStock")}</Dotted>
}

const Dotted = ({
  tone,
  children,
}: {
  tone: "orange" | "green"
  children: ReactNode
}) => (
  <span className="inline-flex items-center gap-x-1.5">
    <span
      aria-hidden
      className={clx(
        "size-1.5 shrink-0 rounded-sm",
        tone === "orange" ? "bg-ui-tag-orange-icon" : "bg-ui-tag-green-icon"
      )}
    />
    <span>{children}</span>
  </span>
)

const VariantRow = ({
  product,
  facts,
  variant,
  child,
}: {
  product: HttpTypes.AdminProduct
  facts: ProductPageFacts
  variant: FactVariant
  child?: string
}) => {
  const { t } = useTranslation()
  const price = usePrice(facts)(variant)
  const name = child ?? variantName(product, variant)

  return (
    <div className={ROW}>
      <Cell area="name" className={clx(child && "pl-8")}>
        <Text
          size="small"
          leading="compact"
          weight={child ? "regular" : "plus"}
          className="truncate"
        >
          {name}
        </Text>
      </Cell>
      <Cell area="sku" className={clx(child && "pl-8 md:pl-0")}>
        <Text
          size="small"
          leading="compact"
          className="text-ui-fg-muted truncate"
        >
          {variant.sku || "—"}
        </Text>
      </Cell>
      <Cell area="price" end>
        <Text size="small" leading="compact" className="tabular-nums">
          {price ?? (
            <span className="text-ui-fg-muted">
              {t("products.page.variants.noPrice")}
            </span>
          )}
        </Text>
      </Cell>
      <Cell area="stock" end>
        <Text size="small" leading="compact" className="tabular-nums">
          <StockText facts={facts} variant={variant} />
        </Text>
      </Cell>
      <Cell area="act">
        <VariantMenu product={product} variant={variant} />
      </Cell>
    </div>
  )
}

const VariantGroup = ({
  product,
  facts,
  value,
  variants,
  startOpen,
}: {
  product: HttpTypes.AdminProduct
  facts: ProductPageFacts
  value: string
  variants: FactVariant[]
  startOpen: boolean
}) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(startOpen)
  const range = priceRange(
    variants.map(
      (v) => facts.sales.get(v.id)?.amount ?? variantPrice(v, facts.currency)
    )
  )
  const money = (amount: number) =>
    getLocaleAmount(amount, facts.currency, { wholeWithoutCents: true })
  const tracked = variants.filter(isTracked)
  const total = tracked.reduce(
    (sum, v) => sum + Math.max(0, v.inventory_quantity ?? 0),
    0
  )
  const out = variants.filter(
    (v) => isOutOfStock(v) && !isCovered(v, facts.cover)
  ).length
  const firstOption = realOptions(product)[0]
  const second = (v: FactVariant) =>
    variantName(product, {
      ...v,
      options: (v.options ?? []).filter((o) => o.option_id !== firstOption?.id),
    })

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setOpen(!open)
          }
        }}
        className={clx(
          ROW,
          "hover:bg-ui-bg-subtle-hover focus-visible:shadow-borders-focus cursor-pointer outline-none"
        )}
      >
        <Cell area="name" className="flex items-center gap-x-2">
          <TriangleRightMini
            className={clx(
              "text-ui-fg-muted shrink-0 transition-transform",
              open && "rotate-90"
            )}
          />
          <Text
            size="small"
            leading="compact"
            weight="plus"
            className="truncate"
          >
            {value}
          </Text>
          <Text size="small" leading="compact" className="text-ui-fg-muted">
            {t("products.page.variants.groupCount", { count: variants.length })}
          </Text>
        </Cell>
        <Cell area="price" end>
          <Text size="small" leading="compact" className="tabular-nums">
            {range && facts.currency ? (
              range.min === range.max ? (
                money(range.min)
              ) : (
                t("products.page.summary.range", {
                  min: money(range.min),
                  max: money(range.max),
                })
              )
            ) : (
              <span className="text-ui-fg-muted">
                {t("products.page.variants.noPrice")}
              </span>
            )}
          </Text>
        </Cell>
        <Cell area="stock" end>
          <Text size="small" leading="compact" className="tabular-nums">
            {tracked.length ? (
              t("products.page.variants.inStock", { count: total })
            ) : (
              <span className="text-ui-fg-muted">
                {t("products.page.variants.untracked")}
              </span>
            )}
          </Text>
          {out > 0 && (
            <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
              <Dotted tone="orange">
                {t("products.page.variants.someOut", { count: out })}
              </Dotted>
            </Text>
          )}
        </Cell>
      </div>
      {open &&
        variants.map((variant) => (
          <VariantRow
            key={variant.id}
            product={product}
            facts={facts}
            variant={variant}
            child={second(variant)}
          />
        ))}
    </>
  )
}

const VariantMenu = ({
  product,
  variant,
}: {
  product: HttpTypes.AdminProduct
  variant: FactVariant
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const prompt = usePrompt()
  const isTranslationsEnabled = useFeatureFlag("translation")
  const { mutateAsync } = useDeleteVariantLazy(product.id)
  const items = (
    (variant as { inventory_items?: { inventory?: { id: string } }[] })
      .inventory_items ?? []
  )
    .map((i) => i.inventory?.id)
    .filter((id): id is string => !!id)

  const handleDelete = async () => {
    const res = await prompt({
      title: t("general.areYouSure"),
      description: t("products.deleteVariantWarning", {
        // Pagly: a product's one version is named after the product.
        title: getVariantTitle(variant.title, product.title),
      }),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    })

    if (res) {
      await mutateAsync({ variantId: variant.id })
    }
  }

  return (
    <ActionMenu
      groups={[
        {
          actions: [
            {
              label: t("actions.edit"),
              icon: <PencilSquare />,
              onClick: () => navigate(`edit-variant?variant_id=${variant.id}`),
            },
            ...(isTranslationsEnabled
              ? [
                  {
                    label: t("translations.actions.manage"),
                    icon: <GlobeEurope />,
                    onClick: () =>
                      navigate(
                        `/settings/translations/edit?reference=product_variant&reference_id=${variant.id}`
                      ),
                  },
                ]
              : []),
            ...(items.length === 1
              ? [
                  {
                    label: t(
                      "products.variant.inventory.actions.inventoryItems"
                    ),
                    icon: <Buildings />,
                    onClick: () => navigate(`/inventory/${items[0]}`),
                  },
                ]
              : items.length > 1
              ? [
                  {
                    label: t("products.variant.inventory.actions.inventoryKit"),
                    icon: <Component />,
                    onClick: () =>
                      navigate(
                        `/inventory?${new URLSearchParams({
                          id: items.join(","),
                        }).toString()}`
                      ),
                  },
                ]
              : []),
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
  )
}

/** A product in one version: its price, stock and SKU, and a way to add options. */
const OneVersion = ({ product, facts }: Props) => {
  const { t } = useTranslation()
  const variant = facts.variants[0]
  const price = usePrice(facts)

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between gap-x-3 px-6 py-4">
        <Heading level="h2">{t("products.page.variants.titleOne")}</Heading>
        <CardTools
          product={product}
          label={t("products.page.variants.editPrice")}
        />
      </div>
      <FactRow label={t("products.page.variants.price")}>
        {(variant && price(variant)) ?? (
          <span className="text-ui-fg-muted">
            {t("products.page.variants.noPrice")}
          </span>
        )}
      </FactRow>
      <FactRow
        label={t("products.page.variants.stock")}
        action={
          variant && isTracked(variant) ? (
            <Button size="small" variant="secondary" asChild>
              <Link to="stock">
                {t("products.page.blockers.noStock.action")}
              </Link>
            </Button>
          ) : undefined
        }
      >
        {variant ? <StockText facts={facts} variant={variant} /> : null}
      </FactRow>
      <FactRow label={t("products.page.variants.sku")}>
        {variant?.sku || "—"}
      </FactRow>
      <FactRow
        label={t("products.page.variants.variants")}
        action={
          <Button size="small" variant="secondary" asChild>
            <Link to="options/manage">
              {t("products.page.variants.addOptions")}
            </Link>
          </Button>
        }
      >
        <span className="text-ui-fg-muted">
          {t("products.page.variants.oneVersionHint")}
        </span>
      </FactRow>
    </Container>
  )
}

const FactRow = ({
  label,
  action,
  children,
}: {
  label: string
  action?: ReactNode
  children: ReactNode
}) => (
  <div className="grid grid-cols-[120px_minmax(0,1fr)_auto] items-center gap-x-4 px-6 py-3 md:grid-cols-[140px_minmax(0,1fr)_auto]">
    <Text
      size="small"
      leading="compact"
      weight="plus"
      className="text-ui-fg-subtle"
    >
      {label}
    </Text>
    <Text size="small" leading="compact" className="tabular-nums" asChild>
      <div>{children}</div>
    </Text>
    <div>{action}</div>
  </div>
)
