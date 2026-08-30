import { beforeEach, describe, expect, it } from 'vitest'
import { activityRepository, mathematicsRepository, publicationRepository, resetLocalRepositoriesForTests } from './repositories'

describe('public local repositories',()=>{
 beforeEach(()=>resetLocalRepositoriesForTests())
 it('exclude drafts from lists and detail lookup',async()=>{expect((await activityRepository.listPublished()).items).toHaveLength(5);expect(await activityRepository.getPublishedBySlug('future-number-theory-workshop')).toBeNull();expect(await mathematicsRepository.getPublishedBySlug('spectral-sequences')).toBeNull();expect(await publicationRepository.getPublishedBySlug('spanning-tree-notes-2026')).toBeNull()})
 it('filter archives and sort latest first',async()=>{const activities=await activityRepository.listPublished({year:2025,type:'Forum'});expect(activities.items.map(item=>item.title)).toEqual(['KSA × Spanning Tree Forum']);const mathematics=await mathematicsRepository.listPublished({field:'Combinatorics'});expect(mathematics.items[0].year).toBe(2026)})
 it('creates drafts and reflects explicit publish and unpublish transitions publicly',async()=>{
  const template=await activityRepository.getById('activity-forum-2025')
  if(!template)throw new Error('Fixture missing')
  const {id:_,status:__,createdAt:___,updatedAt:____,...input}=template;void _;void __;void ___;void ____
  const draft=await activityRepository.create({...input,slug:'local-workflow-test',title:'Local workflow test'})
  expect(draft.status).toBe('draft')
  expect(await activityRepository.getPublishedBySlug(draft.slug)).toBeNull()
  await activityRepository.publish(draft.id)
  expect((await activityRepository.getPublishedBySlug(draft.slug))?.status).toBe('published')
  await activityRepository.unpublish(draft.id)
  expect(await activityRepository.getPublishedBySlug(draft.slug)).toBeNull()
  expect((await activityRepository.getById(draft.id))?.status).toBe('draft')
 })
})
