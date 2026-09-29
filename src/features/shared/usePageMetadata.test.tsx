import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { PublicLayout } from '../../components/layout/PublicLayout'
import { AboutPage } from '../about/AboutPage'
import { ActivityDetailPage } from '../activities/ActivityDetailPage'
import { NotFoundPage } from '../not-found/NotFoundPage'
import { usePageMetadata } from './usePageMetadata'

afterEach(() => {
  cleanup()
  document.head.querySelectorAll('meta[name="description"], meta[name="robots"], link[rel="canonical"], title').forEach(tag => tag.remove())
  vi.unstubAllEnvs()
})

function SearchMetadata() {
  usePageMetadata({ noindex: true })
  return <p>Search</p>
}

it('replaces titles, descriptions, canonical URLs and noindex on client navigation without duplicates', async () => {
  const router = createMemoryRouter([{ element: <PublicLayout />, children: [
    { path: '/about', element: <AboutPage /> },
    { path: '/activities/:slug', element: <ActivityDetailPage /> },
    { path: '/search', element: <SearchMetadata /> },
    { path: '*', element: <NotFoundPage /> },
  ] }], { initialEntries: ['/activities/ksa-spanning-tree-forum'] })
  render(<RouterProvider router={router} />)
  await waitFor(() => expect(document.title).toContain('KSA'))
  expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://spanningtree-math.web.app/activities/ksa-spanning-tree-forum')
  await act(() => router.navigate('/activities/no-such-record'))
  expect(await screen.findByRole('heading', { name: 'Record Not Found' })).toBeInTheDocument()
  expect(document.title).not.toContain('KSA')
  expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
  expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
  await act(() => router.navigate('/search?q=test'))
  expect(document.title).toBe('검색 | 스패닝트리')
  await act(() => router.navigate('/about?utm_source=test'))
  expect(document.title).toBe('동아리 소개 | 스패닝트리')
  expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'index, follow')
  expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://spanningtree-math.web.app/about')
  expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1)
  expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
  await act(() => router.navigate('/nonexistent'))
  expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
})

it('keeps preview pages out of search', () => {
  vi.stubEnv('VITE_SEO_NOINDEX', 'true')
  const router = createMemoryRouter([{ path: '/about', element: <AboutPage /> }], { initialEntries: ['/about'] })
  render(<RouterProvider router={router} />)
  expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
})
