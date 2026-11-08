import { useT } from '../../i18n/LanguageProvider'
import type { Mathematics } from '../../models/mathematics'
import type { MediaReference } from '../../models/common'
import { CoverVisual, useCoverOptions } from '../../components/content/MathematicsCover'
import { bodyCoverPrefix, type CoverOption } from '../../components/content/mathematicsCovers'
import { contentImageSource } from '../../components/content/contentImageSource'

const labels: Record<CoverOption['kind'], string> = {
  image: '사진', tikz: 'TikZ', asymptote: 'Asymptote', display: '독립 수식', inline: '인라인 수식',
}
export function MathematicsCoverPicker({ item, onChange }: { item: Mathematics; onChange: (value: MediaReference) => void }) {
  const t = useT()
  const result = useCoverOptions(item, true)
  const options = result?.options ?? []
  const ref = item.coverImage.variant
  const bodyCover = ref.startsWith(bodyCoverPrefix)
  const current = options.find(option => option.key === ref)
  const legacy = !bodyCover && contentImageSource(item.coverImage)
  const key = bodyCover ? ref : legacy ? 'legacy' : ''
  function select(value: string) {
    const choice = options.find(option => option.key === value)
    onChange(choice ? { variant: choice.key, alt: choice.label.slice(0, 1000) } : { variant: 'blue', alt: '' })
  }
  return <section className="math-cover-picker" aria-label={t('목록 대표 그림')}>
    <label className="admin-field"><span>{t('목록 대표 그림')}</span>
      <select value={key} onChange={event => select(event.target.value)}>
        <option value="">{t('선택 안 함')}</option>
        {legacy && <option value="legacy">{t('기존 대표 사진')}</option>}
        {bodyCover && !current && <option value={ref}>{t(result ? '본문에서 사라진 항목' : '불러오는 중…')}</option>}
        {Object.entries(labels).map(([kind, label]) => {
          const group = options.filter(option => option.kind === kind)
          return group.length ? <optgroup key={kind} label={t(label)}>{group.map((option, i) =>
            <option key={option.key} value={option.key}>{i + 1}. {option.label.replace(/\s+/g, ' ').slice(0, 140)}</option>)}</optgroup> : null
        })}
      </select>
    </label>
    <p className="field-help">{t('본문에 삽입한 사진, 도형 또는 수식을 고르세요. 선택은 글을 저장할 때 목록에 반영됩니다.')}</p>
    {result?.failed && <p role="alert">{t('본문 그림 후보를 불러올 수 없습니다.')}</p>}
    {bodyCover && result && !current && !result.failed && <p role="status">{t('선택한 항목이 본문에서 변경되거나 삭제되어 목록에 표시되지 않습니다.')}</p>}
    {current ? <CoverVisual option={current} /> : legacy ? <img className="composer-cover-thumbnail" src={legacy} alt={item.coverImage.alt} /> : null}
  </section>
}
