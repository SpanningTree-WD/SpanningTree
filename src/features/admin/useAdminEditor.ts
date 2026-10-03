import { useT } from '../../i18n/LanguageProvider'
import { useCallback, useLayoutEffect, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import type { Attachment, MediaReference } from '../../models/common'
import type { AdminRepository } from '../../repositories/contracts'
import type { UploadCollection } from '../../services/uploads/uploadTypes'
import { adminErrorMessage } from './adminErrors'
import type { Errors } from './EditorFields'
import { prepareEditorRecord } from './editorMetadata'
import { useArticleAttachments } from './useArticleAttachments'

interface EditableRecord {
  id: string
  title: string
  slug: string
  type: string
  summary: string
  content?: string
  description?: string
  coverImage: MediaReference
  attachments?: Attachment[]
  pdf?: Attachment
  status: 'draft' | 'published'
  createdAt: string
  updatedAt: string
}

interface EditorSession {
  key: string
  active: boolean
  operation?: AbortController
}

export function useAdminEditor<T extends EditableRecord>(
  repository: AdminRepository<T>,
  empty: T,
  path: string,
  validateExtra: (form: T) => Errors
) {
  const t = useT()
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState<Errors>({})
  const [operationError, setOperationError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [loadedSession, setLoadedSession] = useState<string>()
  const [loadError, setLoadError] = useState('')
  const [retry, setRetry] = useState(0)
  const session = useRef<EditorSession | null>(null)
  const previous = useRef(empty)
  const sessionKey = `${path}/${id ?? 'new'}:${location.key}:${retry}`
  const markDirty = useCallback(() => {
    setDirty(true)
    setNotice('')
  }, [])
  const attachments = useArticleAttachments(
    path.split('/').pop() as UploadCollection,
    sessionKey,
    markDirty
  )

  useLayoutEffect(() => {
    const current: EditorSession = { key: sessionKey, active: true }
    session.current = current
    setLoadError('')
    setLoadedSession(undefined)
    setErrors({})
    setOperationError('')
    setNotice('')
    setSaving(false)
    setDirty(false)
    setPreviewing(false)

    if (!id) {
      const initial = { ...empty, slug: `${path.split('/').pop()}-${crypto.randomUUID()}` }
      setForm(initial)
      previous.current = initial
      setLoadedSession(sessionKey)
    } else {
      repository
        .getById(id)
        .then((record) => {
          if (!current.active) return
          if (!record) {
            setLoadError('자료가 존재하지 않습니다.')
            return
          }
          setForm(record)
          previous.current = record
          setLoadedSession(sessionKey)
        })
        .catch((error) => {
          if (current.active) setLoadError(adminErrorMessage(error))
        })
    }

    return () => {
      current.active = false
      current.operation?.abort()
      if (session.current === current) session.current = null
    }
  }, [id, repository, empty, path, sessionKey])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty || attachments.hasPending) event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, attachments.hasPending])

  function set<K extends keyof T>(key: K, value: T[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    markDirty()
  }

  function cancel() {
    const current = session.current
    if (!current?.active || current.key !== sessionKey) return
    if (
      (dirty || attachments.hasPending || saving) &&
      !window.confirm(t('저장하지 않은 변경사항과 첨부 파일 선택을 취소하시겠습니까?'))
    )
      return
    current.active = false
    current.operation?.abort()
    attachments.clear()
    navigate(path)
  }

  async function perform(action: 'save' | 'publish' | 'unpublish') {
    const current = session.current
    if (
      !current?.active ||
      current.key !== sessionKey ||
      current.operation ||
      loadedSession !== sessionKey ||
      loadError
    )
      return
    const next: Errors = {
      ...validateExtra(form),
      ...(!form.title.trim() ? { title: '제목을 입력해 주세요.' } : {}),
      ...(!form.type.trim() ? { type: '유형을 선택해 주세요.' } : {}),
    }
    if (action !== 'unpublish' && Object.keys(next).length) {
      setErrors(next)
      setPreviewing(false)
      return
    }
    setErrors({})
    if (
      action !== 'save' &&
      !window.confirm(
        action === 'publish'
          ? t('이 자료를 공개하시겠습니까? 현재 입력 내용도 저장됩니다.')
          : t('이 자료를 비공개로 전환하시겠습니까? 저장하지 않은 변경사항은 반영되지 않습니다.')
      )
    )
      return

    const operation = new AbortController()
    current.operation = operation
    const isCurrent = () =>
      current.active && session.current === current && !operation.signal.aborted
    const checkpoint = () => {
      if (!isCurrent()) throw new DOMException('작성이 취소되었습니다.', 'AbortError')
    }
    setSaving(true)
    setOperationError('')
    setNotice('')
    try {
      let record: T
      if (action === 'unpublish') {
        record = await repository.unpublish(form.id)
        checkpoint()
        attachments.clear()
      } else {
        const input = prepareEditorRecord(form, previous.current)
        if (attachments.hasPending) {
          let base = input
          if (!base.id) {
            // Uploads require an existing draft. Retain its ID even if a later upload fails.
            base = await repository.create(input)
            checkpoint()
            setForm(base)
            previous.current = base
          }
          const attached = await attachments.prepare(base, operation.signal)
          checkpoint()
          record = await repository.update(base.id, attached)
          checkpoint()
          attachments.clear()
        } else {
          record = form.id
            ? await repository.update(form.id, input)
            : await repository.create(input)
          checkpoint()
        }
        // Retain a successful save even if the following publish request fails.
        setForm(record)
        previous.current = record
        setDirty(false)
        if (action === 'publish') {
          record = await repository.publish(record.id)
          checkpoint()
        }
      }
      setForm(record)
      previous.current = record
      setDirty(false)
      setNotice(
        action === 'publish'
          ? '공개했습니다.'
          : action === 'unpublish'
            ? '비공개로 전환했습니다.'
            : '저장했습니다.'
      )
      if (!id) navigate(path + '/' + record.id + '/edit', { replace: true })
    } catch (error) {
      // A late response from another article must not change this editor.
      if (isCurrent()) setOperationError(adminErrorMessage(error))
    } finally {
      if (current.operation === operation) current.operation = undefined
      if (isCurrent()) setSaving(false)
    }
  }

  return {
    form,
    set,
    errors,
    saving,
    loading: loadedSession !== sessionKey,
    loadError,
    operationError,
    notice,
    attachments,
    preview: prepareEditorRecord(form, previous.current),
    previewing,
    setPreviewing,
    cancel,
    retryLoad: () => setRetry((value) => value + 1),
    save: () => perform('save'),
    publish: () => perform('publish'),
    unpublish: () => perform('unpublish'),
  }
}
