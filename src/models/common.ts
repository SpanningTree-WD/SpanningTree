export type ContentStatus = 'draft' | 'published'

export interface MediaReference {
  alt: string
  variant: string
  caption?: string
  url?: string
}

export interface Attachment {
  label: string
  fileName: string
  mediaType: 'application/pdf'
  sizeLabel: string
  url?: string
}

export interface Page<T> {
  items: T[]
  total: number
}
export interface ArchiveFacets {
  years: string[]
  types: string[]
  fields: string[]
}
export interface ArchivePage<T> extends Page<T> {
  facets: ArchiveFacets
}
export type SortOrder = 'latest' | 'oldest' | 'title'
export interface ArchiveQuery {
  search?: string
  sort?: SortOrder
  year?: number
  type?: string
  field?: string
  featured?: boolean
  limit?: number
}
