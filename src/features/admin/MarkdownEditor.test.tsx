import { createRef, useState } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { MarkdownEditor, type MarkdownEditorHandle } from './MarkdownEditor'
import { editorView, setEditorText } from '../../test/editor'
import { hydrateBrowserDiagrams } from '../../components/content/browserDiagrams'
vi.mock('../../components/content/browserDiagrams', () => ({ hydrateBrowserDiagrams: vi.fn(() => vi.fn()) }))
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers() })
function setup(initial: string) {
  const handle = createRef<MarkdownEditorHandle>()
  const onCitation = vi.fn(), onAsset = vi.fn()
  function Form() {
    const [body, setBody] = useState(initial)
    return <MarkdownEditor handle={handle} label="Body" value={body} onChange={setBody} onFiles={() => []} onAsset={onAsset} onRetry={() => {}} onDiagram={() => {}} onCitation={onCitation}
      references={[{ id: 'a', title: 'Alpha' }, { id: 'b', title: 'Beta' }]} />
  }
  const result = render(<Form />)
  return { ...result, handle, onCitation, onAsset, editor: editorView(screen.getByRole('textbox', { name: 'Body' })) }
}
it('keeps source editable, debounces rendering and cancels obsolete previews', () => {
  vi.useFakeTimers()
  const { container, editor } = setup('```tikz\nold\n```')
  expect(container.querySelectorAll('.editor-diagram-preview')).toHaveLength(1)
  expect(editor.state.doc.toString()).toContain('old')
  setEditorText(editor.contentDOM, '```tikz\nnew\n```')
  act(() => { vi.advanceTimersByTime(450) })
  expect(hydrateBrowserDiagrams).toHaveBeenCalledTimes(1)
  expect(vi.mocked(hydrateBrowserDiagrams).mock.calls[0][1][0].source).toBe('new')
  const dispose = vi.mocked(hydrateBrowserDiagrams).mock.results[0].value
  setEditorText(editor.contentDOM, '```tikz\nunfinished')
  expect(dispose).toHaveBeenCalledOnce()
  expect(container.querySelector('.editor-diagram-preview')).toBeNull()
})
it('edits only the clicked duplicate citation and maps its position through other edits', () => {
  const { handle, editor, onCitation } = setup('First [@a]. Second [@a].')
  fireEvent.click(screen.getAllByRole('button', { name: '인용 수정 [1]' })[1])
  expect(onCitation).toHaveBeenCalledWith(['a'])
  act(() => editor.dispatch({ changes: { from: 0, insert: 'Prefix ' } }))
  act(() => { expect(handle.current!.insertCaptured('[@b]')).toBe(true) })
  expect(editor.state.doc.toString()).toBe('Prefix First [@a]. Second [@b].')
})
it('refuses to overwrite a captured citation that changed while editing', () => {
  const { handle, editor } = setup('See [@a].')
  fireEvent.click(screen.getByRole('button', { name: '인용 수정 [1]' }))
  setEditorText(editor.contentDOM, 'A replacement document')
  act(() => { expect(handle.current!.insertCaptured('[@b]')).toBe(false) })
  expect(editor.state.doc.toString()).toBe('A replacement document')
})
it('does not decorate citations inside code or interpret example fences as diagrams', () => {
  const { container } = setup('`[@a]` then [@b]\n\n````markdown\n```tikz\n[@a]\n```\n````\n\n> ~~~asy\n> a\n> b\n> ~~~')
  expect(screen.getAllByRole('button', { name: /인용 수정/ })).toHaveLength(1)
  expect(screen.getByRole('button', { name: '인용 수정 [2]' })).toBeVisible()
  expect(container.querySelectorAll('.editor-diagram-preview')).toHaveLength(1)
})
