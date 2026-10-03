import { useT } from '../../i18n/LanguageProvider'
import { Link } from 'react-router-dom'
import type { RelatedContent as Related } from '../../repositories/contracts'
export function RelatedContent({content}:{content:Related}){
  const t = useT()
const empty=!content.activities.length&&!content.mathematics.length&&!content.publications.length;return <section className="related-content"><p className="eyebrow">{t("Connections")}</p><h2>{t("Related Content")}</h2>{empty?<p className="muted-copy">{t("연결된 공개 기록이 없습니다.")}</p>:<div className="related-grid">{content.activities.map(item=><Link key={item.id} to={`/activities/${item.slug}`}><small>{t("Activity")}</small><strong>{item.title}</strong></Link>)}{content.mathematics.map(item=><Link key={item.id} to={`/mathematics/${item.slug}`}><small>{t("Mathematics")}</small><strong>{item.title}</strong></Link>)}{content.publications.map(item=><Link key={item.id} to={`/publications/${item.slug}`}><small>{t("Publication")}</small><strong>{item.title}</strong></Link>)}</div>}</section>}
