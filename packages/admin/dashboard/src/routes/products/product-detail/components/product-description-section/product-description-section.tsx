import { HttpTypes } from "@medusajs/types"
import { Container, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { richTextToPlain } from "../../../../../components/inputs/rich-text-input"
import { useExtension } from "../../../../../providers/extension-provider"
import { CardHeading, CardRow } from "../card-parts"

/**
 * Pagly: Descripción, as the shopper reads it: the subtitle, the text, the
 * material when it has one, and the product's address in the store.
 */
export const ProductDescriptionSection = ({
  product,
}: {
  product: HttpTypes.AdminProduct
}) => {
  const { t } = useTranslation()
  const { getDisplays } = useExtension()
  const text = (richTextToPlain(product.description ?? "") ?? "").trim()

  return (
    <Container className="divide-y p-0">
      <CardHeading
        title={t("products.page.description.title")}
        editTo="edit"
        editLabel={t("products.page.description.edit")}
      />
      <div className="flex max-w-[72ch] flex-col gap-y-1.5 px-6 py-4">
        {product.subtitle && (
          <Text size="small" leading="compact" weight="plus">
            {product.subtitle}
          </Text>
        )}
        <Text size="small" className="text-ui-fg-subtle whitespace-pre-line">
          {text || t("products.page.description.empty")}
        </Text>
        <Text size="small" leading="compact" className="text-ui-fg-muted">
          {`/products/${product.handle}`}
        </Text>
      </div>
      {product.material && (
        <CardRow label={t("fields.material")}>{product.material}</CardRow>
      )}
      {getDisplays("product", "general").map((Display, index) => (
        <Display key={index} data={product} />
      ))}
    </Container>
  )
}
