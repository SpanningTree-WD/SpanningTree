import { describe, expect, it } from 'vitest'
import { queryArchive, type ArchiveRecord } from './archiveQuery'

const record = (id: string, extra: Partial<ArchiveRecord> = {}): ArchiveRecord => ({
  id,
  title: id,
  summary: '',
  type: 'Article',
  status: 'published',
  year: 2026,
  updatedAt: '2026-01-01T00:00:00Z',
  ...extra,
})
const ids = (records: ArchiveRecord[], sort: 'latest' | 'oldest' | 'title') =>
  queryArchive(records, { sort }).items.map((item) => item.id)

describe('public archive queries', () => {
  it('orders activity dates and uses stable ties', () => {
    const records = [
      record('b', { date: '2025-02-01' }),
      record('a', { date: '2025-02-01' }),
      record('new', { date: '2026-02-01' }),
    ]
    expect(ids(records, 'latest')).toEqual(['new', 'a', 'b'])
    expect(ids(records, 'oldest')).toEqual(['a', 'b', 'new'])
  })
  it('orders publication years, then modification times, and natural titles', () => {
    const records = [
      record('one', { title: '정리 10' }),
      record('two', { title: '정리 2', updatedAt: '2026-02-01T00:00:00Z' }),
      record('old', { title: '정리 1', year: 2025 }),
    ]
    expect(ids(records, 'latest')).toEqual(['two', 'one', 'old'])
    expect(ids(records, 'oldest')).toEqual(['old', 'one', 'two'])
    expect(ids(records, 'title')).toEqual(['old', 'two', 'one'])
  })
  it('combines normalized search, authors, Korean category names and all filters', () => {
    const records = [
      record('match', {
        title: 'CALCULUS',
        field: 'Analysis',
        type: 'Poster',
        authors: ['김현'],
        content: '미분 적분',
      }),
      record('different', { field: 'Geometry' }),
    ]
    const result = queryArchive(records, {
      search: '  calculus 김현 해석학 적분 '.normalize('NFD'),
      field: 'Analysis',
      type: 'Poster',
      year: 2026,
    })
    expect(result.items.map((item) => item.id)).toEqual(['match'])
    expect(queryArchive(records, { search: 'calculus 없는단어' }).total).toBe(0)
    expect(queryArchive(records, { search: '<script>' }).total).toBe(0)
  })
  it('never exposes drafts in search, counts or facets, and keeps options with no matches', () => {
    const records = [
      record('visible', { year: 2028, field: 'Analysis' }),
      record('secret', { year: 2099, type: 'Private', status: 'draft' }),
    ]
    const result = queryArchive(records, { search: 'secret' })
    expect(result.total).toBe(0)
    expect(result.facets).toEqual({ years: ['2028'], fields: ['Analysis'], types: ['Article'] })
    expect(queryArchive(records, { search: '' }).total).toBe(1)
  })
  it('preserves featured selection and applies limits after filtering and sorting', () => {
    const records = [
      record('a', { featured: true }),
      record('b', { featured: true, year: 2027 }),
      record('c'),
    ]
    const result = queryArchive(records, { featured: true, sort: 'latest', limit: 1 })
    expect(result.items.map((item) => item.id)).toEqual(['b'])
    expect(result.total).toBe(2)
  })
})
