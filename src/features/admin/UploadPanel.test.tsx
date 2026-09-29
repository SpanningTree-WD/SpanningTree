import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { UploadPanel } from './UploadPanel'
import type { UploadRequest } from '../../services/uploads/uploadTypes'
const service = vi.hoisted(() => ({
  watchUpload: vi.fn(),
  queueGitHubUpload: vi.fn(),
  cancelUpload: vi.fn(),
}))
const trigger = vi.hoisted(() => ({ hasUploadTrigger: vi.fn(), triggerUpload: vi.fn() }))
vi.mock('../../services/uploads/triggerUpload', () => trigger)
vi.mock('../../services/uploads/GitHubUploadService', () => service)
let notify: (request: UploadRequest | null) => void
const request: UploadRequest = {
  uploadId: 'test',
  ownerId: 'editor',
  collection: 'activities',
  recordId: 'saved',
  fileName: '포럼.pdf',
  mediaType: 'application/pdf',
  size: 1000,
  sha256: 'a'.repeat(64),
  chunkCount: 1,
  state: 'queued',
  publicConsent: true,
}
const props = {
  collection: 'activities' as const,
  recordId: 'saved',
  disabled: false,
  image: { alt: '', variant: 'a' },
  files: [],
  onImage: vi.fn(),
  onPdf: vi.fn(),
  onRemovePdf: vi.fn(),
}
beforeEach(() => {
  vi.clearAllMocks()
  service.watchUpload.mockImplementation((callback) => {
    notify = callback
    return () => {}
  })
  service.queueGitHubUpload.mockResolvedValue(undefined)
  trigger.hasUploadTrigger.mockReturnValue(false)
  trigger.triggerUpload.mockResolvedValue('requested')
})
afterEach(cleanup)
function show(recordId = 'saved') {
  render(
    <MemoryRouter>
      <UploadPanel {...props} recordId={recordId} />
    </MemoryRouter>
  )
  fireEvent.click(screen.getByText('이미지·PDF 첨부 (선택)'))
}
it('requires a saved record and clearly explains public storage', () => {
  show('')
  expect(screen.getByText(/먼저 임시 저장/)).toBeVisible()
  expect(screen.getByText(/글을 비공개로 해도 파일은 공개/)).toBeVisible()
  expect(screen.queryByLabelText('PDF · 20MB 이하')).not.toBeInTheDocument()
})
it('queues a selected file, blocks overlapping uploads and only attaches after deployment', async () => {
  show()
  const file = new File(['%PDF-1.4'], '포럼.pdf', { type: 'application/pdf' })
  await act(async () =>
    fireEvent.change(screen.getByLabelText('PDF · 20MB 이하'), { target: { files: [file] } })
  )
  expect(service.queueGitHubUpload).toHaveBeenCalledWith(
    file,
    'activities',
    'saved',
    expect.any(Function)
  )
  act(() => notify(request))
  expect(screen.getByLabelText('PDF · 20MB 이하')).toBeDisabled()
  expect(screen.queryByRole('button', { name: '글에 첨부' })).not.toBeInTheDocument()
  act(() => notify({ ...request, state: 'committed', url: `/uploads/${request.sha256}.pdf` }))
  expect(screen.queryByRole('button', { name: '글에 첨부' })).not.toBeInTheDocument()
  act(() => notify({ ...request, state: 'complete', url: `/uploads/${request.sha256}.pdf` }))
  fireEvent.click(screen.getByRole('button', { name: '글에 첨부' }))
  expect(props.onPdf).toHaveBeenCalledWith(
    expect.objectContaining({ fileName: '포럼.pdf', url: `/uploads/${request.sha256}.pdf` })
  )
})
it('keeps another record’s upload attached to its original target', () => {
  show()
  act(() =>
    notify({
      ...request,
      recordId: 'another',
      state: 'complete',
      url: `/uploads/${request.sha256}.pdf`,
    })
  )
  expect(screen.queryByRole('button', { name: '글에 첨부' })).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: '해당 글로 이동' })).toHaveAttribute(
    'href',
    '/admin/activities/another/edit'
  )
})
it('explains immediate dispatch and allows retrying a queued file without re-uploading', async () => {
  trigger.hasUploadTrigger.mockReturnValue(true)
  show()
  act(() => notify(request))
  expect(screen.getByText(/파일 전송 후 바로 처리 시작/)).toBeVisible()
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '지금 처리 요청' })))
  expect(trigger.triggerUpload).toHaveBeenCalledWith(request.uploadId)
  expect(service.queueGitHubUpload).not.toHaveBeenCalled()
  expect(screen.getByText(/처리 시작을 요청했습니다/)).toBeVisible()
})
