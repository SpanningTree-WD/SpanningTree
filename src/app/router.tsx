import { createBrowserRouter } from 'react-router-dom'

import { PublicLayout } from '../components/layout/PublicLayout'
import { PlaceholderPage } from '../components/ui/PlaceholderPage'
import { NotFoundPage } from '../features/not-found/NotFoundPage'

const pages = [
  { path: '/', title: 'Main', description: 'Together in Mathematics, Growing Further' },
  { path: '/about', title: 'About Spanning Tree', description: 'Spanning Tree를 소개합니다.' },
  { path: '/people', title: 'People', description: '함께 배우고 성장하며, 서로의 길을 잇는 사람들.' },
  { path: '/activities', title: 'Activities', description: 'Spanning Tree의 다양한 활동과 프로젝트를 확인하세요.' },
  { path: '/publications', title: 'Publications', description: 'Spanning Tree가 만들어 낸 출판물을 소개합니다.' },
  { path: '/mathematics', title: 'Mathematics', description: '수학의 다양한 분야를 탐구한 자료를 살펴보세요.' },
]

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      ...pages.map(({ path, title, description }) => ({
        path,
        element: <PlaceholderPage title={title} description={description} isHome={path === '/'} />,
      })),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
