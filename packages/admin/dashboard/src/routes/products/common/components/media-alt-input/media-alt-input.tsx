import { Input, Text, clx } from "@medusajs/ui"
import { forwardRef, type ComponentPropsWithoutRef } from "react"
import { useTranslation } from "react-i18next"

import {
  MEDIA_ALT_COUNT_FROM,
  MEDIA_ALT_MAX,
} from "../../../../../lib/media-alt"

type MediaAltInputProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "value" | "onChange" | "maxLength" | "size"
> & {
  value: string | undefined
  onChange: (value: string) => void
}

/**
 * Pagly: one photo's alt text, a single line under the photo. Shows how much
 * is left only near the limit.
 */
export const MediaAltInput = forwardRef<HTMLInputElement, MediaAltInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const { t } = useTranslation()
    const text = value ?? ""
    const label = t("products.media.altLabel")

    return (
      <div className={clx("relative", className)}>
        <Input
          {...props}
          ref={ref}
          size="small"
          value={text}
          maxLength={MEDIA_ALT_MAX}
          placeholder={label}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
          className={clx(text.length >= MEDIA_ALT_COUNT_FROM && "pr-14")}
        />
        {text.length >= MEDIA_ALT_COUNT_FROM && (
          <Text
            size="xsmall"
            leading="compact"
            className="text-ui-fg-muted pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 tabular-nums"
          >
            {`${text.length}/${MEDIA_ALT_MAX}`}
          </Text>
        )}
      </div>
    )
  }
)
MediaAltInput.displayName = "MediaAltInput"
