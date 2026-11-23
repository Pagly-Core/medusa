import { firstPictureUrl } from "./is-video-url"

/**
 * Pagly: a product's photos in the order shoppers see them. The product's
 * main photo is always the first of them.
 */
export const imagesByRank = <T extends { rank?: number | null }>(
  images: T[] | null | undefined
): T[] => [...(images ?? [])].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))

/**
 * Pagly: what a product keeps when some of its photos are deleted, with the
 * first one as its main photo. A main photo that is not one of the product's
 * photos (products saved before the main photo became the first photo)
 * stays in front unless it is the one deleted (`mainDeleted`).
 */
export const photosAfterDelete = (
  images:
    | { id: string; url: string; rank?: number | null }[]
    | null
    | undefined,
  thumbnail: string | null | undefined,
  deletedIds: string[],
  { mainDeleted = false }: { mainDeleted?: boolean } = {}
): { images: { id?: string; url: string }[]; thumbnail: string | null } => {
  const ranked = imagesByRank(images)
  const kept: { id?: string; url: string }[] = ranked
    .filter((image) => !deletedIds.includes(image.id))
    .map(({ id, url }) => ({ id, url }))
  const outside =
    !!thumbnail &&
    !mainDeleted &&
    !ranked.some((image) => image.url === thumbnail)

  const next = outside ? [{ url: thumbnail! }, ...kept] : kept

  return { images: next, thumbnail: firstPictureUrl(next) }
}
