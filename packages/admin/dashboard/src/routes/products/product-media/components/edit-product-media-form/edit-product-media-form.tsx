import {
  defaultDropAnimationSideEffects,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DropAnimation,
  KeyboardSensor,
  PointerSensor,
  UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { zodResolver } from "@hookform/resolvers/zod"
import { ThumbnailBadge } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Button, Checkbox, clx, CommandBar, toast, Tooltip } from "@medusajs/ui"
import { Fragment, ReactNode, useCallback, useEffect, useState } from "react"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { z } from "zod"

import {
  RouteFocusModal,
  useRouteModal,
} from "../../../../../components/modals"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import { useUpdateProduct } from "../../../../../hooks/api/products"
import { sdk } from "../../../../../lib/client"
import { saveChangedAlts, useMediaAlts } from "../../../../../lib/media-alt"
import { MediaAltInput } from "../../../common/components/media-alt-input"
import { UploadMediaFormItem } from "../../../common/components/upload-media-form-item"
import {
  EditProductMediaSchema,
  MediaSchema,
} from "../../../product-create/constants"
import { EditProductMediaSchemaType } from "../../../product-create/types"

type ProductMediaViewProps = {
  product: HttpTypes.AdminProduct
}

type Media = z.infer<typeof MediaSchema>

