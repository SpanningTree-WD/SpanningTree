import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  Bytes,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { deleteObject, getBytes, ref, uploadBytes, type FirebaseStorage } from 'firebase/storage'
import { activityFixtures } from '../../src/content/fixtures/activities'
import { mathematicsFixtures } from '../../src/content/fixtures/mathematics'
import { publicationFixtures } from '../../src/content/fixtures/publications'
import { createFirebaseAdminRepository } from '../../src/repositories/firebase/adminRepository'
import { createFirebaseRepositories } from '../../src/repositories/firebase/repositories'
import type { Activity } from '../../src/models/activity'
import type { Mathematics } from '../../src/models/mathematics'
import type { Publication } from '../../src/models/publication'

let env: RulesTestEnvironment
const verified = { email_verified: true, email: 'editor@example.com' }
const db = (uid?: string, claims = verified) =>
  (uid
    ? env.authenticatedContext(uid, claims)
    : env.unauthenticatedContext()
  ).firestore() as unknown as Firestore
const storage = (uid?: string) =>
  (uid
    ? env.authenticatedContext(uid, verified)
    : env.unauthenticatedContext()
  ).storage() as unknown as FirebaseStorage

beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST)
    throw new Error(
      'Run npm run test:rules. Production services must never be used for these tests.'
    )
  env = await initializeTestEnvironment({
    projectId: 'demo-spanning-tree',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  })
})
beforeEach(async () => {
  await env.clearFirestore()
  await env.clearStorage()
  await env.withSecurityRulesDisabled(async (context) => {
    const store = context.firestore()
    await store.doc('admins/editor').set({ enabled: true })
    for (const [name, records] of [
      ['activities', activityFixtures],
      ['mathematics', mathematicsFixtures],
      ['publications', publicationFixtures],
    ] as const) {
      for (const record of records) {
        await store.doc(name + '/' + record.id).set(record)
        await store
          .doc('contentSlugs/' + name + ':' + record.slug)
          .set({ collection: name, recordId: record.id, slug: record.slug })
      }
    }
  })
})
afterAll(async () => {
  await env?.cleanup()
})

