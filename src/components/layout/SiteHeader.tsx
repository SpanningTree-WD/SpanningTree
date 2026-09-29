import { NavLink } from 'react-router-dom'

const navigation = [
  ['/', 'Main'],
  ['/about', 'About'],
  ['/people', 'People'],
  ['/activities', 'Activities'],
  ['/publications', 'Publications'],
  ['/mathematics', 'Mathematics'],
] as const

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <NavLink className="brand" to="/" aria-label="Spanning Tree home">SPANNING TREE</NavLink>
        <nav className="primary-nav" aria-label="Primary navigation">
          {navigation.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>
          ))}
        </nav>
        <div className="header-actions">
          <NavLink className="search-icon" to="/search" aria-label="자료 검색" title="자료 검색" />
        </div>
      </div>
    </header>
  )
}
