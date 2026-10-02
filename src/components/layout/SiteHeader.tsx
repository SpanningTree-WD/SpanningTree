import { useT } from '../../i18n/LanguageProvider'
import { LanguageSwitch } from '../../i18n/LanguageSwitch'
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
  const t = useT()

  return (
    <header className="site-header">
      <div className="header-inner">
        <NavLink className="brand" to="/" aria-label={t("Spanning Tree home")}>SPANNING TREE</NavLink>
        <nav className="primary-nav" aria-label={t("Primary navigation")}>
          {navigation.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}>{t(label)}</NavLink>
          ))}
        </nav>
        <div className="header-actions">
          <LanguageSwitch />
          <NavLink className="search-icon" to="/search" aria-label={t("자료 검색")} title={t("자료 검색")} />
        </div>
      </div>
    </header>
  )
}
