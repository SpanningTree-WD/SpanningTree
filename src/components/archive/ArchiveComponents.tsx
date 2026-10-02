import { useT } from '../../i18n/LanguageProvider'
import { useId, useState, type ReactNode } from 'react'
import type { SortOrder } from '../../models/common'
import { parseSort } from '../../repositories/archiveQuery'
import { ArchiveSearchForm } from './ArchiveSearchForm'

export type FilterOption = { label: string; value?: string; count?: number }
export type FilterGroupModel = {
  title: string
  parameter: string
  selected?: string
  options: FilterOption[]
}

export function FilterSidebar({
  groups,
  onChange,
  onReset,
}: {
  groups: FilterGroupModel[]
  onChange: (parameter: string, value?: string) => void
  onReset: () => void
}) {
  const t = useT()

  const [open, setOpen] = useState(false)
  const id = useId()
  const selected = groups.filter((group) => group.selected)
  return (
    <aside className={`filters${open ? ' is-open' : ''}`} aria-label={t("자료 필터")}>
      <button
        className="filter-toggle"
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <span>
          {t(open ? '필터 닫기' : '필터 열기')}
          {selected.length ? ` (${selected.length})` : ''}
        </span>
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {selected.length > 0 && (
        <div className="filter-selection">
          <span>
            {selected
              .map(
                (group) =>
                  t(group.options.find((option) => option.value === group.selected)?.label ?? group.selected ?? '')
              )
              .join(' · ')}
          </span>
          <button type="button" onClick={onReset}>{t("필터 초기화")}</button>
        </div>
      )}
      <div className="filter-groups" id={id}>
        {groups.map((group) => (
          <div className="filter-group" key={group.parameter}>
            <h3>{t(group.title)}</h3>
            {group.options.map((option) => (
              <button
                className={`filter-item${option.value === group.selected ? ' active' : ''}`}
                type="button"
                key={option.value ?? 'all'}
                aria-pressed={option.value === group.selected}
                onClick={() => onChange(group.parameter, option.value)}
              >
                <span>{t(option.label)}</span>
                {option.count !== undefined && <span>{option.count}</span>}
              </button>
            ))}
          </div>
        ))}
      </div>
    </aside>
  )
}

export function ResultsToolbar({
  count,
  sort,
  onSort,
}: {
  count: number
  sort: SortOrder
  onSort: (sort: SortOrder) => void
}) {
  const t = useT()

  return (
    <div className="results-head">
      <span role="status" aria-live="polite">
        {t('{count}개 결과', { count })}
      </span>
      <label className="archive-sort">{t("정렬")}<select value={sort} onChange={(event) => onSort(parseSort(event.target.value))}>
          <option value="latest">{t("최신순")}</option>
          <option value="oldest">{t("오래된순")}</option>
          <option value="title">{t("제목순")}</option>
        </select>
      </label>
    </div>
  )
}

export function ArchiveLayout({
  filters,
  count,
  onFilter,
  onResetFilters,
  search,
  sort,
  onSearch,
  onSort,
  children,
}: {
  filters: FilterGroupModel[]
  count: number
  onFilter: (parameter: string, value?: string) => void
  onResetFilters: () => void
  search: string
  sort: SortOrder
  onSearch: (value: string) => void
  onSort: (sort: SortOrder) => void
  children: ReactNode
}) {
  return (
    <div className="archive-layout">
      <FilterSidebar groups={filters} onChange={onFilter} onReset={onResetFilters} />
      <div className="archive-results">
        <ArchiveSearchForm value={search} onSearch={onSearch} />
        <ResultsToolbar count={count} sort={sort} onSort={onSort} />
        <div className="archive-list">{children}</div>
      </div>
    </div>
  )
}

export function PageHeading({ title, children }: { title: string; children: ReactNode }) {
  const t = useT()

  return (
    <div className="page-head">
      <h1>{t(title)}</h1>
      <p>{typeof children === 'string' ? t(children) : children}</p>
    </div>
  )
}
