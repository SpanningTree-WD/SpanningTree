import { expect, it } from 'vitest'
import { contentSummary, prepareEditorRecord } from './editorMetadata'

const initial = { title: '첫 제목', summary: '', content: '첫 본문', coverImage: { alt: '', variant: 'blue' } }
it('generates a blank summary and refreshes automatic image descriptions', () => {
  const saved = prepareEditorRecord(initial, initial)
  expect(saved.summary).toBe('첫 본문')
  const edited = prepareEditorRecord({ ...saved, title: '새 제목', content: '새 본문' }, saved)
  expect(edited.summary).toBe('첫 본문')
  expect(edited.coverImage.alt).toBe('새 제목')
})
it('preserves typed summaries on create, edit and repeated saves even if they equal the old body', () => {
  const saved = prepareEditorRecord({ ...initial, summary: '첫 본문' }, initial)
  const edited = prepareEditorRecord({ ...saved, content: '다른 본문' }, saved)
  expect(edited.summary).toBe('첫 본문')
  expect(prepareEditorRecord({ ...edited, summary: '직접 작성한 요약' }, edited).summary).toBe('직접 작성한 요약')
  expect(prepareEditorRecord({ ...edited, summary: '  ' }, edited).summary).toBe('다른 본문')
})
it('omits fenced diagrams and attachment/citation IDs from generated summaries', () => {
  const content = '```tikz caption="Figure"\n\\draw (0,0)--(1,1);\n```\n\n{{asset:photo}}\n\n## 개요\n\n[새 본문](https://example.com) [@ref].\n\n> ```asy\n> draw(unitcircle);\n> ```'
  expect(contentSummary({ ...initial, content })).toBe('개요 새 본문 .')
  expect(contentSummary({ ...initial, content: 'a'.repeat(200) })).toHaveLength(158)
})
