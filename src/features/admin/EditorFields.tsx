import { useT } from '../../i18n/LanguageProvider'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Choice } from '../../models/contentOptions'

export type Errors = Record<string, string>
type FieldProps = {
  label: string
  name: string
  value: string | number
  error?: string
  onChange: (value: string) => void
  required?: boolean
}

export function Field({
  label,
  name,
  value,
  error,
  onChange,
  type = 'text',
  required = false,
}: FieldProps & { type?: string }) {
  const t = useT()

  const id = `field-${name}`
  return (
    <label className="admin-field" htmlFor={id}>
      <span>
        {t(label)}
        {required && <em>{t("필수")}</em>}
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
          {t(error)}
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
  const t = useT()

  const id = `field-${name}`
  return (
    <label className="admin-field" htmlFor={id}>
      <span>
        {t(label)}
        {required && <em>{t("필수")}</em>}
      </span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        <option value="">{t("선택해 주세요")}</option>
        {value && !options.some(([key]) => key === value) && (
          <option value={value}>{value} ({t('기존 분류')})</option>
        )}
        {options.map(([key, text]) => (
          <option key={key} value={key}>
            {t(text)}
          </option>
        ))}
      </select>
      {error && (
        <small className="field-error" id={`${id}-error`}>
          {t(error)}
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
  const t = useT()

  const id = `field-${name}`
  return (
    <label className="admin-field" htmlFor={id}>
      <span>{t(label)}</span>
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
          {t(error)}
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
  const t = useT()

  const [text, setText] = useState(value.join(', '))
  // Keep the comma being typed while still following a reloaded or restored record.
  useEffect(() => {
    setText((current) =>
      JSON.stringify(splitNames(current)) === JSON.stringify(value) ? current : value.join(', ')
    )
  }, [value])
  return (
    <Field
      label={`${t(label)} (여러 명은 쉼표로 구분)`}
      name="authors"
      value={t(text)}
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
  onBack,
  saving,
}: {
  title: string
  section: string
  path: string
  status: 'draft' | 'published'
  children: ReactNode
  onBack?: () => void
  saving?: boolean
}) {
  const t = useT()

  return (
    <div className="admin-page editor-page">
      <header className="admin-page-head">
        <Link className="back-link" to={path} aria-disabled={saving} onClick={(event) => {
          if (onBack || saving) {
            event.preventDefault()
            if (!saving) onBack?.()
          }
        }}>
          {t('← {section} 목록', { section: t(section) })}
        </Link>
        <div className="editor-title">
          <h1>{t(title)}</h1>
          <span className={`status status-${status}`}>
            {status === 'published' ? t('공개') : t('비공개')}
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
  onCancel,
}: {
  status: 'draft' | 'published'
  saving: boolean
  onSave: () => void
  onPublish: () => void
  onUnpublish: () => void
  onCancel?: () => void
}) {
  const t = useT()

  return (
    <div className="editor-actions">
      {onCancel && <button type="button" onClick={onCancel} disabled={saving}>{t("작성 취소")}</button>}
      <button type="button" onClick={onSave} disabled={saving}>
        {saving ? t('처리 중…') : status === 'draft' ? t('임시 저장') : t('변경사항 저장')}
      </button>
      {status === 'draft' ? (
        <button className="admin-primary" type="button" onClick={onPublish} disabled={saving}>{t("공개하기")}</button>
      ) : (
        <button className="admin-danger" type="button" onClick={onUnpublish} disabled={saving}>{t("비공개로 전환")}</button>
      )}
    </div>
  )
}
