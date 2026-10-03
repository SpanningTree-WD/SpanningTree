import { useT } from '../../i18n/LanguageProvider'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  activityRepository,
  mathematicsRepository,
  publicationRepository,
} from '../../repositories/adminRepositories'
import { adminErrorMessage } from './adminErrors'

type Counts = { published: number; draft: number }
const count = <T extends { status: string }>(records: T[]): Counts => ({
  published: records.filter((r) => r.status === 'published').length,
  draft: records.filter((r) => r.status === 'draft').length,
})

export function AdminDashboard() {
  const t = useT()

  const [counts, setCounts] = useState<Record<string, Counts>>()
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setError('')
    Promise.all([
      activityRepository.listAll(),
      mathematicsRepository.listAll(),
      publicationRepository.listAll(),
    ])
      .then(([a, m, p]) => {
        if (active)
          setCounts({ activities: count(a), mathematics: count(m), publications: count(p) })
      })
      .catch((failure) => {
        if (active) setError(adminErrorMessage(failure))
      })
    return () => {
      active = false
    }
  }, [retry])
  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <p className="eyebrow">{t("콘텐츠 관리")}</p>
        <h1>{t("관리 홈")}</h1>
        <p>{t("동아리 기록을 작성하고 공개 상태를 관리합니다.")}</p>
      </header>
      <p><Link className="article-link" to="/admin/homepage">{t("홈페이지 편집")}</Link></p>
      <p><Link className="article-link" to="/admin/people">{t("구성원 명단 관리 →")}</Link></p>
      {error ? (
        <div role="alert">
          <p>{t(error)}</p>
          <button onClick={() => setRetry((value) => value + 1)}>{t("다시 시도")}</button>
        </div>
      ) : !counts ? (
        <p role="status">{t("자료를 불러오고 있습니다.")}</p>
      ) : (
        <div className="admin-dashboard">
          {(
            [
              ['activities', '활동'],
              ['mathematics', '수학 자료'],
              ['publications', '출판물'],
            ] as const
          ).map(([path, name]) => {
            const value = counts[path]
            return (
              <section key={name}>
                <h2>{t(name)}</h2>
                <dl>
                  <div>
                    <dt>{t("공개")}</dt>
                    <dd>{value.published}</dd>
                  </div>
                  <div>
                    <dt>{t("비공개")}</dt>
                    <dd>{value.draft}</dd>
                  </div>
                </dl>
                <div className="admin-card-actions">
                  <Link to={'/admin/' + path}>{t("목록 보기")}</Link>
                  <Link className="admin-primary" to={'/admin/' + path + '/new'}>{t("새로 작성")}</Link>
                </div>
              </section>
            )
          })}
        </div>
      )}
      {(import.meta.env.VITE_PUBLIC_DATA_SOURCE || 'local') === 'local' && (
        <p className="admin-notice">{t("현재 공개 사이트는 샘플 자료를 표시하고 있습니다. 여기서 저장한 자료는 서버에 저장되며, 공개 사이트를 실제 자료 모드로 전환한 뒤 표시됩니다.")}</p>
      )}
    </div>
  )
}
