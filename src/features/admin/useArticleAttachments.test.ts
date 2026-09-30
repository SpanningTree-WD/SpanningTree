import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Attachment } from '../../models/common'
import type { UploadRequest } from '../../services/uploads/uploadTypes'
const mock = vi.hoisted(() => ({
  queue: vi.fn(),
  cancel: vi.fn(),
  wait: vi.fn(),
  watch: vi.fn(),
  unsubscribe: vi.fn(),
  createUrl: vi.fn(),
  revokeUrl: vi.fn(),
}))
vi.mock('../../services/uploads/GitHubUploadService', () => ({
  queueGitHubUpload: mock.queue,
  cancelUpload: mock.cancel,
  waitForUpload: mock.wait,
  watchUpload: mock.watch,
  UploadWaitError: class UploadWaitError extends Error {
    readonly restart: boolean
    constructor(message: string, restart: boolean) {
      super(message)
      this.restart = restart
    }
  },
}))
import { UploadWaitError } from '../../services/uploads/GitHubUploadService'
import { useArticleAttachments, type AttachmentRecord } from './useArticleAttachments'

const imageUrl = '/uploads/' + 'a'.repeat(64) + '.png'
const pdfUrl = '/uploads/' + 'b'.repeat(64) + '.pdf'
const oldUrl = '/uploads/' + 'c'.repeat(64) + '.pdf'
const image = () => new File(['image bytes'], 'cover.png', { type: 'image/png' })
const pdf = (name = 'notes.pdf') => new File(['%PDF-1.4'], name, { type: 'application/pdf' })
const original = (): AttachmentRecord => ({
  id: 'article-a',
  coverImage: { alt: 'Original cover', variant: 'a', url: imageUrl },
  attachments: [{
    label: 'Shared notes', fileName: 'shared.pdf', mediaType: 'application/pdf',
    sizeLabel: '1 MB', url: oldUrl,
  }],
})
function completed(uploadId: string, url = pdfUrl): UploadRequest & { url: string } {
  return {
    uploadId, ownerId: 'editor', collection: 'activities', recordId: 'article-a',
    fileName: 'notes.pdf', mediaType: 'application/pdf', size: 8, sha256: 'b'.repeat(64),
    chunkCount: 1, state: 'complete', publicConsent: true, url,
  }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}
