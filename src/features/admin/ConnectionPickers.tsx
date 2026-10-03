import { useEffect, useState } from 'react'
import { useT } from '../../i18n/LanguageProvider'
import type { Member } from '../../models/people'
import { memberRepository } from '../../repositories/memberRepository'
import { activityRepository, mathematicsRepository } from '../../repositories/adminRepositories'

interface Option { id: string; label: string; detail?: string }
function Picker({ label, value, onChange, options, error, retry }: {
  label: string; value: string[]; onChange: (value: string[]) => void; options?: Option[]; error: boolean; retry: () => void
}) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(20)
  const filtered = options?.filter(option => (option.label + ' ' + option.detail).toLowerCase().includes(query.toLowerCase())) ?? []
  function toggle(id: string) { onChange(value.includes(id) ? value.filter(item => item !== id) : [...value, id]) }
  return <section className="related-picker" aria-label={t(label)}><h3>{t(label)}</h3>
    <label className="admin-field"><span>{t('검색')}</span><input value={query} placeholder={t('이름 또는 제목으로 검색')} onChange={event => { setQuery(event.target.value); setLimit(20) }} /></label>
    <div className="picker-selected">{value.map(id => <button type="button" key={id} onClick={() => toggle(id)}>{options?.find(option => option.id === id)?.label ?? t('현재 목록에 없는 연결')} ×</button>)}</div>
    {error ? <p role="alert">{t('목록을 불러오지 못했습니다.')} <button type="button" onClick={retry}>{t('다시 시도')}</button></p> : !options ? <p role="status">{t('목록을 불러오는 중입니다.')}</p> : <div className="picker-results">
      {filtered.slice(0, limit).map(option => <label className="picker-option" key={option.id}><input type="checkbox" checked={value.includes(option.id)} onChange={() => toggle(option.id)} /><span>{option.label} <small>{option.detail}</small></span></label>)}
      {!filtered.length && <p>{t('검색 결과가 없습니다.')}</p>}
      {filtered.length > limit && <button type="button" onClick={() => setLimit(current => current + 20)}>{t('더 보기')}</button>}
    </div>}
  </section>
}
export function PeoplePicker(props: { label: string; value: string[]; onChange: (value: string[]) => void }) {
  const t = useT()
  const [members, setMembers] = useState<Member[]>()
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    setError(false)
    try { return memberRepository.subscribe(setMembers, () => setError(true)) }
    catch { setError(true) }
  }, [retry])
  return <Picker {...props} options={members?.map(member => ({ id: member.id, label: member.name, detail: t('{count}기', { count: member.generation }) + ' · ' + member.id.slice(-6) }))} error={error} retry={() => setRetry(value => value + 1)} />
}
export function RelatedPicker({ collection, ...props }: { collection: 'activities' | 'mathematics'; label: string; value: string[]; onChange: (value: string[]) => void }) {
  const t = useT()
  const [options, setOptions] = useState<Option[]>()
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true; setError(false)
    Promise.resolve().then(async () => await (collection === 'activities' ? activityRepository : mathematicsRepository).listAll())
      .then(records => { if (active) setOptions(records.map(record => ({ id: record.id, label: record.title, detail: record.status }))) })
      .catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [collection, retry])
  return <Picker {...props} options={options?.map(option => ({ ...option, detail: t(option.detail === 'published' ? '공개' : '비공개') }))} error={error} retry={() => setRetry(value => value + 1)} />
}
