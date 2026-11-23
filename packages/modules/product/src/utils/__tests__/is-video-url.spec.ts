import { isVideoUrl } from "../is-video-url"

describe("isVideoUrl", () => {
  it("knows a video by its file's extension", () => {
    for (const url of [
      "https://cdn.example/tenants/t/01J-clip.mp4",
      "https://cdn.example/a/IMG_0042.MOV",
      "https://cdn.example/a/b.webm",
      "https://cdn.example/a/b.m4v?v=2",
      "/static/1760-clip.mp4#t=1",
    ]) {
      expect(isVideoUrl(url)).toBe(true)
    }
  })

  it("leaves pictures and anything else alone", () => {
    for (const url of [
      "https://cdn.example/a.jpg",
      "https://cdn.example/mp4/a.png",
      "https://cdn.example/a.mp4.png",
      "https://cdn.example/video",
      "",
      null,
      undefined,
    ]) {
      expect(isVideoUrl(url)).toBe(false)
    }
  })
})
