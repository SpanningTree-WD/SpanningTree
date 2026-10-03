import { activityRepository as localActivities, mathematicsRepository as localMathematics, publicationRepository as localPublications } from './local/repositories'
import { createFirebaseRepositories } from './firebase/repositories'
import { getFirebaseServices } from '../services/firebase/firebase'
import type { Activity } from '../models/activity'
import type { Mathematics } from '../models/mathematics'
import { effectiveActivityIds, linkedMathematics } from '../models/contentRelations'

const source = import.meta.env.VITE_PUBLIC_DATA_SOURCE || 'local'
if (source !== 'local' && source !== 'firebase') throw new Error('VITE_PUBLIC_DATA_SOURCE must be local or firebase.')

const selected = source === 'firebase'
  ? createFirebaseRepositories(getFirebaseServices().firestore)
  : { activities: localActivities, mathematics: localMathematics, publications: localPublications }

export const activityRepository = selected.activities
export const mathematicsRepository = selected.mathematics
export const publicationRepository = selected.publications

export async function relatedMathematicsIds(activity: Activity) {
  const { items } = await mathematicsRepository.listPublished()
  return linkedMathematics(activity, items.filter(item => item.status === 'published'))
}
export async function relatedActivityIds(math: Mathematics) {
  const { items } = await activityRepository.listPublished()
  return effectiveActivityIds(math, items.filter(item => item.status === 'published'))
}

export async function resolveRelated(ids: { activities?: string[]; mathematics?: string[]; publications?: string[] }) {
  const [activities, mathematics, publications] = await Promise.all([
    activityRepository.getPublishedByIds(ids.activities ?? []),
    mathematicsRepository.getPublishedByIds(ids.mathematics ?? []),
    publicationRepository.getPublishedByIds(ids.publications ?? []),
  ])
  return { activities, mathematics, publications }
}
