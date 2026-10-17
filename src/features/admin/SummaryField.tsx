import { useT } from '../../i18n/LanguageProvider'
import { TextAreaField } from './EditorFields'
import { contentSummary } from './editorMetadata'

export function SummaryField({ value, body, onChange }: {
  value: string; body: string; onChange: (value: string) => void
}) {
  const t = useT()
  return <section className="summary-field">
    <TextAreaField label="요약" name="summary" value={value} rows={3} onChange={onChange} />
    <p className="field-help">{t('목록과 검색 결과에 표시됩니다. 비워 두면 본문에서 자동으로 만듭니다.')}</p>
    <button type="button" onClick={() => onChange(contentSummary({ title: '', summary: '', content: body, coverImage: { alt: '', variant: '' } }))}>{t('본문에서 요약 만들기')}</button>
  </section>
}
