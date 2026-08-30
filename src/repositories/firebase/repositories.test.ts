import { describe, expect, it } from 'vitest'
import type { QueryDocumentSnapshot } from 'firebase/firestore'
import { mapFirestoreRecord } from './repositories'

function snapshot(data: object) {
  return { id: 'math-one', data: () => data, ref: { path: 'mathematics/math-one' } } as QueryDocumentSnapshot
}

describe('Firestore model mapping', () => {
  it('maps SDK timestamps to application ISO strings', () => {
    const record = mapFirestoreRecord<{ id: string; slug: string; status: 'published'; updatedAt: string }>(snapshot({
      slug: 'mapped-record', status: 'published', updatedAt: { toDate: () => new Date('2026-01-02T03:04:05Z') },
    }))
    expect(record).toEqual({ id: 'math-one', slug: 'mapped-record', status: 'published', updatedAt: '2026-01-02T03:04:05.000Z' })
  })

  it('refuses to expose a draft even if an adapter receives one unexpectedly', () => {
    expect(() => mapFirestoreRecord(snapshot({ slug: 'draft-record', status: 'draft' }))).toThrow('Invalid published document')
  })
})
