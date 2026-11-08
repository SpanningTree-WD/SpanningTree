import { useEffect, useMemo, useRef } from 'react'
import { hydrateBrowserDiagrams } from './browserDiagrams'
import { renderMath } from './mathjax'
import { useT } from '../../i18n/LanguageProvider'
import { referenceLabel, referenceLink, type ReferenceEntry } from '../../models/authoring'
import { articleMarkup, type RenderOptions } from './articleMarkup'
import './AuthoringContent.css'

export { assetMarkup, safeContentUris, escapeHtml, type RenderOptions } from './articleMarkup'

export function renderArticleContent(markdown: string, options: RenderOptions = {}) {
  return articleMarkup(markdown, options, (expression, display) => renderMath(expression.trim(), display))
}
export function renderMarkdown(markdown: string, options: RenderOptions = {}): string {
  return renderArticleContent(markdown, options).html
}
export function ReferenceList({ references = [] }: { references?: ReferenceEntry[] }) {
  const t = useT()
  if (!references.length) return null
  return <section className="reference-list" aria-label={t('참고문헌')}><h2>{t('참고문헌')}</h2><ol>
    {references.map((ref, index) => <li key={ref.id} id={'reference-' + ref.id}><span className="reference-index">[{index + 1}]</span><div>
      {referenceLabel(ref)}{referenceLink(ref) && <> <a href={referenceLink(ref)} target="_blank" rel="noopener noreferrer">{ref.doi || t('링크')} ↗</a></>}
    </div></li>)}
  </ol></section>
}
export function MarkdownRenderer({ content, className = '', ...options }: RenderOptions & { content: string; className?: string }) {
  const t = useT()
  const root = useRef<HTMLDivElement>(null)
  const { assets, diagrams: legacyDiagrams, references } = options
  const { html, diagrams } = useMemo(() => renderArticleContent(content, { assets, diagrams: legacyDiagrams, references, t }), [content, assets, legacyDiagrams, references, t])
  useEffect(() => {
    if (root.current) return hydrateBrowserDiagrams(root.current, diagrams, t)
  }, [html, diagrams, t])
  return <div ref={root} className={('markdown-content ' + className).trim()} dangerouslySetInnerHTML={{ __html: html }} />
}
