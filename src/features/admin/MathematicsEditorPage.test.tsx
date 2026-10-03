import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mathematicsFixtures } from '../../content/fixtures/mathematics'
import type { Mathematics } from '../../models/mathematics'
import { MathematicsEditorPage } from './MathematicsEditorPage'
vi.mock('./ConnectionPickers', () => ({ PeoplePicker: () => null, RelatedPicker: () => null }))

const repository = vi.hoisted(() => ({
  getById: vi.fn(), update: vi.fn(), create: vi.fn(), listAll: vi.fn(),
}))
vi.mock('../../repositories/adminRepositories', () => ({ mathematicsRepository: repository }))
vi.mock('../../services/uploads/GitHubUploadService', () => ({ watchUpload: () => () => {} }))
const legacy = { ...mathematicsFixtures[0], status: 'draft' as const, field: 'Geometry', tags: ['keep-this-tag'] }

beforeEach(() => {
  vi.clearAllMocks()
  repository.listAll.mockResolvedValue([])
  repository.getById.mockResolvedValue(legacy)
  repository.update.mockImplementation(async (_id, input) => ({ ...input, updatedAt: '2026-09-30T01:00:00Z' }))
  repository.create.mockImplementation(async (input) => ({ ...input, id: 'created', status: 'draft' }))
})
afterEach(cleanup)

function show(record?: Mathematics) {
  if (record) repository.getById.mockResolvedValue(record)
  render(<RouterProvider router={createMemoryRouter([
    { path: '/admin/mathematics/:id/edit', element: <MathematicsEditorPage /> },
    { path: '/admin/mathematics/new', element: <MathematicsEditorPage /> },
  ], { initialEntries: [record ? '/admin/mathematics/' + record.id + '/edit' : '/admin/mathematics/new'] })} />)
}
const choose = (name: string) => fireEvent.click(screen.getByRole('checkbox', { name }))
function add(name: string) {
  fireEvent.change(screen.getByLabelText('새 분야 이름'), { target: { value: name } })
  fireEvent.click(screen.getByRole('button', { name: '분야 추가' }))
}

it('saves several fields on a new article and keeps the first as the legacy field', async () => {
  show()
  await screen.findByLabelText(/제목/)
  fireEvent.change(screen.getByLabelText(/제목/), { target: { value: '곡면과 복소함수' } })
  fireEvent.change(screen.getByLabelText(/자료 유형/), { target: { value: 'Article' } })
  add('대수기하')
  choose('위상수학')
  add('복소해석학')
  fireEvent.click(screen.getByRole('button', { name: '임시 저장' }))
  await waitFor(() => expect(repository.create).toHaveBeenCalledOnce())
  expect(repository.create.mock.calls[0][0]).toMatchObject({
    field: '대수기하',
    fields: ['대수기하', 'Topology', '복소해석학'],
  })
})

it('loads legacy fields and preserves the URL, content and unrelated tags when adding fields', async () => {
  show(legacy)
  expect(await screen.findByRole('checkbox', { name: '기하학' })).toBeChecked()
  add('대수기하')
  choose('위상수학')
  add('복소해석학')
  choose('기하학')
  fireEvent.click(screen.getByRole('button', { name: '임시 저장' }))
  await screen.findByText('저장했습니다.')
  expect(repository.update).toHaveBeenCalledWith(legacy.id, expect.objectContaining({
    slug: legacy.slug, content: legacy.content, tags: legacy.tags,
    field: '대수기하', fields: ['대수기하', 'Topology', '복소해석학'],
  }))
  expect(screen.getByRole('checkbox', { name: '대수기하' })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: '위상수학' })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: '복소해석학' })).toBeChecked()
})

it('loads every saved field and changes the primary field when it is removed', async () => {
  const record = { ...legacy, field: '대수기하', fields: ['대수기하', 'Topology', '복소해석학'] }
  show(record)
  expect(await screen.findByRole('checkbox', { name: '복소해석학' })).toBeChecked()
  choose('대수기하')
  fireEvent.click(screen.getByRole('button', { name: '임시 저장' }))
  await screen.findByText('저장했습니다.')
  expect(repository.update).toHaveBeenCalledWith(record.id, expect.objectContaining({
    field: 'Topology', fields: ['Topology', '복소해석학'],
  }))
})

it('requires at least one field without sending an invalid save', async () => {
  show(legacy)
  await screen.findByDisplayValue(legacy.title)
  choose('기하학')
  fireEvent.click(screen.getByRole('button', { name: '임시 저장' }))
  expect(await screen.findByText('수학 분야를 한 개 이상 선택해 주세요.')).toBeInTheDocument()
  expect(repository.update).not.toHaveBeenCalled()
})

it('keeps selected fields and existing classifications after a failed save', async () => {
  repository.update.mockRejectedValue(new Error('서버 저장 실패'))
  show({ ...legacy, field: 'Legacy Field' })
  expect(await screen.findByRole('checkbox', { name: 'Legacy Field' })).toBeChecked()
  choose('위상수학')
  fireEvent.click(screen.getByRole('button', { name: '임시 저장' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('서버 저장 실패')
  expect(screen.getByRole('checkbox', { name: 'Legacy Field' })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: '위상수학' })).toBeChecked()
  expect(screen.queryByText('저장했습니다.')).not.toBeInTheDocument()
})

it('offers custom fields from other saved articles without predefining them in code', async () => {
  repository.listAll.mockResolvedValue([{ ...legacy, field: '미분기하', fields: ['미분기하', '조화해석'] }])
  show(legacy)
  await screen.findByDisplayValue(legacy.title)
  choose('위상수학')
  expect(await screen.findByRole('checkbox', { name: '조화해석' })).not.toBeChecked()
  choose('조화해석')
  fireEvent.click(screen.getByRole('button', { name: '임시 저장' }))
  await screen.findByText('저장했습니다.')
  expect(repository.update).toHaveBeenCalledWith(legacy.id, expect.objectContaining({
    fields: ['Geometry', 'Topology', '조화해석'],
  }))
})

it('rejects empty and duplicate names, recognizes preset labels, and adds with Enter without saving', async () => {
  show(legacy)
  await screen.findByDisplayValue(legacy.title)
  add('   ')
  expect(screen.getByText('분야 이름을 1~100자로 입력해 주세요.')).toBeInTheDocument()
  add('기하학')
  expect(screen.getByText('이미 선택한 분야입니다.')).toBeInTheDocument()
  const input = screen.getByLabelText('새 분야 이름')
  fireEvent.change(input, { target: { value: '  자유 분야  ' } })
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(screen.getByRole('checkbox', { name: '자유 분야' })).toBeChecked()
  expect(repository.update).not.toHaveBeenCalled()
  add('자유 분야')
  expect(screen.getAllByRole('checkbox', { name: '자유 분야' })).toHaveLength(1)
})

it('still permits adding custom fields if loading saved suggestions fails', async () => {
  repository.listAll.mockRejectedValue(new Error('offline'))
  show(legacy)
  await screen.findByText(/저장된 분야 목록을 불러오지 못했습니다/)
  add('새 분야')
  expect(screen.getByRole('checkbox', { name: '새 분야' })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: '기하학' })).toBeChecked()
})
