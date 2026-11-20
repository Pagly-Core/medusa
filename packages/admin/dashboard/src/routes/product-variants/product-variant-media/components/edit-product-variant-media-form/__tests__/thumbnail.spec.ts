import { describe, expect, it } from "vitest"

import { keptThumbnail } from "../thumbnail"

const A = "http://localhost:9000/static/1-a.png"
const B = "http://localhost:9000/static/1-b.png"

const images = [
  { id: "img_a", url: A },
  { id: "img_b", url: B },
]

describe("keptThumbnail", () => {
  it("keeps a thumbnail that is one of the variant's photos", () => {
    expect(keptThumbnail(A, ["img_a", "img_b"], images)).toBe(A)
  })

  it("drops a thumbnail whose photo the variant no longer has", () => {
    expect(keptThumbnail(A, ["img_b"], images)).toBeNull()
  })

  it("drops a thumbnail that is no photo of the product", () => {
    expect(keptThumbnail("http://cdn/other.png", ["img_a"], images)).toBeNull()
  })

  it("keeps no thumbnail as none", () => {
    expect(keptThumbnail(null, ["img_a"], images)).toBeNull()
  })
})
