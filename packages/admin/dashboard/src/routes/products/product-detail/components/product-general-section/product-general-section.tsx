import {
  ArrowUpRightOnBox,
  GlobeEurope,
  PencilSquare,
  Trash,
} from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Container, Heading, StatusBadge, toast, usePrompt } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { ActionMenu } from "../../../../../components/common/action-menu"
import { SectionRow } from "../../../../../components/common/section"
import { richTextToPlain } from "../../../../../components/inputs/rich-text-input"
import { useDeleteProduct } from "../../../../../hooks/api/products"
import { useStorefrontHref } from "../../../../../lib/storefront"
import { useExtension } from "../../../../../providers/extension-provider"
import { useFeatureFlag } from "../../../../../providers/feature-flag-provider"

const productStatusColor = (status: string) => {
  switch (status) {
    case "draft":
      return "grey"
    case "proposed":
      return "orange"
    case "published":
      return "green"
    case "rejected":
      return "red"
    default:
      return "grey"
  }
}

/**
 * Pagly: the store only shows published products that are in a sales channel.
 * A product fetched without its channels is given the benefit of the doubt.
 */
const isInStore = (
  product: Pick<HttpTypes.AdminProduct, "status" | "sales_channels">
) =>
  product.status === "published" &&
  (product.sales_channels === undefined ||
    product.sales_channels === null ||
    product.sales_channels.length > 0)

type ProductGeneralSectionProps = {
  product: HttpTypes.AdminProduct
}

export const ProductGeneralSection = ({
  product,
}: ProductGeneralSectionProps) => {
  const { t } = useTranslation()
  const prompt = usePrompt()
  const navigate = useNavigate()
  const { getDisplays } = useExtension()
  const isTranslationsEnabled = useFeatureFlag("translation")

  const displays = getDisplays("product", "general")
  const viewHref = useStorefrontHref()(
    `/products/${encodeURIComponent(product.handle)}`
  )

  const { mutateAsync } = useDeleteProduct(product.id)

  const handleDelete = async () => {
    const res = await prompt({
      title: t("general.areYouSure"),
      description: t("products.deleteWarning", {
        title: product.title,
      }),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    })

    if (!res) {
      return
    }

    await mutateAsync(undefined, {
      onSuccess: () => {
        navigate("..")
      },
      onError: (e) => {
        toast.error(t("products.toasts.delete.error.header"), {
          description: e.message,
        })
      },
    })
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading>{product.title}</Heading>
        <div className="flex items-center gap-x-4">
          <StatusBadge color={productStatusColor(product.status)}>
            {t(`products.productStatus.${product.status}`)}
          </StatusBadge>
          <ActionMenu
            groups={[
              {
                actions: [
                  {
                    label: t("actions.edit"),
                    to: "edit",
                    icon: <PencilSquare />,
                  },
                  // Pagly: open the product's page in the online store.
                  ...(viewHref
                    ? [
                        {
                          label: t("onlineStore.view"),
                          href: viewHref,
                          icon: <ArrowUpRightOnBox />,
                          disabled: !isInStore(product),
                          disabledTooltip:
                            product.status === "published"
                              ? t("onlineStore.unavailable.noSalesChannel")
                              : t("onlineStore.unavailable.product"),
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
                          to: `/settings/translations/edit?reference=product&reference_id=${product.id}`,
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

      <SectionRow
        title={t("fields.description")}
        value={richTextToPlain(product.description)}
      />
      <SectionRow title={t("fields.subtitle")} value={product.subtitle} />
      <SectionRow title={t("fields.handle")} value={`/${product.handle}`} />
      <SectionRow title={t("fields.material")} value={product.material} />
      <SectionRow
        title={t("fields.discountable")}
        value={product.discountable ? t("fields.true") : t("fields.false")}
      />
      {displays.map((Component, index) => {
        return <Component key={index} data={product} />
      })}
    </Container>
  )
}
