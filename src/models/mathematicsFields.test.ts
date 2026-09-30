import { expect, it } from 'vitest'
import { formatMathematicsFields, getMathematicsFields } from './mathematicsFields'

it('reads legacy single fields without rewriting them and retains unknown classifications', () => {
  expect(getMathematicsFields({ field: 'Geometry' })).toEqual(['Geometry'])
  expect(formatMathematicsFields({ field: 'Legacy Field' })).toBe('Legacy Field')
  expect(getMathematicsFields({})).toEqual([])
})

it('uses the complete selection and does not restore a deliberately cleared selection', () => {
  const record = { field: '대수기하', fields: ['대수기하', 'Topology', '복소해석학'] }
  expect(formatMathematicsFields(record)).toBe('대수기하 · 위상수학 · 복소해석학')
  expect(getMathematicsFields({ field: 'Geometry', fields: [] })).toEqual([])
})
