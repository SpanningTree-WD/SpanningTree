import { doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore'
import { getFirebaseServices } from '../firebase/firebase'
import { keepUploadSession } from '../uploads/authoringSession'
import { triggerDiagram } from '../uploads/triggerUpload'
import type { UploadScope } from '../uploads/GitHubUploadService'

export const DIAGRAM_ENGINE = 'sandbox-v1'
export async function diagramHash(language: string, source: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(DIAGRAM_ENGINE + '\n' + language + '\n' + source.replace(/\r\n/g, '\n').trim()))
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}
// Timing out stops this browser's wait, not the server job. A later call joins
// the same request or recovers its completed result instead of replacing it.
export const DIAGRAM_WAIT_MS = 20 * 60 * 1000
const activeStates = ['queued', 'processing', 'committed']
const isDiagramUrl = (url: unknown): url is string => typeof url === 'string' && /^\/uploads\/[a-f0-9]{64}\.png$/.test(url)
function checkAbort(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')
}
export async function compileDiagram(
  scope: UploadScope,
  language: 'tikz' | 'asymptote',
  source: string,
  signal: AbortSignal,
  onState: (state: string) => void,
  onNotice: (message: string) => void = () => {},
): Promise<{ url: string; sourceHash: string }> {
  if (!source.trim() || source.length > 20000) throw new Error('도형 소스는 1~20,000자로 입력해 주세요.')
  checkAbort(signal)
  const { auth, firestore } = getFirebaseServices()
  if (!auth.currentUser?.emailVerified) throw new Error('관리자 계정으로 다시 로그인해 주세요.')
  await keepUploadSession(scope)
  const uid = auth.currentUser.uid
  const reference = doc(firestore, 'diagramRequests', uid)
  const newRequestId = crypto.randomUUID()
  const sourceHash = await diagramHash(language, source)
  checkAbort(signal)
  const request = await runTransaction(firestore, async transaction => {
    const old = (await transaction.get(reference)).data()
    checkAbort(signal)
    const same = old?.ownerId === uid && old.collection === scope.collection &&
      old.recordId === scope.recordId && old.language === language &&
      old.engine === DIAGRAM_ENGINE && old.sourceHash === sourceHash
    if (same && old.state === 'complete' && isDiagramUrl(old.url))
      return { requestId: old.requestId as string, state: 'complete', url: old.url }
    if (old && activeStates.includes(old.state)) {
      if (!same) throw new Error('다른 도형을 처리 중입니다. 기존 도형의 처리가 끝난 뒤 다시 시도해 주세요.')
      return { requestId: old.requestId as string, state: old.state as string }
    }
    transaction.set(reference, { ...scope, requestId: newRequestId, ownerId: uid, language, source, sourceHash, engine: DIAGRAM_ENGINE, state: 'queued', createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    return { requestId: newRequestId, state: 'queued' }
  })
  checkAbort(signal)
  onState(request.state)
  if (request.url) return { url: request.url, sourceHash }
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {}
    let done = false
    const finish = (failure?: Error, url?: string) => {
      if (done) return
      done = true; clearTimeout(timer); unsubscribe(); signal.removeEventListener('abort', abort)
      if (failure) reject(failure); else resolve({ url: url!, sourceHash })
    }
    const abort = () => finish(new DOMException('Cancelled', 'AbortError'))
    const timer = setTimeout(() => finish(new Error('도형 처리가 지연되고 있습니다. 재시도를 누르면 기존 작업에 다시 연결하고 완료된 결과를 가져옵니다.')), DIAGRAM_WAIT_MS)
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) { abort(); return }
    unsubscribe = onSnapshot(reference, snapshot => {
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return
      const data = snapshot.data()
      if (!data || data.requestId !== request.requestId) { finish(new Error('도형 요청이 변경되었습니다. 다시 시도해 주세요.')); return }
      onState(data.state)
      if (data.state === 'failed') finish(new Error(data.error || '도형을 컴파일하지 못했습니다.'))
      else if (data.state === 'complete') {
        if (isDiagramUrl(data.url)) finish(undefined, data.url)
        else finish(new Error('도형 결과 주소를 확인하지 못했습니다. 다시 시도해 주세요.'))
      }
    }, error => finish(error))
    if (done) { unsubscribe(); return }
    // Dispatch failure leaves the private request intact for the scheduled worker.
    // Attach the listener first so a fast completion cannot be missed.
    void triggerDiagram(request.requestId).then(result => {
      if (!done) onNotice(result === 'scheduled'
        ? '예약 작업을 기다리고 있습니다. 완료까지 시간이 걸릴 수 있습니다.'
        : '즉시 실행을 요청했습니다. 작업 시작과 컴파일·배포까지 시간이 걸릴 수 있습니다.')
    }, () => {
      if (!done) onNotice('즉시 실행 요청에 실패했습니다. 요청은 보관되어 있으며 예약 작업이 처리합니다.')
    })
  })
}
