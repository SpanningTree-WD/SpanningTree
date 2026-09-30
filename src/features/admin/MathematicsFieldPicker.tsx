import { useId, useState } from 'react'
import { mathematicsFields, type Choice } from '../../models/contentOptions'
import {
  fieldNameKey, MAX_MATHEMATICS_FIELDS, MAX_MATHEMATICS_FIELD_LENGTH,
} from '../../models/mathematicsFields'
import { useMathematicsFieldSuggestions } from './useMathematicsFieldSuggestions'

export function MathematicsFieldPicker({
  value,
  error,
  onChange,
}: {
  value: readonly string[]
  error?: string
  onChange: (fields: string[]) => void
}) {
  const id = useId()
  const suggestions = useMathematicsFieldSuggestions()
  const [created, setCreated] = useState<string[]>([...value])
  const [name, setName] = useState('')
  const [inputError, setInputError] = useState('')
  const custom = [...new Set([...suggestions.fields, ...created, ...value])]
    .filter((field) => !mathematicsFields.some(([key]) => key === field))
    .sort((a, b) => a.localeCompare(b, 'ko'))
  const options: readonly Choice[] = [
    ...mathematicsFields,
    ...custom.map((field) => [field, field] as const),
  ]

  function addField() {
    const trimmed = name.trim().replace(/\s+/g, ' ')
    if (!trimmed || trimmed.length > MAX_MATHEMATICS_FIELD_LENGTH) {
      setInputError('분야 이름을 1~100자로 입력해 주세요.')
      return
    }
    const matched = options.find(([key, label]) =>
      fieldNameKey(key) === fieldNameKey(trimmed) || fieldNameKey(label) === fieldNameKey(trimmed)
    )
    const field = matched?.[0] ?? trimmed
    if (value.some((selected) => fieldNameKey(selected) === fieldNameKey(field))) {
      setInputError('이미 선택한 분야입니다.')
      return
    }
    if (value.length >= MAX_MATHEMATICS_FIELDS) {
      setInputError('한 글에는 분야를 최대 16개까지 선택할 수 있습니다.')
      return
    }
    if (!matched) setCreated((previous) => [...previous, field])
    onChange([...value, field])
    setName('')
    setInputError('')
  }

  return (
    <fieldset
      className="mathematics-field-picker"
      aria-invalid={Boolean(error)}
      aria-describedby={id + '-help' + (error ? ' ' + id + '-error' : '')}
    >
      <legend>수학 분야 <span>필수 · 여러 개 선택 가능</span></legend>
      <p id={id + '-help'}>분야를 선택하거나 원하는 이름을 추가하세요. 글을 저장하면 반영됩니다.</p>
      <div className="mathematics-field-options">
        {options.map(([key, label]) => (
          <label className="mathematics-field-option" key={key}>
            <input
              type="checkbox"
              checked={value.includes(key)}
              disabled={!value.includes(key) && value.length >= MAX_MATHEMATICS_FIELDS}
              onChange={(event) =>
                onChange(event.target.checked ? [...value, key] : value.filter((field) => field !== key))
              }
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <div className="mathematics-field-add">
        <label htmlFor={id + '-name'}>새 분야 이름</label>
        <div>
          <input
            id={id + '-name'}
            type="text"
            value={name}
            maxLength={MAX_MATHEMATICS_FIELD_LENGTH}
            aria-invalid={Boolean(inputError)}
            aria-describedby={inputError ? id + '-input-error' : undefined}
            onChange={(event) => { setName(event.target.value); setInputError('') }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                event.preventDefault()
                addField()
              }
            }}
          />
          <button type="button" onClick={addField}>분야 추가</button>
        </div>
      </div>
      {inputError && <p className="field-error" id={id + '-input-error'}>{inputError}</p>}
      {suggestions.error && (
        <p className="mathematics-field-note">
          저장된 분야 목록을 불러오지 못했습니다. 직접 입력해서 추가할 수 있습니다.{' '}
          <button type="button" onClick={suggestions.retry}>다시 불러오기</button>
        </p>
      )}
      {error && <p className="field-error" id={id + '-error'}>{error}</p>}
    </fieldset>
  )
}
