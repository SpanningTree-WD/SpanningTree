import {
  Bytes,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import { getFirebaseServices } from '../firebase/firebase'
import { triggerUpload } from './triggerUpload'
import {
  isUploadActive,
  isUploadUrl,
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  UPLOAD_CHUNK_BYTES,
  validateUpload,
  type UploadCollection,
  type UploadConnection,
  type UploadRequest,
} from './uploadTypes'

export interface UploadScope {
  collection: UploadCollection
  recordId: string
}
export interface UploadIdentity extends UploadScope {
  uploadId: string
}
export class UploadWaitError extends Error {
  readonly restart: boolean
  constructor(message: string, restart: boolean) {
    super(message)
    this.name = 'UploadWaitError'
    this.restart = restart
  }
}
const UPLOAD_WAIT_MS = 15 * 60 * 1000

function context() {
  const { auth, firestore } = getFirebaseServices()
  const user = auth.currentUser
  if (!user?.emailVerified) throw new Error('관리자 계정으로 다시 로그인해 주세요.')
  return {
    db: firestore,
    uid: user.uid,
    reference: doc(firestore, 'uploadRequests', user.uid),
  }
}

function inScope(data: DocumentData | undefined, scope: UploadScope) {
  return data?.collection === scope.collection && data?.recordId === scope.recordId
}
function mapRequest(data: DocumentData): UploadRequest {
  const { createdAt, updatedAt, ...request } = data
  return {
    ...request,
    createdAtMs: createdAt?.toMillis(),
    updatedAtMs: updatedAt?.toMillis(),
  } as UploadRequest
}
function cancelled() {
  return new DOMException('파일 첨부를 취소했습니다.', 'AbortError')
}
function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw cancelled()
}

export function watchUpload(
  scope: UploadScope,
  onChange: (value: UploadRequest | null) => void,
  onError: (error: unknown) => void,
  onConnection?: (connection: UploadConnection) => void
) {
  const { reference } = context()
  return onSnapshot(
    reference,
    { includeMetadataChanges: true },
    (snapshot) => {
      onConnection?.(snapshot.metadata.fromCache ? 'cached' : 'live')
      const data = snapshot.exists() ? snapshot.data() : undefined
      onChange(data && inScope(data, scope) ? mapRequest(data) : null)
    },
    (error) => {
      onConnection?.('error')
      onError(error)
    }
  )
}

// The underlying slot is account-wide, so detect replacement even when the new
// request belongs to a different article and is hidden from watchUpload.
export async function waitForUpload(
  scope: UploadScope,
  uploadId: string,
  signal?: AbortSignal
): Promise<UploadRequest & { url: string }> {
  if (signal?.aborted) {
    await cancelUpload({ ...scope, uploadId }).catch(() => {})
    throw cancelled()
  }
  const { reference } = context()
  return new Promise((resolve, reject) => {
    let settled = false
    let unsubscribe = () => {}
    const finish = (error?: unknown, request?: UploadRequest & { url: string }) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      unsubscribe()
      if (error) reject(error)
      else resolve(request!)
    }
    const onAbort = () => {
      void cancelUpload({ ...scope, uploadId }).catch(() => {})
      finish(cancelled())
    }
    const timer = setTimeout(
      () => finish(new UploadWaitError('파일 처리가 오래 걸리고 있습니다. 선택한 파일을 유지한 채 다시 시도해 주세요.', false)),
      UPLOAD_WAIT_MS
    )
    signal?.addEventListener('abort', onAbort, { once: true })
    if (signal?.aborted) {
      onAbort()
      return
    }
    try {
      unsubscribe = onSnapshot(
        reference,
        { includeMetadataChanges: true },
        (snapshot) => {
          // Cached or locally pending states cannot prove deployment completed.
          if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return
          const data = snapshot.exists() ? snapshot.data() : undefined
          if (!data || data.uploadId !== uploadId || !inScope(data, scope)) {
            finish(new UploadWaitError('첨부 요청이 변경되었습니다. 이 글의 파일을 다시 시도해 주세요.', true))
            return
          }
          const request = mapRequest(data)
          if (request.state === 'failed' || request.state === 'cancelled') {
            finish(new UploadWaitError(request.error || '파일을 첨부하지 못했습니다. 다시 시도해 주세요.', true))
          } else if (request.state === 'complete') {
            if (!isUploadUrl(request.url)) {
              finish(new UploadWaitError('첨부 파일 주소를 확인하지 못했습니다. 다시 시도해 주세요.', true))
              return
            }
            finish(undefined, request as UploadRequest & { url: string })
          }
        },
        (error) => finish(new UploadWaitError(error.message, false))
      )
      // Keep cleanup correct if a test adapter or listener invokes synchronously.
      if (settled) unsubscribe()
    } catch (error) {
      finish(new UploadWaitError(error instanceof Error ? error.message : '첨부 상태를 확인하지 못했습니다.', false))
    }
  })
}

