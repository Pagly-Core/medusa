type NumberedOrder = { display_id?: number | null; custom_display_id?: string | null }

/**
 * Pagly: an order's number as the merchant reads it. Each store numbers its own orders from 1001, in
 * `custom_display_id` (the tenancy trigger, pagly-admin-app#266): a bare number reads `#1001`, any other
 * custom id as it is. Without one, Medusa's `display_id`, a counter shared by every store, as `#1042`.
 */
export const orderNumber = (order?: NumberedOrder | null): string | null => {
  const own = order?.custom_display_id?.trim()
  if (own) {
    return /^\d+$/.test(own) ? `#${own}` : own
  }
  return order?.display_id !== undefined && order?.display_id !== null ? `#${order.display_id}` : null
}

/**
 * Pagly: a search as the order list sends it. "#8" is how the admin writes an order's number, but the
 * search matches the bare number, so a `#` before digits is dropped. Any other search is left as it is.
 */
export const orderSearchQuery = (q?: string): string | undefined => {
  const number = q?.trim().match(/^#\s*(\d+)$/)
  return number ? number[1] : q
}
