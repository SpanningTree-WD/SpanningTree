import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { DiagramEditor } from './DiagramEditor'
import { renderBrowserDiagram } from '../../services/diagrams/browserDiagramService'
vi.mock('../../services/diagrams/browserDiagramService', () => ({ renderBrowserDiagram: vi.fn() }))
vi.mock('../../components/content/browserDiagrams', () => ({ loadDiagramFonts: () => Promise.resolve() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
const scope = { collection: 'mathematics' as const, recordId: 'draft-one' }
const output = { svg: '<svg viewBox="0 0 20 20"><path d="M0 0L20 20"/></svg>', sourceHash: 'a'.repeat(64), warnings: [] }
it.each(['tikz', 'asymptote'] as const)('reviews %s locally and saves only source metadata', async language => {
  const onSave = vi.fn()
  vi.mocked(renderBrowserDiagram).mockResolvedValue(output)
  render(<DiagramEditor scope={scope} language={language} value={{ id: 'figure-one', language, source: 'old source', sourceHash: 'old-hash', url: '/uploads/old.png' }} onClose={vi.fn()} onSave={onSave} />)
  fireEvent.change(screen.getByLabelText('도형 소스'), { target: { value: 'new source' } })
  expect(screen.getByRole('button', { name: '도형 적용' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: '렌더링 확인' }))
  await waitFor(() => expect(screen.getByRole('button', { name: '도형 적용' })).toBeEnabled())
  expect(onSave).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '도형 적용' }))
  expect(onSave).toHaveBeenCalledWith({ id: 'figure-one', language, source: 'new source', sourceHash: output.sourceHash, renderer: 'browser-v1', caption: '', alt: '' })
  fireEvent.change(screen.getByLabelText('도형 소스'), { target: { value: 'another source' } })
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: '도형 적용' })).toBeDisabled()
})
it('keeps source after timeout and retries locally without inserting early', async () => {
  const onSave = vi.fn()
  vi.mocked(renderBrowserDiagram).mockRejectedValueOnce(new Error('도형 렌더링 시간이 초과되었습니다. 소스를 확인한 뒤 재시도해 주세요.')).mockResolvedValue(output)
  render(<DiagramEditor scope={scope} language="asymptote" onClose={vi.fn()} onSave={onSave} />)
  fireEvent.change(screen.getByLabelText('도형 소스'), { target: { value: 'size(200); draw(unitcircle);' } })
  fireEvent.click(screen.getByRole('button', { name: '렌더링 확인' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('시간이 초과')
  expect(screen.getByLabelText('도형 소스')).toHaveValue('size(200); draw(unitcircle);')
  expect(screen.getByRole('button', { name: '본문에 삽입' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: '재시도' }))
  await waitFor(() => expect(screen.getByRole('button', { name: '본문에 삽입' })).toBeEnabled())
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(onSave).not.toHaveBeenCalled()
})
it('aborts pending work when the editor closes and ignores late results', async () => {
  let signal: AbortSignal | undefined
  vi.mocked(renderBrowserDiagram).mockImplementation((_language, _source, options) => {
    signal = options?.signal; return new Promise(() => {})
  })
  const { unmount } = render(<DiagramEditor scope={scope} language="tikz" onClose={vi.fn()} onSave={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: '렌더링 확인' }))
  unmount()
  expect(signal?.aborted).toBe(true)
})
