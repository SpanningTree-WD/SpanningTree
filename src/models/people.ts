export interface MemberInput {
  name: string
  generation: number
  isLeader: boolean
}

export interface Member extends MemberInput {
  id: string
  createdAt: string
  updatedAt: string
}

export function validateMember(input: MemberInput): MemberInput {
  const name = input.name.trim()
  if (!name || name.length > 40) throw new Error('이름을 1~40자로 입력해 주세요.')
  if (!Number.isInteger(input.generation) || input.generation < 1 || input.generation > 999)
    throw new Error('기수는 1~999 사이의 정수로 입력해 주세요.')
  if (typeof input.isLeader !== 'boolean') throw new Error('학년 장 여부를 확인해 주세요.')
  return { name, generation: input.generation, isLeader: input.isLeader }
}

export function groupMembers(members: readonly Member[]) {
  const generations = [...new Set(members.map((member) => member.generation))].sort((a, b) => a - b)
  return generations.map((number) => ({
    number,
    members: members
      .filter((member) => member.generation === number)
      .sort((a, b) => a.name.localeCompare(b.name, 'ko') || a.id.localeCompare(b.id)),
  }))
}
