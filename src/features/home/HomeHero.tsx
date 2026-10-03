import type { Language } from '../../i18n/locale'
import { homepageCopy, type HomepageSettings } from '../../models/homepage'
import { TreeArtwork } from './TreeArtwork'
import './HomeHero.css'
export function HomeHero({ settings, language, preview = false }: { settings: HomepageSettings; language: Language; preview?: boolean }) {
  const copy = homepageCopy(settings, language)
  const label = language === 'ko' ? '동아리 소개' : 'About Spanning Tree'
  return <section className={'hero homepage-hero font-' + settings.hero.font} lang={language}>
    <div className="hero-grid">
      <div className="homepage-intro">
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
        {preview ? <span className="button-link">{label} <span aria-hidden="true">→</span></span>
          : <a className="button-link" href="/about">{label} <span aria-hidden="true">→</span></a>}
      </div>
      <TreeArtwork description={language === 'ko' ? '가지와 점으로 구성한 나무 그림' : 'A tree drawn with branches and points'} />
    </div>
  </section>
}
