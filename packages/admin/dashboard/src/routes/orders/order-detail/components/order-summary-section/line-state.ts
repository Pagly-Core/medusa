import { HttpTypes } from "@medusajs/types"

export type LineState = {
  key: string
  color: "orange" | "blue" | "green" | "grey"
  values?: Record<string, number>
}

// Stub for the red phase: each line's state comes with the build.
export const getLineState = (
  _item: HttpTypes.AdminOrderLineItem,
  _order: HttpTypes.AdminOrder
): LineState | null => null
