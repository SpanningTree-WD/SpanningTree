import { PublicationDetail } from '../../components/content/ContentDetail'
import { useParams } from 'react-router-dom'
import { RelatedContent } from '../../components/content/RelatedContent'
import { ContentState, MissingContent } from '../../components/ui/ContentState'
import { publicationRepository, resolveRelated } from '../../repositories/publicRepositories'
import { useRepository } from '../shared/useRepository'
import { usePageMetadata } from '../shared/usePageMetadata'
export function PublicationDetailPage() {
  const { slug = '' } = useParams()
  const { data, error } = useRepository(async () => {
    const record = await publicationRepository.getPublishedBySlug(slug)
    return record
      ? {
          record,
          related: await resolveRelated({
            activities: record.relatedActivities,
            mathematics: record.relatedMathematics,
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
        <ContentState title="Record unavailable">출판 기록을 불러오지 못했습니다.</ContentState>
      </div>
    )
  if (data === undefined)
    return (
      <div className="page-container">
        <ContentState title="Loading record">출판 기록을 불러오는 중입니다.</ContentState>
      </div>
    )
  if (!data) return <MissingContent />
  return (
    <PublicationDetail record={data.record}>
      <RelatedContent content={data.related} />
    </PublicationDetail>
  )
}
