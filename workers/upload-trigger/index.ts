// This Worker only wakes the existing GitHub uploader. It never receives file bytes.
export interface Env {
  GITHUB_DISPATCH_TOKEN: string
  TRIGGER_LIMITER: { limit(input: { key: string }): Promise<{ success: boolean }> }
}
const origins = new Set([
  'https://spanningtree-math.web.app',
  'https://spanningtree-math.firebaseapp.com',
])
const firestore =
  'https://firestore.googleapis.com/v1/projects/spanningtree-math/databases/(default)/documents'
const workflow =
  'https://api.github.com/repos/SpanningTree-WD/SpanningTree/actions/workflows/github-uploads.yml/dispatches'
type Fields = Record<string, { stringValue?: string }>

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') ?? ''
    const cors: Record<string, string> = origins.has(origin)
      ? {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
          'Access-Control-Max-Age': '600',
          Vary: 'Origin',
        }
      : { Vary: 'Origin' }
    const reply = (status: number, value: object) =>
      Response.json(value, {
        status,
        headers: { ...cors, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
      })
    if (new URL(request.url).pathname !== '/trigger') return reply(404, { error: 'Not found' })
    if (!origins.has(origin)) return reply(403, { error: '허용되지 않은 사이트입니다.' })
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (request.method !== 'POST') return reply(405, { error: 'POST 요청만 허용됩니다.' })
    const authorization = request.headers.get('Authorization') ?? ''
    if (
      !/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(authorization) ||
      authorization.length > 8192
    ) {
      return reply(401, { error: '관리자 계정으로 다시 로그인해 주세요.' })
    }
    if (request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json')
      return reply(415, { error: 'JSON 요청이 필요합니다.' })
    let input: { uid: string; uploadId: string }
    try {
      // Read a bounded stream; Content-Length alone is not trustworthy.
      const reader = request.body?.getReader()
      if (!reader) return reply(400, { error: '요청 내용이 없습니다.' })
      let size = 0
      let text = ''
      const decoder = new TextDecoder()
      for (;;) {
        const part = await reader.read()
        if (part.done) break
        size += part.value.length
        if (size > 1024) {
          await reader.cancel()
          return reply(413, { error: '요청이 너무 큽니다.' })
        }
        text += decoder.decode(part.value, { stream: true })
      }
      input = JSON.parse(text + decoder.decode())
      if (
        !input ||
        typeof input.uid !== 'string' ||
        !/^[A-Za-z0-9_-]{1,128}$/.test(input.uid) ||
        typeof input.uploadId !== 'string' ||
        !/^[a-f0-9-]{36}$/.test(input.uploadId) ||
        Object.keys(input).some((key) => !['uid', 'uploadId'].includes(key))
      )
        throw new Error('Invalid input')
    } catch {
      return reply(400, { error: '업로드 요청이 올바르지 않습니다.' })
    }
    if (!env.GITHUB_DISPATCH_TOKEN)
      return reply(503, { error: '즉시 실행 연결을 준비 중입니다. 예약 작업이 계속 처리합니다.' })
    try {
      // Firestore validates the actual Firebase token and existing rules require the
      // verified, enabled administrator to own this slot. Never trust decoded JWT claims.
      const check = await fetch(`${firestore}/uploadRequests/${input.uid}`, {
        headers: { Authorization: authorization },
        signal: AbortSignal.timeout(10_000),
        // Workers supports manual/follow; reject 3xx below without forwarding credentials.
        redirect: 'manual',
      })
      if (check.status === 401 || check.status === 403)
        return reply(403, { error: '관리자 권한을 확인할 수 없습니다.' })
      if (check.status === 404) return reply(404, { error: '업로드 요청을 찾을 수 없습니다.' })
      if (!check.ok)
        return reply(503, {
          error: '권한 확인 서버에 연결하지 못했습니다. 예약 작업이 계속 처리합니다.',
        })
      const fields = ((await check.json()) as { fields?: Fields }).fields
      if (
        fields?.ownerId?.stringValue !== input.uid ||
        fields?.uploadId?.stringValue !== input.uploadId
      ) {
        return reply(409, { error: '업로드 요청이 변경되었습니다.' })
      }
      const state = fields?.state?.stringValue
      if (state === 'complete' || state === 'processing')
        return reply(200, { status: 'already-processing' })
      if (!['queued', 'committed', 'cancelled'].includes(state ?? ''))
        return reply(409, { error: '파일 전송을 먼저 완료해 주세요.' })
      const limit = await env.TRIGGER_LIMITER.limit({ key: `uploader:${input.uid}` })
      if (!limit.success)
        return reply(429, { error: '실행 요청이 많습니다. 잠시 후 다시 시도해 주세요.' })
      const dispatch = await fetch(workflow, {
        method: 'POST',
        redirect: 'manual',
        signal: AbortSignal.timeout(10_000),
        headers: {
          Authorization: `Bearer ${env.GITHUB_DISPATCH_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent': 'SpanningTree-Upload-Trigger',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({ ref: 'main' }),
      })
      if (!dispatch.ok)
        return reply(502, {
          error: '즉시 실행 요청을 보내지 못했습니다. 예약 작업이 계속 처리합니다.',
        })
      return reply(202, { status: 'requested' })
    } catch {
      // Do not log Firebase ID tokens, GitHub credentials, or upstream response bodies.
      return reply(503, {
        error: '즉시 실행 서버에 연결하지 못했습니다. 예약 작업이 계속 처리합니다.',
      })
    }
  },
}
