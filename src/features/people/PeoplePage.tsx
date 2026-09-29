import { usePageMetadata } from '../shared/usePageMetadata'
import { useEffect, useState } from 'react'
import { PageHeading } from '../../components/archive/ArchiveComponents'
import { ContentState } from '../../components/ui/ContentState'
import { groupMembers, type Member } from '../../models/people'
import { watchPublicMembers } from '../../repositories/memberRepository'


export function PeoplePage() {
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
      <PageHeading title="People">
        Spanning Tree의 기수별 구성원 명단입니다.
      </PageHeading>
      {error ? (
        <div role="alert">
          <p>명단을 불러오지 못했습니다.</p>
          <button onClick={() => setRetry((value) => value + 1)}>다시 시도</button>
        </div>
      ) : !members ? (
        <ContentState title="명단을 불러오고 있습니다">잠시만 기다려 주세요.</ContentState>
      ) : !members.length ? (
        <ContentState title="등록된 구성원이 없습니다">명단을 준비하고 있습니다.</ContentState>
      ) : (
        <div className="people-roster">
          {groupMembers(members).map((generation) => (
            <section
              className="people-generation"
              key={generation.number}
              aria-label={`${generation.number}기`}
            >
              <div className="people-generation-label">
                <h2>{generation.number}기</h2>
                <small>{generation.members.length}명</small>
              </div>
              <ul className="people-members">
                {generation.members.map((member) => (
                  <li
                    key={member.id}
                    className={`people-person${member.isLeader ? ' is-leader' : ''}`}
                  >
                    {member.name}
                    {member.isLeader && <span className="visually-hidden"> (학년 장)</span>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className="people-leader-key">두꺼운 테두리: 학년 장</p>
        </div>
      )}
    </div>
  )
}
