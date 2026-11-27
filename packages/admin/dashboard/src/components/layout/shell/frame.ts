/**
 * Pagly: the grey the sidebars sit on, one step darker than the page's sheet
 * (`bg-ui-bg-subtle`) in both themes. A sidebar's sticky bands use it too, so
 * the list scrolls under an opaque band of the same colour.
 */
export const SHELL_FRAME_BG = "bg-[#F4F4F5] dark:bg-[#111113]"

/**
 * Pagly: the hover and open fills of a row on the frame. In light mode a step
 * darker than the frame; in dark mode between the frame (#111113) and the
 * current page's pill (`bg-ui-bg-base`, #212124), so a hovered row never looks
 * more selected than the current page.
 */
export const SHELL_FRAME_HOVER =
  "hover:bg-ui-bg-subtle-pressed dark:hover:bg-white/[0.05]"
export const SHELL_FRAME_OPEN =
  "data-[state=open]:bg-ui-bg-subtle-pressed dark:data-[state=open]:bg-white/[0.05]"
