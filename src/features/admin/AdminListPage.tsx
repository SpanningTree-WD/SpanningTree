import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AdminRepository } from '../../repositories/contracts'
import { activityRepository, mathematicsRepository, publicationRepository } from '../../repositories/local/repositories'

type Item = { id: string; title: string; status: 'draft'|'published'; updatedAt: string }
const definitions = { activities: { title:'Activities', repository:activityRepository as AdminRepository<Item> }, mathematics:{ title:'Mathematics', repository:mathematicsRepository as AdminRepository<Item> }, publications:{ title:'Publications', repository:publicationRepository as AdminRepository<Item> } }
export function AdminListPage({ type }: { type: keyof typeof definitions }) {
  const {title,repository}=definitions[type]; const [records,setRecords]=useState<Item[]>([])
  const load=useCallback(()=>{repository.listAll().then(setRecords)},[repository]); useEffect(load,[load])
  async function toggle(record:Item){const verb=record.status==='published'?'unpublish':'publish';if(!window.confirm(`Are you sure you want to ${verb} “${record.title}”?`))return;await (record.status==='published'?repository.unpublish(record.id):repository.publish(record.id));load()}
  return <div className="admin-page"><header className="admin-page-head admin-page-head-row"><div><p className="eyebrow">Content management</p><h1>{title}</h1><p>{records.length} records, including drafts.</p></div><Link className="admin-primary" to={`/admin/${type}/new`}>New {title.slice(0,-1)}</Link></header><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Title</th><th>Status</th><th>Last updated</th><th>Actions</th></tr></thead><tbody>{records.map(record=><tr key={record.id}><td><strong>{record.title}</strong></td><td><span className={`status status-${record.status}`}>{record.status==='published'?'Published':'Draft'}</span></td><td>{new Date(record.updatedAt).toLocaleDateString()}</td><td className="table-actions"><Link to={`/admin/${type}/${record.id}/edit`}>Edit</Link><button type="button" onClick={()=>toggle(record)}>{record.status==='published'?'Unpublish':'Publish'}</button></td></tr>)}</tbody></table></div></div>
}
