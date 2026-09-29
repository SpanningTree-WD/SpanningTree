// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({
  data: null as Record<string, unknown> | null,
  states: [] as string[],
  trigger: vi.fn(),
  subscribe: vi.fn(),
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
  writeBatch: () => ({ set: vi.fn(), commit: async () => {} }),
  runTransaction: async (_db: unknown, work: (transaction: object) => Promise<unknown>) =>
    work({
      get: async () => ({
        exists: () => Boolean(mock.data),
        data: () => mock.data,
      }),
      set: (_ref: unknown, data: Record<string, unknown>) => {
        mock.data = data
        mock.states.push(String(data.state))
      },
      update: (_ref: unknown, data: Record<string, unknown>) => {
        mock.data = { ...mock.data, ...data }
        mock.states.push(String(data.state))
      },
    }),
}))
import { queueGitHubUpload, watchUpload } from './GitHubUploadService'
beforeEach(() => {
  mock.data = null
  mock.states = []
  vi.clearAllMocks()
})
it('keeps the queued file when immediate dispatch is unavailable', async () => {
  mock.trigger.mockRejectedValueOnce(new Error('Worker unavailable'))
  const result = await queueGitHubUpload(
    new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' }),
    'activities',
    'saved',
    vi.fn()
  )
  expect(result).toEqual({ trigger: 'scheduled' })
  expect(mock.states).toEqual(['uploading', 'queued'])
  expect(mock.data?.state).toBe('queued')
  expect(mock.trigger).toHaveBeenCalledWith(mock.data?.uploadId)
})
it('dispatches only after the final queued transaction has completed', async () => {
  mock.trigger.mockImplementationOnce(async () => {
    expect(mock.data?.state).toBe('queued')
    return 'requested'
  })
  const result = await queueGitHubUpload(
    new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' }),
    'activities',
    'saved',
    vi.fn()
  )
  expect(result).toEqual({ trigger: 'requested' })
})
it('reports acknowledged byte progress without rounding the last unfinished chunk to 100%', async () => {
  const bytes = new Uint8Array(4 * 1024 * 1024 + 1)
  bytes.set(new TextEncoder().encode('%PDF-1.4'))
  const progress = vi.fn()
  await queueGitHubUpload(
    new File([bytes], 'test.pdf', { type: 'application/pdf' }),
    'activities',
    'saved',
    progress
  )
  expect(progress.mock.calls.map(([percent]) => percent)).toEqual([99, 100])
})
it('converts persisted timestamps and exposes cached versus server-confirmed snapshots', () => {
  const change = vi.fn()
  const error = vi.fn()
  const connection = vi.fn()
  watchUpload(change, error, connection)
  expect(mock.subscribe.mock.calls[0][1]).toEqual({
    includeMetadataChanges: true,
  })
  const snapshot = mock.subscribe.mock.calls[0][2]
  const failure = mock.subscribe.mock.calls[0][3]
  const data = {
    state: 'queued',
    createdAt: { toMillis: () => 1000 },
    updatedAt: { toMillis: () => 2000 },
  }
  snapshot({
    exists: () => true,
    data: () => data,
    metadata: { fromCache: true },
  })
  expect(change).toHaveBeenLastCalledWith({
    state: 'queued',
    createdAtMs: 1000,
    updatedAtMs: 2000,
  })
  expect(connection).toHaveBeenLastCalledWith('cached')
  snapshot({
    exists: () => true,
    data: () => data,
    metadata: { fromCache: false },
  })
  expect(connection).toHaveBeenLastCalledWith('live')
  const denied = new Error('permission-denied')
  failure(denied)
  expect(connection).toHaveBeenLastCalledWith('error')
  expect(error).toHaveBeenCalledWith(denied)
})
