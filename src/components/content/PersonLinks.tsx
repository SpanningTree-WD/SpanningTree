import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Member } from '../../models/people'
import { watchPublicMembers } from '../../repositories/memberRepository'
export function PersonLinks({ ids = [], legacy = [] }: { ids?: string[]; legacy?: string[] }) {
  const [members, setMembers] = useState<Member[]>([])
  const hasPeople = ids.length > 0
  useEffect(() => {
    if (!hasPeople) return
    return watchPublicMembers(setMembers, () => setMembers([]))
  }, [hasPeople])
  const selected = ids.map(id => members.find(member => member.id === id)).filter((member): member is Member => !!member)
  const plain = legacy.filter(name => !selected.some(member => member.name === name))
  return <span className="person-links">{selected.map((member, index) => <span key={member.id}>{index > 0 && ', '}<Link to={'/people/' + encodeURIComponent(member.id)}>{member.name}</Link></span>)}{selected.length > 0 && plain.length > 0 && ', '}{plain.join(', ')}</span>
}