export const EditProductMediaForm = ({ product }: ProductMediaViewProps) => {
  const [selection, setSelection] = useState<Record<string, true>>({})
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()

  const form = useForm<EditProductMediaSchemaType>({
    defaultValues: {
      media: getDefaultValues(product.images, product.thumbnail),
    },
    resolver: zodResolver(EditProductMediaSchema),
  })

  const { fields, append, remove, update, move } = useFieldArray({
    name: "media",
    control: form.control,
    keyName: "field_id",
  })

  // Pagly: each stored photo's words in the media library fill its alt
  // field once; a field the merchant already touched is left as it is.
  const media = form.watch("media")
  const { enabled: altEnabled, alts } = useMediaAlts(
    media.map((m) => (m.file ? null : m.url))
  )

  useEffect(() => {
    form.getValues("media").forEach((m, index) => {
      const known = m.file ? undefined : alts[m.url]

      if (m.alt === undefined && typeof known === "string") {
        form.setValue(`media.${index}.alt`, known)
      }
    })
  }, [alts, form])

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = fields.findIndex((item) => item.field_id === active.id)
      const newIndex = fields.findIndex((item) => item.field_id === over?.id)

      // Pagly: `move` keeps each photo's current values (its alt among
      // them); the field list only holds them as they were added.
      move(oldIndex, newIndex)
    }
  }

  const handleDragCancel = () => {
    setActiveId(null)
  }

  const { mutateAsync, isPending } = useUpdateProduct(product.id!)

  const handleSubmit = form.handleSubmit(async ({ media }) => {
    const filesToUpload = media
      .map((m, i) => ({ file: m.file, index: i }))
      .filter((m) => !!m.file)

    let uploaded: HttpTypes.AdminFile[] = []

    if (filesToUpload.length) {
      const { files: uploads } = await sdk.admin.upload
        .create({ files: filesToUpload.map((m) => m.file) })
        .catch(() => {
          form.setError("media", {
            type: "invalid_file",
            message: t("products.media.failedToUpload"),
          })
          return { files: [] }
        })
      uploaded = uploads
    }

    const withUpdatedUrls = media.map((entry, i) => {
      const toUploadIndex = filesToUpload.findIndex((m) => m.index === i)
      if (toUploadIndex > -1) {
        return { ...entry, url: uploaded[toUploadIndex]?.url }
      }
      return entry
    })

    const thumbnail = withUpdatedUrls.find((m) => m.isThumbnail)?.url

    try {
      await mutateAsync({
        images: withUpdatedUrls.map((file) => ({ url: file.url, id: file.id })),
        thumbnail: thumbnail || null,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
      return
    }

    // Pagly: the photos' words go to the media library once the product
    // holds the photos; the product stays saved if they fail.
    await saveChangedAlts(withUpdatedUrls).catch(() => {
      toast.error(t("products.media.altFailedToast"))
    })

    toast.success(t("products.media.successToast"))
    handleSuccess()
  })

  const handleCheckedChange = useCallback(
    (id: string) => {
      return (val: boolean) => {
        if (!val) {
          const { [id]: _, ...rest } = selection
          setSelection(rest)
        } else {
          setSelection((prev) => ({ ...prev, [id]: true }))
        }
      }
    },
    [selection]
  )

  const handleDelete = () => {
    const ids = Object.keys(selection)
    const indices = ids.map((id) => fields.findIndex((m) => m.id === id))

    remove(indices)
    setSelection({})
  }

  const handlePromoteToThumbnail = () => {
    const ids = Object.keys(selection)

    if (!ids.length) {
      return
    }

    const currentThumbnailIndex = fields.findIndex((m) => m.isThumbnail)

    if (currentThumbnailIndex > -1) {
      update(currentThumbnailIndex, {
        ...form.getValues(`media.${currentThumbnailIndex}`),
        isThumbnail: false,
      })
    }

    const index = fields.findIndex((m) => m.id === ids[0])

    update(index, {
      ...form.getValues(`media.${index}`),
      isThumbnail: true,
    })

    setSelection({})
  }

  const selectionCount = Object.keys(selection).length

  return (
    <RouteFocusModal.Form blockSearchParams form={form}>
      <KeyboundForm
        className="flex size-full flex-col overflow-hidden"
        onSubmit={handleSubmit}
      >
        <RouteFocusModal.Header>
          <div className="flex items-center justify-end gap-x-2">
            <Button variant="secondary" size="small" asChild>
              <Link to={{ pathname: ".", search: undefined }}>
                {t("products.media.galleryLabel")}
              </Link>
            </Button>
          </div>
        </RouteFocusModal.Header>
        <RouteFocusModal.Body className="flex flex-col overflow-hidden">
          <div className="flex size-full flex-col-reverse lg:grid lg:grid-cols-[1fr_560px]">
            <DndContext
              sensors={sensors}
              onDragEnd={handleDragEnd}
              onDragStart={handleDragStart}
              onDragCancel={handleDragCancel}
            >
              <div className="bg-ui-bg-subtle size-full overflow-auto">
                <div className="grid h-fit auto-rows-auto grid-cols-4 gap-6 p-6">
                  <SortableContext
                    items={fields.map((m) => m.field_id)}
                    strategy={rectSortingStrategy}
                  >
                    {fields.map((m, index) => {
                      return (
                        <MediaGridItem
                          onCheckedChange={handleCheckedChange(m.id!)}
                          checked={!!selection[m.id!]}
                          key={m.field_id}
                          media={m}
                          alt={media[index]?.alt ?? alts[m.url] ?? undefined}
                          altField={
                            altEnabled && (!!m.file || m.url in alts) ? (
                              <Controller
                                control={form.control}
                                name={`media.${index}.alt`}
                                // The library's words when the field mounts
                                // after they are read.
                                defaultValue={
                                  m.file ? undefined : alts[m.url] ?? undefined
                                }
                                render={({
                                  field: { value, onChange, onBlur, ref, name },
                                }) => (
                                  <MediaAltInput
                                    ref={ref}
                                    name={name}
                                    value={value}
                                    onBlur={onBlur}
                                    onChange={onChange}
                                  />
                                )}
                              />
                            ) : null
                          }
                        />
                      )
                    })}
                  </SortableContext>
                  <DragOverlay dropAnimation={dropAnimationConfig}>
                    {activeId ? (
                      <MediaGridItemOverlay
                        media={fields.find((m) => m.field_id === activeId)!}
                        alt={
                          media[
                            fields.findIndex((m) => m.field_id === activeId)
                          ]?.alt
                        }
                        checked={
                          !!selection[
                            fields.find((m) => m.field_id === activeId)!.id!
                          ]
                        }
                      />
                    ) : null}
                  </DragOverlay>
                </div>
              </div>
            </DndContext>
            <div className="bg-ui-bg-base overflow-auto border-b px-6 py-4 lg:border-b-0 lg:border-l">
              <UploadMediaFormItem form={form} append={append} />
            </div>
          </div>
        </RouteFocusModal.Body>
        <CommandBar open={!!selectionCount}>
          <CommandBar.Bar>
            <CommandBar.Value>
              {t("general.countSelected", {
                count: selectionCount,
              })}
            </CommandBar.Value>
            <CommandBar.Seperator />
            {selectionCount === 1 && (
              <Fragment>
                <CommandBar.Command
                  action={handlePromoteToThumbnail}
                  label={t("products.media.makeThumbnail")}
                  shortcut="t"
                />
                <CommandBar.Seperator />
              </Fragment>
            )}
            <CommandBar.Command
              action={handleDelete}
              label={t("actions.delete")}
              shortcut="d"
            />
          </CommandBar.Bar>
        </CommandBar>
        <RouteFocusModal.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteFocusModal.Close asChild>
              <Button variant="secondary" size="small">
                {t("actions.cancel")}
              </Button>
            </RouteFocusModal.Close>
            <Button size="small" type="submit" isLoading={isPending}>
              {t("actions.save")}
            </Button>
          </div>
        </RouteFocusModal.Footer>
      </KeyboundForm>
    </RouteFocusModal.Form>
  )
}

const getDefaultValues = (
  images: HttpTypes.AdminProductImage[] | null | undefined,
  thumbnail: string | null | undefined
) => {
  const media: Media[] =
    images?.map((image) => ({
      id: image.id!,
      url: image.url!,
      isThumbnail: image.url === thumbnail,
      file: null,
    })) || []

  if (thumbnail && !media.some((mediaItem) => mediaItem.url === thumbnail)) {
    const id = Math.random().toString(36).substring(7)

    media.unshift({
      id: id,
      url: thumbnail,
      isThumbnail: true,
      file: null,
    })
  }

  return media
}

interface MediaView {
  id?: string
  field_id: string
  url: string
  isThumbnail: boolean
}

const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.4",
      },
    },
  }),
}

