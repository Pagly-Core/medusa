import {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

/**
 * Pagly: turns the customers list's `email_subscribed` query param into a
 * filter on the email marketing consent that @pagly/storefront keeps in
 * `metadata.email_marketing`. Not written yet.
 */
export function applyEmailSubscribedFilter(
  _req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  next()
}
