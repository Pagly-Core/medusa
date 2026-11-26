import { PlaySolid } from "@medusajs/icons"

import { isVideoUrl } from "../../is-video-url"

/**
 * Pagly: one product photo as the admin shows it. A video is drawn as its
 * first frame, silent and still, with a play mark, so the photos list reads
 * at a glance.
 */
export const ProductMediaPreview = ({
  url,
  className,
}: {
  url: string
  className?: string
}) => {
  if (!isVideoUrl(url)) {
    return <img src={url} alt="" className={className} />
  }

  return (
    <span className="relative block size-full">
      <video
        src={url}
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
        className={className}
      />
      <PlaySolid
        data-video-mark=""
        className="text-ui-fg-on-color pointer-events-none absolute bottom-1.5 left-1.5 drop-shadow"
      />
    </span>
  )
}
