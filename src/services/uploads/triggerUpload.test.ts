// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({
  user: { uid: 'editor', emailVerified: true, getIdToken: vi.fn() },
}))
vi.mock('../firebase/firebase', () => ({
  getFirebaseServices: () => ({ auth: { currentUser: mock.user } }),
}))
const network = vi.fn()
beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.stubEnv('VITE_UPLOAD_TRIGGER_URL', 'https://example.workers.dev/trigger')
  mock.user.emailVerified = true
  mock.user.getIdToken.mockResolvedValue('firebase-id-token')
  vi.stubGlobal('fetch', network)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})
it('sends only the signed-in user and queued upload ID with their Firebase token', async () => {
  network.mockResolvedValueOnce(Response.json({ status: 'requested' }, { status: 202 }))
  const { triggerUpload } = await import('./triggerUpload')
  expect(await triggerUpload('request-id')).toBe('requested')
  const options = network.mock.calls[0][1]
  expect(options.headers.Authorization).toBe('Bearer firebase-id-token')
  expect(JSON.parse(options.body)).toEqual({ uid: 'editor', uploadId: 'request-id' })
  expect(options.credentials).toBe('omit')
})
it.each(['', 'disabled'])('uses the scheduled fallback for configuration %j', async (endpoint) => {
  vi.stubEnv('VITE_UPLOAD_TRIGGER_URL', endpoint)
  const { triggerUpload, hasUploadTrigger } = await import('./triggerUpload')
  expect(hasUploadTrigger()).toBe(false)
  expect(await triggerUpload('request-id')).toBe('scheduled')
  expect(network).not.toHaveBeenCalled()
})
it('does not transmit the token over HTTP or for an unverified account', async () => {
  vi.stubEnv('VITE_UPLOAD_TRIGGER_URL', 'http://example.workers.dev/trigger')
  await expect((await import('./triggerUpload')).triggerUpload('id')).rejects.toThrow('주소')
  vi.resetModules()
  vi.stubEnv('VITE_UPLOAD_TRIGGER_URL', 'https://example.workers.dev/trigger')
  mock.user.emailVerified = false
  await expect((await import('./triggerUpload')).triggerUpload('id')).rejects.toThrow('로그인')
  expect(network).not.toHaveBeenCalled()
})
it('reports failed dispatch without altering the stored upload request', async () => {
  network.mockResolvedValueOnce(new Response('', { status: 503 }))
  await expect((await import('./triggerUpload')).triggerUpload('id')).rejects.toThrow('파일은 보관')
})
