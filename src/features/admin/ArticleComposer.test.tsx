import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ArticleComposer } from './ArticleComposer'
import type { ArticleAsset, ReferenceEntry } from '../../models/authoring'
import type { BodyUploads } from './useBodyUploads'
import { editorView, setEditorText } from '../../test/editor'
vi.mock('../../components/content/browserDiagrams', () => ({ hydrateBrowserDiagrams: vi.fn(() => vi.fn()) }))
beforeEach(() => {
  // jsdom has no top-layer implementation; native focus/Escape are covered in Playwright.
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })
function setup() {
  const enqueue = vi.fn(() => ['uploaded'])
  const uploads = { items: [], error: '', hasPending: false, views: (assets: ArticleAsset[]) => assets, enqueue, retry: vi.fn(), remove: vi.fn(), clear: vi.fn() } as unknown as BodyUploads
  function Form() {
    const [body, setBody] = useState('First [@a]. Second [@a].\n\n{{asset:photo}}')
    const [refs, setRefs] = useState<ReferenceEntry[]>([{ id: 'a', title: 'Alpha' }, { id: 'b', title: 'Beta' }])
    const [assets, setAssets] = useState<ArticleAsset[]>([{ id: 'photo', url: '/uploads/' + 'a'.repeat(64) + '.png', fileName: 'Graph.png', alt: 'Graph', mediaType: 'image/png', size: 10 }])
    return <ArticleComposer value={body} references={refs} assets={assets} uploads={uploads} scope={{ collection: 'mathematics', recordId: 'test' }} onChange={setBody} onReferences={setRefs} onAssets={setAssets} onDiagrams={() => {}} onCover={() => {}} />
  }
  const result = render(<Form />)
  return { ...result, enqueue, editor: editorView(screen.getByRole('textbox', { name: '본문' })) }
}
it('edits one citation in place and adds a complete reference without leaving the picker', () => {
  const { editor } = setup()
  fireEvent.click(screen.getAllByRole('button', { name: '인용 수정 [1]' })[1])
  let dialog = within(screen.getByRole('dialog', { name: '인용 수정' }))
  expect(dialog.getByLabelText('[1] Alpha')).toBeChecked()
  fireEvent.click(dialog.getByLabelText('[1] Alpha'))
  fireEvent.click(dialog.getByLabelText('[2] Beta'))
  fireEvent.click(dialog.getByRole('button', { name: '인용 변경' }))
  expect(editor.state.doc.toString()).toContain('First [@a]. Second [@b].')
  fireEvent.click(screen.getByRole('button', { name: '인용 수정 [2]' }))
  dialog = within(screen.getByRole('dialog', { name: '인용 수정' }))
  fireEvent.click(dialog.getByText('새 참고문헌'))
  fireEvent.change(dialog.getByLabelText('제목', { exact: true }), { target: { value: 'Jones paper' } })
  fireEvent.change(dialog.getByLabelText('DOI'), { target: { value: '10.1000/example' } })
  fireEvent.click(dialog.getByRole('button', { name: '문헌 추가하고 인용' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('button', { name: '인용 수정 [2], [3]' })).toBeVisible()
  expect(screen.getByDisplayValue('Jones paper')).toBeVisible()
  expect(screen.getByDisplayValue('10.1000/example')).toBeVisible()
  expect(editor.state.doc.toString()).toMatch(/First \[@a\]\. Second \[@b; @[\w-]+\]\./)
})
it('edits image caption, alt, width and alignment directly from the image', () => {
  const { container } = setup()
  fireEvent.click(screen.getByRole('button', { name: '첨부 설정: Graph' }))
  const dialog = within(screen.getByRole('dialog', { name: '첨부 설정' }))
  for (const [label, value] of [['캡션', 'Figure 1'], ['대체 텍스트', 'A graph'], ['너비 (본문 대비 %)', '60'], ['정렬', 'right']]) {
    fireEvent.change(dialog.getByLabelText(label, { exact: true }), { target: { value } })
  }
  fireEvent.click(dialog.getByRole('button', { name: '닫기' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(container.querySelector('.markdown-editor figure')).toHaveStyle({ width: '60%' })
  expect(container.querySelector('.markdown-editor figure')).toHaveClass('align-right')
  expect(container.querySelector('.markdown-editor figcaption')).toHaveTextContent('Figure 1')
  expect(container.querySelector('.markdown-editor figure img')).toHaveAttribute('alt', 'A graph')
})
it('inserts templates as source and captures the cursor for new citations', () => {
  const { editor } = setup()
  setEditorText(editor.contentDOM, 'Opening. Closing.')
  act(() => editor.dispatch({ selection: { anchor: 8 } }))
  fireEvent.click(screen.getByRole('button', { name: '인용 삽입' }))
  const dialog = within(screen.getByRole('dialog'))
  fireEvent.click(dialog.getByLabelText('[2] Beta'))
  fireEvent.click(dialog.getByRole('button', { name: '선택한 인용 삽입' }))
  expect(editor.state.doc.toString()).toBe('Opening.[@b] Closing.')
  fireEvent.click(screen.getByRole('button', { name: 'TikZ 코드' }))
  expect(editor.state.doc.toString()).toContain('```tikz\n\\begin{tikzpicture}')
  expect(screen.queryByLabelText('도형 소스')).toBeNull()
})
it('inserts pasted images at the selection and keeps attachment editing available', () => {
  const { editor, enqueue } = setup()
  setEditorText(editor.contentDOM, 'Opening. Closing.')
  act(() => editor.dispatch({ selection: { anchor: 8 } }))
  const file = new File(['png'], 'Image.png', { type: 'image/png' })
  fireEvent.paste(editor.contentDOM, { clipboardData: { items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }] } })
  expect(enqueue).toHaveBeenCalledWith([file])
  expect(editor.state.doc.toString()).toBe('Opening.\n\n{{asset:uploaded}}\n\n Closing.')
})
