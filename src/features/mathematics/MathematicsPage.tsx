import { formatMathematicsFields } from '../../models/mathematicsFields'
import { usePageMetadata } from '../shared/usePageMetadata'
import { ContentImage } from '../../components/content/ContentImage'
import { Link } from 'react-router-dom'
import { ArchiveLayout, PageHeading } from '../../components/archive/ArchiveComponents'
import { ContentState } from '../../components/ui/ContentState'
import type { Mathematics } from '../../models/mathematics'
import { mathematicsRepository } from '../../repositories/publicRepositories'
import { mathematicsFields, mathematicsTypes } from '../../models/contentOptions'
import { archiveFilter } from '../shared/archiveFilters'
import { useArchiveResults } from '../shared/useArchiveResults'
export function MathematicsArchiveRow({ item }: { item: Mathematics }) {
  return (
    <article className="archive-row math-row">
      <Link to={`/mathematics/${item.slug}`}>
        <ContentImage className="math-cover" media={item.coverImage} title={item.title} />
      </Link>
      <div>
        <h2>
          <Link to={`/mathematics/${item.slug}`}>{item.title}</Link>
        </h2>
        <div className="content-meta">
          {item.type} · {formatMathematicsFields(item)} · {item.year}
        </div>
        <p>{item.summary}</p>
        <Link className="article-link" to={`/mathematics/${item.slug}`}>
          Read More →
        </Link>
      </div>
    </article>
  )
}

export function MathematicsPage() {
  usePageMetadata()
  const { data, error, field, type, year, search, sort, change, resetFilters } =
    useArchiveResults(mathematicsRepository)
  const filters = [
    archiveFilter('Category', 'field', field, mathematicsFields, data?.facets.fields ?? []),
    archiveFilter('Type', 'type', type, mathematicsTypes, data?.facets.types ?? []),
    archiveFilter('Year', 'year', year, [], data?.facets.years ?? []),
  ]
  return (
    <div className="page-container">
      <PageHeading title="Mathematics">
        수학의 다양한 분야를 탐구한 lecture note, article, problem set을 살펴보세요.
      </PageHeading>
      {error ? (
        <ContentState title="Archive unavailable">수학 기록을 불러오지 못했습니다.</ContentState>
      ) : !data ? (
        <ContentState title="Loading archive">수학 기록을 불러오는 중입니다.</ContentState>
      ) : (
        <ArchiveLayout
          filters={filters}
          count={data.total}
          onFilter={change}
          onResetFilters={resetFilters}
          search={search}
          sort={sort}
          onSearch={(value) => change('q', value)}
          onSort={(value) => change('sort', value)}
        >
          {data.items.length ? (
            data.items.map((item) => <MathematicsArchiveRow item={item} key={item.id} />)
          ) : (
            <ContentState title="No mathematics found">
              선택한 조건에 맞는 공개 자료가 없습니다.
            </ContentState>
          )}
        </ArchiveLayout>
      )}
    </div>
  )
}
