import type { ReactNode } from 'react'

export const csv = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean)
export const join = (value: string[]) => value.join(', ')
export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export type Errors = Record<string, string>

export function Field({ label, name, value, error, onChange, type='text', required=false, children }: { label:string; name:string; value:string|number; error?:string; onChange:(value:string)=>void; type?:string; required?:boolean; children?:ReactNode }) {
  const id=`field-${name}`
  return <label className="admin-field" htmlFor={id}><span>{label}{required&&<em>Required</em>}</span>{children??<input id={id} name={name} type={type} value={value} onChange={event=>onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error?`${id}-error`:undefined}/>} {error&&<small className="field-error" id={`${id}-error`}>{error}</small>}</label>
}
export function TextAreaField({ label,name,value,error,onChange,rows=5,required=false }: {label:string;name:string;value:string;error?:string;onChange:(value:string)=>void;rows?:number;required?:boolean}) { const id=`field-${name}`; return <label className="admin-field" htmlFor={id}><span>{label}{required&&<em>Required</em>}</span><textarea id={id} rows={rows} value={value} onChange={event=>onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error?`${id}-error`:undefined}/>{error&&<small className="field-error" id={`${id}-error`}>{error}</small>}</label> }
export function EditorActions({ status, saving, onSave, onPublish, onUnpublish }: { status:'draft'|'published';saving:boolean;onSave:()=>void;onPublish:()=>void;onUnpublish:()=>void }) { return <div className="editor-actions"><button type="button" onClick={onSave} disabled={saving}>Save {status==='draft'?'Draft':'Changes'}</button>{status==='draft'?<button className="admin-primary" type="button" onClick={onPublish} disabled={saving}>Publish</button>:<button className="admin-danger" type="button" onClick={onUnpublish} disabled={saving}>Unpublish</button>}</div> }
