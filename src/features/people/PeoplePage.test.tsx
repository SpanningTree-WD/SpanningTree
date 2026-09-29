import { act, cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { initialMembers } from '../../content/people'
import type { Member } from '../../models/people'
import { PeoplePage } from './PeoplePage'

let publish: (members: Member[]) => void
vi.mock('../../repositories/memberRepository', () => ({
  watchPublicMembers: (next: typeof publish) => {
    publish = next
    next(initialMembers)
    return () => {}
  },
}))
afterEach(cleanup)
it('shows the corrected cohorts and three leaders, without connection lines, and reflects roster updates', () => {
  const { container } = render(<MemoryRouter initialEntries={['/people']}><PeoplePage /></MemoryRouter>)
  expect(
    within(screen.getByRole('region', { name: '36기' })).getAllByRole('listitem')
  ).toHaveLength(9)
  expect(
    within(screen.getByRole('region', { name: '36기' })).getByText('송정한')
  ).toBeInTheDocument()
  expect(
    within(screen.getByRole('region', { name: '37기' })).getAllByRole('listitem')
  ).toHaveLength(7)
  expect(container.querySelectorAll('.is-leader')).toHaveLength(3)
  for (const name of ['이현준', '이승준', '심성진'])
    expect(screen.getByText(name)).toHaveClass('is-leader')
  expect(container.querySelector('svg')).not.toBeInTheDocument()
  act(() => publish([{ ...initialMembers[0], name: '새부원', generation: 39, isLeader: false }]))
  expect(screen.queryByRole('region', { name: '36기' })).not.toBeInTheDocument()
  expect(
    within(screen.getByRole('region', { name: '39기' })).getByText('새부원')
  ).toBeInTheDocument()
  act(() => publish([]))
  expect(screen.getByText('등록된 구성원이 없습니다')).toBeInTheDocument()
})
