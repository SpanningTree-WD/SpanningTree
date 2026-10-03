import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useHomepage } from './useHomepage'
import { defaultHomepage, type HomepageSettings } from '../../models/homepage'
const repo = vi.hoisted(() => ({ subscribe: vi.fn() }))
vi.mock('../../repositories/homepageRepository', () => ({ getHomepageRepository: () => repo }))
afterEach(() => { cleanup(); vi.stubEnv('VITE_PUBLIC_DATA_SOURCE', 'local'); vi.clearAllMocks() })
it('shows published changes from the subscription and retains the last valid homepage on an error', async () => {
  vi.stubEnv('VITE_PUBLIC_DATA_SOURCE', 'firebase')
  let next!: (settings: HomepageSettings) => void
  let fail!: (error: Error) => void
  const unsubscribe = vi.fn()
  repo.subscribe.mockImplementation((onNext, onError) => { next = onNext; fail = onError; return unsubscribe })
  const { result, unmount } = renderHook(useHomepage)
  expect(result.current).toEqual(defaultHomepage)
  const changed = { ...defaultHomepage, hero: { ...defaultHomepage.hero, title: { ko: '공개 제목', en: 'Published title' } } }
  act(() => next(changed))
  await waitFor(() => expect(result.current).toEqual(changed))
  act(() => fail(new Error('offline')))
  expect(result.current).toEqual(changed)
  unmount()
  expect(unsubscribe).toHaveBeenCalledOnce()
})
