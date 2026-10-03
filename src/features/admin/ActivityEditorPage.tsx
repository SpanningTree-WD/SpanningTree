import { useT } from '../../i18n/LanguageProvider'
import { Link } from 'react-router-dom'
import type { Activity } from '../../models/activity'
import { activityRepository } from '../../repositories/adminRepositories'
import {
  EditorActions,
  EditorFrame,
  Field,
  SelectField,
  type Errors,
} from './EditorFields'
import { activityTypes } from '../../models/contentOptions'
import { useAdminEditor } from './useAdminEditor'
import { ArticleComposer } from './ArticleComposer'
import { PeoplePicker, RelatedPicker } from './ConnectionPickers'
import { ArticlePreview } from './ArticlePreview'

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
  const t = useT()

  const {
    form,
    preview,
    previewing,
    setPreviewing,
    bodyUploads,
    uploadScope,
    setAssets,
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
  } = useAdminEditor(activityRepository, empty, '/admin/activities', validateExtra)
  if (loadError)
    return (
      <div className="admin-page" role="alert">
        <p>{t(loadError)}</p>
        <button onClick={retryLoad}>{t("다시 불러오기")}</button>
        <p>
          <Link to="/admin/activities">{t("← 활동 목록")}</Link>
        </p>
      </div>
    )
  if (loading)
    return (
      <div className="admin-page" role="status">{t("자료를 불러오고 있습니다.")}</div>
    )
  return (
    <EditorFrame
      title={form.id ? t('활동 수정') : t('새 활동 작성')}
      section="활동"
      path="/admin/activities"
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
      {previewing && <ArticlePreview collection="activities" record={preview} assetViews={bodyUploads.views(form.assets)} />}
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
        <ArticleComposer value={form.description} label="활동 내용"
          assets={form.assets} diagrams={form.diagrams} uploads={bodyUploads} scope={uploadScope} disabled={saving}
          onChange={value => set('description', value)} onAssets={setAssets} onDiagrams={value => set('diagrams', value)}
          onCover={asset => set('coverImage', { ...form.coverImage, url: asset.url, alt: asset.alt || form.title })}
           />
        <PeoplePicker label="참여자" value={form.participantIds ?? []} onChange={value => set('participantIds', value)} />
        <RelatedPicker collection="mathematics" label="관련 수학 자료" value={form.relatedMathematics} onChange={value => set('relatedMathematics', value)} />
        </div>
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
