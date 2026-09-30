import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import type { Attachment, MediaReference } from '../../models/common'
import { useAdminEditor } from './useAdminEditor'

interface Record {
  id: string
  title: string
  slug: string
  type: string
  summary: string
  description: string
  coverImage: MediaReference
  attachments: Attachment[]
  status: 'draft' | 'published'
  createdAt: string
  updatedAt: string
}

const attachmentState = vi.hoisted(() => ({
  hasPending: false,
  prepare: vi.fn(),
  clear: vi.fn(),
  changed: () => {},
}))
vi.mock('./useArticleAttachments', () => ({
  useArticleAttachments: (_collection: string, _session: string, changed: () => void) => {
    attachmentState.changed = changed
    return attachmentState
  },
}))
const repository = {
  listAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  publish: vi.fn(),
  unpublish: vi.fn(),
}
const empty: Record = {
  id: '',
  title: '',
  slug: '',
  type: 'Forum',
  summary: '',
  description: '',
  coverImage: { alt: '', variant: 'a' },
  attachments: [],
  status: 'draft',
  createdAt: '',
  updatedAt: '',
}
const imageA = '/uploads/' + 'a'.repeat(64) + '.png'
const imageB = '/uploads/' + 'b'.repeat(64) + '.png'
const pdf = {
  label: 'Notes',
  fileName: 'notes.pdf',
  mediaType: 'application/pdf' as const,
  sizeLabel: '1 MB',
  url: '/uploads/' + 'c'.repeat(64) + '.pdf',
}
function record(id: string): Record {
  return {
    ...empty,
    id,
    title: 'Article ' + id,
    slug: 'article-' + id,
    coverImage: { ...empty.coverImage, alt: 'Article ' + id, url: imageA },
    attachments: [pdf],
    createdAt: '2026-09-30T00:00:00.000Z',
    updatedAt: '2026-09-30T00:00:00.000Z',
  }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const validate = () => ({})

function Editor() {
  const editor = useAdminEditor(repository, empty, '/admin/activities', validate)
  if (editor.loadError) return <p role="alert">{editor.loadError}</p>
  if (editor.loading) return <p>Loading</p>
  return (
    <div>
      <input aria-label="Title" value={editor.form.title} onChange={(event) => editor.set('title', event.target.value)} />
      <output data-testid="id">{editor.form.id}</output>
      <output data-testid="image">{editor.form.coverImage.url ?? ''}</output>
      <output data-testid="files">{editor.form.attachments.length}</output>
      <output data-testid="preview-alt">{editor.preview.coverImage.alt}</output>
      <output data-testid="preview-open">{String(editor.previewing)}</output>
      <button onClick={() => editor.setPreviewing(!editor.previewing)}>Preview</button>
      <button onClick={() => {
        editor.set('coverImage', { ...editor.form.coverImage, url: undefined })
        editor.set('attachments', [])
      }}>Remove attachments</button>
      <button disabled={editor.saving} onClick={() => void editor.save()}>Save</button>
      <button disabled={editor.saving} onClick={() => void editor.publish()}>Publish</button>
      <button onClick={editor.cancel}>Cancel</button>
      {editor.operationError && <p role="alert">{editor.operationError}</p>}
      <p data-testid="notice">{editor.notice}</p>
    </div>
  )
}
async function show(initial = '/admin/activities/A/edit') {
  const router = createMemoryRouter(
    [
      { path: '/admin/activities', element: <p>Article list</p> },
      { path: '/admin/activities/new', element: <Editor /> },
      { path: '/admin/activities/:id/edit', element: <Editor /> },
    ],
    { initialEntries: [initial] }
  )
  render(<RouterProvider router={router} />)
  await screen.findByLabelText('Title')
  return router
}

beforeEach(() => {
  for (const method of Object.values(repository)) method.mockReset()
  attachmentState.hasPending = false
  attachmentState.prepare.mockReset().mockImplementation(async (input: Record) => input)
  attachmentState.clear.mockReset().mockImplementation(() => {
    attachmentState.hasPending = false
  })
  repository.getById.mockImplementation(async (id: string) => record(id))
  repository.create.mockImplementation(async (input: Record) => ({ ...input, id: 'created', status: 'draft' }))
  repository.update.mockImplementation(async (_id: string, input: Record) => input)
  repository.publish.mockImplementation(async (id: string) => ({ ...record(id), status: 'published' }))
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('cancels attachment removal without changing the saved article or a shared file', async () => {
  const router = await show()
  fireEvent.click(screen.getByRole('button', { name: 'Remove attachments' }))
  expect(screen.getByTestId('image')).toBeEmptyDOMElement()
  expect(screen.getByTestId('files')).toHaveTextContent('0')
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  await screen.findByText('Article list')
  expect(repository.update).not.toHaveBeenCalled()
  expect(repository.create).not.toHaveBeenCalled()
  expect(attachmentState.clear).toHaveBeenCalledOnce()

  await act(async () => { await router.navigate('/admin/activities/A/edit') })
  await screen.findByDisplayValue('Article A')
  expect(screen.getByTestId('image')).toHaveTextContent(imageA)
  expect(screen.getByTestId('files')).toHaveTextContent('1')
})

it('keeps the current edit and local files when cancellation is declined', async () => {
  await show()
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Unsaved' } })
  vi.mocked(window.confirm).mockReturnValue(false)
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.getByLabelText('Title')).toHaveValue('Unsaved')
  expect(attachmentState.clear).not.toHaveBeenCalled()
})

it('aborts attachment preparation on cancel and never saves or publishes its late result', async () => {
  attachmentState.hasPending = true
  const pending = deferred<Record>()
  attachmentState.prepare.mockReturnValue(pending.promise)
  await show()
  fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
  await waitFor(() => expect(attachmentState.prepare).toHaveBeenCalledOnce())
  const signal = attachmentState.prepare.mock.calls[0][1] as AbortSignal
  expect(repository.update).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  await screen.findByText('Article list')
  expect(signal.aborted).toBe(true)
  await act(async () => { pending.resolve({ ...record('A'), coverImage: { ...record('A').coverImage, url: imageB } }) })
  expect(repository.update).not.toHaveBeenCalled()
  expect(repository.publish).not.toHaveBeenCalled()
})

it('ignores an old article save after navigation and keeps the new article operation active', async () => {
  const firstSave = deferred<Record>()
  const secondSave = deferred<Record>()
  repository.update.mockReturnValueOnce(firstSave.promise).mockReturnValueOnce(secondSave.promise)
  const router = await show()
  fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
  await waitFor(() => expect(repository.update).toHaveBeenCalledOnce())
  await act(async () => { await router.navigate('/admin/activities/B/edit') })
  await screen.findByDisplayValue('Article B')
  expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() => expect(repository.update).toHaveBeenCalledTimes(2))

  await act(async () => { firstSave.resolve(record('A')) })
  expect(screen.getByLabelText('Title')).toHaveValue('Article B')
  expect(screen.getByTestId('notice')).toBeEmptyDOMElement()
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  expect(repository.publish).not.toHaveBeenCalled()

  await act(async () => { secondSave.resolve(record('B')) })
  expect(screen.getByTestId('notice')).toHaveTextContent('저장했습니다.')
  expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
})

it('retains the initial draft ID after an upload failure and retries without creating a duplicate', async () => {
  attachmentState.hasPending = true
  attachmentState.prepare
    .mockRejectedValueOnce(new Error('첨부 실패'))
    .mockImplementationOnce(async (input: Record) => ({
      ...input,
      coverImage: { ...input.coverImage, url: imageB },
      attachments: [pdf],
    }))
  await show('/admin/activities/new')
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New article' } })
  fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('첨부 실패')
  expect(screen.getByTestId('id')).toHaveTextContent('created')
  expect(repository.create).toHaveBeenCalledOnce()
  expect(repository.update).not.toHaveBeenCalled()
  expect(repository.publish).not.toHaveBeenCalled()
  expect(attachmentState.clear).not.toHaveBeenCalled()
  expect(attachmentState.prepare.mock.calls[0][0]).toMatchObject({ id: 'created' })

  fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
  await waitFor(() => expect(repository.publish).toHaveBeenCalledWith('created'))
  expect(repository.create).toHaveBeenCalledOnce()
  expect(repository.update).toHaveBeenCalledOnce()
  expect(repository.update).toHaveBeenCalledWith('created', expect.objectContaining({
    coverImage: expect.objectContaining({ url: imageB }),
    attachments: [pdf],
  }))
  expect(attachmentState.clear).toHaveBeenCalledOnce()
})

it('uploads before updating an existing article and keeps attachments when publishing subsequently fails', async () => {
  attachmentState.hasPending = true
  const pending = deferred<Record>()
  attachmentState.prepare.mockReturnValue(pending.promise)
  repository.publish.mockRejectedValue(new Error('공개 실패'))
  await show()
  fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
  await waitFor(() => expect(attachmentState.prepare).toHaveBeenCalledOnce())
  expect(repository.create).not.toHaveBeenCalled()
  expect(repository.update).not.toHaveBeenCalled()
  await act(async () => { pending.resolve({ ...record('A'), coverImage: { ...record('A').coverImage, url: imageB } }) })
  expect(await screen.findByRole('alert')).toHaveTextContent('공개 실패')
  expect(screen.getByTestId('image')).toHaveTextContent(imageB)
  expect(attachmentState.clear).toHaveBeenCalledOnce()

  fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
  await waitFor(() => expect(repository.publish).toHaveBeenCalledTimes(2))
  expect(attachmentState.prepare).toHaveBeenCalledOnce()
  expect(repository.update.mock.calls[1][1].coverImage.url).toBe(imageB)
})

it('keeps prepared attachments for retry if the final record update fails', async () => {
  attachmentState.hasPending = true
  attachmentState.prepare.mockImplementation(async (input: Record) => ({
    ...input, coverImage: { ...input.coverImage, url: imageB },
  }))
  repository.update.mockRejectedValueOnce(new Error('저장 실패'))
    .mockImplementationOnce(async (_id: string, input: Record) => input)
  await show()
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('저장 실패')
  expect(screen.getByTestId('image')).toHaveTextContent(imageA)
  expect(attachmentState.clear).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() => expect(attachmentState.clear).toHaveBeenCalledOnce())
  expect(screen.getByTestId('image')).toHaveTextContent(imageB)
  expect(repository.create).not.toHaveBeenCalled()
})

