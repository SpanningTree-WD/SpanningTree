import { collection, getDocs, query, where, type DocumentData, type Firestore, type QueryDocumentSnapshot } from 'firebase/firestore'
import type { Activity } from '../../models/activity'
import type { Mathematics } from '../../models/mathematics'
import type { Publication } from '../../models/publication'
import type { ArchiveQuery } from '../../models/common'
import { queryArchive, type ArchiveRecord } from '../archiveQuery'
import type { ActivityRepository, MathematicsRepository, PublicationRepository } from '../contracts'

type PublicRecord = { id: string; slug: string; status: 'draft' | 'published' }
const disabledWrite = async (): Promise<never> => { throw new Error('Stage 5 Firebase repositories are public read-only repositories.') }

export function normalize(value: unknown): unknown {
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

function publicRepository<T extends PublicRecord & ArchiveRecord>(db: Firestore, name: string) {
  async function published() {
    const result = await getDocs(query(collection(db, name), where('status', '==', 'published')))
    return result.docs.map(doc => mapFirestoreRecord<T>(doc))
  }
  return {
    async listPublished(options: ArchiveQuery = {}) { return queryArchive(await published(), options) },
    async getPublishedBySlug(slug: string) { return (await published()).find(item => item.slug === slug) ?? null },
    async getPublishedByIds(ids: string[]) { return (await published()).filter(item => ids.includes(item.id)) },
    listAll: disabledWrite, getById: disabledWrite, create: disabledWrite, update: disabledWrite, publish: disabledWrite, unpublish: disabledWrite,
  }
}

export function createFirebaseRepositories(db: Firestore): { activities: ActivityRepository; mathematics: MathematicsRepository; publications: PublicationRepository } {
  return {
    activities: publicRepository<Activity>(db, 'activities'),
    mathematics: publicRepository<Mathematics>(db, 'mathematics'),
    publications: publicRepository<Publication>(db, 'publications'),
  }
}
