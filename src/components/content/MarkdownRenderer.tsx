import DOMPurify from 'dompurify'
import { useEffect, useMemo, useRef } from 'react'
import { hydrateBrowserDiagrams } from './browserDiagrams'
import { renderMath } from './mathjax'
import { Marked } from 'marked'
import { useT } from '../../i18n/LanguageProvider'
import { referenceLabel, referenceLink, type AssetView, type DiagramBlock, type ReferenceEntry } from '../../models/authoring'
import { fileSizeLabel, isUploadUrl } from '../../services/uploads/uploadTypes'
import { diagramFromFence } from '../../models/diagramSource'
import './AuthoringContent.css'

export interface RenderOptions {
  assets?: AssetView[]
  diagrams?: DiagramBlock[]
  references?: ReferenceEntry[]
  t?: (text: string) => string
}
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
export const safeContentUris = /^(?:(?:https?|mailto|tel|blob):|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i
export function assetMarkup(asset: AssetView | undefined, t: (text: string) => string = text => text) {
  if (!asset) return '<aside class="asset-error" role="status">' + escapeHtml(t('첨부 파일을 찾을 수 없습니다.')) + '</aside>'
  const image = asset.mediaType.startsWith('image/')
  const source = asset.previewUrl?.startsWith('blob:') ? asset.previewUrl : isUploadUrl(asset.url) ? asset.url : undefined
  const state = asset.state && asset.state !== 'ready'
    ? '<span class="asset-state" role="status">' + escapeHtml(t(asset.state === 'failed' ? '첨부 실패' : asset.state === 'queued' ? '업로드 대기' : '업로드 중')) + (asset.percent !== undefined ? ' · ' + asset.percent + '%' : '') + '</span>' : ''
  const width = Math.min(100, Math.max(10, asset.width ?? 100))
  const align = ['left', 'right'].includes(asset.align ?? '') ? asset.align : 'center'
  if (image) return '<figure class="body-image align-' + align + '" style="width:' + width + '%" data-asset-id="' + escapeHtml(asset.id) + '">' + (source ? '<img src="' + escapeHtml(source) + '" alt="' + escapeHtml(asset.alt ?? asset.fileName) + '" loading="lazy">' : '<span class="asset-placeholder">▧</span>') + state + (asset.caption ? '<figcaption>' + escapeHtml(asset.caption) + '</figcaption>' : '') + '</figure>'
  return '<div class="body-file" data-asset-id="' + escapeHtml(asset.id) + '"><span aria-hidden="true">PDF</span><div>' + (source ? '<a href="' + escapeHtml(source) + '" target="_blank" rel="noopener noreferrer" download>' + escapeHtml(asset.fileName) + '</a>' : escapeHtml(asset.fileName)) + '<small>PDF' + (asset.size ? ' · ' + fileSizeLabel(asset.size) : '') + '</small>' + state + '</div></div>'
}
function browserDiagramMarkup(diagram: DiagramBlock, t: (text: string) => string) {
  return '<figure class="body-image align-center browser-diagram" data-browser-diagram="' + escapeHtml(diagram.id) + '" data-diagram-hash="' + escapeHtml(diagram.sourceHash ?? '') + '"><div class="browser-diagram-output"><p role="status">' + escapeHtml(t('도형을 그리는 중…')) + '</p></div>' + (diagram.caption ? '<figcaption>' + escapeHtml(diagram.caption) + '</figcaption>' : '') + '</figure>'
}
export function renderArticleContent(markdown: string, options: RenderOptions = {}) {
  const t = options.t ?? (text => text)
  const engine = new Marked({ breaks: false, gfm: true })
  const diagrams = [...options.diagrams ?? []]
  const ids = new Set(diagrams.map(diagram => diagram.id))
  let nextDiagram = 0
  engine.use({ renderer: { code(token) {
    let id: string
    do { id = 'source-diagram-' + nextDiagram++ } while (ids.has(id))
    const diagram = diagramFromFence(token, id)
    if (!diagram) return false
    ids.add(id); diagrams.push(diagram)
    return browserDiagramMarkup(diagram, t)
  } } })
  const math = (expression: string, displayMode: boolean) => renderMath(expression.trim(), displayMode)
  engine.use({ extensions: [
    {
      name: 'mathBlock', level: 'block',
      start: src => src.search(/\$\$|\\\[/),
      tokenizer(src) {
        const match = /^(?:\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\])(?:[ \t]*\n|$)/.exec(src)
        if (match) return { type: 'mathBlock', raw: match[0], text: match[1] ?? match[2] }
      },
      renderer: token => math(token.text, true),
    },
    {
      name: 'mathInline', level: 'inline', start: src => src.search(/\$|\\\(/),
      tokenizer(src) {
        const match = /^(?:\\\(([\s\S]+?)\\\)|\$(?!\$)([^\s$](?:[^$\n]|\\\$)*?[^\s$]|[^\s$])\$(?!\d))/.exec(src)
        if (match) return { type: 'mathInline', raw: match[0], text: match[1] ?? match[2] }
      },
      renderer: token => math(token.text, false),
    },
    {
      name: 'articleBlock', level: 'block', start: src => src.search(/\{\{(?:asset|diagram):/),
      tokenizer(src) {
        const match = /^\{\{(asset|diagram):([a-zA-Z0-9_-]+)\}\}(?:[ \t]*\n|$)/.exec(src)
        if (match) return { type: 'articleBlock', raw: match[0], kind: match[1], id: match[2] }
      },
      renderer(token) {
        if (token.kind === 'asset') return assetMarkup(options.assets?.find(asset => asset.id === token.id), t)
        const diagram = options.diagrams?.find(item => item.id === token.id)
        if (diagram?.renderer === 'browser-v1') return browserDiagramMarkup(diagram, t)
        if (!diagram?.url || !isUploadUrl(diagram.url)) return '<aside class="asset-error">' + escapeHtml(t('도형을 렌더링해 주세요.')) + '</aside>'
        return '<figure class="body-image align-center"><img src="' + escapeHtml(diagram.url) + '" alt="' + escapeHtml(diagram.alt || diagram.language) + '">' + (diagram.caption ? '<figcaption>' + escapeHtml(diagram.caption) + '</figcaption>' : '') + '</figure>'
      },
    },
    {
      name: 'citation', level: 'inline', start: src => src.indexOf('[@'),
      tokenizer(src) {
        const match = /^\[((?:@[a-zA-Z0-9_-]+\s*;?\s*)+)\]/.exec(src)
        if (match) return { type: 'citation', raw: match[0], ids: [...match[1].matchAll(/@([a-zA-Z0-9_-]+)/g)].map(item => item[1]) }
      },
      renderer: token => '<span class="citations">' + token.ids.map((id: string) => {
        const index = options.references?.findIndex(ref => ref.id === id) ?? -1
        return index < 0 ? '<span class="asset-error">[' + escapeHtml(t('없는 참고문헌')) + ']</span>' : '<a href="#reference-' + escapeHtml(id) + '" aria-label="' + escapeHtml(t('참고문헌')) + ' ' + (index + 1) + '">[' + (index + 1) + ']</a>'
      }).join(', ') + '</span>',
    },
  ] })
  const html = DOMPurify.sanitize(engine.parse(markdown, { async: false }) as string, {
    USE_PROFILES: { html: true, svg: true, mathMl: true }, ADD_ATTR: ['aria-hidden'], ALLOWED_URI_REGEXP: safeContentUris,
  })
  return { html, diagrams }
}
export function renderMarkdown(markdown: string, options: RenderOptions = {}): string {
  return renderArticleContent(markdown, options).html
}
export function ReferenceList({ references = [] }: { references?: ReferenceEntry[] }) {
  const t = useT()
  if (!references.length) return null
  return <section className="reference-list" aria-label={t('참고문헌')}><h2>{t('참고문헌')}</h2><ol>
    {references.map((ref, index) => <li key={ref.id} id={'reference-' + ref.id}><span>[{index + 1}]</span><div>
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
