# Google 검색 운영

대표 주소는 `https://spanningtree-math.web.app`입니다.
`src/content/site.ts`에서 대표 주소와 고정 페이지의 제목·설명을 관리합니다.
도메인을 변경할 때 이 설정과 Search Console 속성, 리디렉션을 함께 검토하세요.

## 구현

- 각 페이지는 `usePageMetadata`로 제목, 설명, canonical, robots를 갱신합니다.
  상세 페이지는 공개 글의 제목·요약을 사용합니다. 쿼리 매개변수는 canonical에서
  제외합니다. 글 주소가 바뀌면 페이지를 다시 마운트하여 이전 글의 내용과 메타데이터가
  새 주소에 남지 않게 합니다.
- 관리자, 내부 검색, 없는 글·주소, 읽기 실패 화면은 `noindex`입니다.
  관리자·검색에는 Firebase Hosting의 `X-Robots-Tag`도 적용합니다.
  이는 검색 제외 설정이며 접근 권한은 기존 Authentication/Firestore 규칙이 관리합니다.
- `npm run build` 마지막에 `dist/sitemap.xml`, `dist/robots.txt`를 생성합니다.
  Firebase 모드는 공개 REST 쿼리로 `status == published`인 글의 주소·수정일만 읽습니다.
  초안, 관리자, 검색 결과, 업로드 파일은 사이트맵에 넣지 않습니다.
  데이터 조회 실패 시 빌드를 실패시키며 불완전한 사이트맵으로 대체하지 않습니다.
  로컬 fixture 모드에서는 샘플 글을 제외하고 고정 공개 페이지만 포함합니다.
- `refresh-sitemap.yml`은 매일 03:23 KST에 실행하며 공개 주소·수정일이 달라진
  경우에만 다시 빌드하고 배포합니다. GitHub 예약 실행은 지연될 수 있습니다.
  즉시 갱신하려면 Actions → Refresh public sitemap → Run workflow를 사용하세요.
  코드 배포·파일 업로드 배포 때도 사이트맵을 새로 생성합니다.
- Preview 빌드에는 `VITE_SEO_NOINDEX=true`를 적용합니다. 이 값은 실제 배포에
  설정하지 마세요. 대표 주소는 preview 주소로 바꾸지 않습니다.

## Search Console

1. 동아리 공용 Google 계정으로 [Search Console](https://search.google.com/search-console)에
   로그인합니다.
2. URL 접두어 속성 `https://spanningtree-math.web.app/`을 추가합니다.
3. HTML 파일 또는 HTML 태그 방식으로 소유권을 확인합니다. 인증 파일을 사용하면
   제공된 이름·내용 그대로 `public/`에 저장하고 배포합니다.
   현재 동아리 계정의 공개 인증 태그는 `index.html`의 head에 저장되어 있습니다.
   인증이 완료된 후에도 이 태그를 유지해야 합니다. 이 공개 토큰은 비밀번호나
   API 인증 키가 아닙니다.
4. Sitemaps에서 `sitemap.xml`을 제출합니다.
5. 홈페이지·소개·대표 공개 글을 URL 검사하고 실제 URL 테스트에서 본문과 제목이
   보이는지 확인합니다. 필요한 URL에 색인 생성을 요청합니다.
6. 페이지 색인 생성 보고서와 실적의 검색어·노출·클릭을 확인합니다.
   사이트맵 제출이나 색인 요청은 등록·순위를 보장하지 않습니다.

## 글 작성

실제 주제를 드러내는 제목과 요약을 쓰세요. 수학 자료에는 대상 독자, 필요한 배경,
내용 개요와 저자를 적고 관련 활동·출판물을 연결하세요. 검색어를 반복하거나
빈 내용을 대량으로 만들지 않습니다. PDF와 함께 읽을 만한 웹페이지 설명을 제공합니다.

현재 본문은 브라우저에서 Firestore를 읽어 렌더링합니다. SSR/사전 렌더링은 이번
기본 검색 설정에 포함하지 않습니다. Search Console 실제 URL 테스트에서 본문이
빠지는 등 구체적인 문제가 확인되면 공개 페이지 사전 렌더링을 별도로 검토하세요.

공식 자료:
[JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics),
[사이트맵](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap),
[소유권 확인](https://support.google.com/webmasters/answer/9008080).
