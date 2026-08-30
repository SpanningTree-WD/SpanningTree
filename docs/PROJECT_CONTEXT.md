# Spanning Tree Website — Project Context

## Spanning Tree

Spanning Tree는 서울과학고등학교의 대학수학 학습 동아리이다.

부원들이 대학수학의 여러 분야를 장기적으로 공부하고,
강연·포럼·교류·집필 등의 활동을 통해 지식을 공유하며,
그 결과를 다음 세대에 축적하는 것을 중요하게 생각한다.

## Website Purpose

Spanning Tree Website는 다음 네 가지 역할을 동시에 한다.

1. Official Website
2. Activity Portfolio
3. Long-term Archive
4. Mathematics Library

외부 방문자는 사이트를 통해 다음을 알 수 있어야 한다.

- Spanning Tree가 어떤 동아리인지
- 어떤 활동을 해왔는지
- 어떤 수학을 공부하는지
- 어떤 수학적 결과물과 자료를 만들어왔는지

사이트는 단순한 홍보 페이지가 아니라,
여러 세대에 걸쳐 활동과 수학 자료가 축적되는 archive여야 한다.

## Main Sections

### Main

- Spanning Tree 소개
- Featured Activities
- Latest Mathematics
- Publications

### About

- 동아리 소개
- 활동 철학
- History
- 주요 활동 방식

### People

- 동아리 구성원
- 학년/세대
- 향후 mentor-mentee 관계 표현 가능

### Activities

예:
- Internal Lecture
- Forum
- External Exchange
- Mini Lecture Day
- Integration Bee
- Workshop
- 기타 프로젝트

### Mathematics

수학 자료 archive.

가능한 자료 종류:
- Lecture Note
- Article
- Problem Set
- Poster
- Slides

가능한 분야:
- Algebra
- Analysis
- Number Theory
- Combinatorics
- Geometry
- Topology
- Probability
- Other

### Publications

예:
- Spanning Tree Notes
- Books
- Proceedings
- Reports
- Article Collections

## Content Relationships

Activity, Mathematics, Publication은 서로 연결될 수 있다.

예:

KSA × Spanning Tree Forum
→ 발표 자료
→ Lecture Note
→ Article
→ Proceedings

수학 자료에서도 자신이 발표된 Activity나
수록된 Publication으로 이동할 수 있어야 한다.

## Editing Requirement

사이트 콘텐츠는 향후 `/admin`을 통해 수정할 수 있어야 한다.

인증된 동아리 구성원은 다음 작업을 할 수 있어야 한다.

- 새 콘텐츠 생성
- 콘텐츠 수정
- draft 저장
- publish / unpublish
- 이미지 업로드
- PDF 업로드
- metadata 수정

## Infrastructure

동아리 공용 Google 계정으로 Firebase project가 이미 생성되어 있다.

Firebase의 예상 역할:

- Firebase Hosting: 웹사이트 hosting
- Firebase Authentication: 관리자 인증
- Cloud Firestore: 콘텐츠와 metadata 저장
- Firebase Storage: 이미지와 PDF 파일

GitHub Organization은 source code,
version history, 협업을 담당한다.

## Long-term Principle

사이트는 특정 한 학생에게 의존해서는 안 된다.

후배 Web Developer가 이전 개발자의 직접적인 설명 없이도
기본적인 수정과 운영을 할 수 있어야 한다.
