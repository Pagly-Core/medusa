import { clx } from "@medusajs/ui"

type PaglyLogoProps = {
  /** "base" for the sidebar's store row, "small" for the store menu. */
  size?: "base" | "small"
  /**
   * Hidden from assistive tech, for a logo beside a name that already says
   * what the control is (the store switcher).
   */
  decorative?: boolean
}

/** The mark from `public/pagly.svg`, drawn in the current text colour. */
const MARK =
  "M171.29,104.64c-18.86,25.37-37.69,45.36-71.17,45.36-26.74-.01-48.67-21.03-49.95-47.52-1.45-27.48,20.45-51.45,47.95-52.45,28.52-1.11,52,21.69,52,49.96,0,7.9-1.83,15.37-5.1,22.01-1,2.03,1.57,3.92,3.18,2.34,7.91-7.76,15.17-17.27,22.79-27.76,2.44-3.35,3.42-7.58,2.6-11.64-6.97-34.21-37.21-59.95-73.48-59.95-41.31,0-75.01,33.47-75.01,75h0s0,162.09,0,162.09c0,6.88,5.39,12.79,12.27,12.91,7.01.13,12.74-5.52,12.74-12.5v-106.59c13.6,12.21,31.72,19.15,50,19.09,39.41,0,71.75-30.4,74.79-69.04.16-1.99-2.41-2.92-3.61-1.32Z"

/**
 * Pagly: the Pagly mark in its dark tile, where the store's initial used to be.
 */
export const PaglyLogo = ({
  size = "base",
  decorative = false,
}: PaglyLogoProps) => {
  return (
    <span
      data-pagly-logo=""
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": "Pagly" })}
      className={clx(
        "bg-ui-contrast-bg-base text-ui-fg-on-color flex flex-none items-center justify-center",
        size === "base" ? "size-9 rounded-[10px]" : "size-7 rounded-lg"
      )}
    >
      <svg
        viewBox="22 22 156 272"
        fill="currentColor"
        aria-hidden="true"
        className={size === "base" ? "h-[22px] w-[13px]" : "h-[17px] w-[10px]"}
      >
        <path d={MARK} />
      </svg>
    </span>
  )
}
