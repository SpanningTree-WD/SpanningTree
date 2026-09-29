import { ContentImage } from '../../components/content/ContentImage'
import { AttachmentList } from '../../components/content/AttachmentList'
import { useParams } from 'react-router-dom'
import { RelatedContent } from '../../components/content/RelatedContent'
import { ContentState, MissingContent } from '../../components/ui/ContentState'
import { activityRepository, resolveRelated } from '../../repositories/publicRepositories'
import { useRepository } from '../shared/useRepository'
import { usePageMetadata } from '../shared/usePageMetadata'
export function ActivityDetailPage() {
  const { slug = '' } = useParams()
  const { data, error } = useRepository(async () => {
    const record = await activityRepository.getPublishedBySlug(slug)
    return record
      ? {
          record,
          related: await resolveRelated({
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
        <ContentState title="Record unavailable">활동 기록을 불러오지 못했습니다.</ContentState>
      </div>
    )
  if (data === undefined)
    return (
      <div className="page-container">
        <ContentState title="Loading record">활동 기록을 불러오는 중입니다.</ContentState>
      </div>
    )
  if (!data) return <MissingContent />
  return (
    <article className="page-container detail-page">
      <header className="content-header">
        <p className="eyebrow">Activity · {data.record.type}</p>
        <h1>{data.record.title}</h1>
        <div className="detail-meta">
          <time>{data.record.date.replaceAll('-', '.')}</time> · {data.record.type}
        </div>
        <p className="detail-summary">{data.record.summary}</p>
      </header>
      <ContentImage className="detail-hero photo" media={data.record.coverImage} />
      <div className="reading-body">
        <p>{data.record.description}</p>
      </div>
      <section className="gallery">
        <h2>Gallery</h2>
        {data.record.gallery.map((media) => (
          <figure key={media.alt}>
            <ContentImage className="photo" media={media} />
            <figcaption>{media.caption}</figcaption>
          </figure>
        ))}
      </section>
      <AttachmentList files={data.record.attachments ?? []} />
      <RelatedContent content={data.related} />
    </article>
  )
}
