import type { ReactNode } from 'react'

export type FilterOption = { label: string; count?: number }
export function FilterSidebar({ groups }: { groups: { title: string; options: FilterOption[] }[] }) {
  return <aside className="filters" aria-label="Archive filters">{groups.map(group => <FilterGroup key={group.title} {...group} />)}</aside>
}
export function FilterGroup({ title, options }: { title: string; options: FilterOption[] }) {
  return <div className="filter-group"><h3>{title}</h3>{options.map((option, index) => <button className={`filter-item${index === 0 ? ' active' : ''}`} type="button" key={option.label} aria-pressed={index === 0}><span>{option.label}</span>{option.count !== undefined && <span>{option.count}</span>}</button>)}</div>
}
export function ResultsToolbar({ count }: { count: number }) { return <div className="results-head"><span>{count} Results</span><span>Sort by &nbsp; Latest⌄</span></div> }
export function ArchiveLayout({ filters, count, children }: { filters: { title: string; options: FilterOption[] }[]; count: number; children: ReactNode }) {
  return <div className="archive-layout"><FilterSidebar groups={filters} /><div><ResultsToolbar count={count} /><div className="archive-list">{children}</div></div></div>
}
export function PageHeading({ title, children }: { title: string; children: ReactNode }) { return <div className="page-head"><h1>{title}</h1><p>{children}</p></div> }
