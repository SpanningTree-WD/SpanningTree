import { useState } from 'react'
import { useT } from '../../i18n/LanguageProvider'
import { citationIds, citationToken, referenceLabel, removeCitation, type ReferenceEntry } from '../../models/authoring'
const fields: [keyof Omit<ReferenceEntry, 'id'>, string][] = [['title', '제목'], ['authors', '저자'], ['year', '연도'], ['source', '학술지·출판사'], ['url', 'URL'], ['doi', 'DOI'], ['text', '자유 형식']]
function ReferenceFields({ value, onChange }: { value: ReferenceEntry; onChange: (value: ReferenceEntry) => void }) {
  const t = useT()
  return <div className="reference-fields">{fields.map(([key, label]) => <label key={key} className="admin-field"><span>{t(label)}</span>
    <input value={value[key] ?? ''} maxLength={5000} onChange={event => onChange({ ...value, [key]: event.target.value })} />
  </label>)}</div>
}
export function ReferencesEditor({ value, body, onChange, onBodyChange }: {
  value: ReferenceEntry[]; body: string; onChange: (value: ReferenceEntry[]) => void; onBodyChange: (body: string) => void
}) {
  const t = useT()
  function move(index: number, offset: number) {
    const next = [...value]
    const other = index + offset
    if (other < 0 || other >= next.length) return
    ;[next[index], next[other]] = [next[other], next[index]]
    onChange(next)
  }
  function remove(ref: ReferenceEntry) {
    if (citationIds(body).includes(ref.id)) {
      if (!window.confirm(t('본문에서 인용 중입니다. 참고문헌과 해당 인용을 함께 제거할까요?'))) return
      onBodyChange(removeCitation(body, ref.id))
    }
    onChange(value.filter(item => item.id !== ref.id))
  }
  return <section className="references-editor"><h2>{t('참고문헌')}</h2>
    <p className="field-help">{t('제목 또는 자유 형식을 입력해 주세요. 순서를 바꾸면 본문의 인용 번호도 자동으로 바뀝니다.')}</p>
    {value.map((ref, index) => <section className="reference-editor-item" id={'reference-' + ref.id} key={ref.id}>
      <div className="editor-row-actions"><strong>[{index + 1}] {referenceLabel(ref) || t('새 참고문헌')}</strong>
        <button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={'[' + (index + 1) + '] ' + t('위로')}>↑</button>
        <button type="button" disabled={index === value.length - 1} onClick={() => move(index, 1)} aria-label={'[' + (index + 1) + '] ' + t('아래로')}>↓</button>
        <button type="button" onClick={() => remove(ref)}>{t('삭제')}</button>
      </div>
      <ReferenceFields value={ref} onChange={changed => onChange(value.map(item => item.id === ref.id ? changed : item))} />
    </section>)}
    <button type="button" disabled={value.length >= 100} onClick={() => onChange([...value, { id: crypto.randomUUID(), title: '' }])}>{t('참고문헌 추가')}</button>
  </section>
}
export function CitationPicker({ references, initialIds = [], onInsert, onClose, onAdd }: {
  references: ReferenceEntry[]; initialIds?: string[]
  onInsert: (text: string) => boolean | void; onClose: () => void; onAdd?: (reference: ReferenceEntry) => void
}) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(initialIds)
  const [draft, setDraft] = useState<ReferenceEntry>({ id: '', title: '' })
  const [error, setError] = useState(false)
  const editing = initialIds.length > 0
  function apply(text: string) {
    if (onInsert(text) === false) setError(true)
    else onClose()
  }
  return <section className="editor-picker" aria-label={t(editing ? '인용 수정' : '인용 삽입')}>
    <h3>{t(editing ? '인용 수정' : '인용 삽입')}</h3><label className="admin-field"><span>{t('참고문헌 검색')}</span><input value={query} onChange={event => setQuery(event.target.value)} /></label>
    {!references.length && !onAdd && <p>{t('아래 참고문헌 영역에서 문헌을 먼저 추가해 주세요.')}</p>}
    <div className="picker-results">{references.filter(ref => referenceLabel(ref).toLowerCase().includes(query.toLowerCase())).map(ref => <label key={ref.id} className="picker-option">
      <input type="checkbox" checked={selected.includes(ref.id)} onChange={() => setSelected(values => values.includes(ref.id) ? values.filter(id => id !== ref.id) : [...values, ref.id])} />
      [{references.indexOf(ref) + 1}] {referenceLabel(ref)}
    </label>)}</div>
    {onAdd && <details className="citation-new-reference" open={!references.length || undefined}><summary>{t('새 참고문헌')}</summary>
      <ReferenceFields value={draft} onChange={setDraft} />
      <button type="button" disabled={error || references.length >= 100 || !(draft.title?.trim() || draft.text?.trim())} onClick={() => {
        const reference = { ...draft, id: crypto.randomUUID() }
        onAdd(reference)
        setDraft({ id: '', title: '' })
        apply(citationToken([...selected, reference.id]))
      }}>{t('문헌 추가하고 인용')}</button>
    </details>}
    {error && <p role="alert">{t('편집 위치가 바뀌었습니다. 닫은 뒤 본문에서 인용 위치를 다시 선택해 주세요.')}</p>}
    <div className="editor-row-actions">
      <button type="button" disabled={!selected.length || error} onClick={() => apply(citationToken(selected))}>{t(editing ? '인용 변경' : '선택한 인용 삽입')}</button>
      {editing && <button type="button" disabled={error} onClick={() => apply('')}>{t('이 인용 제거')}</button>}
      <button type="button" onClick={onClose}>{t('닫기')}</button>
    </div>
  </section>
}
