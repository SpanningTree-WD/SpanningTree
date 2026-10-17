# Spanning Tree — Content Model

The following models are preliminary.
They may change as the website develops.

## Activity

- id
- slug
- title
- summary
- description
- date
- type
- coverImage
- gallery
- tags
- relatedMathematics
- relatedPublications
- status
- createdAt
- updatedAt

status:
- draft
- published

## Mathematics

- id
- slug
- title
- summary
- content
- authors
- field: 첫 번째 분야의 기존 문자열 값(호환용)
- fields?: 여러 분야/사용자 정의 태그의 문자열 목록
- type
- year
- tags
- coverImage
- attachments
- relatedActivities
- relatedPublications
- relatedMathematics
- status
- createdAt
- updatedAt
- publishedAt

Possible types:

- Lecture Note
- Article
- Problem Set
- Poster
- Slides

기존 `field`만 있는 수학 글은 그대로 읽고 편집합니다. 새로 선택한 분야는
`fields`에 저장하며 첫 값을 `field`에도 유지합니다. 사용자 정의 이름은 별도 컬렉션
없이 글에 저장하고 다른 관리자 편집 화면에서 재사용합니다. 목록·홈·상세·검색은
모든 분야를 표시하며 어느 분야로 필터링해도 해당 글을 찾을 수 있습니다.
기존 `tags` 키워드, 글 ID·slug·관련 자료·첨부 파일은 변경하지 않습니다.

## Publication

- id
- slug
- title
- summary
- description
- year
- type
- coverImage
- pdfUrl
- authors
- editors
- relatedActivities
- relatedMathematics
- status
- createdAt
- updatedAt

## Implemented uploaded media

`MediaReference` retains `alt`, `variant`, optional `caption`, and adds optional
`url` for a GitHub-uploaded JPEG/PNG/WebP file. `variant` remains the prototype
fallback when no image has been attached.

PDF attachment metadata is `{ label, fileName, mediaType, sizeLabel, url? }`.
Mathematics uses `attachments[]`; Activity adds optional `attachments[]`;
Publication uses optional `pdf` (the earlier `pdfUrl` proposal is not used).
Uploaded URLs are site-relative `/uploads/{sha256}.{extension}`. Files are public
independently of the parent record's publication status.

The private `uploadRequests/{uid}` processing model is separate from content.
See [GitHub upload operations](GITHUB_UPLOADS.md).

## Member (구성원)

`members/{id}`는 공개 명단이며 관리자 권한 목록인 `admins/{uid}`와 별개입니다.

- `name`: 이름, 1~40자
- `generation`: 기수, 1~999 정수
- `isLeader`: 학년 장 여부
- `createdAt`, `updatedAt`: 서버 Timestamp
- `id`: Firestore 문서 ID를 읽을 때 모델에 추가합니다. 이름과 별개이므로 동명이인을 지원합니다.

`/admin/people`에서 추가·수정·삭제하며 공개 페이지는 변경 사항을 실시간으로 읽습니다.
승인된 관리자만 쓸 수 있으며, 공개 명단에 개인정보나 관리자 권한을 저장하지 않습니다.
기수순·이름 가나다순으로 표시하고, 학년 장은 두꺼운 테두리로 구분합니다.

## Separation

UI code should not depend directly on Firestore document structure.

Create application-level types/models and a separate data/service layer.

## Browser-rendered diagrams

New diagrams live directly in `content` / `description` as fenced Markdown:

````markdown
```tikz caption="Figure 1" alt="An arrow from the origin"
\begin{tikzpicture}
\draw[->] (0,0) -- (2,1);
\end{tikzpicture}
```

```asymptote
size(160);
draw(unitcircle);
```
````

- Fence languages are `tikz`, `asymptote`, and the alias `asy` (case insensitive).
  Backtick and tilde fences follow Markdown rules, including quoted/list blocks.
- Optional `caption` and `alt` values use double-quoted JSON strings on the
  opening fence; escape embedded quotes as `\"`. Unknown attributes or invalid
  metadata leave an ordinary code block. Unclosed fences also stay as code.
- In the editor, source remains editable and a preview appears below each
  complete diagram fence after a short debounce. Public articles and article
  previews use the same rendering pipeline. To display a syntax example, wrap
  it in a longer fence labeled `markdown` or use `tex` for literal TeX code.
- Only Markdown source is persisted; derived IDs and rendered SVG are not added
  to article metadata. Rendering uses the existing isolated browser workers,
  sanitized SVG, source cache, 20,000-character source limit and timeout.
  An error is local to its diagram with a retry button; the source remains editable.
- Existing `{{diagram:ID}}` tokens and `diagrams[]` records remain supported.
  Records with `renderer: "browser-v1"` use their saved source and `sourceHash`;
  older records use their PNG `url`. Existing diagrams can still be edited with
  their original editor. No migration or rewrite happens on read.

## Editing images and citations

Image paste, drag-and-drop and file selection insert `{{asset:ID}}` at the current
cursor. Clicking an inline image or its settings button opens a modal with live
caption, alternative text, width and alignment controls. Closing the modal or
pressing Escape returns to editing. Removing a body insertion keeps the file in
the attachment list; replacing/deleting attachments retains the existing behavior.

Clicking a citation number opens a picker with that occurrence's references
selected. Applying or removing changes only the clicked occurrence, even if the
same citation appears elsewhere. The picker can create a reference and cite it
without navigating to the full reference list. Toolbar insertion remembers the
cursor/selection. Stale edit targets are rejected instead of overwriting text.
Reference IDs, automatic numbering and the existing reference list are unchanged.
