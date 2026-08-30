import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

import { PublicLayout } from '../components/layout/PublicLayout'
import { PlaceholderPage } from '../components/ui/PlaceholderPage'

it('renders a directly addressed route and its active navigation link', () => {
  const router = createMemoryRouter([
    {
      element: <PublicLayout />,
      children: [{ path: '/activities', element: <PlaceholderPage title="Activities" description="Activity archive" /> }],
    },
  ], { initialEntries: ['/activities'] })

  render(<RouterProvider router={router} />)

  expect(screen.getByRole('heading', { name: 'Activities' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Activities' })).toHaveClass('active')
})
