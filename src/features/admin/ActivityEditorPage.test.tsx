import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { ActivityEditorPage } from './ActivityEditorPage'
import { activityFixtures } from '../../content/fixtures/activities'

const repository = vi.hoisted(() => ({
  getById: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  publish: vi.fn(),
  unpublish: vi.fn(),
}))
vi.mock('../../repositories/adminRepositories', () => ({ activityRepository: repository }))
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
  fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Unsaved title' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('서버 저장 실패')
  expect(screen.getByLabelText(/Title/)).toHaveValue('Unsaved title')
  expect(screen.queryByText('저장했습니다.')).not.toBeInTheDocument()
})

it('cancels publishing before any remote write and explicitly publishes after saving', async () => {
  await show()
  vi.mocked(window.confirm).mockReturnValue(false)
  fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
  expect(repository.update).not.toHaveBeenCalled()
  expect(repository.publish).not.toHaveBeenCalled()
  vi.mocked(window.confirm).mockReturnValue(true)
  repository.update.mockResolvedValue(record)
  repository.publish.mockResolvedValue({ ...record, status: 'published' })
  fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
  await screen.findByRole('button', { name: 'Unpublish' })
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
  await screen.findByRole('heading', { name: 'New Activity' })
  fireEvent.change(screen.getByLabelText(/Title/), { target: { value: record.title } })
  fireEvent.change(screen.getByLabelText(/Slug/), { target: { value: record.slug } })
  fireEvent.change(screen.getByLabelText(/Date/), { target: { value: record.date } })
  fireEvent.change(screen.getByLabelText(/^Type/), { target: { value: record.type } })
  fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
  await screen.findByText('공개 실패')
  fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
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
  expect(screen.queryByLabelText(/Title/)).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }))
  await screen.findByDisplayValue(record.title)
})
