import DOMPurify from 'dompurify'
import katex from 'katex'
import { marked } from 'marked'

marked.use({ breaks: false, gfm: true })

export function renderMarkdown(markdown: string): string {
  const math: string[] = []
  const tokenized = markdown
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, expression: string) => `\n\nMATHBLOCK${math.push(katex.renderToString(expression.trim(), { displayMode: true, throwOnError: false })) - 1}ENDMATH\n\n`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, expression: string) => `MATHINLINE${math.push(katex.renderToString(expression.trim(), { displayMode: false, throwOnError: false })) - 1}ENDMATH`)
  const rendered = marked.parse(tokenized, { async: false }) as string
  const restored = rendered
    .replace(/MATHBLOCK(\d+)ENDMATH/g, (_, index: string) => math[Number(index)])
    .replace(/MATHINLINE(\d+)ENDMATH/g, (_, index: string) => math[Number(index)])
  return DOMPurify.sanitize(restored, { USE_PROFILES: { html: true }, ADD_ATTR: ['aria-hidden'] })
}

export function MarkdownRenderer({ content, className = '' }: { content: string; className?: string }) {
  return <div className={`markdown-content ${className}`.trim()} dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
}
