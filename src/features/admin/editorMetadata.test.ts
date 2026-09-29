import { expect, it } from 'vitest'
import { prepareEditorRecord } from './editorMetadata'

it('refreshes generated summaries and image descriptions after subsequent edits', () => {
  const initial = {
    title: '첫 제목',
    summary: '',
    content: '첫 본문',
    coverImage: { alt: '', variant: 'blue' },
  }
  const saved = prepareEditorRecord(initial, initial)
  const edited = prepareEditorRecord(
    { ...saved, title: '새 제목', content: '## 개요\n\n[새 본문](https://example.com)' },
    saved
  )
  expect(edited.summary).toBe('개요 새 본문')
  expect(edited.coverImage.alt).toBe('새 제목')
})
