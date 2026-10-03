import type { ArchiveQuery, Attachment, ContentStatus, MediaReference } from './common'
import type { AuthoringFields } from './authoring'

export interface Publication extends AuthoringFields {
  id: string; slug: string; title: string; summary: string; description: string
  year: number; type: string; coverImage: MediaReference; pdf?: Attachment
  authors: string[]; editors: string[]; relatedActivities: string[]
  relatedMathematics: string[]; status: ContentStatus; createdAt: string; updatedAt: string
}
export type PublicationListQuery = ArchiveQuery
