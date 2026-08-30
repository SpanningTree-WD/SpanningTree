import type { Attachment, ContentStatus, MediaReference } from './common'

export interface Mathematics {
  id: string; slug: string; title: string; summary: string; content: string[]
  authors: string[]; field: string; type: string; year: number; tags: string[]
  coverImage: MediaReference; attachments: Attachment[]; relatedActivities: string[]
  relatedPublications: string[]; relatedMathematics: string[]; status: ContentStatus
  createdAt: string; updatedAt: string; publishedAt?: string
}
export interface MathematicsListQuery { field?: string; type?: string; year?: number; sort?: 'latest'; limit?: number }
