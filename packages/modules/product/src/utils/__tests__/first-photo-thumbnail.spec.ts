import { firstPhotoThumbnail } from "../first-photo-thumbnail"

const a = { id: "img_a", url: "a.jpg" }
const b = { id: "img_b", url: "b.jpg" }
const c = { id: "img_c", url: "c.jpg" }

describe("firstPhotoThumbnail", () => {
  it("leaves an input that touches neither photos nor the main photo alone", () => {
    const input = { title: "Polo" }

    expect(firstPhotoThumbnail(input, [a, b])).toEqual({ title: "Polo" })
  })

  it("makes the first photo the main photo when photos are set", () => {
    expect(firstPhotoThumbnail({ images: [b, c] })).toEqual({
      images: [b, c],
      thumbnail: "b.jpg",
    })
  })

  it("fills an empty main photo from the first remaining photo", () => {
    expect(firstPhotoThumbnail({ images: [b, c], thumbnail: "" })).toEqual({
      images: [b, c],
      thumbnail: "b.jpg",
    })
    expect(firstPhotoThumbnail({ images: [b, c], thumbnail: null })).toEqual({
      images: [b, c],
      thumbnail: "b.jpg",
    })
  })

  it("moves the chosen main photo to the front", () => {
    expect(firstPhotoThumbnail({ images: [a, b, c], thumbnail: "c.jpg" })).toEqual({
      images: [c, a, b],
      thumbnail: "c.jpg",
    })
  })

  it("puts a main photo that is not among the photos in front of them", () => {
    expect(firstPhotoThumbnail({ images: [a], thumbnail: "new.jpg" })).toEqual({
      images: [{ url: "new.jpg" }, a],
      thumbnail: "new.jpg",
    })
  })

  it("clears the main photo when the last photo goes", () => {
    expect(firstPhotoThumbnail({ images: [], thumbnail: "a.jpg" })).toEqual({
      images: [],
      thumbnail: null,
    })
    expect(firstPhotoThumbnail({ images: [] })).toEqual({
      images: [],
      thumbnail: null,
    })
  })

  it("reorders the stored photos when only the main photo changes", () => {
    expect(firstPhotoThumbnail({ thumbnail: "b.jpg" }, [a, b, c])).toEqual({
      images: [b, a, c],
      thumbnail: "b.jpg",
    })
  })

  it("keeps the stored first photo as main when only the main photo is cleared", () => {
    expect(firstPhotoThumbnail({ thumbnail: null }, [a, b])).toEqual({
      images: [a, b],
      thumbnail: "a.jpg",
    })
  })

  it("adds a main photo to a product with no photos as its only photo", () => {
    expect(firstPhotoThumbnail({ thumbnail: "a.jpg" })).toEqual({
      images: [{ url: "a.jpg" }],
      thumbnail: "a.jpg",
    })
  })
})
