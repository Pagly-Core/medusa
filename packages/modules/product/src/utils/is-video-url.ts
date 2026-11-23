const VIDEO_EXTENSION = /\.(mp4|m4v|mov|webm)$/i

/**
 * Pagly: whether a product photo's address is a video's, by its file's
 * extension. The store's media library keeps each upload's extension, and
 * serves a QuickTime video as MP4 under its own `.mov` name.
 */
export const isVideoUrl = (url: string | null | undefined): boolean => {
  if (!url) {
    return false
  }

  const path = url.split(/[?#]/)[0]

  return VIDEO_EXTENSION.test(path)
}
