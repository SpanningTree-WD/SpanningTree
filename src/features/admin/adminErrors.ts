export function adminErrorMessage(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
  if (code === 'permission-denied')
    return '편집 권한이 없거나 변경되었습니다. 관리자에게 권한을 확인해 주세요.'
  if (code === 'unavailable' || code === 'auth/network-request-failed')
    return '서버에 연결하지 못했습니다. 입력 내용은 유지됩니다. 연결을 확인하고 다시 시도해 주세요.'
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request')
    return '로그인이 취소되었습니다. 다시 시도할 수 있습니다.'
  if (code === 'auth/popup-blocked')
    return '로그인 팝업이 차단되었습니다. 이 사이트의 팝업을 허용해 주세요.'
  if (code.startsWith('auth/'))
    return '로그인하지 못했습니다. 다시 시도하거나 사이트 운영자에게 문의해 주세요.'
  return error instanceof Error ? error.message : '작업을 완료하지 못했습니다. 다시 시도해 주세요.'
}
