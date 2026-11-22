import { HttpTypes } from "@medusajs/types"

type OrderNextStepProps = {
  order: HttpTypes.AdminOrder
  orderPreview?: HttpTypes.AdminOrderPreview
}

// Stub for the red phase: the next-step slot comes with the build.
export const OrderNextStep = (_props: OrderNextStepProps) => null
