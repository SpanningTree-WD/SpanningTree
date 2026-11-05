import { marked, type Token } from 'marked'

function excerptText(tokens: Token[]): string {
  return tokens.map(token => {
    if (token.type === 'code') return ''
    if (token.type === 'list') return excerptText(token.items)
    if ('tokens' in token && token.tokens) return excerptText(token.tokens)
    return token.raw
  }).join(' ')
}

// Keep the existing excerpt format so saved automatic summaries can be recognized.
export function contentExcerpt(source: string) {
  const text = excerptText(marked.lexer(source))
    .replace(/\{\{(?:asset|diagram):[^}]+\}\}|\[@[^\]]+\]/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/^[\s#>*-]+/gm, '')
    .replace(/[`*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 160 ? text.slice(0, 157) + '…' : text
}

export function detailSummary(summary: string, content: string) {
  const value = summary.trim()
  const compact = (text: string) => text.replace(/^[\s#>*-]+/gm, '').replace(/[\s`*_]/g, '')
  const truncatedPrefix = value.replace(/(?:…|\.{3})$/, '')
  const olderExcerpt = truncatedPrefix !== value && compact(truncatedPrefix).length > 0
    && compact(content).startsWith(compact(truncatedPrefix))
  // The introduction is immediately below the header. Do not repeat its excerpt,
  // which may also end inside a TeX delimiter in older records.
  return value && value !== contentExcerpt(content) && !olderExcerpt ? value : ''
}
