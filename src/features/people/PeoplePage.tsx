import { useT } from '../../i18n/LanguageProvider'
import { Link } from 'react-router-dom'
import { usePageMetadata } from '../shared/usePageMetadata'
import { useEffect, useState } from 'react'
import { PageHeading } from '../../components/archive/ArchiveComponents'
import { ContentState } from '../../components/ui/ContentState'
import { groupMembers, type Member } from '../../models/people'
import { watchPublicMembers } from '../../repositories/memberRepository'


export function PeoplePage() {
  const t = useT()

  usePageMetadata()
  const [members, setMembers] = useState<Member[]>()
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    setError(false)
    return watchPublicMembers(setMembers, () => setError(true))
  }, [retry])
  return (
    <div className="page-container people-page">
      <PageHeading title={t("People")}>{t("Spanning Tree의 기수별 구성원 명단입니다.")}</PageHeading>
      {error ? (
        <div role="alert">
          <p>{t("명단을 불러오지 못했습니다.")}</p>
          <button onClick={() => setRetry((value) => value + 1)}>{t("다시 시도")}</button>
        </div>
      ) : !members ? (
        <ContentState title={t("명단을 불러오고 있습니다")}>{t("잠시만 기다려 주세요.")}</ContentState>
      ) : !members.length ? (
        <ContentState title={t("등록된 구성원이 없습니다")}>{t("명단을 준비하고 있습니다.")}</ContentState>
      ) : (
        <div className="people-roster">
          {groupMembers(members).map((generation) => (
            <section
              className="people-generation"
              key={generation.number}
              aria-label={t('{count}기', { count: generation.number })}
            >
              <div className="people-generation-label">
                <h2>{t('{count}기', { count: generation.number })}</h2>
                <small>{t('{count}명', { count: generation.members.length })}</small>
              </div>
              <ul className="people-members">
                {generation.members.map((member) => (
                  <li
                    key={member.id}
                    className={`people-person${member.isLeader ? ' is-leader' : ''}`}
                  >
                    <Link to={'/people/' + encodeURIComponent(member.id)}>{member.name}</Link>
                    {member.isLeader && <span className="visually-hidden">{t("(학년 장)")}</span>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className="people-leader-key">{t("두꺼운 테두리: 학년 장")}</p>
        </div>
      )}
    </div>
  )
}
