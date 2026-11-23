// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ProductMediaPreview } from "../product-media-preview"

describe("ProductMediaPreview", () => {
  it("draws a picture as a picture", () => {
    const { container } = render(<ProductMediaPreview url="https://cdn.example/a.jpg" className="size-full" />)

    expect(container.querySelector("img")?.getAttribute("src")).toBe("https://cdn.example/a.jpg")
    expect(container.querySelector("video")).toBeNull()
  })

  it("draws a video as its first frame, silent, with a play mark", () => {
    const { container } = render(<ProductMediaPreview url="https://cdn.example/clip.mp4" className="size-full" />)
    const video = container.querySelector("video")

    expect(container.querySelector("img")).toBeNull()
    expect(video?.getAttribute("src")).toBe("https://cdn.example/clip.mp4")
    expect(video?.muted).toBe(true)
    expect(video?.getAttribute("preload")).toBe("metadata")
    expect(video?.hasAttribute("autoplay")).toBe(false)
    expect(container.querySelector("[data-video-mark]")).not.toBeNull()
  })
})
