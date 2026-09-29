import { useSearchParams } from 'react-router-dom'
import { parseSort } from '../../repositories/archiveQuery'

export function useArchiveControls() {
  const [params, setParams] = useSearchParams()
  const change = (key: string, value?: string) => {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { preventScrollReset: true }
    )
  }
  const resetFilters = () => {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        for (const key of ['year', 'type', 'field', 'kind']) next.delete(key)
        return next
      },
      { preventScrollReset: true }
    )
  }
  return {
    year: params.get('year') || undefined,
    type: params.get('type') || undefined,
    field: params.get('field') || undefined,
    kind: params.get('kind') || undefined,
    search: (params.get('q') ?? '').trim().slice(0, 200),
    sort: parseSort(params.get('sort')),
    change,
    resetFilters,
  }
}
