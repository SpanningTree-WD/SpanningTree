import type { MediaReference } from '../../models/common'
import { isUploadUrl } from '../../services/uploads/uploadTypes'

export function ContentImage({
  media,
  className = '',
  title,
  previewUrl,
}: {
  media: MediaReference
  className?: string
  title?: string
  previewUrl?: string
}) {
  // Object URLs are an explicit editor-only input, never a saved media URL.
  const source = previewUrl?.startsWith('blob:')
    ? previewUrl
    : isUploadUrl(media.url)
      ? media.url
      : undefined
  return source ? (
    <img className={`${className} uploaded-image`} src={source} alt={media.alt} loading="lazy" />
  ) : (
    <div
      className={`${className} ${media.variant}`}
      role={title ? undefined : 'img'}
      aria-label={title ? undefined : media.alt}
    >
      {title}
    </div>
  )
}
