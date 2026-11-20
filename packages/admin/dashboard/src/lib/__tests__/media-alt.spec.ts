// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  changedAlts,
  isStoredUrl,
  MEDIA_ALT_HOOK_KEY,
  mediaAltHook,
  saveChangedAlts,
  useMediaAlts,
  type MediaAltHook,
} from "../media-alt"

const A = "http://localhost:9000/static/1-a.png"
const B = "http://localhost:9000/static/1-b.png"

const register = (hook: Partial<MediaAltHook>) => {
  const full: MediaAltHook = {
    read: vi.fn(async () => ({})),
    save: vi.fn(async () => {}),
    ...hook,
  }
  ;(globalThis as Record<string, unknown>)[MEDIA_ALT_HOOK_KEY] = full
  return full
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>)[MEDIA_ALT_HOOK_KEY]
  vi.restoreAllMocks()
})

describe("mediaAltHook", () => {
  it("is the hook a plugin registered, or nothing", () => {
    expect(mediaAltHook()).toBeUndefined()

    const hook = register({})

    expect(mediaAltHook()).toBe(hook)
  })

  it("ignores something registered that is not a hook", () => {
    ;(globalThis as Record<string, unknown>)[MEDIA_ALT_HOOK_KEY] = { read: 1 }

    expect(mediaAltHook()).toBeUndefined()
  })
})

describe("isStoredUrl", () => {
  it("tells a stored file's address from a preview still to upload", () => {
    expect(isStoredUrl(A)).toBe(true)
    expect(isStoredUrl("blob:http://localhost/123")).toBe(false)
    expect(isStoredUrl("")).toBe(false)
    expect(isStoredUrl(undefined)).toBe(false)
  })
})

describe("changedAlts", () => {
  it("returns only the alts a field changed, trimmed", () => {
    expect(
      changedAlts(
        [
          { url: A, alt: " Taza roja de cerámica " },
          { url: B, alt: "Taza azul" },
        ],
        { [A]: "Taza", [B]: "Taza azul" }
      )
    ).toEqual([{ url: A, alt: "Taza roja de cerámica" }])
  })

  it("leaves a field nobody filled alone", () => {
    expect(
      changedAlts([{ url: A }, { url: B, alt: undefined }], { [A]: "Taza" })
    ).toEqual([])
  })

  it("clears the alt of an emptied field", () => {
    expect(changedAlts([{ url: A, alt: "  " }], { [A]: "Taza" })).toEqual([
      { url: A, alt: null },
    ])
  })

  it("writes a new photo's alt, and nothing for an empty one", () => {
    expect(
      changedAlts(
        [
          { url: A, alt: "Taza roja" },
          { url: B, alt: "" },
        ],
        {}
      )
    ).toEqual([{ url: A, alt: "Taza roja" }])
  })

  it("skips entries with no stored address and keeps one entry per address", () => {
    expect(
      changedAlts(
        [
          { url: "blob:x", alt: "Nueva" },
          { url: null, alt: "Nada" },
          { url: A, alt: "Primera" },
          { url: A, alt: "Segunda" },
        ],
        {}
      )
    ).toEqual([{ url: A, alt: "Segunda" }])
  })
})

describe("saveChangedAlts", () => {
  it("does nothing without a hook", async () => {
    await expect(saveChangedAlts([{ url: A, alt: "Taza" }])).resolves.toEqual(
      []
    )
  })

  it("reads the library's words, then saves only what changed", async () => {
    const hook = register({
      read: vi.fn(async () => ({ [A]: "Taza", [B]: "Taza azul" })),
    })

    const saved = await saveChangedAlts([
      { url: A, alt: "Taza roja" },
      { url: B, alt: "Taza azul" },
      { url: "blob:x", alt: "Nueva" },
    ])

    expect(hook.read).toHaveBeenCalledWith([A, B])
    expect(hook.save).toHaveBeenCalledWith([{ url: A, alt: "Taza roja" }])
    expect(saved).toEqual([{ url: A, alt: "Taza roja" }])
  })

  it("saves nothing when no field changed", async () => {
    const hook = register({ read: vi.fn(async () => ({ [A]: "Taza" })) })

    await saveChangedAlts([{ url: A, alt: "Taza" }, { url: B }])

    expect(hook.save).not.toHaveBeenCalled()
  })
})

describe("useMediaAlts", () => {
  it("is off and reads nothing without a hook", () => {
    const { result } = renderHook(() => useMediaAlts([A]))

    expect(result.current).toEqual({ enabled: false, alts: {} })
  })

  it("reads each stored address once and answers its alt", async () => {
    const hook = register({
      read: vi.fn(async (urls: string[]) =>
        Object.fromEntries(urls.map((url) => [url, url === A ? "Taza" : null]))
      ),
    })

    const { result, rerender } = renderHook(({ urls }) => useMediaAlts(urls), {
      initialProps: { urls: [A, "blob:x"] as (string | null)[] },
    })

    expect(result.current.enabled).toBe(true)
    await waitFor(() => expect(result.current.alts).toEqual({ [A]: "Taza" }))

    rerender({ urls: [A, B, null] })

    await waitFor(() =>
      expect(result.current.alts).toEqual({ [A]: "Taza", [B]: null })
    )
    expect(hook.read).toHaveBeenNthCalledWith(1, [A])
    expect(hook.read).toHaveBeenNthCalledWith(2, [B])
    expect(hook.read).toHaveBeenCalledTimes(2)
  })

  it("keeps the photos it could not read without words", async () => {
    register({ read: vi.fn(async () => Promise.reject(new Error("down"))) })

    const { result } = renderHook(() => useMediaAlts([A]))

    await waitFor(() => expect(result.current.alts).toEqual({ [A]: null }))
  })
})
