import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { HomepageEditorPage } from './HomepageEditorPage'
import { HomepagePreview } from './HomepagePreview'
import { LanguageProvider } from '../../i18n/LanguageProvider'
import { LANGUAGE_KEY } from '../../i18n/locale'
import { defaultHomepage, homepageCopy, validateHomepage } from '../../models/homepage'
const repo = vi.hoisted(() => ({ loadEditor: vi.fn(), save: vi.fn() }))
vi.mock('../../repositories/homepageRepository', () => ({ getHomepageRepository: () => repo }))
beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  repo.loadEditor.mockResolvedValue({ settings: defaultHomepage, revision: { draft: 2, published: 1 } })
  repo.save.mockImplementation(async (settings, revision, publish) => ({ settings, revision: { draft: revision.draft + 1, published: revision.published + (publish ? 1 : 0) } }))
})
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks() })
async function show() {
  render(<LanguageProvider initial="ko"><HomepageEditorPage /></LanguageProvider>)
  return screen.findByRole('textbox', { name: '홈페이지 제목 (ko)' })
}
it('keeps typing, defaults and cancel local; saves drafts without publishing', async () => {
  const title = await show()
  fireEvent.change(title, { target: { value: '임시 제목' } })
  expect(repo.save).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '저장하지 않은 변경 취소' }))
  expect(title).toHaveValue(defaultHomepage.hero.title.ko)
  fireEvent.change(title, { target: { value: '초안 제목' } })
  fireEvent.click(screen.getByRole('button', { name: '초안 저장' }))
  await screen.findByText('초안을 저장했습니다. 공개 홈페이지는 바뀌지 않았습니다.')
  expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ hero: expect.objectContaining({ title: expect.objectContaining({ ko: '초안 제목' }) }) }), { draft: 2, published: 1 }, false)
  fireEvent.click(screen.getByRole('button', { name: '기본값으로 복원' }))
  expect(title).toHaveValue(defaultHomepage.hero.title.ko)
  expect(repo.save).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: '저장하지 않은 변경 취소' }))
  expect(title).toHaveValue('초안 제목')
})
it('previews all language/device combinations without changing personal language and publishes explicitly', async () => {
  const title = await show()
  fireEvent.change(title, { target: { value: '새 제목' } })
  const publish = screen.getByRole('button', { name: '홈페이지 게시' })
  expect(publish).toBeDisabled()
  for (const language of ['en', 'ko']) {
    fireEvent.click(screen.getByRole('button', { name: language === 'ko' ? '한국어' : 'English' }))
    for (const device of ['mobile', 'desktop']) {
      fireEvent.click(screen.getByRole('button', { name: device === 'mobile' ? '모바일 · 375px' : 'PC · 1280px' }))
      expect(screen.getByTitle('Homepage preview · ' + language + ' · ' + device)).toHaveStyle({ width: device === 'mobile' ? '375px' : '1280px' })
    }
  }
  expect(localStorage.getItem(LANGUAGE_KEY)).toBeNull()
  expect(document.documentElement.lang).toBe('ko')
  fireEvent.click(screen.getByRole('checkbox', { name: '미리보기를 확인했습니다.' }))
  fireEvent.change(title, { target: { value: '최종 제목' } })
  expect(publish).toBeDisabled()
  fireEvent.click(screen.getByRole('checkbox', { name: '미리보기를 확인했습니다.' }))
  fireEvent.click(publish)
  await screen.findByText('홈페이지 설정을 게시했습니다.')
  expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ hero: expect.objectContaining({ title: expect.objectContaining({ ko: '최종 제목' }) }) }), { draft: 2, published: 1 }, true)
})
it('keeps input and reports server permission failures in English', async () => {
  repo.save.mockRejectedValue({ code: 'permission-denied' })
  render(<LanguageProvider initial="en"><HomepageEditorPage /></LanguageProvider>)
  const title = await screen.findByRole('textbox', { name: 'Homepage title (en)' })
  fireEvent.change(title, { target: { value: 'Keep my input' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Editing permission')
  expect(title).toHaveValue('Keep my input')
  expect(screen.queryByText('Homepage settings published.')).not.toBeInTheDocument()
})
it('allows retry after loading failure and cancels publication confirmation', async () => {
  repo.loadEditor.mockRejectedValueOnce(new Error('offline'))
  render(<LanguageProvider initial="ko"><HomepageEditorPage /></LanguageProvider>)
  await screen.findByRole('alert')
  fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }))
  await screen.findByRole('textbox', { name: '홈페이지 제목 (ko)' })
  vi.mocked(window.confirm).mockReturnValue(false)
  fireEvent.click(screen.getByRole('checkbox', { name: '미리보기를 확인했습니다.' }))
  fireEvent.click(screen.getByRole('button', { name: '홈페이지 게시' }))
  await waitFor(() => expect(window.confirm).toHaveBeenCalled())
  expect(repo.save).not.toHaveBeenCalled()
})
it('shares actual hero markup, escapes input, preserves multiline text and falls back across languages', () => {
  const settings = { ...defaultHomepage, hero: { ...defaultHomepage.hero, title: { ko: '<script>alert(1)</script>', en: '' }, description: { ko: '긴 소개\n' + '가'.repeat(2000), en: '' }, font: 'serif' as const } }
  expect(homepageCopy(settings, 'en').title).toBe(settings.hero.title.ko)
  render(<HomepagePreview settings={settings} language="en" device="mobile" />)
  const iframe = screen.getByTitle('Homepage preview · en · mobile')
  const html = iframe.getAttribute('srcdoc')!
  expect(iframe).toHaveAttribute('sandbox', '')
  expect(html).toContain('font-serif')
  expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  expect(html).not.toContain('<script>')
  expect(html).toContain('overflow-wrap: anywhere')
  expect(html).toContain('white-space: pre-line')
  expect(html).toContain('가'.repeat(2000))
})
it('validates fonts, bilingual text lengths, and missing translations before saving', () => {
  expect(validateHomepage(defaultHomepage)).toEqual(defaultHomepage)
  expect(() => validateHomepage({ ...defaultHomepage, hero: { ...defaultHomepage.hero, title: { ko: '', en: '  ' } } })).toThrow()
  expect(() => validateHomepage({ ...defaultHomepage, hero: { ...defaultHomepage.hero, description: { ko: 'a'.repeat(3001), en: '' } } })).toThrow()
  expect(() => validateHomepage({ ...defaultHomepage, hero: { ...defaultHomepage.hero, font: 'unsafe' as 'serif' } })).toThrow()
})
