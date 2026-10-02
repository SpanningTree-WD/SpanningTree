import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { initialLanguage, LANGUAGE_KEY, type Language } from './locale'
import { messages } from './messages'
type Values = Record<string, string | number>
function interpolate(source: string, values?: Values) {
  return source.replace(/\{(\w+)\}/g, (match, key: string) => String(values?.[key] ?? match))
}
interface LanguageContextValue {
  language: Language
  setLanguage: (language: Language) => void
  t: (source: string, values?: Values) => string
}
const LanguageContext = createContext<LanguageContextValue>({
  language: 'ko', setLanguage: () => {}, t: interpolate,
})
export function LanguageProvider({ children, initial }: { children: ReactNode; initial?: Language }) {
  const [language, setLanguageState] = useState<Language>(initial ?? initialLanguage)
  useEffect(() => { document.documentElement.lang = language }, [language])
  const value = useMemo(() => ({
    language,
    setLanguage: (next: Language) => {
      setLanguageState(next)
      try { localStorage.setItem(LANGUAGE_KEY, next) } catch { /* Keep the current session usable. */ }
    },
    t: (source: string, values?: Values) => interpolate(messages[source]?.[language] ?? source, values),
  }), [language])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
export function useLanguage() { return useContext(LanguageContext) }
export function useT() { return useLanguage().t }
