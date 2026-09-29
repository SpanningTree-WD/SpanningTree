interface EditorMetadata {
  title: string
  summary: string
  description?: string
  content?: string
  coverImage: { alt: string; variant: string; caption?: string }
}

export function contentSummary(record: EditorMetadata) {
  const text = (record.content ?? record.description ?? '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/^[\s#>*-]+/gm, '')
    .replace(/[`*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 160 ? text.slice(0, 157) + '…' : text
}

export function prepareEditorRecord<T extends EditorMetadata>(form: T, previous: T): T {
  return {
    ...form,
    // Preserve earlier hand-written summaries; keep generated summaries in sync.
    summary:
      !previous.summary || previous.summary === contentSummary(previous)
        ? contentSummary(form)
        : form.summary,
    coverImage: {
      ...form.coverImage,
      alt:
        !previous.coverImage.alt || previous.coverImage.alt === previous.title
          ? form.title
          : form.coverImage.alt,
    },
  }
}
