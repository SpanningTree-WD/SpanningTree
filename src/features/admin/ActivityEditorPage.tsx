import { Link } from 'react-router-dom'
import type { Activity } from '../../models/activity'
import { activityRepository } from '../../repositories/adminRepositories'
import {
  EditorActions,
  EditorFrame,
  Field,
  SelectField,
  TextAreaField,
  type Errors,
} from './EditorFields'
import { activityTypes } from './editorOptions'
import { useAdminEditor } from './useAdminEditor'

const empty: Activity = {
  id: '',
  title: '',
  slug: '',
  date: '',
  type: '',
  summary: '',
  description: '',
  tags: [],
  featured: true,
  coverImage: { alt: '', variant: 'a' },
  gallery: [],
  relatedMathematics: [],
  relatedPublications: [],
  status: 'draft',
  createdAt: '',
  updatedAt: '',
}
function validateExtra(form: Activity): Errors {
  return form.date ? {} : { date: '활동 날짜를 선택해 주세요.' }
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
          <Link to="/admin/activities">← 활동 목록</Link>
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
      title={form.id ? '활동 수정' : '새 활동 작성'}
      section="활동"
      path="/admin/activities"
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
          <Field
            label="활동 날짜"
            name="date"
            type="date"
            value={form.date}
            error={errors.date}
            required
            onChange={(v) => set('date', v)}
          />
          <SelectField
            label="활동 유형"
            name="type"
            value={form.type}
            options={activityTypes}
            error={errors.type}
            required
            onChange={(v) => set('type', v)}
          />
        </div>
        <TextAreaField
          label="활동 내용"
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
