import { z } from "@medusajs/framework/zod"
export const pricingContextResult = z.record(z.string(), z.any()).optional()
// Pagly: per-line add-on amounts (Personalización), one per item, in the cart currency.
export const unitPriceAdditionsResult = z
  .array(z.number().finite().nonnegative())
  .optional()
export const shippingOptionsContextResult = z.record(z.string(), z.any()).optional()
export const promotionContextResult = z.record(z.string(), z.any()).optional()
export const taxLineContextResult = z.record(z.string(), z.any()).optional()
export const calculatedShippingPricingContextResult = z
  .record(z.string(), z.any())
  .optional()
