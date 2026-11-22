import { describe, expect, it } from "vitest"

import { imagesByRank, photosAfterDelete } from "../images-by-rank"

describe("imagesByRank", () => {
  it("lists photos by rank", () => {
    expect(
      imagesByRank([
        { id: "b", rank: 1 },
        { id: "a", rank: 0 },
      ]).map((image) => image.id)
    ).toEqual(["a", "b"])
  })
})

// Pagly: a product's main photo is always its first photo.
describe("photosAfterDelete", () => {
  const images = [
    { id: "img_b", url: "b.png", rank: 1 },
    { id: "img_a", url: "a.png", rank: 0 },
  ]

  it("keeps the rest by rank, the first as main", () => {
    expect(photosAfterDelete(images, "a.png", ["img_a"])).toEqual({
      images: [{ id: "img_b", url: "b.png" }],
      thumbnail: "b.png",
    })
  })

  it("keeps a main photo that is not one of the photos in front", () => {
    expect(photosAfterDelete(images, "t.png", ["img_b"])).toEqual({
      images: [{ url: "t.png" }, { id: "img_a", url: "a.png" }],
      thumbnail: "t.png",
    })
  })

  it("drops that main photo when it is the one deleted", () => {
    expect(
      photosAfterDelete(images, "t.png", [], { mainDeleted: true })
    ).toEqual({
      images: [
        { id: "img_a", url: "a.png" },
        { id: "img_b", url: "b.png" },
      ],
      thumbnail: "a.png",
    })
  })

  it("saves no main photo once every photo is gone", () => {
    expect(photosAfterDelete(images, null, ["img_a", "img_b"])).toEqual({
      images: [],
      thumbnail: null,
    })
  })
})
