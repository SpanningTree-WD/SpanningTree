import { afterEach, expect, it, vi } from 'vitest'
import { readPublishedSitemapRecords } from './publicContent'

afterEach(() => vi.unstubAllGlobals())

it('queries only published records without privileged credentials and reads both date formats', async () => {
  // A fresh response body is needed for each collection.
  const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify([
    { document: { fields: { slug: { stringValue: 'forum' }, status: { stringValue: 'published' }, updatedAt: { timestampValue: '2026-09-29T00:00:00Z' } } } },
    { document: { fields: { slug: { stringValue: 'older' }, status: { stringValue: 'published' }, updatedAt: { stringValue: '2025-01-01' } } } },
  ])))
  vi.stubGlobal('fetch', fetcher)
  const records = await readPublishedSitemapRecords('spanningtree-math')
  expect(records).toHaveLength(6)
  expect(records[0].updatedAt).toBe('2026-09-29T00:00:00Z')
  expect(records[1].updatedAt).toBe('2025-01-01')
  for (const call of fetcher.mock.calls) {
    const request = call[1] as RequestInit
    const query = JSON.parse(request.body as string).structuredQuery
    expect(query.where.fieldFilter).toEqual({ field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'published' } })
    expect(request.headers).not.toHaveProperty('Authorization')
  }
})

it('accepts an empty archive but rejects errors rather than silently dropping URLs', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('[{"readTime":"2026-09-29T00:00:00Z"}]')))
  expect(await readPublishedSitemapRecords('spanningtree-math')).toEqual([])
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 403 })))
  await expect(readPublishedSitemapRecords('spanningtree-math')).rejects.toThrow('HTTP 403')
  vi.stubGlobal('fetch', vi.fn(async () => new Response('[{"document":{"fields":{"slug":{"stringValue":"draft"},"status":{"stringValue":"draft"}}}}]')))
  await expect(readPublishedSitemapRecords('spanningtree-math')).rejects.toThrow('Invalid published')
})
