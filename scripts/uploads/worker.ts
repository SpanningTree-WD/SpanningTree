// Runs only in GitHub Actions. Never import this module into browser code.
import { createHash } from 'node:crypto'
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { cert, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore, type DocumentReference } from 'firebase-admin/firestore'
import type { UploadRequest } from '../../src/services/uploads/uploadTypes'
import { assembleUpload, gitBlobSha, InvalidUpload, validateRequest } from './validation'

const projectId = 'spanningtree-math'
const repository = 'SpanningTree-WD/SpanningTree'
const host = 'https://spanningtree-math.web.app'
const manifestPath = '.firebase/upload-manifest.json'
const credential = process.env.FIREBASE_SERVICE_ACCOUNT
if (!credential || process.env.GITHUB_REPOSITORY !== repository)
  throw new Error('Upload worker configuration is missing.')
initializeApp({ projectId, credential: cert(JSON.parse(credential)) })
const db = getFirestore()
type Manifest = { uid: string; uploadId: string; url: string; sha256: string; size: number }
type StoredRequest = UploadRequest & { createdAt: { toMillis(): number } }

async function github(path: string, method = 'GET', body?: unknown) {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error('GitHub token is missing.')
  return fetch(`https://api.github.com/repos/${repository}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(120_000),
  })
}
async function storeFile(path: string, bytes: Buffer) {
  // Immutable content-addressed paths; existing files must have the exact same bytes.
  for (let attempt = 0; attempt < 3; attempt++) {
    const existing = await github(`contents/${path}?ref=main`)
    if (existing.ok) {
      const value = (await existing.json()) as { sha: string }
      if (value.sha !== gitBlobSha(bytes))
        throw new Error('Existing upload failed its integrity check.')
      return
    }
    if (existing.status !== 404) throw new Error(`GitHub file check failed (${existing.status}).`)
    const response = await github(`contents/${path}`, 'PUT', {
      message: 'chore: add uploaded archive file',
      content: bytes.toString('base64'),
      branch: 'main',
    })
    if (response.ok) return
    if (![409, 422].includes(response.status))
      throw new Error(`GitHub upload failed (${response.status}).`)
  }
  throw new Error('GitHub upload conflicted. The next run will retry.')
}
async function clearChunks(ref: DocumentReference) {
  // Parent is locked (processing/committed/cancelled), so the client cannot add chunks.
  const chunks = await ref.collection('chunks').get()
  if (chunks.empty) return
  const batch = db.batch()
  chunks.docs.forEach((chunk) => batch.delete(chunk.ref))
  await batch.commit()
}
async function finishFailure(ref: DocumentReference, request: UploadRequest, message: string) {
  await clearChunks(ref)
  await db.runTransaction(async (transaction) => {
    const current = await transaction.get(ref)
    if (current.data()?.uploadId === request.uploadId)
      transaction.update(ref, {
        state: 'failed',
        error: message,
        updatedAt: FieldValue.serverTimestamp(),
      })
  })
}
async function authorized(request: UploadRequest) {
  const [member, record] = await Promise.all([
    db.doc(`admins/${request.ownerId}`).get(),
    db.doc(`${request.collection}/${request.recordId}`).get(),
  ])
  if (member.data()?.enabled !== true || !record.exists)
    throw new InvalidUpload('관리자 권한 또는 글이 더 이상 유효하지 않습니다.')
}
async function processQueue() {
  // Clean up abandoned browser transfers without enabling paid TTL features.
  const abandoned = await db
    .collection('uploadRequests')
    .where('state', '==', 'uploading')
    .limit(20)
    .get()
  for (const snapshot of abandoned.docs) {
    const locked = await db.runTransaction(async (transaction) => {
      const current = await transaction.get(snapshot.ref)
      const data = current.data() as StoredRequest | undefined
      if (!data || data.state !== 'uploading' || Date.now() - data.createdAt.toMillis() < 3_600_000)
        return null
      transaction.update(snapshot.ref, {
        state: 'cancelled',
        updatedAt: FieldValue.serverTimestamp(),
      })
      return data
    })
    if (locked)
      await finishFailure(
        snapshot.ref,
        locked,
        '전송 시간이 지나 임시 파일을 정리했습니다. 다시 올려 주세요.'
      )
  }
  const jobs = await db
    .collection('uploadRequests')
    .where('state', 'in', ['queued', 'processing', 'committed', 'cancelled'])
    .limit(10)
    .get()
  const manifest: Manifest[] = []
  for (const snapshot of jobs.docs) {
    const request = await db.runTransaction(async (transaction) => {
      const current = await transaction.get(snapshot.ref)
      const data = current.data() as StoredRequest | undefined
      if (!data || !['queued', 'processing', 'committed', 'cancelled'].includes(data.state))
        return null
      if (data.state === 'queued')
        transaction.update(snapshot.ref, {
          state: 'processing',
          updatedAt: FieldValue.serverTimestamp(),
        })
      return data
    })
    if (!request) continue
    if (request.state === 'cancelled') {
      await finishFailure(snapshot.ref, request, '업로드를 취소했습니다.')
      continue
    }
    try {
      validateRequest(request, snapshot.id)
      await authorized(request)
      const extension = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'application/pdf': 'pdf',
      }[request.mediaType]
      const item = {
        uid: snapshot.id,
        uploadId: request.uploadId,
        url: `/uploads/${request.sha256}.${extension}`,
        sha256: request.sha256,
        size: request.size,
      }
      // A previous finalize may have cleared chunks and then been interrupted.
      if (request.state === 'committed' && (await completeIfDeployed(item))) continue
      // Retain chunks through deployment so interrupted runs can verify and retry safely.
      const chunks = await snapshot.ref.collection('chunks').get()
      const file = assembleUpload(
        request,
        chunks.docs.map((chunk) => ({
          id: chunk.id,
          ...chunk.data(),
        })) as Parameters<typeof assembleUpload>[1]
      )
      await storeFile(file.path, file.bytes)
      await snapshot.ref.update({
        state: 'committed',
        url: file.url,
        updatedAt: FieldValue.serverTimestamp(),
      })
      manifest.push(item)
    } catch (error) {
      if (!(error instanceof InvalidUpload)) throw error // Infrastructure failure: retain request and retry next run.
      await finishFailure(snapshot.ref, request, error.message)
    }
  }
  await mkdir('.firebase', { recursive: true })
  await writeFile(manifestPath, JSON.stringify(manifest))
  if (process.env.GITHUB_OUTPUT)
    await appendFile(process.env.GITHUB_OUTPUT, `deploy=${manifest.length > 0}\n`)
  console.log(`Upload queue processed; ${manifest.length} file(s) awaiting deployment.`)
}
async function completeIfDeployed(item: Manifest) {
  const ref = db.doc(`uploadRequests/${item.uid}`)
  const current = await ref.get()
  if (current.data()?.uploadId !== item.uploadId || current.data()?.state !== 'committed')
    return false
  // Check the actual Hosting bytes, not an SPA fallback or only the deploy command's exit code.
  const response = await fetch(`${host}${item.url}`, { signal: AbortSignal.timeout(120_000) })
  if (!response.ok || !response.body) return false
  const hash = createHash('sha256')
  let size = 0
  for await (const chunk of response.body) {
    size += chunk.length
    if (size > item.size) return false
    hash.update(chunk)
  }
  if (size !== item.size || hash.digest('hex') !== item.sha256) return false
  await clearChunks(ref)
  await db.runTransaction(async (transaction) => {
    const latest = await transaction.get(ref)
    if (latest.data()?.uploadId === item.uploadId && latest.data()?.state === 'committed') {
      transaction.update(ref, { state: 'complete', updatedAt: FieldValue.serverTimestamp() })
    }
  })
  return true
}
async function finalize() {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest[]
  for (const item of manifest) {
    if (!(await completeIfDeployed(item)))
      throw new Error('Deployed upload failed its integrity check. The next run will retry.')
  }
  console.log(`Verified ${manifest.length} deployed upload(s).`)
}
if (process.argv[2] === 'process') await processQueue()
else if (process.argv[2] === 'finalize') await finalize()
else throw new Error('Specify process or finalize.')
