import { useState } from 'react'
import { useT } from '../../i18n/LanguageProvider'
import { citationIds, citationToken, referenceLabel, removeCitation, type ReferenceEntry } from '../../models/authoring'
export function ReferencesEditor({ value, body, onChange, onBodyChange }: {
  value: ReferenceEntry[]; body: string; onChange: (value: ReferenceEntry[]) => void; onBodyChange: (body: string) => void
}) {
  const t = useT()
  const fields: [keyof Omit<ReferenceEntry, 'id'>, string][] = [['title', '제목'], ['authors', '저자'], ['year', '연도'], ['source', '학술지·출판사'], ['url', 'URL'], ['doi', 'DOI'], ['text', '자유 형식']]
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
      <div className="reference-fields">{fields.map(([key, label]) => <label key={key} className="admin-field"><span>{t(label)}</span>
        <input value={ref[key] ?? ''} maxLength={5000} onChange={event => onChange(value.map(item => item.id === ref.id ? { ...item, [key]: event.target.value } : item))} />
      </label>)}</div>
    </section>)}
    <button type="button" disabled={value.length >= 100} onClick={() => onChange([...value, { id: crypto.randomUUID(), title: '' }])}>{t('참고문헌 추가')}</button>
  </section>
}
export function CitationPicker({ references, onInsert, onClose }: {
  references: ReferenceEntry[]; onInsert: (text: string) => void; onClose: () => void
}) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  return <section className="editor-picker" aria-label={t('인용 삽입')}>
    <h3>{t('인용 삽입')}</h3><label className="admin-field"><span>{t('참고문헌 검색')}</span><input value={query} onChange={event => setQuery(event.target.value)} /></label>
    {!references.length && <p>{t('아래 참고문헌 영역에서 문헌을 먼저 추가해 주세요.')}</p>}
    <div className="picker-results">{references.filter(ref => referenceLabel(ref).toLowerCase().includes(query.toLowerCase())).map(ref => <label key={ref.id} className="picker-option">
      <input type="checkbox" checked={selected.includes(ref.id)} onChange={() => setSelected(values => values.includes(ref.id) ? values.filter(id => id !== ref.id) : [...values, ref.id])} />
      [{references.indexOf(ref) + 1}] {referenceLabel(ref)}
    </label>)}</div>
    <div className="editor-row-actions"><button type="button" disabled={!selected.length} onClick={() => { onInsert(citationToken(selected)); onClose() }}>{t('선택한 인용 삽입')}</button><button type="button" onClick={onClose}>{t('닫기')}</button></div>
  </section>
}
