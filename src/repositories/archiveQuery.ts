import type { ArchivePage, ArchiveQuery, SortOrder } from '../models/common'
import {
  activityTypes,
  mathematicsFields,
  mathematicsTypes,
  publicationTypes,
} from '../models/contentOptions'

export interface ArchiveRecord {
  id: string
  title: string
  summary: string
  type: string
  status: 'draft' | 'published'
  updatedAt: string
  date?: string
  year?: number
  field?: string
  description?: string
  content?: string
  authors?: string[]
  editors?: string[]
  tags?: string[]
  featured?: boolean
}

const titleOrder = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' })
const labels = new Map([
  ...activityTypes,
  ...mathematicsTypes,
  ...mathematicsFields,
  ...publicationTypes,
])
const normalize = (text: string) =>
  text.normalize('NFKC').toLocaleLowerCase('ko').replace(/\s+/g, ' ').trim()
const yearOf = (record: ArchiveRecord) =>
  record.date ? Number(record.date.slice(0, 4)) : record.year
const dateOf = (record: ArchiveRecord) => record.date ?? `${record.year}-01-01`

export function parseSort(value: string | null): SortOrder {
  return value === 'oldest' || value === 'title' ? value : 'latest'
}

export function compareArchiveRecords(
  a: ArchiveRecord,
  b: ArchiveRecord,
  sort: SortOrder = 'latest'
) {
  const title = () => titleOrder.compare(a.title, b.title) || a.id.localeCompare(b.id)
  if (sort === 'title') return title()
  const chronological = dateOf(a).localeCompare(dateOf(b)) || a.updatedAt.localeCompare(b.updatedAt)
  return (sort === 'oldest' ? chronological : -chronological) || title()
}

export function matchesArchiveSearch(record: ArchiveRecord, search = '') {
  const words = normalize(search).split(' ').filter(Boolean)
  if (!words.length) return true
  const text = normalize(
    [
      record.title,
      record.summary,
      record.description,
      record.content,
      record.type,
      labels.get(record.type),
      record.field,
      labels.get(record.field ?? ''),
      record.date,
      record.year,
      ...(record.authors ?? []),
      ...(record.editors ?? []),
      ...(record.tags ?? []),
    ]
      .filter((value) => value !== undefined)
      .join(' ')
  )
  return words.every((word) => text.includes(word))
}

// Shared by Firebase and local previews. Facets use all public records, so changing
// a filter (including a zero-result filter) never removes other available choices.
export function queryArchive<T extends ArchiveRecord>(
  records: T[],
  query: ArchiveQuery = {}
): ArchivePage<T> {
  const published = records.filter((record) => record.status === 'published')
  const unique = (values: string[]) => [...new Set(values)].sort(titleOrder.compare)
  const facets = {
    years: unique(published.map((record) => String(yearOf(record)))).sort(
      (a, b) => Number(b) - Number(a)
    ),
    types: unique(published.map((record) => record.type)),
    fields: unique(published.flatMap((record) => (record.field ? [record.field] : []))),
  }
  const items = published
    .filter(
      (record) =>
        (query.year === undefined || yearOf(record) === query.year) &&
        (!query.type || record.type === query.type) &&
        (!query.field || record.field === query.field) &&
        (!query.featured || record.featured) &&
        matchesArchiveSearch(record, query.search)
    )
    .sort((a, b) => compareArchiveRecords(a, b, query.sort))
  return {
    items: query.limit === undefined ? items : items.slice(0, query.limit),
    total: items.length,
    facets,
  }
}
