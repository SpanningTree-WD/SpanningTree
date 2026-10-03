import { useT } from '../../i18n/LanguageProvider'
import { Link } from 'react-router-dom'
import type { Mathematics } from '../../models/mathematics'
import { mathematicsRepository } from '../../repositories/adminRepositories'
import {
  EditorActions,
  EditorFrame,
  Field,
  NamesField,
  SelectField,
  type Errors,
} from './EditorFields'
import { mathematicsTypes } from '../../models/contentOptions'
import { getMathematicsFields } from '../../models/mathematicsFields'
import { MathematicsFieldPicker } from './MathematicsFieldPicker'
import { useAdminEditor } from './useAdminEditor'
import { ArticleComposer } from './ArticleComposer'
import { PeoplePicker, RelatedPicker } from './ConnectionPickers'
import { ArticlePreview } from './ArticlePreview'

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
  } = useAdminEditor(mathematicsRepository, empty, '/admin/mathematics', validateExtra)
  if (loadError)
    return (
      <div className="admin-page" role="alert">
        <p>{t(loadError)}</p>
        <button onClick={retryLoad}>{t("다시 불러오기")}</button>
        <p>
          <Link to="/admin/mathematics">{t("← 수학 자료 목록")}</Link>
        </p>
      </div>
    )
  if (loading)
    return (
      <div className="admin-page" role="status">{t("자료를 불러오고 있습니다.")}</div>
    )
  return (
    <EditorFrame
      title={form.id ? t('수학 자료 수정') : t('새 수학 자료 작성')}
      section="수학 자료"
      path="/admin/mathematics"
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
      {previewing && <ArticlePreview collection="mathematics" record={preview} assetViews={bodyUploads.views(form.assets)} />}
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
        <ArticleComposer value={form.content} label="본문"
          assets={form.assets} diagrams={form.diagrams} uploads={bodyUploads} scope={uploadScope} disabled={saving}
          onChange={value => set('content', value)} onAssets={setAssets} onDiagrams={value => set('diagrams', value)}
          onCover={asset => set('coverImage', { ...form.coverImage, url: asset.url, alt: asset.alt || form.title })}
          references={form.references ?? []} onReferences={value => set('references', value)} />
        <PeoplePicker label="등록된 작성자" value={form.authorIds ?? []} onChange={value => set('authorIds', value)} />
        <RelatedPicker collection="activities" label="관련 활동" value={form.relatedActivities} onChange={value => set('relatedActivities', value)} />
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
