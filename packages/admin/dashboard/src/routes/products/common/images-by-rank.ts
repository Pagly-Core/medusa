/**
 * Pagly: a product's photos in the order shoppers see them. The product's
 * main photo is always the first of them.
 */
export const imagesByRank = <T extends { rank?: number | null }>(
  images: T[] | null | undefined
): T[] => [...(images ?? [])].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
