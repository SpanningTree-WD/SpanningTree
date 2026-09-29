// @vitest-environment node
import { createHash } from 'node:crypto'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { gitBlobSha } from './validation'

const mocks = vi.hoisted(() => ({ db: {}, write: vi.fn(), read: vi.fn(), output: vi.fn() }))
vi.mock('firebase-admin/app', () => ({ cert: () => ({}), initializeApp: () => ({}) }))
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mocks.db,
  FieldValue: { serverTimestamp: () => 'now' },
}))
vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
  writeFile: mocks.write,
  readFile: mocks.read,
  appendFile: mocks.output,
}))

type Data = Record<string, unknown>
const documents = new Map<string, Data>()
const bytes = Buffer.from('%PDF-1.4\nWorker test')
const digest = createHash('sha256').update(bytes).digest('hex')
const queuePath = 'uploadRequests/editor'
const filePath = `${queuePath}/chunks/0`
const item = {
  uid: 'editor',
  uploadId: '00000000-0000-4000-8000-000000000000',
  url: `/uploads/${digest}.pdf`,
  sha256: digest,
  size: bytes.length,
}
const network = vi.fn()
const originalArgv = [...process.argv]
const snapshot = (path: string) => ({
  id: path.split('/').at(-1),
  ref: reference(path),
  exists: documents.has(path),
  data: () => (documents.has(path) ? { ...documents.get(path) } : undefined),
})
function reference(path: string) {
  return {
    path,
    get: async () => snapshot(path),
    update: async (data: Data) => {
      documents.set(path, { ...documents.get(path), ...data })
    },
    collection: (name: string) => ({
      get: async () => {
        const docs = [...documents.keys()]
          .filter((key) => key.startsWith(path + '/' + name + '/'))
          .map(snapshot)
        return { docs, empty: !docs.length }
      },
    }),
  }
}
beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  documents.clear()
  vi.stubEnv('FIREBASE_SERVICE_ACCOUNT', '{}')
  vi.stubEnv('GITHUB_REPOSITORY', 'SpanningTree-WD/SpanningTree')
  vi.stubEnv('GITHUB_TOKEN', 'test-only')
  vi.stubEnv('GITHUB_OUTPUT', 'test-output')
  vi.stubGlobal('fetch', network)
  documents.set('admins/editor', { enabled: true })
  documents.set('activities/saved', { status: 'draft' })
  documents.set(queuePath, {
    ...item,
    ownerId: 'editor',
    collection: 'activities',
    recordId: 'saved',
    fileName: 'file.pdf',
    mediaType: 'application/pdf',
    chunkCount: 1,
    state: 'queued',
    publicConsent: true,
    createdAt: { toMillis: () => Date.now() },
  })
  documents.set(filePath, { uploadId: item.uploadId, index: 0, data: bytes })
  mocks.read.mockResolvedValue(JSON.stringify([item]))
  mocks.db = {
    doc: reference,
    collection: () => ({
      where: (_field: string, operator: string, value: string | string[]) => ({
        limit: () => ({
          get: async () => ({
            docs: [...documents.keys()]
              .filter(
                (path) =>
                  path.startsWith('uploadRequests/') &&
                  path.split('/').length === 2 &&
                  (operator === 'in'
                    ? value.includes(String(documents.get(path)!.state))
                    : documents.get(path)!.state === value)
              )
              .map(snapshot),
          }),
        }),
      }),
    }),
    runTransaction: async (fn: (transaction: object) => Promise<unknown>) =>
      fn({
        get: (ref: ReturnType<typeof reference>) => ref.get(),
        update: (ref: ReturnType<typeof reference>, data: Data) => ref.update(data),
      }),
    batch: () => {
      const pending: string[] = []
      return {
        delete: (ref: ReturnType<typeof reference>) => pending.push(ref.path),
        commit: async () => {
          pending.forEach((path) => documents.delete(path))
        },
      }
    },
  }
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  process.argv = [...originalArgv]
})
async function run(mode = 'process') {
  process.argv[2] = mode
  await import('./worker')
}

it('writes only the verified asset to GitHub and waits for Hosting before clearing data', async () => {
  network
    .mockResolvedValueOnce(new Response('', { status: 404 }))
    .mockResolvedValueOnce(new Response('{}', { status: 201 }))
  await run()
  expect(documents.get(queuePath)?.state).toBe('committed')
  expect(documents.has(filePath)).toBe(true)
  expect(network.mock.calls[1][0]).toBe(
    `https://api.github.com/repos/SpanningTree-WD/SpanningTree/contents/public${item.url}`
  )
  expect(JSON.parse(network.mock.calls[1][1].body)).toMatchObject({
    branch: 'main',
    content: bytes.toString('base64'),
  })
  expect(mocks.output).toHaveBeenCalledWith('test-output', 'deploy=true\n')
})
it('rejects revoked membership before any GitHub write and cleans up the request', async () => {
  documents.set('admins/editor', { enabled: false })
  await run()
  expect(network).not.toHaveBeenCalled()
  expect(documents.get(queuePath)?.state).toBe('failed')
  expect(documents.has(filePath)).toBe(false)
})
it('does not duplicate a commit when recovering a processing request', async () => {
  documents.get(queuePath)!.state = 'processing'
  network.mockResolvedValue(new Response(JSON.stringify({ sha: gitBlobSha(bytes) })))
  await run()
  expect(network).toHaveBeenCalledTimes(1)
  expect(documents.get(queuePath)?.state).toBe('committed')
})
it('retains chunks after a transient GitHub failure so the next run can retry', async () => {
  network.mockResolvedValue(new Response('', { status: 503 }))
  await expect(run()).rejects.toThrow('503')
  expect(documents.get(queuePath)?.state).toBe('processing')
  expect(documents.has(filePath)).toBe(true)
})
it('rejects an SPA fallback from Hosting instead of claiming deployment succeeded', async () => {
  documents.get(queuePath)!.state = 'committed'
  network.mockResolvedValue(new Response('<!doctype html>site'))
  await expect(run('finalize')).rejects.toThrow('integrity')
  expect(documents.get(queuePath)?.state).toBe('committed')
  expect(documents.has(filePath)).toBe(true)
})
it('marks complete only after byte verification and recovers interruption after chunk cleanup', async () => {
  documents.get(queuePath)!.state = 'committed'
  documents.delete(filePath)
  network.mockResolvedValue(new Response(bytes))
  await run()
  expect(documents.get(queuePath)?.state).toBe('complete')
  expect(mocks.output).toHaveBeenCalledWith('test-output', 'deploy=false\n')
})
it('expires an abandoned browser upload without sending it to GitHub', async () => {
  documents.get(queuePath)!.state = 'uploading'
  documents.get(queuePath)!.createdAt = { toMillis: () => Date.now() - 3_600_001 }
  await run()
  expect(network).not.toHaveBeenCalled()
  expect(documents.get(queuePath)?.state).toBe('failed')
  expect(documents.has(filePath)).toBe(false)
})
