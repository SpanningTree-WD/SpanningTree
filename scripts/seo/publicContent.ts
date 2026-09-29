import { contentCollections, type SitemapRecord } from './sitemap'

interface QueryResult {
  document?: {
    fields?: {
      slug?: { stringValue?: string }
      status?: { stringValue?: string }
      updatedAt?: { timestampValue?: string; stringValue?: string }
    }
  }
}

// This public REST query uses the same published-only boundary as the browser.
// No Admin SDK, service-account key, or privileged Firestore read is needed.
export async function readPublishedSitemapRecords(projectId: string): Promise<SitemapRecord[]> {
  if (!/^[a-z][a-z0-9-]+$/.test(projectId)) throw new Error('A valid Firebase project ID is required for the sitemap.')
  const groups = await Promise.all(contentCollections.map(async collection => {
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({ structuredQuery: {
        from: [{ collectionId: collection }],
        select: { fields: ['slug', 'status', 'updatedAt'].map(fieldPath => ({ fieldPath })) },
        where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'published' } } },
      } }),
    })
    if (!response.ok) throw new Error(`Public sitemap query failed for ${collection}: HTTP ${response.status}`)
    const rows = await response.json() as QueryResult[]
    if (!Array.isArray(rows)) throw new Error(`Invalid sitemap query response for ${collection}`)
    return rows.filter(row => row.document).map(row => {
      const fields = row.document!.fields
      if (!fields?.slug?.stringValue || fields.status?.stringValue !== 'published') {
        throw new Error(`Invalid published sitemap record in ${collection}`)
      }
      return {
        collection,
        slug: fields.slug.stringValue,
        status: fields.status.stringValue,
        updatedAt: fields.updatedAt?.timestampValue ?? fields.updatedAt?.stringValue,
      }
    })
  }))
  return groups.flat()
}
