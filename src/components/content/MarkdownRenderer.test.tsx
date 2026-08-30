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
})
