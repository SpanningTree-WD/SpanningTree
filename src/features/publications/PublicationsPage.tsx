import { useT } from '../../i18n/LanguageProvider'
import { usePageMetadata } from '../shared/usePageMetadata'
import { ContentImage } from '../../components/content/ContentImage'
import { Link } from 'react-router-dom'
import { ArchiveLayout, PageHeading } from '../../components/archive/ArchiveComponents'
import { ContentState } from '../../components/ui/ContentState'
import type { Publication } from '../../models/publication'
import { publicationRepository } from '../../repositories/publicRepositories'
import { publicationTypes } from '../../models/contentOptions'
import { archiveFilter } from '../shared/archiveFilters'
import { useArchiveResults } from '../shared/useArchiveResults'
export function PublicationArchiveRow({ item }: { item: Publication }) {
  return (
    <article className="archive-row publication-row">
      <Link className="cover-thumb" to={`/publications/${item.slug}`}>
        <ContentImage className="cover" media={item.coverImage} title={item.title} />
      </Link>
      <div>
        <h2>
          <Link to={`/publications/${item.slug}`}>{item.title}</Link>
        </h2>
        <div className="content-meta">
          {item.type === 'Book' ? 'Spanning Tree Publications' : item.type} · {item.year}
        </div>
        <p>{item.summary}</p>
        <small>{item.pdf?.sizeLabel}</small>
      </div>
      <Link className="pdf-btn" to={`/publications/${item.slug}`}>
        ▣ PDF
      </Link>
    </article>
  )
}

export function PublicationsPage() {
  const t = useT()

  usePageMetadata()
  const { data, error, type, year, search, sort, change, resetFilters } =
    useArchiveResults(publicationRepository)
  const filters = [
    archiveFilter('Type', 'type', type, publicationTypes, data?.facets.types ?? []),
    archiveFilter('Year', 'year', year, [], data?.facets.years ?? []),
  ]
  return (
    <div className="page-container">
      <PageHeading title={t("Publications")}>{t("Spanning Tree가 만들어 낸 책, Notes, Proceedings, Report를 소개합니다.")}</PageHeading>
      {error ? (
        <ContentState title={t("Archive unavailable")}>{t("출판 기록을 불러오지 못했습니다.")}</ContentState>
      ) : !data ? (
        <ContentState title={t("Loading archive")}>{t("출판 기록을 불러오는 중입니다.")}</ContentState>
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
            data.items.map((item) => <PublicationArchiveRow item={item} key={item.id} />)
          ) : (
            <ContentState title="No publications found">{t("선택한 조건에 맞는 공개 출판물이 없습니다.")}</ContentState>
          )}
        </ArchiveLayout>
      )}
    </div>
  )
}
