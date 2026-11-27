type NumberedOrder = { display_id?: number | null; custom_display_id?: string | null }

/** An order's number as the merchant reads it. */
export const orderNumber = (_order?: NumberedOrder | null): string | null => null
