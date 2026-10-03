import type { ArchiveQuery, Attachment, ContentStatus, MediaReference } from './common'
import type { AuthoringFields } from './authoring'

export interface Activity extends AuthoringFields {
  id: string; slug: string; title: string; summary: string; description: string
  date: string; type: string; coverImage: MediaReference; gallery: MediaReference[]
  tags: string[]; relatedMathematics: string[]; relatedPublications: string[]
  featured: boolean; status: ContentStatus; createdAt: string; updatedAt: string
  attachments?: Attachment[]
  participantIds?: string[]
  participants?: string[]
}
export type ActivityListQuery = ArchiveQuery
