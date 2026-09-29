// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import worker, { type Env } from './index'
const origin = 'https://spanningtree-math.web.app'
const uid = 'editor'
const uploadId = '00000000-0000-4000-8000-000000000000'
const bearer = 'Bearer firebase.id.signature'
const network = vi.fn()
const limiter = vi.fn()
const env: Env = {
  GITHUB_DISPATCH_TOKEN: 'server-only-test-secret',
  TRIGGER_LIMITER: { limit: limiter },
}
function request(body: unknown = { uid, uploadId }, overrides: RequestInit = {}) {
  return new Request('https://worker.example/trigger', {
    method: 'POST',
    headers: { Origin: origin, Authorization: bearer, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...overrides,
  })
}
function metadata(state = 'queued', patch: Record<string, unknown> = {}) {
  return Response.json({
    fields: {
      ownerId: { stringValue: uid },
      uploadId: { stringValue: uploadId },
      state: { stringValue: state },
      ...patch,
    },
  })
}
beforeEach(() => {
  vi.clearAllMocks()
  network.mockReset()
  limiter.mockResolvedValue({ success: true })
  vi.stubGlobal('fetch', network)
})
afterEach(() => vi.unstubAllGlobals())
it('validates the current administrator through Firestore rules before dispatching the fixed workflow', async () => {
  network
    .mockResolvedValueOnce(metadata())
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
  const response = await worker.fetch(request(), env)
  expect(response.status).toBe(202)
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
  expect(network.mock.calls[0][0]).toBe(
    'https://firestore.googleapis.com/v1/projects/spanningtree-math/databases/(default)/documents/uploadRequests/editor'
  )
  expect(network.mock.calls[0][1].headers.Authorization).toBe(bearer)
  expect(network.mock.calls[1][0]).toBe(
    'https://api.github.com/repos/SpanningTree-WD/SpanningTree/actions/workflows/github-uploads.yml/dispatches'
  )
  expect(network.mock.calls[1][1].headers.Authorization).toBe('Bearer server-only-test-secret')
  expect(JSON.parse(network.mock.calls[1][1].body)).toEqual({ ref: 'main' })
  expect(limiter).toHaveBeenCalledWith({ key: 'uploader:editor' })
  expect(await response.text()).not.toContain('secret')
})
it('allows preflight only for the real site and rejects missing authentication', async () => {
  const preflight = await worker.fetch(
    new Request('https://worker.example/trigger', {
      method: 'OPTIONS',
      headers: { Origin: origin },
    }),
    env
  )
  expect(preflight.status).toBe(204)
  expect(preflight.headers.get('Access-Control-Allow-Headers')).toContain('Authorization')
  const other = await worker.fetch(
    request(undefined, { headers: { Origin: 'https://evil.example' } }),
    env
  )
  expect(other.status).toBe(403)
  expect(other.headers.has('Access-Control-Allow-Origin')).toBe(false)
  expect(
    (await worker.fetch(request(undefined, { headers: { Origin: origin } }), env)).status
  ).toBe(401)
  expect(network).not.toHaveBeenCalled()
})
it.each([401, 403])(
  'denies a token rejected by Firestore (%s) without sending GitHub credentials',
  async (status) => {
    network.mockResolvedValueOnce(new Response('', { status }))
    expect((await worker.fetch(request(), env)).status).toBe(403)
    expect(network).toHaveBeenCalledTimes(1)
    expect(limiter).not.toHaveBeenCalled()
  }
)
it('rejects malformed bodies, arbitrary destinations, path traversal and oversized payloads', async () => {
  for (const body of [
    null,
    { uid: '../admins', uploadId },
    { uid, uploadId, ref: 'evil' },
    { uid, uploadId: 'old' },
  ]) {
    expect((await worker.fetch(request(body), env)).status).toBe(400)
  }
  expect((await worker.fetch(request({ uid, uploadId, data: 'a'.repeat(1024) }), env)).status).toBe(
    413
  )
  expect(network).not.toHaveBeenCalled()
})
it('rejects stale requests and mismatched owners', async () => {
  for (const patch of [
    { ownerId: { stringValue: 'other' } },
    { uploadId: { stringValue: 'old' } },
  ]) {
    network.mockResolvedValueOnce(metadata('queued', patch))
    expect((await worker.fetch(request(), env)).status).toBe(409)
  }
  expect(network).toHaveBeenCalledTimes(2)
})
it('does not dispatch incomplete, already processing or completed uploads', async () => {
  for (const [state, status] of [
    ['uploading', 409],
    ['failed', 409],
    ['processing', 200],
    ['complete', 200],
  ] as const) {
    network.mockResolvedValueOnce(metadata(state))
    expect((await worker.fetch(request(), env)).status).toBe(status)
  }
  expect(network).toHaveBeenCalledTimes(4)
  expect(limiter).not.toHaveBeenCalled()
})
it('limits repeated requests from a verified administrator', async () => {
  network.mockResolvedValueOnce(metadata())
  limiter.mockResolvedValueOnce({ success: false })
  expect((await worker.fetch(request(), env)).status).toBe(429)
  expect(network).toHaveBeenCalledTimes(1)
})
it('fails closed during upstream failures and never returns credentials or raw upstream errors', async () => {
  network.mockResolvedValueOnce(new Response('private upstream error', { status: 500 }))
  expect((await worker.fetch(request(), env)).status).toBe(503)
  network
    .mockResolvedValueOnce(metadata())
    .mockResolvedValueOnce(new Response('private upstream error', { status: 403 }))
  const response = await worker.fetch(request(), env)
  expect(response.status).toBe(502)
  expect(await response.text()).not.toContain('private upstream')
  expect((await worker.fetch(request(), { ...env, GITHUB_DISPATCH_TOKEN: '' })).status).toBe(503)
})
