import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { activityFixtures } from '../src/content/fixtures/activities'
import { mathematicsFixtures } from '../src/content/fixtures/mathematics'
import { publicationFixtures } from '../src/content/fixtures/publications'

if (process.env.CONFIRM_FIRESTORE_IMPORT !== 'spanningtree-math') {
  throw new Error('Refusing to import. Set CONFIRM_FIRESTORE_IMPORT=spanningtree-math after reviewing the target and fixtures.')
}
const projectId = process.env.GOOGLE_CLOUD_PROJECT
if (projectId !== 'spanningtree-math') throw new Error('GOOGLE_CLOUD_PROJECT must be spanningtree-math.')

const app = initializeApp({ credential: applicationDefault(), projectId })
const db = getFirestore(app)
const groups = [
  ['activities', activityFixtures],
  ['mathematics', mathematicsFixtures],
  ['publications', publicationFixtures],
] as const
const documents = groups.flatMap(([collection, records]) => records.map(record => ({ ref: db.collection(collection).doc(record.id), record })))
const existing = await db.getAll(...documents.map(document => document.ref))
const collisions = existing.filter(snapshot => snapshot.exists).map(snapshot => snapshot.ref.path)
if (collisions.length) throw new Error(`Import cancelled without writes; documents already exist: ${collisions.join(', ')}`)

const batch = db.batch()
for (const document of documents) batch.create(document.ref, document.record)
await batch.commit()
console.log(`Created ${documents.length} reviewed fixture documents. No existing documents were overwritten.`)
