import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { Mathematics } from '../../models/mathematics'
import { useT } from '../../i18n/LanguageProvider'
import { hydrateBrowserDiagrams } from './browserDiagrams'
import { contentImageSource } from './contentImageSource'
import { bodyCoverPrefix, mathematicsCovers, type CoverBody, type CoverOption } from './mathematicsCovers'
import './MathematicsCover.css'

const Formula = lazy(() => import('./CoverFormula'))

export function useCoverOptions({ content, assets, diagrams, slug }: CoverBody, enabled: boolean) {
  const [result, setResult] = useState<{ body: CoverBody; options: CoverOption[]; failed?: boolean }>()
  useEffect(() => {
    if (!enabled) return
    let current = true
    const body = { content, assets, diagrams, slug }
    const timer = setTimeout(() => {
      mathematicsCovers(body).then(options => { if (current) setResult({ body, options }) },
        () => { if (current) setResult({ body, options: [], failed: true }) })
    }, 80)
    return () => { current = false; clearTimeout(timer) }
  }, [enabled, content, assets, diagrams, slug])
  return enabled && result && result.body.content === content && result.body.assets === assets &&
    result.body.diagrams === diagrams && result.body.slug === slug ? result : undefined
}

export function CoverVisual({ option }: { option: CoverOption }) {
  const t = useT()
  const root = useRef<HTMLDivElement>(null)
  const diagram = 'diagram' in option ? option.diagram : undefined
  useEffect(() => {
    if (root.current && diagram?.renderer === 'browser-v1') return hydrateBrowserDiagrams(root.current, [diagram], t)
  }, [diagram, t])
  return <div className="math-cover-art" data-kind={option.kind} ref={root}>
    {'src' in option ? <img src={option.src} alt={option.label} loading="lazy" /> :
      'expression' in option ? <Suspense fallback={null}><Formula expression={option.expression} display={option.kind === 'display'} /></Suspense> :
      diagram?.renderer === 'browser-v1' ? <div data-browser-diagram={diagram.id}><div className="browser-diagram-output" /></div> :
      diagram?.url ? <img src={diagram.url} alt={option.label} loading="lazy" /> : null}
  </div>
}

export function MathematicsCover({ item }: { item: Mathematics }) {
  const selected = item.coverImage.variant.startsWith(bodyCoverPrefix)
  const options = useCoverOptions(item, selected)?.options
  if (selected) {
    const option = options?.find(v => v.key === item.coverImage.variant)
    return option ? <CoverVisual option={option} /> : null
  }
  const legacy = contentImageSource(item.coverImage)
  return legacy ? <div className="math-cover-art"><img src={legacy} alt={item.coverImage.alt} loading="lazy" /></div> : null
}
