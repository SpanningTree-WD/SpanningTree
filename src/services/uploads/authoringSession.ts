import { deleteDoc, doc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'
import { getFirebaseServices } from '../firebase/firebase'
import type { UploadScope } from './GitHubUploadService'
function reference(scope: UploadScope) {
  const { auth, firestore } = getFirebaseServices()
  if (!auth.currentUser?.emailVerified) throw new Error('관리자 계정으로 다시 로그인해 주세요.')
  return doc(firestore, 'uploadSessions', auth.currentUser.uid, 'records', scope.recordId)
}
export async function keepUploadSession(scope: UploadScope) {
  await setDoc(reference(scope), { ...scope, expiresAt: Timestamp.fromMillis(Date.now() + 86400000), updatedAt: serverTimestamp() })
}
export async function closeUploadSession(scope: UploadScope) { await deleteDoc(reference(scope)) }
