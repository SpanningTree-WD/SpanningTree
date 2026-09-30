import { mathematicsFields } from './contentOptions'

export const MAX_MATHEMATICS_FIELDS = 16
export const MAX_MATHEMATICS_FIELD_LENGTH = 100

interface FieldSelection {
  field?: string
  fields?: readonly string[]
}

// Legacy records keep working without a migration. An explicit empty selection
// stays empty so the editor can require at least one field before saving.
export function getMathematicsFields(record: FieldSelection): readonly string[] {
  return record.fields ?? (record.field ? [record.field] : [])
}

export function formatMathematicsFields(record: FieldSelection) {
  return getMathematicsFields(record)
    .map((field) => mathematicsFields.find(([value]) => value === field)?.[1] ?? field)
    .join(' · ')
}

export function fieldNameKey(value: string) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('ko')
}
