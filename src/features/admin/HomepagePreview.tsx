import { useMemo } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { HomepageSettings } from '../../models/homepage'
import type { Language } from '../../i18n/locale'
import { HomeHero } from '../home/HomeHero'
import tokens from '../../styles/tokens.css?raw'
import typography from '../../styles/typography.css?raw'
import globalStyles from '../../styles/global.css?raw'
import heroStyles from '../home/HomeHero.css?raw'
export function HomepagePreview({ settings, language, device }: {
  settings: HomepageSettings; language: Language; device: 'mobile' | 'desktop'
}) {
  const html = useMemo(() => '<!doctype html><html lang="' + language + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>' +
    tokens + typography + globalStyles + heroStyles + '</style></head><body>' +
    renderToStaticMarkup(<HomeHero settings={settings} language={language} preview />) + '</body></html>', [settings, language])
  return <div className="homepage-preview-scroll">
    <iframe title={'Homepage preview · ' + language + ' · ' + device} sandbox="" srcDoc={html}
      className="homepage-preview-frame" style={{ width: device === 'mobile' ? 375 : 1280 }} />
  </div>
}
