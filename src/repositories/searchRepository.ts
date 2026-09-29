import type { Activity } from '../models/activity'
import type { Mathematics } from '../models/mathematics'
import type { Publication } from '../models/publication'
import {
  activityRepository,
  mathematicsRepository,
  publicationRepository,
} from './publicRepositories'

export type SearchRecord =
  | { kind: 'activities'; record: Activity }
  | { kind: 'mathematics'; record: Mathematics }
  | { kind: 'publications'; record: Publication }

export async function listSearchRecords(): Promise<SearchRecord[]> {
  const [activities, mathematics, publications] = await Promise.all([
    activityRepository.listPublished(),
    mathematicsRepository.listPublished(),
    publicationRepository.listPublished(),
  ])
  return [
    ...activities.items.map((record) => ({ kind: 'activities' as const, record })),
    ...mathematics.items.map((record) => ({ kind: 'mathematics' as const, record })),
    ...publications.items.map((record) => ({ kind: 'publications' as const, record })),
  ]
}
