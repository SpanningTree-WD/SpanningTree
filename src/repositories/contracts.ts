import type { Activity, ActivityListQuery } from '../models/activity'
import type { Mathematics, MathematicsListQuery } from '../models/mathematics'
import type { Page } from '../models/common'
import type { Publication, PublicationListQuery } from '../models/publication'

export interface AdminRepository<T> {
  listAll(): Promise<T[]>
  getById(id: string): Promise<T | null>
  create(input: Omit<T, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<T>
  update(id: string, input: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T>
  publish(id: string): Promise<T>
  unpublish(id: string): Promise<T>
}

export interface ActivityRepository extends AdminRepository<Activity> { listPublished(query?:ActivityListQuery):Promise<Page<Activity>>; getPublishedBySlug(slug:string):Promise<Activity|null>; getPublishedByIds(ids:string[]):Promise<Activity[]> }
export interface MathematicsRepository extends AdminRepository<Mathematics> { listPublished(query?:MathematicsListQuery):Promise<Page<Mathematics>>; getPublishedBySlug(slug:string):Promise<Mathematics|null>; getPublishedByIds(ids:string[]):Promise<Mathematics[]> }
export interface PublicationRepository extends AdminRepository<Publication> { listPublished(query?:PublicationListQuery):Promise<Page<Publication>>; getPublishedBySlug(slug:string):Promise<Publication|null>; getPublishedByIds(ids:string[]):Promise<Publication[]> }

export interface RelatedContent { activities:Activity[]; mathematics:Mathematics[]; publications:Publication[] }