beforeEach(() => {
  vi.resetAllMocks()
  mock.cancel.mockResolvedValue(undefined)
  mock.queue.mockResolvedValue({ uploadId: 'first-request', trigger: 'requested' })
  mock.wait.mockResolvedValue(completed('first-request'))
  mock.watch.mockImplementation(() => mock.unsubscribe)
  mock.createUrl.mockReturnValue('blob:cover-preview')
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = mock.createUrl
    static revokeObjectURL = mock.revokeUrl
  })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('stages files for this editor without queueing or changing the saved article', () => {
  const onChange = vi.fn(), saved = original(), originalFile = image()
  const { result } = renderHook(() => useArticleAttachments('activities', 'a', onChange))
  act(() => result.current.stage(originalFile))
  expect(result.current.items[0]).toMatchObject({ file: originalFile, state: 'selected' })
  expect(result.current.items[0].file).toBe(originalFile)
  expect(result.current.imagePreviewUrl).toBe('blob:cover-preview')
  expect(mock.createUrl).toHaveBeenCalledWith(originalFile)
  expect(mock.queue).not.toHaveBeenCalled()
  expect(mock.wait).not.toHaveBeenCalled()
  expect(saved).toEqual(original())
  expect(onChange).toHaveBeenCalledTimes(1)
  act(() => result.current.remove(result.current.items[0].id))
  expect(result.current.items).toEqual([])
  expect(mock.revokeUrl).toHaveBeenCalledWith('blob:cover-preview')
  expect(mock.queue).not.toHaveBeenCalled()
})
it('sends only the saved article identity and returns completed references without mutating shared originals', async () => {
  const saved = original(), originalFile = pdf()
  const anotherArticle = { ...saved, id: 'article-b' }
  Object.freeze(saved.coverImage)
  Object.freeze(saved.attachments![0])
  Object.freeze(saved.attachments)
  Object.freeze(saved)
  const { result } = renderHook(() => useArticleAttachments('activities', 'a', vi.fn()))
  const controller = new AbortController()
  act(() => result.current.stage(originalFile))
  let prepared!: AttachmentRecord
  await act(async () => { prepared = await result.current.prepare(saved, controller.signal) })
  expect(mock.queue).toHaveBeenCalledWith(
    originalFile, 'activities', 'article-a', expect.any(Function), controller.signal
  )
  expect(mock.wait).toHaveBeenCalledWith(
    { collection: 'activities', recordId: 'article-a' }, 'first-request', controller.signal
  )
  expect(prepared.attachments).toHaveLength(2)
  expect(prepared.attachments![1]).toMatchObject({ fileName: 'notes.pdf', url: pdfUrl })
  expect(saved).toEqual(original())
  expect(anotherArticle.attachments).toEqual(original().attachments)
  expect(result.current.items[0].file).toBe(originalFile)
  expect(result.current.items[0].state).toBe('ready')
  expect(mock.unsubscribe).toHaveBeenCalledTimes(1)
})
it('keeps the original File and starts a fresh request when a terminal attachment fails', async () => {
  const originalFile = pdf()
  mock.queue
    .mockResolvedValueOnce({ uploadId: 'failed-request', trigger: 'requested' })
    .mockResolvedValueOnce({ uploadId: 'retry-request', trigger: 'requested' })
  mock.wait
    .mockRejectedValueOnce(new UploadWaitError('validation failed', true))
    .mockResolvedValueOnce(completed('retry-request'))
  const { result } = renderHook(() => useArticleAttachments('activities', 'a', vi.fn()))
  const signal = new AbortController().signal
  act(() => result.current.stage(originalFile))
  await act(async () => {
    await expect(result.current.prepare(original(), signal)).rejects.toBeInstanceOf(UploadWaitError)
  })
  expect(result.current.items[0]).toMatchObject({ state: 'failed', file: originalFile })
  expect(result.current.items[0].file).toBe(originalFile)
  expect(result.current.items[0].uploadId).toBeUndefined()
  await act(async () => { await result.current.prepare(original(), signal) })
  expect(mock.queue).toHaveBeenCalledTimes(2)
  expect(mock.queue.mock.calls[0][0]).toBe(originalFile)
  expect(mock.queue.mock.calls[1][0]).toBe(originalFile)
  expect(mock.wait.mock.calls.map((call) => call[1])).toEqual(['failed-request', 'retry-request'])
  expect(result.current.items[0]).toMatchObject({ state: 'ready', uploadId: 'retry-request', url: pdfUrl })
})
it('resumes the existing request after a timeout without re-uploading the selected File', async () => {
  const originalFile = pdf()
  mock.wait
    .mockRejectedValueOnce(new UploadWaitError('timed out', false))
    .mockResolvedValueOnce(completed('first-request'))
  const { result } = renderHook(() => useArticleAttachments('activities', 'a', vi.fn()))
  const signal = new AbortController().signal
  act(() => result.current.stage(originalFile))
  await act(async () => {
    await expect(result.current.prepare(original(), signal)).rejects.toBeInstanceOf(UploadWaitError)
  })
  expect(result.current.items[0]).toMatchObject({ state: 'failed', uploadId: 'first-request' })
  expect(result.current.items[0].file).toBe(originalFile)
  await act(async () => { await result.current.prepare(original(), signal) })
  expect(mock.queue).toHaveBeenCalledTimes(1)
  expect(mock.wait.mock.calls.map((call) => call[1])).toEqual(['first-request', 'first-request'])
})
it('retains completed files when a later file fails and retries only the failed file', async () => {
  const first = pdf('first.pdf'), second = pdf('second.pdf')
  const firstUrl = '/uploads/' + 'd'.repeat(64) + '.pdf'
  mock.queue
    .mockResolvedValueOnce({ uploadId: 'first', trigger: 'requested' })
    .mockResolvedValueOnce({ uploadId: 'second', trigger: 'requested' })
    .mockResolvedValueOnce({ uploadId: 'second-retry', trigger: 'requested' })
  mock.wait
    .mockResolvedValueOnce(completed('first', firstUrl))
    .mockRejectedValueOnce(new UploadWaitError('second failed', true))
    .mockResolvedValueOnce(completed('second-retry'))
  const { result } = renderHook(() => useArticleAttachments('activities', 'a', vi.fn()))
  const signal = new AbortController().signal
  act(() => { result.current.stage(first); result.current.stage(second) })
  await act(async () => {
    await expect(result.current.prepare(original(), signal)).rejects.toThrow('second failed')
  })
  expect(result.current.items.map((item) => item.state)).toEqual(['ready', 'failed'])
  let prepared!: AttachmentRecord
  await act(async () => { prepared = await result.current.prepare(original(), signal) })
  expect(mock.queue.mock.calls.map((call) => call[0])).toEqual([first, second, second])
  expect(prepared.attachments!.map((file) => file.url)).toEqual([oldUrl, firstUrl, pdfUrl])
})
it('drops the previous session and ignores its late progress and completion', async () => {
  const pending = deferred<{ uploadId: string; trigger: string }>()
  mock.queue.mockReturnValueOnce(pending.promise)
  const { result, rerender } = renderHook(
    ({ session }) => useArticleAttachments('activities', session, vi.fn()),
    { initialProps: { session: 'a' } }
  )
  act(() => result.current.stage(image()))
  let preparation!: Promise<AttachmentRecord>
  await act(async () => {
    preparation = result.current.prepare(original(), new AbortController().signal)
    await Promise.resolve()
  })
  const rejected = expect(preparation).rejects.toHaveProperty('name', 'AbortError')
  rerender({ session: 'b' })
  expect(result.current.items).toEqual([])
  expect(result.current.error).toBe('')
  expect(mock.revokeUrl).toHaveBeenCalledWith('blob:cover-preview')
  act(() => mock.queue.mock.calls[0][3](75))
  expect(result.current.items).toEqual([])
  await act(async () => {
    pending.resolve({ uploadId: 'old-request', trigger: 'requested' })
    await rejected
  })
  expect(result.current.items).toEqual([])
  expect(mock.wait).not.toHaveBeenCalled()
})
it('revokes local previews on unmount and ignores delayed request snapshots', async () => {
  const pending = deferred<UploadRequest & { url: string }>()
  mock.wait.mockReturnValueOnce(pending.promise)
  const { result, unmount } = renderHook(() => useArticleAttachments('activities', 'a', vi.fn()))
  act(() => result.current.stage(image()))
  let preparation!: Promise<AttachmentRecord>
  await act(async () => {
    preparation = result.current.prepare(original(), new AbortController().signal)
    await Promise.resolve()
  })
  const rejected = expect(preparation).rejects.toHaveProperty('name', 'AbortError')
  unmount()
  expect(mock.revokeUrl).toHaveBeenCalledWith('blob:cover-preview')
  expect(() => mock.watch.mock.calls[0][1](completed('first-request', imageUrl))).not.toThrow()
  pending.resolve(completed('first-request', imageUrl))
  await rejected
  expect(mock.unsubscribe).toHaveBeenCalledTimes(1)
})
it('replaces only the local cover or publication PDF and releases discarded previews', async () => {
  const saved = { ...original(), pdf: original().attachments![0] as Attachment }
  const { result } = renderHook(() => useArticleAttachments('publications', 'p', vi.fn()))
  const firstImage = image(), secondImage = image(), firstPdf = pdf('first.pdf'), secondPdf = pdf('second.pdf')
  act(() => {
    result.current.stage(firstImage)
    result.current.stage(firstPdf)
    result.current.stage(secondImage)
    result.current.stage(secondPdf)
  })
  expect(result.current.items.map((item) => item.file)).toEqual([secondImage, secondPdf])
  expect(mock.revokeUrl).toHaveBeenCalledTimes(1)
  expect(saved.coverImage.url).toBe(imageUrl)
  expect(saved.pdf.url).toBe(oldUrl)
  act(() => result.current.clear())
  expect(result.current.items).toEqual([])
  expect(mock.revokeUrl).toHaveBeenCalledTimes(2)
  expect(mock.queue).not.toHaveBeenCalled()
})

