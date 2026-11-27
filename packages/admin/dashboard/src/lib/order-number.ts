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
