import { describe, expect, it } from "vitest"

import { firstPhotoIsMain, normalizeProductFormValues } from "../utils"

const base = {
  title: "Taza",
  status: "draft",
  regionsCurrencyMap: {},
  options: [],
  variants: [],
  sales_channels: [],
  enable_variants: false,
  categories: [],
  tags: [],
} as never

describe("a new product's videos", () => {
  it("makes the first picture the main photo, past a video in front", () => {
    const media = firstPhotoIsMain([
      { url: "https://cdn.x/v.mp4", isThumbnail: false },
      { url: "https://cdn.x/a.jpg", isThumbnail: false },
    ])

    expect(media.map((m) => m.isThumbnail)).toEqual([false, true])
  })

  it("keeps every photo and video in the product's photos, in the merchant's order", () => {
    const payload = normalizeProductFormValues({
      ...(base as object),
      media: [
        { url: "https://cdn.x/v.mp4", isThumbnail: false, file: null },
        { url: "https://cdn.x/a.jpg", isThumbnail: true, file: null },
      ],
    } as never)

    expect(payload.thumbnail).toBe("https://cdn.x/a.jpg")
    expect(payload.images).toEqual([{ url: "https://cdn.x/v.mp4" }, { url: "https://cdn.x/a.jpg" }])
  })
})
