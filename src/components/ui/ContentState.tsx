import { Link } from 'react-router-dom'
export function ContentState({title,children}:{title:string;children:string}){return <section className="content-state" role="status"><h2>{title}</h2><p>{children}</p></section>}
export function MissingContent(){return <section className="page-container detail-page content-state"><p className="eyebrow">Archive</p><h1>Record Not Found</h1><p>요청한 공개 기록을 찾을 수 없습니다.</p><Link className="article-link" to="/">Return to Main →</Link></section>}
