import { expect, it } from 'vitest'
import { buildRobots, buildSitemap, type SitemapRecord } from './sitemap'

it('lists only canonical public routes, with real modification dates and stable output', () => {
  const records: SitemapRecord[] = [
    { collection: 'mathematics', slug: 'galois-theory', status: 'published', updatedAt: '2026-09-29T00:00:00Z' },
    { collection: 'activities', slug: 'draft-forum', status: 'draft' },
    { collection: 'publications', slug: 'notes', status: 'published', updatedAt: 'invalid' },
  ]
  const xml = buildSitemap(records)
  expect(xml).toContain('<loc>https://spanningtree-math.web.app/mathematics/galois-theory</loc><lastmod>2026-09-29T00:00:00.000Z</lastmod>')
  expect(xml).not.toMatch(/draft-forum|\/admin|\/search|invalid/)
  expect(xml.match(/<url>/g)).toHaveLength(8)
  expect(xml.match(/<lastmod>/g)).toHaveLength(1)
  expect(buildSitemap([...records].reverse())).toBe(xml)
  expect(buildRobots()).toContain('Sitemap: https://spanningtree-math.web.app/sitemap.xml')
})

it('fails on invalid published slugs instead of advertising malformed or external URLs', () => {
  for (const slug of ['../admin', 'x?q=a&b=c', '', '<script>', 'https://example.com']) {
    expect(() => buildSitemap([{ collection: 'activities', slug, status: 'published' }])).toThrow()
  }
})
