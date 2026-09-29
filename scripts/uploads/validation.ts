import { createHash } from 'node:crypto'
import {
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  UPLOAD_CHUNK_BYTES,
  validateUpload,
  type UploadRequest,
} from '../../src/services/uploads/uploadTypes'

export class InvalidUpload extends Error {}
export function validateRequest(request: UploadRequest, uid: string) {
  if (
    request.ownerId !== uid ||
    !/^[a-f0-9-]{36}$/.test(request.uploadId) ||
    !['activities', 'mathematics', 'publications'].includes(request.collection) ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(request.recordId) ||
    typeof request.fileName !== 'string' ||
    request.fileName.length < 1 ||
    request.fileName.length > 120 ||
    !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(request.mediaType) ||
    !Number.isInteger(request.size) ||
    request.size <= 0 ||
    request.size > (request.mediaType === 'application/pdf' ? MAX_PDF_BYTES : MAX_IMAGE_BYTES) ||
    !/^[a-f0-9]{64}$/.test(request.sha256) ||
    request.publicConsent !== true ||
    request.chunkCount !== Math.ceil(request.size / UPLOAD_CHUNK_BYTES)
  ) {
    throw new InvalidUpload('업로드 요청이 올바르지 않습니다. 파일을 다시 올려 주세요.')
  }
}
export function assembleUpload(
  request: UploadRequest,
  chunks: { id: string; uploadId: string; index: number; data: unknown }[]
) {
  if (chunks.length !== request.chunkCount)
    throw new InvalidUpload('파일 전송이 완료되지 않았습니다. 다시 올려 주세요.')
  const sorted = [...chunks].sort((a, b) => a.index - b.index)
  const parts = sorted.map((chunk, index) => {
    const size = Math.min(UPLOAD_CHUNK_BYTES, request.size - index * UPLOAD_CHUNK_BYTES)
    if (
      chunk.id !== String(index) ||
      chunk.index !== index ||
      chunk.uploadId !== request.uploadId ||
      !(chunk.data instanceof Uint8Array) ||
      chunk.data.length !== size
    ) {
      throw new InvalidUpload('파일 조각이 올바르지 않습니다. 다시 올려 주세요.')
    }
    return chunk.data
  })
  const bytes = Buffer.concat(parts)
  if (createHash('sha256').update(bytes).digest('hex') !== request.sha256)
    throw new InvalidUpload('파일 검사에 실패했습니다. 다시 올려 주세요.')
  let extension: string
  try {
    extension = validateUpload(bytes, request.mediaType)
  } catch {
    throw new InvalidUpload('JPEG·PNG·WebP 이미지 또는 PDF만 올릴 수 있습니다.')
  }
  return {
    bytes,
    path: `public/uploads/${request.sha256}.${extension}`,
    url: `/uploads/${request.sha256}.${extension}`,
  }
}
export const gitBlobSha = (bytes: Uint8Array) =>
  createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
