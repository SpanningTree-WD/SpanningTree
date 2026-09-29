import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { PeopleAdminPage } from './PeopleAdminPage'
import { initialMembers } from '../../content/people'
import type { Member } from '../../models/people'

const repository = vi.hoisted(() => ({
  subscribe: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))
vi.mock('../../repositories/memberRepository', () => ({ memberRepository: repository }))
let publish: (members: Member[]) => void
beforeEach(() => {
  vi.resetAllMocks()
  repository.subscribe.mockImplementation((next) => {
    publish = next
    next(initialMembers)
    return vi.fn()
  })
})
afterEach(cleanup)
const show = () =>
  render(
    <MemoryRouter>
      <PeopleAdminPage />
    </MemoryRouter>
  )

it('edits generation and leader status with only the three Korean fields', async () => {
  show()
  fireEvent.click(screen.getByRole('button', { name: '36기 송정한 수정' }))
  expect(screen.getByLabelText('이름')).toHaveValue('송정한')
  fireEvent.change(screen.getByLabelText('기수'), { target: { value: '37' } })
  fireEvent.click(screen.getByLabelText('학년 장'))
  fireEvent.click(screen.getByRole('button', { name: '저장' }))
  await screen.findByText('저장했습니다. 공개 명단에 반영되었습니다.')
  expect(repository.update).toHaveBeenCalledWith(
    expect.objectContaining({ name: '송정한', generation: 36 }),
    { name: '송정한', generation: 37, isLeader: true }
  )
})

it('adds members, shows live changes and waits for confirmation before deleting', async () => {
  show()
  fireEvent.click(screen.getByRole('button', { name: '구성원 추가' }))
  fireEvent.change(screen.getByLabelText('이름'), { target: { value: '새부원' } })
  fireEvent.change(screen.getByLabelText('기수'), { target: { value: '39' } })
  fireEvent.click(screen.getByRole('button', { name: '저장' }))
  await screen.findByText('저장했습니다. 공개 명단에 반영되었습니다.')
  expect(repository.create).toHaveBeenCalledWith({
    name: '새부원',
    generation: 39,
    isLeader: false,
  })
  const added = { ...initialMembers[0], id: 'new', name: '새부원', generation: 39, isLeader: false }
  act(() => publish([...initialMembers, added]))
  fireEvent.click(screen.getByRole('button', { name: '39기 새부원 삭제' }))
  expect(repository.remove).not.toHaveBeenCalled()
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '취소' }))
  expect(repository.remove).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '39기 새부원 삭제' }))
  fireEvent.click(screen.getByRole('button', { name: '삭제 확인' }))
  await screen.findByText('새부원 님을 명단에서 삭제했습니다.')
  expect(repository.remove).toHaveBeenCalledWith(added)
})

it('retains input on permission failure and rejects blank names', async () => {
  show()
  fireEvent.click(screen.getByRole('button', { name: '36기 이현준 수정' }))
  fireEvent.change(screen.getByLabelText('이름'), { target: { value: '   ' } })
  fireEvent.click(screen.getByRole('button', { name: '저장' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('이름을 1~40자로')
  expect(repository.update).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('이름'), { target: { value: '이현준' } })
  repository.update.mockRejectedValue({ code: 'permission-denied' })
  fireEvent.click(screen.getByRole('button', { name: '저장' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('편집 권한이 없거나')
  expect(screen.getByLabelText('이름')).toHaveValue('이현준')
  expect(screen.getByLabelText('학년 장')).toBeChecked()
})
