import { Link } from 'react-router-dom'
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
import { mathematicsTypes } from '../../models/contentOptions'
import { getMathematicsFields } from '../../models/mathematicsFields'
import { MathematicsFieldPicker } from './MathematicsFieldPicker'
import { useAdminEditor } from './useAdminEditor'
import { UploadPanel } from './UploadPanel'
import { ArticlePreview } from './ArticlePreview'
import { fileSizeLabel } from '../../services/uploads/uploadTypes'

const empty: Mathematics = {
  id: '',
  title: '',
  slug: '',
  authors: [],
  field: '',
  fields: [],
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
  if (!getMathematicsFields(form).length) errors.field = '수학 분야를 한 개 이상 선택해 주세요.'
  return errors
}

export function MathematicsEditorPage() {
  const {
    form,
    preview,
    previewing,
    setPreviewing,
    attachments,
    cancel,
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
      onBack={cancel}
      saving={saving}
    >
      {operationError && (
        <p className="field-error" role="alert">
          {operationError}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <div className="editor-view-toggle" aria-label="작성 화면 전환">
        <button type="button" aria-pressed={!previewing} onClick={() => setPreviewing(false)}>작성</button>
        <button type="button" aria-pressed={previewing} onClick={() => setPreviewing(true)}>미리보기</button>
      </div>
      {previewing && <ArticlePreview collection="mathematics" record={preview} imagePreviewUrl={attachments.imagePreviewUrl}
        pendingFiles={attachments.items.filter((item) => item.file.type === 'application/pdf').map((item) => ({
          id: item.id, fileName: item.file.name,
          sizeLabel: fileSizeLabel(item.file.size),
          stateText: item.state === 'failed' ? '첨부 실패 · 아래에서 재시도'
            : item.state === 'selected' ? '이 글에 첨부 예정 · 저장 필요'
              : item.state === 'ready' ? '파일 준비 완료 · 글 저장 대기' : '첨부 처리 중',
        }))} />}
      <fieldset className="admin-editor-fields" disabled={saving}>
        <div hidden={previewing}>
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
            label="자료 유형"
            name="type"
            value={form.type}
            options={mathematicsTypes}
            error={errors.type}
            required
            onChange={(v) => set('type', v)}
          />
        </div>
        <MathematicsFieldPicker
          value={getMathematicsFields(form)}
          error={errors.field}
          onChange={(fields) => {
            set('fields', fields)
            // Retain the first selection for older clients during rollout.
            set('field', fields[0] ?? '')
          }}
        />
        <section className="article-body-editor">
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
        </section>
        </div>
        <UploadPanel
          attachments={attachments}
          onRetry={() => void save()}
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
        />
        <EditorActions
          status={form.status}
          saving={saving}
          onSave={() => void save()}
          onPublish={() => void publish()}
          onUnpublish={() => void unpublish()}
          onCancel={cancel}
        />
      </fieldset>
    </EditorFrame>
  )
}
