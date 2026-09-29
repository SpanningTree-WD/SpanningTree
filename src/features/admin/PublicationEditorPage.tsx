import { Link } from 'react-router-dom'
import type { Publication } from '../../models/publication'
import { publicationRepository } from '../../repositories/adminRepositories'
import {
  EditorActions,
  EditorFrame,
  Field,
  NamesField,
  SelectField,
  TextAreaField,
  type Errors,
} from './EditorFields'
import { publicationTypes } from './editorOptions'
import { useAdminEditor } from './useAdminEditor'

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
  return Number.isInteger(form.year) && form.year >= 1900 && form.year <= 9999
    ? {}
    : { year: '올바른 연도를 입력해 주세요.' }
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
          <Link to="/admin/publications">← 출판물 목록</Link>
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
      title={form.id ? '출판물 수정' : '새 출판물 작성'}
      section="출판물"
      path="/admin/publications"
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
        <NamesField label="저자" value={form.authors} onChange={(v) => set('authors', v)} />
        <div className="admin-form-grid">
          <Field
            label="발행 연도"
            name="year"
            type="number"
            value={form.year}
            error={errors.year}
            required
            onChange={(v) => set('year', Number(v))}
          />
          <SelectField
            label="출판물 유형"
            name="type"
            value={form.type}
            options={publicationTypes}
            error={errors.type}
            required
            onChange={(v) => set('type', v)}
          />
        </div>
        <TextAreaField
          label="출판물 소개"
          name="description"
          value={form.description}
          onChange={(v) => set('description', v)}
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
