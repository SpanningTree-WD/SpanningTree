import type { Mathematics } from '../../models/mathematics'
import type { DiagramBlock } from '../../models/authoring'
import { articleMarkup } from './articleMarkup'
import { isUploadUrl } from '../../services/uploads/uploadTypes'

export type CoverBody = Pick<Mathematics, 'content' | 'assets' | 'diagrams' | 'slug'>
type Visual =
  | { kind: 'image'; src: string }
  | { kind: 'tikz' | 'asymptote'; diagram: DiagramBlock }
  | { kind: 'display' | 'inline'; expression: string }
export type CoverOption = Visual & { key: string; label: string }
export const bodyCoverPrefix = 'body-v1:'

// Only a fixed-size reference lives in coverImage.variant. Reordering the article
// cannot select a different diagram or formula, and a removed item never renders.
async function keyFor(identity: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity))
  return bodyCoverPrefix + Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('')
}

export async function mathematicsCovers({ content, assets, diagrams, slug }: CoverBody): Promise<CoverOption[]> {
  const equations: { expression: string; display: boolean }[] = []
  const rendered = articleMarkup(content, { assets, diagrams }, (tex, display) => {
    const i = equations.push({ expression: tex.trim(), display }) - 1
    return '<span data-cover-equation="' + i + '"></span>'
  })
  const template = document.createElement('template')
  template.innerHTML = rendered.html
  const options = new Map<string, Visual & { label: string }>()
  const add = (identity: string[], option: Visual & { label: string }) => options.set(JSON.stringify(identity), option)
  for (const node of template.content.querySelectorAll<HTMLElement>('[data-cover-equation], [data-browser-diagram], img')) {
    if (node.dataset.coverEquation !== undefined) {
      const equation = equations[Number(node.dataset.coverEquation)]
      if (!equation?.expression) continue
      const kind = equation.display ? 'display' : 'inline'
      add([kind, equation.expression], { kind, expression: equation.expression, label: equation.expression })
    } else if (node.dataset.browserDiagram) {
      const diagram = rendered.diagrams.find(d => d.id === node.dataset.browserDiagram)
      if (!diagram?.source.trim()) continue
      const stored = diagrams?.some(d => d.id === diagram.id)
      add(stored ? ['diagram', diagram.id] : [diagram.language, diagram.source], {
        kind: diagram.language, diagram, label: diagram.caption || diagram.alt || diagram.language,
      })
    } else {
      const src = node.getAttribute('src')
      if (!src) continue
      let url: URL
      try { url = new URL(src, new URL('/mathematics/' + encodeURIComponent(slug), window.location.origin)) } catch { continue }
      if (!['https:', 'http:'].includes(url.protocol)) continue
      const assetId = node.closest<HTMLElement>('[data-asset-id]')?.dataset.assetId
      const diagramId = node.closest<HTMLElement>('[data-legacy-diagram]')?.dataset.legacyDiagram
      const diagram = diagrams?.find(d => d.id === diagramId)
      if (diagram && diagram.url && isUploadUrl(diagram.url)) {
        add(['diagram', diagram.id], { kind: diagram.language, diagram, label: diagram.caption || diagram.alt || diagram.language })
      } else {
        const identity = assetId ? ['asset', assetId] : ['image', src]
        add(identity, { kind: 'image', src: url.href, label: node.getAttribute('alt') || src.split('/').pop() || src })
      }
    }
  }
  return Promise.all([...options].map(async ([identity, option]) => ({ ...option, key: await keyFor(identity) })))
}

export async function prepareMathematicsCover(record: Mathematics): Promise<Mathematics> {
  if (!record.coverImage.variant.startsWith(bodyCoverPrefix)) return record
  const options = await mathematicsCovers(record)
  return options.some(option => option.key === record.coverImage.variant)
    ? record : { ...record, coverImage: { variant: 'blue', alt: '' } }
}
