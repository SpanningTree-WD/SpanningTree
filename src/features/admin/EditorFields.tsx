import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

export type Errors = Record<string, string>
type FieldProps = {
  label: string
  name: string
  value: string | number
  error?: string
  onChange: (value: string) => void
  required?: boolean
}
export type Choice = readonly [value: string, label: string]

export function Field({
  label,
  name,
  value,
  error,
  onChange,
  type = 'text',
  required = false,
}: FieldProps & { type?: string }) {
  const id = `field-${name}`
  return (
    <label className="admin-field" htmlFor={id}>
      <span>
        {label}
        {required && <em>필수</em>}
      </span>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <small className="field-error" id={`${id}-error`}>
          {error}
        </small>
      )}
    </label>
  )
}

export function SelectField({
  label,
  name,
  value,
  error,
  onChange,
  required = false,
  options,
}: FieldProps & { options: readonly Choice[] }) {
  const id = `field-${name}`
  return (
    <label className="admin-field" htmlFor={id}>
      <span>
        {label}
        {required && <em>필수</em>}
      </span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        <option value="">선택해 주세요</option>
        {value && !options.some(([key]) => key === value) && (
          <option value={value}>{value} (기존 분류)</option>
        )}
        {options.map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
      {error && (
        <small className="field-error" id={`${id}-error`}>
          {error}
        </small>
      )}
    </label>
  )
}

export function TextAreaField({
  label,
  name,
  value,
  error,
  onChange,
  rows = 8,
}: FieldProps & { rows?: number }) {
  const id = `field-${name}`
  return (
    <label className="admin-field" htmlFor={id}>
      <span>{label}</span>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <small className="field-error" id={`${id}-error`}>
          {error}
        </small>
      )}
    </label>
  )
}

const splitNames = (text: string) =>
  text
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
export function NamesField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string[]
  onChange: (value: string[]) => void
}) {
  const [text, setText] = useState(value.join(', '))
  // Keep the comma being typed while still following a reloaded or restored record.
  useEffect(() => {
    setText((current) =>
      JSON.stringify(splitNames(current)) === JSON.stringify(value) ? current : value.join(', ')
    )
  }, [value])
  return (
    <Field
      label={`${label} (여러 명은 쉼표로 구분)`}
      name="authors"
      value={text}
      onChange={(next) => {
        setText(next)
        onChange(splitNames(next))
      }}
    />
  )
}

export function EditorFrame({
  title,
  section,
  path,
  status,
  children,
}: {
  title: string
  section: string
  path: string
  status: 'draft' | 'published'
  children: ReactNode
}) {
  return (
    <div className="admin-page editor-page">
      <header className="admin-page-head">
        <Link className="back-link" to={path}>
          ← {section} 목록
        </Link>
        <div className="editor-title">
          <h1>{title}</h1>
          <span className={`status status-${status}`}>
            {status === 'published' ? '공개' : '비공개'}
          </span>
        </div>
      </header>
      <form onSubmit={(event) => event.preventDefault()}>{children}</form>
    </div>
  )
}

export function EditorActions({
  status,
  saving,
  onSave,
  onPublish,
  onUnpublish,
}: {
  status: 'draft' | 'published'
  saving: boolean
  onSave: () => void
  onPublish: () => void
  onUnpublish: () => void
}) {
  return (
    <div className="editor-actions">
      <button type="button" onClick={onSave} disabled={saving}>
        {saving ? '처리 중…' : status === 'draft' ? '임시 저장' : '변경사항 저장'}
      </button>
      {status === 'draft' ? (
        <button className="admin-primary" type="button" onClick={onPublish} disabled={saving}>
          공개하기
        </button>
      ) : (
        <button className="admin-danger" type="button" onClick={onUnpublish} disabled={saving}>
          비공개로 전환
        </button>
      )}
    </div>
  )
}
