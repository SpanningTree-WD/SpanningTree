import { useAdminEditor } from './useAdminEditor'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Publication } from '../../models/publication'
import { publicationRepository } from '../../repositories/adminRepositories'
import { csv, EditorActions, Field, join, TextAreaField, type Errors } from './EditorFields'

const empty: Publication = {
  id: '',
  title: '',
  slug: '',
  year: new Date().getFullYear(),
  type: '',
  summary: '',
  description: '',
  authors: [],
  editors: [],
  coverImage: { alt: '', variant: 'light' },
  relatedActivities: [],
  relatedMathematics: [],
  status: 'draft',
  createdAt: '',
  updatedAt: '',
}
function validateExtra(form: Publication): Errors {
  const errors: Errors = {}
  if (!Number.isInteger(form.year) || form.year < 1900 || form.year > 9999)
    errors.year = 'Enter a valid year.'
  return errors
}
export function PublicationEditorPage() {
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
  } = useAdminEditor(publicationRepository, empty, '/admin/publications', validateExtra)
  if (loadError)
    return (
      <div className="admin-page" role="alert">
        <p>{loadError}</p>
        <button onClick={retryLoad}>다시 불러오기</button>
        <p>
          <Link to="/admin/publications">← publications</Link>
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
    <Editor title={form.id ? 'Edit Publication' : 'New Publication'} status={form.status}>
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
            label="Year"
            name="year"
            type="number"
            value={form.year}
            error={errors.year}
            required
            onChange={(v) => set('year', Number(v))}
          />
          <Field
            label="Type"
            name="type"
            value={form.type}
            error={errors.type}
            required
            onChange={(v) => set('type', v)}
          />
          <Field
            label="Authors (comma separated)"
            name="authors"
            value={join(form.authors)}
            onChange={(v) => set('authors', csv(v))}
          />
          <Field
            label="Editors (comma separated)"
            name="editors"
            value={join(form.editors)}
            onChange={(v) => set('editors', csv(v))}
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
            label="Cover image alt text (placeholder)"
            name="cover-alt"
            value={form.coverImage.alt}
            onChange={(v) => set('coverImage', { ...form.coverImage, alt: v })}
          />
          <Field
            label="Related Activity IDs"
            name="activities"
            value={join(form.relatedActivities)}
            onChange={(v) => set('relatedActivities', csv(v))}
          />
          <Field
            label="Related Mathematics IDs"
            name="mathematics"
            value={join(form.relatedMathematics)}
            onChange={(v) => set('relatedMathematics', csv(v))}
          />
          <Field
            label="PDF file name (placeholder)"
            name="pdf-name"
            value={form.pdf?.fileName ?? ''}
            onChange={(v) =>
              set(
                'pdf',
                v
                  ? {
                      label: form.pdf?.label ?? 'PDF',
                      fileName: v,
                      mediaType: 'application/pdf',
                      sizeLabel: form.pdf?.sizeLabel ?? 'PDF · placeholder',
                    }
                  : undefined
              )
            }
          />
        </div>
        <p className="media-placeholder">
          이미지와 PDF 업로드는 아직 지원하지 않습니다. 현재는 파일 설명만 저장합니다.
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
        <Link className="back-link" to="/admin/publications">
          ← Publications
        </Link>
        <div className="editor-title">
          <div>
            <p className="eyebrow">Publication editor</p>
            <h1>{title}</h1>
          </div>
          <span className={`status status-${status}`}>{status}</span>
        </div>
      </header>
      <form onSubmit={(e) => e.preventDefault()}>{children}</form>
    </div>
  )
}
