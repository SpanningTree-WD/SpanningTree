import { createBrowserRouter } from 'react-router-dom'

import { PublicLayout } from '../components/layout/PublicLayout'
import { AboutPage } from '../features/about/AboutPage'
import { ActivitiesPage } from '../features/activities/ActivitiesPage'
import { HomePage } from '../features/home/HomePage'
import { MathematicsPage } from '../features/mathematics/MathematicsPage'
import { NotFoundPage } from '../features/not-found/NotFoundPage'
import { PeoplePage } from '../features/people/PeoplePage'
import { PublicationsPage } from '../features/publications/PublicationsPage'

export const router = createBrowserRouter([{ element: <PublicLayout />, children: [
  { path: '/', element: <HomePage /> }, { path: '/about', element: <AboutPage /> },
  { path: '/people', element: <PeoplePage /> }, { path: '/activities', element: <ActivitiesPage /> },
  { path: '/publications', element: <PublicationsPage /> }, { path: '/mathematics', element: <MathematicsPage /> },
  { path: '*', element: <NotFoundPage /> },
] }])
