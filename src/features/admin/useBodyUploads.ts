import { useEffect, useRef, useState } from 'react'
import type { ArticleAsset, AssetView } from '../../models/authoring'
import { cancelUpload, queueGitHubUpload, waitForUpload, watchUpload, UploadWaitError, type UploadScope } from '../../services/uploads/GitHubUploadService'
import { closeUploadSession, keepUploadSession } from '../../services/uploads/authoringSession'
import { MAX_IMAGE_BYTES, MAX_PDF_BYTES } from '../../services/uploads/uploadTypes'
import { adminErrorMessage } from './adminErrors'

interface Pending extends AssetView { file: File; uploadId?: string; controller?: AbortController }
export function useBodyUploads(scope: UploadScope, sessionKey: string, onReady: (asset: ArticleAsset) => void, onDirty: () => void) {
  const [items, setItems] = useState<Pending[]>([])
  const [error, setError] = useState('')
  const state = useRef<Pending[]>([])
  const version = useRef(0)
  const alive = useRef(false)
  const running = useRef(false)
  const callbacks = useRef({ onReady, onDirty })
  callbacks.current = { onReady, onDirty }
  function replace(next: Pending[]) { state.current = next; setItems(next) }
  const key = scope.collection + '/' + scope.recordId
  useEffect(() => {
    alive.current = true; version.current++; running.current = false
    state.current = []; setItems([]); setError('')
    return () => {
      alive.current = false; version.current++
      state.current.forEach(item => { item.controller?.abort(); if (item.previewUrl) URL.revokeObjectURL(item.previewUrl) })
      void closeUploadSession(scope).catch(() => {})
    }
    // Each article/editing visit has an independent queue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, sessionKey])
  function patch(id: string, value: Partial<Pending>) { replace(state.current.map(item => item.id === id ? { ...item, ...value } : item)) }
  async function drain() {
    if (running.current || !alive.current) return
    running.current = true
    const generation = version.current
    const valid = () => alive.current && generation === version.current
    try {
      for (;;) {
        const next = state.current.find(item => item.state === 'queued')
        if (!next || !valid()) break
        const controller = new AbortController()
        let unsubscribe: undefined | (() => void)
        patch(next.id, { state: 'uploading', controller, error: undefined, percent: 0 })
        try {
          await keepUploadSession(scope)
          if (!valid()) break
          if (controller.signal.aborted) continue
          let uploadId = next.uploadId
          if (!uploadId) {
            const result = await queueGitHubUpload(next.file, scope.collection, scope.recordId, percent => {
              if (valid() && !controller.signal.aborted) patch(next.id, { percent })
            }, controller.signal)
            uploadId = result.uploadId
          }
          if (!valid()) break
          if (controller.signal.aborted) continue
          patch(next.id, { uploadId, state: 'processing', percent: undefined })
          unsubscribe = watchUpload(scope, request => {
            if (valid() && !controller.signal.aborted && request?.uploadId === uploadId)
              patch(next.id, { state: request.state === 'failed' ? 'failed' : 'processing' })
          }, () => {})
          const result = await waitForUpload(scope, uploadId, controller.signal)
          if (!valid() || controller.signal.aborted || !state.current.some(item => item.id === next.id)) continue
          const asset: ArticleAsset = {
            id: next.id, fileName: next.file.name, size: next.file.size,
            mediaType: next.mediaType, url: result.url, alt: next.alt ?? next.file.name,
            caption: next.caption ?? '', width: next.width ?? 100, align: next.align ?? 'center',
          }
          callbacks.current.onReady(asset)
          patch(next.id, { state: 'ready', url: result.url, controller: undefined, error: undefined })
        } catch (failure) {
          if (valid() && !controller.signal.aborted) patch(next.id, {
            state: 'failed', controller: undefined, error: adminErrorMessage(failure),
            ...(failure instanceof UploadWaitError && failure.restart ? { uploadId: undefined } : {}),
          })
        } finally { unsubscribe?.() }
      }
    } finally { if (valid()) running.current = false }
  }
  function enqueue(files: File[], replacement?: ArticleAsset) {
    const added: Pending[] = [], failures: string[] = []
    for (const file of files) {
      if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) { failures.push(file.name + ': JPEG · PNG · WebP · PDF'); continue }
      if (!file.size || file.size > (file.type === 'application/pdf' ? MAX_PDF_BYTES : MAX_IMAGE_BYTES)) { failures.push(file.name + ': ' + (file.type === 'application/pdf' ? '20 MB' : '8 MB')); continue }
      added.push({ ...replacement, id: replacement?.id ?? crypto.randomUUID(), file, fileName: file.name, mediaType: file.type as ArticleAsset['mediaType'], size: file.size,
        state: 'queued', previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined })
      if (replacement) break
    }
    if (replacement && added.length) remove(replacement.id)
    replace([...state.current, ...added])
    setError(failures.length ? failures.join('\n') : '')
    if (added.length) { callbacks.current.onDirty(); void drain() }
    return added.map(item => item.id)
  }
  function remove(id: string) {
    const item = state.current.find(value => value.id === id)
    item?.controller?.abort()
    if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
    if (item?.uploadId) void cancelUpload({ ...scope, uploadId: item.uploadId }).catch(() => {})
    replace(state.current.filter(value => value.id !== id))
  }
  function retry(id: string) { patch(id, { state: 'queued', error: undefined }); void drain() }
  function clear() {
    version.current++; running.current = false
    state.current.forEach(item => { item.controller?.abort(); if (item.previewUrl) URL.revokeObjectURL(item.previewUrl) })
    replace([]); setError('')
  }
  function views(assets: ArticleAsset[] = []): AssetView[] {
    return [...assets.map(asset => {
      const pending = items.find(item => item.id === asset.id)
      return pending ? { ...asset, ...pending, ...(pending.state === 'ready' ? asset : {}) } : asset
    }), ...items.filter(item => !assets.some(asset => asset.id === item.id))]
  }
  return { items, error, enqueue, remove, retry, clear, views, hasPending: items.some(item => item.state !== 'ready') }
}
export type BodyUploads = ReturnType<typeof useBodyUploads>
