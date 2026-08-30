import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { activityRepository, mathematicsRepository, publicationRepository } from '../../repositories/local/repositories'

type Counts = { published: number; draft: number }
const count = <T extends { status: string }>(records: T[]): Counts => ({ published: records.filter(r => r.status === 'published').length, draft: records.filter(r => r.status === 'draft').length })
export function AdminDashboard() {
  const [counts, setCounts] = useState<Record<string, Counts>>({})
  useEffect(() => { Promise.all([activityRepository.listAll(), mathematicsRepository.listAll(), publicationRepository.listAll()]).then(([a,m,p]) => setCounts({Activities:count(a),Mathematics:count(m),Publications:count(p)})) }, [])
  return <div className="admin-page"><header className="admin-page-head"><p className="eyebrow">Management interface</p><h1>Dashboard</h1><p>Create, review, and publish the club’s archive records locally.</p></header><div className="admin-dashboard">{['Activities','Mathematics','Publications'].map(name => { const path=name.toLowerCase(); const value=counts[name]??{published:0,draft:0}; return <section key={name}><h2>{name}</h2><dl><div><dt>Published</dt><dd>{value.published}</dd></div><div><dt>Draft</dt><dd>{value.draft}</dd></div></dl><div className="admin-card-actions"><Link to={`/admin/${path}`}>Manage</Link><Link className="admin-primary" to={`/admin/${path}/new`}>New</Link></div></section>})}</div><div className="admin-notice"><strong>Prototype only.</strong> Changes are stored in this browser’s local storage. Firebase and real authentication are not connected.</div></div>
}
