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
    expect(firstPhotoThumbnail({ images: [], thumbnail: "" })).toEqual({
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

  it("follows the photos' own ranks on a create", () => {
    expect(
      firstPhotoThumbnail(
        {
          images: [
            { url: "a.jpg", rank: 1 },
            { url: "b.jpg", rank: 0 },
            { url: "c.jpg", rank: 2 },
          ],
        },
        undefined,
        { byRank: true }
      )
    ).toEqual({
      images: [
        { url: "b.jpg", rank: 0 },
        { url: "a.jpg", rank: 1 },
        { url: "c.jpg", rank: 2 },
      ],
      thumbnail: "b.jpg",
    })
  })

  it("keeps the list's order on an update, whatever ranks the photos carry", () => {
    expect(
      firstPhotoThumbnail({
        images: [
          { url: "c.jpg", rank: 2 },
          { url: "a.jpg", rank: 0 },
        ],
      })
    ).toEqual({
      images: [
        { url: "c.jpg", rank: 0 },
        { url: "a.jpg", rank: 1 },
      ],
      thumbnail: "c.jpg",
    })
  })

  it("ranks the photos again after the main photo moves", () => {
    expect(
      firstPhotoThumbnail({
        images: [
          { url: "a.jpg", rank: 0 },
          { url: "b.jpg", rank: 1 },
        ],
        thumbnail: "b.jpg",
      })
    ).toEqual({
      images: [
        { url: "b.jpg", rank: 0 },
        { url: "a.jpg", rank: 1 },
      ],
      thumbnail: "b.jpg",
    })
  })
})

describe("firstPhotoThumbnail with videos", () => {
  const v = { id: "img_v", url: "https://cdn.example/tenants/t/01J-clip.mp4" }

  it("makes the first picture the main photo, past a video in front", () => {
    expect(firstPhotoThumbnail({ images: [v, a, b] })).toEqual({
      images: [v, a, b],
      thumbnail: "a.jpg",
    })
  })

  it("never makes a video the main photo, and leaves it where it is", () => {
    expect(firstPhotoThumbnail({ images: [a, b, v], thumbnail: v.url })).toEqual({
      images: [a, b, v],
      thumbnail: "a.jpg",
    })
    expect(firstPhotoThumbnail({ thumbnail: v.url }, [a, v])).toEqual({
      images: [a, v],
      thumbnail: "a.jpg",
    })
  })

  it("moves a chosen picture to the first picture's place, behind the videos in front", () => {
    expect(firstPhotoThumbnail({ images: [v, a, b], thumbnail: "b.jpg" })).toEqual({
      images: [v, b, a],
      thumbnail: "b.jpg",
    })
  })

  it("keeps a video first when the main photo chosen is already the first picture", () => {
    expect(firstPhotoThumbnail({ images: [v, a, b], thumbnail: "a.jpg" })).toEqual({
      images: [v, a, b],
      thumbnail: "a.jpg",
    })
  })

  it("leaves a product with only videos without a main photo", () => {
    expect(firstPhotoThumbnail({ images: [v] })).toEqual({ images: [v], thumbnail: null })
  })
})
