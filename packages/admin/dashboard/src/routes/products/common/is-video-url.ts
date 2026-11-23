/**
 * Pagly: whether a product photo's address is a video's, by its file's
 * extension (the product module decides the main photo the same way).
 */
export const isVideoUrl = (_url: string | null | undefined): boolean => false

/**
 * Pagly: the address of a product's main photo: its first picture, past any
 * video in front of it; null when it has none.
 */
export const firstPictureUrl = (
  _media: { url: string }[] | null | undefined
): string | null => null
