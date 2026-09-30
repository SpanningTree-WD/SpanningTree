import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Activity } from '../../models/activity'
import type { Mathematics } from '../../models/mathematics'
import type { Publication } from '../../models/publication'
import type { Attachment } from '../../models/common'
import type { UploadCollection, UploadRequest } from '../../services/uploads/uploadTypes'
import { activityFixtures } from '../../content/fixtures/activities'
import { ActivityEditorPage } from './ActivityEditorPage'
import { MathematicsEditorPage } from './MathematicsEditorPage'
import { PublicationEditorPage } from './PublicationEditorPage'
import { UploadWaitError } from '../../services/uploads/GitHubUploadService'

const repository = vi.hoisted(() => ({
  create: vi.fn(), update: vi.fn(), getById: vi.fn(), listAll: vi.fn(),
  publish: vi.fn(), unpublish: vi.fn(),
}))
const service = vi.hoisted(() => ({
  queueGitHubUpload: vi.fn(), waitForUpload: vi.fn(), watchUpload: vi.fn(), cancelUpload: vi.fn(),
}))
vi.mock('../../repositories/adminRepositories', () => ({
  activityRepository: repository,
  mathematicsRepository: repository,
  publicationRepository: repository,
}))
vi.mock('../../services/uploads/GitHubUploadService', () => ({
  ...service,
  UploadWaitError: class extends Error {
    readonly restart: boolean
    constructor(message: string, restart: boolean) {
      super(message)
      this.name = 'UploadWaitError'
      this.restart = restart
    }
  },
}))

type Article = Activity | Mathematics | Publication
const records = new Map<string, Article>()
const uploads = new Map<string, { file: File; collection: UploadCollection; recordId: string }>()
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const originalImage = '/uploads/' + 'a'.repeat(64) + '.png'
const uploadedImage = '/uploads/' + 'c'.repeat(64) + '.png'
const uploadedPdf = '/uploads/' + 'd'.repeat(64) + '.pdf'
const sharedPdf: Attachment = {
  label: '공유 자료', fileName: 'shared.pdf', mediaType: 'application/pdf', sizeLabel: '1 KB',
  url: '/uploads/' + 'b'.repeat(64) + '.pdf',
}
function activity(id: string): Activity {
  return {
    ...activityFixtures[0],
    id, title: '활동 ' + id, slug: 'activity-' + id, status: 'draft',
    coverImage: { alt: '활동 ' + id, variant: 'a', url: originalImage },
    gallery: [], attachments: [clone(sharedPdf)],
  }
}
function photo(name = 'new-photo.png') {
  return new File(['picture'], name, { type: 'image/png' })
}
function document(name = 'new-notes.pdf') {
  return new File(['%PDF-1.4'], name, { type: 'application/pdf' })
}
function selectFile(label: string, file: File) {
  fireEvent.change(screen.getByLabelText(label), { target: { files: [file] } })
}
function complete(uploadId: string): UploadRequest & { url: string } {
  const item = uploads.get(uploadId)!
  const isPdf = item.file.type === 'application/pdf'
  return {
    uploadId, ownerId: 'editor', collection: item.collection, recordId: item.recordId,
    fileName: item.file.name, mediaType: item.file.type, size: item.file.size,
    sha256: (isPdf ? 'd' : 'c').repeat(64), chunkCount: 1, publicConsent: true,
    state: 'complete', url: isPdf ? uploadedPdf : uploadedImage,
  }
}
function show(initial = '/admin/activities/A/edit') {
  const router = createMemoryRouter([
    { path: '/admin/activities', element: <p>활동 목록 화면</p> },
    { path: '/admin/activities/:id/edit', element: <ActivityEditorPage /> },
    { path: '/admin/activities/new', element: <ActivityEditorPage /> },
    { path: '/admin/mathematics', element: <p>수학 자료 목록 화면</p> },
    { path: '/admin/mathematics/:id/edit', element: <MathematicsEditorPage /> },
    { path: '/admin/mathematics/new', element: <MathematicsEditorPage /> },
    { path: '/admin/publications', element: <p>출판물 목록 화면</p> },
    { path: '/admin/publications/:id/edit', element: <PublicationEditorPage /> },
    { path: '/admin/publications/new', element: <PublicationEditorPage /> },
  ], { initialEntries: [initial] })
  render(<RouterProvider router={router} />)
  return router
}

