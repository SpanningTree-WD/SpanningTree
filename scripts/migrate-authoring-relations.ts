import { applicationDefault, cert, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { effectiveActivityIds } from '../src/models/contentRelations'
import type { Activity } from '../src/models/activity'
import type { Mathematics } from '../src/models/mathematics'

// Dry run is the default. New code reads old one-sided links without this migration.
const projectId = process.env.GOOGLE_CLOUD_PROJECT
const emulator = !!process.env.FIRESTORE_EMULATOR_HOST
if (!projectId || (!emulator && projectId !== 'spanningtree-math')) throw new Error('Set GOOGLE_CLOUD_PROJECT to the intended project.')
const apply = process.argv.includes('--apply')
if (apply && process.env.CONFIRM_AUTHORING_MIGRATION !== projectId) throw new Error('Review the dry run, then set CONFIRM_AUTHORING_MIGRATION to the project ID.')
const credentials = process.env.FIREBASE_SERVICE_ACCOUNT
const db = getFirestore(initializeApp({ projectId, ...(emulator ? {} : { credential: credentials ? cert(JSON.parse(credentials)) : applicationDefault() }) }))
const [activities, mathematics, publications] = await Promise.all(['activities', 'mathematics', 'publications'].map(name => db.collection(name).get()))
function backupValue(value: unknown): unknown {
  if (value instanceof Timestamp) return { __type: 'timestamp', seconds: value.seconds, nanoseconds: value.nanoseconds }
  if (Array.isArray(value)) return value.map(backupValue)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, backupValue(item)]))
  return value
}
const backupPath = resolve(process.env.AUTHORING_BACKUP_PATH || ('authoring-backup-' + Date.now() + '.json'))
await writeFile(backupPath, JSON.stringify({ projectId, createdAt: new Date().toISOString(), records: [...activities.docs, ...mathematics.docs, ...publications.docs].map(snapshot => ({ path: snapshot.ref.path, updateTime: backupValue(snapshot.updateTime), data: backupValue(snapshot.data()) })) }, null, 2), { flag: 'wx', mode: 0o600 })
const legacy = mathematics.docs.filter(snapshot => snapshot.data().relationshipVersion !== 2)
console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', projectId, backupPath, mathematicsToAdapt: legacy.length, articlesPreserved: activities.size + mathematics.size + publications.size }))
if (apply) for (const snapshot of legacy) {
  await db.runTransaction(async transaction => {
    const current = await transaction.get(snapshot.ref)
    if (!current.exists || current.data()?.relationshipVersion === 2) return
    const liveActivities = await transaction.get(db.collection('activities'))
    const relatedActivities = effectiveActivityIds({ ...current.data(), id: current.id } as Mathematics, liveActivities.docs.map(record => ({ ...record.data(), id: record.id }) as Activity))
    // Legacy Activity arrays are retained as historical data but ignored for v2 Mathematics.
    // Names, People IDs, bodies, files, slugs and all unrelated fields are untouched.
    transaction.update(current.ref, { relatedActivities, relationshipVersion: 2, updatedAt: FieldValue.serverTimestamp() })
  })
}
console.log(apply ? 'Migration complete; rerunning is safe.' : 'Dry run complete; no database writes were made.')
