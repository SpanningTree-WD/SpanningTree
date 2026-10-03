import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useT } from '../../i18n/LanguageProvider'
import type { Member } from '../../models/people'
import { watchPublicMembers } from '../../repositories/memberRepository'
import { activityRepository, mathematicsRepository, publicationRepository } from '../../repositories/publicRepositories'
import { useRepository } from '../shared/useRepository'
import { usePageMetadata } from '../shared/usePageMetadata'
import { MissingContent } from '../../components/ui/ContentState'
function Records({ title, items }: { title: string; items: { id: string; title: string; url: string; year: string }[] }) {
  const t = useT()
  const [limit, setLimit] = useState(10)
  if (!items.length) return null
  return <section><h2>{t(title)}</h2><ul className="person-detail-list">{items.slice(0, limit).map(item => <li key={item.url}><Link to={item.url}>{item.title}</Link> <small>{item.year}</small></li>)}</ul>{items.length > limit && <button type="button" className="btn" onClick={() => setLimit(current => current + 10)}>{t('더 보기')}</button>}</section>
}
export function PersonDetailPage() {
  const t = useT()
  const { id = '' } = useParams()
  const [members, setMembers] = useState<Member[]>()
  const [memberError, setMemberError] = useState(false)
  useEffect(() => watchPublicMembers(setMembers, () => setMemberError(true)), [])
  const person = members?.find(member => member.id === id)
  const { data, error } = useRepository(async () => {
    const [activities, mathematics, publications] = await Promise.all([activityRepository.listPublished(), mathematicsRepository.listPublished(), publicationRepository.listPublished()])
    return {
      authored: [...mathematics.items.filter(record => record.status === 'published' && record.authorIds?.includes(id)).map(record => ({ id: record.id, title: record.title, url: '/mathematics/' + record.slug, year: String(record.year) })),
        ...publications.items.filter(record => record.status === 'published' && record.authorIds?.includes(id)).map(record => ({ id: record.id, title: record.title, url: '/publications/' + record.slug, year: String(record.year) }))].sort((a, b) => b.year.localeCompare(a.year)),
      activities: activities.items.filter(record => record.status === 'published' && record.participantIds?.includes(id)).map(record => ({ id: record.id, title: record.title, url: '/activities/' + record.slug, year: record.date })),
    }
  }, [id])
  usePageMetadata({ title: person?.name, description: person?.bio, noindex: memberError || (!!members && !person) })
  if (members && !person) return <MissingContent />
  return <article className="page-container detail-page"><Link to="/people">{t('← 구성원 목록')}</Link>
    {(error || memberError) ? <p role="alert">{t('자료를 불러오지 못했습니다. 다시 접속해 주세요.')}</p> : !person || !data ? <p role="status">{t('자료를 불러오고 있습니다.')}</p> : <>
      <header className="content-header"><p className="eyebrow">{t('{count}기', { count: person.generation })}</p><h1>{person.name}</h1>{person.bio && <p style={{ whiteSpace: 'pre-wrap' }}>{person.bio}</p>}</header>
      <div className="reading-body"><Records key={id + '-authored'} title="작성한 글" items={data.authored} /><Records key={id + '-activities'} title="참여한 활동" items={data.activities} />
        {!data.authored.length && !data.activities.length && <p>{t('연결된 공개 기록이 없습니다.')}</p>}
      </div>
    </>}
  </article>
}
