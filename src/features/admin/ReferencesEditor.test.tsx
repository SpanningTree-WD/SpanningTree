import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ReferencesEditor, CitationPicker } from './ReferencesEditor'
import { MarkdownRenderer } from '../../components/content/MarkdownRenderer'
import type { ReferenceEntry } from '../../models/authoring'
import { LanguageProvider } from '../../i18n/LanguageProvider'
afterEach(() => { cleanup(); vi.restoreAllMocks() })
function Form() {
  const [refs, setRefs] = useState<ReferenceEntry[]>([{ id: 'book-a', title: 'Alpha' }, { id: 'book-b', text: 'Beta' }])
  const [body, setBody] = useState('See [@book-b; @book-a].')
  return <><ReferencesEditor value={refs} body={body} onChange={setRefs} onBodyChange={setBody} /><MarkdownRenderer content={body} references={refs} /><output>{body}</output></>
}
it('reorders references, retains IDs, and confirms/removes only a deleted citation', () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  const { container } = render(<Form />)
  fireEvent.click(screen.getByRole('button', { name: '[2] 위로' }))
  expect(container.querySelector('.citations')?.textContent).toBe('[1], [2]')
  expect(screen.getByText('See [@book-b; @book-a].')).toBeVisible()
  const ref = container.querySelector('#reference-book-b')! as HTMLElement
  fireEvent.click(within(ref).getByRole('button', { name: '삭제' }))
  expect(confirm).toHaveBeenCalledOnce()
  expect(container.querySelector('#reference-book-b')).toBeInTheDocument()
  confirm.mockReturnValue(true)
  fireEvent.click(within(ref).getByRole('button', { name: '삭제' }))
  expect(container.querySelector('#reference-book-b')).toBeNull()
  expect(screen.getByText('See [@book-a].')).toBeVisible()
  expect(container.querySelector('.citations a')).toHaveAttribute('href', '#reference-book-a')
  expect(container.querySelector('.citations')?.textContent).toBe('[1]')
})
it('searches and inserts multiple citations by ID with English interface copy', () => {
  const insert = vi.fn(), close = vi.fn()
  render(<LanguageProvider initial="en"><CitationPicker references={[{ id: 'id-1', title: 'Topology' }, { id: 'id-2', text: 'Topology notes' }, { id: 'id-3', title: 'Algebra' }]} onInsert={insert} onClose={close} /></LanguageProvider>)
  fireEvent.change(screen.getByLabelText('Search references'), { target: { value: 'Topology' } })
  expect(screen.getAllByRole('checkbox')).toHaveLength(2)
  for (const box of screen.getAllByRole('checkbox')) fireEvent.click(box)
  fireEvent.click(screen.getByRole('button', { name: 'Insert selected citations' }))
  expect(insert).toHaveBeenCalledWith('[@id-1; @id-2]')
  expect(close).toHaveBeenCalledOnce()
})

it('edits one reference at a time and switches formats without overwriting hidden structured fields', () => {
  function Form() {
    const [refs, setRefs] = useState<ReferenceEntry[]>([{ id: 'both', title: 'Original title', authors: 'Author', text: 'Custom citation', doi: '10.1000/test' }])
    return <><ReferencesEditor value={refs} body="" onChange={setRefs} onBodyChange={() => {}} /><output data-testid="refs">{JSON.stringify(refs)}</output></>
  }
  render(<Form />)
  expect(screen.queryByRole('textbox', { name: '자유 형식' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '[1] Custom citation' }))
  expect(screen.getByRole('textbox', { name: '자유 형식' })).toHaveValue('Custom citation')
  expect(screen.queryByRole('textbox', { name: '제목' })).toBeNull()
  fireEvent.change(screen.getByLabelText('참고문헌 입력 방식'), { target: { value: 'structured' } })
  expect(screen.getByLabelText('제목', { exact: true })).toHaveValue('Original title')
  expect(screen.queryByRole('textbox', { name: '자유 형식' })).toBeNull()
  fireEvent.change(screen.getByLabelText('제목', { exact: true }), { target: { value: 'Updated title' } })
  fireEvent.change(screen.getByLabelText('참고문헌 입력 방식'), { target: { value: 'free' } })
  expect(screen.getByRole('textbox', { name: '자유 형식' })).toHaveValue('Custom citation')
  expect(screen.getByTestId('refs')).toHaveTextContent('Updated title')
  expect(screen.getByLabelText('DOI')).toHaveValue('10.1000/test')
})
