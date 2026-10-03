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
