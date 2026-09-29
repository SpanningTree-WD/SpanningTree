// Keep canonical links and generated search files on the same production origin.
export const site = {
  origin: 'https://spanningtree-math.web.app',
  title: '스패닝트리(Spanning Tree) | 서울과학고등학교 수학 동아리',
  description: '서울과학고등학교 수학 동아리 스패닝트리(Spanning Tree)의 활동 기록, 대학수학 강의 노트, 수학 자료와 출판물을 제공합니다.',
} as const

export const publicPages: Record<string, { title: string; description: string }> = {
  '/': { title: site.title, description: site.description },
  '/about': {
    title: '동아리 소개 | 스패닝트리',
    description: '서울과학고등학교 수학 동아리 스패닝트리를 소개합니다. 대학수학 학습, 강연과 포럼, 교류 활동 및 자료 집필을 통해 수학을 함께 공부합니다.',
  },
  '/people': {
    title: '구성원 | 스패닝트리',
    description: '서울과학고등학교 수학 동아리 스패닝트리의 기수별 구성원을 소개합니다.',
  },
  '/activities': {
    title: '활동 기록 | 스패닝트리',
    description: '스패닝트리의 강연, 수학 포럼, 학교 간 교류와 프로젝트 활동 기록을 살펴보세요.',
  },
  '/mathematics': {
    title: '수학 자료 | 스패닝트리',
    description: '스패닝트리 부원들이 작성한 대학수학 강의 노트, 수학 글, 문제 모음과 발표 자료를 분야별로 제공합니다.',
  },
  '/publications': {
    title: '출판물 | 스패닝트리',
    description: '스패닝트리의 수학 책, 강의 노트 모음, 포럼 자료집과 보고서를 소개합니다.',
  },
}
