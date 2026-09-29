import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AdminRepository } from '../../repositories/contracts'
import {
  activityRepository,
  mathematicsRepository,
  publicationRepository,
} from '../../repositories/adminRepositories'
import { adminErrorMessage } from './adminErrors'

type Item = { id: string; title: string; status: 'draft' | 'published'; updatedAt: string }
const definitions = {
  activities: {
    title: '활동',
    repository: activityRepository as AdminRepository<Item>,
  },
  mathematics: {
    title: '수학 자료',
    repository: mathematicsRepository as AdminRepository<Item>,
  },
  publications: {
    title: '출판물',
    repository: publicationRepository as AdminRepository<Item>,
  },
}

export function AdminListPage({ type }: { type: keyof typeof definitions }) {
  const { title, repository } = definitions[type]
  const [records, setRecords] = useState<Item[]>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    let active = true
    setRecords(undefined)
    setError('')
    repository
      .listAll()
      .then((items) => {
        if (active) setRecords(items)
      })
      .catch((failure) => {
        if (active) setError(adminErrorMessage(failure))
      })
    return () => {
      active = false
    }
  }, [repository, refresh])

  async function toggle(record: Item) {
    if (
      busy ||
      !window.confirm(
        record.status === 'published'
          ? '이 자료를 비공개로 전환하시겠습니까?'
          : '이 자료를 공개하시겠습니까?'
      )
    )
      return
    setBusy(true)
    setError('')
    try {
      await (record.status === 'published'
        ? repository.unpublish(record.id)
        : repository.publish(record.id))
      setRefresh((value) => value + 1)
    } catch (failure) {
      setError(adminErrorMessage(failure))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="admin-page">
      <header className="admin-page-head admin-page-head-row">
        <div>
          <p className="eyebrow">콘텐츠 관리</p>
          <h1>{title}</h1>
          <p>
            {records ? `총 ${records.length}건 · 비공개 자료 포함` : '자료를 불러오고 있습니다.'}
          </p>
        </div>
        <Link className="admin-primary" to={'/admin/' + type + '/new'}>
          새 {title} 작성
        </Link>
      </header>
      {error && (
        <div role="alert">
          <p className="field-error">{error}</p>
          <button onClick={() => setRefresh((value) => value + 1)}>다시 불러오기</button>
        </div>
      )}
      {records && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>제목</th>
                <th>공개 상태</th>
                <th>최근 수정일</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>
                    <strong>{record.title}</strong>
                  </td>
                  <td>
                    <span className={'status status-' + record.status}>
                      {record.status === 'published' ? '공개' : '비공개'}
                    </span>
                  </td>
                  <td>{new Date(record.updatedAt).toLocaleDateString('ko-KR')}</td>
                  <td className="table-actions">
                    <Link to={'/admin/' + type + '/' + record.id + '/edit'}>수정</Link>
                    <button disabled={busy} onClick={() => void toggle(record)}>
                      {record.status === 'published' ? '비공개로 전환' : '공개하기'}
                    </button>
                  </td>
                </tr>
              ))}
              {!records.length && (
                <tr>
                  <td colSpan={4}>등록된 자료가 없습니다. 새 자료를 작성해 주세요.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
