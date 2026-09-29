import type { FilterGroupModel } from '../../components/archive/ArchiveComponents'
import type { Choice } from '../../models/contentOptions'

export function archiveFilter(
  title: string,
  parameter: string,
  selected: string | undefined,
  choices: readonly Choice[],
  observed: string[]
): FilterGroupModel {
  const values = [
    ...new Set([...choices.map(([value]) => value), ...observed, ...(selected ? [selected] : [])]),
  ]
  if (parameter === 'year') values.sort((a, b) => Number(b) - Number(a))
  return {
    title,
    parameter,
    selected,
    options: [{ label: '전체' }, ...values.map((value) => ({ value, label: value }))],
  }
}
