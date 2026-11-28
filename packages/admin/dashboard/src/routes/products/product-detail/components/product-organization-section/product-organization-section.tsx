import { HttpTypes } from "@medusajs/types"
import { Badge, Container } from "@medusajs/ui"
import { ComponentType } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { useExtension } from "../../../../../providers/extension-provider"
import { CardHeading, CardNote, CardRow } from "../card-parts"

/** What a plugin part in `product.details.organization` receives: it renders rows. */
type OrganizationPartProps = { data: HttpTypes.AdminProduct }

/**
 * Pagly: Organización. The plugin rows first (collections), then category,
 * type and tags, each only when it has something; one pencil edits them.
 */
export const ProductOrganizationSection = ({
  product,
}: {
  product: HttpTypes.AdminProduct
}) => {
  const { t } = useTranslation()
  const { getWidgets } = useExtension()
  const parts = getWidgets(
    "product.details.organization" as any
  ) as ComponentType<OrganizationPartProps>[]

  const categories = product.categories ?? []
  const tags = product.tags ?? []
  const empty = !categories.length && !product.type && !tags.length

  return (
    <Container className="divide-y p-0">
      <CardHeading
        title={t("products.page.organization.title")}
        editTo="organization"
        editLabel={t("products.page.organization.edit")}
      />
      {parts.map((Part, index) => (
        <Part key={index} data={product} />
      ))}
      {categories.length > 0 && (
        <CardRow label={t("products.page.organization.category")} top>
          <Chips>
            {categories.map((category) => (
              <Chip key={category.id} to={`/categories/${category.id}`}>
                {category.name}
              </Chip>
            ))}
          </Chips>
        </CardRow>
      )}
      {/* Pagly: the product type, not the generic Tipo */}
      {product.type && (
        <CardRow label={t("products.fields.type.label")}>
          <Chip to={`/product-types/${product.type_id}`}>
            {product.type.value}
          </Chip>
        </CardRow>
      )}
      {tags.length > 0 && (
        <CardRow label={t("fields.tags")} top>
          <Chips>
            {tags.map((tag) => (
              <Chip key={tag.id} to={`/product-tags/${tag.id}`}>
                {tag.value}
              </Chip>
            ))}
          </Chips>
        </CardRow>
      )}
      {empty && <CardNote>{t("products.page.organization.empty")}</CardNote>}
    </Container>
  )
}

const Chips = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-wrap gap-1.5">{children}</div>
)

const Chip = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Badge
    size="2xsmall"
    className="transition-fg hover:bg-ui-bg-component-hover"
    asChild
  >
    <Link to={to}>{children}</Link>
  </Badge>
)