it('does not consume a late load or carry preview and unsaved state into another article', async () => {
  const firstLoad = deferred<Record | null>()
  repository.getById.mockReturnValueOnce(firstLoad.promise)
    .mockImplementation(async (id: string) => record(id))
  const router = createMemoryRouter(
    [{ path: '/admin/activities/:id/edit', element: <Editor /> }],
    { initialEntries: ['/admin/activities/A/edit'] }
  )
  render(<RouterProvider router={router} />)
  await screen.findByText('Loading')
  await act(async () => { await router.navigate('/admin/activities/B/edit') })
  await screen.findByDisplayValue('Article B')
  fireEvent.click(screen.getByRole('button', { name: 'Preview' }))
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Unsaved B' } })
  expect(screen.getByTestId('preview-alt')).toHaveTextContent('Unsaved B')
  await act(async () => { firstLoad.resolve(record('A')) })
  expect(screen.getByLabelText('Title')).toHaveValue('Unsaved B')

  await act(async () => { await router.navigate('/admin/activities/C/edit') })
  await screen.findByDisplayValue('Article C')
  expect(screen.getByTestId('preview-open')).toHaveTextContent('false')
  expect(screen.getByTestId('notice')).toBeEmptyDOMElement()
})

it('warns before leaving with selected files even if text is unchanged', async () => {
  await show()
  attachmentState.hasPending = true
  act(() => attachmentState.changed())
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  expect(event.defaultPrevented).toBe(true)
})
