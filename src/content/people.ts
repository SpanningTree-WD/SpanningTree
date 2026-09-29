import type { Member } from '../models/people'

// Initial import and local preview only. Production reads the members collection.
const generations = [
  {
    number: 36,
    names: [
      '이현준',
      '이준서',
      '황윤준',
      '한지승',
      '윤지원',
      '황서언',
      '임호준',
      '장민준',
      '송정한',
    ],
  },
  { number: 37, names: ['이승준', '이솔', '최정우', '이건우', '최준우', '이승혁', '김윤서'] },
  { number: 38, names: ['이지환', '윤지후', '김산하', '심성진', '심지용', '고호영', '김인호'] },
]
const leaders = new Set(['이현준', '이승준', '심성진'])
export const initialMembers: Member[] = generations.flatMap((generation) =>
  generation.names.map((name, index) => ({
    id: `member-${generation.number}-${String(index + 1).padStart(2, '0')}`,
    name,
    generation: generation.number,
    isLeader: leaders.has(name),
    createdAt: '2026-09-29T00:00:00.000Z',
    updatedAt: '2026-09-29T00:00:00.000Z',
  }))
)
