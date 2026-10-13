import { renderMath } from '../../components/content/mathjax'

const textExpression = (text: string) => '\\text{' + text.replace(/[\\{}%&#_^~]/g, char => ({ '\\': '\\textbackslash{}', '~': '\\textasciitilde{}', '^': '\\textasciicircum{}' })[char] ?? '\\' + char) + '}'
export function labelExpression(text: string) {
  const parts = text.split('$')
  if (parts.length % 2 === 0) throw new Error('Asymptote 라벨의 수식 구분자 $를 확인해 주세요.')
  return parts.map((part, index) => index % 2 ? part : textExpression(part)).join('')
}

/** Native Asymptote measures labels approximately; use its evaluated positions,
 * then replace placeholder outlines with our existing local MathJax SVG fonts. */
export function renderAsymptoteLabels(svg: string) {
  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none'
  host.innerHTML = svg
  document.body.append(host)
  try {
    const root = host.querySelector('svg')!
    for (const group of root.querySelectorAll<SVGGElement>('.asy-native-label')) {
      const encoded = group.getAttribute('data-asy-label-utf8') ?? ''
      const label = encoded ? new TextDecoder().decode(Uint8Array.from(encoded.split(',').map(Number))) : ''
      if (!label) continue
      group.querySelector('text[opacity="0"]')?.remove()
      const bounds = group.getBBox(), size = Number(group.getAttribute('data-asy-label-size')) || 10
      const math = document.createElement('div')
      math.innerHTML = renderMath(labelExpression(label), false)
      const rendered = math.querySelector('svg')
      if (!rendered || math.querySelector('[data-mjx-error], [data-mml-node="merror"], .mathjax-error')) throw new Error('Asymptote 라벨 수식을 확인해 주세요: ' + label.slice(0, 200))
      const [x, y, width, height] = (rendered.getAttribute('viewBox') ?? '').split(/\s+/).map(Number)
      if (![x, y, width, height].every(Number.isFinite)) throw new Error('도형 결과를 읽지 못했습니다. 소스를 확인해 주세요.')
      const scale = size / 1000
      const translated = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      const fill = group.querySelector('[fill]')?.getAttribute('fill') ?? 'black'
      translated.setAttribute('color', fill)
      translated.setAttribute('fill', fill)
      translated.setAttribute('transform', `translate(${bounds.x + bounds.width / 2 - (x + width / 2) * scale},${bounds.y + bounds.height / 2 - (y + height / 2) * scale}) scale(${scale})`)
      translated.append(...rendered.childNodes)
      group.replaceChildren(translated)
      group.setAttribute('aria-label', label)
    }
    // Tall fractions and radicals can exceed the native placeholder's bounds.
    const bounds = root.getBBox(), box = root.viewBox.baseVal
    const x = Math.min(box.x, bounds.x), y = Math.min(box.y, bounds.y)
    const width = Math.max(box.x + box.width, bounds.x + bounds.width) - x
    const height = Math.max(box.y + box.height, bounds.y + bounds.height) - y
    if (width > 0 && height > 0) {
      root.setAttribute('viewBox', `${x} ${y} ${width} ${height}`)
      root.setAttribute('width', String(width)); root.setAttribute('height', String(height))
    }
    return root.outerHTML
  } finally { host.remove() }
}
