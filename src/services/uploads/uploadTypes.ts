export const UPLOAD_CHUNK_BYTES = 512 * 1024
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024
export const MAX_PDF_BYTES = 20 * 1024 * 1024
export type UploadCollection = 'activities' | 'mathematics' | 'publications'
export type UploadConnection = 'connecting' | 'live' | 'cached' | 'error'
export type UploadState =
  'uploading' | 'queued' | 'processing' | 'committed' | 'complete' | 'cancelled' | 'failed'
export interface UploadRequest {
  uploadId: string
  ownerId: string
  collection: UploadCollection
  recordId: string
  fileName: string
  mediaType: string
  size: number
  sha256: string
  chunkCount: number
  state: UploadState
  publicConsent: true
  url?: string
  error?: string
  commit?: string
  // Read-only display timestamps, converted from Firestore in the service layer.
  createdAtMs?: number
  updatedAtMs?: number
}

export function fileExtension(bytes: Uint8Array): 'jpg' | 'png' | 'webp' | 'pdf' | null {
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpg'
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)) return 'png'
  const prefix = new TextDecoder().decode(bytes.slice(0, 12))
  if (prefix.startsWith('RIFF') && prefix.slice(8) === 'WEBP') return 'webp'
  if (prefix.startsWith('%PDF-')) return 'pdf'
  return null
}
export function validateUpload(bytes: Uint8Array, mediaType: string) {
  const extension = fileExtension(bytes)
  const types = {
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    pdf: 'application/pdf',
  }
  if (!extension || types[extension] !== mediaType)
    throw new Error('JPEG·PNG·WebP 이미지 또는 PDF 파일만 올릴 수 있습니다.')
  if (!bytes.length || bytes.length > (extension === 'pdf' ? MAX_PDF_BYTES : MAX_IMAGE_BYTES))
    throw new Error('이미지는 8MB, PDF는 20MB까지 올릴 수 있습니다.')
  return extension
}
export const isUploadActive = (state: UploadState) => !['complete', 'failed'].includes(state)
export const isUploadUrl = (url?: string) =>
  Boolean(url && /^\/uploads\/[a-f0-9]{64}\.(jpg|png|webp|pdf)$/.test(url))
export const fileSizeLabel = (size: number) => `${(size / 1024 / 1024).toFixed(1)} MB`
