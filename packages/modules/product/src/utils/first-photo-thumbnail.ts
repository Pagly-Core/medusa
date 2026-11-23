import { isVideoUrl } from "./is-video-url"

type Photo = { id?: string; url: string; rank?: number | null }

type PhotoFields = {
  images?: Photo[] | null
  thumbnail?: string | null
}

/**
 * Pagly: a product's main photo (`thumbnail`) is always its first picture.
 * A video (`isVideoUrl`) is never the main photo: it keeps its place among
 * the photos, and the first picture after it is the main photo.
 *
 * - Photos given: the main photo becomes the first of them, or none when
 *   there are none.
 * - A main photo given: it is moved to the front of the photos (added in
 *   front when it is not one of them), so choosing a main photo is
 *   choosing the first photo.
 * - An empty main photo next to photos means the first photo.
 * - Only the main photo given: the stored photos are reordered to match.
 *
 * The photos' order is the list's, as an update stores it. With `byRank`
 * (a create, which keeps the ranks it is given) photos that carry ranks are
 * taken in rank order instead. Either way, photos that carry ranks are
 * ranked again from 0 once the main photo is in front.
 *
 * Returns the input unchanged when it touches neither photos nor the main
 * photo. `storedImages` are the product's photos in order, for updates.
 */
export function firstPhotoThumbnail<T extends object>(
  input: T,
  storedImages?: Photo[],
  { byRank = false }: { byRank?: boolean } = {}
): T {
  const fields = input as PhotoFields
  const hasImages = Array.isArray(fields.images)
  const hasThumbnail = fields.thumbnail !== undefined

  if (!hasImages && !hasThumbnail) {
    return input
  }

  let images = [...(hasImages ? fields.images! : storedImages ?? [])]
  const ranked = images.some((image) => typeof image.rank === "number")

  if (ranked && byRank) {
    images.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
  }

  // A video chosen as the main photo is not one: the first picture is.
  const chosen = isVideoUrl(fields.thumbnail) ? null : fields.thumbnail

  if (chosen) {
    const index = images.findIndex((image) => image.url === chosen)
    images =
      index > -1
        ? [images[index], ...images.filter((_, i) => i !== index)]
        : [{ url: chosen }, ...images]
  }

  if (ranked) {
    images = images.map((image, rank) => ({ ...image, rank }))
  }

  return {
    ...input,
    images,
    thumbnail: images.find((image) => !isVideoUrl(image.url))?.url ?? null,
  }
}
