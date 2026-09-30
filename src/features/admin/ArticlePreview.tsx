import type { ReactNode } from 'react'
import type { PendingAttachment } from '../../components/content/AttachmentList'
import type { Activity } from '../../models/activity'
import type { Mathematics } from '../../models/mathematics'
import type { Publication } from '../../models/publication'
import {
  ActivityDetail,
  MathematicsDetail,
  PublicationDetail,
} from '../../components/content/ContentDetail'
import './ArticlePreview.css'

type PreviewRecord =
  | { collection: 'activities'; record: Activity }
  | { collection: 'mathematics'; record: Mathematics }
  | { collection: 'publications'; record: Publication }

export type ArticlePreviewProps = PreviewRecord & {
  imagePreviewUrl?: string
  pendingFiles?: PendingAttachment[]
  children?: ReactNode
}

export function ArticlePreview(props: ArticlePreviewProps) {
  return (
    <section className="editor-article-preview" aria-label="글 미리보기">
      {props.collection === 'activities' ? (
        <ActivityDetail record={props.record} imagePreviewUrl={props.imagePreviewUrl} pendingFiles={props.pendingFiles} />
      ) : props.collection === 'mathematics' ? (
        <MathematicsDetail record={props.record} imagePreviewUrl={props.imagePreviewUrl} pendingFiles={props.pendingFiles} />
      ) : (
        <PublicationDetail record={props.record} imagePreviewUrl={props.imagePreviewUrl} pendingFiles={props.pendingFiles} />
      )}
      {props.children}
    </section>
  )
}
