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
import { editorView, setEditorText } from '../../test/editor'
import { undo } from '@codemirror/commands'
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

vi.mock('./ConnectionPickers', () => ({ PeoplePicker: () => null, RelatedPicker: () => null }))
vi.mock('../../services/uploads/authoringSession', () => ({ keepUploadSession: vi.fn(async () => {}), closeUploadSession: vi.fn(async () => {}) }))

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
  repository.create.mockImplementation(async (input: Article, reservedId: string) => {
    const record = { ...clone(input), id: reservedId, status: 'draft' as const }
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


function tabPreview() { fireEvent.click(screen.getAllByRole('button', { name: '미리보기' })[0]) }
function tabWrite() { fireEvent.click(screen.getByRole('button', { name: '작성' })) }
function fileCard(name: string): HTMLElement {
  const panel = screen.getByRole('region', { name: '이 글의 첨부 파일' })
  const found = [...panel.querySelectorAll<HTMLElement>('.composer-attachment')].find(item => item.querySelector('strong')?.textContent === name)
  if (!found) throw new Error('Missing file card: ' + name)
  return found
}
async function ready() {
  await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument())
  expect(screen.queryByText('첨부 실패')).not.toBeInTheDocument()
}
it.each(['activities', 'mathematics', 'publications'])('%s previews selected photos and files before saving the article', async collection => {
  service.waitForUpload.mockReturnValue(new Promise(() => {}))
  show('/admin/' + collection + '/new')
  await screen.findByLabelText(/제목/)
  selectFile('사진 선택', photo())
  selectFile('파일 선택', document())
  await waitFor(() => expect(service.waitForUpload).toHaveBeenCalledOnce())
  tabPreview()
  const preview = screen.getByRole('region', { name: '글 미리보기' })
  expect(within(preview).getAllByRole('img', { name: 'new-photo.png' })[0]).toHaveAttribute('src', 'blob:local-1')
  expect(within(preview).getAllByText('new-notes.pdf').length).toBeGreaterThan(0)
  tabWrite()
  expect(fileCard('new-photo.png')).toBeVisible()
  expect(repository.create).not.toHaveBeenCalled()
  expect(repository.update).not.toHaveBeenCalled()
})
it('shows validation errors without discarding selected attachments', async () => {
  show('/admin/activities/new')
  await screen.findByLabelText(/제목/)
  selectFile('사진 선택', photo())
  await waitFor(() => expect(service.waitForUpload).toHaveBeenCalledOnce())
  await ready()
  tabPreview()
  fireEvent.click(screen.getByRole('button', { name: '임시 저장' }))
  expect(await screen.findByText('제목을 입력해 주세요.')).toBeVisible()
  expect(fileCard('new-photo.png')).toBeVisible()
  expect(repository.create).not.toHaveBeenCalled()
})
it('pastes at the cursor, preserves typing and cursor on completion, and keeps undo', async () => {
  let finish!: (value: UploadRequest & { url: string }) => void
  service.waitForUpload.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
  show()
  await screen.findByDisplayValue('활동 A')
  const element = screen.getByRole('textbox', { name: '활동 내용' })
  const view = editorView(element)
  setEditorText(element, 'Before After')
  act(() => view.dispatch({ selection: { anchor: 7 } }))
  const image = photo('clipboard.png')
  fireEvent.paste(element, { clipboardData: { items: [{ kind: 'file', type: image.type, getAsFile: () => image }], getData: () => '' } })
  await waitFor(() => expect(service.waitForUpload).toHaveBeenCalledOnce())
  expect(view.state.doc.toString()).toMatch(/^Before \n\n\{\{asset:.+\}\}\n\nAfter$/)
  act(() => view.dispatch({ changes: { from: view.state.selection.main.head, insert: 'Still typing ' }, selection: { anchor: view.state.selection.main.head + 13 }, userEvent: 'input' }))
  const body = view.state.doc.toString(), cursor = view.state.selection.main.head
  await act(async () => finish(complete('upload-1')))
  expect(view.state.doc.toString()).toBe(body)
  expect(view.state.selection.main.head).toBe(cursor)
  expect(view.dom.querySelector('img[alt="clipboard.png"]')).toBeTruthy()
  act(() => { undo(view) })
  expect(view.state.doc.toString()).not.toBe(body)
  // Normal text paste remains CodeMirror's native input path.
  fireEvent.paste(element, { clipboardData: { items: [], getData: () => 'plain text' } })
  expect(view.state.doc.toString()).toContain('plain text')
})
it('dropzone adds a list item, insert adds a body block, body removal keeps the attachment', async () => {
  show()
  await screen.findByDisplayValue('활동 A')
  const image = photo('dropped.png')
  fireEvent.drop(screen.getByRole('button', { name: '사진이나 파일을 끌어다 놓거나 클릭해서 첨부' }), { dataTransfer: { files: [image] } })
  await waitFor(() => expect(service.waitForUpload).toHaveBeenCalledOnce())
  await ready()
  const view = editorView(screen.getByRole('textbox', { name: '활동 내용' }))
  expect(view.state.doc.toString()).not.toContain('{{asset:')
  fireEvent.click(within(fileCard(image.name)).getByRole('button', { name: '본문에 삽입' }))
  expect(view.state.doc.toString()).toContain('{{asset:')
  fireEvent.click(within(view.dom).getByRole('button', { name: '본문에서 제거' }))
  expect(view.state.doc.toString()).not.toContain('{{asset:')
  expect(fileCard(image.name)).toBeVisible()
})
it('does not carry files or states from A to B or a new article, even with late completion', async () => {
  let finish!: (value: UploadRequest & { url: string }) => void
  service.waitForUpload.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
  const router = show()
  await screen.findByDisplayValue('활동 A')
  selectFile('사진 선택', photo('only-A.png'))
  await waitFor(() => expect(service.waitForUpload).toHaveBeenCalledOnce())
  const signal = service.waitForUpload.mock.calls[0][2] as AbortSignal
  await act(async () => { await router.navigate('/admin/activities/B/edit') })
  await screen.findByDisplayValue('활동 B')
  expect(signal.aborted).toBe(true)
  await act(async () => finish(complete('upload-1')))
  expect(screen.queryByText('only-A.png')).not.toBeInTheDocument()
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  expect(records.get('B')).toEqual(activity('B'))
  await act(async () => { await router.navigate('/admin/activities/new') })
  await screen.findByRole('heading', { name: '새 활동 작성' })
  expect(screen.getByLabelText(/제목/)).toHaveValue('')
  expect(screen.queryByText('shared.pdf')).not.toBeInTheDocument()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-1')
})
it('cancel preserves original attachments and files shared by other articles', async () => {
  const router = show()
  await screen.findByDisplayValue('활동 A')
  fireEvent.click(within(fileCard('shared.pdf')).getByRole('button', { name: '첨부 삭제' }))
  selectFile('사진 선택', photo('discard.png'))
  fireEvent.click(screen.getByRole('button', { name: '작성 취소' }))
  await screen.findByText('활동 목록 화면')
  expect(repository.update).not.toHaveBeenCalled()
  expect(records.get('A')).toEqual(activity('A'))
  expect(records.get('B')).toEqual(activity('B'))
  await act(async () => { await router.navigate('/admin/activities/A/edit') })
  await screen.findByDisplayValue('활동 A')
  expect(fileCard('shared.pdf')).toBeVisible()
})
it('deleting a used attachment removes its insertions only in A and leaves B unchanged', async () => {
  show()
  await screen.findByDisplayValue('활동 A')
  const file = fileCard('shared.pdf')
  fireEvent.click(within(file).getByRole('button', { name: '본문에 삽입' }))
  fireEvent.click(within(file).getByRole('button', { name: '첨부 삭제' }))
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('본문에서 사용 중'))
  const view = editorView(screen.getByRole('textbox', { name: '활동 내용' }))
  expect(view.state.doc.toString()).not.toContain('{{asset:')
  fireEvent.click(screen.getByRole('button', { name: '임시 저장' }))
  await screen.findByText('저장했습니다.')
  expect((records.get('A') as Activity).attachments).toEqual([])
  expect((records.get('B') as Activity).attachments).toEqual([sharedPdf])
})
it('uploads multiple files to a reserved article ID, saves and reopens durable inline images and files', async () => {
  const router = show('/admin/activities/new')
  await screen.findByLabelText(/제목/)
  fireEvent.change(screen.getByLabelText(/제목/), { target: { value: '첨부 저장 시험' } })
  fireEvent.change(screen.getByLabelText(/활동 날짜/), { target: { value: '2026-09-30' } })
  fireEvent.change(screen.getByLabelText(/활동 유형/), { target: { value: 'Forum' } })
  fireEvent.change(screen.getByLabelText('첨부 파일 선택'), { target: { files: [photo(), document()] } })
  await waitFor(() => expect(service.waitForUpload).toHaveBeenCalledTimes(2))
  await ready()
  fireEvent.click(within(fileCard('new-photo.png')).getByRole('button', { name: '본문에 삽입' }))
  fireEvent.click(within(fileCard('new-notes.pdf')).getByRole('button', { name: '본문에 삽입' }))
  const reserved = service.queueGitHubUpload.mock.calls[0][2]
  expect(service.queueGitHubUpload.mock.calls[1][2]).toBe(reserved)
  expect(repository.create).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '임시 저장' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/admin/activities/' + reserved + '/edit'))
  await screen.findByDisplayValue('첨부 저장 시험')
  const saved = records.get(reserved)!
  expect(saved.assets).toEqual(expect.arrayContaining([expect.objectContaining({ url: uploadedImage }), expect.objectContaining({ url: uploadedPdf })]))
  expect(repository.create).toHaveBeenCalledOnce()
  await act(async () => { await router.navigate('/admin/activities') })
  await act(async () => { await router.navigate('/admin/activities/' + reserved + '/edit') })
  await screen.findByDisplayValue('첨부 저장 시험')
  tabPreview()
  const preview = screen.getByRole('region', { name: '글 미리보기' })
  expect(within(preview).getAllByRole('img', { name: 'new-photo.png' })[0]).toHaveAttribute('src', uploadedImage)
  expect(within(preview).getAllByRole('link', { name: 'new-notes.pdf' })[0]).toHaveAttribute('href', uploadedPdf)
  expect(service.queueGitHubUpload).toHaveBeenCalledTimes(2)
})
it('blocks publishing failed files, retries the same file, and saves only to its original article', async () => {
  service.waitForUpload.mockRejectedValueOnce(new UploadWaitError('파일 처리 실패', true))
  show()
  await screen.findByDisplayValue('활동 A')
  const pdf = document('retry-this.pdf')
  selectFile('파일 선택', pdf)
  await waitFor(() => expect(within(fileCard(pdf.name)).getByText('첨부 실패')).toBeVisible())
  fireEvent.click(screen.getByRole('button', { name: '공개하기' }))
  expect(await screen.findByText(/업로드 중이거나 실패한 첨부가 있습니다/)).toBeVisible()
  expect(repository.update).not.toHaveBeenCalled()
  expect(repository.publish).not.toHaveBeenCalled()
  fireEvent.click(within(fileCard(pdf.name)).getByRole('button', { name: '재시도' }))
  await waitFor(() => expect(service.waitForUpload).toHaveBeenCalledTimes(2))
  await ready()
  fireEvent.click(screen.getByRole('button', { name: '임시 저장' }))
  await screen.findByText('저장했습니다.')
  expect(service.queueGitHubUpload.mock.calls.every(([file, collection, id]) => file === pdf && collection === 'activities' && id === 'A')).toBe(true)
  expect(records.get('A')?.assets).toContainEqual(expect.objectContaining({ fileName: pdf.name, url: uploadedPdf }))
  expect(records.get('B')).toEqual(activity('B'))
})
