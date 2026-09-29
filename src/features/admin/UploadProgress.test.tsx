import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { UploadProgress } from './UploadProgress'
import type { UploadRequest } from '../../services/uploads/uploadTypes'

const now = Date.parse('2026-09-29T10:30:00Z')
const request: UploadRequest = {
  uploadId: 'upload',
  ownerId: 'editor',
  collection: 'activities',
  recordId: 'saved',
  fileName: '포럼.pdf',
  mediaType: 'application/pdf',
  size: 5 * 1024 * 1024,
  sha256: 'a'.repeat(64),
  chunkCount: 10,
  state: 'queued',
  publicConsent: true,
  createdAtMs: now - 90_000,
  updatedAtMs: now - 80_000,
}
const props = {
  request,
  pending: null,
  percent: null,
  connection: 'live' as const,
  immediate: true,
}
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it('shows a real transfer percentage and an estimate only after speed can be measured', () => {
  render(
    <UploadProgress
      {...props}
      request={{ ...request, state: 'uploading' }}
      percent={25}
      pending={{
        fileName: request.fileName,
        size: request.size,
        startedAtMs: now - 10_000,
      }}
    />
  )
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25')
  expect(screen.getByText('전송 25%')).toBeVisible()
  expect(screen.getByText(/파일 전송 약 30초 남음/)).toBeVisible()
})
it('restores elapsed time from the server, tracks stages and never invents deployment percentages', () => {
  const view = render(<UploadProgress {...props} />)
  expect(screen.getByText('경과 1분 30초')).toBeVisible()
  expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow')
  act(() => vi.advanceTimersByTime(10_000))
  expect(screen.getByText('경과 1분 40초')).toBeVisible()
  view.rerender(
    <UploadProgress {...props} request={{ ...request, state: 'committed' }} percent={100} />
  )
  expect(screen.getByRole('progressbar', { name: '사이트 반영 중' })).not.toHaveAttribute(
    'aria-valuenow'
  )
  expect(screen.getByText('사이트 반영', { selector: 'li' })).toHaveAttribute(
    'aria-current',
    'step'
  )
  expect(screen.queryByText('완료 100%')).not.toBeInTheDocument()
  view.rerender(
    <UploadProgress {...props} request={{ ...request, state: 'complete', updatedAtMs: now }} />
  )
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  act(() => vi.advanceTimersByTime(60_000))
  expect(screen.getByText('총 소요 1분 30초')).toBeVisible()
})
it('shows a new file immediately before any request document is received', () => {
  render(
    <UploadProgress
      {...props}
      request={null}
      percent={0}
      pending={{ fileName: '새 파일.pdf', size: 1000, startedAtMs: now }}
    />
  )
  expect(screen.getByText('새 파일.pdf')).toBeVisible()
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  expect(screen.getByText('경과 0초')).toBeVisible()
})
it('warns about cached status and prolonged waits without falsely reporting failure', () => {
  const old = { ...request, updatedAtMs: now - 360_000 }
  const view = render(<UploadProgress {...props} request={old} connection="cached" />)
  expect(screen.getByText(/서버에 연결해 최신 상태/)).toBeVisible()
  expect(screen.getByRole('progressbar')).toHaveClass('is-paused')
  expect(screen.queryByText(/마지막 단계 변경/)).not.toBeInTheDocument()
  view.rerender(<UploadProgress {...props} request={old} />)
  expect(screen.getByText(/마지막 단계 변경 후 6분 0초/)).toBeVisible()
  expect(screen.queryByText('업로드를 완료하지 못했습니다')).not.toBeInTheDocument()
})
it('reflects offline and recovery events without fabricating server progress', () => {
  const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  render(<UploadProgress {...props} />)
  online.mockReturnValue(false)
  act(() => window.dispatchEvent(new Event('offline')))
  expect(screen.getByText(/오프라인입니다/)).toBeVisible()
  online.mockReturnValue(true)
  act(() => window.dispatchEvent(new Event('online')))
  expect(screen.queryByText(/오프라인입니다/)).not.toBeInTheDocument()
  online.mockRestore()
})
it('explains scheduled fallback and cannot present cancellation or failure as completion', () => {
  const view = render(<UploadProgress {...props} immediate={false} />)
  expect(screen.getByText(/예약 확인은 5분 간격/)).toBeVisible()
  view.rerender(<UploadProgress {...props} request={{ ...request, state: 'cancelled' }} />)
  expect(screen.getByText('취소 처리 중')).toBeVisible()
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  view.rerender(<UploadProgress {...props} request={{ ...request, state: 'failed' }} />)
  expect(screen.getByText('업로드를 완료하지 못했습니다')).toBeVisible()
  expect(screen.queryByText('완료 100%')).not.toBeInTheDocument()
})
