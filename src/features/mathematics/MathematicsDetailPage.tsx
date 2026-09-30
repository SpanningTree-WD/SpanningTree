import { MathematicsDetail } from '../../components/content/ContentDetail'
import { useParams } from 'react-router-dom'
import { RelatedContent } from '../../components/content/RelatedContent'
import { ContentState, MissingContent } from '../../components/ui/ContentState'
import { mathematicsRepository, resolveRelated } from '../../repositories/publicRepositories'
import { useRepository } from '../shared/useRepository'
import { usePageMetadata } from '../shared/usePageMetadata'
export function MathematicsDetailPage() {
  const { slug = '' } = useParams()
  const { data, error } = useRepository(async () => {
    const record = await mathematicsRepository.getPublishedBySlug(slug)
    return record
      ? {
          record,
          related: await resolveRelated({
            activities: record.relatedActivities,
            mathematics: record.relatedMathematics,
            publications: record.relatedPublications,
          }),
        }
      : null
  }, [slug])
  usePageMetadata({
    title: data?.record.title,
    description: data?.record.summary,
    noindex: error || data === null,
  })
  if (error)
    return (
      <div className="page-container">
        <ContentState title="Record unavailable">수학 기록을 불러오지 못했습니다.</ContentState>
      </div>
    )
  if (data === undefined)
    return (
      <div className="page-container">
        <ContentState title="Loading record">수학 기록을 불러오는 중입니다.</ContentState>
      </div>
    )
  if (!data) return <MissingContent />
  return (
    <MathematicsDetail record={data.record}>
      <RelatedContent content={data.related} />
    </MathematicsDetail>
  )
}
