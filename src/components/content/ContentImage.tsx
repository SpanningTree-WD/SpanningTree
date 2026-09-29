import type { MediaReference } from '../../models/common'
import { isUploadUrl } from '../../services/uploads/uploadTypes'

export function ContentImage({
  media,
  className = '',
  title,
}: {
  media: MediaReference
  className?: string
  title?: string
}) {
  return isUploadUrl(media.url) ? (
    <img className={`${className} uploaded-image`} src={media.url} alt={media.alt} loading="lazy" />
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
