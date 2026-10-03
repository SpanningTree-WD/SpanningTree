import { useEffect, useRef, type RefObject } from 'react'
import { EditorState, StateEffect, StateField, Transaction, type Range } from '@codemirror/state'
import { Decoration, EditorView, WidgetType, keymap, type DecorationSet } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { assetMarkup, renderMarkdown, safeContentUris, type RenderOptions } from '../../components/content/MarkdownRenderer'
import DOMPurify from 'dompurify'
import { assetToken } from '../../models/authoring'
import { useT } from '../../i18n/LanguageProvider'

export interface MarkdownEditorHandle {
  insert: (text: string, block?: boolean) => void
  remove: (token: string) => void
  focus: () => void
}
interface Props extends RenderOptions {
  value: string
  onChange: (value: string) => void
  onFiles: (files: File[]) => string[]
  onAsset: (id: string) => void
  onRetry: (id: string) => void
  onDiagram: (id: string) => void
  disabled?: boolean
  label: string
  handle: RefObject<MarkdownEditorHandle | null>
}
const refresh = StateEffect.define<null>()
export function MarkdownEditor(props: Props) {
  const t = useT()
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const latest = useRef(props)
  latest.current = { ...props, t }
  useEffect(() => {
    if (!host.current) return
    class BlockWidget extends WidgetType {
      constructor(readonly kind: string, readonly id: string, readonly html: string, readonly failed: boolean) { super() }
      eq(other: BlockWidget) { return this.kind === other.kind && this.id === other.id && this.html === other.html && this.failed === other.failed }
      toDOM(editor: EditorView) {
        const box = document.createElement(this.kind === 'citation' ? 'span' : 'div')
        box.className = this.kind === 'citation' ? 'editor-citation' : 'editor-inline-block'
        box.setAttribute('contenteditable', 'false')
        const content = document.createElement(this.kind === 'citation' ? 'span' : 'div')
        content.className = 'markdown-content'
        content.innerHTML = DOMPurify.sanitize(this.html, { ALLOWED_URI_REGEXP: safeContentUris })
        box.append(content)
        if (this.kind === 'citation') return box
        const actions = document.createElement('div')
        actions.className = 'editor-block-actions'
        const button = (label: string, callback: () => void) => {
          const control = document.createElement('button')
          control.type = 'button'; control.textContent = latest.current.t!(label)
          control.addEventListener('click', event => { event.preventDefault(); if (!latest.current.disabled) callback() })
          actions.append(control)
        }
        button(this.kind === 'asset' ? '첨부 설정' : '도형 수정', () => this.kind === 'asset' ? latest.current.onAsset(this.id) : latest.current.onDiagram(this.id))
        if (this.failed) button('재시도', () => latest.current.onRetry(this.id))
        button('본문에서 제거', () => {
          const token = '{{' + this.kind + ':' + this.id + '}}'
          const pos = editor.posAtDOM(box)
          const from = editor.state.doc.toString().indexOf(token, Math.max(0, pos - token.length))
          if (from >= 0) editor.dispatch({ changes: { from, to: from + token.length }, userEvent: 'delete' })
        })
        box.append(actions)
        return box
      }
      ignoreEvent() { return true }
    }
    function decorations(state: EditorState) {
      const ranges: Range<Decoration>[] = []
      let fenced = false
      for (let n = 1; n <= state.doc.lines; n++) {
        const line = state.doc.line(n)
        if (/^\s*(\x60{3,}|~{3,})/.test(line.text)) { fenced = !fenced; continue }
        if (fenced) continue
        const match = /^\{\{(asset|diagram):([a-zA-Z0-9_-]+)\}\}$/.exec(line.text)
        const options = latest.current
        if (match) {
          const asset = options.assets?.find(item => item.id === match[2])
          const html = match[1] === 'asset' ? assetMarkup(asset, options.t) : renderMarkdown(line.text, options)
          ranges.push(Decoration.replace({ widget: new BlockWidget(match[1], match[2], html, asset?.state === 'failed'), block: true }).range(line.from, line.to))
        } else {
          for (const citation of line.text.matchAll(/\[((?:@[a-zA-Z0-9_-]+\s*;?\s*)+)\]/g)) {
            const before = line.text.slice(0, citation.index)
            if ((before.match(/\x60/g)?.length ?? 0) % 2) continue
            const from = line.from + citation.index!
            const html = renderMarkdown(citation[0], options).replace(/^<p>|<\/p>\s*$/g, '')
            ranges.push(Decoration.replace({ widget: new BlockWidget('citation', citation[0], html, false) }).range(from, from + citation[0].length))
          }
        }
      }
      return Decoration.set(ranges, true)
    }
    const field = StateField.define<DecorationSet>({
      create: decorations,
      update: (_, transaction) => decorations(transaction.state),
      provide: value => EditorView.decorations.from(value),
    })
    function insert(text: string, block = false, position?: number) {
      const editor = view.current
      if (!editor || latest.current.disabled) return
      const range = editor.state.selection.main
      const from = position ?? range.from, to = position ?? range.to
      const value = block ? '\n\n' + text + '\n\n' : text
      editor.dispatch({ changes: { from, to, insert: value }, selection: { anchor: from + value.length }, userEvent: 'input' })
      editor.focus()
    }
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({ doc: latest.current.value, extensions: [
        markdown(), history(), keymap.of([...defaultKeymap, ...historyKeymap]), EditorView.lineWrapping, field,
        EditorView.atomicRanges.of(value => value.state.field(field)),
        EditorView.contentAttributes.of({ 'aria-label': latest.current.label, role: 'textbox', 'aria-multiline': 'true' }),
        EditorView.updateListener.of(update => { if (update.docChanged) latest.current.onChange(update.state.doc.toString()) }),
        EditorView.domEventHandlers({
          paste(event) {
            if (latest.current.disabled) return false
            const files = [...(event.clipboardData?.items ?? [])].filter(item => item.kind === 'file' && item.type.startsWith('image/')).map(item => item.getAsFile()).filter((file): file is File => !!file)
            if (!files.length) return false
            event.preventDefault()
            const ids = latest.current.onFiles(files)
            if (ids.length) insert(ids.map(assetToken).join('\n\n'), true)
            return true
          },
          drop(event, current) {
            const files = [...(event.dataTransfer?.files ?? [])]
            if (!files.length || latest.current.disabled) return false
            event.preventDefault()
            const at = current.posAtCoords({ x: event.clientX, y: event.clientY }) ?? current.state.selection.main.head
            const ids = latest.current.onFiles(files)
            if (ids.length) insert(ids.map(assetToken).join('\n\n'), true, at)
            return true
          },
          dragover(event) { if (event.dataTransfer?.types.includes('Files')) { event.preventDefault(); return true } return false },
        }),
        EditorView.theme({ '&': { border: '1px solid var(--line)', backgroundColor: 'var(--paper)' }, '.cm-content': { minHeight: '360px', padding: '16px', fontFamily: 'inherit', lineHeight: '1.8' }, '.cm-scroller': { overflowX: 'auto', fontFamily: 'inherit' }, '&.cm-focused': { outline: '2px solid var(--green)' } }),
      ] }),
    })
    view.current = editor
    latest.current.handle.current = {
      insert,
      remove: token => {
        const text = editor.state.doc.toString()
        const changes = []
        let from = text.indexOf(token)
        while (from >= 0) { changes.push({ from, to: from + token.length }); from = text.indexOf(token, from + token.length) }
        if (changes.length) editor.dispatch({ changes, userEvent: 'delete' })
      },
      focus: () => editor.focus(),
    }
    return () => { editor.destroy(); view.current = null; latest.current.handle.current = null }
  }, [])
  useEffect(() => {
    const editor = view.current
    if (!editor) return
    if (props.value !== editor.state.doc.toString()) {
      editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: props.value }, annotations: Transaction.addToHistory.of(false) })
    } else editor.dispatch({ effects: refresh.of(null), annotations: Transaction.addToHistory.of(false) })
    editor.contentDOM.setAttribute('aria-label', props.label)
    editor.contentDOM.setAttribute('contenteditable', String(!props.disabled))
  }, [props.value, props.assets, props.diagrams, props.references, props.disabled, props.label, t])
  return <div ref={host} className="markdown-editor" />
}
