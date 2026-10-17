import { describe, expect, it } from 'vitest'
import { renderArticleContent } from '../components/content/MarkdownRenderer'
import { diagramFence } from './diagramSource'
import { validateAuthoring } from './authoring'

describe('diagram source in Markdown', () => {
  it.each(['tikz', 'asymptote', 'asy', 'TikZ'])('extracts %s without changing or adding persisted metadata', language => {
    const body = 'Before\n\n```' + language + ' caption="Figure 1" alt="A curve"\nsource();\n```\n\nAfter'
    const result = renderArticleContent(body)
    expect(result.diagrams).toHaveLength(1)
    expect(result.diagrams[0]).toMatchObject({ language: language.toLowerCase() === 'tikz' ? 'tikz' : 'asymptote', source: 'source();', caption: 'Figure 1', alt: 'A curve' })
    expect(result.html).toContain('data-browser-diagram=')
    expect(result.html).toContain('After')
    expect(() => validateAuthoring({ content: body })).not.toThrow()
  })
  it('supports nested and tilde fences alongside legacy diagrams with noncolliding IDs', () => {
    const result = renderArticleContent('> ~~~tikz\n> source\n> ~~~\n\n- ```asy\n  source\n  ```\n\n{{diagram:source-diagram-0}}', {
      diagrams: [{ id: 'source-diagram-0', language: 'tikz', source: 'old', renderer: 'browser-v1' }],
    })
    expect(result.diagrams.map(diagram => diagram.source)).toEqual(['old', 'source', 'source'])
    expect(new Set(result.diagrams.map(diagram => diagram.id)).size).toBe(3)
    expect(result.html.match(/data-browser-diagram=/g)).toHaveLength(3)
  })
  it.each([
    '```tikz\nunfinished',
    '```tex\nsource\n```',
    '```tikz unknown="value"\nsource\n```',
    '```tikz caption="broken\nsource\n```',
    '````markdown\n```tikz\nsource\n```\n````',
    '    ```tikz\n    source\n    ```',
  ])('keeps ordinary, example and incomplete code literal: %s', body => {
    const result = renderArticleContent(body)
    expect(result.diagrams).toHaveLength(0)
    expect(result.html).toContain('<code')
  })
  it('round-trips quotes, line breaks and backticks without injecting markup', () => {
    const input = { language: 'tikz' as const, source: '% ```\n\\draw (0,0)--(1,1);', caption: 'A "quote"\n<script>x</script>', alt: 'A curve' }
    const result = renderArticleContent(diagramFence(input))
    expect(result.diagrams[0]).toMatchObject(input)
    expect(result.html).not.toContain('<script>')
    expect(result.html).toContain('&lt;script&gt;')
  })
})
