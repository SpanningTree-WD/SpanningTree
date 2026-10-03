import type { ArchiveQuery, Attachment, ContentStatus, MediaReference } from './common'
import type { AuthoringFields, ReferenceEntry } from './authoring'

export interface Mathematics extends AuthoringFields {
  id: string; slug: string; title: string; summary: string; content: string
  authors: string[]; field: string; fields?: string[]; type: string; year: number; tags: string[]
  coverImage: MediaReference; attachments: Attachment[]; relatedActivities: string[]
  relatedPublications: string[]; relatedMathematics: string[]; status: ContentStatus
  createdAt: string; updatedAt: string; publishedAt?: string
  references?: ReferenceEntry[]
  relationshipVersion?: 2
}
export type MathematicsListQuery = ArchiveQuery
