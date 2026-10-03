import { useT } from '../../i18n/LanguageProvider'
import type { ReactNode } from 'react'
import type { Activity } from '../../models/activity'
import type { Mathematics } from '../../models/mathematics'
import type { Publication } from '../../models/publication'
import { formatMathematicsFields } from '../../models/mathematicsFields'
import { AttachmentList, type PendingAttachment } from './AttachmentList'
import { ContentImage } from './ContentImage'
import { MarkdownRenderer, ReferenceList, assetMarkup } from './MarkdownRenderer'
import type { AssetView } from '../../models/authoring'
import { PersonLinks } from './PersonLinks'
import DOMPurify from 'dompurify'

interface DetailProps<T> {
  record: T
  children?: ReactNode
  imagePreviewUrl?: string
  pendingFiles?: PendingAttachment[]
  assetViews?: AssetView[]
}

function ArticleAssetList({ assets = [], excluded = [] }: { assets?: AssetView[]; excluded?: (string | undefined)[] }) {
  const t = useT()
  const visible = assets.filter(asset => !asset.url || !excluded.includes(asset.url))
  if (!visible.length) return null
  return <section className="article-asset-list"><h2>{t('첨부 파일')}</h2>{visible.map(asset => <div key={asset.id} className="markdown-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(assetMarkup(asset, t), { ADD_URI_SAFE_ATTR: ['src'] }) }} />)}</section>
}

// Public pages and editor previews share markup and sizing. Preview object URLs
// are kept separate from the persisted record and accepted only by ContentImage.
export function ActivityDetail({ record: r, children, imagePreviewUrl, pendingFiles = [], assetViews }: DetailProps<Activity>) {
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
        {!!(r.participantIds?.length || r.participants?.length) && <p>{t('참여자')}: <PersonLinks ids={r.participantIds} legacy={r.participants} /></p>}
      </header>
      <ContentImage className="detail-hero photo" media={r.coverImage} previewUrl={imagePreviewUrl} />
      <div className="reading-body">
        <MarkdownRenderer content={r.description} assets={assetViews ?? r.assets} diagrams={r.diagrams} />
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
      <ArticleAssetList assets={assetViews ?? r.assets} excluded={[r.coverImage.url, ...(r.attachments ?? []).map(file => file.url)]} />
      {children}
    </article>
  )
}

export function MathematicsDetail({ record: r, children, imagePreviewUrl, pendingFiles = [], assetViews }: DetailProps<Mathematics>) {
  const t = useT()

  return (
    <article className="page-container detail-page">
      <header className="content-header">
        <p className="eyebrow">{t('Mathematics')} · {formatMathematicsFields(r)}</p>
        <h1>{r.title}</h1>
        <div className="detail-meta">
          <PersonLinks ids={r.authorIds} legacy={r.authors} /> · {r.type} · {formatMathematicsFields(r)} · {r.year}
        </div>
        <p className="detail-summary">{r.summary}</p>
      </header>
      {(r.coverImage.url || imagePreviewUrl?.startsWith('blob:')) && (
        <ContentImage className="detail-hero" media={r.coverImage} previewUrl={imagePreviewUrl} />
      )}
      <div className="reading-body">
        <MarkdownRenderer content={r.content} assets={assetViews ?? r.assets} diagrams={r.diagrams} references={r.references} />
        <ReferenceList references={r.references} />
        <AttachmentList files={r.attachments} pendingFiles={pendingFiles} />
        <ArticleAssetList assets={assetViews ?? r.assets} excluded={[r.coverImage.url, ...r.attachments.map(file => file.url)]} />
      </div>
      {children}
    </article>
  )
}

export function PublicationDetail({ record: r, children, imagePreviewUrl, pendingFiles = [], assetViews }: DetailProps<Publication>) {
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
          <MarkdownRenderer content={r.description} assets={assetViews ?? r.assets} diagrams={r.diagrams} />
          <dl className="metadata-list">
            <div>
              <dt>{t("Editors")}</dt>
              <dd>{r.editors.join(', ') || '—'}</dd>
            </div>
            <div>
              <dt>{t("Contributors")}</dt>
              <dd>{r.authors.length || r.authorIds?.length ? <PersonLinks ids={r.authorIds} legacy={r.authors} /> : t('Spanning Tree members')}</dd>
            </div>
          </dl>
          <AttachmentList files={pendingFiles.length ? [] : r.pdf ? [r.pdf] : []} pendingFiles={pendingFiles} />
          <ArticleAssetList assets={assetViews ?? r.assets} excluded={[r.coverImage.url, r.pdf?.url]} />
        </div>
      </div>
      {children}
    </article>
  )
}
