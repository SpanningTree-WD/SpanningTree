import { mathjax } from '@mathjax/src/js/mathjax.js'
import { TeX } from '@mathjax/src/js/input/tex.js'
import { SVG } from '@mathjax/src/js/output/svg.js'
import { liteAdaptor } from '@mathjax/src/js/adaptors/liteAdaptor.js'
import { RegisterHTMLHandler } from '@mathjax/src/js/handlers/html.js'
import { MathJaxTexFont } from '@mathjax/mathjax-tex-font/js/svg.js'
import '@mathjax/src/js/input/tex/ams/AmsConfiguration.js'
import '@mathjax/src/js/input/tex/newcommand/NewcommandConfiguration.js'
import '@mathjax/src/js/input/tex/noundefined/NoUndefinedConfiguration.js'
import '@mathjax/src/js/input/tex/mathtools/MathtoolsConfiguration.js'
import '@mathjax/src/js/input/tex/boldsymbol/BoldsymbolConfiguration.js'

const adaptor = liteAdaptor()
RegisterHTMLHandler(adaptor)
const cache = new Map<string, string>()
const escape = (text: string) => text.replace(/[&<>"']/g, value => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[value]!)
/** Locally bundled MathJax 4 and SVG fonts: no CDN, autoload, HTML, or require extension. */
export function renderMath(expression: string, display: boolean) {
  const key = String(display) + ':' + expression
  const previous = cache.get(key)
  if (previous) return previous
  try {
    if (expression.length > 16000) throw new Error('수식은 16,000자 이내로 입력해 주세요.')
    const input = new TeX({
      packages: ['base', 'ams', 'newcommand', 'noundefined', 'mathtools', 'boldsymbol'],
      maxBuffer: 20000, maxMacros: 1000,
    })
    const output = new SVG({ font: new MathJaxTexFont(), fontCache: 'none' })
    const document = mathjax.document('', { InputJax: input, OutputJax: output })
    const node = document.convert(expression, { display, em: 16, ex: 8, containerWidth: 760 })
    const svg = adaptor.innerHTML(node)
    const result = '<span class="mathjax-equation ' + (display ? 'mathjax-display' : 'mathjax-inline') + '" role="math" aria-label="' + escape(expression) + '">' + svg + '</span>'
    if (cache.size >= 256) cache.delete(cache.keys().next().value!)
    cache.set(key, result)
    return result
  } catch (error) {
    return '<span class="mathjax-error" role="alert" title="' + escape(error instanceof Error ? error.message : 'MathJax error') + '">' + escape(expression) + '</span>'
  }
}
