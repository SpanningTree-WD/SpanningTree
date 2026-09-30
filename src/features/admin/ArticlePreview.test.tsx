import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { activityFixtures } from '../../content/fixtures/activities'
import { mathematicsFixtures } from '../../content/fixtures/mathematics'
import { publicationFixtures } from '../../content/fixtures/publications'
import {
  ActivityDetail,
  MathematicsDetail,
  PublicationDetail,
} from '../../components/content/ContentDetail'
import { ContentImage } from '../../components/content/ContentImage'
import type { Attachment } from '../../models/common'
import { ArticlePreview } from './ArticlePreview'

afterEach(cleanup)

const imageUrl = '/uploads/' + 'a'.repeat(64) + '.png'
const pdf: Attachment = {
  label: '강의 자료',
  fileName: 'lecture-notes.pdf',
  mediaType: 'application/pdf',
  sizeLabel: '12 KB',
  url: '/uploads/' + 'b'.repeat(64) + '.pdf',
}
const coverImage = { alt: '첨부한 사진', variant: 'a', url: imageUrl }
const activity = {
  ...activityFixtures[0],
  title: '작성 중인 활동',
  description: '활동 본문입니다.',
  coverImage,
  attachments: [pdf],
  gallery: [{ ...coverImage, alt: '활동 사진', caption: '함께 공부하는 모습' }],
}
const mathematics = {
  ...mathematicsFixtures[0],
  title: '작성 중인 수학 글',
  content: '## 본문 제목\n\n수학 본문입니다.',
  coverImage,
  attachments: [pdf],
}
const publication = {
  ...publicationFixtures[0],
  title: '작성 중인 출판물',
  description: '출판물 본문입니다.',
  coverImage,
  pdf,
}

it('shows the current mathematics body, hero and file in their public positions', () => {
  const { container } = render(<ArticlePreview collection="mathematics" record={mathematics} />)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(mathematics.title)
  expect(screen.getByRole('heading', { name: '본문 제목' })).toBeInTheDocument()
  const hero = screen.getByRole('img', { name: coverImage.alt })
  expect(hero).toHaveAttribute('src', imageUrl)
  expect(hero).toHaveClass('detail-hero', 'uploaded-image')
  const article = container.querySelector('article')!
  expect(article).toHaveClass('page-container', 'detail-page')
  expect(Array.from(article.children).map((node) => node.className)).toEqual([
    'content-header', 'detail-hero uploaded-image', 'reading-body',
  ])
  const body = container.querySelector('.reading-body')! as HTMLElement
  expect(within(body).getByText('lecture-notes.pdf · 12 KB')).toBeInTheDocument()
  expect(within(body).getByRole('link', { name: 'PDF 다운로드' })).toHaveAttribute('href', pdf.url)
})

it('shows activity photos, gallery captions and attachments with the body', () => {
  const { container } = render(<ArticlePreview collection="activities" record={activity} />)
  expect(screen.getByText(activity.description)).toBeInTheDocument()
  expect(screen.getByRole('img', { name: coverImage.alt })).toHaveClass('detail-hero', 'photo')
  expect(screen.getByRole('img', { name: '활동 사진' }).closest('figure')).toHaveTextContent(
    '함께 공부하는 모습'
  )
  expect(container.querySelector('.gallery')?.nextElementSibling).toHaveClass('attachments')
  expect(screen.getByRole('link', { name: 'PDF 다운로드' })).toHaveAttribute('download', pdf.fileName)
})

it('shows publication cover beside the description and file using the public grid', () => {
  const { container } = render(<ArticlePreview collection="publications" record={publication} />)
  const grid = container.querySelector('.publication-detail-grid')! as HTMLElement
  expect(within(grid).getByRole('img', { name: coverImage.alt })).toHaveClass('cover', 'detail-cover')
  expect(within(grid).getByText(publication.description)).toBeInTheDocument()
  expect(within(grid).getByRole('link', { name: 'PDF 다운로드' })).toHaveAttribute('href', pdf.url)
})

it('uses the same complete article markup for public pages and all three previews', () => {
  const cases = [
    {
      preview: <ArticlePreview collection="activities" record={activity} />,
      published: <ActivityDetail record={activity} />,
    },
    {
      preview: <ArticlePreview collection="mathematics" record={mathematics} />,
      published: <MathematicsDetail record={mathematics} />,
    },
    {
      preview: <ArticlePreview collection="publications" record={publication} />,
      published: <PublicationDetail record={publication} />,
    },
  ]
  for (const item of cases) {
    const rendered = render(item.preview)
    const preview = rendered.container.querySelector('article')!.outerHTML
    rendered.rerender(item.published)
    expect(rendered.container.querySelector('article')!.outerHTML).toBe(preview)
    rendered.unmount()
  }
})

