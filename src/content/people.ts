import type { MentoringGroup, PeopleGeneration } from '../models/people'

// Keep membership independent of mentoring roles: a mentee can be in any generation.
export const peopleGenerations: readonly PeopleGeneration[] = [
  {
    number: 36,
    members: ['이현준', '이준서', '황윤준', '한지승', '윤지원', '황서언', '임호준', '장민준'],
  },
  {
    number: 37,
    members: ['송정한', '이승준', '이솔', '최정우', '이건우', '최준우', '이승혁', '김윤서'],
  },
  {
    number: 38,
    members: ['이지환', '윤지후', '김산하', '심성진', '심지용', '고호영', '김인호'],
  },
]

// Each entry is a group relationship, not an inferred one-to-one assignment.
export const mentoringGroups: readonly MentoringGroup[] = [
  {
    id: 'discrete',
    subject: '이산수학',
    schedule: '화요일 · 자유',
    mentors: ['송정한', '이승준'],
    mentees: ['이지환', '윤지후', '김윤서'],
  },
  {
    id: 'linear-algebra',
    subject: '선형대수학',
    schedule: '화요일 · 자습',
    mentors: ['이현준', '이준서'],
    mentees: ['김산하', '이승혁'],
  },
  {
    id: 'topology',
    subject: '위상수학',
    schedule: '수요일 · 자습',
    mentors: ['이솔', '황윤준', '한지승'],
    mentees: ['심성진', '심지용'],
  },
  {
    id: 'analysis',
    subject: '해석학',
    schedule: '목요일 · 자유',
    mentors: ['최정우', '이건우'],
    mentees: ['장민준', '최준우'],
  },
  {
    id: 'abstract-algebra',
    subject: '추상대수학',
    schedule: '목요일 · 자습',
    mentors: ['윤지원', '황서언'],
    mentees: ['고호영', '김인호'],
  },
]

export function memberGeneration(name: string) {
  return peopleGenerations.find((generation) => generation.members.includes(name))?.number
}
