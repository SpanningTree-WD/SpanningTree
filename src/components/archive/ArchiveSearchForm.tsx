import { useId, useState } from 'react'

// Remount only when the URL query changes, including browser back/forward.
export function ArchiveSearchForm(props: {
  value: string
  onSearch: (value: string) => void
  autoFocus?: boolean
}) {
  return <SearchInput key={props.value} {...props} />
}

function SearchInput({
  value,
  onSearch,
  autoFocus,
}: {
  value: string
  onSearch: (value: string) => void
  autoFocus?: boolean
}) {
  const [text, setText] = useState(value)
  const id = useId()
  return (
    <form
      className="archive-search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        onSearch(text.trim())
      }}
    >
      <label className="visually-hidden" htmlFor={id}>
        검색어
      </label>
      <input
        id={id}
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="제목, 본문, 작성자 검색"
        maxLength={200}
        autoFocus={autoFocus}
      />
      <button type="submit">검색</button>
      {value && (
        <button
          className="search-clear"
          type="button"
          onClick={() => {
            setText('')
            onSearch('')
          }}
        >
          초기화
        </button>
      )}
    </form>
  )
}
