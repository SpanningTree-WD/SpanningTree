// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({
  data: null as Record<string, unknown> | null,
  states: [] as string[],
  trigger: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  read: vi.fn<() => Promise<void>>(),
  afterSet: vi.fn(),
  batchCommit: vi.fn<() => Promise<void>>(),
}))
vi.mock('../firebase/firebase', () => ({
  getFirebaseServices: () => ({
    auth: { currentUser: { uid: 'editor', emailVerified: true } },
    firestore: {},
  }),
}))
vi.mock('./triggerUpload', () => ({ triggerUpload: mock.trigger }))
vi.mock('firebase/firestore', () => ({
  Bytes: { fromUint8Array: (value: Uint8Array) => value },
  doc: () => ({}),
  onSnapshot: mock.subscribe,
  serverTimestamp: () => 'now',
  writeBatch: () => ({ set: vi.fn(), commit: mock.batchCommit }),
  runTransaction: async (_db: unknown, work: (transaction: object) => Promise<unknown>) =>
    work({
      get: async () => {
        await mock.read()
        const data = mock.data ? { ...mock.data } : null
        return { exists: () => Boolean(data), data: () => data }
      },
      set: (_ref: unknown, data: Record<string, unknown>) => {
        mock.data = data
        mock.states.push(String(data.state))
        mock.afterSet()
      },
      update: (_ref: unknown, data: Record<string, unknown>) => {
        mock.data = { ...mock.data, ...data }
        mock.states.push(String(data.state))
      },
    }),
}))
import {
  cancelUpload,
  queueGitHubUpload,
  UploadWaitError,
  waitForUpload,
  watchUpload,
} from './GitHubUploadService'
const scope = { collection: 'activities' as const, recordId: 'saved' }
const uploadId = '00000000-0000-4000-8000-000000000000'
const url = '/uploads/' + 'a'.repeat(64) + '.pdf'
const pdf = () => new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' })
function request(patch: Record<string, unknown> = {}) {
  return {
    ...scope, uploadId, ownerId: 'editor', state: 'queued',
    fileName: 'test.pdf', mediaType: 'application/pdf', size: 8,
    sha256: 'a'.repeat(64), chunkCount: 1, publicConsent: true,
    ...patch,
  }
}
function emit(data: Record<string, unknown> | null, fromCache = false, hasPendingWrites = false) {
  mock.subscribe.mock.calls.at(-1)![2]({
    exists: () => Boolean(data),
    data: () => data,
    metadata: { fromCache, hasPendingWrites },
  })
}
beforeEach(() => {
  mock.data = null
  mock.states = []
  vi.resetAllMocks()
  mock.read.mockResolvedValue(undefined)
  mock.batchCommit.mockResolvedValue(undefined)
  mock.trigger.mockResolvedValue('requested')
  mock.subscribe.mockImplementation(() => mock.unsubscribe)
})
afterEach(() => vi.useRealTimers())

