import type { Attachment, ContentStatus, MediaReference } from './common'

export interface Publication {
  id: string; slug: string; title: string; summary: string; description: string
  year: number; type: string; coverImage: MediaReference; pdf?: Attachment
  authors: string[]; editors: string[]; relatedActivities: string[]
  relatedMathematics: string[]; status: ContentStatus; createdAt: string; updatedAt: string
}
export interface PublicationListQuery { type?: string; year?: number; sort?: 'latest'; limit?: number }
