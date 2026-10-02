import { useT } from '../../i18n/LanguageProvider'
import { usePageMetadata } from '../shared/usePageMetadata'
import { Link } from 'react-router-dom'
import { club } from '../../content/club'

const features = [
  ['∫', '대학수학 학습', '해석학·대수학·위상수학·이산수학 등을 공부합니다.'],
  ['✎', '강연과 포럼', '부원들의 발표와 강연, 포럼을 진행합니다.'],
  ['◇', '교류 활동', '다른 학교의 수학 동아리와 교류합니다.'],
  ['↗', '자료와 출판', '강의 노트와 수학 자료, 출판물을 정리합니다.'],
]
const archives = [
  ['/activities', '활동', '강연, 포럼, 교류 및 프로젝트 기록'],
  ['/mathematics', '수학 자료', '강의 노트, 문제 모음, 발표 자료'],
  ['/publications', '출판물', '책, 노트, 보고서 등 동아리 출판물'],
]


export function AboutPage() {
  const t = useT()

  usePageMetadata()
  return (
    <div className="page-container">
      <section className="about-hero">
        <div>
          <h1>{t("About Spanning Tree")}</h1>
          <p>
            {t('스패닝트리는 서울과학고등학교 수학 동아리입니다. 대학수학을 공부하며 강연·포럼·교류 활동을 진행합니다.')}
          </p>
        </div>
        <div
          className="about-photo"
          role="img"
          aria-label={t("나무가 있는 풍경을 표현한 추상 이미지")}
        />
      </section>
      <div className="about-grid">
        <section className="about-panel">
          <h2>{t("What We Do")}</h2>
          <div className="feature-grid">
            {features.map(([icon, title, copy]) => (
              <article className="feature" key={t(title)}>
                <div className="feature-icon" aria-hidden="true">
                  {icon}
                </div>
                <strong>{title}</strong>
                <p>{t(copy)}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="about-panel">
          <h2>{t("Archive")}</h2>
          <div className="timeline">
            {archives.map(([to, label, copy]) => (
              <div className="timeline-row" key={to}>
                <strong>
                  <Link to={to}>{t(label)}</Link>
                </strong>
                <span>{t(copy)}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="about-panel">
          <h2>{t("Contact")}</h2>
          <p className="contact-copy">{t("활동·교류 등 동아리 관련 문의는 아래 이메일로 보내 주세요.")}</p>
          <a className="contact-link" href={`mailto:${club.email}`}>
            {club.email}
          </a>
        </section>
      </div>
    </div>
  )
}
