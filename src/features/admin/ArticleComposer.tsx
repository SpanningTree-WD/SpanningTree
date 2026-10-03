import { useRef, useState } from 'react'
import { useT } from '../../i18n/LanguageProvider'
import { assetToken, type ArticleAsset, type DiagramBlock, type ReferenceEntry } from '../../models/authoring'
import type { BodyUploads } from './useBodyUploads'
import type { UploadScope } from '../../services/uploads/GitHubUploadService'
import { fileSizeLabel } from '../../services/uploads/uploadTypes'
import { MarkdownEditor, type MarkdownEditorHandle } from './MarkdownEditor'
import { CitationPicker, ReferencesEditor } from './ReferencesEditor'
import { DiagramEditor } from './DiagramEditor'
import './ArticleComposer.css'

export function ArticleComposer({ value, label = '본문', assets = [], diagrams = [], references, uploads, scope, disabled, onChange, onAssets, onDiagrams, onReferences, onCover }: {
  value: string; label?: string; assets?: ArticleAsset[]; diagrams?: DiagramBlock[]; references?: ReferenceEntry[]
  uploads: BodyUploads; scope: UploadScope; disabled?: boolean
  onChange: (value: string) => void; onAssets: (assets: ArticleAsset[]) => void
  onDiagrams: (diagrams: DiagramBlock[]) => void; onReferences?: (references: ReferenceEntry[]) => void
  onCover: (asset: ArticleAsset) => void
}) {
  const t = useT()
  const handle = useRef<MarkdownEditorHandle | null>(null)
  const pictureInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const attachmentInput = useRef<HTMLInputElement>(null)
  const replaceInput = useRef<HTMLInputElement>(null)
  const replacement = useRef<ArticleAsset | undefined>(undefined)
  const [selected, setSelected] = useState<string>()
  const [preview, setPreview] = useState<string>()
  const [citation, setCitation] = useState(false)
  const [diagram, setDiagram] = useState<{ id?: string; language: 'tikz' | 'asymptote' }>()
  const views = uploads.views(assets)
  const editing = assets.find(asset => asset.id === selected)
  const previewing = views.find(asset => asset.id === preview)
  function add(files: File[], inline: boolean) {
    if (views.length + files.length > 100) { window.alert(t('첨부 파일은 글마다 최대 100개까지 사용할 수 있습니다.')); return [] }
    const ids = uploads.enqueue(files)
    if (inline && ids.length) handle.current?.insert(ids.map(assetToken).join('\n\n'), true)
    return ids
  }
  function remove(id: string) {
    const used = value.includes(assetToken(id))
    if (used && !window.confirm(t('본문에서 사용 중인 첨부입니다. 이 글의 본문 삽입도 함께 제거할까요? 다른 글에는 영향을 주지 않습니다.'))) return
    if (used) handle.current?.remove(assetToken(id))
    uploads.remove(id); onAssets(assets.filter(asset => asset.id !== id))
    if (selected === id) setSelected(undefined)
  }
  function update(patch: Partial<ArticleAsset>) { if (editing) onAssets(assets.map(asset => asset.id === editing.id ? { ...asset, ...patch } : asset)) }
  return <section className="article-composer">
    <h2>{t(label)}</h2>
    <div className="composer-toolbar" role="toolbar" aria-label={t('본문 도구')}>
      <button type="button" disabled={disabled} onClick={() => pictureInput.current?.click()}>{t('사진 삽입')}</button>
      <button type="button" disabled={disabled} onClick={() => fileInput.current?.click()}>{t('파일 첨부')}</button>
      {references && <button type="button" disabled={disabled} onClick={() => setCitation(!citation)}>{t('인용 삽입')}</button>}
      <button type="button" disabled={disabled} onClick={() => setDiagram({ language: 'tikz' })}>{t('TikZ 도형')}</button>
      <button type="button" disabled={disabled} onClick={() => setDiagram({ language: 'asymptote' })}>{t('Asymptote 도형')}</button>
    </div>
    <input hidden ref={pictureInput} aria-label={t('사진 선택')} type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={event => { add([...event.target.files ?? []], true); event.target.value = '' }} />
    <input hidden ref={fileInput} aria-label={t('파일 선택')} type="file" multiple accept="application/pdf" onChange={event => { add([...event.target.files ?? []], true); event.target.value = '' }} />
    <input hidden ref={attachmentInput} aria-label={t('첨부 파일 선택')} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={event => { add([...event.target.files ?? []], false); event.target.value = '' }} />
    <input hidden ref={replaceInput} aria-label={t('교체 파일 선택')} type="file" accept={replacement.current?.mediaType.startsWith('image/') ? 'image/jpeg,image/png,image/webp' : 'application/pdf'} onChange={event => {
      const file = event.target.files?.[0]
      if (file && replacement.current) uploads.enqueue([file], replacement.current)
      event.target.value = ''
    }} />
    {citation && references && <CitationPicker references={references} onInsert={text => handle.current?.insert(text)} onClose={() => setCitation(false)} />}
    {diagram && <DiagramEditor key={diagram.id ?? diagram.language} scope={scope} language={diagram.language} value={diagrams.find(item => item.id === diagram.id)} onClose={() => setDiagram(undefined)} onSave={item => {
      onDiagrams([...diagrams.filter(old => old.id !== item.id), item])
      if (!value.includes('{{diagram:' + item.id + '}}')) handle.current?.insert('{{diagram:' + item.id + '}}', true)
      setDiagram(undefined)
    }} />}
    <MarkdownEditor handle={handle} label={t(label)} value={value} onChange={onChange} assets={views} diagrams={diagrams} references={references} disabled={disabled}
      onFiles={files => add(files, false)} onAsset={setSelected} onRetry={uploads.retry}
      onDiagram={id => { const found = diagrams.find(item => item.id === id); if (found) setDiagram({ id, language: found.language }) }} />
    <p className="field-help">{t('사진을 붙여넣거나 본문에 끌어다 놓으면 커서 위치에 삽입됩니다. 마크다운과 $…$, $$…$$ 수식을 사용할 수 있습니다.')}</p>
    {selected && !editing && <p role="status">{t('업로드가 완료되면 크기·정렬·설명을 수정할 수 있습니다.')}</p>}
    {editing && <section className="asset-settings" aria-label={t('첨부 설정')}><div className="editor-row-actions"><h3>{editing.fileName}</h3><button type="button" onClick={() => setSelected(undefined)}>{t('닫기')}</button></div>
      {editing.mediaType.startsWith('image/') && <>
        <div className="reference-fields">
          <label className="admin-field"><span>{t('대체 텍스트')}</span><input value={editing.alt ?? ''} maxLength={1000} onChange={event => update({ alt: event.target.value })} /></label>
          <label className="admin-field"><span>{t('캡션')}</span><input value={editing.caption ?? ''} maxLength={5000} onChange={event => update({ caption: event.target.value })} /></label>
          <label className="admin-field"><span>{t('너비 (본문 대비 %)')}</span><input type="number" min={10} max={100} value={editing.width ?? 100} onChange={event => update({ width: Math.max(10, Math.min(100, Number(event.target.value))) })} /></label>
          <label className="admin-field"><span>{t('정렬')}</span><select value={editing.align ?? 'center'} onChange={event => update({ align: event.target.value as ArticleAsset['align'] })}><option value="left">{t('왼쪽')}</option><option value="center">{t('가운데')}</option><option value="right">{t('오른쪽')}</option></select></label>
        </div><button type="button" onClick={() => onCover(editing)}>{t('대표 이미지로 사용')}</button>
      </>}
    </section>}
    <section className="composer-attachments" aria-label={t('이 글의 첨부 파일')}><h3>{t('이 글의 사진·파일')}</h3>
      <button type="button" className="attachment-dropzone" disabled={disabled} onClick={() => attachmentInput.current?.click()}
        onDragOver={event => { event.preventDefault(); event.stopPropagation() }}
        onDrop={event => { event.preventDefault(); event.stopPropagation(); if (!disabled) add([...event.dataTransfer.files], false) }}>
        {t('사진이나 파일을 끌어다 놓거나 클릭해서 첨부')}
      </button>
      <p className="field-help">{t('JPEG·PNG·WebP: 8MB / PDF: 20MB. 여러 파일을 함께 선택할 수 있습니다.')}</p>
      <p className="field-help">{t('파일은 선택 즉시 전송됩니다. 링크를 아는 사람은 파일을 열 수 있습니다. 글 저장은 별도로 진행해 주세요.')}</p>
      {uploads.error && <div role="alert"><p>{t('일부 파일의 형식 또는 용량을 확인해 주세요.')}</p><pre>{uploads.error}</pre></div>}
      {views.map(asset => <div className="composer-attachment" key={asset.id}>
        {asset.mediaType.startsWith('image/') && (asset.previewUrl || asset.url) ? <img src={asset.previewUrl || asset.url} alt="" className="attachment-thumb" /> : <span className="attachment-icon" aria-hidden="true">PDF</span>}
        <div className="attachment-info"><strong>{asset.fileName}</strong><small>{asset.mediaType.split('/')[1].toUpperCase()}{asset.size ? ' · ' + fileSizeLabel(asset.size) : ''}</small>
          <p role="status">{t(asset.state === 'failed' ? '첨부 실패' : asset.state === 'queued' ? '업로드 대기' : asset.state === 'uploading' ? '업로드 중' : asset.state === 'processing' ? '파일 준비 중' : '첨부 완료')}{asset.percent !== undefined && ' · ' + asset.percent + '%'}</p>
          {['uploading', 'processing', 'queued'].includes(asset.state ?? '') && <progress aria-label={asset.fileName + ' ' + t('업로드 진행률')} max={100} value={asset.state === 'uploading' ? asset.percent ?? 0 : undefined} />}
          {asset.error && <p className="field-error">{t(asset.error)}</p>}
        </div>
        <div className="attachment-actions">
          {(asset.url || asset.previewUrl) && <button type="button" onClick={() => setPreview(asset.id)}>{t('미리보기')}</button>}
          <button type="button" onClick={() => handle.current?.insert(assetToken(asset.id), true)}>{t('본문에 삽입')}</button>
          {asset.state === 'failed' && <button type="button" onClick={() => uploads.retry(asset.id)}>{t('재시도')}</button>}
          {(!asset.state || asset.state === 'ready') && <>
            <button type="button" onClick={() => setSelected(asset.id)}>{t('설정')}</button>
            <button type="button" onClick={() => { replacement.current = assets.find(item => item.id === asset.id); if (replacement.current) { replaceInput.current!.accept = asset.mediaType.startsWith('image/') ? 'image/jpeg,image/png,image/webp' : 'application/pdf'; replaceInput.current?.click() } }}>{t('교체')}</button>
          </>}
          <button type="button" onClick={() => remove(asset.id)}>{t('첨부 삭제')}</button>
        </div>
      </div>)}
      <p className="field-help">{t('본문에서 제거해도 첨부 목록에는 남습니다. 첨부 삭제는 저장 후 이 글에만 반영됩니다.')}</p>
    </section>
    {previewing && <div className="asset-preview" role="dialog" aria-modal="true" aria-label={t('첨부 미리보기')}>
      <div><div className="editor-row-actions"><strong>{previewing.fileName}</strong><button type="button" autoFocus onClick={() => setPreview(undefined)}>{t('닫기')}</button></div>
        {previewing.mediaType.startsWith('image/') ? <img src={previewing.previewUrl || previewing.url} alt={previewing.alt ?? previewing.fileName} /> : <><iframe title={previewing.fileName} src={previewing.url} /><a href={previewing.url} target="_blank" rel="noopener noreferrer">{t('새 창에서 열기')} ↗</a></>}
      </div>
    </div>}
    {references && onReferences && <ReferencesEditor value={references} body={value} onChange={onReferences} onBodyChange={onChange} />}
  </section>
}
