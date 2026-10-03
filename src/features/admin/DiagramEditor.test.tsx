import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { DiagramEditor } from './DiagramEditor'
import { compileDiagram, diagramHash } from '../../services/diagrams/diagramService'
vi.mock('../../services/diagrams/diagramService', () => ({ compileDiagram: vi.fn(), diagramHash: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
const scope = { collection: 'mathematics' as const, recordId: 'draft-one' }
it('preserves editable source and identity, invalidates stale output, and saves only reviewed results', async () => {
  const onSave = vi.fn()
  vi.mocked(diagramHash).mockResolvedValue('new-hash')
  vi.mocked(compileDiagram).mockResolvedValue({ url: '/uploads/new.png', sourceHash: 'new-hash' })
  render(<DiagramEditor scope={scope} language="tikz" value={{ id: 'figure-one', language: 'tikz', source: 'old source', sourceHash: 'old-hash', url: '/uploads/old.png' }} onClose={vi.fn()} onSave={onSave} />)
  expect(screen.getByLabelText('도형 소스')).toHaveValue('old source')
  fireEvent.change(screen.getByLabelText('도형 소스'), { target: { value: 'new source' } })
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: '도형 적용' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: '렌더링 확인' }))
  await waitFor(() => expect(screen.getByRole('button', { name: '도형 적용' })).toBeEnabled())
  expect(onSave).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '도형 적용' }))
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: 'figure-one', source: 'new source', sourceHash: 'new-hash', url: '/uploads/new.png' }))
})
it('keeps failed source available for retry and shows actionable diagnostics', async () => {
  vi.mocked(diagramHash).mockResolvedValue('hash')
  vi.mocked(compileDiagram).mockRejectedValueOnce(new Error('line 4: invalid source')).mockResolvedValue({ url: '/uploads/retry.png', sourceHash: 'hash' })
  render(<DiagramEditor scope={scope} language="asymptote" onClose={vi.fn()} onSave={vi.fn()} />)
  fireEvent.change(screen.getByLabelText('도형 소스'), { target: { value: 'size(200); invalid;' } })
  fireEvent.click(screen.getByRole('button', { name: '렌더링 확인' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('line 4: invalid source')
  expect(screen.getByLabelText('도형 소스')).toHaveValue('size(200); invalid;')
  expect(screen.getByRole('button', { name: '본문에 삽입' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: '재시도' }))
  await waitFor(() => expect(screen.getByRole('button', { name: '본문에 삽입' })).toBeEnabled())
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
