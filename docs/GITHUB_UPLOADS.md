# GitHub 이미지·PDF 업로드 운영

## 사용 방법

1. 글 작성 화면의 **이 글의 사진·파일**에서 대표 이미지나 PDF를 선택합니다.
   새 글도 먼저 저장할 필요가 없습니다. 선택한 파일은 현재 편집 세션 안에만 보관됩니다.
2. **미리보기**를 누르면 실제 게시 화면과 같은 레이아웃에서 본문·대표 이미지·기존
   첨부를 확인할 수 있습니다. 새 PDF의 파일명과 저장 대기 상태는 첨부 목록에서 확인합니다.
3. **임시 저장 / 변경사항 저장 / 공개하기**를 누릅니다. 선택한 파일들을 순서대로
   전송하고 배포 완료를 확인한 뒤, 반환된 주소를 해당 글에 함께 저장합니다.
   처리에는 몇 분이 걸릴 수 있으므로 완료 안내가 나올 때까지 화면을 열어 두세요.
4. 실패하면 선택한 파일은 화면에 남습니다. **첨부 재시도 및 저장** 또는 저장 버튼으로
   재시도합니다. 이미 전송된 요청은 이어서 기다리며, 실패한 요청만 다시 전송합니다.
   공개하기 중 실패했다면 먼저 재시도하여 저장한 뒤 다시 공개하기를 누릅니다.

전송률은 서버가 확인한 바이트 기준입니다. 파일 준비 중에는 확정된 퍼센트를 표시하지
않습니다. 15분 동안 완료를 확인하지 못하면 오류와 재시도 버튼을 표시합니다.
관리자 한 명의 서버 처리 대기열은 여전히 하나이지만, 다른 글의 요청·파일명·취소
버튼은 현재 글에 표시하지 않습니다. 다른 작업이 처리 중이면 선택은 유지하고
처리가 끝난 후 저장을 재시도합니다.

이미지는 JPEG·PNG·WebP 8 MiB 이하, PDF는 20 MiB 이하입니다. 대표 이미지는 교체되며
활동·수학 자료에는 PDF 여러 개, 출판물에는 대표 PDF 한 개를 첨부할 수 있습니다.
미리보기와 작성 화면을 오가도 선택한 파일은 유지됩니다.

### 취소, 임시 저장과 파일 수명

- 저장 전 파일 선택·교체·첨부 해제는 현재 편집 세션에만 적용됩니다.
  **작성 취소**나 목록으로 돌아가기를 선택하면 확인 후 버리며, 기존 글은 바뀌지 않습니다.
  새 글이나 다른 글로 이동하면 파일·진행 상태·오류·미리보기 모드를 초기화합니다.
- 저장 전에는 서버에 파일을 전송하지 않습니다. 취소하거나 화면을 닫으면 로컬
  이미지 미리보기 주소를 해제하므로 불필요한 원격 임시 파일이 생기지 않습니다.
- 저장이 완료된 초안은 파일 주소도 함께 보존하며 다시 수정할 때 불러옵니다.
  새 글의 첫 저장은 대상 초안을 만든 후 첨부를 처리합니다. 첨부에 실패해도 같은
  초안 ID로 재시도하므로 중복 글을 만들지 않습니다.
- 저장/공개 요청 중에는 취소 버튼을 비활성화합니다. 강제 이동이나 창 닫기는 파일
  연결 저장을 중단할 수 있습니다. 이미 서버에 보낸 저장 요청은 취소할 수 없습니다.
  전송 중단 시 가능한 대기 요청만 정확한 글 ID·요청 ID로 취소합니다.
- 임시 파일 조각은 기존 작업자가 성공·실패·취소 후 정리하며, 한 시간 이상 중단된
  브라우저 전송도 다음 예약 실행에서 정리합니다. 이미 처리 중인 파일은 안전하게
  완료한 뒤 조각을 정리합니다. 작업자가 정지하면 정리도 지연됩니다.
- 첨부 해제는 저장할 글의 참조만 지웁니다. 같은 해시 주소를 다른 글이나 본문에서
  사용할 수 있으므로 최종 파일을 직접 삭제하지 않습니다.

**파일은 공개 GitHub 저장소와 Firebase Hosting에 공개됩니다.** 초안 저장을 시작해
전송한 최종 파일은 이후 비공개 전환이나 첨부 해제 후에도 공개 상태입니다.
저장소에서 삭제해도 Git 이력에는 남습니다. 최종 파일의 자동 삭제는 공유 참조와
오래 열린 편집기의 저장을 안전하게 보호할 별도 수명 관리가 필요합니다.

## 처리 구조

즉시 실행을 위한 [Cloudflare 연결](CLOUDFLARE_UPLOAD_TRIGGER.md)이 설정되어 있습니다.
파일 전송 후 업로드 작업의 실행을 요청하며, GitHub 실행 대기와 빌드·배포 시간은 남습니다.
아래 5분 예약 작업은 장애 시 재시도와 임시 데이터 정리를 위해 유지합니다.

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
  글 자체는 수정하지 않습니다. 편집 화면의 저장 작업이 완료 주소를 받아 글에 연결합니다.
- 배포 실패·중단 시 다음 실행에서 재시도합니다. 같은 파일은 같은 경로를 사용하여
  중복 커밋하지 않습니다. 취소 및 1시간 이상 중단된 전송은 다음 실행에서 정리합니다.
- 일반 배포와 업로드 배포는 `firebase-production` 동시 실행 그룹을 공유합니다.

## 인프라 설정

기본 예약 처리에는 Firebase Storage, Cloud Functions, 새 외부 계정, 개인 GitHub 토큰이 필요하지 않습니다.
선택적인 즉시 실행은 Cloudflare 계정과 서버에 보관하는 GitHub 실행 전용 토큰을 사용합니다.
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
