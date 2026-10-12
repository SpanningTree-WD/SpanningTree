import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore'
import { compileDiagram, diagramHash, DIAGRAM_ENGINE } from '../../src/services/diagrams/diagramService'
import { getFirebaseServices } from '../../src/services/firebase/firebase'
import { triggerDiagram } from '../../src/services/uploads/triggerUpload'
import { compileDiagram as renderDiagram } from '../../scripts/diagrams/compile'
import { createHash } from 'node:crypto'
vi.mock('../../src/services/firebase/firebase', () => ({ getFirebaseServices: vi.fn() }))
vi.mock('../../src/services/uploads/triggerUpload', () => ({ triggerDiagram: vi.fn() }))
let env: RulesTestEnvironment
let store: Firestore
const scope = { collection: 'mathematics' as const, recordId: '11111111-1111-4111-8111-111111111111' }
const source = '\\begin{tikzpicture}\\draw (0,0) circle (1);\\end{tikzpicture}'
const url = '/uploads/' + 'a'.repeat(64) + '.png'
const ref = () => doc(store, 'diagramRequests', 'editor')
async function serverUpdate(value: object) {
  await env.withSecurityRulesDisabled(async context => {
    await context.firestore().doc('diagramRequests/editor').update(value)
  })
}
async function queued() {
  await vi.waitFor(() => expect(triggerDiagram).toHaveBeenCalled(), { timeout: 10000 })
  return (await getDoc(ref())).data()!
}
beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Firestore emulator required; never use production.')
  env = await initializeTestEnvironment({ projectId: 'demo-spanning-diagrams', firestore: { rules: readFileSync('firestore.rules', 'utf8') } })
})
afterAll(async () => { await env?.cleanup() })
beforeEach(async () => {
  vi.clearAllMocks()
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async context => {
    await context.firestore().doc('admins/editor').set({ enabled: true })
  })
  store = env.authenticatedContext('editor', { email_verified: true }).firestore() as unknown as Firestore
  vi.mocked(getFirebaseServices).mockReturnValue({
    firestore: store, auth: { currentUser: { uid: 'editor', emailVerified: true } },
  } as ReturnType<typeof getFirebaseServices>)
  vi.mocked(triggerDiagram).mockResolvedValue('requested')
})
it('persists, immediately dispatches, reconnects and recovers a completed result under real rules', async () => {
  const controller = new AbortController()
  const first = compileDiagram(scope, 'tikz', source, controller.signal, vi.fn())
  const cancelled = expect(first).rejects.toThrow('Cancelled')
  const original = await queued()
  expect(original.state).toBe('queued')
  expect(triggerDiagram).toHaveBeenCalledWith(original.requestId)
  controller.abort(); await cancelled
  await serverUpdate({ state: 'processing' })
  vi.mocked(triggerDiagram).mockClear()
  const retry = compileDiagram(scope, 'tikz', source, new AbortController().signal, vi.fn())
  expect((await queued()).requestId).toBe(original.requestId)
  await serverUpdate({ state: 'complete', url })
  await expect(retry).resolves.toEqual({ url, sourceHash: await diagramHash('tikz', source) })
  vi.mocked(triggerDiagram).mockClear()
  await expect(compileDiagram(scope, 'tikz', source, new AbortController().signal, vi.fn())).resolves.toHaveProperty('url', url)
  expect(triggerDiagram).not.toHaveBeenCalled()
})
it('retries a failed request without needing a rules change or client permission to forge results', async () => {
  const original = { ...scope, ownerId: 'editor', requestId: '22222222-2222-4222-8222-222222222222',
    language: 'tikz', source, sourceHash: await diagramHash('tikz', source), engine: DIAGRAM_ENGINE, state: 'failed' }
  await env.withSecurityRulesDisabled(async context => {
    await context.firestore().doc('diagramRequests/editor').set(original)
  })
  const pending = compileDiagram(scope, 'tikz', source, new AbortController().signal, vi.fn())
  const next = await queued()
  expect(next.requestId).not.toBe(original.requestId)
  await expect(setDoc(ref(), { ...next, state: 'complete', url })).rejects.toThrow()
  await serverUpdate({ state: 'complete', url }); await pending
})
it.skipIf(process.env.DIAGRAM_SANDBOX_VERIFY !== 'true')('renders real TikZ/Asymptote PNGs and delivers them to the waiting/reconnected client', async () => {
  // Enabled by the Linux sandbox workflow after it builds the real Docker compiler.
  // Only the external dispatch/delivery transport is replaced; rules, client and compiler are real.
  for (const [language, code] of [['tikz', source], ['asymptote', 'size(160); draw(unitcircle);']] as const) {
    vi.mocked(triggerDiagram).mockClear()
    const pending = compileDiagram(scope, language, code, new AbortController().signal, vi.fn())
    await queued()
    await serverUpdate({ state: 'processing' })
    const png = await renderDiagram(language, code)
    expect(png.subarray(1, 4).toString()).toBe('PNG')
    const resultUrl = '/uploads/' + createHash('sha256').update(png).digest('hex') + '.png'
    await serverUpdate({ state: 'committed', url: resultUrl })
    await serverUpdate({ state: 'complete' })
    await expect(pending).resolves.toHaveProperty('url', resultUrl)
    expect((await getDoc(ref())).data()?.state).toBe('complete')
  }
}, 60000)
