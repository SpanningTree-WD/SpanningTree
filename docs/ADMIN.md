# Administrator guide

## Access

Open `/admin` and choose **Google로 로그인**. Only verified accounts whose UID is
enabled in the server-managed `admins` collection can edit. Signing in alone
does not grant permission. An unapproved account sees its email and UID; send
the UID to the club's project operator for approval. No shared password is used.

The login lasts for the browser session. Use **로그아웃** on shared computers.
Permission changes are observed while the page is open; revocation closes the
editor and Firestore/Storage independently deny subsequent private operations.
The first permission check requires a server connection.

## Annual Web Developer handoff

Keep `spanningtree.official@gmail.com` as the permanent club administrator.
Use each developer's own Google account; do not share the club password for
routine content editing.

1. Have the incoming developer sign in at `/admin` and provide the UID shown
   on the access-denied screen.
2. A trusted Firebase project operator checks that UID's email in
   Authentication → Users, then creates `admins/{UID}` in Firestore with
   `enabled: true` (boolean). An optional `email` string helps identify the record.
3. Verify that the new developer can open the editor and save a draft.
4. At handoff, set the outgoing developer's membership to `enabled: false`.
   Keep the club account enabled and retain its account recovery information.

Website membership grants content editing. Firebase Console and GitHub access
are managed separately by the club's project and repository owners. When handing
over infrastructure maintenance, review and transfer those permissions as well.
Membership changes do not require a code change or Hosting deployment.

## Editing

Activities, Mathematics, and Publications share the same workflow:

1. Select the content category and choose **새로 작성**.
2. Fill in the essential fields listed below. Categories are selected in Korean.
3. **임시 저장** stores a private draft in Firestore; **변경사항 저장** updates a published record.
4. **공개하기** asks for confirmation, saves the entered content, then publishes.
5. **비공개로 전환** returns the record to draft; it does not delete the record and
   does not save unsaved form changes.

| 종류 | 입력 항목 |
| --- | --- |
| 활동 | 제목, 활동 날짜, 활동 유형, 활동 내용 |
| 수학 자료 | 제목, 작성자, 작성 연도, 수학 분야, 자료 유형, 본문 |
| 출판물 | 제목, 저자, 발행 연도, 출판물 유형, 출판물 소개 |

수학 분야는 체크박스로 여러 개 선택할 수 있습니다. **새 분야 이름 → 분야 추가**로
원하는 분야/태그를 직접 입력할 수 있으며, 추가한 이름은 자동으로 선택됩니다.
예시 이름을 고정 목록에 추가하지 않습니다. 한 글에는 1~16개 분야를 선택할 수 있고
분야 이름은 1~100자입니다. 빈 이름·중복 입력은 차단하며 기존 분류 이름도 유지합니다.
분야 추가/선택 해제는 **글 저장 후** 반영됩니다. 다른 저장된 글(관리자에게 보이는
초안 포함)에서 사용한 분야는 다음 편집 시 선택 목록에 함께 나타납니다. 별도의 전역
태그 관리 목록이 아니라 저장된 글의 분야를 재사용하므로, 모든 글에서 제거한 사용자
분야는 이후 추천 목록에도 나타나지 않습니다. 공개 필터·검색은 공개 글의 분야만 사용합니다.

연도는 올해로 미리 채워집니다. 작성자와 저자가 여러 명이면 쉼표로 구분합니다.
수학 본문은 마크다운과 수식을 지원하며 미리보기를 제공합니다.

새 자료의 주소와 목록용 요약, 이미지 설명은 자동으로 생성합니다. 요약은 본문
앞부분에서 가져오며 본문 수정 시 함께 갱신됩니다. 기존에 별도로 작성한 요약과
이미지 설명은 보존합니다. 태그, 관련 자료, 편집자, 파일 정보는 입력 화면에서
제외했지만 기존 저장값은 유지됩니다. 새 활동은 공개하면 홈 화면의 최근 활동에도
표시됩니다. 기존 활동의 홈 표시 설정은 바뀌지 않습니다.

Saving changes to an already published record updates the public record.
There is no separate working revision of published content in this version.
Mathematics uses Markdown and the existing KaTeX preview.

Saved edits are available on other devices. Public pages use these records
only in Firebase mode; the dashboard warns when the public site is still a
local fixture preview. No admin write is stored only in localStorage.

URLs are generated once with a unique identifier and reserved transactionally,
including for drafts. Editing a title does not change the URL. Existing URLs and
relationships are preserved; the simplified editor does not expose their IDs.

If another editor saves the same record, a stale save is rejected. Copy your
unsaved text, reload, and reconcile the changes. Network/permission failures
show an error instead of a successful save. Reloading or closing a dirty editor
warns before leaving; internal-navigation protection is still future work.

## Files and limits

**이미지·PDF 첨부 (선택)**에서 JPEG·PNG·WebP(8 MiB 이하), PDF(20 MiB 이하)를
올릴 수 있습니다. 글을 먼저 임시 저장한 뒤 파일을 선택하고, 배포 완료 후
**글에 첨부 → 저장**을 누르세요. GitHub Actions가 5분 간격으로 확인하며 지연될 수
있습니다. 기존 Google 관리자 계정으로 사용하며 GitHub 토큰은 입력하지 않습니다.

파일은 **공개 GitHub 저장소와 Hosting에 공개**됩니다. 글을 비공개로 바꾸거나
첨부를 해제해도 파일은 남습니다. [업로드 운영 안내](GITHUB_UPLOADS.md)에
처리 상태, 실패 시 재시도, 예약 작업 재활성화, 할당량과 인계 절차가 있습니다.

Content deletion, revision history, and automatic local-prototype import are
also not implemented.