export async function queueGitHubUpload(
  file: File,
  collection: UploadCollection,
  recordId: string,
  onProgress: (percent: number) => void,
  signal?: AbortSignal
) {
  checkAbort(signal)
  if (!recordId) throw new Error('글을 먼저 임시 저장한 뒤 파일을 첨부해 주세요.')
  if (!file.size || file.size > (file.type === 'application/pdf' ? MAX_PDF_BYTES : MAX_IMAGE_BYTES))
    throw new Error('이미지는 8MB, PDF는 20MB까지 올릴 수 있습니다.')
  const bytes = new Uint8Array(await file.arrayBuffer())
  checkAbort(signal)
  validateUpload(bytes, file.type)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  checkAbort(signal)
  const sha256 = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  const { db, uid, reference } = context()
  const request: UploadRequest = {
    uploadId: crypto.randomUUID(),
    ownerId: uid,
    collection,
    recordId,
    fileName: file.name.slice(0, 120),
    mediaType: file.type,
    size: file.size,
    sha256,
    chunkCount: Math.ceil(file.size / UPLOAD_CHUNK_BYTES),
    state: 'uploading',
    publicConsent: true,
  }
  const identity = { collection, recordId, uploadId: request.uploadId }
  const onAbort = () => { void cancelUpload(identity).catch(() => {}) }
  signal?.addEventListener('abort', onAbort, { once: true })
  try {
    checkAbort(signal)
    await runTransaction(db, async (transaction) => {
      const previous = await transaction.get(reference)
      checkAbort(signal)
      if (previous.exists() && isUploadActive(previous.data().state))
        throw new Error(previous.data().state === 'cancelled'
          ? '취소한 첨부의 임시 파일을 정리하고 있습니다. 몇 분 뒤 다시 저장해 주세요.'
          : '이전 첨부 파일이 아직 처리 중입니다. 선택한 파일은 유지됩니다. 잠시 후 다시 저장해 주세요.')
      transaction.set(reference, {
        ...request,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    })
    checkAbort(signal)
    for (let start = 0; start < request.chunkCount; start += 8) {
      checkAbort(signal)
      const batch = writeBatch(db)
      for (let index = start; index < Math.min(start + 8, request.chunkCount); index++) {
        batch.set(doc(reference, 'chunks', String(index)), {
          uploadId: request.uploadId,
          index,
          data: Bytes.fromUint8Array(
            bytes.slice(index * UPLOAD_CHUNK_BYTES, (index + 1) * UPLOAD_CHUNK_BYTES)
          ),
        })
      }
      await batch.commit()
      checkAbort(signal)
      const sentBytes = Math.min((start + 8) * UPLOAD_CHUNK_BYTES, file.size)
      onProgress(Math.floor((sentBytes / file.size) * 100))
    }
    checkAbort(signal)
    await runTransaction(db, async (transaction) => {
      const current = await transaction.get(reference)
      checkAbort(signal)
      if (
        current.data()?.uploadId !== request.uploadId ||
        !inScope(current.data(), identity) ||
        current.data()?.state !== 'uploading'
      )
        throw new Error('업로드 요청이 변경되었습니다. 다시 확인해 주세요.')
      transaction.update(reference, {
        state: 'queued',
        updatedAt: serverTimestamp(),
      })
    })
    checkAbort(signal)
    // Trigger failure must not cancel the successfully queued file.
    let trigger: Awaited<ReturnType<typeof triggerUpload>> = 'scheduled'
    try {
      trigger = await triggerUpload(request.uploadId)
    } catch {
      // The scheduled worker still processes this request.
    }
    checkAbort(signal)
    return { uploadId: request.uploadId, trigger }
  } catch (error) {
    // Also covers an abort that raced the initial transaction's commit.
    await cancelUpload(identity).catch(() => {})
    throw error
  } finally {
    signal?.removeEventListener('abort', onAbort)
  }
}

export async function cancelUpload(expected: UploadIdentity) {
  const { db, reference } = context()
  await runTransaction(db, async (transaction) => {
    const current = await transaction.get(reference)
    const data = current.data()
    if (
      current.exists() &&
      data?.uploadId === expected.uploadId &&
      inScope(data, expected) &&
      ['uploading', 'queued'].includes(data.state)
    ) {
      transaction.update(reference, {
        state: 'cancelled',
        updatedAt: serverTimestamp(),
      })
    }
  })
}
