import { webcrypto } from 'node:crypto'
import { mathematicsCovers } from '../../components/content/mathematicsCovers'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
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
  await screen.findByRole('option', { name: '2028' })
  for (const label of ['해석학', '기하학', '확률론', '기타', 'Legacy Field'])
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: '발표 자료' })).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('연도'), { target: { value: '2028' } })
  fireEvent.change(screen.getByLabelText('자료 유형'), { target: { value: 'Poster' } })
  expect(titles()).toEqual(['Sylow’s Theorems'])
  fireEvent.click(screen.getByRole('button', { name: '기하학' }))
  expect(screen.getByText('0개 결과')).toBeInTheDocument()
  expect(screen.getByRole('option', { name: '2028' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '초기화' }))
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

it('shows all article fields and finds the article from a secondary field or Korean topic search', async () => {
  await mathematicsRepository.update('math-sylow', {
    field: '대수기하', fields: ['대수기하', 'Topology', '복소해석학'],
  })
  const router = open('/mathematics?field=%EB%B3%B5%EC%86%8C%ED%95%B4%EC%84%9D%ED%95%99')
  await screen.findByText('1개 결과')
  expect(titles()).toEqual(['Sylow’s Theorems'])
  expect(screen.getByRole('article')).toHaveTextContent('대수기하 · 위상수학 · 복소해석학')
  fireEvent.click(screen.getByRole('button', { name: '위상수학' }))
  expect(titles()).toEqual(['Sylow’s Theorems', 'An Introduction to Fundamental Groups'])
  await act(() => router.navigate('/search?q=' + encodeURIComponent('복소해석학')))
  await screen.findByText('1개 결과')
  expect(titles()).toEqual(['Sylow’s Theorems'])
  expect(screen.getByRole('article')).toHaveTextContent('대수기하 · 위상수학 · 복소해석학')
})

it('shows only the chosen body formula on a public card and hides it if its source disappears', async () => {
  vi.stubGlobal('crypto', webcrypto)
  const content = '$$x+1$$\n\n$$y+2$$'
  const choices = await mathematicsCovers({ content, slug: 'selected' })
  await mathematicsRepository.update('math-sylow', { content, coverImage: { alt: '', variant: choices[1].key } })
  open('/mathematics?q=Sylow')
  expect(await screen.findByRole('math', { name: 'y+2' })).toBeInTheDocument()
  expect(screen.queryByRole('math', { name: 'x+1' })).toBeNull()
  expect(screen.queryByText('목록 대표 그림')).toBeNull()
  cleanup()
  await mathematicsRepository.update('math-sylow', { content: '$$x+1$$' })
  open('/mathematics?q=Sylow')
  await screen.findByText('1개 결과')
  expect(screen.queryByRole('math')).toBeNull()
})
