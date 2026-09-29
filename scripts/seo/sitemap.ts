import { publicPages, site } from '../../src/content/site'

export const contentCollections = ['activities', 'mathematics', 'publications'] as const
export type ContentCollection = typeof contentCollections[number]
export interface SitemapRecord {
  collection: ContentCollection
  slug: string
  status: string
  updatedAt?: string
}

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  })[character]!)
}

export function buildSitemap(records: SitemapRecord[]) {
  const entries = new Map<string, string | undefined>(Object.keys(publicPages).map(path => [path, undefined]))
  for (const record of records) {
    if (record.status !== 'published') continue
    if (!contentCollections.includes(record.collection) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(record.slug)) {
      throw new Error('Invalid published content URL; refusing to generate a partial sitemap.')
    }
    const lastmod = record.updatedAt && Number.isFinite(Date.parse(record.updatedAt))
      ? new Date(record.updatedAt).toISOString() : undefined
    entries.set(`/${record.collection}/${record.slug}`, lastmod)
  }
  // Stable ordering avoids unnecessary deployments. Do not invent lastmod dates
  // for static pages, or change every date to the time the build ran.
  const urls = [...entries].sort(([a], [b]) => a.localeCompare(b)).map(([path, lastmod]) =>
    `  <url><loc>${escapeXml(new URL(path, site.origin).href)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
}

export function buildRobots() {
  // Crawl access is needed for Google to see the noindex directives on admin,
  // search and missing pages. robots.txt is not an access-control mechanism.
  return `User-agent: *\nAllow: /\n\nSitemap: ${site.origin}/sitemap.xml\n`
}
