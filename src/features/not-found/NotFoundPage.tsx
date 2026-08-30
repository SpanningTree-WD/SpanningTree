import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="page-container page-heading placeholder-page">
      <p className="eyebrow">404</p>
      <h1>Page Not Found</h1>
      <p>요청하신 페이지를 찾을 수 없습니다.</p>
      <Link className="button-link" to="/">Return to Main <span aria-hidden="true">→</span></Link>
    </section>
  )
}
