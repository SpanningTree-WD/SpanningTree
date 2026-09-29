import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  type DocumentSnapshot,
  type Firestore,
} from 'firebase/firestore'
import { validateMember, type Member, type MemberInput } from '../../models/people'
import { normalize } from './repositories'

function mapMember(snapshot: DocumentSnapshot): Member {
  return { ...(normalize(snapshot.data()) as Omit<Member, 'id'>), id: snapshot.id }
}

export function createMemberRepository(db: Firestore) {
  const members = collection(db, 'members')
  return {
    subscribe(next: (members: Member[]) => void, error: (failure: Error) => void) {
      return onSnapshot(members, (snapshot) => next(snapshot.docs.map(mapMember)), error)
    },
    async create(input: MemberInput) {
      const value = validateMember(input)
      const reference = doc(members)
      await setDoc(reference, {
        ...value,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return reference.id
    },
    async update(member: Member, input: MemberInput) {
      const value = validateMember(input)
      const reference = doc(members, member.id)
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(reference)
        if (!snapshot.exists())
          throw new Error('이미 삭제된 구성원입니다. 명단을 다시 확인해 주세요.')
        if (mapMember(snapshot).updatedAt !== member.updatedAt)
          throw new Error(
            '다른 관리자가 수정했습니다. 입력 내용을 확인한 뒤 수정을 취소하고 다시 열어 주세요.'
          )
        transaction.update(reference, { ...value, updatedAt: serverTimestamp() })
      })
    },
    async remove(member: Member) {
      await runTransaction(db, async (transaction) => {
        const reference = doc(members, member.id)
        const snapshot = await transaction.get(reference)
        if (!snapshot.exists()) return
        if (mapMember(snapshot).updatedAt !== member.updatedAt)
          throw new Error('다른 관리자가 수정했습니다. 삭제를 취소하고 최신 명단을 확인해 주세요.')
        transaction.delete(reference)
      })
    },
  }
}
