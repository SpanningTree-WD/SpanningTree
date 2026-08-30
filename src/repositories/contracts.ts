import type { Activity, ActivityListQuery } from '../models/activity'
import type { Mathematics, MathematicsListQuery } from '../models/mathematics'
import type { Page } from '../models/common'
import type { Publication, PublicationListQuery } from '../models/publication'

export interface ActivityRepository { listPublished(query?:ActivityListQuery):Promise<Page<Activity>>; getPublishedBySlug(slug:string):Promise<Activity|null>; getPublishedByIds(ids:string[]):Promise<Activity[]> }
export interface MathematicsRepository { listPublished(query?:MathematicsListQuery):Promise<Page<Mathematics>>; getPublishedBySlug(slug:string):Promise<Mathematics|null>; getPublishedByIds(ids:string[]):Promise<Mathematics[]> }
export interface PublicationRepository { listPublished(query?:PublicationListQuery):Promise<Page<Publication>>; getPublishedBySlug(slug:string):Promise<Publication|null>; getPublishedByIds(ids:string[]):Promise<Publication[]> }

export interface RelatedContent { activities:Activity[]; mathematics:Mathematics[]; publications:Publication[] }
