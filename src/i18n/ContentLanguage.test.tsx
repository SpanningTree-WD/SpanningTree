import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { LanguageProvider } from './LanguageProvider'
import { LanguageSwitch } from './LanguageSwitch'
import { MathematicsDetail } from '../components/content/ContentDetail'
import { mathematicsFixtures } from '../content/fixtures/mathematics'
afterEach(() => { cleanup(); localStorage.clear() })
it('switches common controls while leaving even dictionary-matching article text unchanged', () => {
  const record = { ...mathematicsFixtures[0], title: '자료 검색', summary: '한국어 소개', content: '게시글 본문은 원문 그대로 표시합니다.',
    attachments: [{ label: '자료 검색', fileName: '원문.pdf', mediaType: 'application/pdf' as const, sizeLabel: '1 KB', url: '/uploads/' + 'a'.repeat(64) + '.pdf' }] }
  render(<LanguageProvider initial="ko"><LanguageSwitch /><MathematicsDetail record={record} /></LanguageProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'English' }))
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('자료 검색')
  expect(screen.getByText('게시글 본문은 원문 그대로 표시합니다.')).toBeInTheDocument()
  expect(screen.getByText('한국어 소개')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Download PDF' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '한국어' }))
  expect(screen.getByRole('link', { name: 'PDF 다운로드' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('자료 검색')
})
