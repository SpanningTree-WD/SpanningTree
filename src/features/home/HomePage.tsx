import { useT } from '../../i18n/LanguageProvider'
import { formatMathematicsFields } from '../../models/mathematicsFields'
import { usePageMetadata } from '../shared/usePageMetadata'
import { ContentImage } from '../../components/content/ContentImage'
import { Link } from 'react-router-dom'
import { ContentState } from '../../components/ui/ContentState'
import {
  activityRepository,
  mathematicsRepository,
  publicationRepository,
} from '../../repositories/publicRepositories'
import { useRepository } from '../shared/useRepository'
import { HomeHero } from './HomeHero'
import { useHomepage } from './useHomepage'
import { useLanguage } from '../../i18n/LanguageProvider'
function SectionHeading({ title, to }: { title: string; to: string }) {
  const t = useT()

  return (
    <div className="section-head">
      <h2>{t(title)}</h2>
      <Link className="small-link" to={to}>{t("View all →")}</Link>
    </div>
  )
}

export function HomePage() {
  const t = useT()

  const settings = useHomepage()
  const { language } = useLanguage()
  usePageMetadata()
  const { data, error } = useRepository(async () => {
    const [activities, mathematics, publications] = await Promise.all([
      activityRepository.listPublished({ featured: true, limit: 3 }),
      mathematicsRepository.listPublished({ limit: 3 }),
      publicationRepository.listPublished({ limit: 1 }),
    ])
    return {
      activities: activities.items,
      mathematics: mathematics.items,
      publication: publications.items[0],
    }
  }, [])
  return (
    <>
      <HomeHero settings={settings} language={language} />
      <div className="page-container home-sections">
        {error ? (
          <ContentState title={t("Archive unavailable")}>{t("최신 기록을 불러오지 못했습니다.")}</ContentState>
        ) : !data ? (
          <ContentState title={t("Loading archive")}>{t("최신 공개 기록을 불러오는 중입니다.")}</ContentState>
        ) : (
          <div className="home-grid">
            <section>
              <SectionHeading title={t("Featured Activities")} to="/activities" />
              <div className="activity-mini-grid">
                {data.activities.map((item) => (
                  <article className="mini-card" key={item.id}>
                    <Link to={`/activities/${item.slug}`}>
                      <ContentImage className="photo" media={item.coverImage} />
                      <div className="mini-meta">
                        <strong>{item.title}</strong>
                        <small>{item.date.replaceAll('-', '.')}</small>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            </section>
            <section>
              <SectionHeading title={t("Latest Mathematics")} to="/mathematics" />
              <div className="list-compact">
                {data.mathematics.map((item) => (
                  <article className="compact-item" key={item.id}>
                    <Link to={`/mathematics/${item.slug}`}>
                      <strong>{item.title}</strong>
                      <small>
                        {item.type} · {formatMathematicsFields(item)} · {item.year}
                      </small>
                    </Link>
                  </article>
                ))}
              </div>
            </section>
            <section>
              <SectionHeading title={t("Publications")} to="/publications" />
              {data.publication && (
                <Link className="publication-feature" to={`/publications/${data.publication.slug}`}>
                  <ContentImage
                    className="cover"
                    media={data.publication.coverImage}
                    title={data.publication.title}
                  />
                  <div>
                    <h3 className="publication-feature-title">{data.publication.title}</h3>
                    <div className="publication-feature-meta">{t("Spanning Tree Publications")}</div>
                    <div className="publication-feature-year">{data.publication.year}</div>
                  </div>
                </Link>
              )}
            </section>
          </div>
        )}
      </div>
    </>
  )
}
