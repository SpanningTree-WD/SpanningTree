import DOMPurify from 'dompurify'

/** Only passive SVG graphics, including local glyph/clip references, enter the page. */
export function sanitizeDiagramSvg(output: string, idPrefix?: string): string {
  if (output.length > 2_000_000) throw new Error('도형 결과가 너무 큽니다. 소스를 간단히 줄여 주세요.')
  const clean = DOMPurify.sanitize(output, {
    USE_PROFILES: { svg: true },
    FORBID_TAGS: ['script', 'foreignObject', 'image', 'style', 'a', 'animate', 'animateMotion', 'animateTransform', 'set'],
  })
  const container = document.createElement('div')
  container.innerHTML = clean
  const svg = container.querySelector('svg')
  if (!svg || container.querySelectorAll('svg').length !== 1) throw new Error('도형 결과를 읽지 못했습니다. 소스를 확인해 주세요.')
  for (const element of [svg, ...svg.querySelectorAll('*')]) {
    for (const attribute of [...element.attributes]) {
      const value = attribute.value
      if ((attribute.localName === 'href' && !/^#[\w.:-]+$/.test(value)) ||
        /url\s*\(/i.test(value) && !/^url\(\s*['"]?#[\w.:-]+['"]?\s*\)$/i.test(value)) element.removeAttribute(attribute.name)
    }
    // CSS declaration values are checked separately; no URL, import, or executable CSS.
    const style = element.getAttribute('style')
    if (style) {
      const permitted = new Set(['font-family', 'font-size', 'font-style', 'font-weight', 'stroke', 'fill', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'fill-rule', 'clip-rule', 'opacity', 'fill-opacity', 'stroke-opacity', 'text-anchor', 'dominant-baseline'])
      const declarations = style.split(';').filter(value => permitted.has(value.split(':')[0].trim().toLowerCase()) && !/url\s*\(|@import|expression|\\/i.test(value))
      if (declarations.length) element.setAttribute('style', declarations.join(';'))
      else element.removeAttribute('style')
    }
  }
  if (idPrefix) {
    const ids = new Map<string, string>()
    for (const element of svg.querySelectorAll('[id]')) {
      const old = element.id, next = `${idPrefix}-${old}`
      ids.set(old, next); element.id = next
    }
    for (const element of [svg, ...svg.querySelectorAll('*')]) for (const attribute of [...element.attributes]) {
      if (attribute.localName === 'href' && ids.has(attribute.value.slice(1))) element.setAttribute(attribute.name, '#' + ids.get(attribute.value.slice(1)))
      else if (/^url\(/i.test(attribute.value)) element.setAttribute(attribute.name, attribute.value.replace(/#([\w.:-]+)/g, (ref, id) => ids.has(id) ? '#' + ids.get(id) : ref))
    }
  }
  svg.setAttribute('role', 'img')
  svg.setAttribute('focusable', 'false')
  return svg.outerHTML
}
