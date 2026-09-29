# Cloudflare로 업로드 즉시 처리 요청

## 현재 상태

2026-09-29에 동아리 공용 계정 `spanningtree.official@gmail.com`으로 Worker를 배포했습니다.
공개 주소는 `https://spanningtree-upload-trigger.spanning-tree-website.workers.dev/trigger`입니다.
GitHub 실행 전용 `GITHUB_DISPATCH_TOKEN`이 Secret으로 등록되어 있으며, 운영 사이트 빌드에
Worker 주소가 반영된 것을 확인했습니다. CORS 연결과 인증 없는 요청(401), 잘못된 Firebase
토큰(403) 거부도 실제 서버에서 확인했습니다. 인증된 관리자의 실제 업로드로
[즉시 실행과 배포 성공](https://github.com/SpanningTree-WD/SpanningTree/actions/runs/36555954784)을
확인했습니다. 전송한 PNG 54,001바이트는 Hosting 응답 200, 원본 크기·SHA-256 일치,
대기열 `complete`, 남은 임시 조각 0개까지 검증했습니다.
사이트에 결제 수단이나 Blaze 설정을 추가할 필요는 없습니다.

## 동작

1. 브라우저가 기존 Firestore 대기열로 파일을 전송한 뒤 `queued` 상태로 바꿉니다.
2. Firebase ID 토큰과 자기 UID·요청 ID만 Worker `/trigger`로 보냅니다. 파일 바이트는
   Cloudflare에 보내지 않습니다. 브라우저에 GitHub 토큰을 넣지 않습니다.
3. Worker가 그 ID 토큰으로 Firestore의 **자기 업로드 요청**을 읽습니다. 기존 보안
   규칙이 서명·프로젝트·이메일 인증·현재 관리자 권한·소유자를 확인하므로 Cloudflare에
   Firebase 서비스 계정이나 추가 IAM 권한을 부여하지 않습니다.
4. 유효한 대기 중 요청이면 고정된 `SpanningTree-WD/SpanningTree` 저장소의
   `github-uploads.yml`, `main` 실행만 요청합니다. 다른 저장소·브랜치·명령을 받지 않습니다.
5. 기존 Actions가 저장과 배포를 처리합니다. **예약까지의 대기는 없어지지만 GitHub
   실행 대기와 빌드·배포 시간은 남습니다.** 실패하면 파일은 대기열에 유지되고 기존
   예약 작업이 다시 처리합니다. 관리자 화면의 **지금 처리 요청**으로도 재시도합니다.

공식 운영 도메인 두 개만 CORS를 허용합니다. 사용자별 요청 제한은 Cloudflare 위치별
분당 2회입니다. 이 제한은 전역의 정확한 횟수 보장이 아니며 관리자 인증을 대체하지
않습니다. 로그에 토큰이나 upstream 응답 본문을 남기지 않습니다.

## 최초 연결

1. [Cloudflare](https://dash.cloudflare.com/sign-up)에서 동아리 공용 이메일로 가입하고
   이메일을 인증합니다. Workers Free를 사용하며 유료 플랜에 가입하지 않습니다.
2. 공식 Wrangler로 해당 계정에 연결합니다:
   `npx --yes wrangler@4.143.0 login --scopes account:read user:read workers_scripts:write`
   브라우저에서 계정과 요청 권한을 확인하고 승인합니다. 기존 로그인은
   `npx --yes wrangler@4.143.0 whoami`로 확인합니다. Wrangler가 다른 기본 권한이 없다고
   경고해도 이 Worker 배포에는 위 세 범위면 충분합니다. `wrangler.jsonc`의 계정 ID는
   동아리 공용 계정으로 고정되어 있습니다.
3. `npm run worker:deploy`로 `spanningtree-upload-trigger`를 배포합니다.
   첫 계정에서는 사용할 `workers.dev` 하위 도메인을 설정해야 할 수 있습니다.
4. GitHub에서 실행 전용 fine-grained PAT를 발급합니다. Resource owner는 이 저장소의
   소유자를 선택하고, Repository access는 **SpanningTree만**, Repository permissions는
   **Actions: Read and write**로 제한합니다. Contents 쓰기 권한은 필요하지 않습니다.
   조직 정책상 승인이 필요하면 소유자가 승인합니다. 만료일을 정하고 인계 문서에 기록합니다.
5. 토큰은 **Cloudflare Worker → Settings → Variables and Secrets**에서 **Secret**
   `GITHUB_DISPATCH_TOKEN`으로 등록하거나 다음 대화형 명령에 직접 입력합니다:
   `npx --yes wrangler@4.143.0 secret put GITHUB_DISPATCH_TOKEN --config workers/upload-trigger/wrangler.jsonc`
   토큰을 채팅, `.env`의 VITE 변수, GitHub 저장소, 문서, 일반 Text 변수에 넣지 않습니다.
   Worker는 토큰으로 Actions를 실행할 수 있으므로 이 secret과 Worker 편집 권한은
   신뢰할 수 있는 운영자에게만 부여합니다.
6. 운영 workflow에는 위의 공개 Worker 주소가 기본값으로 들어 있습니다. 다른 주소로
   옮길 때만 GitHub 저장소의 **Settings → Secrets and variables → Actions → Variables**에
   `VITE_UPLOAD_TRIGGER_URL`을 등록합니다. 값은 배포 결과의 실제 주소 끝에 `/trigger`를
   붙인 `https://spanningtree-upload-trigger.<계정>.workers.dev/trigger`입니다.
7. Firebase Hosting live를 다시 실행해 주소를 프런트엔드 빌드에 반영합니다.
   URL은 공개 설정입니다. 현재 live·업로드 배포 workflow가 이 변수를 읽습니다.
   PR 미리보기는 CORS 범위를 넓히지 않고 기존 예약 처리를 사용합니다.
8. 승인된 관리자 계정으로 작은 파일을 업로드하고 GitHub의 `workflow_dispatch`
   실행·Hosting 배포·완료 상태까지 확인합니다. 인증 없는 직접 호출은 거부되어야 합니다.

## 유지 관리

- Cloudflare와 GitHub 작업은 무료 사용량 범위 안에서 운영합니다. 무료 한도는 무제한이
  아니며 계정의 사용량을 확인합니다. 이 코드는 유료 플랜 가입이나 업그레이드를 수행하지 않습니다.
- GitHub PAT 만료 전 갱신하고 Cloudflare Secret을 교체합니다. 만료돼도 예약 작업은
  기존 Actions 자체 토큰으로 동작하므로 파일이 사라지지 않습니다.
- 즉시 실행만 끄려면 GitHub 변수 `VITE_UPLOAD_TRIGGER_URL`을 `disabled`로 설정하고
  Hosting을 다시 배포합니다. 변수를 삭제하면 workflow의 기본 Worker 주소로 돌아갑니다.
  로컬 개발에서는 빈 값도 예약 처리만 사용합니다.
- Worker 수정은 `npm run worker:deploy`로 배포합니다. 웹사이트 GitHub push만으로
  Cloudflare 코드가 자동 배포되는 구조는 아닙니다. Cloudflare 배포 자격 증명을
  GitHub에 추가로 복사하지 않기 위한 선택입니다.
- `npm test`에 Worker 인증·소유자·상태·CORS·입력 제한·호출 제한과 클라이언트
  즉시 실행 실패 시 기존 대기열 유지 테스트가 포함됩니다. `npm run build`는 Worker도
  타입 검사하며 `wrangler deploy --dry-run`으로 Cloudflare 번들을 확인할 수 있습니다.
- Worker의 외부 요청에는 `redirect: 'manual'`을 쓰고 3xx 응답을 실패로 처리합니다.
  Cloudflare 런타임은 Node와 달리 `redirect: 'error'`를 거절하므로 이를 바꾸지 마세요.
  어떤 경우에도 리디렉션 목적지로 인증 정보를 전달하지 않습니다.

## 참고

- [Firestore REST와 ID 토큰](https://firebase.google.com/docs/firestore/use-rest-api)
- [GitHub workflow dispatch 권한](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event)
- [Cloudflare Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Workers 무료 사용량](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare Rate Limiting 바인딩](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
