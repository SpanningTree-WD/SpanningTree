# GitHub 이미지·PDF 업로드 운영

## 사용 방법

1. `/admin`에서 글을 작성하고 **임시 저장**합니다.
2. **이미지·PDF 첨부 (선택)**을 열고 파일을 선택합니다.
3. **전송 중 → GitHub 저장 대기 → 사이트 배포 대기 → 배포 완료**를 기다립니다.
4. **글에 첨부**를 누른 뒤 글의 **임시 저장 / 변경사항 저장 / 공개하기**를 누릅니다.

이미지는 JPEG·PNG·WebP 8 MiB 이하, PDF는 20 MiB 이하입니다. 관리자 한 명당
한 번에 한 파일을 처리합니다. 대표 이미지는 교체되며 활동·수학 자료에는 PDF를
여러 개, 출판물에는 대표 PDF 한 개를 첨부할 수 있습니다. 다음 파일을 올리기 전에
완료된 파일을 글에 첨부하고 저장하세요. 첨부 해제 후에도 글을 저장해야 반영됩니다.
브라우저 전송이 끝난 후에는 창을 닫아도 처리되며 같은 계정으로 돌아오면 상태를 봅니다.

**파일은 공개 GitHub 저장소와 Firebase Hosting에 공개됩니다.** 글이 초안이어도,
나중에 비공개로 전환하거나 첨부를 해제해도 파일은 공개 상태입니다. 개인 자료나
비공개 문서는 올리지 마세요. 저장소에서 파일을 삭제해도 Git 이력에는 남습니다.

## 처리 구조

- 브라우저는 Firebase 로그인과 기존 `admins/{uid}` 권한을 사용합니다.
- `uploadRequests/{uid}`에 파일 정보, 하위 `chunks/{index}`에 512 KiB 단위 Bytes를
  잠시 저장합니다. 브라우저는 자기 요청만 읽고 쓰며 파일 조각은 읽을 수 없습니다.
  공개 방문자와 다른 관리자는 이 대기열에 접근할 수 없습니다.
- `.github/workflows/github-uploads.yml`이 5분 간격으로 실행됩니다. GitHub 사정에
  따라 실행이 지연될 수 있으므로 5분 이내 완료를 보장하지 않습니다.
- `scripts/uploads/worker.ts`는 관리자 권한·대상 글·크기·파일 헤더·SHA-256을
  다시 확인합니다. 승인된 파일만 `public/uploads/{sha256}.{확장자}`에 저장합니다.
  브라우저가 지정한 이름은 Git 경로에 사용하지 않습니다.
- 기존 Actions의 `GITHUB_TOKEN`이 파일을 커밋합니다. 이 토큰의 push는 다른
  push 워크플로를 시작하지 않으므로 업로드 작업에서 직접 빌드·Hosting 배포합니다.
- 실제 Hosting 파일의 바이트 수와 해시가 일치하면 임시 조각을 지우고 완료 처리합니다.
  글 자체는 수정하지 않습니다. 사용자가 편집 화면에서 첨부·저장을 선택합니다.
- 배포 실패·중단 시 다음 실행에서 재시도합니다. 같은 파일은 같은 경로를 사용하여
  중복 커밋하지 않습니다. 취소 및 1시간 이상 중단된 전송은 다음 실행에서 정리합니다.
- 일반 배포와 업로드 배포는 `firebase-production` 동시 실행 그룹을 공유합니다.

## 인프라 설정

Firebase Storage, Cloud Functions, 새 외부 계정, 개인 GitHub 토큰은 사용하지 않습니다.
Blaze 전환이나 결제 수단 등록도 하지 않습니다. GitHub 공개 저장소의 표준 실행기와
현재 Firebase 무료 할당량을 이용하므로 **무제한 저장·전송은 아닙니다**.

- 기존 Actions secret: `FIREBASE_SERVICE_ACCOUNT_SPANNINGTREE_MATH`
- 해당 배포 서비스 계정은 Hosting 권한에 더해 `roles/datastore.user`가 필요합니다.
  이 역할은 대기열뿐 아니라 **프로젝트 전체 Firestore 데이터 읽기·쓰기** 권한입니다.
  Admin SDK는 브라우저 보안 규칙을 우회하므로 저장소의 Actions 편집 권한과 secret을
  신뢰할 수 있는 운영자에게만 부여해야 합니다. IAM 권한 추가는 운영자가 승인합니다.
- Rules와 `chunks.data` 인덱스 제외를 함께 배포합니다:
  `npx firebase-tools@15.32.0 deploy --only firestore:rules,firestore:indexes --project spanningtree-math`
- 업로드 workflow에는 `contents: write`가 설정되어 있습니다. 조직 정책이나 main
  브랜치 보호가 bot의 직접 커밋을 금지한다면 운영 정책에 맞게 조정해야 합니다.
  이 기능은 그런 보호를 자동으로 해제하지 않습니다.

## 장애 대응과 인계

1. [GitHub file uploads 실행 기록](https://github.com/SpanningTree-WD/SpanningTree/actions/workflows/github-uploads.yml)을 확인합니다.
2. 지연되면 **Run workflow → main**으로 즉시 실행할 수 있습니다.
3. 권한 오류는 배포 계정의 Firestore 역할, 기존 secret, Actions의 contents 쓰기 권한을 확인합니다.
4. Hosting 실패는 Firebase 할당량과 build/deploy 로그를 확인합니다. 수정 후 재실행하면
   `committed` 파일부터 재개합니다. 처리 중인 요청의 state나 조각을 수동으로 지우지 마세요.
5. 공개 저장소는 활동이 60일 동안 없으면 예약 실행이 비활성화될 수 있습니다.
   새 학기에는 workflow 활성화 여부와 시험 업로드를 확인하세요. 비활성화된 동안에는
   전송 대기와 임시 조각 정리도 멈춥니다.
6. Firestore 저장 공간·읽기/쓰기, Hosting 저장 공간·다운로드 전송량, 저장소 전체 크기를
   주기적으로 확인합니다. 임시 파일은 성공·취소·실패 처리 후 제거되지만 최종 파일과
   Git 이력, Hosting 배포 버전은 누적됩니다. 장기 대용량 운영은 전용 파일 저장소로 이전하세요.

연도별 Web Developer는 기존 관리자 membership 등록만으로 업로드할 수 있습니다.
각 개발자가 별도 GitHub 토큰을 발급하거나 브라우저에 secret을 입력할 필요가 없습니다.
GitHub/Firebase 운영 권한 인계는 `docs/ADMIN.md`에 따라 별도로 진행합니다.

## 검증

`npm test`는 파일 검사, 관리자 화면, 서버의 권한 재검사·중복 방지·중단 복구·배포
바이트 확인을 테스트합니다. `npm run test:rules`는 에뮬레이터에서 소유자 격리,
크기 제한, 상태 위조 차단, chunk 잠금과 권한 회수를 검증합니다.

2026-09-29 운영 환경에서 점검용 PNG의 대기열 처리 → GitHub 커밋 → Hosting 배포 →
해시 확인 → 임시 조각 삭제까지 확인했습니다. 점검용 글과 요청, 최종 파일은 확인 후
정리했으며 공개 아카이브에 점검 글을 게시하지 않았습니다.

## 공식 문서

- [GitHub Contents API](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents)
- [예약 실행 주기·지연·비활성화](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
- [GITHUB_TOKEN과 후속 실행](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)
- [GitHub Actions 과금 범위](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [Firestore 무료 할당량](https://firebase.google.com/docs/firestore/quotas)
- [Firebase Hosting 할당량](https://firebase.google.com/docs/hosting/usage-quotas-pricing)
