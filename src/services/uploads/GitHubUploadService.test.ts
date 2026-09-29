// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({
  data: null as Record<string, unknown> | null,
  states: [] as string[],
  trigger: vi.fn(),
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
  onSnapshot: vi.fn(),
  serverTimestamp: () => 'now',
  writeBatch: () => ({ set: vi.fn(), commit: async () => {} }),
  runTransaction: async (_db: unknown, work: (transaction: object) => Promise<unknown>) =>
    work({
      get: async () => ({ exists: () => Boolean(mock.data), data: () => mock.data }),
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
import { queueGitHubUpload } from './GitHubUploadService'
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
