import type { MediaReference } from '../../models/common'
import { isUploadUrl } from '../../services/uploads/uploadTypes'

export function contentImageSource(media: MediaReference, previewUrl?: string) {
  // Object URLs are an explicit editor-only input, never a saved media URL.
  if (previewUrl?.startsWith('blob:')) return previewUrl
  const url = media.url
  return url && isUploadUrl(url) && /\.(jpg|png|webp)$/.test(url)
    ? url
    : undefined
}
