import DOMPurify from 'dompurify'
import { useMemo } from 'react'
import { renderMath } from './mathjax'

export default function CoverFormula({ expression, display }: { expression: string; display: boolean }) {
  const html = useMemo(() => DOMPurify.sanitize(renderMath(expression, display), { USE_PROFILES: { html: true, svg: true, mathMl: true } }), [expression, display])
  return <div className="cover-formula" dangerouslySetInnerHTML={{ __html: html }} />
}
