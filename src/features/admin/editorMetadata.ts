import { contentExcerpt } from '../../models/contentExcerpt'

interface EditorMetadata {
  title: string
  summary: string
  description?: string
  content?: string
  coverImage: { alt: string; variant: string; caption?: string }
}

export function contentSummary(record: EditorMetadata) {
  return contentExcerpt(record.content ?? record.description ?? '')
}

export function prepareEditorRecord<T extends EditorMetadata>(form: T, previous: T): T {
  return {
    ...form,
    // The visible summary is authoritative. Generate only when left blank.
    summary: form.summary.trim() ? form.summary : contentSummary(form),
    coverImage: {
      ...form.coverImage,
      alt:
        !previous.coverImage.alt || previous.coverImage.alt === previous.title
          ? form.title
          : form.coverImage.alt,
    },
  }
}
