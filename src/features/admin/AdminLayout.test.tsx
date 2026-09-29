import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { AdminLayout } from './AdminLayout'
import type { AdminAccessState } from '../../services/admin-access/AdminAccessService'

const mocks = vi.hoisted(() => ({
  configured: true,
  subscribe: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock('../../services/firebase/firebase', () => ({
  isFirebaseConfigured: () => mocks.configured,
}))
vi.mock('../../services/admin-access/AdminAccessService', () => ({
  getAdminAccessService: () => mocks,
}))
let notify: (state: AdminAccessState) => void
beforeEach(() => {
  vi.clearAllMocks()
  mocks.configured = true
  mocks.subscribe.mockImplementation((callback) => {
    notify = callback
    return vi.fn()
  })
})
afterEach(cleanup)
function show() {
  render(
    <RouterProvider
      router={createMemoryRouter(
        [
          {
            path: '/admin',
            element: <AdminLayout />,
            children: [{ index: true, element: <p>Private editor</p> }],
          },
        ],
        { initialEntries: ['/admin'] }
      )}
    />
  )
}

it('never mounts private routes until membership is confirmed, and removes them on revocation', () => {
  show()
  expect(screen.queryByText('Private editor')).not.toBeInTheDocument()
  act(() => notify({ status: 'signed-out' }))
  fireEvent.click(screen.getByRole('button', { name: 'Google로 로그인' }))
  expect(mocks.signIn).toHaveBeenCalledOnce()
  act(() => notify({ status: 'authorized', user: { uid: 'editor', email: 'editor@example.com' } }))
  expect(screen.getByText('Private editor')).toBeInTheDocument()
  act(() => notify({ status: 'denied', user: { uid: 'editor', email: 'editor@example.com' } }))
  expect(screen.queryByText('Private editor')).not.toBeInTheDocument()
  expect(screen.getByText('UID: editor')).toBeInTheDocument()
})

it('explains missing configuration without starting Firebase or offering a local bypass', () => {
  mocks.configured = false
  show()
  expect(screen.getByText(/관리자 기능이 아직 설정되지/)).toBeInTheDocument()
  expect(mocks.subscribe).not.toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: 'Google로 로그인' })).not.toBeInTheDocument()
})
