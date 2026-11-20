type VariantImage = { id?: string | null; url?: string | null }

/**
 * The thumbnail a variant keeps after its photos change: the one picked,
 * while it is still the address of one of the variant's photos, or none.
 */
export const keptThumbnail = (
  thumbnail: string | null,
  imageIds: string[],
  images: VariantImage[]
): string | null => {
  if (!thumbnail) {
    return null
  }

  const kept = new Set(imageIds)

  return images.some(
    (image) => !!image.id && kept.has(image.id) && image.url === thumbnail
  )
    ? thumbnail
    : null
}
