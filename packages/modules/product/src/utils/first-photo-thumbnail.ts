type Photo = { id?: string; url: string }

type PhotoFields = {
  images?: Photo[] | null
  thumbnail?: string | null
}

/**
 * Pagly: a product's main photo (`thumbnail`) is always its first photo.
 *
 * - Photos given: the main photo becomes the first of them, or none when
 *   there are none.
 * - A main photo given: it is moved to the front of the photos (added in
 *   front when it is not one of them), so choosing a main photo is
 *   choosing the first photo.
 * - An empty main photo next to photos means the first photo.
 * - Only the main photo given: the stored photos are reordered to match.
 *
 * Returns the input unchanged when it touches neither photos nor the main
 * photo. `storedImages` are the product's photos in order, for updates.
 */
export function firstPhotoThumbnail<T extends object>(
  input: T,
  storedImages?: Photo[]
): T {
  const fields = input as PhotoFields
  const hasImages = Array.isArray(fields.images)
  const hasThumbnail = fields.thumbnail !== undefined

  if (!hasImages && !hasThumbnail) {
    return input
  }

  let images = [...(hasImages ? fields.images! : storedImages ?? [])]
  const chosen = fields.thumbnail

  if (chosen) {
    const index = images.findIndex((image) => image.url === chosen)
    images =
      index > -1
        ? [images[index], ...images.filter((_, i) => i !== index)]
        : [{ url: chosen }, ...images]
  }

  return {
    ...input,
    images,
    thumbnail: images[0]?.url ?? null,
  }
}
