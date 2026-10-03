import { useT } from '../../i18n/LanguageProvider'
import type { ReactNode } from 'react'
import type { Activity } from '../../models/activity'
import type { Mathematics } from '../../models/mathematics'
import type { Publication } from '../../models/publication'
import { formatMathematicsFields } from '../../models/mathematicsFields'
import { AttachmentList, type PendingAttachment } from './AttachmentList'
import { ContentImage } from './ContentImage'
import { MarkdownRenderer } from './MarkdownRenderer'

interface DetailProps<T> {
  record: T
  children?: ReactNode
  imagePreviewUrl?: string
  pendingFiles?: PendingAttachment[]
}

// Public pages and editor previews share markup and sizing. Preview object URLs
// are kept separate from the persisted record and accepted only by ContentImage.
export function ActivityDetail({ record: r, children, imagePreviewUrl, pendingFiles = [] }: DetailProps<Activity>) {
  const t = useT()

  return (
    <article className="page-container detail-page">
      <header className="content-header">
        <p className="eyebrow">{t('Activity')} · {r.type}</p>
        <h1>{r.title}</h1>
        <div className="detail-meta">
          <time>{r.date.replaceAll('-', '.')}</time> · {r.type}
        </div>
        <p className="detail-summary">{r.summary}</p>
      </header>
      <ContentImage className="detail-hero photo" media={r.coverImage} previewUrl={imagePreviewUrl} />
      <div className="reading-body">
        <p>{r.description}</p>
      </div>
      <section className="gallery">
        <h2>{t("Gallery")}</h2>
        {r.gallery.map((media) => (
          <figure key={media.alt}>
            <ContentImage className="photo" media={media} />
            <figcaption>{media.caption}</figcaption>
          </figure>
        ))}
      </section>
      <AttachmentList files={r.attachments ?? []} pendingFiles={pendingFiles} />
      {children}
    </article>
  )
}

export function MathematicsDetail({ record: r, children, imagePreviewUrl, pendingFiles = [] }: DetailProps<Mathematics>) {
  const t = useT()

  return (
    <article className="page-container detail-page">
      <header className="content-header">
        <p className="eyebrow">{t('Mathematics')} · {formatMathematicsFields(r)}</p>
        <h1>{r.title}</h1>
        <div className="detail-meta">
          {r.authors.join(', ')} · {r.type} · {formatMathematicsFields(r)} · {r.year}
        </div>
        <p className="detail-summary">{r.summary}</p>
      </header>
      {(r.coverImage.url || imagePreviewUrl?.startsWith('blob:')) && (
        <ContentImage className="detail-hero" media={r.coverImage} previewUrl={imagePreviewUrl} />
      )}
      <div className="reading-body">
        <MarkdownRenderer content={r.content} />
        <AttachmentList files={r.attachments} pendingFiles={pendingFiles} />
      </div>
      {children}
    </article>
  )
}

export function PublicationDetail({ record: r, children, imagePreviewUrl, pendingFiles = [] }: DetailProps<Publication>) {
  const t = useT()

  return (
    <article className="page-container detail-page">
      <header className="content-header">
        <p className="eyebrow">{t('Publication')} · {r.type}</p>
        <h1>{r.title}</h1>
        <div className="detail-meta">
          {r.type} · {r.year}
        </div>
        <p className="detail-summary">{r.summary}</p>
      </header>
      <div className="publication-detail-grid">
        <ContentImage
          className="cover detail-cover"
          media={r.coverImage}
          title={r.title}
          previewUrl={imagePreviewUrl}
        />
        <div>
          <h2>{t("About this publication")}</h2>
          <p>{r.description}</p>
          <dl className="metadata-list">
            <div>
              <dt>{t("Editors")}</dt>
              <dd>{r.editors.join(', ') || '—'}</dd>
            </div>
            <div>
              <dt>{t("Contributors")}</dt>
              <dd>{r.authors.join(', ') || t('Spanning Tree members')}</dd>
            </div>
          </dl>
          <AttachmentList files={pendingFiles.length ? [] : r.pdf ? [r.pdf] : []} pendingFiles={pendingFiles} />
        </div>
      </div>
      {children}
    </article>
  )
}
