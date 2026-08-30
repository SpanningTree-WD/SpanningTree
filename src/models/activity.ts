import type { ContentStatus, MediaReference } from './common'

export interface Activity {
  id: string; slug: string; title: string; summary: string; description: string
  date: string; type: string; coverImage: MediaReference; gallery: MediaReference[]
  tags: string[]; relatedMathematics: string[]; relatedPublications: string[]
  featured: boolean; status: ContentStatus; createdAt: string; updatedAt: string
}
export interface ActivityListQuery { year?: number; type?: string; sort?: 'latest'; limit?: number; featured?: boolean }
