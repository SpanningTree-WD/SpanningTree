import { useEffect, useState } from 'react'
import { useT } from '../../i18n/LanguageProvider'
import type { Member } from '../../models/people'
import { memberRepository } from '../../repositories/memberRepository'

interface Props {
  label?: string
  authors: string[]
  authorIds: string[]
  onChange: (authors: string[], authorIds: string[]) => void
}

// One visible selection list; retain both persisted formats for older articles.
export function AuthorSelector({ label = '작성자', authors, authorIds, onChange, members, error = false, retry }: Props & {
  members?: Member[]; error?: boolean; retry?: () => void
}) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(20)
  const name = query.trim()
  const selected = (members ?? []).filter(member => authorIds.includes(member.id))
  const plain = [...new Set(authors)].filter(author => !selected.some(member => member.name === author))
  const matches = (name ? members ?? [] : []).filter(member => !authorIds.includes(member.id)
    && (member.name + ' ' + member.generation).toLowerCase().includes(name.toLowerCase()))
  const canAddName = name.length > 0 && name.length <= 100 && !authors.includes(name)
    && !selected.some(member => member.name === name)
    && !(members ?? []).some(member => member.name === name)
  function addName() {
    if (!canAddName) return
    onChange([...authors, name], authorIds)
    setQuery('')
  }
  function removeMember(id: string) {
    const member = selected.find(item => item.id === id)
    const keepName = selected.some(item => item.id !== id && item.name === member?.name)
    onChange(member && !keepName ? authors.filter(author => author !== member.name) : authors,
      authorIds.filter(item => item !== id))
  }
  return <section className="people-picker" aria-label={t(label)}>
    <h3>{t(label)}</h3>
    <div className="picker-selected">
      {authorIds.map(id => {
        const member = selected.find(item => item.id === id)
        const text = member ? `${member.name} · ${t('{count}기', { count: member.generation })} · ${id.slice(-6)}` : `${t('현재 목록에 없는 연결')} · ${id.slice(-6)}`
        return <button type="button" key={id} aria-label={t('{name} 삭제', { name: text })} onClick={() => removeMember(id)}>{text} ×</button>
      })}
      {plain.map(author => <button type="button" key={author} aria-label={t('{name} 삭제', { name: author })} onClick={() => onChange(authors.filter(item => item !== author), authorIds)}>{author} ×</button>)}
    </div>
    <label className="admin-field"><span>{t('이름 검색 또는 입력')}</span>
      <input value={query} maxLength={100} onChange={event => { setQuery(event.target.value); setLimit(20) }} onKeyDown={event => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); addName() }
      }} />
    </label>
    <p className="field-help">{t('등록된 사람을 선택하거나, 목록에 없는 이름을 추가하세요.')}</p>
    {error ? <p role="alert">{t('목록을 불러오지 못했습니다.')} <button type="button" onClick={retry}>{t('다시 시도')}</button></p>
      : !members ? <p role="status">{t('목록을 불러오는 중입니다.')}</p>
      : <div className="picker-results">{matches.slice(0, limit).map(member => <button className="picker-option" type="button" key={member.id} onClick={() => {
        onChange(authors.filter(author => author !== member.name), [...authorIds, member.id]); setQuery('')
      }}>{member.name} · {t('{count}기', { count: member.generation })} · {member.id.slice(-6)} +</button>)}
        {matches.length > limit && <button type="button" onClick={() => setLimit(value => value + 20)}>{t('더 보기')}</button>}
      </div>}
    {canAddName && <button type="button" onClick={addName}>{t('“{name}” 이름으로 추가', { name })}</button>}
  </section>
}

export function AuthorPicker(props: Props) {
  const [members, setMembers] = useState<Member[]>()
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    setError(false)
    try { return memberRepository.subscribe(setMembers, () => setError(true)) }
    catch { setError(true) }
  }, [retry])
  return <AuthorSelector {...props} members={members} error={error} retry={() => setRetry(value => value + 1)} />
}
