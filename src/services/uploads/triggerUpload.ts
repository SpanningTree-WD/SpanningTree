import { getFirebaseServices } from '../firebase/firebase'

const endpoint = import.meta.env.VITE_UPLOAD_TRIGGER_URL?.trim() ?? ''
export const hasUploadTrigger = () => Boolean(endpoint)
export type TriggerResult = 'requested' | 'already-processing' | 'scheduled'

export async function triggerUpload(uploadId: string): Promise<TriggerResult> {
  if (!endpoint) return 'scheduled'
  const target = new URL(endpoint)
  if (
    target.protocol !== 'https:' ||
    target.username ||
    target.password ||
    target.pathname !== '/trigger'
  ) {
    throw new Error('즉시 실행 서버 주소가 올바르지 않습니다. 운영자에게 문의해 주세요.')
  }
  const user = getFirebaseServices().auth.currentUser
  if (!user?.emailVerified) throw new Error('관리자 계정으로 다시 로그인해 주세요.')
  const token = await user.getIdToken()
  const response = await fetch(target, {
    method: 'POST',
    credentials: 'omit',
    redirect: 'error',
    signal: AbortSignal.timeout(25_000),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: user.uid, uploadId }),
  })
  if (!response.ok)
    throw new Error('즉시 실행 요청에 실패했습니다. 파일은 보관되어 있으며 예약 작업이 처리합니다.')
  const result = (await response.json()) as { status?: string }
  if (result.status !== 'requested' && result.status !== 'already-processing') {
    throw new Error('즉시 실행 응답을 확인하지 못했습니다. 예약 작업이 계속 처리합니다.')
  }
  return result.status
}
