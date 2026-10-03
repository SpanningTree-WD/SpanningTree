import { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { PeoplePicker, RelatedPicker } from './ConnectionPickers'
const repositories = vi.hoisted(() => ({ listAll: vi.fn(async () => [{ id: 'activity-a', title: 'Topology day', status: 'published' }, { id: 'activity-b', title: 'Algebra seminar', status: 'draft' }]) }))
vi.mock('../../repositories/adminRepositories', () => ({ activityRepository: repositories, mathematicsRepository: repositories }))
vi.mock('../../repositories/memberRepository', () => ({ memberRepository: { subscribe: (next: (members: unknown[]) => void) => { next([{ id: 'same-name-1', name: '김수학', generation: 38 }, { id: 'same-name-2', name: '김수학', generation: 38 }]); return () => {} } } }))
afterEach(cleanup)
it('distinguishes people with the same name by ID and supports multiple choices and removal', () => {
  function Form() { const [ids, setIds] = useState<string[]>([]); return <><PeoplePicker label="참여자" value={ids} onChange={setIds} /><output>{ids.join(',')}</output></> }
  render(<Form />)
  const boxes = screen.getAllByRole('checkbox')
  expect(boxes).toHaveLength(2)
  fireEvent.click(boxes[0]); fireEvent.click(boxes[1])
  expect(screen.getByText('same-name-1,same-name-2')).toBeVisible()
  fireEvent.click(boxes[0])
  expect(screen.getByText('same-name-2')).toBeVisible()
})
it('searches related articles by title and preserves a selected unavailable ID until explicitly removed', async () => {
  function Form() { const [ids, setIds] = useState(['missing-id']); return <><RelatedPicker collection="activities" label="관련 활동" value={ids} onChange={setIds} /><output>{ids.join(',')}</output></> }
  render(<Form />)
  await waitFor(() => expect(screen.getAllByRole('checkbox')).toHaveLength(2))
  const panel = screen.getByRole('region', { name: '관련 활동' })
  fireEvent.change(within(panel).getByLabelText('검색'), { target: { value: 'Topology' } })
  expect(screen.getAllByRole('checkbox')).toHaveLength(1)
  fireEvent.click(screen.getByRole('checkbox'))
  expect(screen.getByText('missing-id,activity-a')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: '현재 목록에 없는 연결 ×' }))
  expect(screen.getByText('activity-a')).toBeVisible()
})
