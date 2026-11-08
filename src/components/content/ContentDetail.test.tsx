import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { activityFixtures } from '../../content/fixtures/activities'
import { mathematicsFixtures } from '../../content/fixtures/mathematics'
import { publicationFixtures } from '../../content/fixtures/publications'
import { ActivityDetail, MathematicsDetail, PublicationDetail } from './ContentDetail'

afterEach(cleanup)

const coverUrl = '/uploads/' + 'a'.repeat(64) + '.png'
const galleryUrl = '/uploads/' + 'b'.repeat(64) + '.png'

describe('cover photos are reserved for archive thumbnails', () => {
  it('does not display the cover below an activity heading and keeps gallery photos', () => {
    const record = {
      ...activityFixtures[0],
      coverImage: { ...activityFixtures[0].coverImage, url: coverUrl },
      gallery: [{ alt: '포럼 현장', variant: 'a', url: galleryUrl }],
    }
    const { container } = render(<ActivityDetail record={record} />)
    expect(screen.getByRole('heading', { name: record.title })).toBeInTheDocument()
    expect(container.querySelector('.detail-summary')).toHaveTextContent(record.summary)
    expect(container.querySelector('.detail-hero')).toBeNull()
    expect(container.querySelector(`img[src="${coverUrl}"]`)).toBeNull()
    expect(screen.getByRole('img', { name: '포럼 현장' })).toHaveAttribute('src', galleryUrl)
  })

  it('starts a mathematics article with its written body instead of a cover image', () => {
    const record = {
      ...mathematicsFixtures[0],
      coverImage: { ...mathematicsFixtures[0].coverImage, url: coverUrl },
      content: '본문에서 수학을 학습합니다.',
    }
    const { container } = render(<MathematicsDetail record={record} />)
    expect(screen.getByRole('heading', { name: record.title })).toBeInTheDocument()
    expect(container.querySelector('.detail-hero')).toBeNull()
    expect(container.querySelector(`img[src="${coverUrl}"]`)).toBeNull()
    expect(screen.getByText('본문에서 수학을 학습합니다.')).toBeInTheDocument()
  })

  it('shows a publication in one reading column without its cover', () => {
    const record = {
      ...publicationFixtures[0],
      coverImage: { ...publicationFixtures[0].coverImage, url: coverUrl },
    }
    const { container } = render(<PublicationDetail record={record} />)
    expect(screen.getByRole('heading', { name: record.title })).toBeInTheDocument()
    expect(container.querySelector('.detail-summary')).toHaveTextContent(record.summary)
    expect(container.querySelector('.publication-detail-grid')).toHaveClass('publication-detail-no-cover')
    expect(container.querySelector('.detail-cover')).toBeNull()
    expect(container.querySelector(`img[src="${coverUrl}"]`)).toBeNull()
  })
})
