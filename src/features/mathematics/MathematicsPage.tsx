import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeading } from '../../components/archive/ArchiveComponents'
import { MathematicsCover } from '../../components/content/MathematicsCover'
import { ContentState } from '../../components/ui/ContentState'
import { useLanguage, useT } from '../../i18n/LanguageProvider'
import { mathematicsFields, mathematicsTypes } from '../../models/contentOptions'
import type { Mathematics } from '../../models/mathematics'
import { getMathematicsFields } from '../../models/mathematicsFields'
import type { Member } from '../../models/people'
import { queryArchive, parseSort } from '../../repositories/archiveQuery'
import { watchPublicMembers } from '../../repositories/memberRepository'
import { mathematicsRepository } from '../../repositories/publicRepositories'
import { archiveFilter } from '../shared/archiveFilters'
import { useArchiveControls } from '../shared/useArchiveControls'
import { usePageMetadata } from '../shared/usePageMetadata'
import { useRepository } from '../shared/useRepository'
import './MathematicsArchive.css'

function MathematicsCard({ item }: { item: Mathematics }) {
  const t = useT()
  const { language } = useLanguage()
  const url = '/mathematics/' + item.slug
  const fields = getMathematicsFields(item).map(value => language === 'ko'
    ? mathematicsFields.find(([id]) => id === value)?.[1] ?? value : value)
  return <article className="paper-card">
    <MathematicsCover item={item} />
    <div className="paper-body">
      <h2><Link to={url}>{item.title}</Link></h2>
      <div className="content-meta">{[item.type, ...fields, item.year].join(' · ')}</div>
      <p className="paper-summary">{item.summary}</p>
      <div className="paper-foot"><span>{item.authors.join(', ')}</span><Link className="article-link" to={url}>{t('Read More →')}</Link></div>
    </div>
  </article>
}

function MathematicsSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const t = useT()
  const [composition, setComposition] = useState<string | null>(null)
  return <form className="line-search" role="search" onSubmit={event => event.preventDefault()}>
    <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="10" cy="10" r="6.8" /><path d="m15.1 15.1 5.4 5.4" />
    </svg>
    <input type="search" maxLength={200} aria-label={t('검색어')} placeholder={t('제목, 본문, 작성자 검색')}
      value={composition ?? value} onCompositionStart={e => setComposition(e.currentTarget.value)}
      onCompositionEnd={e => { setComposition(null); onChange(e.currentTarget.value) }}
      onChange={e => composition !== null ? setComposition(e.target.value) : onChange(e.target.value)} />
  </form>
}

export function MathematicsPage() {
  const t = useT()
  const { language } = useLanguage()
  usePageMetadata()
  const controls = useArchiveControls()
  const { field, year, type, sort, search, rawSearch, change, resetFilters } = controls
  const { data, error } = useRepository(() => mathematicsRepository.listPublished(), [])
  const [members, setMembers] = useState<Member[]>([])
  const hasMemberAuthors = data?.items.some(item => item.authorIds?.length)
  useEffect(() => {
    if (hasMemberAuthors) return watchPublicMembers(setMembers, () => setMembers([]))
  }, [hasMemberAuthors])
  const records = useMemo(() => {
    const names = new Map(members.map(member => [member.id, member.name]))
    return data?.items.map(item => ({
      ...item, authors: [...new Set([...(item.authorIds ?? []).flatMap(id => names.get(id) ?? []), ...item.authors])],
    }))
  }, [data, members])
  const results = useMemo(() => records && queryArchive(records, {
    field, type, year: year ? Number(year) : undefined, sort, search,
  }), [records, field, type, year, sort, search])
  const fieldLabel = (value: string) => language === 'ko' ? mathematicsFields.find(([id]) => id === value)?.[1] ?? value : value
  const typeLabel = (value: string) => language === 'ko' ? mathematicsTypes.find(([id]) => id === value)?.[1] ?? value : value
  const active = !!(rawSearch || year || type || field)
  return <div className="page-container">
    <PageHeading title="Mathematics">{t('수학의 다양한 분야를 탐구한 lecture note, article, problem set을 살펴보세요.')}</PageHeading>
    {error ? <ContentState title="Archive unavailable">{t('수학 기록을 불러오지 못했습니다.')}</ContentState> :
      !results ? <ContentState title="Loading archive">{t('수학 기록을 불러오는 중입니다.')}</ContentState> :
      <section className="math-index" aria-label={t('수학 글 목록')}>
        <div className="index-tools">
          <MathematicsSearch value={rawSearch} onChange={v => { if (v !== rawSearch) change('q', v, !!rawSearch) }} />
          <div className="catalog-selects">
            <label className="index-select">{t('자료 유형')}<select value={type ?? ''} onChange={e => change('type', e.target.value)}>
              {archiveFilter('Type', 'type', type, mathematicsTypes, results.facets.types).options.map(o =>
                <option key={o.value ?? ''} value={o.value ?? ''}>{o.value ? typeLabel(o.value) : t('모든 유형')}</option>)}
            </select></label>
            <label className="index-select">{t('연도')}<select value={year ?? ''} onChange={e => change('year', e.target.value)}>
              {archiveFilter('Year', 'year', year, [], results.facets.years).options.map(o =>
                <option key={o.value ?? ''} value={o.value ?? ''}>{o.value ?? t('모든 연도')}</option>)}
            </select></label>
          </div>
        </div>
        <div className="subject-index" role="group" aria-label={t('수학 분야')}><span className="subject-label">{t('분야')}</span>
          {archiveFilter('Category', 'field', field, mathematicsFields, results.facets.fields).options.map(o =>
            <button key={o.value ?? ''} type="button" aria-pressed={o.value === field} onClick={() => change('field', o.value)}>
              {o.value ? fieldLabel(o.value) : t('전체')}
            </button>)}
        </div>
        <div className="index-results"><div><span role="status" aria-live="polite">{t('{count}개 결과', { count: results.total })}</span>
          {active && <button className="clear-filters" type="button" onClick={() => resetFilters(true)}>{t('초기화')}</button>}</div>
          <label className="index-sort">{t('정렬')}<select value={sort} onChange={e => change('sort', parseSort(e.target.value))}>
            <option value="latest">{t('최신순')}</option><option value="oldest">{t('오래된순')}</option><option value="title">{t('제목순')}</option>
          </select></label>
        </div>
        {results.total ? <div className="paper-grid">{results.items.map(item => <MathematicsCard item={item} key={item.id} />)}</div> :
          <div className="index-empty"><p>{t('선택한 조건에 맞는 공개 자료가 없습니다.')}</p>
            {active && <button onClick={() => resetFilters(true)}>{t('전체 글 보기')}</button>}</div>}
      </section>}
  </div>
}
