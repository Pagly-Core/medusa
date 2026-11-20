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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  DotsSix,
  StackPerspective,
  ThumbnailBadge,
  Trash,
  XMark,
} from "@medusajs/icons"
import { IconButton, Text } from "@medusajs/ui"
import { ReactNode, useEffect, useState } from "react"
import { Controller, useFieldArray, UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { ActionMenu } from "../../../../../../../components/common/action-menu"
import { formatFileSize } from "../../../../../../../lib/format-file-size"
import { useMediaAlts } from "../../../../../../../lib/media-alt"
import { MediaAltInput } from "../../../../../common/components/media-alt-input"
import { UploadMediaFormItem } from "../../../../../common/components/upload-media-form-item"
import { ProductCreateSchemaType } from "../../../../types"

type ProductCreateMediaSectionProps = {
  form: UseFormReturn<ProductCreateSchemaType>
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

export const ProductCreateMediaSection = ({
  form,
}: ProductCreateMediaSectionProps) => {
  const { fields, append, remove, move } = useFieldArray({
    name: "media",
    control: form.control,
    keyName: "field_id",
  })

  // Pagly: a photo picked from the media library starts with its words
  // there; a dropped file starts empty.
  const media = form.watch("media") ?? []
  const { enabled: altEnabled, alts } = useMediaAlts(
    media.map((m) => (m.file ? null : m.url))
  )

  useEffect(() => {
    ;(form.getValues("media") ?? []).forEach((m, index) => {
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

  const getOnDelete = (index: number) => {
    return () => {
      remove(index)
    }
  }

  const getMakeThumbnail = (index: number) => {
    return () => {
      const newFields = (form.getValues("media") ?? []).map((field, i) => {
        return {
          ...field,
          isThumbnail: i === index,
        }
      })

      form.setValue("media", newFields, {
        shouldDirty: true,
        shouldTouch: true,
      })
    }
  }

  const getItemHandlers = (index: number) => {
    return {
      onDelete: getOnDelete(index),
      onMakeThumbnail: getMakeThumbnail(index),
    }
  }

  return (
    <div id="media" className="flex flex-col gap-y-2">
      <UploadMediaFormItem form={form} append={append} showHint={false} />
      <DndContext
        sensors={sensors}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
      >
        <DragOverlay dropAnimation={dropAnimationConfig}>
          {activeId ? (
            <MediaGridItemOverlay
              field={fields.find((m) => m.field_id === activeId)!}
            />
          ) : null}
        </DragOverlay>
        <ul className="flex flex-col gap-y-2">
          <SortableContext items={fields.map((field) => field.field_id)}>
            {fields.map((field, index) => {
              const { onDelete, onMakeThumbnail } = getItemHandlers(index)

              return (
                <MediaItem
                  key={field.field_id}
                  field={field}
                  onDelete={onDelete}
                  onMakeThumbnail={onMakeThumbnail}
                  alt={media[index]?.alt}
                  altField={
                    altEnabled ? (
                      <Controller
                        control={form.control}
                        name={`media.${index}.alt`}
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
        </ul>
      </DndContext>
    </div>
  )
}

type MediaField = {
  isThumbnail: boolean
  url: string
  id?: string | undefined
  file?: File | null
  field_id: string
}

type MediaItemProps = {
  field: MediaField
  onDelete: () => void
  onMakeThumbnail: () => void
  /** Pagly: the photo's words, read by screen readers. */
  alt?: string
  /** Pagly: the photo's alt field, under it, when the store keeps alt text. */
  altField?: ReactNode
}

/**
 * Pagly: a photo picked from the media library has no file, only its
 * address; it is named by the address's last part.
 */
const mediaName = (field: MediaField) =>
  field.file?.name ??
  decodeURIComponent(field.url.split(/[?#]/)[0].split("/").pop() || field.url)

const MediaItem = ({
  field,
  onDelete,
  onMakeThumbnail,
  alt,
  altField,
}: MediaItemProps) => {
  const { t } = useTranslation()

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.field_id })

  const style = {
    opacity: isDragging ? 0.4 : undefined,
    transform: CSS.Translate.toString(transform),
    transition,
  }

  if (!field.file && !field.url) {
    return null
  }

  return (
    <li
      className="bg-ui-bg-component shadow-elevation-card-rest flex flex-col gap-y-2 rounded-lg px-3 py-2"
      ref={setNodeRef}
      style={style}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-2">
          <IconButton
            variant="transparent"
            type="button"
            size="small"
            {...attributes}
            {...listeners}
            ref={setActivatorNodeRef}
            className="cursor-grab touch-none active:cursor-grabbing"
          >
            <DotsSix className="text-ui-fg-muted" />
          </IconButton>
          <div className="flex items-center gap-x-3">
            <div className="bg-ui-bg-base h-10 w-[30px] overflow-hidden rounded-md">
              <ThumbnailPreview url={field.url} alt={alt} />
            </div>
            <div className="flex flex-col">
              <Text size="small" leading="compact">
                {mediaName(field)}
              </Text>
              <div className="flex items-center gap-x-1">
                {field.isThumbnail && <ThumbnailBadge />}
                {field.file && (
                  <Text
                    size="xsmall"
                    leading="compact"
                    className="text-ui-fg-subtle"
                  >
                    {formatFileSize(field.file.size)}
                  </Text>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-x-1">
          <ActionMenu
            groups={[
              {
                actions: [
                  {
                    label: t("products.media.makeThumbnail"),
                    icon: <StackPerspective />,
                    onClick: onMakeThumbnail,
                  },
                ],
              },
              {
                actions: [
                  {
                    icon: <Trash />,
                    label: t("actions.delete"),
                    onClick: onDelete,
                  },
                ],
              },
            ]}
          />
          <IconButton
            type="button"
            size="small"
            variant="transparent"
            onClick={onDelete}
          >
            <XMark />
          </IconButton>
        </div>
      </div>
      {altField}
    </li>
  )
}

const MediaGridItemOverlay = ({ field }: { field: MediaField }) => {
  return (
    <li className="bg-ui-bg-component shadow-elevation-card-rest flex items-center justify-between rounded-lg px-3 py-2">
      <div className="flex items-center gap-x-2">
        <IconButton
          variant="transparent"
          size="small"
          className="cursor-grab touch-none active:cursor-grabbing"
        >
          <DotsSix className="text-ui-fg-muted" />
        </IconButton>
        <div className="flex items-center gap-x-3">
          <div className="bg-ui-bg-base h-10 w-[30px] overflow-hidden rounded-md">
            <ThumbnailPreview url={field.url} />
          </div>
          <div className="flex flex-col">
            <Text size="small" leading="compact">
              {mediaName(field)}
            </Text>
            <div className="flex items-center gap-x-1">
              {field.isThumbnail && <ThumbnailBadge />}
              <Text
                size="xsmall"
                leading="compact"
                className="text-ui-fg-subtle"
              >
                {formatFileSize(field.file?.size ?? 0)}
              </Text>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-x-1">
        <ActionMenu groups={[]} />
        <IconButton
          type="button"
          size="small"
          variant="transparent"
          onClick={() => {}}
        >
          <XMark />
        </IconButton>
      </div>
    </li>
  )
}

const ThumbnailPreview = ({
  url,
  alt,
}: {
  url?: string | null
  alt?: string
}) => {
  if (!url) {
    return null
  }

  return (
    <img
      src={url}
      alt={alt?.trim() ?? ""}
      className="size-full object-cover object-center"
    />
  )
}
