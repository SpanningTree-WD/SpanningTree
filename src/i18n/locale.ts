export type Language = 'ko' | 'en'
export const LANGUAGE_KEY = 'spanning-tree.language'
export function resolveLanguage(saved: string | null, languages: readonly string[]): Language {
  if (saved === 'ko' || saved === 'en') return saved
  const primary = (languages[0] ?? '').toLowerCase().split(/[-_]/)[0]
  return primary === 'ko' ? 'ko' : 'en'
}
export function initialLanguage(): Language {
  let saved: string | null = null
  try { saved = localStorage.getItem(LANGUAGE_KEY) } catch { /* Storage may be disabled. */ }
  return resolveLanguage(saved, typeof navigator === 'undefined' ? [] : navigator.languages?.length ? navigator.languages : [navigator.language])
}
export function localizedText(value: { ko: string; en: string }, language: Language, fallback = '') {
  return value[language]?.trim() || value[language === 'ko' ? 'en' : 'ko']?.trim() || fallback
}