it.each(['remove', 'clear', 'unmount', 'session'])(
  'cancels only the exact unfinished request after a timeout when leaving by %s',
  async (action) => {
    mock.wait.mockRejectedValueOnce(new UploadWaitError('timed out', false))
    const { result, rerender, unmount } = renderHook(
      ({ session }) => useArticleAttachments('activities', session, vi.fn()),
      { initialProps: { session: 'a' } }
    )
    const originalFile = pdf(), saved = original()
    act(() => result.current.stage(originalFile))
    await act(async () => {
      await expect(result.current.prepare(saved, new AbortController().signal)).rejects.toThrow('timed out')
    })
    expect(result.current.items[0]).toMatchObject({
      state: 'failed', uploadId: 'first-request', recordId: 'article-a',
    })
    expect(mock.cancel).not.toHaveBeenCalled()
    if (action === 'unmount') unmount()
    else if (action === 'session') rerender({ session: 'b' })
    else act(() => {
      if (action === 'remove') result.current.remove(result.current.items[0].id)
      else result.current.clear()
    })
    expect(mock.cancel).toHaveBeenCalledTimes(1)
    expect(mock.cancel).toHaveBeenCalledWith({
      collection: 'activities', recordId: 'article-a', uploadId: 'first-request',
    })
    expect(saved).toEqual(original())
  }
)
it('clearing a partially prepared list cancels only unfinished work and preserves ready shared files', async () => {
  const first = pdf('first.pdf'), second = pdf('second.pdf')
  mock.queue
    .mockResolvedValueOnce({ uploadId: 'ready-request', trigger: 'requested' })
    .mockResolvedValueOnce({ uploadId: 'unfinished-request', trigger: 'requested' })
  mock.wait
    .mockResolvedValueOnce(completed('ready-request', oldUrl))
    .mockRejectedValueOnce(new UploadWaitError('offline', false))
  const saved = original(), anotherArticle = { ...saved, id: 'article-b' }
  const { result } = renderHook(() => useArticleAttachments('activities', 'a', vi.fn()))
  act(() => { result.current.stage(first); result.current.stage(second) })
  await act(async () => {
    await expect(result.current.prepare(saved, new AbortController().signal)).rejects.toThrow('offline')
  })
  act(() => result.current.clear())
  expect(mock.cancel).toHaveBeenCalledTimes(1)
  expect(mock.cancel).toHaveBeenCalledWith({
    collection: 'activities', recordId: 'article-a', uploadId: 'unfinished-request',
  })
  expect(saved.attachments).toEqual(original().attachments)
  expect(anotherArticle.attachments).toEqual(original().attachments)
  expect(result.current.items).toEqual([])
})
