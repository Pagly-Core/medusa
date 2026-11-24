import { ProductMediaPreview } from "../../../common/components/product-media-preview/product-media-preview"
import { isVideoUrl, markMainPhoto } from "../../../common/is-video-url"
import { PencilSquare, Plus } from "@medusajs/icons"
import {
  Badge,
  Button,
  Checkbox,
  CommandBar,
  Container,
  Heading,
  IconButton,
  Text,
  clx,
  usePrompt,
} from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"
import { useUpdateProduct } from "../../../../../hooks/api/products"
import { useMediaAlts } from "../../../../../lib/media-alt"
import { imagesByRank, photosAfterDelete } from "../../../common/images-by-rank"
import { HttpTypes } from "@medusajs/types"

type ProductMedisaSectionProps = {
  product: HttpTypes.AdminProduct
}

export const ProductMediaSection = ({ product }: ProductMedisaSectionProps) => {
  const { t } = useTranslation()
  const prompt = usePrompt()
  const navigate = useNavigate()

  const [selection, setSelection] = useState<Record<string, boolean>>({})

  const media = getMedia(product)
  // Pagly: each photo's words in the media library; a photo without any is
  // marked so the merchant sees what is left to describe.
  const { enabled: altEnabled, alts } = useMediaAlts(media.map((m) => m.url))

  const handleCheckedChange = (id: string) => {
    setSelection((prev) => {
      if (prev[id]) {
        const { [id]: _, ...rest } = prev
        return rest
      } else {
        return { ...prev, [id]: true }
      }
    })
  }

  const { mutateAsync } = useUpdateProduct(product.id)

  const handleDelete = async () => {
    const ids = Object.keys(selection)
    const includingThumbnail = ids.some(
      (id) => media.find((m) => m.id === id)?.isThumbnail
    )

    const res = await prompt({
      title: t("general.areYouSure"),
      description: includingThumbnail
        ? t("products.media.deleteWarningWithThumbnail", {
            count: ids.length,
          })
        : t("products.media.deleteWarning", {
            count: ids.length,
          }),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    })

    if (!res) {
      return
    }

    // Pagly: the main photo is always the first photo; one kept apart from
    // the photos stays in front unless it is deleted.
    await mutateAsync(
      photosAfterDelete(product.images, product.thumbnail, ids, {
        mainDeleted: ids.includes(OUTSIDE_THUMBNAIL_ID),
      }),
      {
        onSuccess: () => {
          setSelection({})
        },
      }
    )
  }

  return (
    <Container className="divide-y p-0">
      {/* Pagly: Fotos, a row of tiles: the first is the main one, then one that adds more. */}
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("products.page.photos.title")}</Heading>
        <div className="flex items-center gap-x-2">
          {media.length > 0 && (
            <Text size="small" className="text-ui-fg-muted tabular-nums">
              {media.length}
            </Text>
          )}
          <IconButton size="small" variant="transparent" asChild>
            <Link to="media?view=edit" aria-label={t("actions.editImages")}>
              <PencilSquare />
            </Link>
          </IconButton>
        </div>
      </div>
      {media.length > 0 ? (
        <div className="grid grid-cols-4 gap-2 px-6 py-4 sm:grid-cols-[repeat(auto-fill,96px)]">
          {media.map((i, index) => {
            const isSelected = selection[i.id]

            return (
              <div
                className="shadow-elevation-card-rest hover:shadow-elevation-card-hover transition-fg group relative aspect-square size-full cursor-pointer overflow-hidden rounded-[8px]"
                key={i.id}
              >
                <div
                  className={clx(
                    "transition-fg invisible absolute right-2 top-2 opacity-0 group-hover:visible group-hover:opacity-100",
                    {
                      "visible opacity-100": isSelected,
                    }
                  )}
                >
                  <Checkbox
                    checked={selection[i.id] || false}
                    onCheckedChange={() => handleCheckedChange(i.id)}
                  />
                </div>
                {i.isThumbnail && (
                  <div className="pointer-events-none absolute bottom-1.5 left-1.5 z-[1]">
                    <Badge size="2xsmall" color="grey">
                      {t("products.page.photos.main")}
                    </Badge>
                  </div>
                )}
                <Link to={`media`} state={{ curr: index }}>
                  {isVideoUrl(i.url) ? (
                    <ProductMediaPreview url={i.url} className="size-full object-cover" />
                  ) : (
                    <img
                      src={i.url}
                      alt={alts[i.url]?.trim() || `${product.title} image`}
                      className="size-full object-cover"
                    />
                  )}
                </Link>
                {altEnabled && i.url in alts && !alts[i.url]?.trim() && (
                  <div className="pointer-events-none absolute left-1.5 top-1.5">
                    <Badge size="2xsmall" color="grey">
                      {t("products.media.altMissing")}
                    </Badge>
                  </div>
                )}
              </div>
            )
          })}
          <Link
            to="media?view=edit"
            className="border-ui-border-strong text-ui-fg-subtle hover:bg-ui-bg-subtle-hover txt-compact-small-plus focus-visible:shadow-borders-focus flex aspect-square flex-col items-center justify-center gap-1 rounded-[8px] border border-dashed outline-none"
          >
            <Plus />
            {t("products.page.photos.add")}
          </Link>
        </div>
      ) : (
        <div className="border-ui-border-strong mx-6 my-4 flex flex-col gap-3 rounded-lg border border-dashed px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col">
            <Text size="small" leading="compact" weight="plus">
              {t("products.page.photos.empty.title")}
            </Text>
            <Text size="small" className="text-ui-fg-subtle">
              {t("products.page.photos.empty.detail")}
            </Text>
          </div>
          <Button size="small" variant="secondary" asChild>
            <Link to="media?view=edit">
              {t("products.page.photos.empty.action")}
            </Link>
          </Button>
        </div>
      )}
      <CommandBar open={!!Object.keys(selection).length}>
        <CommandBar.Bar>
          <CommandBar.Value>
            {t("general.countSelected", {
              count: Object.keys(selection).length,
            })}
          </CommandBar.Value>
          <CommandBar.Seperator />
          <CommandBar.Command
            action={handleDelete}
            label={t("actions.delete")}
            shortcut="d"
          />
          {Object.keys(selection).length === 1 && (
            <CommandBar.Command
              action={() => {
                navigate(`images/${Object.keys(selection)[0]}/variants`)
                setSelection({})
              }}
              label={t("products.media.manageImageVariants")}
              shortcut="m"
            />
          )}
        </CommandBar.Bar>
      </CommandBar>
    </Container>
  )
}

type Media = {
  id: string
  url: string
  isThumbnail: boolean
}

const OUTSIDE_THUMBNAIL_ID = "img_thumbnail"

const getMedia = (product: HttpTypes.AdminProduct) => {
  const { images = [], thumbnail } = product

  const media: Media[] = imagesByRank(images).map((image) => ({
    id: image.id,
    url: image.url,
    isThumbnail: image.url === thumbnail,
  }))

  if (thumbnail && !media.some((mediaItem) => mediaItem.url === thumbnail)) {
    media.unshift({
      id: OUTSIDE_THUMBNAIL_ID,
      url: thumbnail,
      isThumbnail: true,
    })
  }

  // Pagly: the main photo is always the first photo.
  return markMainPhoto(media)
}
