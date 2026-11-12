import {
  ArrowUpRightOnBox,
  Component,
  GlobeEurope,
  PencilSquare,
  Trash,
} from "@medusajs/icons"
import { Badge, Container, Heading, usePrompt } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { ActionMenu } from "../../../../../components/common/action-menu"
import { SectionRow } from "../../../../../components/common/section"
import { useDeleteVariant } from "../../../../../hooks/api/products"
import {
  getVariantTitle,
  isDefaultOptionValue,
} from "../../../../../lib/default-names"
import { useStorefrontHref } from "../../../../../lib/storefront"
import { useFeatureFlag } from "../../../../../providers/feature-flag-provider"
import { ExtendedVariant } from "../../constants"

type VariantGeneralSectionProps = {
  variant: ExtendedVariant
}

export function VariantGeneralSection({ variant }: VariantGeneralSectionProps) {
  const { t } = useTranslation()
  const prompt = usePrompt()
  const navigate = useNavigate()
  const isTranslationsEnabled = useFeatureFlag("translation")
  const storefrontHref = useStorefrontHref()
  const viewHref = variant.product?.handle
    ? storefrontHref(
        `/products/${encodeURIComponent(variant.product.handle)}?v_id=${
          variant.id
        }`
      )
    : undefined

  const hasInventoryKit = (variant.inventory?.length ?? 0) > 1
  // Pagly: a product's one version is headed with the product's title.
  const title = getVariantTitle(variant.title, variant.product?.title)

  const { mutateAsync } = useDeleteVariant(variant.product_id!, variant.id)

  const handleDelete = async () => {
    const res = await prompt({
      title: t("general.areYouSure"),
      description: t("products.variant.deleteWarning", {
        title,
      }),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    })

    if (!res) {
      return
    }

    await mutateAsync(undefined, {
      onSuccess: () => {
        navigate("..", { replace: true })
      },
    })
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <Heading>{title}</Heading>
            {hasInventoryKit && (
              <span className="text-ui-fg-muted font-normal">
                <Component />
              </span>
            )}
          </div>
          <span className="text-ui-fg-subtle txt-small mt-2">
            {t("labels.productVariant")}
          </span>
        </div>
        <div className="flex items-center gap-x-4">
          <ActionMenu
            groups={[
              {
                actions: [
                  {
                    label: t("actions.edit"),
                    to: "edit",
                    icon: <PencilSquare />,
                  },
                  // Pagly: open the product page with this variant selected.
                  ...(viewHref
                    ? [
                        {
                          label: t("onlineStore.view"),
                          href: viewHref,
                          icon: <ArrowUpRightOnBox />,
                          disabled: variant.product?.status !== "published",
                          disabledTooltip: t("onlineStore.unavailable.product"),
                        },
                      ]
                    : []),
                ],
              },
              ...(isTranslationsEnabled
                ? [
                    {
                      actions: [
                        {
                          label: t("translations.actions.manage"),
                          to: `/settings/translations/edit?reference=product_variant&reference_id=${variant.id}`,
                          icon: <GlobeEurope />,
                        },
                      ],
                    },
                  ]
                : []),
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
        </div>
      </div>

      <SectionRow title={t("fields.sku")} value={variant.sku} />
      {/* Pagly: no row for the default option of a one-version product. */}
      {variant.options
        ?.filter((o) => !isDefaultOptionValue(o.value))
        .map((o) => (
          <SectionRow
            key={o.id}
            title={o.option?.title!}
            value={<Badge size="2xsmall">{o.value}</Badge>}
          />
        ))}
    </Container>
  )
}
