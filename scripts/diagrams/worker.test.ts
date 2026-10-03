// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Firestore } from 'firebase-admin/firestore'
import { compileDiagram, ENGINE, sourceHash } from './compile'
import { processDiagrams } from './worker'

vi.mock('./compile', async importOriginal => ({ ...await importOriginal<typeof import('./compile')>(), compileDiagram: vi.fn() }))
type Row = Record<string, unknown>
function database(requests: Record<string, Row>, extra: Record<string, Row> = {}) {
  const records = new Map<string, Row>(Object.entries(extra))
  for (const [uid, data] of Object.entries(requests)) {
    records.set('diagramRequests/' + uid, data)
    records.set('admins/' + uid, { enabled: true })
    records.set('mathematics/article', {})
  }
  function doc(path: string) {
    return {
      get: async () => ({ exists: records.has(path), data: () => records.get(path) }),
      set: async (value: Row) => { records.set(path, value) },
      update: async (value: Row) => { records.set(path, { ...records.get(path), ...value }) },
    }
  }
  const query = { where: () => query, limit: () => query, get: async () => ({ docs: Object.keys(requests).map(id => ({ id, data: () => records.get('diagramRequests/' + id), ref: doc('diagramRequests/' + id) })) }) }
  return { db: { doc, collection: () => query } as unknown as Firestore, records }
}
const source = '\\begin{tikzpicture}\\draw (0,0)--(1,1);\\end{tikzpicture}'
function request(ownerId: string, overrides: Row = {}): Row {
  return { ownerId, requestId: 'request-' + ownerId, collection: 'mathematics', recordId: 'article', language: 'tikz', source, sourceHash: sourceHash('tikz', source), engine: ENGINE, state: 'queued', ...overrides }
}
describe('diagram worker cache and authorization', () => {
  beforeEach(() => { vi.mocked(compileDiagram).mockReset(); vi.mocked(compileDiagram).mockResolvedValue(Buffer.from('verified compiler output')) })
  it('retains a request arriving after the compiler probe for the next run', async () => {
    const { db, records } = database({ late: request('late'), stored: request('stored', { state: 'committed', url: '/uploads/result.png', sha256: 'a'.repeat(64), size: 50 }) })
    const manifest = await processDiagrams(db, vi.fn(), false)
    expect(manifest.map(item => item.uid)).toEqual(['stored'])
    expect(records.get('diagramRequests/late')?.state).toBe('queued')
    expect(compileDiagram).not.toHaveBeenCalled()
  })
  it('compiles identical sources once across authors and keeps separate request receipts', async () => {
    const { db, records } = database({ first: request('first'), second: request('second') })
    const storeFile = vi.fn().mockResolvedValue(undefined)
    const manifest = await processDiagrams(db, storeFile)
    expect(compileDiagram).toHaveBeenCalledTimes(1)
    expect(storeFile).toHaveBeenCalledTimes(1)
    expect(manifest).toHaveLength(2)
    expect(manifest[0].url).toBe(manifest[1].url)
    expect(manifest.map(item => item.uploadId)).toEqual(['request-first', 'request-second'])
    expect(records.get('diagramRequests/second')?.state).toBe('committed')
    await processDiagrams(db, storeFile)
    expect(compileDiagram).toHaveBeenCalledTimes(1)
  })
  it('rejects revoked administrators and forged ownership before compilation or cache access', async () => {
    const { db, records } = database({ revoked: request('revoked'), forged: request('somebody-else') })
    records.set('admins/revoked', { enabled: false })
    expect(await processDiagrams(db, vi.fn())).toEqual([])
    expect(compileDiagram).not.toHaveBeenCalled()
    expect(records.get('diagramRequests/revoked')?.state).toBe('failed')
    expect(records.get('diagramRequests/forged')?.state).toBe('failed')
  })
  it('allows an unsaved article only while its matching private session is valid', async () => {
    const { db, records } = database({ valid: request('valid'), expired: request('expired') }, {
      'uploadSessions/valid/records/article': { collection: 'mathematics', expiresAt: { toMillis: () => Date.now() + 60000 } },
      'uploadSessions/expired/records/article': { collection: 'mathematics', expiresAt: { toMillis: () => Date.now() - 60000 } },
    })
    records.delete('mathematics/article')
    expect(await processDiagrams(db, vi.fn())).toHaveLength(1)
    expect(records.get('diagramRequests/expired')?.state).toBe('failed')
    expect(compileDiagram).toHaveBeenCalledTimes(1)
  })
  it('isolates a compiler error and rejects a mismatched hash without poisoning the cache', async () => {
    const { db, records } = database({ broken: request('broken'), forged: request('forged', { sourceHash: '0'.repeat(64) }), good: request('good') })
    vi.mocked(compileDiagram).mockRejectedValueOnce(new Error('Undefined control sequence at line 3'))
    const manifest = await processDiagrams(db, vi.fn())
    expect(manifest.map(item => item.uid)).toEqual(['good'])
    expect(records.get('diagramRequests/broken')?.error).toContain('line 3')
    expect(records.get('diagramRequests/forged')?.state).toBe('failed')
    expect(compileDiagram).toHaveBeenCalledTimes(2)
  })
})
