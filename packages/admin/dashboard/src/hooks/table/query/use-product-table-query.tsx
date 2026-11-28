import { HttpTypes } from "@medusajs/types"
import { productCollectionFields } from "../../../lib/product-collections"
import { useQueryParams } from "../../use-query-params"

type UseProductTableQueryProps = {
  prefix?: string
  pageSize?: number
}

// Pagly: a product's collections come from productCollectionFields, which
// the plugin can register (Pagly-Core/pagly-app#258).
const defaultFields = () =>
  // TODO: Remove exclusion once we avoid including unnecessary relations by default in the query config
  `id,title,handle,status,${productCollectionFields()},*sales_channels,variants.id,thumbnail,-type,-options,-tags,-images,-variants`

export const useProductTableQuery = ({
  prefix,
  pageSize = 20,
}: UseProductTableQueryProps) => {
  const queryObject = useQueryParams(
    [
      "offset",
      "order",
      "q",
      "created_at",
      "updated_at",
      "sales_channel_id",
      "category_id",
      "collection_id",
      "is_giftcard",
      "tag_id",
      "type_id",
      "status",
      "id",
    ],
    prefix
  )

  const {
    offset,
    sales_channel_id,
    created_at,
    updated_at,
    category_id,
    collection_id,
    tag_id,
    type_id,
    is_giftcard,
    status,
    order,
    q,
  } = queryObject

  const searchParams: HttpTypes.AdminProductListParams = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    sales_channel_id: sales_channel_id?.split(","),
    created_at: created_at ? JSON.parse(created_at) : undefined,
    updated_at: updated_at ? JSON.parse(updated_at) : undefined,
    category_id: category_id?.split(","),
    collection_id: collection_id?.split(","),
    is_giftcard: is_giftcard ? is_giftcard === "true" : undefined,
    order: order,
    tag_id: tag_id ? tag_id.split(",") : undefined,
    type_id: type_id?.split(","),
    status: status?.split(",") as HttpTypes.AdminProductStatus[],
    q,
    fields: defaultFields(),
  }

  return {
    searchParams,
    raw: queryObject,
  }
}
