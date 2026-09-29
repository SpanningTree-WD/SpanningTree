import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { initialMembers } from '../src/content/people'

// Explicit, one-time import. Never run automatically during deploys or page loads.
if (
  process.env.CONFIRM_MEMBER_IMPORT !== 'spanningtree-math' ||
  process.env.GOOGLE_CLOUD_PROJECT !== 'spanningtree-math'
)
  throw new Error(
    'Set CONFIRM_MEMBER_IMPORT and GOOGLE_CLOUD_PROJECT to spanningtree-math after reviewing the initial roster.'
  )
const db = getFirestore(
  initializeApp({ credential: applicationDefault(), projectId: 'spanningtree-math' })
)
await db.runTransaction(async (transaction) => {
  if (!(await transaction.get(db.collection('members').limit(1))).empty)
    throw new Error('Members already exist. Import cancelled without writes.')
  for (const { id, name, generation, isLeader } of initialMembers) {
    transaction.create(db.collection('members').doc(id), {
      name,
      generation,
      isLeader,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  }
})
console.log(`Imported ${initialMembers.length} members. Future edits belong in /admin/people.`)
