export type ContentStatus = 'draft' | 'published'

export interface MediaReference {
  alt: string
  variant: string
  caption?: string
}

export interface Attachment {
  label: string
  fileName: string
  mediaType: 'application/pdf'
  sizeLabel: string
}

export interface Page<T> { items: T[]; total: number }
export type SortOrder = 'latest'
