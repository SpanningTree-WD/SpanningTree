import { Link } from 'react-router-dom'

type PlaceholderPageProps = { title: string; description: string; isHome?: boolean }

export function PlaceholderPage({ title, description, isHome = false }: PlaceholderPageProps) {
  if (isHome) {
    return (
      <section className="placeholder-page placeholder-page--home">
        <div className="page-container placeholder-content">
          <p className="eyebrow">SPANNING TREE</p>
          <h1>{title}</h1>
          <p>함께 탐구하고, 함께 성장하며,<br />더욱 멀리 뻗어가는 Spanning Tree</p>
          <Link className="button-link" to="/about">About Spanning Tree <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    )
  }

  return (
    <section className="page-container page-heading placeholder-page">
      <h1>{title}</h1>
      <p>{description}</p>
      <div className="stage-note" role="note">전체 페이지 콘텐츠는 Stage 2에서 이전됩니다.</div>
    </section>
  )
}
