import type { Language } from '../../i18n/locale'
import { homepageCopy, type HomepageSettings } from '../../models/homepage'
import './HomeHero.css'

export function HomeHero({ settings, language, preview = false }: { settings: HomepageSettings; language: Language; preview?: boolean }) {
  const copy = homepageCopy(settings, language)
  const label = language === 'ko' ? '동아리 소개' : 'About Spanning Tree'
  // Keep custom homepage titles functional in the admin editor.
  // The default identity uses the approved SVG without changing its geometry.
  const useBrandLogo = copy.title === 'Spanning Tree'

  return <section className={'hero homepage-hero font-' + settings.hero.font} lang={language}>
    <div className="hero-grid">
      <div className="homepage-intro">
        {useBrandLogo
          ? <><h1 className="visually-hidden">{copy.title}</h1>
            <img className="homepage-hero-logo" src="/spanning-tree-hero-logo.svg" width="1100" height="580" alt="Spanning Tree" /></>
          : <h1>{copy.title}</h1>}
        <p>{copy.description}</p>
        {preview ? <span className="button-link">{label} <span aria-hidden="true">→</span></span>
          : <a className="button-link" href="/about">{label} <span aria-hidden="true">→</span></a>}
      </div>
    </div>
  </section>
}
