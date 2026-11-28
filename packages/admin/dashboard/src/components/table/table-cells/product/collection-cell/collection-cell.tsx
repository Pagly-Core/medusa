import { useTranslation } from "react-i18next"

import { PlaceholderCell } from "../../common/placeholder-cell"
import type { ProductCollection } from "../../../../../lib/product-collections"

type CollectionCellProps = {
  // Pagly: every collection the product is in (Pagly-Core/pagly-app#258).
  collections: ProductCollection[]
}

export const CollectionCell = ({ collections }: CollectionCellProps) => {
  if (!collections.length) {
    return <PlaceholderCell />
  }

  const titles = collections.map((collection) => collection.title).join(", ")

  return (
    <div className="flex h-full w-full items-center overflow-hidden">
      <span className="truncate" title={titles}>
        {titles}
      </span>
    </div>
  )
}

export const CollectionHeader = () => {
  const { t } = useTranslation()

  return (
    <div className="flex h-full w-full items-center">
      <span>{t("fields.collection")}</span>
    </div>
  )
}
