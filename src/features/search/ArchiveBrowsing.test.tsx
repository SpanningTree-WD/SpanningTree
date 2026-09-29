import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { PublicLayout } from '../../components/layout/PublicLayout'
import {
  activityRepository,
  mathematicsRepository,
  resetLocalRepositoriesForTests,
} from '../../repositories/local/repositories'
import { ActivitiesPage } from '../activities/ActivitiesPage'
import { MathematicsPage } from '../mathematics/MathematicsPage'
import { PublicationsPage } from '../publications/PublicationsPage'
import { SearchPage } from './SearchPage'

beforeEach(resetLocalRepositoriesForTests)
afterEach(cleanup)
function open(path: string) {
  const router = createMemoryRouter(
    [
      {
        element: <PublicLayout />,
        children: [
          { path: '/activities', element: <ActivitiesPage /> },
          { path: '/mathematics', element: <MathematicsPage /> },
          { path: '/publications', element: <PublicationsPage /> },
          { path: '/search', element: <SearchPage /> },
        ],
      },
    ],
    { initialEntries: [path] }
  )
  render(<RouterProvider router={router} />)
  return router
}
const titles = () =>
  screen.getAllByRole('article').map((article) => within(article).getByRole('heading').textContent)

it('combines URL search/filter/sort and restores them on browser back', async () => {
  const router = open('/mathematics?field=Combinatorics&sort=oldest&q=')
  await screen.findByText('2개 결과')
  expect(titles()).toEqual(['Generating Functions', 'Burnside’s Lemma and Applications'])
  fireEvent.change(screen.getByRole('combobox', { name: '정렬' }), { target: { value: 'title' } })
  expect(titles()[0]).toBe('Burnside’s Lemma and Applications')
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Burnside' } })
  fireEvent.submit(screen.getByRole('search'))
  expect(screen.getAllByRole('article')).toHaveLength(1)
  expect(new URLSearchParams(router.state.location.search).get('field')).toBe('Combinatorics')
  expect(new URLSearchParams(router.state.location.search).get('sort')).toBe('title')
  await act(() => router.navigate(-1))
  expect(screen.getByRole('searchbox')).toHaveValue('')
  expect(titles()).toHaveLength(2)
})

it('provides all admin classifications, observed legacy values and new years without code changes', async () => {
  await mathematicsRepository.update('math-sylow', {
    year: 2028,
    field: 'Analysis',
    type: 'Poster',
  })
  await mathematicsRepository.update('math-prime-number', { field: 'Legacy Field' })
  open('/mathematics')
  await screen.findByRole('button', { name: '2028' })
  for (const label of [
    'Analysis',
    'Geometry',
    'Probability',
    'Other',
    'Poster',
    'Slides',
    'Legacy Field',
  ])
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '필터 열기' }))
  const toggle = screen.getByRole('button', { name: /필터 닫기/ })
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
  fireEvent.click(screen.getByRole('button', { name: '2028' }))
  fireEvent.click(screen.getByRole('button', { name: 'Poster' }))
  expect(titles()).toEqual(['Sylow’s Theorems'])
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
  fireEvent.click(screen.getByRole('button', { name: 'Geometry' }))
  expect(screen.getByText('0개 결과')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '2028' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '필터 초기화' }))
  expect(titles()).toHaveLength(5)
})

it('sorts activities and exposes internal lectures and other activity types', async () => {
  await activityRepository.update('activity-forum-2025', { type: 'Internal Lecture' })
  open('/activities?sort=oldest')
  await screen.findByText('5개 결과')
  expect(titles()[0]).toBe('Topology Workshop')
  expect(screen.getByRole('button', { name: 'Other' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Internal Lecture' }))
  expect(titles()).toEqual(['KSA × Spanning Tree Forum'])
})

it('sorts publications and defaults invalid sort values to latest', async () => {
  open('/publications?sort=invalid')
  await screen.findByText('3개 결과')
  expect(screen.getByRole('combobox', { name: '정렬' })).toHaveValue('latest')
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'oldest' } })
  expect(titles()[0]).toBe('Spanning Tree Report 2024')
})

it('opens global search from the header and searches across sections without exposing drafts', async () => {
  const router = open('/activities')
  await screen.findByText('5개 결과')
  fireEvent.click(screen.getByRole('link', { name: '자료 검색' }))
  await screen.findByText('13개 결과')
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'forum' } })
  fireEvent.submit(screen.getByRole('search'))
  expect(titles()).toEqual(['KSA × Spanning Tree Forum', '2025 KSA × ST Forum Proceedings'])
  fireEvent.click(screen.getByRole('button', { name: /출판물/ }))
  expect(titles()).toEqual(['2025 KSA × ST Forum Proceedings'])
  expect(new URLSearchParams(router.state.location.search).get('q')).toBe('forum')
  fireEvent.click(screen.getByRole('button', { name: '필터 초기화' }))
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'spectral' } })
  fireEvent.submit(screen.getByRole('search'))
  expect(screen.getByText('검색 결과가 없습니다')).toBeInTheDocument()
  expect(screen.queryAllByRole('article')).toHaveLength(0)
})