it('keeps the queued file when immediate dispatch is unavailable and returns its identity', async () => {
  mock.trigger.mockRejectedValueOnce(new Error('Worker unavailable'))
  const result = await queueGitHubUpload(pdf(), scope.collection, scope.recordId, vi.fn())
  expect(result).toEqual({ uploadId: mock.data?.uploadId, trigger: 'scheduled' })
  expect(mock.states).toEqual(['uploading', 'queued'])
  expect(mock.data?.state).toBe('queued')
  expect(mock.trigger).toHaveBeenCalledWith(result.uploadId)
})
it('dispatches only after the final queued transaction has completed', async () => {
  mock.trigger.mockImplementationOnce(async () => {
    expect(mock.data?.state).toBe('queued')
    return 'requested'
  })
  const result = await queueGitHubUpload(pdf(), scope.collection, scope.recordId, vi.fn())
  expect(result).toEqual({ uploadId: mock.data?.uploadId, trigger: 'requested' })
})
it('reports acknowledged byte progress without rounding unfinished bytes to 100%', async () => {
  const bytes = new Uint8Array(4 * 1024 * 1024 + 1)
  bytes.set(new TextEncoder().encode('%PDF-1.4'))
  const progress = vi.fn()
  await queueGitHubUpload(
    new File([bytes], 'test.pdf', { type: 'application/pdf' }),
    scope.collection, scope.recordId, progress
  )
  expect(progress.mock.calls.map(([percent]) => percent)).toEqual([99, 100])
})
it('converts persisted timestamps and exposes cached versus server-confirmed snapshots', () => {
  const change = vi.fn(), error = vi.fn(), connection = vi.fn()
  watchUpload(scope, change, error, connection)
  expect(mock.subscribe.mock.calls[0][1]).toEqual({ includeMetadataChanges: true })
  const data = request({
    createdAt: { toMillis: () => 1000 },
    updatedAt: { toMillis: () => 2000 },
  })
  emit(data, true)
  expect(change).toHaveBeenLastCalledWith({
    ...request(), createdAtMs: 1000, updatedAtMs: 2000,
  })
  expect(connection).toHaveBeenLastCalledWith('cached')
  emit(data)
  expect(connection).toHaveBeenLastCalledWith('live')
  const denied = new Error('permission-denied')
  mock.subscribe.mock.calls[0][3](denied)
  expect(connection).toHaveBeenLastCalledWith('error')
  expect(error).toHaveBeenCalledWith(denied)
})
it('does not expose another article or collection through a scoped subscription', () => {
  const change = vi.fn()
  watchUpload(scope, change, vi.fn())
  emit(request())
  expect(change.mock.calls.at(-1)![0]).toMatchObject(scope)
  emit(request({ recordId: 'other-article' }))
  expect(change).toHaveBeenLastCalledWith(null)
  emit(request({ collection: 'mathematics' }))
  expect(change).toHaveBeenLastCalledWith(null)
  emit(null)
  expect(change).toHaveBeenLastCalledWith(null)
})
it.each([
  { collection: 'mathematics' as const, recordId: 'saved', uploadId },
  { ...scope, recordId: 'other-article', uploadId },
  { ...scope, uploadId: 'new-request' },
])('cannot cancel a different article or replaced request: %j', async (identity) => {
  mock.data = request()
  await cancelUpload(identity)
  expect(mock.states).toEqual([])
  expect(mock.data.state).toBe('queued')
})
it('checks cancellation identity inside the transaction after another request replaces the snapshot', async () => {
  mock.data = request()
  mock.read.mockImplementationOnce(async () => {
    mock.data = request({ recordId: 'other-article', uploadId: 'replacement' })
  })
  await cancelUpload({ ...scope, uploadId })
  expect(mock.states).toEqual([])
  expect(mock.data?.uploadId).toBe('replacement')
})
it('cancels only an exact queued request and never changes processing or completed assets', async () => {
  mock.data = request()
  await cancelUpload({ ...scope, uploadId })
  expect(mock.states).toEqual(['cancelled'])
  for (const state of ['processing', 'committed', 'complete']) {
    mock.states = []
    mock.data = request({ state, url })
    await cancelUpload({ ...scope, uploadId })
    expect(mock.states).toEqual([])
    expect(mock.data).toMatchObject({ state, url })
  }
})
it('rejects an already aborted transfer before reading or creating a request', async () => {
  const controller = new AbortController()
  controller.abort()
  await expect(
    queueGitHubUpload(pdf(), scope.collection, scope.recordId, vi.fn(), controller.signal)
  ).rejects.toHaveProperty('name', 'AbortError')
  expect(mock.read).not.toHaveBeenCalled()
  expect(mock.batchCommit).not.toHaveBeenCalled()
  expect(mock.trigger).not.toHaveBeenCalled()
})
it('cancels an abort racing the initial request creation and never starts chunks', async () => {
  const controller = new AbortController()
  mock.afterSet.mockImplementationOnce(() => controller.abort())
  await expect(
    queueGitHubUpload(pdf(), scope.collection, scope.recordId, vi.fn(), controller.signal)
  ).rejects.toHaveProperty('name', 'AbortError')
  expect(mock.data).toMatchObject({ ...scope, state: 'cancelled' })
  expect(mock.batchCommit).not.toHaveBeenCalled()
  expect(mock.trigger).not.toHaveBeenCalled()
})
it('stops progress and the queued transition when aborted during a chunk batch', async () => {
  const controller = new AbortController(), progress = vi.fn()
  mock.batchCommit.mockImplementationOnce(async () => controller.abort())
  await expect(
    queueGitHubUpload(pdf(), scope.collection, scope.recordId, progress, controller.signal)
  ).rejects.toHaveProperty('name', 'AbortError')
  expect(progress).not.toHaveBeenCalled()
  expect(mock.states).toEqual(['uploading', 'cancelled'])
  expect(mock.trigger).not.toHaveBeenCalled()
})
it('does not cancel a replacement request when its own chunk transfer fails', async () => {
  mock.batchCommit.mockImplementationOnce(async () => {
    mock.data = request({ recordId: 'other-article', uploadId: 'replacement' })
    throw new Error('network failed')
  })
  await expect(
    queueGitHubUpload(pdf(), scope.collection, scope.recordId, vi.fn())
  ).rejects.toThrow('network failed')
  expect(mock.data).toMatchObject({ recordId: 'other-article', uploadId: 'replacement', state: 'queued' })
  expect(mock.states).toEqual(['uploading'])
})

