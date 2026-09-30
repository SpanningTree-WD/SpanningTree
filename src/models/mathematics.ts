import type { ArchiveQuery, Attachment, ContentStatus, MediaReference } from './common'

export interface Mathematics {
  id: string; slug: string; title: string; summary: string; content: string
  authors: string[]; field: string; fields?: string[]; type: string; year: number; tags: string[]
  coverImage: MediaReference; attachments: Attachment[]; relatedActivities: string[]
  relatedPublications: string[]; relatedMathematics: string[]; status: ContentStatus
  createdAt: string; updatedAt: string; publishedAt?: string
}
export type MathematicsListQuery = ArchiveQuery
