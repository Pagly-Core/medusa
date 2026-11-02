import {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

const SUBSCRIBED = "subscribed"

/**
 * Pagly: the customers list's `email_subscribed` param filters on the email
 * marketing consent that @pagly/storefront keeps in the customer's metadata:
 * `email_marketing.state` is "subscribed" or "unsubscribed", and a customer
 * never asked has none. The conditions compile to the `->` and `->>` JSON
 * operators, which the cloud's SQL proxy allows (it refuses `jsonb_*`
 * functions).
 */
const emailSubscribedCondition = (subscribed: boolean) => {
  if (subscribed) {
    return { metadata: { email_marketing: { state: SUBSCRIBED } } }
  }

  // `->>` gives null for a missing key, and `!=` never matches null.
  return {
    $or: [
      { metadata: { email_marketing: { state: { $ne: SUBSCRIBED } } } },
      { metadata: { email_marketing: { state: null } } },
    ],
  }
}

/**
 * Runs after the query is validated: the param is not a customer field, so
 * it leaves the filters and comes back as a condition in `$and`, next to
 * the caller's own.
 */
export function applyEmailSubscribedFilter(
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  const { email_subscribed, ...filters } = req.filterableFields as Record<
    string,
    any
  >

  if (typeof email_subscribed === "boolean") {
    filters.$and = [
      ...(filters.$and ?? []),
      emailSubscribedCondition(email_subscribed),
    ]
  }

  req.filterableFields = filters
  next()
}
