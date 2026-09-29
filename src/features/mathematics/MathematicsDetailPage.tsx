import { ContentImage } from '../../components/content/ContentImage'
import { AttachmentList } from '../../components/content/AttachmentList'
import { useParams } from 'react-router-dom'
import { RelatedContent } from '../../components/content/RelatedContent'
import { MarkdownRenderer } from '../../components/content/MarkdownRenderer'
import { ContentState, MissingContent } from '../../components/ui/ContentState'
import { mathematicsRepository, resolveRelated } from '../../repositories/publicRepositories'
import { useRepository } from '../shared/useRepository'
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
  const r = data.record
  return (
    <article className="page-container detail-page">
      <header className="content-header">
        <p className="eyebrow">Mathematics · {r.field}</p>
        <h1>{r.title}</h1>
        <div className="detail-meta">
          {r.authors.join(', ')} · {r.type} · {r.field} · {r.year}
        </div>
        <p className="detail-summary">{r.summary}</p>
      </header>
      {r.coverImage.url && <ContentImage className="detail-hero" media={r.coverImage} />}
      <div className="reading-body">
        <MarkdownRenderer content={r.content} />
        <AttachmentList files={r.attachments} />
      </div>
      <RelatedContent content={data.related} />
    </article>
  )
}
