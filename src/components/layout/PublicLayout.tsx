import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom'

import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'

export function PublicLayout() {
  const { pathname } = useLocation()
  return (
    <div className="shell">
      <SiteHeader />
      <main id="main-content"><Outlet key={pathname} /></main>
      <SiteFooter />
      <ScrollRestoration />
    </div>
  )
}
