import { useEffect, useRef, type RefObject } from 'react'
import { EditorState, StateEffect, StateField, Transaction, type Range } from '@codemirror/state'
import { Decoration, EditorView, WidgetType, keymap, type DecorationSet } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { assetMarkup, renderArticleContent, renderMarkdown, safeContentUris, type RenderOptions } from '../../components/content/MarkdownRenderer'
import DOMPurify from 'dompurify'
import { assetToken, citationIds, referenceLabel } from '../../models/authoring'
import { diagramFence, diagramFromFence } from '../../models/diagramSource'
import { useT } from '../../i18n/LanguageProvider'
import { hydrateBrowserDiagrams } from '../../components/content/browserDiagrams'

export interface MarkdownEditorHandle {
  insert: (text: string, block?: boolean) => void
  remove: (token: string) => void
  focus: () => void
  capture: () => void
  insertCaptured: (text: string) => boolean
}
interface Props extends RenderOptions {
  value: string
  onChange: (value: string) => void
  onFiles: (files: File[]) => string[]
  onAsset: (id: string) => void
  onRetry: (id: string) => void
  onDiagram: (id: string) => void
  onCitation?: (ids: string[]) => void
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
    let captured: { from: number; to: number; text: string } | undefined
    function capture(editor: EditorView, from = editor.state.selection.main.from, to = editor.state.selection.main.to) {
      captured = { from, to, text: editor.state.sliceDoc(from, to) }
    }
    class SourceDiagramWidget extends WidgetType {
      cleanup?: () => void
      timer?: ReturnType<typeof setTimeout>
      constructor(readonly source: string, readonly translate: (text: string) => string) { super() }
      eq(other: SourceDiagramWidget) { return this.source === other.source && this.translate === other.translate }
      toDOM() {
        const box = document.createElement('div')
        box.className = 'editor-inline-block editor-diagram-preview markdown-content'
        box.setAttribute('contenteditable', 'false')
        box.setAttribute('aria-label', this.translate('도형 미리보기'))
        const { html, diagrams } = renderArticleContent(this.source, { t: this.translate })
        box.innerHTML = html
        this.timer = setTimeout(() => { this.cleanup = hydrateBrowserDiagrams(box, diagrams, this.translate) }, 450)
        return box
      }
      ignoreEvent() { return true }
      destroy() { clearTimeout(this.timer); this.cleanup?.() }
    }
    class BlockWidget extends WidgetType {
      cleanup?: () => void
      constructor(readonly kind: string, readonly id: string, readonly html: string, readonly failed: boolean) { super() }
      eq(other: BlockWidget) { return this.kind === other.kind && this.id === other.id && this.html === other.html && this.failed === other.failed }
      toDOM(editor: EditorView) {
        const box = document.createElement(this.kind === 'citation' ? 'span' : 'div')
        box.className = this.kind === 'citation' ? 'editor-citation' : 'editor-inline-block'
        box.setAttribute('contenteditable', 'false')
        if (this.kind === 'citation') {
          const control = document.createElement('button')
          control.type = 'button'
          const ids = citationIds(this.id)
          control.textContent = ids.map(id => {
            const index = latest.current.references?.findIndex(ref => ref.id === id) ?? -1
            return '[' + (index < 0 ? '?' : index + 1) + ']'
          }).join(', ')
          control.title = ids.map(id => referenceLabel(latest.current.references?.find(ref => ref.id === id) ?? { id })).join('\n')
          control.setAttribute('aria-label', latest.current.t!('인용 수정') + ' ' + control.textContent)
          control.addEventListener('click', () => {
            if (latest.current.disabled) return
            const from = editor.posAtDOM(box)
            capture(editor, from, from + this.id.length)
            latest.current.onCitation?.(ids)
          })
          box.append(control)
          return box
        }
        const content = document.createElement(this.kind === 'citation' ? 'span' : 'div')
        content.className = 'markdown-content'
        content.innerHTML = DOMPurify.sanitize(this.html, { ALLOWED_URI_REGEXP: safeContentUris })
        box.append(content)
        if (this.kind === 'diagram') this.cleanup = hydrateBrowserDiagrams(content, latest.current.diagrams ?? [], latest.current.t!)
        if (this.kind === 'asset') {
          const image = content.querySelector('img')
          if (image) {
            const control = document.createElement('button')
            control.type = 'button'; control.className = 'editor-image-edit'
            control.setAttribute('aria-label', latest.current.t!('첨부 설정') + ': ' + image.alt)
            image.replaceWith(control); control.append(image)
            control.addEventListener('click', () => { if (!latest.current.disabled) latest.current.onAsset(this.id) })
          }
        }
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
      destroy() { this.cleanup?.() }
    }
    function decorations(state: EditorState) {
      const ranges: Range<Decoration>[] = []
      const code: { from: number; to: number }[] = []
      markdownLanguage.parser.parse(state.doc.toString()).iterate({ enter(node) {
        if (!['InlineCode', 'CodeBlock', 'FencedCode'].includes(node.name)) return
        code.push({ from: node.from, to: node.to })
        if (node.name === 'FencedCode') {
          const info = node.node.getChild('CodeInfo')
          const marks = node.node.getChildren('CodeMark')
          if (info && marks.length === 2) {
            const source = node.node.getChildren('CodeText').map(part => state.sliceDoc(part.from, part.to)).join('')
            const lang = state.sliceDoc(info.from, info.to)
            const raw = state.sliceDoc(marks[0].from, marks[0].to) + lang + '\n' + source + '\n' + state.sliceDoc(marks[1].from, marks[1].to)
            const diagram = diagramFromFence({ type: 'code', raw, lang, text: source }, 'editor-preview')
            if (diagram) ranges.push(Decoration.widget({ widget: new SourceDiagramWidget(diagramFence(diagram), latest.current.t!), block: true, side: 1 }).range(state.doc.lineAt(node.to).to))
          }
        }
        return false
      } })
      const inCode = (from: number, to: number) => code.some(range => from < range.to && to > range.from)
      for (let n = 1; n <= state.doc.lines; n++) {
        const line = state.doc.line(n)
        const match = /^\{\{(asset|diagram):([a-zA-Z0-9_-]+)\}\}$/.exec(line.text)
        const options = latest.current
        if (match && !inCode(line.from, line.to)) {
          const asset = options.assets?.find(item => item.id === match[2])
          const html = match[1] === 'asset' ? assetMarkup(asset, options.t) : renderMarkdown(line.text, options)
          ranges.push(Decoration.replace({ widget: new BlockWidget(match[1], match[2], html, asset?.state === 'failed'), block: true }).range(line.from, line.to))
        } else {
          for (const citation of line.text.matchAll(/\[((?:@[a-zA-Z0-9_-]+\s*;?\s*)+)\]/g)) {
            const from = line.from + citation.index!
            if (inCode(from, from + citation[0].length)) continue
            // Include labels so reference edits refresh the button's tooltip too.
            const html = JSON.stringify(options.references ?? [])
            ranges.push(Decoration.replace({ widget: new BlockWidget('citation', citation[0], html, false) }).range(from, from + citation[0].length))
          }
        }
      }
      return Decoration.set(ranges, true)
    }
    const field = StateField.define<DecorationSet>({
      create: decorations,
      update: (value, transaction) => transaction.docChanged || transaction.effects.some(effect => effect.is(refresh)) ? decorations(transaction.state) : value,
      provide: value => EditorView.decorations.from(value),
    })
    function insert(text: string, block = false, position?: number) {
      const editor = view.current
      if (!editor || latest.current.disabled) return
      const range = editor.state.selection.main
      const from = position ?? range.from, to = position ?? range.to
      const value = editor.state.toText(block ? '\n\n' + text + '\n\n' : text)
      editor.dispatch({ changes: { from, to, insert: value }, selection: { anchor: from + value.length }, userEvent: 'input' })
      editor.focus()
    }
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({ doc: latest.current.value, extensions: [
        markdown(), history(), keymap.of([...defaultKeymap, ...historyKeymap]), EditorView.lineWrapping, field,
        EditorView.atomicRanges.of(value => value.state.field(field)),
        EditorView.contentAttributes.of({ 'aria-label': latest.current.label, role: 'textbox', 'aria-multiline': 'true' }),
        EditorView.updateListener.of(update => {
          for (const transaction of update.transactions) {
            if (!captured || !transaction.docChanged) continue
            const target = captured
            transaction.changes.iterChangedRanges((from, to) => {
              if (from < target.to && to > target.from) captured = undefined
            })
            if (captured) captured = { ...target, from: transaction.changes.mapPos(target.from, 1), to: transaction.changes.mapPos(target.to, target.from === target.to ? 1 : -1) }
          }
          if (update.docChanged) latest.current.onChange(update.state.doc.toString())
        }),
        EditorView.domEventHandlers({
          paste(event) {
            if (latest.current.disabled) return false
            const files = [...(event.clipboardData?.items ?? [])].filter(item => item.kind === 'file' && item.type.startsWith('image/')).map(item => item.getAsFile()).filter((file): file is File => !!file)
            if (!files.length) {
              const text = event.clipboardData?.getData('text/plain')
              if (!text) return false
              // Replace the model selection, including atomic image/citation
              // widgets, rather than relying on browser contenteditable mutation.
              event.preventDefault()
              insert(text)
              return true
            }
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
        EditorView.theme({ '&': { border: '1px solid var(--color-line)', backgroundColor: 'var(--color-background)' }, '.cm-content': { minHeight: '360px', padding: '16px', fontFamily: 'inherit', lineHeight: '1.8' }, '.cm-scroller': { overflowX: 'auto', fontFamily: 'inherit' }, '&.cm-focused': { outline: '2px solid var(--color-green)' } }),
      ] }),
    })
    view.current = editor
    latest.current.handle.current = {
      insert,
      capture: () => capture(editor),
      insertCaptured: text => {
        const target = captured
        captured = undefined
        if (!target || latest.current.disabled || editor.state.sliceDoc(target.from, target.to) !== target.text) return false
        editor.dispatch({ changes: { from: target.from, to: target.to, insert: text }, selection: { anchor: target.from + text.length }, userEvent: 'input' })
        return true
      },
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
