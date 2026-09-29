import { activityFixtures } from '../../content/fixtures/activities'
import { mathematicsFixtures } from '../../content/fixtures/mathematics'
import { publicationFixtures } from '../../content/fixtures/publications'
import type { ActivityListQuery } from '../../models/activity'
import type { MathematicsListQuery } from '../../models/mathematics'
import type { PublicationListQuery } from '../../models/publication'
import type { AdminRepository, ActivityRepository, MathematicsRepository, PublicationRepository, RelatedContent } from '../contracts'
import { queryArchive } from '../archiveQuery'

type RecordBase = { id: string; slug: string; status: 'draft' | 'published'; createdAt: string; updatedAt: string; publishedAt?: string }
const STORAGE_PREFIX = 'spanning-tree.prototype.'
const memory = new Map<string, unknown[]>()

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T }
function read<T>(key: string, fixtures: T[]): T[] {
  try { const saved = window.localStorage.getItem(STORAGE_PREFIX + key); if (saved) return JSON.parse(saved) as T[] } catch { /* localStorage is optional in the prototype. */ }
  if (!memory.has(key)) memory.set(key, clone(fixtures) as unknown[])
  return clone(memory.get(key) as T[])
}
function write<T>(key: string, records: T[]) {
  memory.set(key, clone(records) as unknown[])
  try { window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(records)) } catch { /* Continue in memory when storage is unavailable. */ }
}

function adminMethods<T extends RecordBase>(key: string, fixtures: T[], tracksPublicationTime = false): AdminRepository<T> {
  const find = (id: string) => read(key, fixtures).find(item => item.id === id)
  return {
    async listAll() { return read(key, fixtures).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) },
    async getById(id) { return find(id) ?? null },
    async create(input) {
      const now = new Date().toISOString()
      const record = { ...input, id: `${key}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, status: 'draft', createdAt: now, updatedAt: now } as T
      write(key, [...read(key, fixtures), record]); return clone(record)
    },
    async update(id, input) {
      const records = read(key, fixtures); const index = records.findIndex(item => item.id === id)
      if (index < 0) throw new Error('Record not found')
      records[index] = { ...records[index], ...input, id, createdAt: records[index].createdAt, updatedAt: new Date().toISOString() }
      write(key, records); return clone(records[index])
    },
    async publish(id) {
      const record = find(id); if (!record) throw new Error('Record not found')
      return this.update(id, { status: 'published', ...(tracksPublicationTime ? { publishedAt: new Date().toISOString() } : {}) } as Partial<Omit<T, 'id' | 'createdAt'>>)
    },
    async unpublish(id) { return this.update(id, { status: 'draft' } as Partial<Omit<T, 'id' | 'createdAt'>>) },
  }
}

const activityAdmin = adminMethods('activities', activityFixtures)
const mathematicsAdmin = adminMethods('mathematics', mathematicsFixtures, true)
const publicationAdmin = adminMethods('publications', publicationFixtures)

export const activityRepository: ActivityRepository = {
  ...activityAdmin,
  async listPublished(query: ActivityListQuery = {}) { return queryArchive(await activityAdmin.listAll(), query) },
  async getPublishedBySlug(slug) { return (await activityAdmin.listAll()).find(item => item.status === 'published' && item.slug === slug) ?? null },
  async getPublishedByIds(ids) { return (await activityAdmin.listAll()).filter(item => item.status === 'published' && ids.includes(item.id)) },
}
export const mathematicsRepository: MathematicsRepository = {
  ...mathematicsAdmin,
  async listPublished(query: MathematicsListQuery = {}) { return queryArchive(await mathematicsAdmin.listAll(), query) },
  async getPublishedBySlug(slug) { return (await mathematicsAdmin.listAll()).find(item => item.status === 'published' && item.slug === slug) ?? null },
  async getPublishedByIds(ids) { return (await mathematicsAdmin.listAll()).filter(item => item.status === 'published' && ids.includes(item.id)) },
}
export const publicationRepository: PublicationRepository = {
  ...publicationAdmin,
  async listPublished(query: PublicationListQuery = {}) { return queryArchive(await publicationAdmin.listAll(), query) },
  async getPublishedBySlug(slug) { return (await publicationAdmin.listAll()).find(item => item.status === 'published' && item.slug === slug) ?? null },
  async getPublishedByIds(ids) { return (await publicationAdmin.listAll()).filter(item => item.status === 'published' && ids.includes(item.id)) },
}

export async function resolveRelated(ids:{activities?:string[];mathematics?:string[];publications?:string[]}):Promise<RelatedContent>{const [activities,mathematics,publications]=await Promise.all([activityRepository.getPublishedByIds(ids.activities??[]),mathematicsRepository.getPublishedByIds(ids.mathematics??[]),publicationRepository.getPublishedByIds(ids.publications??[])]);return {activities,mathematics,publications}}
export function resetLocalRepositoriesForTests() { memory.clear(); try { Object.keys(window.localStorage).filter(key => key.startsWith(STORAGE_PREFIX)).forEach(key => window.localStorage.removeItem(key)) } catch { /* no browser storage */ } }
