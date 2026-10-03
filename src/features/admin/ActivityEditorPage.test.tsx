import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { ActivityEditorPage } from './ActivityEditorPage'
import { activityFixtures } from '../../content/fixtures/activities'
import { setEditorText } from '../../test/editor'
import { withLegacyAssets } from '../../models/authoring'
vi.mock('./ConnectionPickers', () => ({ PeoplePicker: () => null, RelatedPicker: () => null }))

const repository = vi.hoisted(() => ({
  getById: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  publish: vi.fn(),
  unpublish: vi.fn(),
}))
vi.mock('../../repositories/adminRepositories', () => ({ activityRepository: repository }))
vi.mock('../../services/uploads/GitHubUploadService', () => ({ watchUpload: () => () => {} }))
const record = { ...activityFixtures[0], status: 'draft' as const }
beforeEach(() => {
  vi.clearAllMocks()
  repository.getById.mockResolvedValue(record)
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
async function show() {
  const router = createMemoryRouter(
    [
      { path: '/admin/activities/:id/edit', element: <ActivityEditorPage /> },
      { path: '/admin/activities/new', element: <ActivityEditorPage /> },
    ],
    { initialEntries: ['/admin/activities/' + record.id + '/edit'] }
  )
  render(<RouterProvider router={router} />)
  await screen.findByDisplayValue(record.title)
}

it('preserves typed content and shows a failed remote save instead of a success message', async () => {
  repository.update.mockRejectedValue(new Error('서버 저장 실패'))
  await show()
  fireEvent.change(screen.getByLabelText(/제목/), { target: { value: 'Unsaved title' } })
  fireEvent.click(screen.getByRole('button', { name: '임시 저장' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('서버 저장 실패')
  expect(screen.getByLabelText(/제목/)).toHaveValue('Unsaved title')
  expect(screen.queryByText('저장했습니다.')).not.toBeInTheDocument()
})

it('cancels publishing before any remote write and explicitly publishes after saving', async () => {
  await show()
  vi.mocked(window.confirm).mockReturnValue(false)
  fireEvent.click(screen.getByRole('button', { name: '공개하기' }))
  expect(repository.update).not.toHaveBeenCalled()
  expect(repository.publish).not.toHaveBeenCalled()
  vi.mocked(window.confirm).mockReturnValue(true)
  repository.update.mockResolvedValue(record)
  repository.publish.mockResolvedValue({ ...record, status: 'published' })
  fireEvent.click(screen.getByRole('button', { name: '공개하기' }))
  await screen.findByRole('button', { name: '비공개로 전환' })
  expect(repository.update).toHaveBeenCalledOnce()
  expect(repository.publish).toHaveBeenCalledWith(record.id)
  expect(repository.update.mock.invocationCallOrder[0]).toBeLessThan(
    repository.publish.mock.invocationCallOrder[0]
  )
})

it('retries a failed publish using the saved record and does not create duplicates', async () => {
  repository.create.mockResolvedValue(record)
  repository.update.mockResolvedValue(record)
  repository.publish
    .mockRejectedValueOnce(new Error('공개 실패'))
    .mockResolvedValueOnce({ ...record, status: 'published' })
  render(
    <RouterProvider
      router={createMemoryRouter(
        [
          { path: '/admin/activities/new', element: <ActivityEditorPage /> },
          { path: '/admin/activities/:id/edit', element: <ActivityEditorPage /> },
        ],
        { initialEntries: ['/admin/activities/new'] }
      )}
    />
  )
  await screen.findByRole('heading', { name: '새 활동 작성' })
  fireEvent.change(screen.getByLabelText(/제목/), { target: { value: record.title } })
  fireEvent.change(screen.getByLabelText(/활동 날짜/), { target: { value: record.date } })
  fireEvent.change(screen.getByLabelText(/활동 유형/), { target: { value: record.type } })
  fireEvent.click(screen.getByRole('button', { name: '공개하기' }))
  await screen.findByText('공개 실패')
  fireEvent.click(screen.getByRole('button', { name: '공개하기' }))
  await waitFor(() => expect(repository.publish).toHaveBeenCalledTimes(2))
  expect(repository.create).toHaveBeenCalledOnce()
  expect(repository.update).toHaveBeenCalledOnce()
})

it('reports read errors and retries instead of showing an empty editable form', async () => {
  repository.getById.mockRejectedValueOnce(new Error('불러오기 실패')).mockResolvedValueOnce(record)
  render(
    <RouterProvider
      router={createMemoryRouter(
        [{ path: '/admin/activities/:id/edit', element: <ActivityEditorPage /> }],
        { initialEntries: ['/admin/activities/' + record.id + '/edit'] }
      )}
    />
  )
  expect(await screen.findByRole('alert')).toHaveTextContent('불러오기 실패')
  expect(screen.queryByLabelText(/제목/)).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }))
  await screen.findByDisplayValue(record.title)
})

it('creates a Korean activity without manual URL or metadata entry', async () => {
  repository.create.mockImplementation(async (input) => ({ ...input, id: 'new-activity' }))
  repository.getById.mockImplementation(async () => repository.create.mock.results[0].value)
  render(
    <RouterProvider
      router={createMemoryRouter(
        [
          { path: '/admin/activities/new', element: <ActivityEditorPage /> },
          { path: '/admin/activities/:id/edit', element: <ActivityEditorPage /> },
        ],
        { initialEntries: ['/admin/activities/new'] }
      )}
    />
  )
  await screen.findByRole('heading', { name: '새 활동 작성' })
  fireEvent.change(screen.getByLabelText(/제목/), { target: { value: '첫 수학 포럼' } })
  fireEvent.change(screen.getByLabelText(/활동 날짜/), { target: { value: '2026-09-29' } })
  fireEvent.change(screen.getByLabelText(/활동 유형/), { target: { value: 'Forum' } })
  setEditorText(screen.getByRole('textbox', { name: '활동 내용' }), '함께 수학을 공부했습니다.')
  fireEvent.click(screen.getByRole('button', { name: '임시 저장' }))
  await waitFor(() => expect(repository.create).toHaveBeenCalledOnce())
  expect(repository.create.mock.calls[0][0]).toMatchObject({
    title: '첫 수학 포럼',
    slug: expect.stringMatching(/^activities-[a-z0-9-]+$/),
    summary: '함께 수학을 공부했습니다.',
    coverImage: { alt: '첫 수학 포럼', variant: 'a' },
    featured: true,
    status: 'draft',
  })
})

it('preserves existing URLs, summaries and hidden metadata when editing the title', async () => {
  repository.update.mockImplementation(async (_id, input) => input)
  await show()
  fireEvent.change(screen.getByLabelText(/제목/), { target: { value: '바뀐 제목' } })
  fireEvent.click(screen.getByRole('button', { name: '임시 저장' }))
  await screen.findByText('저장했습니다.')
  expect(repository.update).toHaveBeenCalledWith(record.id, {
    ...withLegacyAssets(record),
    title: '바뀐 제목',
  })
})
