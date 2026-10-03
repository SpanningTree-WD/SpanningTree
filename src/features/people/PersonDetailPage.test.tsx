import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { mathematicsFixtures } from '../../content/fixtures/mathematics'
import { activityFixtures } from '../../content/fixtures/activities'
import { PersonDetailPage } from './PersonDetailPage'
let rename: (members: unknown[]) => void
vi.mock('../../repositories/memberRepository', () => ({ watchPublicMembers: (next: typeof rename) => { rename = next; next([{ id: 'p1', name: 'Original name', generation: 38, bio: 'Biography' }, { id: 'p2', name: 'Original name', generation: 38 }]); return () => {} } }))
vi.mock('../../repositories/publicRepositories', () => ({
  mathematicsRepository: { listPublished: async () => ({ items: [...Array.from({ length: 12 }, (_, i) => ({ ...mathematicsFixtures[0], id: 'm' + i, slug: 'm' + i, title: 'Article ' + i, authorIds: ['p1'] })), { ...mathematicsFixtures[0], id: 'hidden', title: 'Private title', status: 'draft', authorIds: ['p1'] }, { ...mathematicsFixtures[0], id: 'other', title: 'Other namesake', authorIds: ['p2'] }] }) },
  activityRepository: { listPublished: async () => ({ items: [{ ...activityFixtures[0], title: 'My activity', participantIds: ['p1'] }, { ...activityFixtures[0], id: 'draft', title: 'Private activity', status: 'draft', participantIds: ['p1'] }] }) },
  publicationRepository: { listPublished: async () => ({ items: [] }) },
}))
afterEach(cleanup)
it('shows authored and participated public records by stable ID with load more and updated names', async () => {
  render(<MemoryRouter initialEntries={['/people/p1']}><Routes><Route path="/people/:id" element={<PersonDetailPage />} /></Routes></MemoryRouter>)
  await screen.findByRole('heading', { name: 'Original name' })
  expect(screen.getByText('Biography')).toBeVisible()
  expect(screen.getByRole('heading', { name: '작성한 글' })).toBeVisible()
  expect(screen.getByRole('heading', { name: '참여한 활동' })).toBeVisible()
  expect(screen.queryByText('Private title')).toBeNull()
  expect(screen.queryByText('Private activity')).toBeNull()
  expect(screen.queryByText('Other namesake')).toBeNull()
  expect(screen.getAllByRole('link', { name: /^Article/ })).toHaveLength(10)
  fireEvent.click(screen.getByRole('button', { name: '더 보기' }))
  expect(screen.getAllByRole('link', { name: /^Article/ })).toHaveLength(12)
  act(() => rename([{ id: 'p1', name: 'Renamed person', generation: 38, bio: 'Biography' }]))
  expect(screen.getByRole('heading', { name: 'Renamed person' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'My activity' })).toHaveAttribute('href', '/activities/ksa-spanning-tree-forum')
})
