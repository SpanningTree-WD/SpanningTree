import { appendFile, mkdir, writeFile } from 'node:fs/promises'
import { loadEnv } from 'vite'
import { site } from '../../src/content/site'
import { readPublishedSitemapRecords } from './publicContent'
import { buildRobots, buildSitemap } from './sitemap'

const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env }
const source = env.VITE_PUBLIC_DATA_SOURCE || 'local'
if (source !== 'local' && source !== 'firebase') throw new Error('Invalid public data source.')
// Fixture routes must never be advertised to Google. Offline/local builds contain
// only static routes. A production query failure aborts the build, without fallback.
const records = source === 'firebase'
  ? await readPublishedSitemapRecords(env.VITE_FIREBASE_PROJECT_ID ?? '') : []
const sitemap = buildSitemap(records)
await mkdir('dist', { recursive: true })
await writeFile('dist/sitemap.xml', sitemap)
await writeFile('dist/robots.txt', buildRobots())
console.log(`Generated search files: ${records.length} published records (${source}).`)

if (process.argv.includes('--check-live')) {
  if (source !== 'firebase') throw new Error('Live sitemap refresh requires Firebase mode.')
  const response = await fetch(`${site.origin}/sitemap.xml`, { signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`Live sitemap comparison failed: HTTP ${response.status}`)
  const changed = await response.text() !== sitemap
  console.log(`Sitemap changed: ${changed}`)
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `changed=${changed}\n`)
}
