// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { compileDiagram, diagramHash, DIAGRAM_ENGINE, DIAGRAM_WAIT_MS } from './diagramService'
const mocks = vi.hoisted(() => ({
  transaction: vi.fn(), subscribe: vi.fn(), keepSession: vi.fn(), trigger: vi.fn(),
}))
vi.mock('firebase/firestore', () => ({
  doc: () => 'diagramRequests/editor', serverTimestamp: () => 'server-time',
  runTransaction: (...args: unknown[]) => mocks.transaction(...args),
  onSnapshot: (...args: unknown[]) => mocks.subscribe(...args),
}))
vi.mock('../firebase/firebase', () => ({ getFirebaseServices: () => ({
  auth: { currentUser: { uid: 'editor', emailVerified: true } }, firestore: {},
}) }))
vi.mock('../uploads/authoringSession', () => ({ keepUploadSession: mocks.keepSession }))
vi.mock('../uploads/triggerUpload', () => ({ triggerDiagram: mocks.trigger }))
const scope = { collection: 'mathematics' as const, recordId: 'article-one' }
const source = '\\begin{tikzpicture}\\draw (0,0)--(1,1);\\end{tikzpicture}'
const url = '/uploads/' + 'a'.repeat(64) + '.png'
type Record = { requestId: string; state: string; [key: string]: unknown }
let record: Record | undefined
let notify: ((snapshot: unknown) => void) | undefined
const write = vi.fn(), unsubscribe = vi.fn()
function snapshot(data = record, cached = false, pending = false) {
  return { data: () => data, metadata: { fromCache: cached, hasPendingWrites: pending } }
}
async function existing(state: string, patch = {}) {
  record = { ...scope, ownerId: 'editor', requestId: 'original-request', language: 'tikz', source,
    sourceHash: await diagramHash('tikz', source), engine: DIAGRAM_ENGINE, state, ...patch }
}
const run = (controller = new AbortController(), notice = vi.fn()) =>
  compileDiagram(scope, 'tikz', source, controller.signal, vi.fn(), notice)
const listening = () => vi.waitFor(() => expect(notify).toBeDefined())
function complete() { record = { ...record!, state: 'complete', url }; notify!(snapshot()) }
beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); record = undefined; notify = undefined
  mocks.keepSession.mockResolvedValue(undefined)
  mocks.trigger.mockResolvedValue('requested')
  mocks.transaction.mockImplementation(async (_db, action) => action({
    get: async () => snapshot(),
    set: (_reference: unknown, value: Record) => { record = value; write(value) },
  }))
  mocks.subscribe.mockImplementation((_reference, next) => { notify = next; return unsubscribe })
})
afterEach(() => vi.useRealTimers())
it('queues a new job and immediately wakes the worker after attaching its completion listener', async () => {
  const notice = vi.fn()
  const pending = run(undefined, notice)
  await listening()
  expect(write).toHaveBeenCalledTimes(1)
  expect(mocks.trigger).toHaveBeenCalledWith(record!.requestId)
  expect(notice).toHaveBeenCalledWith(expect.stringContaining('즉시 실행을 요청'))
  complete()
  await expect(pending).resolves.toEqual({ url, sourceHash: await diagramHash('tikz', source) })
  expect(unsubscribe).toHaveBeenCalledOnce()
})
it.each(['queued', 'processing', 'committed'])('reconnects to the same %s request and wakes an interrupted worker', async state => {
  await existing(state)
  const pending = run()
  await listening()
  expect(write).not.toHaveBeenCalled()
  expect(mocks.trigger).toHaveBeenCalledWith('original-request')
  complete(); await expect(pending).resolves.toHaveProperty('url', url)
})
it('times out, then retries the original job without changing its ID or losing a late completion', async () => {
  const first = run()
  const timedOut = expect(first).rejects.toThrow('기존 작업')
  await listening()
  const original = record!.requestId
  await vi.advanceTimersByTimeAsync(DIAGRAM_WAIT_MS)
  await timedOut
  expect(unsubscribe).toHaveBeenCalledOnce()
  notify = undefined
  const retry = run()
  await listening()
  expect(record!.requestId).toBe(original)
  expect(write).toHaveBeenCalledTimes(1)
  expect(mocks.trigger).toHaveBeenCalledTimes(2)
  complete(); await expect(retry).resolves.toHaveProperty('url', url)
})
it('recovers a result that completed after timeout without another compilation or listener', async () => {
  await existing('complete', { url })
  await expect(run()).resolves.toHaveProperty('url', url)
  expect(write).not.toHaveBeenCalled(); expect(mocks.trigger).not.toHaveBeenCalled()
  expect(mocks.subscribe).not.toHaveBeenCalled()
})
it('creates a fresh request after a compiler failure', async () => {
  await existing('failed', { error: 'Compiler failed' })
  const pending = run(); await listening()
  expect(record!.requestId).not.toBe('original-request')
  expect(record!.state).toBe('queued')
  complete(); await pending
})
it.each([{ recordId: 'other-article' }, { sourceHash: 'different-source' }, { language: 'asymptote' }])('never overwrites another active diagram (%j)', async patch => {
  await existing('processing', patch)
  await expect(run()).rejects.toThrow('다른 도형')
  expect(write).not.toHaveBeenCalled(); expect(mocks.trigger).not.toHaveBeenCalled()
})
it('keeps watching the saved request when immediate dispatch fails', async () => {
  mocks.trigger.mockRejectedValue(new Error('503'))
  const notice = vi.fn(); const pending = run(undefined, notice); await listening()
  expect(notice).toHaveBeenCalledWith(expect.stringContaining('예약 작업이 처리'))
  complete(); await expect(pending).resolves.toHaveProperty('url', url)
})
it('explains scheduled-only processing without losing the request', async () => {
  mocks.trigger.mockResolvedValue('scheduled')
  const notice = vi.fn(); const pending = run(undefined, notice); await listening()
  expect(notice).toHaveBeenCalledWith(expect.stringContaining('예약 작업을 기다'))
  complete(); await pending
})
it('stops waiting on cancel but allows the next visit to recover the same job', async () => {
  const controller = new AbortController(), first = run(controller)
  const cancelled = expect(first).rejects.toThrow('Cancelled')
  await listening(); controller.abort(); await cancelled
  expect(unsubscribe).toHaveBeenCalledOnce()
  notify = undefined
  const retry = run(); await listening(); complete(); await retry
  expect(write).toHaveBeenCalledTimes(1)
})
it('does not create a session for an already cancelled editor', async () => {
  const controller = new AbortController(); controller.abort()
  await expect(run(controller)).rejects.toThrow('Cancelled')
  expect(mocks.keepSession).not.toHaveBeenCalled()
})
it('ignores unconfirmed cached/local results and rejects an invalid result URL', async () => {
  const pending = run(); const failed = expect(pending).rejects.toThrow('결과 주소')
  await listening()
  notify!(snapshot({ ...record!, state: 'complete', url }, true))
  notify!(snapshot({ ...record!, state: 'complete', url }, false, true))
  expect(unsubscribe).not.toHaveBeenCalled()
  notify!(snapshot({ ...record!, state: 'complete', url: 'https://other.example/a.png' }))
  await failed
})
it('reports replaced requests instead of attaching another article result', async () => {
  const pending = run(); const failed = expect(pending).rejects.toThrow('요청이 변경')
  await listening(); notify!(snapshot({ ...record!, requestId: 'other-request', state: 'complete', url }))
  await failed
})
