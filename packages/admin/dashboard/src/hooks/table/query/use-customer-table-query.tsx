import { HttpTypes } from "@medusajs/types"
import { useQueryParams } from "../../use-query-params"

type UseCustomerTableQueryProps = {
  prefix?: string
  pageSize?: number
}

/**
 * Pagly: the Email subscription filter asks for `email_marketing`, a param
 * @pagly/storefront adds to the customers list: subscribed, or unsubscribed
 * and never asked (`not_subscribed`) for not subscribed.
 */
const emailMarketingFilter = (emailSubscribed?: string) =>
  emailSubscribed
    ? {
        email_marketing:
          emailSubscribed === "true"
            ? ["subscribed"]
            : ["unsubscribed", "not_subscribed"],
      }
    : {}

export const useCustomerTableQuery = ({
  prefix,
  pageSize = 20,
}: UseCustomerTableQueryProps) => {
  const queryObject = useQueryParams(
    [
      "offset",
      "q",
      "has_account",
      // Pagly: email marketing consent, see use-customer-table-filters.
      "email_subscribed",
      "groups",
      "order",
      "created_at",
      "updated_at",
    ],
    prefix
  )

  const { offset, groups, created_at, updated_at, has_account, q, order } =
    queryObject

  const searchParams: HttpTypes.AdminCustomerFilters = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    groups: groups?.split(","),
    has_account: has_account ? has_account === "true" : undefined,
    ...emailMarketingFilter(queryObject.email_subscribed),
    order,
    created_at: created_at ? JSON.parse(created_at) : undefined,
    updated_at: updated_at ? JSON.parse(updated_at) : undefined,
    q,
  }

  return {
    searchParams,
    raw: queryObject,
  }
}
