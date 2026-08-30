import { describe, expect, it } from 'vitest'
import { activityRepository, mathematicsRepository, publicationRepository } from './repositories'

describe('public local repositories',()=>{
 it('exclude drafts from lists and detail lookup',async()=>{expect((await activityRepository.listPublished()).items).toHaveLength(5);expect(await activityRepository.getPublishedBySlug('future-number-theory-workshop')).toBeNull();expect(await mathematicsRepository.getPublishedBySlug('spectral-sequences')).toBeNull();expect(await publicationRepository.getPublishedBySlug('spanning-tree-notes-2026')).toBeNull()})
 it('filter archives and sort latest first',async()=>{const activities=await activityRepository.listPublished({year:2025,type:'Forum'});expect(activities.items.map(item=>item.title)).toEqual(['KSA × Spanning Tree Forum']);const mathematics=await mathematicsRepository.listPublished({field:'Combinatorics'});expect(mathematics.items[0].year).toBe(2026)})
})
