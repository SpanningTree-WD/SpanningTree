import { useT } from '../../i18n/LanguageProvider'
import { useCallback, useLayoutEffect, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import type { Attachment, MediaReference } from '../../models/common'
import type { AdminRepository } from '../../repositories/contracts'
import type { UploadCollection } from '../../services/uploads/uploadTypes'
import { adminErrorMessage } from './adminErrors'
import type { Errors } from './EditorFields'
import { prepareEditorRecord } from './editorMetadata'
import { useArticleAttachments } from './useArticleAttachments'
import { useBodyUploads } from './useBodyUploads'
import { fileSizeLabel } from '../../services/uploads/uploadTypes'
import { validateAuthoring, withLegacyAssets, type ArticleAsset, type AuthoringFields, type ReferenceEntry } from '../../models/authoring'

interface EditableRecord extends AuthoringFields {
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
  references?: ReferenceEntry[]
}

function applyAssets<T extends EditableRecord>(record: T, assets: ArticleAsset[]): T {
  const old = record.assets ?? []
  const replacementUrl = (url?: string) => {
    const previous = old.find(asset => asset.url === url)
    return previous ? assets.find(asset => asset.id === previous.id)?.url : url
  }
  const replaceFile = (file: Attachment) => {
    const previous = old.find(asset => asset.url === file.url)
    const replacement = assets.find(asset => asset.id === previous?.id)
    return { ...file, url: replacementUrl(file.url), ...(replacement ? { fileName: replacement.fileName, sizeLabel: replacement.size ? fileSizeLabel(replacement.size) : file.sizeLabel } : {}) }
  }
  return { ...record, assets,
    coverImage: { ...record.coverImage, url: replacementUrl(record.coverImage.url) },
    ...(record.attachments ? { attachments: record.attachments.filter(file => !file.url || !!replacementUrl(file.url)).map(replaceFile) } : {}),
    ...(record.pdf ? { pdf: replacementUrl(record.pdf.url) ? replaceFile(record.pdf) : undefined } : {}),
  }
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
  const uploadScope = useMemo(() => ({ collection: path.split('/').pop() as UploadCollection, recordId: id || crypto.randomUUID() }), [path, id, sessionKey])
  const bodyUploads = useBodyUploads(uploadScope, sessionKey, (asset) => {
    setForm(current => applyAssets(current, [...(current.assets ?? []).filter(item => item.id !== asset.id), asset]))
    markDirty()
  }, markDirty)
  function setAssets(assets: ArticleAsset[]) { setForm(current => applyAssets(current, assets)); markDirty() }

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
          const adapted = withLegacyAssets(record)
          setForm(adapted)
          previous.current = adapted
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
      if (dirty || attachments.hasPending || bodyUploads.hasPending) event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, attachments.hasPending, bodyUploads.hasPending])

  function set<K extends keyof T>(key: K, value: T[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    markDirty()
  }

  function cancel() {
    const current = session.current
    if (!current?.active || current.key !== sessionKey) return
    if (
      (dirty || attachments.hasPending || bodyUploads.hasPending || saving) &&
      !window.confirm(t('저장하지 않은 변경사항과 첨부 파일 선택을 취소하시겠습니까?'))
    )
      return
    current.active = false
    current.operation?.abort()
    attachments.clear()
    bodyUploads.clear()
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
    if (action !== 'unpublish' && bodyUploads.hasPending) {
      setOperationError('업로드 중이거나 실패한 첨부가 있습니다. 첨부 목록에서 완료를 기다리거나 재시도·삭제해 주세요.')
      setPreviewing(false)
      return
    }
    if (action !== 'unpublish') {
      try { validateAuthoring(form) } catch (failure) { setOperationError(adminErrorMessage(failure)); setPreviewing(false); return }
    }
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
        bodyUploads.clear()
      } else {
        const input = prepareEditorRecord(form, previous.current)
        if (attachments.hasPending) {
          let base = input
          if (!base.id) {
            // Uploads require an existing draft. Retain its ID even if a later upload fails.
            base = await repository.create(input, uploadScope.recordId)
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
            : await repository.create(input, uploadScope.recordId)
          checkpoint()
        }
        // Retain a successful save even if the following publish request fails.
        setForm(record)
        previous.current = record
        setDirty(false)
        bodyUploads.clear()
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
    bodyUploads,
    uploadScope,
    setAssets,
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
