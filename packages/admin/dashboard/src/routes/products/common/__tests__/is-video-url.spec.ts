import { describe, expect, it } from "vitest"

import { firstPictureUrl, isVideoUrl } from "../is-video-url"
import { photosAfterDelete } from "../images-by-rank"

describe("isVideoUrl", () => {
  it("knows a video by its file's extension, a picture by anything else", () => {
    expect(isVideoUrl("https://cdn.example/clip.mp4")).toBe(true)
    expect(isVideoUrl("https://cdn.example/IMG.MOV?x=1")).toBe(true)
    expect(isVideoUrl("https://cdn.example/clip.webm")).toBe(true)
    expect(isVideoUrl("https://cdn.example/photo.jpg")).toBe(false)
    expect(isVideoUrl(null)).toBe(false)
  })
})

describe("firstPictureUrl", () => {
  it("is the first picture, past the videos", () => {
    expect(firstPictureUrl([{ url: "a.mp4" }, { url: "b.jpg" }, { url: "c.jpg" }])).toBe("b.jpg")
    expect(firstPictureUrl([{ url: "b.jpg" }])).toBe("b.jpg")
  })

  it("is null with no picture", () => {
    expect(firstPictureUrl([{ url: "a.mp4" }])).toBeNull()
    expect(firstPictureUrl([])).toBeNull()
    expect(firstPictureUrl(undefined)).toBeNull()
  })
})

describe("photosAfterDelete with a video", () => {
  it("makes the first remaining picture the main photo", () => {
    const images = [
      { id: "img_a", url: "a.jpg", rank: 0 },
      { id: "img_v", url: "v.mp4", rank: 1 },
      { id: "img_b", url: "b.jpg", rank: 2 },
    ]

    expect(photosAfterDelete(images, "a.jpg", ["img_a"])).toEqual({
      images: [
        { id: "img_v", url: "v.mp4" },
        { id: "img_b", url: "b.jpg" },
      ],
      thumbnail: "b.jpg",
    })
  })
})

describe("markMainPhoto", () => {
  it("marks the first picture as the main photo, never a video", async () => {
    const { markMainPhoto } = await import("../is-video-url")

    expect(markMainPhoto([{ url: "v.mp4" }, { url: "a.jpg" }, { url: "b.jpg" }]).map((m) => m.isThumbnail)).toEqual([
      false,
      true,
      false,
    ])
    expect(markMainPhoto([{ url: "a.jpg" }, { url: "b.jpg" }]).map((m) => m.isThumbnail)).toEqual([true, false])
    expect(markMainPhoto([{ url: "v.mp4" }]).map((m) => m.isThumbnail)).toEqual([false])
  })
})
