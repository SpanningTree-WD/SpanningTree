import { useEffect, useRef, useState } from 'react'
import type { DiagramBlock } from '../../models/authoring'
import { useT } from '../../i18n/LanguageProvider'
import { compileDiagram, diagramHash } from '../../services/diagrams/diagramService'
import type { UploadScope } from '../../services/uploads/GitHubUploadService'
const examples = {
  tikz: '\\begin{tikzpicture}\n\\draw[->] (0,0) -- (3,0);\n\\draw[->] (0,0) -- (0,2);\n\\draw[domain=0:2] plot (\\x,{\\x*\\x/2});\n\\end{tikzpicture}',
  asymptote: 'size(240);\nimport graph;\ndraw((0,0)--(3,0),Arrow);\ndraw((0,0)--(0,2),Arrow);\ndraw(graph(new real(real x) { return x*x/2; },0,2));',
}
export function DiagramEditor({ scope, language, value, onSave, onClose }: {
  scope: UploadScope; language: DiagramBlock['language']; value?: DiagramBlock
  onSave: (value: DiagramBlock) => void; onClose: () => void
}) {
  const t = useT()
  const [source, setSource] = useState(value?.source ?? examples[language])
  const [caption, setCaption] = useState(value?.caption ?? '')
  const [alt, setAlt] = useState(value?.alt ?? '')
  const [result, setResult] = useState<{ url: string; sourceHash: string } | undefined>(value?.url && value.sourceHash ? { url: value.url, sourceHash: value.sourceHash } : undefined)
  const [state, setState] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const operation = useRef<AbortController | null>(null)
  useEffect(() => () => operation.current?.abort(), [])
  async function compile() {
    if (operation.current) return
    const controller = new AbortController()
    operation.current = controller; setBusy(true); setError('')
    try {
      const hash = await diagramHash(language, source)
      if (result?.sourceHash === hash) return
      const next = await compileDiagram(scope, language, source, controller.signal, setState)
      if (!controller.signal.aborted) setResult(next)
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : '도형을 컴파일하지 못했습니다.')
    } finally {
      if (!controller.signal.aborted) { setBusy(false); operation.current = null }
    }
  }
  return <section className="diagram-editor" aria-label={t(language === 'tikz' ? 'TikZ 도형' : 'Asymptote 도형')}>
    <h3>{t(language === 'tikz' ? 'TikZ 도형' : 'Asymptote 도형')}</h3>
    <p className="field-help">{t('도형은 별도의 격리 환경에서 컴파일됩니다. 대기와 배포에 몇 분 걸릴 수 있습니다. 같은 소스의 결과는 재사용합니다.')}</p>
    <label className="admin-field"><span>{t('도형 소스')}</span><textarea value={source} maxLength={20000} disabled={busy} onChange={event => { setSource(event.target.value); setResult(undefined); setError('') }} /></label>
    <div className="reference-fields">
      <label className="admin-field"><span>{t('대체 텍스트')}</span><input value={alt} maxLength={1000} onChange={event => setAlt(event.target.value)} /></label>
      <label className="admin-field"><span>{t('캡션')}</span><input value={caption} maxLength={5000} onChange={event => setCaption(event.target.value)} /></label>
    </div>
    {busy && <p role="status">{t(state === 'queued' ? '컴파일 대기 중' : state === 'committed' ? '도형 결과 준비 중' : '도형 컴파일 중')}</p>}
    {error && <pre className="diagram-error field-error" role="alert">{t(error)}</pre>}
    {result && <img src={result.url} alt={alt || language} />}
    <div className="editor-row-actions">
      <button type="button" disabled={busy || !source.trim()} onClick={() => void compile()}>{t(error ? '재시도' : '렌더링 확인')}</button>
      <button type="button" disabled={busy || !result} onClick={() => { if (result) onSave({ id: value?.id ?? crypto.randomUUID(), language, source, ...result, caption, alt }) }}>{t(value ? '도형 적용' : '본문에 삽입')}</button>
      <button type="button" onClick={onClose}>{t('취소')}</button>
    </div>
  </section>
}
