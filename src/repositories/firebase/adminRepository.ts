import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  runTransaction,
  serverTimestamp,
  type DocumentData,
  type DocumentSnapshot,
  type Firestore,
} from 'firebase/firestore'
import type { AdminRepository } from '../contracts'
import { normalize } from './repositories'

interface RecordBase {
  id: string
  slug: string
  title: string
  type: string
  status: 'draft' | 'published'
  createdAt: string
  updatedAt: string
  publishedAt?: string
}
type CollectionName = 'activities' | 'mathematics' | 'publications'

function mapRecord<T>(snapshot: DocumentSnapshot): T {
  return { ...(normalize(snapshot.data()) as object), id: snapshot.id } as T
}

function editableInput(input: object) {
  return Object.fromEntries(
    Object.entries(input).filter(
      ([key]) => !['id', 'status', 'createdAt', 'updatedAt', 'publishedAt'].includes(key)
    )
  )
}

// Firestore rejects undefined. An explicitly cleared optional field must disappear on replacement.
function withoutUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutUndefined)
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, withoutUndefined(item)])
    )
  }
  return value
}

function validate(record: DocumentData, name: CollectionName) {
  if (typeof record.title !== 'string' || !record.title.trim())
    throw new Error('제목을 입력해 주세요.')
  if (
    typeof record.slug !== 'string' ||
    record.slug.length > 160 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.slug)
  )
    throw new Error('Slug는 영문 소문자, 숫자, 하이픈으로 입력해 주세요 (최대 160자).')
  if (typeof record.type !== 'string' || !record.type.trim())
    throw new Error('자료 유형을 입력해 주세요.')
  if (name === 'activities' && !/^\d{4}-\d{2}-\d{2}$/.test(record.date))
    throw new Error('활동 날짜를 입력해 주세요.')
  if (
    name !== 'activities' &&
    (!Number.isInteger(record.year) || record.year < 1900 || record.year > 9999)
  )
    throw new Error('올바른 연도를 입력해 주세요.')
  if (name === 'mathematics' && (typeof record.field !== 'string' || !record.field.trim()))
    throw new Error('수학 분야를 입력해 주세요.')
}

export function createFirebaseAdminRepository<T extends RecordBase>(
  db: Firestore,
  name: CollectionName
): AdminRepository<T> {
  const records = collection(db, name)
  const slugRef = (slug: string) => doc(db, 'contentSlugs', name + ':' + slug)

  async function load(id: string) {
    const snapshot = await getDocFromServer(doc(records, id))
    if (!snapshot.exists()) throw new Error('자료가 존재하지 않습니다.')
    return mapRecord<T>(snapshot)
  }

  async function modify(id: string, input: Partial<T> = {}, status?: 'draft' | 'published') {
    const reference = doc(records, id)
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(reference)
      if (!snapshot.exists()) throw new Error('자료가 존재하지 않습니다.')
      const current = snapshot.data()
      const mapped = mapRecord<T>(snapshot)
      if (input.updatedAt && input.updatedAt !== mapped.updatedAt)
        throw new Error(
          '다른 관리자가 이 자료를 수정했습니다. 입력 내용을 별도로 복사한 뒤 새로고침하여 최신 내용을 확인해 주세요.'
        )
      const next = withoutUndefined({
        ...current,
        ...editableInput(input),
        id,
        updatedAt: serverTimestamp(),
      }) as DocumentData
      if (status) next.status = status
      if (name === 'mathematics' && status === 'published' && !current.publishedAt)
        next.publishedAt = serverTimestamp()
      validate(next, name)
      const target = slugRef(next.slug)
      const claim = await transaction.get(target)
      if (claim.exists() && claim.data().recordId !== id)
        throw new Error('이미 사용 중인 Slug입니다. 다른 주소를 입력해 주세요.')
      if (next.slug !== current.slug) {
        const previous = await transaction.get(slugRef(current.slug))
        if (previous.exists() && previous.data().recordId === id) transaction.delete(previous.ref)
      }
      transaction.set(target, { collection: name, slug: next.slug, recordId: id })
      transaction.set(reference, next)
    })
    return load(id)
  }

  return {
    async listAll() {
      const result = await getDocsFromServer(records)
      return result.docs
        .map((snapshot) => mapRecord<T>(snapshot))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    },
    async getById(id) {
      const snapshot = await getDocFromServer(doc(records, id))
      return snapshot.exists() ? mapRecord<T>(snapshot) : null
    },
    async create(input) {
      const reference = doc(records)
      const record = withoutUndefined({
        ...editableInput(input),
        id: reference.id,
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }) as DocumentData
      validate(record, name)
      await runTransaction(db, async (transaction) => {
        const target = slugRef(record.slug)
        if ((await transaction.get(target)).exists())
          throw new Error('이미 사용 중인 Slug입니다. 다른 주소를 입력해 주세요.')
        transaction.set(target, { collection: name, slug: record.slug, recordId: reference.id })
        transaction.set(reference, record)
      })
      return load(reference.id)
    },
    update: (id, input) => modify(id, input as Partial<T>),
    publish: (id) => modify(id, {}, 'published'),
    unpublish: (id) => modify(id, {}, 'draft'),
  }
}
