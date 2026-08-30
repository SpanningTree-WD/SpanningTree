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
import { AdminLayout } from '../features/admin/AdminLayout'
import { AdminDashboard } from '../features/admin/AdminDashboard'
import { AdminListPage } from '../features/admin/AdminListPage'
import { ActivityEditorPage } from '../features/admin/ActivityEditorPage'
import { MathematicsEditorPage } from '../features/admin/MathematicsEditorPage'
import { PublicationEditorPage } from '../features/admin/PublicationEditorPage'

export const router = createBrowserRouter([{ path:'/admin', element:<AdminLayout/>, children:[
  {index:true,element:<AdminDashboard/>},
  {path:'activities',element:<AdminListPage type="activities"/>},{path:'activities/new',element:<ActivityEditorPage/>},{path:'activities/:id/edit',element:<ActivityEditorPage/>},
  {path:'mathematics',element:<AdminListPage type="mathematics"/>},{path:'mathematics/new',element:<MathematicsEditorPage/>},{path:'mathematics/:id/edit',element:<MathematicsEditorPage/>},
  {path:'publications',element:<AdminListPage type="publications"/>},{path:'publications/new',element:<PublicationEditorPage/>},{path:'publications/:id/edit',element:<PublicationEditorPage/>},
]},{ element: <PublicLayout />, children: [
  { path: '/', element: <HomePage /> }, { path: '/about', element: <AboutPage /> },
  { path: '/people', element: <PeoplePage /> }, { path: '/activities', element: <ActivitiesPage /> },
  { path: '/activities/:slug', element: <ActivityDetailPage /> },
  { path: '/publications', element: <PublicationsPage /> }, { path: '/publications/:slug', element: <PublicationDetailPage /> },
  { path: '/mathematics', element: <MathematicsPage /> }, { path: '/mathematics/:slug', element: <MathematicsDetailPage /> },
  { path: '*', element: <NotFoundPage /> },
] }])
