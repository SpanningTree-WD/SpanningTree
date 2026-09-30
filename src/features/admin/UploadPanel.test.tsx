import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { Attachment } from '../../models/common'
import type { ArticleAttachments, SelectedAttachment } from './useArticleAttachments'
import { UploadPanel } from './UploadPanel'

afterEach(cleanup)

const imageUrl = '/uploads/' + 'a'.repeat(64) + '.png'
const pdf: Attachment = {
  label: '기존 자료',
  fileName: 'shared-notes.pdf',
  mediaType: 'application/pdf',
  sizeLabel: '1 KB',
  url: '/uploads/' + 'b'.repeat(64) + '.pdf',
}
function attachmentState(patch: Partial<ArticleAttachments> = {}): ArticleAttachments {
  return {
    items: [], error: '', stage: vi.fn(), remove: vi.fn(), clear: vi.fn(),
    prepare: async (record) => record,
    hasPending: false, imagePreviewUrl: undefined, ...patch,
  }
}
function selected(patch: Partial<SelectedAttachment> = {}): SelectedAttachment {
  return {
    id: 'selection-A',
    file: new File(['%PDF-1.4'], 'selected.pdf', { type: 'application/pdf' }),
    state: 'selected',
    ...patch,
  }
}
function props(attachments = attachmentState()) {
  return {
    disabled: false,
    image: { alt: '대표 이미지', variant: 'a' },
    files: [] as Attachment[],
    attachments,
    onImage: vi.fn(),
    onRemovePdf: vi.fn(),
    onRetry: vi.fn(),
  }
}

it('accepts selections immediately without requiring a saved article', () => {
  const input = props()
  render(<UploadPanel {...input} />)
  expect(screen.getByRole('region', { name: '이 글의 첨부 파일' })).toBeInTheDocument()
  expect(screen.getByText(/저장을 누르면 이 글에 함께 저장/)).toBeInTheDocument()
  expect(screen.queryByText(/GitHub/)).not.toBeInTheDocument()
  const file = new File(['picture'], 'photo.png', { type: 'image/png' })
  fireEvent.change(screen.getByLabelText('대표 이미지 · 8MB 이하'), { target: { files: [file] } })
  expect(input.attachments.stage).toHaveBeenCalledWith(file)
  expect(input.onImage).not.toHaveBeenCalled()
  expect(input.onRemovePdf).not.toHaveBeenCalled()
})

it('shows selected filenames and their unsaved attachment status with a local remove action', () => {
  const item = selected()
  const input = props(attachmentState({ items: [item], hasPending: true }))
  render(<UploadPanel {...input} />)
  expect(screen.getByText(item.file.name)).toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('이 글에 첨부 예정 · 저장 필요')
  fireEvent.click(screen.getByRole('button', { name: 'selected.pdf 첨부 취소' }))
  expect(input.attachments.remove).toHaveBeenCalledWith(item.id)
  expect(input.onRemovePdf).not.toHaveBeenCalled()
})

it('shows transfer progress and then indeterminate processing without inventing a percent', () => {
  const input = props(attachmentState({
    items: [selected({ state: 'uploading', percent: 27 })], hasPending: true,
  }))
  const rendered = render(<UploadPanel {...input} />)
  expect(screen.getByRole('status')).toHaveTextContent('파일 전송 중')
  expect(screen.getByRole('progressbar', { name: 'selected.pdf 업로드 진행률' })).toHaveAttribute('value', '27')
  rendered.rerender(<UploadPanel {...input} attachments={attachmentState({
    items: [selected({ state: 'processing' })], hasPending: true,
  })} />)
  expect(screen.getByRole('status')).toHaveTextContent('파일 준비 중')
  expect(screen.getByRole('progressbar')).not.toHaveAttribute('value')
})

it('keeps the failed file visible and retries through the article save action', () => {
  const input = props(attachmentState({
    items: [selected({ state: 'failed', error: '연결이 끊어졌습니다.' })], hasPending: true,
  }))
  render(<UploadPanel {...input} />)
  expect(screen.getByRole('status')).toHaveTextContent('첨부 실패')
  expect(screen.getByRole('alert')).toHaveTextContent('연결이 끊어졌습니다.')
  fireEvent.click(screen.getByRole('button', { name: '첨부 재시도 및 저장' }))
  expect(input.onRetry).toHaveBeenCalledOnce()
  expect(input.attachments.stage).not.toHaveBeenCalled()
})

it('detaches only the provided article reference and leaves stored file deletion to no UI action', () => {
  const input = { ...props(), image: { alt: '대표 이미지', variant: 'a', url: imageUrl }, files: [pdf] }
  render(<UploadPanel {...input} />)
  expect(screen.getAllByText('이 글에 첨부됨')).toHaveLength(2)
  expect(screen.getByRole('link', { name: /shared-notes.pdf/ })).toHaveAttribute('href', pdf.url)
  fireEvent.click(screen.getByRole('button', { name: 'PDF 첨부 해제' }))
  expect(input.onRemovePdf).toHaveBeenCalledWith(pdf.url)
  fireEvent.click(screen.getByRole('button', { name: '이미지 첨부 해제' }))
  expect(input.onImage).toHaveBeenCalledWith(undefined)
  expect(input.attachments.remove).not.toHaveBeenCalled()
})

it('disables selection, removal and retry while the article is saving', () => {
  const input = props(attachmentState({
    items: [selected({ state: 'failed', error: '일시적인 오류' })], hasPending: true,
  }))
  render(<UploadPanel {...input} disabled />)
  expect(screen.getByLabelText('대표 이미지 · 8MB 이하')).toBeDisabled()
  expect(screen.getByLabelText('PDF · 20MB 이하')).toBeDisabled()
  expect(screen.getByRole('button', { name: '첨부 재시도 및 저장' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'selected.pdf 첨부 취소' })).toBeDisabled()
})