beforeEach(() => {
  vi.resetAllMocks()
  records.clear()
  uploads.clear()
  records.set('A', activity('A'))
  records.set('B', activity('B'))
  repository.listAll.mockResolvedValue([])
  repository.getById.mockImplementation(async (id: string) => clone(records.get(id) ?? null))
  repository.create.mockImplementation(async (input: Article) => {
    const record = { ...clone(input), id: 'created', status: 'draft' as const }
    records.set(record.id, record)
    return clone(record)
  })
  repository.update.mockImplementation(async (id: string, input: Article) => {
    const record = { ...records.get(id)!, ...clone(input), id }
    records.set(id, record)
    return clone(record)
  })
  repository.publish.mockImplementation(async (id: string) => {
    const record = { ...records.get(id)!, status: 'published' as const }
    records.set(id, record)
    return clone(record)
  })
  repository.unpublish.mockImplementation(async (id: string) => {
    const record = { ...records.get(id)!, status: 'draft' as const }
    records.set(id, record)
    return clone(record)
  })
  service.queueGitHubUpload.mockImplementation(async (
    file: File, collection: UploadCollection, recordId: string, progress: (value: number) => void
  ) => {
    const uploadId = 'upload-' + service.queueGitHubUpload.mock.calls.length
    uploads.set(uploadId, { file, collection, recordId })
    progress(100)
    return { uploadId, trigger: 'requested' }
  })
  service.cancelUpload.mockResolvedValue(undefined)
  service.watchUpload.mockImplementation(() => () => {})
  service.waitForUpload.mockImplementation(async (_scope: unknown, uploadId: string) => complete(uploadId))
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  let objectNumber = 0
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = vi.fn(() => 'blob:local-' + ++objectNumber)
    static revokeObjectURL = vi.fn()
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it.each(['activities', 'mathematics', 'publications'])(
  '%s previews a locally selected photo and file before any remote write and retains them across toggles',
  async (collection) => {
    show('/admin/' + collection + '/new')
    await screen.findByLabelText(/제목/)
    fireEvent.change(screen.getByLabelText(/제목/), { target: { value: '새 첨부 글' } })
    const image = photo(), pdf = document()
    selectFile('대표 이미지 · 8MB 이하', image)
    selectFile('PDF · 20MB 이하', pdf)
    fireEvent.click(screen.getByRole('button', { name: '미리보기' }))
    const preview = screen.getByRole('region', { name: '글 미리보기' })
    expect(within(preview).getByRole('img', { name: '새 첨부 글' })).toHaveAttribute('src', 'blob:local-1')
    const panel = screen.getByRole('region', { name: '이 글의 첨부 파일' })
    expect(within(panel).getByText(pdf.name)).toBeVisible()
    expect(within(preview).getByText(pdf.name)).toBeVisible()
    expect(within(panel).getAllByText('이 글에 첨부 예정 · 저장 필요')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: '작성', exact: true }))
    expect(screen.getByLabelText(/제목/)).toHaveValue('새 첨부 글')
    expect(screen.getByText(image.name)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '미리보기' }))
    expect(within(screen.getByRole('region', { name: '글 미리보기' }))
      .getByRole('img', { name: '새 첨부 글' })).toHaveAttribute('src', 'blob:local-1')
    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    expect(repository.create).not.toHaveBeenCalled()
    expect(repository.update).not.toHaveBeenCalled()
    expect(service.queueGitHubUpload).not.toHaveBeenCalled()
    expect(service.watchUpload).not.toHaveBeenCalled()
  }
)

it('reveals validation errors when saving an incomplete article from preview mode', async () => {
  show('/admin/activities/new')
  await screen.findByLabelText(/제목/)
  selectFile('대표 이미지 · 8MB 이하', photo())
  fireEvent.click(screen.getByRole('button', { name: '미리보기' }))
  fireEvent.click(screen.getByRole('button', { name: '임시 저장' }))
  expect(await screen.findByText('제목을 입력해 주세요.')).toBeVisible()
  expect(screen.getByLabelText(/제목/)).toBeVisible()
  expect(screen.getByText('new-photo.png')).toBeVisible()
  expect(repository.create).not.toHaveBeenCalled()
  expect(service.queueGitHubUpload).not.toHaveBeenCalled()
})

