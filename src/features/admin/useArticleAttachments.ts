import { useEffect, useRef, useState } from 'react'
import type { Attachment, MediaReference } from '../../models/common'
import {
  cancelUpload,
  queueGitHubUpload,
  waitForUpload,
  watchUpload,
  UploadWaitError,
} from '../../services/uploads/GitHubUploadService'
import {
  fileSizeLabel, MAX_IMAGE_BYTES, MAX_PDF_BYTES,
  type UploadCollection, type UploadRequest,
} from '../../services/uploads/uploadTypes'
import { adminErrorMessage } from './adminErrors'

export interface AttachmentRecord {
  id: string
  coverImage: MediaReference
  attachments?: Attachment[]
  pdf?: Attachment
}
export interface SelectedAttachment {
  id: string
  file: File
  previewUrl?: string
  state: 'selected' | 'uploading' | 'processing' | 'ready' | 'failed'
  percent?: number
  uploadId?: string
  recordId?: string
  request?: UploadRequest
  url?: string
  error?: string
}
function release(items: SelectedAttachment[], collection: UploadCollection) {
  items.forEach((item) => {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
    if (item.uploadId && item.recordId && !item.url)
      void cancelUpload({ collection, recordId: item.recordId, uploadId: item.uploadId }).catch(() => {})
  })
}

export function useArticleAttachments(
  collection: UploadCollection,
  sessionKey: string,
  onChange: () => void
) {
  const [items, setItems] = useState<SelectedAttachment[]>([])
  const [error, setError] = useState('')
  const current = useRef<SelectedAttachment[]>([])
  const generation = useRef(0)
  const active = useRef(false)

  function replace(next: SelectedAttachment[]) {
    current.current = next
    setItems(next)
  }
  useEffect(() => {
    generation.current += 1
    active.current = true
    current.current = []
    setItems([])
    setError('')
    return () => {
      active.current = false
      generation.current += 1
      release(current.current, collection)
      current.current = []
    }
  }, [sessionKey, collection])

  function clear() {
    release(current.current, collection)
    replace([])
    setError('')
  }
  function remove(id: string) {
    release(current.current.filter((item) => item.id === id), collection)
    replace(current.current.filter((item) => item.id !== id))
    onChange()
  }
  function stage(file: File) {
    const pdf = file.type === 'application/pdf'
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('JPEG, PNG, WebP 이미지 또는 PDF 파일을 선택해 주세요.')
      return
    }
    if (!file.size || file.size > (pdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES)) {
      setError('이미지는 8MB, PDF는 20MB까지 첨부할 수 있습니다.')
      return
    }
    // A cover and a publication PDF replace their prior local selection only.
    const superseded = current.current.filter((item) =>
      pdf ? collection === 'publications' && item.file.type === 'application/pdf'
        : item.file.type !== 'application/pdf'
    )
    release(superseded, collection)
    replace([
      ...current.current.filter((item) => !superseded.includes(item)),
      {
        id: crypto.randomUUID(), file, state: 'selected',
        previewUrl: pdf ? undefined : URL.createObjectURL(file),
      },
    ])
    setError('')
    onChange()
  }

  async function prepare<T extends AttachmentRecord>(record: T, signal: AbortSignal): Promise<T> {
    const version = generation.current
    const scope = { collection, recordId: record.id }
    const check = () => {
      if (signal.aborted || !active.current || version !== generation.current)
        throw new DOMException('첨부 처리를 중단했습니다.', 'AbortError')
    }
    const update = (id: string, patch: Partial<SelectedAttachment>) => {
      check()
      replace(current.current.map((item) => item.id === id ? { ...item, ...patch } : item))
    }
    for (const selected of [...current.current]) {
      check()
      if (selected.url) continue
      let uploadId = selected.uploadId
      let unsubscribe: (() => void) | undefined
      try {
        update(selected.id, { state: uploadId ? 'processing' : 'uploading', error: undefined, recordId: record.id })
        if (!uploadId) {
          const result = await queueGitHubUpload(selected.file, collection, record.id,
            (percent) => {
              if (!signal.aborted && active.current && version === generation.current)
                update(selected.id, { percent })
            }, signal)
          check()
          uploadId = result.uploadId
          update(selected.id, { uploadId, state: 'processing', percent: undefined })
        }
        const expectedId = uploadId
        unsubscribe = watchUpload(scope, (request) => {
          if (!signal.aborted && active.current && version === generation.current &&
              request?.uploadId === expectedId)
            update(selected.id, { request })
        }, () => { /* waitForUpload reports connection failures and retains retry identity. */ })
        const completed = await waitForUpload(scope, uploadId, signal)
        check()
        update(selected.id, { state: 'ready', url: completed.url, request: completed })
      } catch (failure) {
        if (!signal.aborted && active.current && version === generation.current)
          update(selected.id, {
            state: 'failed', error: adminErrorMessage(failure),
            ...(failure instanceof UploadWaitError && failure.restart ? { uploadId: undefined } : {}),
          })
        throw failure
      } finally {
        unsubscribe?.()
      }
    }
    check()
    let result = { ...record, coverImage: { ...record.coverImage } }
    for (const item of current.current) {
      if (!item.url) throw new Error('첨부 파일 처리가 완료되지 않았습니다. 다시 저장해 주세요.')
      if (item.file.type !== 'application/pdf') {
        result = { ...result, coverImage: { ...result.coverImage, url: item.url } }
      } else {
        const file: Attachment = {
          label: item.file.name, fileName: item.file.name, mediaType: 'application/pdf',
          sizeLabel: fileSizeLabel(item.file.size), url: item.url,
        }
        result = collection === 'publications'
          ? { ...result, pdf: file }
          : { ...result, attachments: [...(result.attachments ?? []).filter((old) => old.url !== file.url), file] }
      }
    }
    return result
  }
  return {
    items, error, stage, remove, clear, prepare,
    hasPending: items.length > 0,
    imagePreviewUrl: items.find((item) => item.file.type !== 'application/pdf')?.previewUrl,
  }
}
export type ArticleAttachments = ReturnType<typeof useArticleAttachments>
