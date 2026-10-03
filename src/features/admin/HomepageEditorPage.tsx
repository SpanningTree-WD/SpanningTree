import { useEffect, useRef, useState } from 'react'
import { defaultHomepage, homepageFonts, validateHomepage, type HomepageSettings } from '../../models/homepage'
import { getHomepageRepository } from '../../repositories/homepageRepository'
import type { HomepageEditorState } from '../../repositories/firebase/homepageRepository'
import type { Language } from '../../i18n/locale'
import { useLanguage } from '../../i18n/LanguageProvider'
import { adminErrorMessage } from './adminErrors'
import { HomepagePreview } from './HomepagePreview'
import './HomepageEditorPage.css'

export function HomepageEditorPage() {
  const { t, language } = useLanguage()
  const [form, setForm] = useState<HomepageSettings>(defaultHomepage)
  const [saved, setSaved] = useState<HomepageEditorState>()
  const [previewLanguage, setPreviewLanguage] = useState<Language>(language)
  const [device, setDevice] = useState<'mobile' | 'desktop'>('desktop')
  const [reviewed, setReviewed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [retry, setRetry] = useState(0)
  const active = useRef(false)
  const inFlight = useRef(false)
  const dirty = !!saved && JSON.stringify(form) !== JSON.stringify(saved.settings)
  useEffect(() => {
    active.current = true
    let current = true
    setSaved(undefined)
    setError('')
    setNotice('')
    try {
      getHomepageRepository().loadEditor().then((value) => {
        if (!current) return
        setSaved(value)
        setForm(value.settings)
        setReviewed(false)
      }).catch((failure) => { if (current) setError(adminErrorMessage(failure)) })
    } catch (failure) { setError(adminErrorMessage(failure)) }
    return () => { current = false; active.current = false }
  }, [retry])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty || busy) event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, busy])
  function change(value: HomepageSettings) {
    setForm(value); setReviewed(false); setNotice(''); setError('')
  }
  function text(key: 'title' | 'description', locale: Language, value: string) {
    change({ ...form, hero: { ...form.hero, [key]: { ...form.hero[key], [locale]: value } } })
  }
  async function save(publish: boolean) {
    if (!saved || inFlight.current || (publish && !reviewed)) return
    try {
      const value = validateHomepage(form)
      if (publish && !window.confirm(t('이 홈페이지 설정을 모든 방문자에게 게시하시겠습니까?'))) return
      inFlight.current = true; setBusy(true); setError(''); setNotice('')
      const result = await getHomepageRepository().save(value, saved.revision, publish)
      if (!active.current) return
      setSaved(result); setForm(result.settings)
      setNotice(publish ? '홈페이지 설정을 게시했습니다.' : '초안을 저장했습니다. 공개 홈페이지는 바뀌지 않았습니다.')
    } catch (failure) {
      if (active.current) setError(adminErrorMessage(failure))
    } finally { inFlight.current = false; if (active.current) setBusy(false) }
  }
  function reload() {
    if (dirty && !window.confirm(t('저장하지 않은 홈페이지 변경사항을 버리시겠습니까?'))) return
    setRetry((value) => value + 1)
  }
  return <div className="admin-page homepage-editor">
    <header className="admin-page-head">
      <h1>{t('홈페이지 편집')}</h1>
      <p>{t('초안 저장과 미리보기는 공개 사이트를 바꾸지 않습니다. 게시 버튼을 눌러야 모든 방문자에게 적용됩니다.')}</p>
    </header>
    {error && <p className="field-error" role="alert">{t(error)}</p>}
    {notice && <p role="status">{t(notice)}</p>}
    {!saved ? <><p>{t('홈페이지 설정을 불러오는 중입니다.')}</p>{error && <button onClick={reload}>{t('다시 불러오기')}</button>}</> : <>
      <fieldset className="admin-editor-fields" disabled={busy}>
        <div className="admin-form-grid">
          {(['ko', 'en'] as const).map((locale) => <section key={locale} lang={locale}>
            <h2>{locale === 'ko' ? '한국어' : 'English'}</h2>
            <label className="admin-field"><span>{t('홈페이지 제목')} ({locale})</span>
              <input value={form.hero.title[locale]} maxLength={160} onChange={(event) => text('title', locale, event.target.value)} />
            </label>
            <label className="admin-field"><span>{t('소개 문구')} ({locale})</span>
              <textarea value={form.hero.description[locale]} rows={6} maxLength={3000} onChange={(event) => text('description', locale, event.target.value)} />
            </label>
          </section>)}
        </div>
        <p className="field-help">{t('한 언어를 비워 두면 다른 언어의 원문을 표시합니다. 제목과 소개는 각각 한 언어 이상 입력해 주세요.')}</p>
        <label className="admin-field"><span>{t('홈페이지 소개 영역 폰트')}</span>
          <select value={form.hero.font} onChange={(event) => change({ ...form, hero: { ...form.hero, font: event.target.value as HomepageSettings['hero']['font'] } })}>
            {Object.entries(homepageFonts).map(([value, labels]) => <option value={value} key={value}>{labels[language]}</option>)}
          </select>
        </label>
        <p className="field-help">{t('적용 범위: 홈페이지 상단 제목과 소개 문구. 메뉴·게시글 본문·다른 페이지의 폰트는 유지됩니다.')}</p>
        <div className="editor-actions">
          <button type="button" onClick={() => void save(false)}>{t('초안 저장')}</button>
          <button type="button" onClick={() => { change(saved.settings) }}>{t('저장하지 않은 변경 취소')}</button>
          <button type="button" onClick={() => change(defaultHomepage)}>{t('기본값으로 복원')}</button>
          <button type="button" onClick={reload}>{t('서버 설정 다시 불러오기')}</button>
        </div>
        <p className="field-help">{t('기본값 복원도 게시 전까지는 실제 사이트에 반영되지 않습니다.')}</p>
      </fieldset>
      <section className="homepage-preview-tools" aria-label={t('홈페이지 미리보기')}>
        <h2>{t('미리보기')}</h2>
        <div className="editor-view-toggle">
          <button type="button" aria-pressed={previewLanguage === 'ko'} onClick={() => setPreviewLanguage('ko')}>한국어</button>
          <button type="button" aria-pressed={previewLanguage === 'en'} onClick={() => setPreviewLanguage('en')}>English</button>
          <button type="button" aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>PC · 1280px</button>
          <button type="button" aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}>{t('모바일')} · 375px</button>
        </div>
        <p className="field-help">{t('미리보기의 언어와 화면 크기는 이 편집 화면에만 적용됩니다.')}</p>
        <HomepagePreview settings={form} language={previewLanguage} device={device} />
        <label className="homepage-review"><input type="checkbox" checked={reviewed} disabled={busy} onChange={(event) => setReviewed(event.target.checked)} />{t('미리보기를 확인했습니다.')}</label>
        <button className="admin-primary" disabled={busy || !reviewed} onClick={() => void save(true)}>{t(busy ? '처리 중…' : '홈페이지 게시')}</button>
      </section>
    </>}
  </div>
}
