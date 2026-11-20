import { useEffect, useMemo, useState } from "react"

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

export const mediaAltHook = (): MediaAltHook | undefined => {
  const hook = (globalThis as Record<string, unknown>)[MEDIA_ALT_HOOK_KEY] as
    | Partial<MediaAltHook>
    | undefined

  return typeof hook?.read === "function" && typeof hook?.save === "function"
    ? (hook as MediaAltHook)
    : undefined
}

/** Whether an address is a stored file's, not a preview of one still to upload. */
export const isStoredUrl = (url: string | undefined | null): url is string =>
  typeof url === "string" && /^https?:\/\//i.test(url)

const wordsOf = (alt: string | null | undefined): string | null =>
  typeof alt === "string" && alt.trim() ? alt.trim() : null

/**
 * The alts a form changed: entries whose field was never filled (`alt`
 * undefined) are left as they are; an emptied field clears the alt.
 */
export const changedAlts = (
  entries: { url?: string | null; alt?: string | null }[],
  known: Record<string, string | null>
): MediaAltEntry[] => {
  const last = new Map<string, string | null>()

  for (const entry of entries) {
    if (!isStoredUrl(entry.url) || entry.alt === undefined) {
      continue
    }

    last.delete(entry.url)
    last.set(entry.url, wordsOf(entry.alt))
  }

  return [...last].flatMap(([url, alt]) =>
    alt === wordsOf(known[url]) ? [] : [{ url, alt }]
  )
}

/**
 * Saves what a form changed, read against the library's current words, so a
 * field nobody touched never writes. Nothing without a registered hook.
 */
export const saveChangedAlts = async (
  entries: { url?: string | null; alt?: string | null }[]
): Promise<MediaAltEntry[]> => {
  const hook = mediaAltHook()
  const urls = [
    ...new Set(
      entries
        .filter((entry) => entry.alt !== undefined)
        .map((entry) => entry.url)
        .filter(isStoredUrl)
    ),
  ]

  if (!hook || !urls.length) {
    return []
  }

  const changed = changedAlts(entries, await hook.read(urls))

  if (changed.length) {
    await hook.save(changed)
  }

  return changed
}

/** The library's alt for each stored address, read once per address. */
export const useMediaAlts = (
  urls: (string | null | undefined)[]
): { enabled: boolean; alts: Record<string, string | null> } => {
  const hook = mediaAltHook()
  const [alts, setAlts] = useState<Record<string, string | null>>({})
  const [asked] = useState(() => new Set<string>())

  const wanted = useMemo(
    () => [...new Set(urls.filter(isStoredUrl))].sort(),
    // The list is rebuilt each render; its contents are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [urls.join("\n")]
  )

  useEffect(() => {
    const missing = wanted.filter((url) => !asked.has(url))

    if (!hook || !missing.length) {
      return
    }

    missing.forEach((url) => asked.add(url))

    let done = false
    const none = Object.fromEntries(missing.map((url) => [url, null]))

    hook
      .read(missing)
      .catch(() => ({} as Record<string, string | null>))
      .then((read) => {
        done = true
        setAlts((prev) => ({ ...prev, ...none, ...read }))
      })

    return () => {
      // A read still on its way is asked again by the next render that
      // wants it; one that answered is kept.
      if (!done) {
        missing.forEach((url) => asked.delete(url))
      }
    }
  }, [hook, wanted, asked])

  return { enabled: !!hook, alts: hook ? alts : {} }
}
