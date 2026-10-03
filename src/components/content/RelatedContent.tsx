import { useT } from '../../i18n/LanguageProvider'
import { Link } from 'react-router-dom'
import type { RelatedContent as Related } from '../../repositories/contracts'
export function RelatedContent({ content }: { content: Related }) {
  const t = useT()
  const groups = [
    { title: 'Related Activities', path: 'activities', items: content.activities },
    { title: 'Related Mathematics', path: 'mathematics', items: content.mathematics },
    { title: 'Related Publications', path: 'publications', items: content.publications },
  ].filter(group => group.items.length)
  if (!groups.length) return null
  return <div className="related-content">{groups.map(group => <section key={group.path}><h2>{t(group.title)}</h2><div className="related-grid">
    {group.items.map(item => <Link key={item.id} to={'/' + group.path + '/' + item.slug}><strong>{item.title}</strong></Link>)}
  </div></section>)}</div>
}
