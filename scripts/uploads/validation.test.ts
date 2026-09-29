// @vitest-environment node
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { assembleUpload, gitBlobSha, validateRequest } from './validation'
import {
  isUploadUrl,
  MAX_IMAGE_BYTES,
  UPLOAD_CHUNK_BYTES,
  validateUpload,
  type UploadRequest,
} from '../../src/services/uploads/uploadTypes'

const bytes = Buffer.from('%PDF-1.4\nArchive test')
const request: UploadRequest = {
  uploadId: '00000000-0000-4000-8000-000000000000',
  ownerId: 'editor',
  collection: 'mathematics',
  recordId: 'saved',
  fileName: '../../index.html',
  mediaType: 'application/pdf',
  size: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex'),
  chunkCount: 1,
  state: 'queued',
  publicConsent: true,
}
const chunks = [{ id: '0', index: 0, uploadId: request.uploadId, data: bytes }]
describe('untrusted browser upload validation', () => {
  it('derives a fixed immutable path from content and never from the supplied filename', () => {
    validateRequest(request, 'editor')
    const file = assembleUpload(request, chunks)
    expect(file.path).toBe(`public/uploads/${request.sha256}.pdf`)
    expect(file.bytes).toEqual(bytes)
    expect(isUploadUrl(file.url)).toBe(true)
    expect(isUploadUrl('https://example.com/file.pdf')).toBe(false)
    expect(isUploadUrl('/uploads/../../index.html')).toBe(false)
    expect(gitBlobSha(Buffer.from('hello\n'))).toBe('ce013625030ba8dba906f756967f9e9ca394464a')
  })
  it('rejects identity, target, size, MIME and digest manipulation', () => {
    for (const patch of [
      { ownerId: 'other' },
      { collection: 'admins' },
      { recordId: '../main' },
      { size: 21 * 1024 * 1024 },
      { sha256: 'none' },
      { mediaType: 'text/html' },
      { publicConsent: false },
      { chunkCount: 100 },
    ]) {
      expect(() => validateRequest({ ...request, ...patch } as UploadRequest, 'editor')).toThrow()
    }
    expect(() => assembleUpload({ ...request, sha256: '0'.repeat(64) }, chunks)).toThrow()
    expect(() => assembleUpload({ ...request, mediaType: 'image/png' }, chunks)).toThrow()
    expect(() => validateUpload(Buffer.from('<svg>'), 'image/png')).toThrow()
    const tooLarge = Buffer.alloc(MAX_IMAGE_BYTES + 1)
    tooLarge.set([255, 216, 255])
    expect(() => validateUpload(tooLarge, 'image/jpeg')).toThrow()
  })
  it('rejects missing, duplicate, truncated and stale chunks', () => {
    for (const invalid of [
      [],
      [...chunks, ...chunks],
      [{ ...chunks[0], id: '01' }],
      [{ ...chunks[0], uploadId: 'old' }],
      [{ ...chunks[0], data: bytes.subarray(1) }],
    ]) {
      expect(() => assembleUpload(request, invalid)).toThrow()
    }
  })
  it('assembles out-of-order full chunks and a partial final chunk', () => {
    const large = Buffer.concat([bytes, Buffer.alloc(UPLOAD_CHUNK_BYTES)])
    const metadata = {
      ...request,
      size: large.length,
      chunkCount: 2,
      sha256: createHash('sha256').update(large).digest('hex'),
    }
    validateRequest(metadata, 'editor')
    const parts = [1, 0].map((index) => ({
      id: String(index),
      index,
      uploadId: request.uploadId,
      data: large.subarray(index * UPLOAD_CHUNK_BYTES, (index + 1) * UPLOAD_CHUNK_BYTES),
    }))
    expect(assembleUpload(metadata, parts).bytes).toEqual(large)
  })
})
