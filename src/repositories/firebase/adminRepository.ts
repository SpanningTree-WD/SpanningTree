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
  type Transaction,
} from 'firebase/firestore'
import type { AdminRepository } from '../contracts'
import { normalize } from './repositories'
import { MAX_MATHEMATICS_FIELDS } from '../../models/mathematicsFields'
import { validateAuthoring } from '../../models/authoring'
import type { Activity } from '../../models/activity'
import type { Mathematics } from '../../models/mathematics'
import { effectiveActivityIds, linkedMathematics } from '../../models/contentRelations'

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
      ([key]) => !['id', 'status', 'createdAt', 'updatedAt', 'publishedAt', 'relationBaseline'].includes(key)
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
  validateAuthoring(record)
  if (typeof record.title !== 'string' || !record.title.trim())
    throw new Error('제목을 입력해 주세요.')
  if (
    typeof record.slug !== 'string' ||
    record.slug.length > 160 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.slug)
  )
    throw new Error('자료 주소 형식이 올바르지 않습니다. 사이트 운영자에게 문의해 주세요.')
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
  if (name === 'mathematics' && record.fields !== undefined) {
    const fields: unknown = record.fields
    if (
      !Array.isArray(fields) ||
      fields.length === 0 ||
      fields.length > MAX_MATHEMATICS_FIELDS ||
      fields.some((field) => typeof field !== 'string' || !field.trim() || field.length > 100) ||
      new Set(fields).size !== fields.length ||
      fields[0] !== record.field
    )
      throw new Error('수학 분야를 한 개 이상 올바르게 선택해 주세요.')
  }
}