it('drops local photos, filenames and preview state when moving from A to B and then a new article', async () => {
  const router = show()
  await screen.findByDisplayValue('활동 A')
  selectFile('대표 이미지 · 8MB 이하', photo('only-A.png'))
  selectFile('PDF · 20MB 이하', document('only-A.pdf'))
  fireEvent.click(screen.getByRole('button', { name: '미리보기' }))
  await act(async () => { await router.navigate('/admin/activities/B/edit') })
  await screen.findByDisplayValue('활동 B')
  expect(screen.queryByRole('region', { name: '글 미리보기' })).not.toBeInTheDocument()
  expect(screen.queryByText('only-A.png')).not.toBeInTheDocument()
  expect(screen.queryByText('only-A.pdf')).not.toBeInTheDocument()
  expect(screen.queryByText('이 글에 첨부 예정 · 저장 필요')).not.toBeInTheDocument()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-1')
  expect(screen.getByRole('link', { name: /shared.pdf/ })).toHaveAttribute('href', sharedPdf.url)
  selectFile('대표 이미지 · 8MB 이하', photo('only-B.png'))
  await act(async () => { await router.navigate('/admin/activities/new') })
  await screen.findByRole('heading', { name: '새 활동 작성' })
  expect(screen.getByLabelText(/제목/)).toHaveValue('')
  expect(screen.queryByText('only-B.png')).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /shared.pdf/ })).not.toBeInTheDocument()
  expect(screen.getByText('이 글에 선택한 첨부 파일이 없습니다.')).toBeVisible()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-2')
  expect(service.queueGitHubUpload).not.toHaveBeenCalled()
})

it('cancels an edit without changing original attachments or another article sharing the PDF', async () => {
  const router = show()
  await screen.findByDisplayValue('활동 A')
  fireEvent.click(screen.getByRole('button', { name: '이미지 첨부 해제' }))
  fireEvent.click(screen.getByRole('button', { name: 'PDF 첨부 해제' }))
  selectFile('대표 이미지 · 8MB 이하', photo('discard.png'))
  fireEvent.click(screen.getByRole('button', { name: '작성 취소' }))
  await screen.findByText('활동 목록 화면')
  expect(repository.update).not.toHaveBeenCalled()
  expect(service.queueGitHubUpload).not.toHaveBeenCalled()
  expect(records.get('A')).toEqual(activity('A'))
  expect(records.get('B')).toEqual(activity('B'))
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-1')
  await act(async () => { await router.navigate('/admin/activities/A/edit') })
  await screen.findByDisplayValue('활동 A')
  expect(screen.getByRole('link', { name: '현재 대표 이미지 ↗' })).toHaveAttribute('href', originalImage)
  expect(screen.getByRole('link', { name: /shared.pdf/ })).toHaveAttribute('href', sharedPdf.url)
})

it('saves detached references only on A while B keeps the same shared file', async () => {
  show()
  await screen.findByDisplayValue('활동 A')
  fireEvent.click(screen.getByRole('button', { name: 'PDF 첨부 해제' }))
  fireEvent.click(screen.getByRole('button', { name: '임시 저장' }))
  await screen.findByText('저장했습니다.')
  expect((records.get('A') as Activity).attachments).toEqual([])
  expect((records.get('B') as Activity).attachments).toEqual([sharedPdf])
  expect(repository.update).toHaveBeenCalledTimes(1)
  expect(repository.update.mock.calls[0][0]).toBe('A')
  expect(service.cancelUpload).not.toHaveBeenCalled()
})

