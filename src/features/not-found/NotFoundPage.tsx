import { useT } from '../../i18n/LanguageProvider'
import { usePageMetadata } from '../shared/usePageMetadata'
import { Link } from 'react-router-dom'


export function NotFoundPage() {
  const t = useT()

  usePageMetadata({ title: '페이지를 찾을 수 없습니다', noindex: true })
  return (
    <section className="page-container page-heading placeholder-page">
      <p className="eyebrow">404</p>
      <h1>{t("Page Not Found")}</h1>
      <p>{t("요청하신 페이지를 찾을 수 없습니다.")}</p>
      <Link className="button-link" to="/">{t("Return to Main")}<span aria-hidden="true">→</span></Link>
    </section>
  )
}
