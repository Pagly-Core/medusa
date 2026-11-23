const VIDEO_EXTENSION = /\.(mp4|m4v|mov|webm)$/i

/**
 * Pagly: whether a product photo's address is a video's, by its file's
 * extension, as the product module decides the main photo.
 */
export const isVideoUrl = (url: string | null | undefined): boolean => {
  if (!url) {
    return false
  }

  const path = url.split(/[?#]/)[0]

  return VIDEO_EXTENSION.test(path)
}

/**
 * Pagly: the address of a product's main photo: its first picture, past any
 * video in front of it; null when it has none.
 */
export const firstPictureUrl = (
  media: { url: string }[] | null | undefined
): string | null => (media ?? []).find((item) => !isVideoUrl(item.url))?.url ?? null
