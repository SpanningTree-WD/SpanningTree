import { Link } from 'react-router-dom'
import { MarkdownRenderer } from '../../components/content/MarkdownRenderer'
import type { Mathematics } from '../../models/mathematics'
import { mathematicsRepository } from '../../repositories/adminRepositories'
import {
  EditorActions,
  EditorFrame,
  Field,
  NamesField,
  SelectField,
  TextAreaField,
  type Errors,
} from './EditorFields'
import { mathematicsFields, mathematicsTypes } from './editorOptions'
import { useAdminEditor } from './useAdminEditor'
import { UploadPanel } from './UploadPanel'

const empty: Mathematics = {
  id: '',
  title: '',
  slug: '',
  authors: [],
  field: '',
  type: '',
  year: new Date().getFullYear(),
  summary: '',
  content: '',
  tags: [],
  relatedActivities: [],
  relatedPublications: [],
  relatedMathematics: [],
  status: 'draft',
  coverImage: { alt: '', variant: 'blue' },
  attachments: [],
  createdAt: '',
  updatedAt: '',
}
function validateExtra(form: Mathematics): Errors {
  const errors: Errors = {}
  if (!Number.isInteger(form.year) || form.year < 1900 || form.year > 9999)
    errors.year = '올바른 연도를 입력해 주세요.'
  if (!form.field.trim()) errors.field = '수학 분야를 선택해 주세요.'
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
          <Link to="/admin/mathematics">← 수학 자료 목록</Link>
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
    <EditorFrame
      title={form.id ? '수학 자료 수정' : '새 수학 자료 작성'}
      section="수학 자료"
      path="/admin/mathematics"
      status={form.status}
    >
      {operationError && (
        <p className="field-error" role="alert">
          {operationError}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <fieldset className="admin-editor-fields" disabled={saving}>
        <Field
          label="제목"
          name="title"
          value={form.title}
          error={errors.title}
          required
          onChange={(v) => set('title', v)}
        />
        <div className="admin-form-grid">
          <NamesField label="작성자" value={form.authors} onChange={(v) => set('authors', v)} />
          <Field
            label="작성 연도"
            name="year"
            type="number"
            value={form.year}
            error={errors.year}
            required
            onChange={(v) => set('year', Number(v))}
          />
          <SelectField
            label="수학 분야"
            name="field"
            value={form.field}
            options={mathematicsFields}
            error={errors.field}
            required
            onChange={(v) => set('field', v)}
          />
          <SelectField
            label="자료 유형"
            name="type"
            value={form.type}
            options={mathematicsTypes}
            error={errors.type}
            required
            onChange={(v) => set('type', v)}
          />
        </div>
        <section className="markdown-editor">
          <div>
            <TextAreaField
              label="본문"
              name="content"
              rows={16}
              value={form.content}
              onChange={(v) => set('content', v)}
            />
            <p className="field-help">
              마크다운으로 작성할 수 있습니다. 수식은 \(…\), 독립된 수식은 $$…$$로 감싸 주세요.
            </p>
          </div>
          <div className="markdown-preview">
            <span className="field-label">미리보기</span>
            <MarkdownRenderer content={form.content} />
          </div>
        </section>
        <UploadPanel
          collection="mathematics"
          recordId={form.id}
          disabled={saving}
          image={form.coverImage}
          files={form.attachments}
          onImage={(url) => set('coverImage', { ...form.coverImage, url })}
          onRemovePdf={(url) =>
            set(
              'attachments',
              form.attachments.filter((file) => file.url !== url)
            )
          }
          onPdf={(file) =>
            set('attachments', [...form.attachments.filter((item) => item.url !== file.url), file])
          }
        />
        <EditorActions
          status={form.status}
          saving={saving}
          onSave={() => void save()}
          onPublish={() => void publish()}
          onUnpublish={() => void unpublish()}
        />
      </fieldset>
    </EditorFrame>
  )
}