it('previews a pending replacement locally without changing the saved image', () => {
  const record = { ...mathematics, coverImage: { ...coverImage } }
  const rendered = render(
    <ArticlePreview collection="mathematics" record={record} imagePreviewUrl="blob:local-picture">
      <p role="status">새 사진 업로드 중</p>
    </ArticlePreview>
  )
  expect(screen.getByRole('img', { name: coverImage.alt })).toHaveAttribute('src', 'blob:local-picture')
  expect(screen.getByRole('status')).toHaveTextContent('새 사진 업로드 중')
  expect(record.coverImage.url).toBe(imageUrl)
  rendered.rerender(<ArticlePreview collection="mathematics" record={record} />)
  expect(screen.getByRole('img', { name: coverImage.alt })).toHaveAttribute('src', imageUrl)
})

it('shows a local photo before a new mathematics article has a stored image URL', () => {
  render(
    <ArticlePreview
      collection="mathematics"
      record={{ ...mathematics, coverImage: { alt: '새 사진', variant: 'blue' } }}
      imagePreviewUrl="blob:new-picture"
    />
  )
  expect(screen.getByRole('img', { name: '새 사진' })).toHaveAttribute('src', 'blob:new-picture')
})

it('does not accept blob URLs from persisted media or arbitrary preview URLs', () => {
  const rendered = render(
    <ContentImage media={{ ...coverImage, url: 'blob:unexpected' }} previewUrl="javascript:alert(1)" />
  )
  expect(rendered.container.querySelector('img')).toBeNull()
  rendered.rerender(<ContentImage media={coverImage} previewUrl="https://unrelated.example/image.png" />)
  expect(screen.getByRole('img', { name: coverImage.alt })).toHaveAttribute('src', imageUrl)
})

it('drops the previous article image and attachments when previewing a new record', () => {
  const rendered = render(<ArticlePreview collection="mathematics" record={mathematics} />)
  rendered.rerender(
    <ArticlePreview
      collection="mathematics"
      record={{
        ...mathematics,
        title: '새 글',
        content: '새 본문',
        coverImage: { alt: '', variant: 'blue' },
        attachments: [],
      }}
    />
  )
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('새 글')
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'PDF 다운로드' })).not.toBeInTheDocument()
  expect(screen.queryByText('lecture-notes.pdf · 12 KB')).not.toBeInTheDocument()
})

it('places unsaved PDF metadata with mathematics attachments without creating a download link', () => {
  const pendingFiles = [{ id: 'local', fileName: 'selected.pdf', sizeLabel: '2 KB', stateText: '첨부 예정 · 저장 필요' }]
  const { container } = render(
    <ArticlePreview collection="mathematics" record={mathematics} pendingFiles={pendingFiles} />
  )
  const body = container.querySelector('.reading-body')! as HTMLElement
  const pendingRow = within(body).getByText('selected.pdf').closest('.attachment')! as HTMLElement
  expect(pendingRow).toHaveTextContent('2 KB')
  expect(within(pendingRow).getByRole('status')).toHaveTextContent('첨부 예정 · 저장 필요')
  expect(within(pendingRow).queryByRole('link')).not.toBeInTheDocument()
  expect(within(body).getByRole('link', { name: 'PDF 다운로드' })).toHaveAttribute('href', pdf.url)
})

it('previews a replacement publication PDF in place of the original without changing the saved record', () => {
  const pendingFiles = [{ id: 'replacement', fileName: 'replacement.pdf', sizeLabel: '3 KB', stateText: '업로드 실패 · 재시도 가능' }]
  const rendered = render(
    <ArticlePreview collection="publications" record={publication} pendingFiles={pendingFiles} />
  )
  const grid = rendered.container.querySelector('.publication-detail-grid')! as HTMLElement
  expect(within(grid).getByText('replacement.pdf')).toBeInTheDocument()
  expect(within(grid).getByRole('status')).toHaveTextContent('업로드 실패')
  expect(within(grid).queryByRole('link', { name: 'PDF 다운로드' })).not.toBeInTheDocument()
  expect(screen.queryByText('lecture-notes.pdf · 12 KB')).not.toBeInTheDocument()
  expect(publication.pdf).toBe(pdf)
  rendered.rerender(<ArticlePreview collection="publications" record={publication} />)
  expect(screen.getByRole('link', { name: 'PDF 다운로드' })).toHaveAttribute('href', pdf.url)
})

it('places an activity pending PDF after the gallery as on its published page', () => {
  const pendingFiles = [{ id: 'local', fileName: 'activity.pdf', sizeLabel: '4 KB', stateText: '파일 전송 중' }]
  const { container } = render(
    <ArticlePreview collection="activities" record={{ ...activity, attachments: [] }} pendingFiles={pendingFiles} />
  )
  const attachments = container.querySelector('.gallery')!.nextElementSibling! as HTMLElement
  expect(attachments).toHaveClass('attachments')
  expect(within(attachments).getByText('activity.pdf')).toBeInTheDocument()
  expect(within(attachments).getByRole('status')).toHaveTextContent('파일 전송 중')
  expect(within(attachments).queryByRole('link')).not.toBeInTheDocument()
})
