import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { LanguageProvider, useT } from './LanguageProvider'
import { LanguageSwitch } from './LanguageSwitch'
import { LANGUAGE_KEY, localizedText, resolveLanguage } from './locale'
function Example() { const t = useT(); return <><LanguageSwitch /><p>{t('자료 검색')}</p><p>{t('번역 없는 원문')}</p></> }
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks() })
it('uses a valid saved preference, otherwise the primary browser language, and defaults to English', () => {
  expect(resolveLanguage('en', ['ko-KR'])).toBe('en')
  expect(resolveLanguage('ko', ['en-US'])).toBe('ko')
  expect(resolveLanguage(null, ['ko-KR', 'en'])).toBe('ko')
  expect(resolveLanguage(null, ['en-GB'])).toBe('en')
  expect(resolveLanguage('invalid', ['fr-FR', 'ko-KR'])).toBe('en')
  expect(resolveLanguage(null, [])).toBe('en')
})
it('persists only the browser preference and restores it after remount', () => {
  render(<LanguageProvider initial="ko"><Example /></LanguageProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'English' }))
  expect(screen.getByText('Search')).toBeInTheDocument()
  expect(document.documentElement.lang).toBe('en')
  expect(localStorage.getItem(LANGUAGE_KEY)).toBe('en')
  expect(screen.getByText('번역 없는 원문')).toBeInTheDocument()
  cleanup()
  render(<LanguageProvider><Example /></LanguageProvider>)
  expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')
})
it('does not change another mounted visitor context when one visitor switches language', () => {
  render(<><section data-testid="a"><LanguageProvider initial="ko"><Example /></LanguageProvider></section>
    <section data-testid="b"><LanguageProvider initial="en"><Example /></LanguageProvider></section></>)
  fireEvent.click(within(screen.getByTestId('b')).getByRole('button', { name: '한국어' }))
  fireEvent.click(within(screen.getByTestId('a')).getByRole('button', { name: 'English' }))
  expect(within(screen.getByTestId('a')).getByText('Search')).toBeInTheDocument()
  expect(within(screen.getByTestId('b')).getByText('자료 검색')).toBeInTheDocument()
})
it('works when browser storage is blocked and falls back to original untranslated text', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
  render(<LanguageProvider><Example /></LanguageProvider>)
  fireEvent.click(screen.getByRole('button', { name: '한국어' }))
  expect(screen.getByText('자료 검색')).toBeInTheDocument()
  expect(localizedText({ ko: '원문', en: '' }, 'en')).toBe('원문')
  expect(localizedText({ ko: '', en: 'Original' }, 'ko')).toBe('Original')
})
