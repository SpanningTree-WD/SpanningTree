import { initialMembers } from '../content/people'
import type { Member, MemberInput } from '../models/people'
import { getFirebaseServices } from '../services/firebase/firebase'
import { createMemberRepository } from './firebase/memberRepository'

const repository = () => createMemberRepository(getFirebaseServices().firestore)
export const memberRepository = {
  subscribe: (next: (members: Member[]) => void, error: (failure: Error) => void) =>
    repository().subscribe(next, error),
  create: (input: MemberInput) => repository().create(input),
  update: (member: Member, input: MemberInput) => repository().update(member, input),
  remove: (member: Member) => repository().remove(member),
}

export function watchPublicMembers(
  next: (members: Member[]) => void,
  error: (failure: Error) => void
) {
  if ((import.meta.env.VITE_PUBLIC_DATA_SOURCE || 'local') === 'local') {
    next(initialMembers)
    return () => {}
  }
  return memberRepository.subscribe(next, error)
}
