# 구성원 명단

공개 People 페이지는 Firestore의 `members` 컬렉션을 실시간으로 읽습니다.
관리자 로그인 후 **구성원 명단**(`/admin/people`)에서 다음 항목을 관리합니다.

- 이름
- 기수 (새 기수를 입력하면 공개 페이지에 해당 층이 자동으로 생깁니다.)
- 학년 장 여부 (두꺼운 초록색 테두리)

구성원 추가·수정은 저장 즉시 공개됩니다. 삭제는 확인 후 실행합니다.
명단은 기수 오름차순, 기수 안에서는 이름 가나다순으로 정렬합니다.
기수별 원형 명단 배치는 유지하고 동기·멘토링 연결선과 과목 범례는 표시하지 않습니다.
좁은 화면에서는 같은 기수의 이름이 다음 줄로 이어집니다.

초기 명단은 36기 9명, 37기 7명, 38기 7명입니다. 송정한은 36기이며,
이현준(36기), 이승준(37기), 심성진(38기)이 학년 장으로 등록됩니다.
`src/content/people.ts`는 최초 가져오기와 로컬 미리보기에만 사용합니다.
운영 명단을 바꿀 때 이 파일을 수정하거나 재배포할 필요가 없습니다.
운영 DB가 비어 있어도 초기 명단을 자동으로 복구하지 않으므로 삭제가 되돌아오지 않습니다.

## 데이터와 권한

- `src/models/people.ts`: 모델, 입력 검증, 기수별 정렬
- `src/repositories/firebase/memberRepository.ts`: Firestore 구독과 저장·삭제
- `src/repositories/memberRepository.ts`: 공개 로컬/운영 전환, 관리자 저장 연결
- `src/features/people/PeoplePage.tsx`: 공개 화면
- `src/features/admin/PeopleAdminPage.tsx`: 관리자 화면

공개 읽기는 허용하되, 쓰기는 기존 승인 관리자에게만 허용합니다.
`members`는 `admins`와 별개의 컬렉션입니다. 학년 장 체크는 로그인/편집 권한을 주지 않습니다.
문서 ID로 사람을 구분하므로 동명이인을 등록할 수 있습니다.
수정과 삭제는 트랜잭션에서 마지막 수정 시각을 확인하여 다른 관리자의 변경을 덮어쓰지 않습니다.

## 최초 가져오기

현재 운영 명단은 이미 초기화되어 있습니다. 이후에는 관리자 화면을 이용하세요.
새 환경에서 같은 초기 명단을 가져와야 한다면 검토 후 ADC 자격 증명을 설정하고,
`GOOGLE_CLOUD_PROJECT=spanningtree-math`, `CONFIRM_MEMBER_IMPORT=spanningtree-math`를
지정한 뒤 `npx tsx scripts/seed-members.ts`를 실행할 수 있습니다.
컬렉션에 구성원이 하나라도 있으면 가져오기를 중단합니다.
Firebase 규칙은 Hosting 배포와 별도로 `firestore:rules`를 배포해야 합니다.
