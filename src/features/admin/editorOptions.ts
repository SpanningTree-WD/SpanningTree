import type { Choice } from './EditorFields'

export const activityTypes: readonly Choice[] = [
  ['Internal Lecture', '내부 강연'],
  ['Forum', '포럼'],
  ['Mini Lecture', '미니 강연'],
  ['Competition', '대회'],
  ['Exchange', '교류'],
  ['Workshop', '워크숍'],
  ['Other', '기타'],
]
export const mathematicsTypes: readonly Choice[] = [
  ['Lecture Note', '강의 노트'],
  ['Article', '글'],
  ['Problem Set', '문제 모음'],
  ['Poster', '포스터'],
  ['Slides', '발표 자료'],
]
export const mathematicsFields: readonly Choice[] = [
  ['Algebra', '대수학'],
  ['Analysis', '해석학'],
  ['Number Theory', '정수론'],
  ['Combinatorics', '조합론'],
  ['Geometry', '기하학'],
  ['Topology', '위상수학'],
  ['Probability', '확률론'],
  ['Other', '기타'],
]
export const publicationTypes: readonly Choice[] = [
  ['Book', '책'],
  ['Report', '보고서'],
  ['Proceedings', '학술 자료집'],
  ['Note', '노트'],
]
