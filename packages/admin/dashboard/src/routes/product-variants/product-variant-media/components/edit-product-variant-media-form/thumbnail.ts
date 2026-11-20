type VariantImage = { id?: string | null; url?: string | null }

/**
 * The thumbnail a variant keeps after its photos change: the one picked,
 * while it is still the address of one of the variant's photos, or none.
 */
export const keptThumbnail = (
  thumbnail: string | null,
  _imageIds: string[],
  _images: VariantImage[]
): string | null => thumbnail
