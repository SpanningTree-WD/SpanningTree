import { useAdminEditor } from './useAdminEditor'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MarkdownRenderer } from '../../components/content/MarkdownRenderer'
import type { Mathematics } from '../../models/mathematics'
import { mathematicsRepository } from '../../repositories/adminRepositories'
import { csv, EditorActions, Field, join, TextAreaField, type Errors } from './EditorFields'

const empty: Mathematics = {
  id: '',
  title: '',
  slug: '',
  authors: [],
  field: '',
  type: '',
  year: new Date().getFullYear(),
  summary: '',
  tags: [],
  relatedActivities: [],
  relatedPublications: [],
  relatedMathematics: [],
  status: 'draft',
  content:
    '# New mathematics article\n\nWrite the article in Markdown. Inline math: \\(G\\).\n\n$$\nn_p \\equiv 1 \\pmod p\n$$',
  coverImage: { alt: '', variant: 'blue' },
  attachments: [],
  createdAt: '',
  updatedAt: '',
}
function validateExtra(form: Mathematics): Errors {
  const errors: Errors = {}
  if (!Number.isInteger(form.year) || form.year < 1900 || form.year > 9999)
    errors.year = 'Enter a valid year.'
  if (!form.field.trim()) errors.field = 'Enter a mathematics field.'
  return errors
}
export function MathematicsEditorPage() {
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
  } = useAdminEditor(mathematicsRepository, empty, '/admin/mathematics', validateExtra)
  if (loadError)
    return (
      <div className="admin-page" role="alert">
        <p>{loadError}</p>
        <button onClick={retryLoad}>다시 불러오기</button>
        <p>
          <Link to="/admin/mathematics">← mathematics</Link>
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
    <Editor title={form.id ? 'Edit Mathematics' : 'New Mathematics'} status={form.status}>
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
            label="Authors (comma separated)"
            name="authors"
            value={join(form.authors)}
            onChange={(v) => set('authors', csv(v))}
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
            label="Field"
            name="field"
            value={form.field}
            error={errors.field}
            required
            onChange={(v) => set('field', v)}
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
        <div className="admin-form-grid">
          <Field
            label="Tags (comma separated)"
            name="tags"
            value={join(form.tags)}
            onChange={(v) => set('tags', csv(v))}
          />
          <Field
            label="Related Activity IDs"
            name="activities"
            value={join(form.relatedActivities)}
            onChange={(v) => set('relatedActivities', csv(v))}
          />
          <Field
            label="Related Publication IDs"
            name="publications"
            value={join(form.relatedPublications)}
            onChange={(v) => set('relatedPublications', csv(v))}
          />
          <Field
            label="Cover image alt text (placeholder)"
            name="cover-alt"
            value={form.coverImage.alt}
            onChange={(v) => set('coverImage', { ...form.coverImage, alt: v })}
          />
        </div>
        <section className="markdown-editor">
          <div>
            <TextAreaField
              label="Markdown content"
              name="content"
              rows={24}
              value={form.content}
              onChange={(v) => set('content', v)}
            />
            <p className="field-help">
              Supports headings, paragraphs, lists, links, fenced code, inline math with \(…\), and
              display math with $$…$$. Stored HTML is sanitized.
            </p>
          </div>
          <div className="markdown-preview">
            <span className="field-label">Preview</span>
            <MarkdownRenderer content={form.content} />
          </div>
        </section>
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
        <Link className="back-link" to="/admin/mathematics">
          ← Mathematics
        </Link>
        <div className="editor-title">
          <div>
            <p className="eyebrow">Mathematics editor</p>
            <h1>{title}</h1>
          </div>
          <span className={`status status-${status}`}>{status}</span>
        </div>
      </header>
      <form onSubmit={(e) => e.preventDefault()}>{children}</form>
    </div>
  )
}