interface MediaGridItemProps {
  media: MediaView
  checked: boolean
  onCheckedChange: (value: boolean) => void
  /** Pagly: the photo's words, read by screen readers. */
  alt?: string
  /** Pagly: the photo's alt field, under it, when the store keeps alt text. */
  altField?: ReactNode
}

const MediaGridItem = ({
  media,
  checked,
  onCheckedChange,
  alt,
  altField,
}: MediaGridItemProps) => {
  const { t } = useTranslation()

  const handleToggle = useCallback(
    (value: boolean) => {
      onCheckedChange(value)
    },
    [onCheckedChange]
  )

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: media.field_id })

  const style = {
    opacity: isDragging ? 0.4 : undefined,
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div className="flex flex-col gap-y-2" style={style} ref={setNodeRef}>
      <div
        className={clx(
          "shadow-elevation-card-rest hover:shadow-elevation-card-hover focus-visible:shadow-borders-focus bg-ui-bg-subtle-hover group relative aspect-square h-auto max-w-full overflow-hidden rounded-lg outline-none"
        )}
      >
        {media.isThumbnail && (
          <div className="absolute left-2 top-2">
            <Tooltip content={t("products.media.thumbnailTooltip")}>
              <ThumbnailBadge />
            </Tooltip>
          </div>
        )}
        <div
          className={clx(
            "absolute inset-0 cursor-grab touch-none outline-none",
            {
              "cursor-grabbing": isDragging,
            }
          )}
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
        />
        <div
          className={clx("transition-fg absolute right-2 top-2 opacity-0", {
            "group-focus-within:opacity-100 group-hover:opacity-100 group-focus:opacity-100":
              !isDragging && !checked,
            "opacity-100": checked,
          })}
        >
          <Checkbox
            onClick={(e) => {
              e.stopPropagation()
            }}
            checked={checked}
            onCheckedChange={handleToggle}
          />
        </div>
        <img
          src={media.url}
          alt={alt?.trim() ?? ""}
          className="size-full object-cover object-center"
        />
      </div>
      {altField}
    </div>
  )
}

export const MediaGridItemOverlay = ({
  media,
  checked,
  alt,
}: {
  media: MediaView
  checked: boolean
  alt?: string
}) => {
  return (
    <div className="shadow-elevation-card-rest hover:shadow-elevation-card-hover focus-visible:shadow-borders-focus bg-ui-bg-subtle-hover group relative aspect-square h-auto max-w-full cursor-grabbing overflow-hidden rounded-lg outline-none">
      {media.isThumbnail && (
        <div className="absolute left-2 top-2">
          <ThumbnailBadge />
        </div>
      )}
      <div
        className={clx("transition-fg absolute right-2 top-2 opacity-0", {
          "opacity-100": checked,
        })}
      >
        <Checkbox checked={checked} />
      </div>
      <img
        src={media.url}
        alt={alt?.trim() ?? ""}
        className="size-full object-cover object-center"
      />
    </div>
  )
}
