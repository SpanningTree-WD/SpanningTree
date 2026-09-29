import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { AdminRepository } from '../../repositories/contracts'
import { adminErrorMessage } from './adminErrors'
import { slugPattern, type Errors } from './EditorFields'

interface EditableRecord {
  id: string
  title: string
  slug: string
  type: string
  status: 'draft' | 'published'
  createdAt: string
  updatedAt: string
}

export function useAdminEditor<T extends EditableRecord>(
  repository: AdminRepository<T>,
  empty: T,
  path: string,
  validateExtra: (form: T) => Errors
) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState<Errors>({})
  const [operationError, setOperationError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [loadedId, setLoadedId] = useState<string>()
  const [loadError, setLoadError] = useState('')
  const [retry, setRetry] = useState(0)
  const inFlight = useRef(false)

  useEffect(() => {
    let active = true
    setLoadError('')
    setErrors({})
    setOperationError('')
    setNotice('')
    setDirty(false)
    if (!id) {
      setForm(empty)
      setLoadedId('new')
      return
    }
    repository
      .getById(id)
      .then((record) => {
        if (!active) return
        if (!record) {
          setLoadError('자료가 존재하지 않습니다.')
          return
        }
        setForm(record)
        setLoadedId(id)
      })
      .catch((error) => {
        if (active) setLoadError(adminErrorMessage(error))
      })
    return () => {
      active = false
    }
  }, [id, repository, empty, retry])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function set<K extends keyof T>(key: K, value: T[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setDirty(true)
    setNotice('')
  }

  async function perform(action: 'save' | 'publish' | 'unpublish') {
    if (inFlight.current || loadedId !== (id ?? 'new') || loadError) return
    const next: Errors = {
      ...validateExtra(form),
      ...(!form.title.trim() ? { title: 'Enter a title.' } : {}),
      ...(!slugPattern.test(form.slug) || form.slug.length > 160
        ? { slug: 'Use lowercase letters, numbers, and single hyphens (up to 160 characters).' }
        : {}),
      ...(!form.type.trim() ? { type: 'Enter a content type.' } : {}),
    }
    if (action !== 'unpublish' && Object.keys(next).length) {
      setErrors(next)
      return
    }
    setErrors({})
    if (
      action !== 'save' &&
      !window.confirm(
        action === 'publish'
          ? '이 자료를 공개하시겠습니까? 현재 입력 내용도 저장됩니다.'
          : '이 자료를 비공개로 전환하시겠습니까? 저장하지 않은 변경사항은 반영되지 않습니다.'
      )
    )
      return
    inFlight.current = true
    setSaving(true)
    setOperationError('')
    setNotice('')
    try {
      let record: T
      if (action === 'unpublish') {
        record = await repository.unpublish(form.id)
      } else {
        record = form.id ? await repository.update(form.id, form) : await repository.create(form)
        // Retain a successful save even if the following publish request fails.
        setForm(record)
        setDirty(false)
        if (action === 'publish') record = await repository.publish(record.id)
      }
      setForm(record)
      setDirty(false)
      setNotice(
        action === 'publish'
          ? '공개했습니다.'
          : action === 'unpublish'
            ? '비공개로 전환했습니다.'
            : '저장했습니다.'
      )
      if (!id) {
        setLoadedId(record.id)
        navigate(path + '/' + record.id + '/edit', { replace: true })
      }
    } catch (error) {
      setOperationError(adminErrorMessage(error))
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }

  return {
    form,
    set,
    errors,
    saving,
    loading: loadedId !== (id ?? 'new'),
    loadError,
    operationError,
    notice,
    retryLoad: () => setRetry((value) => value + 1),
    save: () => perform('save'),
    publish: () => perform('publish'),
    unpublish: () => perform('unpublish'),
  }
}