it('creates a draft, uploads its selected files, then saves durable references that survive reopening', async () => {
  const router = show('/admin/activities/new')
  await screen.findByLabelText(/제목/)
  fireEvent.change(screen.getByLabelText(/제목/), { target: { value: '첨부 저장 시험' } })
  fireEvent.change(screen.getByLabelText(/활동 날짜/), { target: { value: '2026-09-30' } })
  fireEvent.change(screen.getByLabelText(/활동 유형/), { target: { value: 'Forum' } })
  const image = photo(), pdf = document()
  selectFile('대표 이미지 · 8MB 이하', image)
  selectFile('PDF · 20MB 이하', pdf)
  fireEvent.click(screen.getByRole('button', { name: '임시 저장' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/admin/activities/created/edit'))
  await screen.findByDisplayValue('첨부 저장 시험')
  const saved = records.get('created') as Activity
  expect(repository.create).toHaveBeenCalledOnce()
  expect(saved.coverImage.url).toBe(uploadedImage)
  expect(saved.attachments).toEqual([expect.objectContaining({ fileName: pdf.name, url: uploadedPdf })])
  expect(service.queueGitHubUpload).toHaveBeenNthCalledWith(
    1, image, 'activities', 'created', expect.any(Function), expect.any(AbortSignal)
  )
  expect(service.queueGitHubUpload).toHaveBeenNthCalledWith(
    2, pdf, 'activities', 'created', expect.any(Function), expect.any(AbortSignal)
  )
  expect(service.waitForUpload).toHaveBeenCalledTimes(2)
  expect(repository.create.mock.invocationCallOrder[0]).toBeLessThan(service.queueGitHubUpload.mock.invocationCallOrder[0])
  expect(service.waitForUpload.mock.invocationCallOrder[1]).toBeLessThan(repository.update.mock.invocationCallOrder[0])
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-1')
  await act(async () => { await router.navigate('/admin/activities') })
  await act(async () => { await router.navigate('/admin/activities/created/edit') })
  await screen.findByDisplayValue('첨부 저장 시험')
  fireEvent.click(screen.getByRole('button', { name: '미리보기' }))
  const preview = screen.getByRole('region', { name: '글 미리보기' })
  expect(within(preview).getByRole('img', { name: '첨부 저장 시험' })).toHaveAttribute('src', uploadedImage)
  expect(within(preview).getByRole('link', { name: 'PDF 다운로드' })).toHaveAttribute('href', uploadedPdf)
  expect(service.queueGitHubUpload).toHaveBeenCalledTimes(2)
})

it('retries a failed attachment using the same selected File and saves it to its original article', async () => {
  service.waitForUpload.mockRejectedValueOnce(new UploadWaitError('파일 처리 실패', true))
  show()
  await screen.findByDisplayValue('활동 A')
  const pdf = document('retry-this.pdf')
  selectFile('PDF · 20MB 이하', pdf)
  fireEvent.click(screen.getByRole('button', { name: '임시 저장' }))
  const retry = await screen.findByRole('button', { name: '첨부 재시도 및 저장' })
  expect(screen.getByText(pdf.name)).toBeVisible()
  expect(repository.update).not.toHaveBeenCalled()
  fireEvent.click(retry)
  await screen.findByText('저장했습니다.')
  expect(service.queueGitHubUpload).toHaveBeenCalledTimes(2)
  expect(service.queueGitHubUpload.mock.calls.every(([file, collection, id]) =>
    file === pdf && collection === 'activities' && id === 'A'
  )).toBe(true)
  expect((records.get('A') as Activity).attachments).toEqual([
    sharedPdf, expect.objectContaining({ fileName: pdf.name, url: uploadedPdf }),
  ])
  expect(records.get('B')).toEqual(activity('B'))
})

it('ignores a late upload completion after navigation and removes its progress from B', async () => {
  let finish!: (result: UploadRequest & { url: string }) => void
  service.waitForUpload.mockReturnValueOnce(new Promise((resolve) => { finish = resolve }))
  const router = show()
  await screen.findByDisplayValue('활동 A')
  selectFile('대표 이미지 · 8MB 이하', photo('pending-A.png'))
  fireEvent.click(screen.getByRole('button', { name: '임시 저장' }))
  await waitFor(() => expect(service.waitForUpload).toHaveBeenCalledOnce())
  expect(screen.getByRole('progressbar', { name: 'pending-A.png 업로드 진행률' })).toBeVisible()
  const signal = service.waitForUpload.mock.calls[0][2] as AbortSignal
  await act(async () => { await router.navigate('/admin/activities/B/edit') })
  await screen.findByDisplayValue('활동 B')
  expect(signal.aborted).toBe(true)
  expect(screen.queryByText('pending-A.png')).not.toBeInTheDocument()
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  await act(async () => { finish(complete('upload-1')) })
  expect(screen.getByLabelText(/제목/)).toHaveValue('활동 B')
  expect(screen.queryByText('저장했습니다.')).not.toBeInTheDocument()
  expect(repository.update).not.toHaveBeenCalled()
  expect(records.get('A')).toEqual(activity('A'))
  expect(records.get('B')).toEqual(activity('B'))
})
