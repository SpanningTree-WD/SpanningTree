import { doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore'
import { getFirebaseServices } from '../firebase/firebase'
import { keepUploadSession } from '../uploads/authoringSession'
import type { UploadScope } from '../uploads/GitHubUploadService'

export const DIAGRAM_ENGINE = 'sandbox-v1'
export async function diagramHash(language: string, source: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(DIAGRAM_ENGINE + '\n' + language + '\n' + source.replace(/\r\n/g, '\n').trim()))
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}
export async function compileDiagram(scope: UploadScope, language: 'tikz' | 'asymptote', source: string, signal: AbortSignal, onState: (state: string) => void): Promise<{ url: string; sourceHash: string }> {
  if (!source.trim() || source.length > 20000) throw new Error('도형 소스는 1~20,000자로 입력해 주세요.')
  const { auth, firestore } = getFirebaseServices()
  if (!auth.currentUser?.emailVerified) throw new Error('관리자 계정으로 다시 로그인해 주세요.')
  await keepUploadSession(scope)
  const uid = auth.currentUser.uid
  const reference = doc(firestore, 'diagramRequests', uid)
  const requestId = crypto.randomUUID()
  const sourceHash = await diagramHash(language, source)
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')
  await runTransaction(firestore, async transaction => {
    const old = await transaction.get(reference)
    if (old.exists() && ['queued', 'processing', 'committed'].includes(old.data().state))
      throw new Error('이전 도형을 처리 중입니다. 완료 후 다시 시도해 주세요.')
    transaction.set(reference, { ...scope, requestId, ownerId: uid, language, source, sourceHash, engine: DIAGRAM_ENGINE, state: 'queued', createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  })
  onState('queued')
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {}
    let done = false
    const finish = (failure?: Error, url?: string) => {
      if (done) return
      done = true; clearTimeout(timer); unsubscribe(); signal.removeEventListener('abort', abort)
      if (failure) reject(failure); else resolve({ url: url!, sourceHash })
    }
    const abort = () => finish(new DOMException('Cancelled', 'AbortError'))
    const timer = setTimeout(() => finish(new Error('도형 처리가 지연되고 있습니다. 잠시 후 다시 시도해 주세요.')), 20 * 60 * 1000)
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) { abort(); return }
    unsubscribe = onSnapshot(reference, snapshot => {
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return
      const data = snapshot.data()
      if (!data || data.requestId !== requestId) { finish(new Error('도형 요청이 변경되었습니다. 다시 시도해 주세요.')); return }
      onState(data.state)
      if (data.state === 'failed') finish(new Error(data.error || '도형을 컴파일하지 못했습니다.'))
      else if (data.state === 'complete' && /^\/uploads\/[a-f0-9]{64}\.png$/.test(data.url)) finish(undefined, data.url)
    }, error => finish(error))
    if (done) unsubscribe()
  })
}
