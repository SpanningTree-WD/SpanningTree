import type { MediaReference } from '../../models/common'
import { contentImageSource } from './contentImageSource'

export function ContentImage({
  media,
  className = '',
  fallback,
  previewUrl,
}: {
  media: MediaReference
  className?: string
  fallback?: { title: string; year: string | number; category: string }
  previewUrl?: string
}) {
  const source = contentImageSource(media, previewUrl)
  return source ? (
    <img className={`${className} uploaded-image`} src={source} alt={media.alt} loading="lazy" />
  ) : fallback ? (
    <div
      className={`${className} content-cover`}
      role="img"
      aria-label={`${fallback.title} · ${fallback.category} · ${fallback.year}`}
    >
      <span className="content-cover-year">{fallback.year}</span>
      <strong className="content-cover-title">{fallback.title}</strong>
      <span className="content-cover-category">{fallback.category}</span>
    </div>
  ) : null
}
