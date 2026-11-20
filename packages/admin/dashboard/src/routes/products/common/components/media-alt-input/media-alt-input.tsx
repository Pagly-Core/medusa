import { forwardRef, type ComponentPropsWithoutRef } from "react"

type MediaAltInputProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "value" | "onChange" | "maxLength"
> & {
  value: string | undefined
  onChange: (value: string) => void
}

/**
 * Pagly: one photo's alt text, a single line under the photo. Shows how much
 * is left only near the limit.
 */
export const MediaAltInput = forwardRef<HTMLInputElement, MediaAltInputProps>(
  (_props, _ref) => null
)
MediaAltInput.displayName = "MediaAltInput"
