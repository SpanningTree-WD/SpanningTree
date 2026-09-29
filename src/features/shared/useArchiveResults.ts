import type { ArchivePage } from '../../models/common'
import { queryArchive, type ArchiveRecord } from '../../repositories/archiveQuery'
import { useArchiveControls } from './useArchiveControls'
import { useRepository } from './useRepository'

export function useArchiveResults<T extends ArchiveRecord>(repository: {
  listPublished: () => Promise<ArchivePage<T>>
}) {
  const controls = useArchiveControls()
  // Load once per archive. Search, sorting and filters share this public snapshot.
  const { data, error } = useRepository(() => repository.listPublished(), [repository])
  const result =
    data &&
    queryArchive(data.items, {
      search: controls.search,
      sort: controls.sort,
      year: controls.year ? Number(controls.year) : undefined,
      type: controls.type,
      field: controls.field,
    })
  return { ...controls, data: result, error }
}
