import { Outlet, ScrollRestoration } from 'react-router-dom'

import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'

export function PublicLayout() {
  return (
    <div className="shell">
      <SiteHeader />
      <main id="main-content"><Outlet /></main>
      <SiteFooter />
      <ScrollRestoration />
    </div>
  )
}
