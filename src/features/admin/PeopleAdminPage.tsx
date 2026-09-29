import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { groupMembers, validateMember, type Member, type MemberInput } from '../../models/people'
import { memberRepository } from '../../repositories/memberRepository'
import { adminErrorMessage } from './adminErrors'

function MemberForm({
  member,
  busy,
  onSave,
  onCancel,
}: {
  member?: Member
  busy: boolean
  onSave: (input: MemberInput) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(member?.name ?? '')
  const [generation, setGeneration] = useState(String(member?.generation ?? ''))
  const [isLeader, setIsLeader] = useState(member?.isLeader ?? false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      await onSave(validateMember({ name, generation: Number(generation), isLeader }))
    } catch (failure) {
      setError(adminErrorMessage(failure))
    }
  }
  return (
    <form className="member-editor" onSubmit={(event) => void submit(event)}>
      <h2>{member ? '구성원 수정' : '구성원 추가'}</h2>
      <fieldset className="admin-editor-fields" disabled={busy}>
        <div className="admin-form-grid">
          <label className="admin-field">
            이름
            <input
              autoFocus
              required
              maxLength={40}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="admin-field">
            기수
            <input
              required
              type="number"
              min={1}
              max={999}
              step={1}
              placeholder="예: 39"
              value={generation}
              onChange={(event) => setGeneration(event.target.value)}
            />
          </label>
        </div>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={isLeader}
            onChange={(event) => setIsLeader(event.target.checked)}
          />
          학년 장
        </label>
        <p className="member-form-help">학년 장은 공개 명단에서 두꺼운 테두리로 표시됩니다.</p>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="member-form-actions">
          <button type="submit" className="admin-primary">
            {busy ? '저장 중…' : '저장'}
          </button>
          <button type="button" onClick={onCancel}>
            취소
          </button>
        </div>
      </fieldset>
    </form>
  )
}

export function PeopleAdminPage() {
  const [members, setMembers] = useState<Member[]>()
  const [loadError, setLoadError] = useState('')
  const [retry, setRetry] = useState(0)
  const [editor, setEditor] = useState<{ member?: Member } | null>(null)
  const [removing, setRemoving] = useState<Member | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    setLoadError('')
    return memberRepository.subscribe(setMembers, (failure) =>
      setLoadError(adminErrorMessage(failure))
    )
  }, [retry])
  async function save(input: MemberInput) {
    setBusy(true)
    setNotice('')
    try {
      if (editor?.member) await memberRepository.update(editor.member, input)
      else await memberRepository.create(input)
      setEditor(null)
      setNotice('저장했습니다. 공개 명단에 반영되었습니다.')
    } finally {
      setBusy(false)
    }
  }
  async function remove() {
    if (!removing) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await memberRepository.remove(removing)
      setNotice(`${removing.name} 님을 명단에서 삭제했습니다.`)
      setRemoving(null)
    } catch (failure) {
      setError(adminErrorMessage(failure))
    } finally {
      setBusy(false)
    }
  }
  const locked = busy || Boolean(editor) || Boolean(removing) || Boolean(loadError)
  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <p className="eyebrow">구성원 관리</p>
        <h1>구성원 명단</h1>
        <p>이름·기수·학년 장을 관리합니다. 저장한 내용은 바로 공개됩니다.</p>
      </header>
      <div className="member-toolbar">
        <button
          className="admin-primary"
          disabled={locked || !members}
          onClick={() => {
            setEditor({})
            setNotice('')
          }}
        >
          구성원 추가
        </button>
        <Link to="/people" target="_blank" rel="noopener noreferrer">
          공개 명단 보기 ↗
        </Link>
      </div>
      {notice && <p role="status">{notice}</p>}
      {loadError && (
        <div role="alert">
          <p>{loadError}</p>
          <button onClick={() => setRetry((value) => value + 1)}>다시 시도</button>
        </div>
      )}
      {editor && (
        <MemberForm
          key={editor.member?.id ?? 'new'}
          member={editor.member}
          busy={busy}
          onSave={save}
          onCancel={() => setEditor(null)}
        />
      )}
      {removing && (
        <div className="member-delete-confirm" role="alertdialog" aria-label="구성원 삭제 확인">
          <p>
            {removing.generation}기 {removing.name} 님을 명단에서 삭제할까요?
          </p>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <div className="member-form-actions">
            <button className="admin-danger" disabled={busy} onClick={() => void remove()}>
              {busy ? '삭제 중…' : '삭제 확인'}
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setRemoving(null)
                setError('')
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}
      {!members && !loadError ? (
        <p role="status">명단을 불러오고 있습니다.</p>
      ) : members?.length === 0 ? (
        <p>등록된 구성원이 없습니다. 구성원을 추가해 주세요.</p>
      ) : (
        members && (
          <div className="admin-table-wrap">
            <table className="admin-table member-table">
              <thead>
                <tr>
                  <th scope="col">이름</th>
                  <th scope="col">기수</th>
                  <th scope="col">학년 장</th>
                  <th scope="col">관리</th>
                </tr>
              </thead>
              <tbody>
                {groupMembers(members)
                  .flatMap((group) => group.members)
                  .map((member) => (
                    <tr key={member.id}>
                      <td>{member.name}</td>
                      <td>{member.generation}기</td>
                      <td>{member.isLeader ? '학년 장' : '—'}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            disabled={locked}
                            aria-label={`${member.generation}기 ${member.name} 수정`}
                            onClick={() => {
                              setEditor({ member })
                              setNotice('')
                            }}
                          >
                            수정
                          </button>
                          <button
                            disabled={locked}
                            aria-label={`${member.generation}기 ${member.name} 삭제`}
                            onClick={() => {
                              setRemoving(member)
                              setNotice('')
                              setError('')
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
