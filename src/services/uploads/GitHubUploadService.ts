import {
  Bytes,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { getFirebaseServices } from '../firebase/firebase'
import { triggerUpload } from './triggerUpload'
import {
  isUploadActive,
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  UPLOAD_CHUNK_BYTES,
  validateUpload,
  type UploadCollection,
  type UploadRequest,
} from './uploadTypes'

function context() {
  const { auth, firestore } = getFirebaseServices()
  const user = auth.currentUser
  if (!user?.emailVerified) throw new Error('관리자 계정으로 다시 로그인해 주세요.')
  return { db: firestore, uid: user.uid, reference: doc(firestore, 'uploadRequests', user.uid) }
}

export function watchUpload(
  onChange: (value: UploadRequest | null) => void,
  onError: (error: unknown) => void
) {
  const { reference } = context()
  return onSnapshot(
    reference,
    (snapshot) => onChange(snapshot.exists() ? (snapshot.data() as UploadRequest) : null),
    onError
  )
}

export async function queueGitHubUpload(
  file: File,
  collection: UploadCollection,
  recordId: string,
  onProgress: (percent: number) => void
) {
  if (!recordId) throw new Error('글을 먼저 임시 저장한 뒤 파일을 첨부해 주세요.')
  if (!file.size || file.size > (file.type === 'application/pdf' ? MAX_PDF_BYTES : MAX_IMAGE_BYTES))
    throw new Error('이미지는 8MB, PDF는 20MB까지 올릴 수 있습니다.')
  const bytes = new Uint8Array(await file.arrayBuffer())
  validateUpload(bytes, file.type)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
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
  await runTransaction(db, async (transaction) => {
    const previous = await transaction.get(reference)
    if (previous.exists() && isUploadActive(previous.data().state))
      throw new Error('이전 파일의 처리가 끝난 뒤 새 파일을 올려 주세요.')
    transaction.set(reference, {
      ...request,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  })
  try {
    for (let start = 0; start < request.chunkCount; start += 8) {
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
      onProgress(Math.round((Math.min(start + 8, request.chunkCount) / request.chunkCount) * 100))
    }
    await runTransaction(db, async (transaction) => {
      const current = await transaction.get(reference)
      if (current.data()?.uploadId !== request.uploadId || current.data()?.state !== 'uploading')
        throw new Error('업로드 요청이 변경되었습니다. 다시 확인해 주세요.')
      transaction.update(reference, { state: 'queued', updatedAt: serverTimestamp() })
    })
  } catch (error) {
    await cancelUpload(request.uploadId).catch(() => {})
    throw error
  }
  // Trigger failure must not cancel the successfully queued file.
  try {
    return { trigger: await triggerUpload(request.uploadId) }
  } catch {
    return { trigger: 'scheduled' as const }
  }
}

export async function cancelUpload(expectedId?: string) {
  const { db, reference } = context()
  await runTransaction(db, async (transaction) => {
    const current = await transaction.get(reference)
    if (
      current.exists() &&
      (!expectedId || current.data().uploadId === expectedId) &&
      ['uploading', 'queued'].includes(current.data().state)
    ) {
      transaction.update(reference, { state: 'cancelled', updatedAt: serverTimestamp() })
    }
  })
}
