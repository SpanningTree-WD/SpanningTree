import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MarkdownRenderer, renderMarkdown } from './MarkdownRenderer'

describe('MarkdownRenderer', () => {
  it('renders common Markdown and KaTeX while removing stored HTML hazards', () => {
    const html = renderMarkdown('# Theorem\n\n- one\n- two\n\n\\(G\\)\n\n$$n_p \\equiv 1 \\pmod p$$\n\n<script>alert(1)</script>')
    expect(html).toContain('<h1>Theorem</h1>')
    expect(html).toContain('katex')
    expect(html).not.toContain('<script>')
    render(<MarkdownRenderer content={'[Read](https://example.com)\n\n```ts\nconst n = 1\n```'} />)
    expect(screen.getByRole('link', { name: 'Read' })).toBeInTheDocument()
    expect(screen.getByText('const n = 1')).toBeInTheDocument()
  })

  it.each([
    { content: String.raw`\(\sqrt{2}\)`, roots: 1, mathml: 'msqrt', display: false },
    { content: String.raw`$$\sqrt{x^2 + 1}$$`, roots: 1, mathml: 'msqrt', display: true },
    { content: String.raw`$$\sqrt{\frac{1 + \sqrt{x}}{2}}$$`, roots: 2, mathml: 'msqrt', display: true },
    { content: String.raw`\(\sqrt[3]{x}\)`, roots: 1, mathml: 'mroot', display: false },
  ])('preserves visible and accessible radicals in $content', ({ content, roots, mathml, display }) => {
    const { container } = render(<MarkdownRenderer content={content} />)
    const radicalImages = container.querySelectorAll('.katex-html .sqrt svg')

    expect(radicalImages).toHaveLength(roots)
    for (const svg of radicalImages) {
      expect(svg).toHaveAttribute('viewBox')
      expect(svg).toHaveAttribute('preserveAspectRatio', 'xMinYMin slice')
      expect(svg.querySelector('path')?.getAttribute('d')).toBeTruthy()
    }
    expect(container.querySelector(`.katex-mathml math ${mathml}`)).not.toBeNull()
    expect(Boolean(container.querySelector('.katex-display'))).toBe(display)
    expect(container.querySelector('.katex-error')).not.toBeInTheDocument()
  })

  it('still removes unsafe HTML, SVG, and MathML alongside radicals', () => {
    const { container } = render(<MarkdownRenderer content={String.raw`
\(\sqrt{2}\)

<script>alert(1)</script>
<img src="x" onerror="alert(1)">
<a href="javascript:alert(1)">unsafe link</a>
<svg onload="alert(1)"><script>alert(1)</script><a xlink:href="javascript:alert(1)"><text>unsafe SVG</text></a><foreignObject><iframe src="https://example.com"></iframe></foreignObject></svg>
<math><mi href="javascript:alert(1)" onclick="alert(1)">x</mi></math>
`} />)

    expect(container.querySelector('.sqrt svg path')).toBeInTheDocument()
    expect(container.querySelector('script, iframe, foreignObject')).not.toBeInTheDocument()
    for (const element of container.querySelectorAll('*')) {
      for (const attribute of element.attributes) {
        expect(attribute.name).not.toMatch(/^on/i)
        if (['href', 'xlink:href', 'src'].includes(attribute.name)) {
          expect(attribute.value).not.toMatch(/^javascript:/i)
        }
      }
    }
  })
})
