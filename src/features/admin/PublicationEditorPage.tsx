import { useT } from '../../i18n/LanguageProvider'
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
import { publicationTypes } from '../../models/contentOptions'
import { useAdminEditor } from './useAdminEditor'
import { UploadPanel } from './UploadPanel'
import { ArticlePreview } from './ArticlePreview'
import { fileSizeLabel } from '../../services/uploads/uploadTypes'

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
  const t = useT()

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
  } = useAdminEditor(publicationRepository, empty, '/admin/publications', validateExtra)
  if (loadError)
    return (
      <div className="admin-page" role="alert">
        <p>{t(loadError)}</p>
        <button onClick={retryLoad}>{t("다시 불러오기")}</button>
        <p>
          <Link to="/admin/publications">{t("← 출판물 목록")}</Link>
        </p>
      </div>
    )
  if (loading)
    return (
      <div className="admin-page" role="status">{t("자료를 불러오고 있습니다.")}</div>
    )
  return (
    <EditorFrame
      title={form.id ? t('출판물 수정') : t('새 출판물 작성')}
      section="출판물"
      path="/admin/publications"
      status={form.status}
      onBack={cancel}
      saving={saving}
    >
      {operationError && (
        <p className="field-error" role="alert">
          {t(operationError)}
        </p>
      )}
      {notice && <p role="status">{t(notice)}</p>}
      <div className="editor-view-toggle" aria-label={t("작성 화면 전환")}>
        <button type="button" aria-pressed={!previewing} onClick={() => setPreviewing(false)}>{t("작성")}</button>
        <button type="button" aria-pressed={previewing} onClick={() => setPreviewing(true)}>{t("미리보기")}</button>
      </div>
      {previewing && <ArticlePreview collection="publications" record={preview} imagePreviewUrl={attachments.imagePreviewUrl}
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
        </div>
        <UploadPanel
          attachments={attachments}
          onRetry={() => void save()}
          disabled={saving}
          image={form.coverImage}
          files={!attachments.items.some((item) => item.file.type === 'application/pdf') && form.pdf ? [form.pdf] : []}
          onImage={(url) => set('coverImage', { ...form.coverImage, url })}
          onRemovePdf={() => set('pdf', undefined)}
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
