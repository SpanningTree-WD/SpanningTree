import { createBrowserRouter } from 'react-router-dom'

import { PublicLayout } from '../components/layout/PublicLayout'
import { AboutPage } from '../features/about/AboutPage'
import { ActivitiesPage } from '../features/activities/ActivitiesPage'
import { HomePage } from '../features/home/HomePage'
import { MathematicsPage } from '../features/mathematics/MathematicsPage'
import { NotFoundPage } from '../features/not-found/NotFoundPage'
import { PeoplePage } from '../features/people/PeoplePage'
import { PersonDetailPage } from '../features/people/PersonDetailPage'
import { PublicationsPage } from '../features/publications/PublicationsPage'
import { AdminLayout } from '../features/admin/AdminLayout'
import { AdminDashboard } from '../features/admin/AdminDashboard'
import { AdminListPage } from '../features/admin/AdminListPage'
import { SearchPage } from '../features/search/SearchPage'
import { PeopleAdminPage } from '../features/admin/PeopleAdminPage'

export const router = createBrowserRouter([{ path:'/admin', element:<AdminLayout/>, children:[
  {index:true,element:<AdminDashboard/>},
  {path:'homepage',lazy:async () => ({ Component: (await import('../features/admin/HomepageEditorPage')).HomepageEditorPage })},
  {path:'people',element:<PeopleAdminPage/>},
  {path:'activities',element:<AdminListPage type="activities"/>},{path:'activities/new',lazy:async () => ({ Component: (await import('../features/admin/ActivityEditorPage')).ActivityEditorPage })},{path:'activities/:id/edit',lazy:async () => ({ Component: (await import('../features/admin/ActivityEditorPage')).ActivityEditorPage })},
  {path:'mathematics',element:<AdminListPage type="mathematics"/>},{path:'mathematics/new',lazy:async () => ({ Component: (await import('../features/admin/MathematicsEditorPage')).MathematicsEditorPage })},{path:'mathematics/:id/edit',lazy:async () => ({ Component: (await import('../features/admin/MathematicsEditorPage')).MathematicsEditorPage })},
  {path:'publications',element:<AdminListPage type="publications"/>},{path:'publications/new',lazy:async () => ({ Component: (await import('../features/admin/PublicationEditorPage')).PublicationEditorPage })},{path:'publications/:id/edit',lazy:async () => ({ Component: (await import('../features/admin/PublicationEditorPage')).PublicationEditorPage })},
]},{ element: <PublicLayout />, children: [
  { path: '/', element: <HomePage /> }, { path: '/about', element: <AboutPage /> },
  { path: '/people', element: <PeoplePage /> }, { path: '/activities', element: <ActivitiesPage /> },
  { path: '/people/:id', element: <PersonDetailPage /> },
  { path: '/search', element: <SearchPage /> },
  { path: '/activities/:slug', lazy:async () => ({ Component: (await import('../features/activities/ActivityDetailPage')).ActivityDetailPage }) },
  { path: '/publications', element: <PublicationsPage /> }, { path: '/publications/:slug', lazy:async () => ({ Component: (await import('../features/publications/PublicationDetailPage')).PublicationDetailPage }) },
  { path: '/mathematics', element: <MathematicsPage /> }, { path: '/mathematics/:slug', lazy:async () => ({ Component: (await import('../features/mathematics/MathematicsDetailPage')).MathematicsDetailPage }) },
  { path: '*', element: <NotFoundPage /> },
] }])
