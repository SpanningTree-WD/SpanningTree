import { useState, type FormEvent } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { adminAccessService } from '../../services/admin-access/AdminAccessService'

function PasswordGate({ onGrant }: { onGrant: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  function submit(event: FormEvent) { event.preventDefault(); if (adminAccessService.grant(password)) onGrant(); else setError('That prototype password is not correct.') }
  return <main className="admin-gate"><form className="admin-gate-panel" onSubmit={submit}><p className="eyebrow">Local prototype</p><h1>Spanning Tree Admin</h1><p>This temporary gate is not authentication and provides no meaningful security. Do not use a real account password.</p><label>Prototype password<input autoFocus type="password" value={password} onChange={event => setPassword(event.target.value)} aria-describedby={error ? 'password-error' : undefined}/></label>{error && <p className="field-error" id="password-error">{error}</p>}<button className="admin-primary" type="submit">Enter admin</button></form></main>
}

export function AdminLayout() {
  const [admitted, setAdmitted] = useState(() => adminAccessService.hasAccess())
  const navigate = useNavigate()
  if (!admitted) return <PasswordGate onGrant={() => setAdmitted(true)}/>
  function lock() { adminAccessService.clear(); setAdmitted(false); navigate('/admin') }
  return <div className="admin-shell"><aside className="admin-sidebar"><NavLink className="admin-brand" to="/admin">Spanning Tree <span>ADMIN</span></NavLink><nav aria-label="Admin navigation"><NavLink end to="/admin">Dashboard</NavLink><NavLink to="/admin/activities">Activities</NavLink><NavLink to="/admin/mathematics">Mathematics</NavLink><NavLink to="/admin/publications">Publications</NavLink></nav><button className="admin-lock" type="button" onClick={lock}>Lock admin</button><p className="admin-security-note">Local workflow prototype<br/>No real authentication</p></aside><main className="admin-main"><Outlet/></main></div>
}
