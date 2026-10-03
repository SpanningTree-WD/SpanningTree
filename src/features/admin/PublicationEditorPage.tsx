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
  type Errors,
} from './EditorFields'
import { publicationTypes } from '../../models/contentOptions'
import { useAdminEditor } from './useAdminEditor'
import { ArticleComposer } from './ArticleComposer'
import { PeoplePicker } from './ConnectionPickers'
import { ArticlePreview } from './ArticlePreview'

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
      {previewing && <ArticlePreview collection="publications" record={preview} assetViews={bodyUploads.views(form.assets)} />}
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
        <PeoplePicker label="등록된 작성자" value={form.authorIds ?? []} onChange={value => set('authorIds', value)} />
        
        <ArticleComposer value={form.description} label="출판물 소개"
          assets={form.assets} diagrams={form.diagrams} uploads={bodyUploads} scope={uploadScope} disabled={saving}
          onChange={value => set('description', value)} onAssets={setAssets} onDiagrams={value => set('diagrams', value)}
          onCover={asset => set('coverImage', { ...form.coverImage, url: asset.url, alt: asset.alt || form.title })}
           />
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
