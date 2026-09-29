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
- field
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
