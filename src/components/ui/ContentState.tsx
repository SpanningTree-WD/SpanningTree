import { useT } from '../../i18n/LanguageProvider'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
export function ContentState({title,children}:{title:string;children:ReactNode}){
  const t = useT()
return <section className="content-state" role="status"><h2>{t(title)}</h2><p>{typeof children === 'string' ? t(children) : children}</p></section>}
export function MissingContent(){
  const t = useT()
return <section className="page-container detail-page content-state"><p className="eyebrow">{t("Archive")}</p><h1>{t("Record Not Found")}</h1><p>{t("요청한 공개 기록을 찾을 수 없습니다.")}</p><Link className="article-link" to="/">{t("Return to Main →")}</Link></section>}
