import { useT } from '../../i18n/LanguageProvider'
import { ActivityDetail } from '../../components/content/ContentDetail'
import { useParams } from 'react-router-dom'
import { RelatedContent } from '../../components/content/RelatedContent'
import { ContentState, MissingContent } from '../../components/ui/ContentState'
import { activityRepository, resolveRelated, relatedMathematicsIds } from '../../repositories/publicRepositories'
import { useRepository } from '../shared/useRepository'
import { usePageMetadata } from '../shared/usePageMetadata'
export function ActivityDetailPage() {
  const t = useT()

  const { slug = '' } = useParams()
  const { data, error } = useRepository(async () => {
    const record = await activityRepository.getPublishedBySlug(slug)
    return record
      ? {
          record,
          related: await resolveRelated({
            mathematics: await relatedMathematicsIds(record),
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
        <ContentState title="Record unavailable">{t("활동 기록을 불러오지 못했습니다.")}</ContentState>
      </div>
    )
  if (data === undefined)
    return (
      <div className="page-container">
        <ContentState title="Loading record">{t("활동 기록을 불러오는 중입니다.")}</ContentState>
      </div>
    )
  if (!data) return <MissingContent />
  return (
    <ActivityDetail record={data.record}>
      <RelatedContent content={data.related} />
    </ActivityDetail>
  )
}
