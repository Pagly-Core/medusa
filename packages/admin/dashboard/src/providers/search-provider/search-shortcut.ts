/**
 * Pagly: the search shortcut as the merchant's own keyboard writes it.
 * Command on Apple computers, Ctrl everywhere else.
 */
export const searchShortcutLabel = (platform: string): string =>
  /Mac|iPhone|iPad|iPod/.test(platform) ? "⌘K" : "Ctrl K"
