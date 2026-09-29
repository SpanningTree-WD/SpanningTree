import { useAdminEditor } from './useAdminEditor'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Activity } from '../../models/activity'
import { activityRepository } from '../../repositories/adminRepositories'
import { csv, EditorActions, Field, join, TextAreaField, type Errors } from './EditorFields'

const empty: Activity = {
  id: '',
  title: '',
  slug: '',
  date: '',
  type: '',
  summary: '',
  description: '',
  tags: [],
  featured: false,
  coverImage: { alt: '', variant: 'a' },
  gallery: [],
  relatedMathematics: [],
  relatedPublications: [],
  status: 'draft',
  createdAt: '',
  updatedAt: '',
}
function validateExtra(form: Activity): Errors {
  const errors: Errors = {}
  if (!form.date) errors.date = 'Choose a date.'
  return errors
}
export function ActivityEditorPage() {
  const {
    form,
    set,
    errors,
    saving,
    loading,
    loadError,
    operationError,
    notice,
    retryLoad,
    save,
    publish,
    unpublish,
  } = useAdminEditor(activityRepository, empty, '/admin/activities', validateExtra)
  if (loadError)
    return (
      <div className="admin-page" role="alert">
        <p>{loadError}</p>
        <button onClick={retryLoad}>다시 불러오기</button>
        <p>
          <Link to="/admin/activities">← activities</Link>
        </p>
      </div>
    )
  if (loading)
    return (
      <div className="admin-page" role="status">
        자료를 불러오고 있습니다.
      </div>
    )
  return (
    <Editor title={form.id ? 'Edit Activity' : 'New Activity'} status={form.status}>
      {operationError && (
        <p className="field-error" role="alert">
          {operationError}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <fieldset className="admin-editor-fields" disabled={saving}>
        <div className="admin-form-grid">
          <Field
            label="Title"
            name="title"
            value={form.title}
            error={errors.title}
            required
            onChange={(v) => set('title', v)}
          />
          <Field
            label="Slug"
            name="slug"
            value={form.slug}
            error={errors.slug}
            required
            onChange={(v) => set('slug', v)}
          />
          <Field
            label="Date"
            name="date"
            type="date"
            value={form.date}
            error={errors.date}
            required
            onChange={(v) => set('date', v)}
          />
          <Field
            label="Type"
            name="type"
            value={form.type}
            error={errors.type}
            required
            onChange={(v) => set('type', v)}
          />
        </div>
        <TextAreaField
          label="Summary"
          name="summary"
          value={form.summary}
          onChange={(v) => set('summary', v)}
        />
        <TextAreaField
          label="Description"
          name="description"
          rows={8}
          value={form.description}
          onChange={(v) => set('description', v)}
        />
        <div className="admin-form-grid">
          <Field
            label="Tags (comma separated)"
            name="tags"
            value={join(form.tags)}
            onChange={(v) => set('tags', csv(v))}
          />
          <Field
            label="Cover image alt text (placeholder)"
            name="cover-alt"
            value={form.coverImage.alt}
            onChange={(v) => set('coverImage', { ...form.coverImage, alt: v })}
          />
          <Field
            label="Related Mathematics IDs"
            name="related-mathematics"
            value={join(form.relatedMathematics)}
            onChange={(v) => set('relatedMathematics', csv(v))}
          />
          <Field
            label="Related Publication IDs"
            name="related-publications"
            value={join(form.relatedPublications)}
            onChange={(v) => set('relatedPublications', csv(v))}
          />
        </div>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => set('featured', e.target.checked)}
          />{' '}
          Feature on public home page
        </label>
        <p className="media-placeholder">
          이미지 업로드는 아직 지원하지 않습니다. 현재는 대체 텍스트만 저장합니다.
        </p>
        <EditorActions
          status={form.status}
          saving={saving}
          onSave={() => void save()}
          onPublish={() => void publish()}
          onUnpublish={() => void unpublish()}
        />
      </fieldset>
    </Editor>
  )
}
function Editor({
  title,
  status,
  children,
}: {
  title: string
  status: string
  children: ReactNode
}) {
  return (
    <div className="admin-page editor-page">
      <header className="admin-page-head">
        <Link className="back-link" to="/admin/activities">
          ← Activities
        </Link>
        <div className="editor-title">
          <div>
            <p className="eyebrow">Activity editor</p>
            <h1>{title}</h1>
          </div>
          <span className={`status status-${status}`}>{status}</span>
        </div>
      </header>
      <form onSubmit={(e) => e.preventDefault()}>{children}</form>
    </div>
  )
}