describe('membership and content authorization', () => {
  it('allows published reads but hides drafts and unfiltered lists from visitors and nonmembers', async () => {
    for (const store of [db(), db('outsider')]) {
      await assertSucceeds(getDoc(doc(store, 'activities', activityFixtures[0].id)))
      await assertFails(getDoc(doc(store, 'activities', 'activity-draft')))
      await assertFails(getDocs(collection(store, 'activities')))
      const result = await createFirebaseRepositories(store).activities.listPublished()
      expect(result.items.length).toBe(5)
      expect(result.items.every((item) => item.status === 'published')).toBe(true)
      await assertFails(
        setDoc(doc(store, 'activities', 'attacker'), { ...activityFixtures[0], id: 'attacker' })
      )
    }
  })
  it('permits only own membership lookup and rejects browser membership grants, including by admins', async () => {
    await assertSucceeds(getDoc(doc(db('outsider'), 'admins', 'outsider')))
    await assertFails(getDoc(doc(db('outsider'), 'admins', 'editor')))
    await assertFails(getDocs(collection(db('editor'), 'admins')))
    for (const store of [db(), db('outsider'), db('editor')]) {
      await assertFails(setDoc(doc(store, 'admins', 'outsider'), { enabled: true }))
    }
    await assertFails(
      getDocs(collection(db('editor', { ...verified, email_verified: false }), 'activities'))
    )
  })
  it('revokes existing authenticated access on the next request', async () => {
    const store = db('editor')
    await assertSucceeds(getDocs(collection(store, 'activities')))
    await env.withSecurityRulesDisabled((context) =>
      context.firestore().doc('admins/editor').update({ enabled: false })
    )
    await assertFails(getDocs(collection(store, 'activities')))
    await assertFails(
      updateDoc(doc(store, 'activities', 'activity-draft'), {
        title: 'No access',
        updatedAt: serverTimestamp(),
      })
    )
  })
  it('rejects malformed writes, immutable field changes, direct public creates and deletions', async () => {
    const store = db('editor'),
      reference = doc(store, 'activities', activityFixtures[0].id)
    await assertFails(updateDoc(reference, { unexpected: true, updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(reference, { title: '', updatedAt: serverTimestamp() }))
    await assertFails(
      updateDoc(reference, { createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    )
    await assertFails(updateDoc(reference, { status: 'hidden', updatedAt: serverTimestamp() }))
    await assertFails(
      updateDoc(reference, { slug: 'unreserved-slug', updatedAt: serverTimestamp() })
    )
    await assertFails(deleteDoc(reference))
    const batch = writeBatch(store),
      input = {
        ...activityFixtures[0],
        id: 'illegal',
        slug: 'illegal',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    batch.set(doc(store, 'activities', 'illegal'), input)
    batch.set(doc(store, 'contentSlugs', 'activities:illegal'), {
      collection: 'activities',
      slug: 'illegal',
      recordId: 'illegal',
    })
    await assertFails(batch.commit())
  })
})

describe('Firestore admin repositories', () => {
  it('creates, edits, publishes and unpublishes activities across independent clients', async () => {
    const repository = createFirebaseAdminRepository<Activity>(db('editor'), 'activities')
    const draft = await repository.create({
      ...activityFixtures[0],
      title: 'New activity',
      slug: 'new-activity',
    })
    expect(draft.status).toBe('draft')
    expect(draft.createdAt).toMatch(/^\d{4}-/)
    expect(
      (await createFirebaseAdminRepository<Activity>(db('editor'), 'activities').getById(draft.id))
        ?.title
    ).toBe('New activity')
    const publicRepository = createFirebaseRepositories(db()).activities
    expect(await publicRepository.getPublishedBySlug(draft.slug)).toBeNull()
    const changed = await repository.update(draft.id, {
      ...draft,
      title: 'Updated activity',
      status: 'published',
    })
    expect(changed.status).toBe('draft')
    expect(changed.createdAt).toBe(draft.createdAt)
    await repository.publish(draft.id)
    expect((await publicRepository.getPublishedBySlug(draft.slug))?.title).toBe('Updated activity')
    await repository.unpublish(draft.id)
    expect(await publicRepository.getPublishedBySlug(draft.slug)).toBeNull()
    expect((await repository.listAll()).some((record) => record.id === draft.id)).toBe(true)
  })
  it('stores mathematical content and publication time, and clears optional publication PDF metadata', async () => {
    const mathematics = createFirebaseAdminRepository<Mathematics>(db('editor'), 'mathematics')
    const math = await mathematics.create({
      ...mathematicsFixtures[0],
      slug: 'new-math',
      content: '# Theorem\n\n$$x^2$$',
    })
    const published = await mathematics.publish(math.id)
    expect(published.publishedAt).toMatch(/^\d{4}-/)
    expect(
      (await createFirebaseRepositories(db()).mathematics.getPublishedBySlug(math.slug))?.content
    ).toBe('# Theorem\n\n$$x^2$$')
    await mathematics.unpublish(math.id)
    expect((await mathematics.publish(math.id)).publishedAt).toBe(published.publishedAt)
    const publications = createFirebaseAdminRepository<Publication>(db('editor'), 'publications')
    const publication = await publications.create({
      ...publicationFixtures[0],
      slug: 'new-publication',
    })
    const updated = await publications.update(publication.id, { ...publication, pdf: undefined })
    expect(updated.pdf).toBeUndefined()
    await publications.publish(publication.id)
    expect(
      (await createFirebaseRepositories(db()).publications.getPublishedBySlug(publication.slug))?.id
    ).toBe(publication.id)
    await publications.unpublish(publication.id)
    expect(
      await createFirebaseRepositories(db()).publications.getPublishedBySlug(publication.slug)
    ).toBeNull()
  })
  it('reserves slugs atomically, releases old slugs and rejects stale editor updates', async () => {
    const repository = createFirebaseAdminRepository<Activity>(db('editor'), 'activities')
    const input = { ...activityFixtures[0], slug: 'same-slug' }
    const outcomes = await Promise.allSettled([repository.create(input), repository.create(input)])
    expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(outcomes.filter((result) => result.status === 'rejected')).toHaveLength(1)
    const success = outcomes.find((result) => result.status === 'fulfilled')!
    if (success.status !== 'fulfilled') throw new Error('No successful create')
    const original = success.value
    const edited = await repository.update(original.id, { ...original, slug: 'renamed-slug' })
    expect(edited.slug).toBe('renamed-slug')
    await expect(
      repository.update(original.id, { ...original, title: 'Stale overwrite' })
    ).rejects.toThrow('다른 관리자')
    await expect(repository.create(input)).resolves.toHaveProperty('slug', 'same-slug')
    await expect(
      repository.update(original.id, { ...edited, slug: activityFixtures[0].slug })
    ).rejects.toThrow('이미 사용')
  })
})

describe('GitHub upload queue authorization', () => {
  const input = () => ({
    uploadId: '00000000-0000-4000-8000-000000000000', ownerId: 'editor', collection: 'activities',
    recordId: 'activity-draft', fileName: 'file.pdf', mediaType: 'application/pdf', size: 5,
    sha256: 'a'.repeat(64), chunkCount: 1, state: 'uploading', publicConsent: true,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
  const chunk = () => ({ uploadId: input().uploadId, index: 0, data: Bytes.fromUint8Array(new Uint8Array([37, 80, 68, 70, 45])) })
  it('isolates queue access to its verified enabled owner, including from other administrators', async () => {
    const own = doc(db('editor'), 'uploadRequests/editor')
    await assertSucceeds(setDoc(own, input()))
    await assertSucceeds(getDoc(own))
    await env.withSecurityRulesDisabled(context => context.firestore().doc('admins/other').set({ enabled: true }))
    for (const store of [db(), db('outsider'), db('other'), db('editor', { ...verified, email_verified: false })]) {
      await assertFails(getDoc(doc(store, 'uploadRequests/editor')))
      await assertFails(setDoc(doc(store, 'uploadRequests/editor'), input()))
    }
    await assertFails(getDocs(collection(db('editor'), 'uploadRequests')))
    await assertFails(setDoc(doc(db('editor'), 'uploadRequests/other'), { ...input(), ownerId: 'other' }))
  })
  it('rejects arbitrary destinations, oversize requests and client-supplied completion fields', async () => {
    for (const patch of [{ collection: 'admins' }, { recordId: 'missing' }, { size: 20971521 }, { size: 8388609, mediaType: 'image/png' }, { mediaType: 'text/html' }, { chunkCount: 41 }, { url: '/uploads/fake.pdf' }, { state: 'complete' }, { publicConsent: false }]) {
      await assertFails(setDoc(doc(db('editor'), 'uploadRequests/editor'), { ...input(), ...patch }))
    }
  })
  it('bounds chunk names, size and ownership, then freezes bytes and metadata when queued', async () => {
    const store = db('editor'), own = doc(store, 'uploadRequests/editor')
    await setDoc(own, input())
    const file = doc(own, 'chunks/0')
    await assertSucceeds(setDoc(file, chunk()))
    await assertFails(getDoc(file))
    await assertFails(setDoc(doc(own, 'chunks/00'), chunk()))
    await assertFails(setDoc(file, { ...chunk(), index: 1 }))
    await assertFails(setDoc(file, { ...chunk(), uploadId: 'previous' }))
    await assertFails(setDoc(file, { ...chunk(), data: Bytes.fromUint8Array(new Uint8Array(6)) }))
    await assertFails(updateDoc(own, { sha256: 'b'.repeat(64), updatedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(own, { state: 'queued', updatedAt: serverTimestamp() }))
    await assertFails(setDoc(file, chunk()))
    for (const state of ['processing', 'committed', 'complete', 'failed', 'uploading']) {
      await assertFails(updateDoc(own, { state, updatedAt: serverTimestamp() }))
    }
    await assertSucceeds(updateDoc(own, { state: 'cancelled', updatedAt: serverTimestamp() }))
    await assertFails(setDoc(own, { ...input(), uploadId: '11111111-1111-4111-8111-111111111111' }))
    await assertFails(deleteDoc(own))
  })
  it('allows maximum-size chunks in batches and permits replacement only after worker cleanup', async () => {
    const store = db('editor'), own = doc(store, 'uploadRequests/editor')
    await setDoc(own, { ...input(), size: 524289, chunkCount: 2 })
    const batch = writeBatch(store)
    batch.set(doc(own, 'chunks/0'), { ...chunk(), data: Bytes.fromUint8Array(new Uint8Array(524288)) })
    batch.set(doc(own, 'chunks/1'), { ...chunk(), index: 1, data: Bytes.fromUint8Array(new Uint8Array(1)) })
    await assertSucceeds(batch.commit())
    await env.withSecurityRulesDisabled(async context => {
      const ref = context.firestore().doc('uploadRequests/editor')
      await ref.collection('chunks').doc('0').delete()
      await ref.collection('chunks').doc('1').delete()
      await ref.update({ state: 'complete', url: `/uploads/${'a'.repeat(64)}.pdf` })
    })
    await assertSucceeds(setDoc(own, { ...input(), uploadId: '11111111-1111-4111-8111-111111111111' }))
    await env.withSecurityRulesDisabled(context => context.firestore().doc('admins/editor').update({ enabled: false }))
    await assertFails(updateDoc(own, { state: 'queued', updatedAt: serverTimestamp() }))
  })
  it('stores uploaded media with content but rejects external cover URLs', async () => {
    const repository = createFirebaseAdminRepository<Activity>(db('editor'), 'activities')
    const original = (await repository.getById('activity-draft'))!
    const image = { ...original.coverImage, url: `/uploads/${'a'.repeat(64)}.png` }
    const pdf = { label: 'PDF', fileName: 'file.pdf', mediaType: 'application/pdf' as const, sizeLabel: '1 MB', url: `/uploads/${'b'.repeat(64)}.pdf` }
    const saved = await repository.update(original.id, { ...original, coverImage: image, attachments: [pdf] })
    expect(saved.coverImage.url).toBe(image.url)
    expect(saved.attachments).toEqual([pdf])
    await assertFails(repository.update(saved.id, { ...saved, coverImage: { ...image, url: 'https://example.com/image.png' } }))
  })
})

describe('managed Storage authorization', () => {
  it('allows admin image/PDF operations, hides draft media and denies unknown paths or nonmember writes', async () => {
    const path = 'content/activities/activity-draft/test.pdf'
    await assertSucceeds(
      uploadBytes(ref(storage('editor'), path), new Uint8Array([1, 2]), {
        contentType: 'application/pdf',
      })
    )
    await assertSucceeds(getBytes(ref(storage('editor'), path)))
    await assertFails(getBytes(ref(storage(), path)))
    await assertFails(getBytes(ref(storage('outsider'), path)))
    await assertFails(
      uploadBytes(ref(storage('outsider'), path), new Uint8Array([1]), {
        contentType: 'application/pdf',
      })
    )
    await assertFails(
      uploadBytes(ref(storage('editor'), 'unmanaged/test.pdf'), new Uint8Array([1]), {
        contentType: 'application/pdf',
      })
    )
    await assertFails(
      uploadBytes(
        ref(storage('editor'), 'content/activities/missing/test.pdf'),
        new Uint8Array([1]),
        { contentType: 'application/pdf' }
      )
    )
    await createFirebaseAdminRepository<Activity>(db('editor'), 'activities').publish(
      'activity-draft'
    )
    await assertSucceeds(getBytes(ref(storage(), path)))
    await assertSucceeds(getBytes(ref(storage('outsider'), path)))
    await createFirebaseAdminRepository<Activity>(db('editor'), 'activities').unpublish(
      'activity-draft'
    )
    await assertFails(getBytes(ref(storage(), path)))
    await assertSucceeds(deleteObject(ref(storage('editor'), path)))
  })
  it('rejects unsupported and oversized files, empty uploads and revoked editors', async () => {
    const file = ref(storage('editor'), 'content/activities/activity-draft/file')
    await assertFails(uploadBytes(file, new Uint8Array([1]), { contentType: 'text/html' }))
    await assertFails(uploadBytes(file, new Uint8Array(0), { contentType: 'image/png' }))
    await assertFails(
      uploadBytes(file, new Uint8Array(10 * 1024 * 1024 + 1), { contentType: 'image/png' })
    )
    await assertSucceeds(uploadBytes(file, new Uint8Array([1]), { contentType: 'image/webp' }))
    await env.withSecurityRulesDisabled((context) =>
      context.firestore().doc('admins/editor').update({ enabled: false })
    )
    await assertFails(uploadBytes(file, new Uint8Array([2]), { contentType: 'image/webp' }))
    await assertFails(deleteObject(file))
  })
})
