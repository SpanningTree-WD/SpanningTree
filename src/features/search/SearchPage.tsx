import { useT } from '../../i18n/LanguageProvider'
import { formatMathematicsFields } from '../../models/mathematicsFields'
import { usePageMetadata } from '../shared/usePageMetadata'
import { Link } from 'react-router-dom'
import {
  ArchiveLayout,
  PageHeading,
  type FilterGroupModel,
} from '../../components/archive/ArchiveComponents'
import { ContentState } from '../../components/ui/ContentState'
import { compareArchiveRecords, matchesArchiveSearch } from '../../repositories/archiveQuery'
import { listSearchRecords } from '../../repositories/searchRepository'
import { useArchiveControls } from '../shared/useArchiveControls'
import { useRepository } from '../shared/useRepository'

const kinds = [
  ['activities', '활동'],
  ['mathematics', '수학 자료'],
  ['publications', '출판물'],
] as const


export function SearchPage() {
  const t = useT()

  usePageMetadata({ noindex: true })
  const { search, kind, sort, change, resetFilters } = useArchiveControls()
  const { data, error } = useRepository(listSearchRecords, [])
  const matching = (data ?? []).filter((item) => matchesArchiveSearch(item.record, search))
  const results = matching
    .filter((item) => !kind || item.kind === kind)
    .sort((a, b) => compareArchiveRecords(a.record, b.record, sort) || a.kind.localeCompare(b.kind))
  const filters: FilterGroupModel[] = [
    {
      title: '자료 종류',
      parameter: 'kind',
      selected: kind,
      options: [
        { label: '전체', count: matching.length },
        ...kinds.map(([value, label]) => ({
          value,
          label,
          count: matching.filter((item) => item.kind === value).length,
        })),
      ],
    },
  ]
  return (
    <div className="page-container">
      <PageHeading title={t("자료 검색")}>{t("활동·수학 자료·출판물의 제목, 본문, 작성자를 검색합니다. 여러 단어는 공백으로 구분해 주세요.")}</PageHeading>
      {error ? (
        <ContentState title={t("검색 자료를 불러오지 못했습니다")}>{t("연결을 확인하고 새로고침해 주세요.")}</ContentState>
      ) : !data ? (
        <ContentState title={t("자료를 불러오는 중입니다")}>{t("공개된 기록을 확인하고 있습니다.")}</ContentState>
      ) : (
        <ArchiveLayout
          filters={filters}
          count={results.length}
          onFilter={change}
          onResetFilters={resetFilters}
          search={search}
          sort={sort}
          onSearch={(value) => change('q', value)}
          onSort={(value) => change('sort', value)}
        >
          {results.length ? (
            results.map(({ kind: itemKind, record }) => (
              <article className="search-result" key={`${itemKind}:${record.id}`}>
                <p className="eyebrow">
                  {t(kinds.find(([value]) => value === itemKind)?.[1] ?? '')} ·{' '}
                  {'date' in record ? record.date.replaceAll('-', '.') : record.year}
                </p>
                <h2>
                  <Link to={`/${itemKind}/${record.slug}`}>{record.title}</Link>
                </h2>
                <div className="content-meta">
                  {record.type}
                  {'field' in record ? ` · ${formatMathematicsFields(record)}` : ''}
                  {'authors' in record && record.authors.length
                    ? ` · ${record.authors.join(', ')}`
                    : ''}
                </div>
                <p>{record.summary}</p>
              </article>
            ))
          ) : (
            <ContentState title={t("검색 결과가 없습니다")}>{t("검색어를 바꾸거나 자료 종류 필터를 해제해 주세요.")}</ContentState>
          )}
        </ArchiveLayout>
      )}
    </div>
  )
}
