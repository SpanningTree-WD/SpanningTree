import { createBrowserRouter } from 'react-router-dom'

import { PublicLayout } from '../components/layout/PublicLayout'
import { AboutPage } from '../features/about/AboutPage'
import { ActivitiesPage } from '../features/activities/ActivitiesPage'
import { ActivityDetailPage } from '../features/activities/ActivityDetailPage'
import { HomePage } from '../features/home/HomePage'
import { MathematicsPage } from '../features/mathematics/MathematicsPage'
import { MathematicsDetailPage } from '../features/mathematics/MathematicsDetailPage'
import { NotFoundPage } from '../features/not-found/NotFoundPage'
import { PeoplePage } from '../features/people/PeoplePage'
import { PublicationsPage } from '../features/publications/PublicationsPage'
import { PublicationDetailPage } from '../features/publications/PublicationDetailPage'

export const router = createBrowserRouter([{ element: <PublicLayout />, children: [
  { path: '/', element: <HomePage /> }, { path: '/about', element: <AboutPage /> },
  { path: '/people', element: <PeoplePage /> }, { path: '/activities', element: <ActivitiesPage /> },
  { path: '/activities/:slug', element: <ActivityDetailPage /> },
  { path: '/publications', element: <PublicationsPage /> }, { path: '/publications/:slug', element: <PublicationDetailPage /> },
  { path: '/mathematics', element: <MathematicsPage /> }, { path: '/mathematics/:slug', element: <MathematicsDetailPage /> },
  { path: '*', element: <NotFoundPage /> },
] }])