it('waits for server-confirmed completion and cleans up its subscription', async () => {
  const finished = vi.fn()
  const waiting = waitForUpload(scope, uploadId)
  void waiting.then(finished)
  emit(request({ state: 'complete', url }), true)
  await Promise.resolve()
  expect(finished).not.toHaveBeenCalled()
  emit(request({ state: 'complete', url }), false, true)
  await Promise.resolve()
  expect(finished).not.toHaveBeenCalled()
  emit(request({ state: 'committed', url }))
  await Promise.resolve()
  expect(finished).not.toHaveBeenCalled()
  emit(request({ state: 'complete', url }))
  await expect(waiting).resolves.toMatchObject({ ...scope, uploadId, url, state: 'complete' })
  expect(mock.unsubscribe).toHaveBeenCalledTimes(1)
})
it.each([
  { state: 'failed', error: '파일 검사 실패' },
  { state: 'cancelled' },
  { uploadId: 'replacement' },
  { collection: 'mathematics' },
  { recordId: 'another-article' },
  { state: 'complete', url: 'https://invalid.example/file.pdf' },
])('rejects terminal or replaced requests and permits retry with a new upload: %j', async (patch) => {
  const waiting = waitForUpload(scope, uploadId)
  const rejected = expect(waiting).rejects.toMatchObject({ name: 'UploadWaitError', restart: true })
  emit(request(patch))
  await rejected
  expect(mock.unsubscribe).toHaveBeenCalledTimes(1)
})
it('rejects a missing server request instead of waiting forever', async () => {
  const waiting = waitForUpload(scope, uploadId)
  const rejected = expect(waiting).rejects.toMatchObject({ restart: true })
  emit(null)
  await rejected
  expect(mock.unsubscribe).toHaveBeenCalledTimes(1)
})
it('preserves the upload identity for retry after connection failure', async () => {
  const waiting = waitForUpload(scope, uploadId)
  const rejected = expect(waiting).rejects.toMatchObject({
    name: 'UploadWaitError', restart: false, message: 'permission-denied',
  })
  mock.subscribe.mock.calls.at(-1)![3](new Error('permission-denied'))
  await rejected
  expect(mock.unsubscribe).toHaveBeenCalledTimes(1)
})
it('times out after fifteen minutes and releases its listener without cancelling deployed work', async () => {
  vi.useFakeTimers()
  mock.data = request({ state: 'processing' })
  const waiting = waitForUpload(scope, uploadId)
  const rejected = expect(waiting).rejects.toMatchObject({ name: 'UploadWaitError', restart: false })
  emit(mock.data)
  await vi.advanceTimersByTimeAsync(15 * 60 * 1000)
  await rejected
  expect(mock.unsubscribe).toHaveBeenCalledTimes(1)
  expect(mock.states).toEqual([])
  expect(vi.getTimerCount()).toBe(0)
})
it('cancels an exact queued request when aborted while waiting and releases its listener', async () => {
  const controller = new AbortController()
  mock.data = request()
  const waiting = waitForUpload(scope, uploadId, controller.signal)
  const rejected = expect(waiting).rejects.toHaveProperty('name', 'AbortError')
  controller.abort()
  await rejected
  await Promise.resolve()
  expect(mock.data?.state).toBe('cancelled')
  expect(mock.unsubscribe).toHaveBeenCalledTimes(1)
})
it('an abort after successful waiting cannot cancel a later request', async () => {
  const controller = new AbortController()
  const waiting = waitForUpload(scope, uploadId, controller.signal)
  emit(request({ state: 'complete', url }))
  await waiting
  mock.data = request({ uploadId: 'later-request' })
  controller.abort()
  await Promise.resolve()
  expect(mock.states).toEqual([])
})
it('returns structured upload wait errors to distinguish resuming from restarting', () => {
  expect(new UploadWaitError('retry later', false)).toBeInstanceOf(Error)
  expect(new UploadWaitError('retry later', false).restart).toBe(false)
})

it('removes the transfer abort listener after queueing and lets an already aborted waiter cancel the gap', async () => {
  const controller = new AbortController()
  const queued = await queueGitHubUpload(
    pdf(), scope.collection, scope.recordId, vi.fn(), controller.signal
  )
  controller.abort()
  await Promise.resolve()
  expect(mock.data?.state).toBe('queued')
  await expect(waitForUpload(scope, queued.uploadId, controller.signal))
    .rejects.toHaveProperty('name', 'AbortError')
  expect(mock.data?.state).toBe('cancelled')
  expect(mock.subscribe).not.toHaveBeenCalled()
})
it('unsubscribes even when a subscription adapter delivers completion synchronously', async () => {
  mock.subscribe.mockImplementationOnce((_reference, _options, callback) => {
    callback({
      exists: () => true,
      data: () => request({ state: 'complete', url }),
      metadata: { fromCache: false, hasPendingWrites: false },
    })
    return mock.unsubscribe
  })
  await expect(waitForUpload(scope, uploadId)).resolves.toHaveProperty('url', url)
  expect(mock.unsubscribe).toHaveBeenCalledTimes(1)
})
