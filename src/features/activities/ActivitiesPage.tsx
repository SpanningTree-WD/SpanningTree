import { ContentImage } from '../../components/content/ContentImage'
import { Link } from 'react-router-dom'
import { ArchiveLayout, PageHeading } from '../../components/archive/ArchiveComponents'
import { ContentState } from '../../components/ui/ContentState'
import type { Activity } from '../../models/activity'
import { activityRepository } from '../../repositories/publicRepositories'
import { activityTypes } from '../../models/contentOptions'
import { archiveFilter } from '../shared/archiveFilters'
import { useArchiveResults } from '../shared/useArchiveResults'
export function ActivityArchiveRow({ item }: { item: Activity }) {
  return (
    <article className="archive-row">
      <Link to={`/activities/${item.slug}`}>
        <ContentImage className="thumb photo" media={item.coverImage} />
      </Link>
      <div>
        <h2>
          <Link to={`/activities/${item.slug}`}>{item.title}</Link>
        </h2>
        <div className="content-meta">
          {item.date.replaceAll('-', '.')} · {item.type}
        </div>
        <p>{item.summary}</p>
      </div>
      <span className="tag">{item.type}</span>
    </article>
  )
}
export function ActivitiesPage() {
  const { data, error, year, type, search, sort, change, resetFilters } =
    useArchiveResults(activityRepository)
  const filters = [
    archiveFilter('Year', 'year', year, [], data?.facets.years ?? []),
    archiveFilter('Type', 'type', type, activityTypes, data?.facets.types ?? []),
  ]
  return (
    <div className="page-container">
      <PageHeading title="Activities">
        Spanning Tree의 다양한 활동과 프로젝트를 확인하세요.
      </PageHeading>
      {error ? (
        <ContentState title="Archive unavailable">활동 기록을 불러오지 못했습니다.</ContentState>
      ) : !data ? (
        <ContentState title="Loading archive">활동 기록을 불러오는 중입니다.</ContentState>
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
            data.items.map((item) => <ActivityArchiveRow item={item} key={item.id} />)
          ) : (
            <ContentState title="No activities found">
              선택한 조건에 맞는 공개 활동이 없습니다.
            </ContentState>
          )}
        </ArchiveLayout>
      )}
    </div>
  )
}
