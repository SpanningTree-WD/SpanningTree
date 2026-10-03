import { useT } from '../../i18n/LanguageProvider'
import { LanguageSwitch } from '../../i18n/LanguageSwitch'
import { usePageMetadata } from '../shared/usePageMetadata'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  getAdminAccessService,
  type AdminAccessState,
} from '../../services/admin-access/AdminAccessService'
import { isFirebaseConfigured } from '../../services/firebase/firebase'
import { adminErrorMessage } from './adminErrors'


export function AdminLayout() {
  const t = useT()

  usePageMetadata({ noindex: true })
  const configured = isFirebaseConfigured()
  const [access, setAccess] = useState<AdminAccessState>({ status: 'loading' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (configured) return getAdminAccessService().subscribe(setAccess)
  }, [configured])

  async function authenticate(action: 'signIn' | 'signOut') {
    setBusy(true)
    setError('')
    try {
      await getAdminAccessService()[action]()
    } catch (failure) {
      setError(adminErrorMessage(failure))
    } finally {
      setBusy(false)
    }
  }

  if (!configured || access.status !== 'authorized') {
    return (
      <main className="admin-gate">
        <section className="admin-gate-panel">
          <LanguageSwitch />
          <p className="eyebrow">{t("관리자 로그인")}</p>
          <h1>{t("Spanning Tree 관리")}</h1>
          {!configured ? (
            <p>{t("관리자 기능이 아직 설정되지 않았습니다. 사이트 운영자에게 문의해 주세요.")}</p>
          ) : access.status === 'loading' ? (
            <p role="status">{t("로그인 및 관리자 권한을 확인하고 있습니다.")}</p>
          ) : access.status === 'denied' ? (
            <>
              <p>{t("이 계정에는 편집 권한이 없습니다. 관리자에게 아래 계정의 승인을 요청해 주세요.")}</p>
              <p>
                {access.user.email}
                <br />
                <small>{t('계정 식별번호:')} {access.user.uid}</small>
              </p>
            </>
          ) : access.status === 'error' ? (
            <p role="alert">{t(access.message)}</p>
          ) : (
            <p>{t("승인된 동아리 구성원의 Google 계정으로 로그인해 주세요.")}</p>
          )}
          {error && (
            <p className="field-error" role="alert">
              {t(error)}
            </p>
          )}
          {configured && access.status !== 'loading' && (
            <button
              className="admin-primary"
              disabled={busy}
              onClick={() => void authenticate('signIn')}
            >
              {busy ? t('처리 중…') : t('Google로 로그인')}
            </button>
          )}
          {configured && (access.status === 'denied' || access.status === 'error') && (
            <button
              className="admin-signout"
              disabled={busy}
              onClick={() => void authenticate('signOut')}
            >{t("로그아웃")}</button>
          )}
          <p>
            <Link to="/">{t("← 공개 사이트")}</Link>
          </p>
        </section>
      </main>
    )
  }
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <LanguageSwitch />
        <NavLink className="admin-brand" to="/admin">
          Spanning Tree <span>{t("관리자")}</span>
        </NavLink>
        <nav aria-label={t("관리자 메뉴")}>
          <NavLink end to="/admin">{t("관리 홈")}</NavLink>
          <NavLink to="/admin/activities">{t("활동")}</NavLink>
          <NavLink to="/admin/mathematics">{t("수학 자료")}</NavLink>
          <NavLink to="/admin/publications">{t("출판물")}</NavLink>
          <NavLink to="/admin/homepage">{t("홈페이지 편집")}</NavLink>
          <NavLink to="/admin/people">{t("구성원 명단")}</NavLink>
          <NavLink to="/">{t("공개 사이트 ↗")}</NavLink>
        </nav>
        <button className="admin-lock" disabled={busy} onClick={() => void authenticate('signOut')}>{t("로그아웃")}</button>
        <p className="admin-security-note">
          {access.user.email}
          <br />{t("승인된 관리자")}</p>
        {error && <p role="alert">{t(error)}</p>}
      </aside>
      <main className="admin-main">
        <Outlet key={access.user.uid} />
      </main>
    </div>
  )
}
