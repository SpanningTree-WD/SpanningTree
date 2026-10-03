import { act } from '@testing-library/react'
import { EditorView } from '@codemirror/view'
export function editorView(element: HTMLElement) {
  const view = EditorView.findFromDOM(element)
  if (!view) throw new Error('CodeMirror editor not found')
  return view
}
export function setEditorText(element: HTMLElement, value: string) {
  const view = editorView(element)
  act(() => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value }, selection: { anchor: value.length }, userEvent: 'input' }))
}
