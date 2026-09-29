import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const projectId = process.env.GOOGLE_CLOUD_PROJECT
if (
  projectId !== 'spanningtree-math' ||
  process.env.CONFIRM_FIRESTORE_SLUG_MIGRATION !== projectId
) {
  throw new Error(
    'Set GOOGLE_CLOUD_PROJECT and CONFIRM_FIRESTORE_SLUG_MIGRATION to spanningtree-math after reviewing the target.'
  )
}
const db = getFirestore(initializeApp({ credential: applicationDefault(), projectId }))
const records = (
  await Promise.all(
    ['activities', 'mathematics', 'publications'].map((name) => db.collection(name).get())
  )
).flatMap((snapshot) => snapshot.docs)
const claims = new Map<string, { collection: string; slug: string; recordId: string }>()
for (const record of records) {
  const slug = record.data().slug
  if (typeof slug !== 'string' || slug.length > 160 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    throw new Error('Invalid slug at ' + record.ref.path)
  const key = record.ref.parent.id + ':' + slug
  if (claims.has(key)) throw new Error('Duplicate slug; no migration writes were made: ' + key)
  claims.set(key, { collection: record.ref.parent.id, slug, recordId: record.id })
}
// Run during a maintenance window before enabling remote editing. Each chunk is
// retryable, idempotent and create-only; existing conflicting claims are never replaced.
const entries = [...claims.entries()]
if (entries.length) {
  const existing = await db.getAll(
    ...entries.map(([key]) => db.collection('contentSlugs').doc(key))
  )
  for (let index = 0; index < existing.length; index++) {
    const snapshot = existing[index],
      desired = entries[index][1]
    if (
      snapshot.exists &&
      (snapshot.data()?.recordId !== desired.recordId ||
        snapshot.data()?.collection !== desired.collection ||
        snapshot.data()?.slug !== desired.slug)
    ) {
      throw new Error(
        'Conflicting reservation; no migration writes were made: ' + snapshot.ref.path
      )
    }
  }
}
for (let start = 0; start < entries.length; start += 200) {
  const chunk = entries.slice(start, start + 200)
  await db.runTransaction(async (transaction) => {
    const snapshots = await transaction.getAll(
      ...chunk.map(([key]) => db.collection('contentSlugs').doc(key))
    )
    for (let index = 0; index < chunk.length; index++) {
      const desired = chunk[index][1],
        snapshot = snapshots[index]
      if (!snapshot.exists) transaction.create(snapshot.ref, desired)
      else if (snapshot.data()?.recordId !== desired.recordId)
        throw new Error('Conflicting reservation: ' + snapshot.ref.path)
    }
  })
}
console.log(
  'Verified slug reservations for ' + records.length + ' records. Content was not changed.'
)
