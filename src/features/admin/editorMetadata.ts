import { marked, type Token } from 'marked'

interface EditorMetadata {
  title: string
  summary: string
  description?: string
  content?: string
  coverImage: { alt: string; variant: string; caption?: string }
}

function plainSummary(source: string) {
  const text = source
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/^[\s#>*-]+/gm, '')
    .replace(/[`*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 160 ? text.slice(0, 157) + '…' : text
}

function summaryText(tokens: Token[]): string {
  return tokens.map(token => {
    if (token.type === 'code') return ''
    if (token.type === 'list') return summaryText(token.items)
    if ('tokens' in token && token.tokens) return summaryText(token.tokens)
    return token.raw
  }).join(' ')
}

export function contentSummary(record: EditorMetadata) {
  const source = record.content ?? record.description ?? ''
  return plainSummary(summaryText(marked.lexer(source))
    .replace(/\{\{(?:asset|diagram):[^}]+\}\}|\[@[^\]]+\]/g, ''))
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
