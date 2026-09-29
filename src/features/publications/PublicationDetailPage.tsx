import { ContentImage } from '../../components/content/ContentImage'
import { AttachmentList } from '../../components/content/AttachmentList'
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
  const r = data.record
  return (
    <article className="page-container detail-page">
      <header className="content-header">
        <p className="eyebrow">Publication · {r.type}</p>
        <h1>{r.title}</h1>
        <div className="detail-meta">
          {r.type} · {r.year}
        </div>
        <p className="detail-summary">{r.summary}</p>
      </header>
      <div className="publication-detail-grid">
        <ContentImage className="cover detail-cover" media={r.coverImage} title={r.title} />
        <div>
          <h2>About this publication</h2>
          <p>{r.description}</p>
          <dl className="metadata-list">
            <div>
              <dt>Editors</dt>
              <dd>{r.editors.join(', ') || '—'}</dd>
            </div>
            <div>
              <dt>Contributors</dt>
              <dd>{r.authors.join(', ') || 'Spanning Tree members'}</dd>
            </div>
          </dl>
          <AttachmentList files={r.pdf ? [r.pdf] : []} />
        </div>
      </div>
      <RelatedContent content={data.related} />
    </article>
  )
}
