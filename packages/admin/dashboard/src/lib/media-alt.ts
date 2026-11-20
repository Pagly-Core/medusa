/**
 * Pagly: a photo's alt text lives in the store's media library, one per
 * stored file, keyed by its address. @pagly/storefront registers the hook
 * that reads and writes it on globalThis, as it registers the media picker;
 * without one the product media screens show no alt field.
 */
export const MEDIA_ALT_HOOK_KEY = "__paglyMediaAlt"

/** The longest alt a merchant can write here: a sentence a screen reader reads whole. */
export const MEDIA_ALT_MAX = 125

/** From this length on, the field shows how much is left. */
export const MEDIA_ALT_COUNT_FROM = 100

export type MediaAltEntry = { url: string; alt: string | null }

export type MediaAltHook = {
  /** Each known address's alt; an address the library never stored is left out. */
  read: (urls: string[]) => Promise<Record<string, string | null>>
  save: (items: MediaAltEntry[]) => Promise<void>
}

export const mediaAltHook = (): MediaAltHook | undefined => undefined

/** Whether an address is a stored file's, not a preview of one still to upload. */
export const isStoredUrl = (url: string | undefined | null): url is string =>
  false

/**
 * The alts a form changed: entries whose field was never filled (`alt`
 * undefined) are left as they are; an emptied field clears the alt.
 */
export const changedAlts = (
  entries: { url?: string | null; alt?: string | null }[],
  known: Record<string, string | null>
): MediaAltEntry[] => []

/**
 * Saves what a form changed, read against the library's current words, so a
 * field nobody touched never writes. Nothing without a registered hook.
 */
export const saveChangedAlts = async (
  entries: { url?: string | null; alt?: string | null }[]
): Promise<MediaAltEntry[]> => []

/** The library's alt for each stored address, read once per address. */
export const useMediaAlts = (
  urls: (string | null | undefined)[]
): { enabled: boolean; alts: Record<string, string | null> } => ({
  enabled: false,
  alts: {},
})
