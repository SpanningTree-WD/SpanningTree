import { expect, it } from 'vitest'
import { sanitizeDiagramSvg } from './diagramSvg'
it('retains actual geometry, transforms and font metrics while removing active content', () => {
  const svg = sanitizeDiagramSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" width="100" height="50" onload="alert(1)"><g transform="translate(10,20)"><path d="M0 0 L20 10" stroke="black"/><text x="20" y="10" style="font-family:cmr10;font-size:10px">x</text></g><script>alert(1)</script><foreignObject><iframe/></foreignObject><image href="https://example.com/a"/><use href="https://example.com/x.svg#x"/><path fill="url(https://example.com)" style="background:url(https://example.com)"/></svg>')
  const root = document.createElement('div'); root.innerHTML = svg
  expect(root.querySelector('svg')).toHaveAttribute('viewBox', '0 0 100 50')
  expect(root.querySelector('path')).toHaveAttribute('d', 'M0 0 L20 10')
  expect(root.querySelector('g')).toHaveAttribute('transform', 'translate(10,20)')
  expect(root.querySelector('text')).toHaveAttribute('x', '20')
  expect(svg).toContain('font-family:cmr10')
  expect(root.querySelector('script,foreignObject,iframe,image,[onload]')).toBeNull()
  expect(svg).not.toContain('https://')
})
it('rejects missing or oversized SVG and preserves local clipping', () => {
  expect(() => sanitizeDiagramSvg('')).toThrow()
  expect(() => sanitizeDiagramSvg('x'.repeat(2_000_001))).toThrow()
  expect(sanitizeDiagramSvg('<svg><defs><clipPath id="c"><path d="M0 0L1 1"/></clipPath></defs><g clip-path="url(#c)"><path d="M0 0L2 2"/></g></svg>')).toContain('clip-path="url(#c)"')
})
it('namespaces clipping per source and rejects layout-changing CSS', () => {
  const svg = sanitizeDiagramSvg('<svg style="position:fixed;inset:0;font-size:10px"><defs><clipPath id="c"><path d="M0 0L1 1"/></clipPath></defs><g clip-path="url(#c)"><path d="M0 0L2 2"/></g></svg>', 'diagram-test')
  expect(svg).toContain('id="diagram-test-c"')
  expect(svg).toContain('url(#diagram-test-c)')
  expect(svg).toContain('font-size:10px')
  expect(svg).not.toContain('position:fixed')
})
