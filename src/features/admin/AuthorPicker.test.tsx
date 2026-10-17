import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { AuthorSelector } from './AuthorPicker'
import type { Member } from '../../models/people'
const members: Member[] = [
  { id: 'member-one', name: '김수학', generation: 38, isLeader: false, createdAt: '', updatedAt: '' },
  { id: 'member-two', name: '김수학', generation: 39, isLeader: false, createdAt: '', updatedAt: '' },
]
afterEach(cleanup)
function show(authors = ['김수학', '외부 저자'], authorIds = ['member-one'], error = false) {
  function Form() {
    const [names, setNames] = useState(authors), [ids, setIds] = useState(authorIds)
    return <><AuthorSelector authors={names} authorIds={ids} members={error ? undefined : members} error={error} onChange={(nextNames, nextIds) => { setNames(nextNames); setIds(nextIds) }} /><output data-testid="selection">{JSON.stringify({ names, ids })}</output></>
  }
  render(<Form />)
}
const search = (value: string) => fireEvent.change(screen.getByLabelText('이름 검색 또는 입력'), { target: { value } })
it('shows a legacy name/member pair once and removes both through the same chip', () => {
  show()
  expect(screen.getAllByRole('button', { name: /김수학.*삭제/ })).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: /김수학.*삭제/ }))
  expect(screen.getByTestId('selection')).toHaveTextContent('{"names":["외부 저자"],"ids":[]}')
})
it('converts a matching legacy name to a link and keeps same-name people distinct', () => {
  show(['김수학'], [])
  search('김수학')
  fireEvent.click(screen.getByRole('button', { name: /김수학 · 38기.*\+/ }))
  search('김수학')
  fireEvent.click(screen.getByRole('button', { name: /김수학 · 39기.*\+/ }))
  expect(screen.getByTestId('selection')).toHaveTextContent('{"names":[],"ids":["member-one","member-two"]}')
  fireEvent.click(screen.getByRole('button', { name: /38기.*삭제/ }))
  expect(screen.getByTestId('selection')).toHaveTextContent('member-two')
  expect(screen.getByTestId('selection')).not.toHaveTextContent('member-one')
})
it('retains missing IDs and permits external names if the member list fails', () => {
  show([], ['missing-id'], true)
  search('  외부 발표자  ')
  fireEvent.keyDown(screen.getByLabelText('이름 검색 또는 입력'), { key: 'Enter' })
  expect(screen.getByTestId('selection')).toHaveTextContent('{"names":["외부 발표자"],"ids":["missing-id"]}')
  search('외부 발표자')
  expect(screen.queryByRole('button', { name: /이름으로 추가/ })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: /현재 목록에 없는 연결.*삭제/ }))
  expect(screen.getByTestId('selection')).not.toHaveTextContent('missing-id')
})
