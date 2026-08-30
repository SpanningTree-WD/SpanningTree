import { activityFixtures } from '../../content/fixtures/activities'
import { mathematicsFixtures } from '../../content/fixtures/mathematics'
import { publicationFixtures } from '../../content/fixtures/publications'
import type { ActivityRepository, MathematicsRepository, PublicationRepository, RelatedContent } from '../contracts'

const published=<T extends {id:string;slug:string;status:string}>(records:T[])=>records.filter(record=>record.status==='published')
const byIds=<T extends {id:string;status:string}>(records:T[],ids:string[])=>published(records).filter(record=>ids.includes(record.id))
const page=<T,>(items:T[],limit?:number)=>({items:limit===undefined?items:items.slice(0,limit),total:items.length})

export const activityRepository:ActivityRepository={
 async listPublished(query={}){let items=published(activityFixtures).filter(item=>(!query.year||Number(item.date.slice(0,4))===query.year)&&(!query.type||item.type===query.type)&&(!query.featured||item.featured));items.sort((a,b)=>b.date.localeCompare(a.date));return page(items,query.limit)},
 async getPublishedBySlug(slug){return published(activityFixtures).find(item=>item.slug===slug)??null},
 async getPublishedByIds(ids){return byIds(activityFixtures,ids)},
}
export const mathematicsRepository:MathematicsRepository={
 async listPublished(query={}){let items=published(mathematicsFixtures).filter(item=>(!query.year||item.year===query.year)&&(!query.field||item.field===query.field)&&(!query.type||item.type===query.type));items.sort((a,b)=>b.year-a.year||b.updatedAt.localeCompare(a.updatedAt));return page(items,query.limit)},
 async getPublishedBySlug(slug){return published(mathematicsFixtures).find(item=>item.slug===slug)??null},
 async getPublishedByIds(ids){return byIds(mathematicsFixtures,ids)},
}
export const publicationRepository:PublicationRepository={
 async listPublished(query={}){let items=published(publicationFixtures).filter(item=>(!query.year||item.year===query.year)&&(!query.type||item.type===query.type));items.sort((a,b)=>b.year-a.year||b.updatedAt.localeCompare(a.updatedAt));return page(items,query.limit)},
 async getPublishedBySlug(slug){return published(publicationFixtures).find(item=>item.slug===slug)??null},
 async getPublishedByIds(ids){return byIds(publicationFixtures,ids)},
}

export async function resolveRelated(ids:{activities?:string[];mathematics?:string[];publications?:string[]}):Promise<RelatedContent>{const [activities,mathematics,publications]=await Promise.all([activityRepository.getPublishedByIds(ids.activities??[]),mathematicsRepository.getPublishedByIds(ids.mathematics??[]),publicationRepository.getPublishedByIds(ids.publications??[])]);return {activities,mathematics,publications}}
