import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MarkdownRenderer, renderMarkdown, ReferenceList } from './MarkdownRenderer'
afterEach(cleanup)

describe('MarkdownRenderer with MathJax', () => {
  it('renders Markdown and locally generated MathJax SVG', () => {
    const html = renderMarkdown('# Theorem\n\n- one\n- two\n\n\\(G\\)\n\n$$n_p \\equiv 1 \\pmod p$$\n\n<script>alert(1)</script>')
    expect(html).toContain('<h1>Theorem</h1>')
    expect(html).toContain('mathjax-equation')
    expect(html).not.toContain('katex')
    expect(html).not.toContain('<script>')
    render(<MarkdownRenderer content={'[Read](https://example.com)\n\n\x60\x60\x60ts\nconst n = 1\n\x60\x60\x60'} />)
    expect(screen.getByRole('link', { name: 'Read' })).toBeInTheDocument()
    expect(screen.getByText('const n = 1')).toBeInTheDocument()
  })
  it.each([
    { content: '\\(\\sqrt{2}\\)', roots: 1, type: 'msqrt', display: false },
    { content: '$$\\sqrt{x^2 + 1}$$', roots: 1, type: 'msqrt', display: true },
    { content: '$$\\sqrt{\\frac{1 + \\sqrt{x}}{2}}$$', roots: 2, type: 'msqrt', display: true },
    { content: '\\(\\sqrt[3]{x}\\)', roots: 1, type: 'mroot', display: false },
  ])('preserves radicals in $content', ({ content, roots, type, display }) => {
    const { container } = render(<MarkdownRenderer content={content} />)
    expect(container.querySelectorAll('[data-mml-node="' + type + '"]')).toHaveLength(roots)
    expect(container.querySelector('svg')).toHaveAttribute('viewBox')
    expect(container.querySelector('svg path')?.getAttribute('d')).toBeTruthy()
    expect(screen.getByRole('math')).toHaveAttribute('aria-label')
    expect(Boolean(container.querySelector('.mathjax-display'))).toBe(display)
    expect(container.querySelector('.mathjax-error')).toBeNull()
  })
  it('does not interpret code or escaped dollars as mathematics', () => {
    const html = renderMarkdown('\x60$x$\x60\n\n\x60\x60\x60tex\n$$x$$\n\x60\x60\x60\n\n\\$5 and $x+1$')
    expect(html.match(/class="mathjax-equation/g)).toHaveLength(1)
    expect(html).toContain('<code>$x$</code>')
    expect(html).toContain('$$x$$')
    expect(html).toContain('$5')
  })
  it('keeps an invalid expression local and does not reuse macros between expressions', () => {
    const { container } = render(<MarkdownRenderer content={'$\\newcommand{\\privateMacro}{x}\\privateMacro$\n\n$\\privateMacro$\n\n$\\frac{$\n\nStill readable\n\n$x^2$'} />)
    expect(screen.getByText('Still readable')).toBeInTheDocument()
    expect(container.querySelectorAll('.mathjax-equation').length).toBeGreaterThanOrEqual(3)
    expect(container.querySelectorAll('[data-mjx-error]').length).toBeLessThanOrEqual(1)
  })
  it('removes unsafe HTML, SVG and MathML alongside equations', () => {
    const { container } = render(<MarkdownRenderer content={'\\(\\sqrt{2}\\)\n\n<script>alert(1)</script>\n<img src="x" onerror="alert(1)">\n<a href="javascript:alert(1)">unsafe link</a>\n<svg onload="alert(1)"><script>alert(1)</script><a xlink:href="javascript:alert(1)"><text>unsafe SVG</text></a><foreignObject><iframe src="https://example.com"></iframe></foreignObject></svg>\n<math><mi href="javascript:alert(1)" onclick="alert(1)">x</mi></math>'} />)
    expect(container.querySelector('.mathjax-equation svg path')).toBeInTheDocument()
    expect(container.querySelector('script, iframe, foreignObject')).toBeNull()
    for (const element of container.querySelectorAll('*')) for (const attribute of element.attributes) {
      expect(attribute.name).not.toMatch(/^on/i)
      if (['href', 'xlink:href', 'src'].includes(attribute.name)) expect(attribute.value).not.toMatch(/^javascript:/i)
    }
  })
  it('renumbers citations by stable IDs without changing the source and links to references', () => {
    const refs = [{ id: 'alpha', title: 'Alpha' }, { id: 'beta', text: 'Beta' }]
    const body = 'See [@beta; @alpha].'
    const { container, rerender } = render(<><MarkdownRenderer content={body} references={refs} /><ReferenceList references={refs} /></>)
    expect(container.querySelector('.citations')?.textContent).toBe('[2], [1]')
    rerender(<><MarkdownRenderer content={body} references={[refs[1], refs[0]]} /><ReferenceList references={[refs[1], refs[0]]} /></>)
    expect(container.querySelector('.citations')?.textContent).toBe('[1], [2]')
    expect(container.querySelector('.citations a')).toHaveAttribute('href', '#reference-beta')
    expect(container.querySelector('#reference-beta')?.textContent).toContain('[1]')
  })
  it('renders inline attachments consistently and isolates a missing diagram', () => {
    const url = '/uploads/' + 'a'.repeat(64) + '.png'
    const html = renderMarkdown('{{asset:photo}}\n\n{{diagram:bad}}\n\nReadable', {
      assets: [{ id: 'photo', fileName: 'Photo.png', mediaType: 'image/png', size: 1024, url, width: 60, align: 'right', alt: 'A graph', caption: 'Figure 1' }],
    })
    expect(html).toContain('width:60%')
    expect(html).toContain('align-right')
    expect(html).toContain('alt="A graph"')
    expect(html).toContain('Figure 1')
    expect(html).toContain('도형을 렌더링해 주세요.')
    expect(html).toContain('Readable')
  })
})
