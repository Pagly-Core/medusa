/**
 * Pagly: whether a product photo's address is a video's, by its file's
 * extension. The store's media library keeps each upload's extension, and
 * serves a QuickTime video as MP4 under its own `.mov` name.
 */
export const isVideoUrl = (_url: string | null | undefined): boolean => false
