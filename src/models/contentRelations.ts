import type { Activity } from './activity'
import type { Mathematics } from './mathematics'

/** Single source of truth after adaptation: Mathematics.relatedActivities.
 * Legacy unions are read until a record is migrated/saved with version 2. */
export function effectiveActivityIds(math: Pick<Mathematics, 'id' | 'relatedActivities' | 'relationshipVersion'>, activities: Pick<Activity, 'id' | 'relatedMathematics'>[]) {
  return [...new Set([...(math.relatedActivities ?? []),
    ...(math.relationshipVersion === 2 ? [] : activities.filter(activity => activity.relatedMathematics?.includes(math.id)).map(activity => activity.id))])]
}
export function linkedMathematics(activity: Pick<Activity, 'id' | 'relatedMathematics'>, mathematics: Pick<Mathematics, 'id' | 'relatedActivities' | 'relationshipVersion'>[]) {
  return mathematics.filter(math => effectiveActivityIds(math, [activity]).includes(activity.id)).map(math => math.id)
}