export function createFirebaseAdminRepository<T extends RecordBase>(
  db: Firestore,
  name: CollectionName
): AdminRepository<T> {
  const records = collection(db, name)
  const slugRef = (slug: string) => doc(db, 'contentSlugs', name + ':' + slug)

  async function graph() {
    const [activities, mathematics] = await Promise.all([
      getDocsFromServer(collection(db, 'activities')), getDocsFromServer(collection(db, 'mathematics')),
    ])
    return { activities: activities.docs.map(snapshot => mapRecord<Activity>(snapshot)), mathematics: mathematics.docs.map(snapshot => mapRecord<Mathematics>(snapshot)) }
  }
  async function hydrate(record: T): Promise<T> {
    if (name === 'publications') return record
    const data = await graph()
    if (name === 'activities') {
      const related = linkedMathematics(record as unknown as Activity, data.mathematics)
      return { ...record, relatedMathematics: related, relationBaseline: related }
    }
    return { ...record, relatedActivities: effectiveActivityIds(record as unknown as Mathematics, data.activities) }
  }
  async function relationWrites(transaction: Transaction, next: DocumentData, input: DocumentData, data: Awaited<ReturnType<typeof graph>> | undefined) {
    const writes: (() => void)[] = []
    if (!data) return writes
    if (name === 'mathematics') {
      const ids = input.relatedActivities ?? effectiveActivityIds(next as Mathematics, data.activities)
      if (!Array.isArray(ids) || ids.length > 100 || ids.some(id => typeof id !== 'string')) throw new Error('관련 활동을 확인해 주세요.')
      const chosen = await Promise.all(ids.map(id => transaction.get(doc(db, 'activities', id))))
      if (chosen.some(snapshot => !snapshot.exists())) throw new Error('연결하려는 글이 삭제되었습니다. 목록을 다시 확인해 주세요.')
      next.relatedActivities = [...new Set(ids)]
      next.relationshipVersion = 2
    }
    if (name === 'activities' && Array.isArray(input.relatedMathematics)) {
      const desired = [...new Set(input.relatedMathematics as string[])]
      if (desired.length > 100) throw new Error('관련 글은 최대 100개까지 선택해 주세요.')
      const candidates = [...new Set([...desired, ...linkedMathematics(next as Activity, data.mathematics), ...(input.relationBaseline ?? [])])]
      const snapshots = await Promise.all(candidates.map(id => transaction.get(doc(db, 'mathematics', id))))
      const current = snapshots.filter(snapshot => snapshot.exists()).map(snapshot => mapRecord<Mathematics>(snapshot))
      const original = data.activities.find(activity => activity.id === next.id) ?? { ...(next as Activity), relatedMathematics: [] }
      const latest = linkedMathematics(original, current).sort()
      if (input.relationBaseline && JSON.stringify([...input.relationBaseline].sort()) !== JSON.stringify(latest))
        throw new Error('다른 관리자가 관련 글을 변경했습니다. 입력 내용을 보관한 뒤 다시 불러와 주세요.')
      for (const id of desired) if (!current.some(math => math.id === id)) throw new Error('연결하려는 글이 삭제되었습니다. 목록을 다시 확인해 주세요.')
      for (const snapshot of snapshots) {
        if (!snapshot.exists()) continue
        const math = mapRecord<Mathematics>(snapshot)
        const previous = effectiveActivityIds(math, data.activities)
        const ids = [...new Set([...previous.filter(id => id !== next.id), ...(desired.includes(math.id) ? [next.id] : [])])]
        if (JSON.stringify([...previous].sort()) !== JSON.stringify([...ids].sort()) || (math.relationshipVersion !== 2 && desired.includes(math.id))) {
          writes.push(() => transaction.update(snapshot.ref, { relatedActivities: ids, relationshipVersion: 2, updatedAt: serverTimestamp() }))
        }
      }
      // New relationships are stored only on Mathematics. This legacy field is read-only during migration.
      next.relatedMathematics = []
    }
    return writes
  }


  async function load(id: string) {
    const snapshot = await getDocFromServer(doc(records, id))
    if (!snapshot.exists()) throw new Error('자료가 존재하지 않습니다.')
    return hydrate(mapRecord<T>(snapshot))
  }

  async function modify(id: string, input: Partial<T> = {}, status?: 'draft' | 'published') {
    const reference = doc(records, id)
    const relations = name === 'mathematics' || (name === 'activities' && 'relatedMathematics' in input) ? await graph() : undefined
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
      const relatedWrites = await relationWrites(transaction, next, input, relations)
      validate(next, name)
      const target = slugRef(next.slug)
      const claim = await transaction.get(target)
      if (claim.exists() && claim.data().recordId !== id)
        throw new Error('이미 사용 중인 자료 주소입니다. 사이트 운영자에게 문의해 주세요.')
      if (next.slug !== current.slug) {
        const previous = await transaction.get(slugRef(current.slug))
        if (previous.exists() && previous.data().recordId === id) transaction.delete(previous.ref)
      }
      transaction.set(target, { collection: name, slug: next.slug, recordId: id })
      transaction.set(reference, next)
      relatedWrites.forEach(write => write())
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
      return snapshot.exists() ? hydrate(mapRecord<T>(snapshot)) : null
    },
    async create(input, reservedId) {
      const reference = reservedId && /^[a-f0-9-]{36}$/.test(reservedId) ? doc(records, reservedId) : doc(records)
      const relations = name === 'publications' ? undefined : await graph()
      const record = withoutUndefined({
        ...editableInput(input),
        id: reference.id,
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }) as DocumentData
      validate(record, name)
      await runTransaction(db, async (transaction) => {
        if ((await transaction.get(reference)).exists()) throw new Error('이미 존재하는 글입니다. 다시 불러와 주세요.')
        const target = slugRef(record.slug)
        if ((await transaction.get(target)).exists())
          throw new Error('이미 사용 중인 자료 주소입니다. 사이트 운영자에게 문의해 주세요.')
        const relatedWrites = await relationWrites(transaction, record, input, relations)
        transaction.set(target, { collection: name, slug: record.slug, recordId: reference.id })
        transaction.set(reference, record)
        relatedWrites.forEach(write => write())
      })
      return load(reference.id)
    },
    update: (id, input) => modify(id, input as Partial<T>),
    publish: (id) => modify(id, {}, 'published'),
    unpublish: (id) => modify(id, {}, 'draft'),
  }
}
