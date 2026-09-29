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
  const [open, setOpen] = useState(false)
  const id = useId()
  const selected = groups.filter((group) => group.selected)
  return (
    <aside className={`filters${open ? ' is-open' : ''}`} aria-label="자료 필터">
      <button
        className="filter-toggle"
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <span>
          필터 {open ? '닫기' : '열기'}
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
                  group.options.find((option) => option.value === group.selected)?.label ??
                  group.selected
              )
              .join(' · ')}
          </span>
          <button type="button" onClick={onReset}>
            필터 초기화
          </button>
        </div>
      )}
      <div className="filter-groups" id={id}>
        {groups.map((group) => (
          <div className="filter-group" key={group.parameter}>
            <h3>{group.title}</h3>
            {group.options.map((option) => (
              <button
                className={`filter-item${option.value === group.selected ? ' active' : ''}`}
                type="button"
                key={option.value ?? 'all'}
                aria-pressed={option.value === group.selected}
                onClick={() => onChange(group.parameter, option.value)}
              >
                <span>{option.label}</span>
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
  return (
    <div className="results-head">
      <span role="status" aria-live="polite">
        {count}개 결과
      </span>
      <label className="archive-sort">
        정렬
        <select value={sort} onChange={(event) => onSort(parseSort(event.target.value))}>
          <option value="latest">최신순</option>
          <option value="oldest">오래된순</option>
          <option value="title">제목순</option>
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
  return (
    <div className="page-head">
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  )
}
