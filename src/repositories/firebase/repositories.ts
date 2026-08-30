import { collection, getDocs, query, where, type DocumentData, type Firestore, type QueryDocumentSnapshot } from 'firebase/firestore'
import type { Activity, ActivityListQuery } from '../../models/activity'
import type { Mathematics, MathematicsListQuery } from '../../models/mathematics'
import type { Publication, PublicationListQuery } from '../../models/publication'
import type { ActivityRepository, MathematicsRepository, PublicationRepository } from '../contracts'

type PublicRecord = { id: string; slug: string; status: 'draft' | 'published' }
type ListQuery = ActivityListQuery | MathematicsListQuery | PublicationListQuery
const disabledWrite = async (): Promise<never> => { throw new Error('Stage 5 Firebase repositories are public read-only repositories.') }

function normalize(value: unknown): unknown {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') return value.toDate().toISOString()
  if (Array.isArray(value)) return value.map(normalize)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]))
  return value
}

export function mapFirestoreRecord<T extends PublicRecord>(snapshot: QueryDocumentSnapshot<DocumentData>): T {
  const record = { ...normalize(snapshot.data()) as object, id: snapshot.id } as T
  if (!record.slug || record.status !== 'published') throw new Error(`Invalid published document: ${snapshot.ref.path}`)
  return record
}

function publicRepository<T extends PublicRecord, Q extends ListQuery>(db: Firestore, name: string, filter: (item: T, query: Q) => boolean, sort: (a: T, b: T) => number) {
  async function published() {
    const result = await getDocs(query(collection(db, name), where('status', '==', 'published')))
    return result.docs.map(doc => mapFirestoreRecord<T>(doc))
  }
  return {
    async listPublished(options = {} as Q) { const all = (await published()).filter(item => filter(item, options)).sort(sort); return { items: options.limit === undefined ? all : all.slice(0, options.limit), total: all.length } },
    async getPublishedBySlug(slug: string) { return (await published()).find(item => item.slug === slug) ?? null },
    async getPublishedByIds(ids: string[]) { return (await published()).filter(item => ids.includes(item.id)) },
    listAll: disabledWrite, getById: disabledWrite, create: disabledWrite, update: disabledWrite, publish: disabledWrite, unpublish: disabledWrite,
  }
}

export function createFirebaseRepositories(db: Firestore): { activities: ActivityRepository; mathematics: MathematicsRepository; publications: PublicationRepository } {
  return {
    activities: publicRepository<Activity, ActivityListQuery>(db, 'activities', (item, q) => (!q.year || Number(item.date.slice(0, 4)) === q.year) && (!q.type || item.type === q.type) && (!q.featured || item.featured), (a, b) => b.date.localeCompare(a.date)),
    mathematics: publicRepository<Mathematics, MathematicsListQuery>(db, 'mathematics', (item, q) => (!q.year || item.year === q.year) && (!q.type || item.type === q.type) && (!q.field || item.field === q.field), (a, b) => b.year - a.year || b.updatedAt.localeCompare(a.updatedAt)),
    publications: publicRepository<Publication, PublicationListQuery>(db, 'publications', (item, q) => (!q.year || item.year === q.year) && (!q.type || item.type === q.type), (a, b) => b.year - a.year || b.updatedAt.localeCompare(a.updatedAt)),
  }
}
